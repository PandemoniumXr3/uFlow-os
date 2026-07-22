import type { AutomaticItemOverlay, ShoppingItem } from '@/types/shoppingItem';

/**
 * Restores the persisted user overlay (checked/purchased/hidden, keyed by
 * normalizedName) onto a freshly regenerated automatic list, and gives each
 * item a stable id carried over from the overlay so React keys and repeat
 * lookups don't churn every time the list recomputes. Items whose overlay
 * says hidden are dropped entirely. Items with no overlay entry pass through
 * unchanged (first time seeing this ingredient).
 */
export function applyAutomaticOverlay(items: ShoppingItem[], overlay: AutomaticItemOverlay): ShoppingItem[] {
  const result: ShoppingItem[] = [];

  for (const item of items) {
    const entry = overlay[item.normalizedName];
    if (!entry) {
      result.push(item);
      continue;
    }

    if (entry.hidden) continue;

    result.push({
      ...item,
      id: entry.id,
      checked: entry.checked,
      purchased: entry.purchased,
    });
  }

  return result;
}
