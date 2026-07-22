import { estimateExtraPurchaseCost, type ExtraPurchaseCostEstimate } from '@/services/budget/estimateExtraPurchaseCost';
import { estimateRecipeCost } from '@/services/budget/estimateRecipeCost';
import { analyzeNoResults, type NoResultFilterProbe } from '@/services/decision/analyzeNoResults';
import { computeBehavioralSignals, type BehavioralSignals } from '@/services/decision/behavioralSignals';
import { buildSuggestionReasons, buildSuggestionWarnings } from '@/services/decision/buildSuggestionReasons';
import { diversifySuggestions } from '@/services/decision/diversifySuggestions';
import { evaluateHardConstraints } from '@/services/decision/evaluateHardConstraints';
import { findExpiringIngredients } from '@/services/decision/findExpiringIngredients';
import { classifyFamiliarity, scoreRecipe } from '@/services/decision/scoreRecipe';
import type { DecisionContext, GetRankedMealSuggestionsResult, RankedMealSuggestion } from '@/services/decision/types';
import { getPermanentlyHiddenIds, isDismissedForDate } from '@/services/dismissal/isDismissedForDate';
import type { DietProfile } from '@/types/diet';
import type { DismissalEntry } from '@/types/dismissal';
import type { InventoryItem } from '@/types/inventory';
import type { MealLogEntry } from '@/types/mealLog';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import type { ToleranceProfile } from '@/types/tolerance';
import { calculateRecipeAvailability, type RecipeAvailability } from '@/utils/calculateRecipeAvailability';
import { formatCents } from '@/utils/money';

export interface GetRankedMealSuggestionsInput {
  recipes: Recipe[];
  context: DecisionContext;
  products: Product[];
  inventoryItems: InventoryItem[];
  toleranceProfile: ToleranceProfile;
  dietProfile: DietProfile;
  avoidedProductIds: ReadonlySet<string>;
  safeMealIds: ReadonlySet<string>;
  /** A dedicated "safe meals only" toggle — deliberately not read off ToleranceProfile.safeMealsOnly, since that's a separate existing setting (used by the Recipes tab filter) from the Today "Safe meals only" chip this engine serves. */
  safeMealsOnly?: boolean;
  dismissals: DismissalEntry[];
  plannedMeals: PlannedMeal[];
  mealLogEntries: MealLogEntry[];
  limit?: number;
  nowMs?: number;
}

const DEFAULT_LIMIT = 3;
const TIME_RELAXATION_STEP_MINUTES = 10;
const COST_RELAXATION_STEP_CENTS = 200;

interface ScoredCandidate {
  recipe: Recipe;
  availability: RecipeAvailability;
  expiringNames: string[];
  expiringProductIds: string[];
  behavioral: BehavioralSignals;
  isSafeMeal: boolean;
  cost?: ExtraPurchaseCostEstimate;
  score: number;
}

/**
 * The one reusable ranking function — Today, Day Detail, Week, "Get 3
 * ideas", and "Pick for me" all call this instead of each owning separate
 * ranking logic. Pipeline: Level 1 hard exclusions (+ session/day/permanent
 * dismissals) -> Level 2 explicit-context filters -> Level 3/4 scoring ->
 * diversity pass. Returns a no-result analysis instead of an empty array
 * when Level 2 filtering leaves nothing, without ever having relaxed a
 * Level 1 safety constraint to get there.
 */
