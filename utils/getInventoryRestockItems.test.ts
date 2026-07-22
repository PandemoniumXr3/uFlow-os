import { describe, expect, it } from 'vitest';

import type { InventoryItem } from '@/types/inventory';
import type { Product } from '@/types/product';
import { getInventoryRestockItems } from '@/utils/getInventoryRestockItems';

function makeProduct(id: string, name: string): Product {
  return { id, name, category: 'Other', isFavorite: false, createdAt: 0 };
}

function makeInventoryItem(productId: string, stockStatus: InventoryItem['stockStatus'], extra: Partial<InventoryItem> = {}): InventoryItem {
  return { id: `inv-${productId}`, productId, stockStatus, location: 'pantry', source: 'manual', createdAt: 0, updatedAt: 0, ...extra };
}

describe('getInventoryRestockItems', () => {
  it('includes a low-stock item with reason lowStock', () => {
    const products = [makeProduct('p-milk', 'Milk')];
    const inventoryItems = [makeInventoryItem('p-milk', 'low')];
    const needs = getInventoryRestockItems(products, inventoryItems, new Set());
    expect(needs).toHaveLength(1);
    expect(needs[0].reasonTypes).toEqual(['lowStock']);
  });

  it('includes an empty item with reason empty', () => {
    const products = [makeProduct('p-eggs', 'Eggs')];
    const inventoryItems = [makeInventoryItem('p-eggs', 'empty')];
    const needs = getInventoryRestockItems(products, inventoryItems, new Set());
    expect(needs[0].reasonTypes).toEqual(['empty']);
  });

  it('includes an always-in-stock product with no inventory record at all', () => {
    const products = [makeProduct('p-tea', 'Tea')];
    const needs = getInventoryRestockItems(products, [], new Set(['p-tea']));
    expect(needs).toHaveLength(1);
    expect(needs[0].reasonTypes).toEqual(['alwaysInStock']);
  });

  it('excludes an always-in-stock product that is currently in stock', () => {
    const products = [makeProduct('p-tea', 'Tea')];
    const inventoryItems = [makeInventoryItem('p-tea', 'inStock')];
    const needs = getInventoryRestockItems(products, inventoryItems, new Set(['p-tea']));
    expect(needs).toEqual([]);
  });

  it('combines lowStock and alwaysInStock reasons on the same item', () => {
    const products = [makeProduct('p-coffee', 'Coffee')];
    const inventoryItems = [makeInventoryItem('p-coffee', 'low')];
    const needs = getInventoryRestockItems(products, inventoryItems, new Set(['p-coffee']));
    expect(needs).toHaveLength(1);
    expect(needs[0].reasonTypes).toEqual(expect.arrayContaining(['lowStock', 'alwaysInStock']));
  });

  it('carries quantity/unit through from minimumQuantity when present', () => {
    const products = [makeProduct('p-milk', 'Milk')];
    const inventoryItems = [makeInventoryItem('p-milk', 'low', { minimumQuantity: 2, unit: 'L' })];
    const needs = getInventoryRestockItems(products, inventoryItems, new Set());
    expect(needs[0].quantity).toBe(2);
    expect(needs[0].unit).toBe('L');
  });
});
