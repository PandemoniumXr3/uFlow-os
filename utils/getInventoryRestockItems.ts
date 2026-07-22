import type { InventoryItem } from '@/types/inventory';
import type { Product } from '@/types/product';

export type RestockReasonType = 'lowStock' | 'empty' | 'alwaysInStock';

export interface RestockNeed {
  productId: string;
  ingredientName: string;
  reasonTypes: RestockReasonType[];
  quantity?: number;
  unit?: string;
}

/**
 * Restock needs driven purely by Stock state and preferences — not tied to
 * any specific meal. Covers low/empty inventory items, plus "always keep in
 * stock" products that currently aren't sufficiently stocked (no inventory
 * record, or low/empty). Being marked always-in-stock never implies the
 * product is present — it only matters here once stock is actually
 * insufficient.
 */
export function getInventoryRestockItems(
  products: Product[],
  inventoryItems: InventoryItem[],
  alwaysInStockProductIds: Set<string>
): RestockNeed[] {
  const productById = new Map(products.map((product) => [product.id, product]));
  const inventoryByProductId = new Map(inventoryItems.map((item) => [item.productId, item]));

  const candidateProductIds = new Set<string>();
  for (const item of inventoryItems) {
    if (item.stockStatus === 'low' || item.stockStatus === 'empty') {
      candidateProductIds.add(item.productId);
    }
  }
  for (const productId of alwaysInStockProductIds) {
    candidateProductIds.add(productId);
  }

  const needs: RestockNeed[] = [];

  for (const productId of candidateProductIds) {
    const product = productById.get(productId);
    if (!product) continue;

    const inventoryItem = inventoryByProductId.get(productId);
    const reasonTypes: RestockReasonType[] = [];

    if (inventoryItem?.stockStatus === 'low') reasonTypes.push('lowStock');
    if (inventoryItem?.stockStatus === 'empty') reasonTypes.push('empty');

    const isInsufficientlyStocked = !inventoryItem || inventoryItem.stockStatus === 'low' || inventoryItem.stockStatus === 'empty';
    if (alwaysInStockProductIds.has(productId) && isInsufficientlyStocked) {
      reasonTypes.push('alwaysInStock');
    }

    if (reasonTypes.length === 0) continue;

    needs.push({
      productId,
      ingredientName: product.name,
      reasonTypes,
      quantity: inventoryItem?.minimumQuantity,
      unit: inventoryItem?.unit,
    });
  }

  return needs;
}
