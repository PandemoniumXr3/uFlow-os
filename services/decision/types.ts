import type { ExtraPurchaseCostEstimate } from '@/services/budget/estimateExtraPurchaseCost';
import type { RecipeCostEstimate } from '@/services/budget/estimateRecipeCost';
import type { CookingEquipment, MealType } from '@/types/recipe';

export type { CookingEquipment };
export type EnergyLevel = 'very_low' | 'low' | 'normal' | 'high';
export type EffortPreference = 'minimal' | 'low' | 'normal';
export type TemperaturePreference = 'warm' | 'cold' | 'either';
export type FamiliarityPreference = 'safe' | 'familiar' | 'new' | 'either';
export type ContextLocation = 'home' | 'work' | 'out';

/**
 * The decision engine's normalized runtime input. Assembled by
 * `buildDecisionContext()` from the app's existing persisted profiles
 * (FoodContext, ToleranceProfile, DietProfile, SafeMealsProfile,
 * BudgetPreferences, ProductPreferences, dismissals) — this type is never
 * itself persisted, so it isn't a competing context model. FoodContext
 * remains the one stored "today's context"; this is just what the engine
 * needs to rank meals, in one reusable shape.
 */
export interface DecisionContext {
  date: string;
  mealSlot?: MealType;

  energy?: EnergyLevel;
  effort?: EffortPreference;
  maxPrepMinutes?: number;

  temperaturePreference?: TemperaturePreference;
  familiarityPreference?: FamiliarityPreference;

  useStockFirst?: boolean;
  noExtraShopping?: boolean;
  prioritizeExpiring?: boolean;

  budgetEnabled: boolean;
  maxExtraCostCents?: number;

  location?: ContextLocation;
  equipment?: CookingEquipment[];

  includeRecipeIds?: string[];
  excludeRecipeIds?: string[];
}

export type SuggestionReasonType =
  | 'fullyInStock'
  | 'noExtraShopping'
  | 'lowExtraCost'
  | 'expiringIngredient'
  | 'safeMeal'
  | 'familiar'
  | 'different'
  | 'lowEffort'
  | 'quickPrep'
  | 'fitsEnergy'
  | 'usualMealSlot'
  | 'fitsBudget'
  | 'oneMissingIngredient';

export interface SuggestionReason {
  type: SuggestionReasonType;
  label: string;
}

export type SuggestionWarningType =
  | 'missingPrices'
  | 'lowStockIngredient'
  | 'nutritionUnavailable'
  | 'requiresEquipment'
  | 'costUnavailable';

export interface SuggestionWarning {
  type: SuggestionWarningType;
  label: string;
}

export type HardExclusionReasonType = 'allergy' | 'intolerance' | 'diet' | 'avoidedIngredient' | 'permanentlyHidden';

export interface HardExclusionReason {
  type: HardExclusionReasonType;
  label: string;
}

export interface HardConstraintResult {
  passed: boolean;
  /** Always populated when passed is false — empty when passed is true. Meant for diagnostic/editing views, not the normal suggestion UI. */
  reasons: HardExclusionReason[];
}

/**
 * Not a sorted Recipe[] — a structured result screens render directly.
 * Reasons/warnings/cost are computed once by the engine so no screen
 * recalculates "why this" itself.
 */
export interface RankedMealSuggestion {
  recipeId: string;
  score: number;

  hardConstraintPassed: boolean;

  reasons: SuggestionReason[];
  warnings: SuggestionWarning[];

  stockCoverageRatio: number;
  missingIngredientCount: number;

  additionalPurchaseCost?: ExtraPurchaseCostEstimate;
  totalRecipeCost?: RecipeCostEstimate;

  usesExpiringProductIds: string[];

  familiarity: 'safe' | 'familiar' | 'new' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
}

export type RelaxationType =
  | 'allowOneMissingIngredient'
  | 'increaseTime'
  | 'includeFamiliar'
  | 'increaseMaxCost'
  | 'dropSafeOnly'
  | 'other';

export interface RelaxationOption {
  type: RelaxationType;
  label: string;
}

export interface NoResultAnalysis {
  message: string;
  /** The single narrowest identified blocker, e.g. "No meals under 10 minutes". Undefined when no specific blocker could be isolated. */
  blockingReason?: string;
  relaxationOptions: RelaxationOption[];
}

export interface GetRankedMealSuggestionsResult {
  suggestions: RankedMealSuggestion[];
  noResult?: NoResultAnalysis;
}
