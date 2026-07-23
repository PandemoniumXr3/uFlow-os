import type { InventoryItem } from '@/types/inventory';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';

export interface DemoDataset {
  products: Product[];
  recipes: Recipe[];
  inventoryItems: InventoryItem[];
  plannedMeals: PlannedMeal[];
  /** Recipe ids from `recipes` that should also be marked safe/familiar. */
  safeMealRecipeIds: string[];
}

function daysFromNow(nowMs: number, days: number): string {
  const date = new Date(nowMs);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * A small, deliberately complete curated dataset — every price and nutrition
 * value here is real (not a placeholder), so Budget/Nutrition read as
 * "estimate complete" rather than a misleading half-filled example. One
 * ingredient (Chicken Breast) is intentionally under-stocked relative to
 * what the planned meal needs, and Broccoli expires in 2 days — the
 * required "at least one expiring or low-Stock example." Every entity name
 * ends in "(Demo)" so it reads as demo data everywhere it's ever displayed,
 * with no separate badge component needed.
 */
export function buildDemoDataset(nowMs: number, generateId: () => string): DemoDataset {
  const chicken: Product = { id: generateId(), name: 'Chicken Breast (Demo)', category: 'Protein', isFavorite: false, createdAt: nowMs };
  const rice: Product = { id: generateId(), name: 'Rice (Demo)', category: 'Grains & Rice', isFavorite: false, createdAt: nowMs };
  const broccoli: Product = { id: generateId(), name: 'Broccoli (Demo)', category: 'Vegetables', isFavorite: false, createdAt: nowMs };
  const yogurt: Product = { id: generateId(), name: 'Greek Yogurt (Demo)', category: 'Dairy & Alternatives', isFavorite: false, createdAt: nowMs };
  const blueberries: Product = { id: generateId(), name: 'Blueberries (Demo)', category: 'Fruit', isFavorite: false, createdAt: nowMs };
  const products = [chicken, rice, broccoli, yogurt, blueberries];

  const chickenBowl: Recipe = {
    id: generateId(),
    name: 'Grilled Chicken & Rice Bowl (Demo)',
    mealType: ['lunch', 'dinner'],
    categories: ['high-protein', 'healthy'],
    ingredients: [chicken.name, rice.name, broccoli.name],
    ingredientLines: [
      { id: generateId(), name: chicken.name, productId: chicken.id, quantity: 300, unit: 'g' },
      { id: generateId(), name: rice.name, productId: rice.id, quantity: 150, unit: 'g' },
      { id: generateId(), name: broccoli.name, productId: broccoli.id, quantity: 200, unit: 'g' },
    ],
    instructions: 'Season and grill the chicken.\nCook the rice.\nSteam the broccoli.\nCombine in a bowl.',
    effort: 'medium',
    time: 25,
    servings: 2,
    nutrition: {
      kcal: 520,
      proteinGrams: 45,
      carbohydrateGrams: 52,
      fatGrams: 12,
      saturatedFatGrams: 3,
      fiberGrams: 5,
      sugarGrams: 3,
      sodiumMilligrams: 420,
      source: 'estimated',
      completeness: 'complete',
    },
    isFavorite: false,
    createdAt: nowMs,
  };

  const yogurtBowl: Recipe = {
    id: generateId(),
    name: 'Greek Yogurt & Blueberry Bowl (Demo)',
    mealType: ['breakfast', 'snack'],
    categories: ['healthy', 'quick', 'vegetarian'],
    ingredients: [yogurt.name, blueberries.name],
    ingredientLines: [
      { id: generateId(), name: yogurt.name, productId: yogurt.id, quantity: 200, unit: 'g' },
      { id: generateId(), name: blueberries.name, productId: blueberries.id, quantity: 80, unit: 'g' },
    ],
    instructions: 'Spoon yogurt into a bowl.\nTop with blueberries.',
    effort: 'low',
    time: 5,
    servings: 1,
    nutrition: {
      kcal: 230,
      proteinGrams: 20,
      carbohydrateGrams: 24,
      fatGrams: 5,
      saturatedFatGrams: 2,
      fiberGrams: 2,
      sugarGrams: 18,
      sodiumMilligrams: 65,
      source: 'estimated',
      completeness: 'complete',
    },
    isFavorite: false,
    createdAt: nowMs,
  };

  const recipes = [chickenBowl, yogurtBowl];

  const inventoryItems: InventoryItem[] = [
    {
      id: generateId(),
      productId: chicken.id,
      // Recipe needs 300g for 2 servings — only 200g on hand, so Grocery/Budget both show a real shortfall.
      quantity: 200,
      unit: 'g',
      stockStatus: 'low',
      location: 'fridge',
      lastPurchasePriceCents: 450,
      packageQuantity: 500,
      packageUnit: 'g',
      source: 'manual',
      createdAt: nowMs,
      updatedAt: nowMs,
    },
    {
      id: generateId(),
      productId: rice.id,
      quantity: 1000,
      unit: 'g',
      stockStatus: 'inStock',
      location: 'pantry',
      lastPurchasePriceCents: 200,
      packageQuantity: 1000,
      packageUnit: 'g',
      source: 'manual',
      createdAt: nowMs,
      updatedAt: nowMs,
    },
    {
      id: generateId(),
      productId: broccoli.id,
      quantity: 250,
      unit: 'g',
      stockStatus: 'inStock',
      location: 'fridge',
      expirationDate: daysFromNow(nowMs, 2),
      lastPurchasePriceCents: 180,
      packageQuantity: 500,
      packageUnit: 'g',
      source: 'manual',
      createdAt: nowMs,
      updatedAt: nowMs,
    },
    {
      id: generateId(),
      productId: yogurt.id,
      quantity: 500,
      unit: 'g',
      stockStatus: 'inStock',
      location: 'fridge',
      lastPurchasePriceCents: 220,
      packageQuantity: 500,
      packageUnit: 'g',
      source: 'manual',
      createdAt: nowMs,
      updatedAt: nowMs,
    },
    {
      id: generateId(),
      productId: blueberries.id,
      quantity: 125,
      unit: 'g',
      stockStatus: 'inStock',
      location: 'fridge',
      lastPurchasePriceCents: 300,
      packageQuantity: 250,
      packageUnit: 'g',
      source: 'manual',
      createdAt: nowMs,
      updatedAt: nowMs,
    },
  ];

  const plannedMeals: PlannedMeal[] = [
    {
      id: generateId(),
      recipeId: chickenBowl.id,
      date: daysFromNow(nowMs, 0),
      mealSlot: 'dinner',
      servings: 2,
      createdAt: nowMs,
    },
  ];

  return { products, recipes, inventoryItems, plannedMeals, safeMealRecipeIds: [yogurtBowl.id] };
}
