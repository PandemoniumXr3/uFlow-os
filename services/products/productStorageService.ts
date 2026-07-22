import { asyncStorageClient } from '@/services/storage/asyncStorageClient';
import type { Product } from '@/types/product';

const PRODUCTS_KEY = 'uflow.products';

/**
 * Domain-level contract for persisting products. The rest of the app depends
 * on this interface, not on AsyncStorage — swapping to SQLite later means
 * writing a new implementation of ProductStorageService, nothing else changes.
 */
export interface ProductStorageService {
  getAll(): Promise<Product[]>;
  add(product: Product): Promise<void>;
  remove(id: string): Promise<void>;
  update(id: string, patch: Partial<Product>): Promise<void>;
  /** Writes `products` only if storage is currently empty. Returns the resulting list. */
  seedIfEmpty(products: Product[]): Promise<Product[]>;
}

export const productStorageService: ProductStorageService = {
  async getAll() {
    const products = await asyncStorageClient.getJSON<Product[]>(PRODUCTS_KEY);
    return products ?? [];
  },

  async add(product) {
    const products = await productStorageService.getAll();
    await asyncStorageClient.setJSON(PRODUCTS_KEY, [...products, product]);
  },

  async remove(id) {
    const products = await productStorageService.getAll();
    await asyncStorageClient.setJSON(
      PRODUCTS_KEY,
      products.filter((product) => product.id !== id)
    );
  },

  async update(id, patch) {
    const products = await productStorageService.getAll();
    await asyncStorageClient.setJSON(
      PRODUCTS_KEY,
      products.map((product) => (product.id === id ? { ...product, ...patch } : product))
    );
  },

  async seedIfEmpty(products) {
    const existing = await productStorageService.getAll();
    if (existing.length > 0) return existing;
    await asyncStorageClient.setJSON(PRODUCTS_KEY, products);
    return products;
  },
};
