import type { InventoryItem } from '@/types/inventory';
import type { Product } from '@/types/product';
import { normalizeIngredient } from '@/utils/normalizeIngredient';

export interface RecipeAvailability {
  available: string[];
  low: string[];
  missing: string[];
  total: number;
  percentAvailable: number;
}

/**
 * Classifies each recipe ingredient as available / low / missing using the
 * matching Product (by normalized name) and its InventoryItem stock status.
 * An ingredient with no matching product, or a product marked empty, counts
 * as missing — there's nothing to cook with either way.
 */
export function calculateRecipeAvailability(
  ingredients: string[],
  products: Product[],
  inventoryItems: InventoryItem[]
): RecipeAvailability {
  const productByNormalizedName = new Map(products.map((product) => [normalizeIngredient(product.name), product]));
  const inventoryByProductId = new Map(inventoryItems.map((item) => [item.productId, item]));

  const available: string[] = [];
  const low: string[] = [];
  const missing: string[] = [];

  for (const ingredient of ingredients) {
    const product = productByNormalizedName.get(normalizeIngredient(ingredient));
    const inventoryItem = product ? inventoryByProductId.get(product.id) : undefined;

    if (!inventoryItem || inventoryItem.stockStatus === 'empty') {
      missing.push(ingredient);
    } else if (inventoryItem.stockStatus === 'low') {
      low.push(ingredient);
    } else {
      available.push(ingredient);
    }
  }

  const total = ingredients.length;
  const percentAvailable = total > 0 ? Math.round((available.length / total) * 100) : 100;

  return { available, low, missing, total, percentAvailable };
}
