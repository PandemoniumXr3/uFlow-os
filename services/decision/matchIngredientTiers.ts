import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import { normalizeIngredient } from '@/utils/normalizeIngredient';

export interface IngredientTierMatch {
  /** Ingredient display names (from Recipe.ingredients) that resolve to an 'avoid'-tier product. */
  avoidedIngredientNames: string[];
  /** True only when every ingredient resolved to a known catalog product — the hard-constraint evaluator uses this to avoid claiming high confidence on sparse data. */
  matchedAllIngredients: boolean;
}

/**
 * Resolves which of a recipe's ingredients belong to a product the user has
 * tagged 'avoid'. Prefers an explicit `ingredientLines[].productId` link
 * (a reliable id, per the milestone's "avoid fragile substring matching
 * when a reliable ID exists" rule) and falls back to normalized-name
 * matching against the Product catalog — the same resolution order Budget
 * Mode's cost estimator already uses. An ingredient with no resolvable
 * product is reported as unmatched, never silently assumed safe.
 */
export function findAvoidedIngredients(
  recipe: Recipe,
  products: Product[],
  avoidedProductIds: ReadonlySet<string>
): IngredientTierMatch {
  const productByNormalizedName = new Map(products.map((product) => [normalizeIngredient(product.name), product]));
  const lineByName = new Map((recipe.ingredientLines ?? []).map((line) => [normalizeIngredient(line.name), line]));

  const avoidedIngredientNames: string[] = [];
  let matchedCount = 0;

  for (const ingredient of recipe.ingredients) {
    const normalized = normalizeIngredient(ingredient);
    const line = lineByName.get(normalized);
    const product = line?.productId ? products.find((candidate) => candidate.id === line.productId) : productByNormalizedName.get(normalized);

    if (!product) continue;
    matchedCount += 1;
    if (avoidedProductIds.has(product.id)) avoidedIngredientNames.push(ingredient);
  }

  return { avoidedIngredientNames, matchedAllIngredients: matchedCount === recipe.ingredients.length };
}
