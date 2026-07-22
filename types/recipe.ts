import type { NutritionInfo } from '@/types/nutrition';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'drink';

/** Describes the meal itself, never the user — safe/allergy status lives on the Tolerance profile instead. */
export type MealCategory =
  | 'vegetarian'
  | 'vegan'
  | 'pescatarian'
  | 'high-protein'
  | 'comfort'
  | 'healthy'
  | 'quick'
  | 'sweet'
  | 'savory'
  | 'hot'
  | 'cold'
  | 'budget'
  | 'meal-prep'
  | 'low-effort';

export type Effort = 'low' | 'medium' | 'high';

/** Additive and optional — no seed recipe carries equipment data yet, so equipment-based filtering/warnings stay inactive until a recipe is edited to include it. Never invented for existing recipes. */
export type CookingEquipment = 'oven' | 'stovetop' | 'microwave' | 'blender' | 'airFryer' | 'noCookRequired';

/**
 * A single structured ingredient line for cost estimation — separate from
 * `Recipe.ingredients` (the plain name list tolerance/diet matching and
 * availability rely on), which stays untouched. `productId`, when set,
 * skips the fuzzy name match; otherwise `name` is matched the same way
 * ingredients already are. Absent quantity/unit means "not enough data to
 * price this line" — never assumed, never defaulted.
 */
export interface RecipeIngredientLine {
  name: string;
  quantity?: number;
  unit?: string;
  productId?: string;
}

export interface Recipe {
  id: string;
  name: string;
  mealType: MealType[];
  categories: MealCategory[];
  ingredients: string[];
  instructions?: string;
  effort: Effort;
  time: number;
  /** Needed to compute total-recipe nutrition from per-serving values. */
  servings?: number;
  /** Per-serving values only. Absent entirely for most recipes — nutrition is opt-in, never invented. */
  nutrition?: NutritionInfo;
  /**
   * Optional structured ingredient quantities for cost estimation. Absent
   * for every un-edited recipe today (including all seed recipes) — Budget
   * Mode must show "cost unavailable" for those, not fabricate a total from
   * the plain `ingredients` name list.
   */
  ingredientLines?: RecipeIngredientLine[];
  /** Optional, manually set. Absent means "no known equipment requirement" — never treated as a conflict. */
  equipment?: CookingEquipment[];
  isFavorite: boolean;
  createdAt: number;
}

export type NewRecipe = Pick<Recipe, 'name' | 'mealType' | 'categories' | 'ingredients' | 'effort' | 'time'> & {
  instructions?: string;
  /** Optional manual entry, e.g. for a quick custom meal — never invented. */
  nutrition?: NutritionInfo;
  servings?: number;
  ingredientLines?: RecipeIngredientLine[];
};

/** Shape of a starter database entry — everything except the runtime-only fields. */
export type MealSeed = Omit<Recipe, 'isFavorite' | 'createdAt'>;
