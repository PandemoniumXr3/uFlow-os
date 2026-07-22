/**
 * A personal tier on a catalog product, used by the decision engine's
 * ingredient-level tolerance matching. 'avoid' and 'dislike' are soft-to-hard
 * distinct on purpose: 'avoid' is an explicit hard exclusion (like an
 * allergy) the user set deliberately; 'dislike' only nudges ranking down. Do
 * not conflate 'dislike' with 'avoid' — the milestone is explicit that a
 * dislike must never behave like an allergy.
 */
export type IngredientTier = 'avoid' | 'dislike' | 'safe' | 'preferred' | 'neutral';

/**
 * Personal preferences on catalog products — "always keep in stock" plus an
 * optional per-product tier. Deliberately independent of InventoryItem:
 * marking a product as always-in-stock is a preference ("I want to never
 * run out of this"), not a claim that you currently have it. It only turns
 * into a real stock signal once the product actually has an InventoryItem
 * with a low/empty status.
 */
export interface ProductPreferences {
  alwaysInStockProductIds: string[];
  /** Absent product id = 'neutral'. Never assume a tier for a product not present here. */
  ingredientTierByProductId?: Record<string, IngredientTier>;
}

export const DEFAULT_PRODUCT_PREFERENCES: ProductPreferences = {
  alwaysInStockProductIds: [],
};
