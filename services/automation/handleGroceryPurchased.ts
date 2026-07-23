import type { InventoryItem } from '@/types/inventory';
import type { ShoppingItem } from '@/types/shoppingItem';
import { resolveStockActionForPurchase, type StockAction } from '@/utils/resolveStockActionForPurchase';

export interface HandleGroceryPurchasedInput {
  item: ShoppingItem;
  inventoryItems: InventoryItem[];
  /** Price actually paid, if the user entered one — undefined skips the price patch entirely (never guessed). */
  priceCents?: number;
  /** From Budget settings, used only as a default when the user didn't type a store for this purchase. */
  defaultStore?: string;
  /** Injectable for tests; defaults to today. */
  purchaseDate?: string;
}

export interface PriceInfoPatch {
  lastPurchasePriceCents: number;
  packageQuantity?: number;
  packageUnit?: string;
  store?: string;
  purchaseDate: string;
}

export interface HandleGroceryPurchasedResult {
  /** Already marked purchased — caller must not create/update Stock or record a price again. */
  alreadyPurchased: boolean;
  /** What to do to Stock: create a new InventoryItem, update an existing one, or nothing (unlinked item). */
  stockAction: StockAction;
  /** Only present when a price was provided and the item resolves to a real Stock item. */
  priceInfoPatch: PriceInfoPatch | null;
}

/**
 * Decides what confirming a Grocery purchase should do to Stock (via the
 * existing, unchanged resolveStockActionForPurchase) and, when a price is
 * given upfront, what price/package/store info to save alongside it.
 * `alreadyPurchased` guards a duplicate confirm (e.g. a double-tap on the
 * same item before `checked` state re-renders) from writing to Stock twice —
 * it only gates the Stock action itself, not a later, separate "record the
 * price" step on an item that's already purchased (the app's Grocery screen
 * intentionally splits those into two skippable confirmations).
 */
export function handleGroceryPurchased(input: HandleGroceryPurchasedInput): HandleGroceryPurchasedResult {
  const { item, inventoryItems, priceCents, defaultStore, purchaseDate } = input;

  if (item.purchased) {
    return { alreadyPurchased: true, stockAction: { type: 'none', reason: 'Already purchased' }, priceInfoPatch: null };
  }

  const existingInventoryItem = inventoryItems.find((candidate) => candidate.productId === item.productId);
  const stockAction = resolveStockActionForPurchase(item, existingInventoryItem);

  if (priceCents == null || stockAction.type === 'none') {
    return { alreadyPurchased: false, stockAction, priceInfoPatch: null };
  }

  return {
    alreadyPurchased: false,
    stockAction,
    priceInfoPatch: {
      lastPurchasePriceCents: priceCents,
      packageQuantity: item.quantity,
      packageUnit: item.unit,
      store: defaultStore,
      purchaseDate: purchaseDate ?? new Date().toISOString().slice(0, 10),
    },
  };
}
