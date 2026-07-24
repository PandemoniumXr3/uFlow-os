import { asyncStorageClient } from '@/services/storage/asyncStorageClient';
import type { Recipe } from '@/types/recipe';

const RECIPES_KEY = 'uflow.recipes';

/**
 * Domain-level contract for persisting recipes. Same swappable pattern as
 * ProductStorageService — AsyncStorage today, SQLite later, same interface.
 */
export interface RecipeStorageService {
  getAll(): Promise<Recipe[]>;
  /** Full-array replace — used by import replace/merge, where the caller has already computed the exact final list. */
  save(recipes: Recipe[]): Promise<void>;
  add(recipe: Recipe): Promise<void>;
  remove(id: string): Promise<void>;
  update(id: string, patch: Partial<Recipe>): Promise<void>;
  /** Writes `recipes` only if storage is currently empty. Returns the resulting list. */
  seedIfEmpty(recipes: Recipe[]): Promise<Recipe[]>;
}

export const recipeStorageService: RecipeStorageService = {
  async getAll() {
    const recipes = await asyncStorageClient.getJSON<Recipe[]>(RECIPES_KEY);
    return recipes ?? [];
  },

  async save(recipes) {
    await asyncStorageClient.setJSON(RECIPES_KEY, recipes);
  },

  async add(recipe) {
    const recipes = await recipeStorageService.getAll();
    await asyncStorageClient.setJSON(RECIPES_KEY, [...recipes, recipe]);
  },

  async remove(id) {
    const recipes = await recipeStorageService.getAll();
    await asyncStorageClient.setJSON(
      RECIPES_KEY,
      recipes.filter((recipe) => recipe.id !== id)
    );
  },

  async update(id, patch) {
    const recipes = await recipeStorageService.getAll();
    await asyncStorageClient.setJSON(
      RECIPES_KEY,
      recipes.map((recipe) => (recipe.id === id ? { ...recipe, ...patch } : recipe))
    );
  },

  async seedIfEmpty(recipes) {
    const existing = await recipeStorageService.getAll();
    if (existing.length > 0) return existing;
    await asyncStorageClient.setJSON(RECIPES_KEY, recipes);
    return recipes;
  },
};
