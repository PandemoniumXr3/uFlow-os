import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_PRODUCTS } from '@/constants/productSeed';
import { productStorageService } from '@/services/products/productStorageService';
import type { NewProduct, Product } from '@/types/product';
import { generateId } from '@/utils/id';
import { normalizeIngredient } from '@/utils/normalizeIngredient';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    productStorageService.getAll().then(async (stored) => {
      if (stored.length > 0) {
        setProducts(stored);
        setIsLoading(false);
        return;
      }

      const seeded = DEFAULT_PRODUCTS.map((item) => ({
        id: generateId(),
        name: item.name,
        category: item.category,
        isFavorite: false,
        createdAt: Date.now(),
      }));
      const result = await productStorageService.seedIfEmpty(seeded);
      setProducts(result);
      setIsLoading(false);
    });
  }, []);

  const addProduct = useCallback(
    async (input: NewProduct) => {
      const name = input.name.trim();
      if (!name) return;

      const normalized = normalizeIngredient(name);
      const alreadyOwned = products.some((product) => normalizeIngredient(product.name) === normalized);
      if (alreadyOwned) return;

      const product: Product = {
        id: generateId(),
        name,
        category: input.category ?? 'Other',
        isFavorite: false,
        createdAt: Date.now(),
      };

      setProducts((current) => [...current, product]);
      await productStorageService.add(product);
    },
    [products]
  );

  const removeProduct = useCallback(async (id: string) => {
    setProducts((current) => current.filter((product) => product.id !== id));
    await productStorageService.remove(id);
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    let nextValue = false;
    setProducts((current) =>
      current.map((product) => {
        if (product.id !== id) return product;
        nextValue = !product.isFavorite;
        return { ...product, isFavorite: nextValue };
      })
    );
    await productStorageService.update(id, { isFavorite: nextValue });
  }, []);

  return { products, isLoading, addProduct, removeProduct, toggleFavorite };
}
