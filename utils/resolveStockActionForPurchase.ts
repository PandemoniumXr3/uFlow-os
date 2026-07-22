import type { InventoryItem } from '@/types/inventory';
import type { ShoppingItem } from '@/types/shoppingItem';

export type StockAction =
  | {
      type: 'create';
      newItem: { productId: string; stockStatus: 'inStock'; location: 'pantry'; quantity?: number; unit?: string };
    }
  | { type: 'update'; inventoryItemId: string; patch: Partial<InventoryItem> }
  | { type: 'none'; reason: string };

/**
 * Decides what confirming "add to Stock" for a purchased shopping item
 * should do — never applied automatically, only after the user confirms in
 * the dialog. An item with no linked catalog product can't be reflected in
 * Stock at all (there's nothing to create an InventoryItem for).
 */
export function resolveStockActionForPurchase(item: ShoppingItem, existingInventoryItem: InventoryItem | undefined): StockAction {
  if (!item.productId) {
    return { type: 'none', reason: 'No catalog product linked to this item' };
  }

  if (existingInventoryItem) {
    return {
      type: 'update',
      inventoryItemId: existingInventoryItem.id,
      patch: {
        stockStatus: 'inStock',
        quantity: item.quantity ?? existingInventoryItem.quantity,
        unit: item.unit ?? existingInventoryItem.unit,
      },
    };
  }

  return {
    type: 'create',
    newItem: {
      productId: item.productId,
      stockStatus: 'inStock',
      location: 'pantry',
      quantity: item.quantity,
      unit: item.unit,
    },
  };
}
