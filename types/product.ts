export type ProductCategory =
  | 'Dairy & Alternatives'
  | 'Bread & Bakery'
  | 'Breakfast'
  | 'Fruit'
  | 'Vegetables'
  | 'Grains & Rice'
  | 'Protein'
  | 'Frozen'
  | 'Pantry'
  | 'Nuts & Seeds'
  | 'Snacks & Treats'
  | 'Drinks'
  | 'Desserts'
  | 'Other';

/**
 * Catalog entry only — name, category, favorite. Personal stock data
 * (quantity, always-in-stock, expiration, location) lives on InventoryItem,
 * one per product, in the Stock module.
 */
export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  isFavorite: boolean;
  createdAt: number;
}

export type NewProduct = Pick<Product, 'name'> & Partial<Pick<Product, 'category'>>;
