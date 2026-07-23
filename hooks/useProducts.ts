import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { DEFAULT_PRODUCTS } from '@/constants/productSeed';
import { productStorageService } from '@/services/products/productStorageService';
import type { NewProduct, Product } from '@/types/product';
import { generateId } from '@/utils/id';
import { normalizeIngredient } from '@/utils/normalizeIngredient';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    const stored = await productStorageService.getAll();
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
  }, []);

  // useFocusEffect (not a plain mount-only effect) so navigating away and back always shows current
  // data. `refetch` (returned below) covers writes from an already-focused screen — e.g. installing
  // demo data from Today, which creates new Products directly in storage, bypassing this state.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const addProduct = useCallback(
    async (input: NewProduct): Promise<Product | undefined> => {
      const name = input.name.trim();
      if (!name) return undefined;

      const normalized = normalizeIngredient(name);
      const existing = products.find((product) => normalizeIngredient(product.name) === normalized);
      if (existing) return existing;

      const product: Product = {
        id: generateId(),
        name,
        category: input.category ?? 'Other',
        isFavorite: false,
        createdAt: Date.now(),
      };

      setProducts((current) => [...current, product]);
      await productStorageService.add(product);
      return product;
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

  return { products, isLoading, addProduct, removeProduct, toggleFavorite, refetch };
}