export function getRankedMealSuggestions(input: GetRankedMealSuggestionsInput): GetRankedMealSuggestionsResult {
  const {
    recipes,
    context,
    products,
    inventoryItems,
    toleranceProfile,
    dietProfile,
    avoidedProductIds,
    safeMealIds,
    safeMealsOnly,
    dismissals,
    plannedMeals,
    mealLogEntries,
    limit = DEFAULT_LIMIT,
    nowMs = Date.now(),
  } = input;

  const permanentlyHiddenRecipeIds = getPermanentlyHiddenIds(dismissals);
  const excludeSet = new Set(context.excludeRecipeIds ?? []);

  // Level 1 — hard exclusions, plus this-session/this-day/permanent dismissals (a personal exclusion, not a safety reason).
  const hardSafeCandidates = recipes.filter((recipe) => {
    if (excludeSet.has(recipe.id)) return false;
    if (isDismissedForDate(dismissals, recipe.id, context.date)) return false;
    return evaluateHardConstraints(recipe, { toleranceProfile, dietProfile, avoidedProductIds, permanentlyHiddenRecipeIds, products })
      .passed;
  });

  // Cost is computed once here (post Level 1), reused by both the Level-2 cost filters and the Level 3/4 scoring pass below.
  const costByRecipeId = new Map<string, ExtraPurchaseCostEstimate>();
  if (context.budgetEnabled) {
    for (const recipe of hardSafeCandidates) {
      costByRecipeId.set(recipe.id, estimateExtraPurchaseCost(recipe, products, inventoryItems));
    }
  }

  // Level 2 — explicit current context, expressed as named filters so a no-result state can explain which one blocks.
  const filters: NoResultFilterProbe[] = [];

  if (safeMealsOnly) {
    filters.push({ type: 'dropSafeOnly', label: 'Show meals beyond your safe list', passes: (recipe) => safeMealIds.has(recipe.id) });
  }

  if (context.maxPrepMinutes != null) {
    const cap = context.maxPrepMinutes;
    filters.push({
      type: 'increaseTime',
      label: `Increase time to ${cap + TIME_RELAXATION_STEP_MINUTES} minutes`,
      passes: (recipe) => recipe.time <= cap,
    });
  }

  if (context.equipment && context.equipment.length > 0) {
    const allowed = context.equipment;
    filters.push({
      type: 'other',
      label: 'Include meals needing other equipment',
      passes: (recipe) => !recipe.equipment || recipe.equipment.every((item) => allowed.includes(item)),
    });
  }

  if (context.noExtraShopping) {
    filters.push({
      type: 'allowOneMissingIngredient',
      label: 'Allow one missing ingredient',
      passes: (recipe) => {
        const cost = costByRecipeId.get(recipe.id);
        return !cost || cost.status === 'unavailable' || cost.extraCostCents === 0;
      },
    });
  }

  if (context.maxExtraCostCents != null) {
    const cap = context.maxExtraCostCents;
    filters.push({
      type: 'increaseMaxCost',
      label: `Include meals up to ${formatCents(cap + COST_RELAXATION_STEP_CENTS)} extra`,
      passes: (recipe) => {
        const cost = costByRecipeId.get(recipe.id);
        return !cost || cost.status === 'unavailable' || cost.extraCostCents <= cap;
      },
    });
  }

  const contextFilteredCandidates =
    filters.length > 0 ? hardSafeCandidates.filter((recipe) => filters.every((filter) => filter.passes(recipe))) : hardSafeCandidates;

  if (contextFilteredCandidates.length === 0) {
    return { suggestions: [], noResult: analyzeNoResults(hardSafeCandidates, filters) };
  }

  // Level 3 + 4 — score every remaining candidate.
  const scored: ScoredCandidate[] = contextFilteredCandidates.map((recipe) => {
    const availability = calculateRecipeAvailability(recipe.ingredients, products, inventoryItems);
    const expiring = findExpiringIngredients(recipe.ingredients, products, inventoryItems);
    const behavioral = computeBehavioralSignals(recipe.id, plannedMeals, mealLogEntries, dismissals, nowMs);
    const isSafeMeal = safeMealIds.has(recipe.id);
    const eatenTodayAlready = mealLogEntries.some((entry) => entry.recipeId === recipe.id && entry.date === context.date);
    const duplicatePlannedToday = plannedMeals.some(
      (meal) => meal.recipeId === recipe.id && meal.date === context.date && meal.mealSlot === context.mealSlot
    );
    const cost = costByRecipeId.get(recipe.id);

    const score = scoreRecipe({
      recipe,
      context,
      availability,
      extraCostCents: cost && cost.status !== 'unavailable' ? cost.extraCostCents : undefined,
      usesExpiringProductIds: expiring.productIds,
      isSafeMeal,
      isFavorite: recipe.isFavorite,
      behavioral,
      eatenTodayAlready,
      duplicatePlannedToday,
    });

    return { recipe, availability, expiringNames: expiring.names, expiringProductIds: expiring.productIds, behavioral, isSafeMeal, cost, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const diversifiedIds = diversifySuggestions(
    scored.map((entry) => ({ recipeId: entry.recipe.id, score: entry.score, primaryCategory: entry.recipe.categories[0] })),
    limit
  );

  const byRecipeId = new Map(scored.map((entry) => [entry.recipe.id, entry]));

  const suggestions: RankedMealSuggestion[] = diversifiedIds.map((recipeId) => {
    const entry = byRecipeId.get(recipeId) as ScoredCandidate;
    const familiarity = classifyFamiliarity(entry.isSafeMeal, entry.behavioral);
    const totalCost = context.budgetEnabled ? estimateRecipeCost(entry.recipe, products, inventoryItems) : undefined;

    const explanationInput = {
      recipe: entry.recipe,
      context,
      availability: entry.availability,
      extraCost: entry.cost,
      usesExpiringProductNames: entry.expiringNames,
      familiarity,
      behavioral: entry.behavioral,
    };

    return {
      recipeId: entry.recipe.id,
      score: entry.score,
      hardConstraintPassed: true,
      reasons: buildSuggestionReasons(explanationInput),
      warnings: buildSuggestionWarnings(explanationInput),
      stockCoverageRatio: entry.availability.percentAvailable / 100,
      missingIngredientCount: entry.availability.missing.length,
      additionalPurchaseCost: entry.cost,
      totalRecipeCost: totalCost,
      usesExpiringProductIds: entry.expiringProductIds,
      familiarity,
      confidence: context.budgetEnabled && entry.cost?.status === 'unavailable' ? 'medium' : 'high',
    };
  });

  return { suggestions };
}
