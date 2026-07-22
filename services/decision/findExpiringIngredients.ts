import type { InventoryItem } from '@/types/inventory';
import type { Product } from '@/types/product';
import { isExpiringSoon } from '@/utils/expiry';
import { normalizeIngredient } from '@/utils/normalizeIngredient';

export interface ExpiringIngredientMatch {
  /** Ingredient display names (from Recipe.ingredients) matched to a soon-expiring InventoryItem. */
  names: string[];
  productIds: string[];
}

/**
 * Same normalized-name matching as calculateRecipeAvailability, but returns
 * which specific ingredients are expiring rather than a plain boolean —
 * needed so the engine can name the actual product in a suggestion reason
 * ("Uses spinach expiring soon") instead of a generic claim.
 */
export function findExpiringIngredients(ingredients: string[], products: Product[], inventoryItems: InventoryItem[]): ExpiringIngredientMatch {
  const productByNormalizedName = new Map(products.map((product) => [normalizeIngredient(product.name), product]));
  const inventoryByProductId = new Map(inventoryItems.map((item) => [item.productId, item]));

  const names: string[] = [];
  const productIds: string[] = [];

  for (const ingredient of ingredients) {
    const product = productByNormalizedName.get(normalizeIngredient(ingredient));
    const item = product ? inventoryByProductId.get(product.id) : undefined;
    if (item && isExpiringSoon(item.expirationDate)) {
      names.push(ingredient);
      if (product) productIds.push(product.id);
    }
  }

  return { names, productIds };
}
