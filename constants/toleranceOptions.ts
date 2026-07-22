import type { Allergen, Intolerance } from '@/types/tolerance';

type ToleranceOption<T extends string> = {
  value: T;
  label: string;
  /** Ingredient-name keywords used to flag recipes/products. A starting
   * heuristic, not a medical reference — matches on substring, case-insensitive. */
  keywords: string[];
};

export const ALLERGEN_OPTIONS: ToleranceOption<Allergen>[] = [
  { value: 'gluten', label: 'Gluten', keywords: ['bread', 'wheat', 'pasta', 'spaghetti', 'penne', 'couscous', 'tortilla', 'bagel', 'croissant', 'noodles'] },
  { value: 'dairy', label: 'Dairy', keywords: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'mozzarella', 'parmesan', 'cheddar'] },
  { value: 'eggs', label: 'Eggs', keywords: ['egg'] },
  { value: 'peanuts', label: 'Peanuts', keywords: ['peanut'] },
  { value: 'treeNuts', label: 'Tree nuts', keywords: ['almond', 'cashew', 'walnut'] },
  { value: 'soy', label: 'Soy', keywords: ['soy', 'tofu', 'tempeh', 'edamame'] },
  { value: 'shellfish', label: 'Shellfish', keywords: ['shrimp', 'crab', 'lobster'] },
  { value: 'fish', label: 'Fish', keywords: ['salmon', 'tuna', 'fish'] },
  { value: 'sesame', label: 'Sesame', keywords: ['sesame', 'tahini'] },
];

export const INTOLERANCE_OPTIONS: ToleranceOption<Intolerance>[] = [
  { value: 'lactose', label: 'Lactose', keywords: ['milk', 'cheese', 'yogurt', 'cream'] },
  { value: 'ibs', label: 'IBS / FODMAP', keywords: ['onion', 'garlic', 'beans'] },
  { value: 'histamine', label: 'Histamine', keywords: ['cheese', 'vinegar'] },
  { value: 'fructose', label: 'Fructose', keywords: ['honey', 'apple', 'mango'] },
];
