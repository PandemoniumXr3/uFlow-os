export type StorageLocation = 'pantry' | 'fridge' | 'freezer' | 'other';
export type StockStatus = 'inStock' | 'low' | 'empty';

/** How this inventory item was created — manual today, ready for barcode/OCR entry later. */
export type InventorySource = 'manual' | 'barcode' | 'ocr';

/**
 * A user's personal stock record for a product they've explicitly added to
 * their home — separate from the Product catalog entry itself, and separate
 * from "always keep in stock" (a preference on ProductPreferences, not this
 * record — a product can be a preferred always-in-stock item without ever
 * having been added here). Only ever created when the user adds it via the
 * "Add to Stock" flow — never auto-created for the whole catalog.
 */
export interface InventoryItem {
  id: string;
  productId: string;
  quantity?: number;
  unit?: string;
  stockStatus: StockStatus;
  minimumQuantity?: number;
  location: StorageLocation;
  purchaseDate?: string; // YYYY-MM-DD — also doubles as "when this price was paid"
  expirationDate?: string; // YYYY-MM-DD
  openedDate?: string; // YYYY-MM-DD
  /**
   * Optional purchase-price data for Budget Mode, in integer cents — never
   * a float euro amount. All four are optional and independent: a price can
   * be recorded without a package size, and vice versa. Absent entirely for
   * items added before Budget Mode existed; that's "unknown", not zero.
   */
  lastPurchasePriceCents?: number;
  packageQuantity?: number;
  packageUnit?: string;
  store?: string;
  source: InventorySource;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
