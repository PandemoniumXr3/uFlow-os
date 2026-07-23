import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { MEAL_SEED } from '@/constants/mealSeed';
import { recipeStorageService } from '@/services/recipes/recipeStorageService';
import type { NewRecipe, Recipe, RecipeUpdate } from '@/types/recipe';
import { generateId } from '@/utils/id';

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Each screen holds its own useRecipes() instance rather than sharing one global store, and
  // React Navigation keeps a screen mounted (not remounted) when you navigate back to it — so
  // without this, deleting/editing a recipe from Detail and returning to the Recipes list would
  // show stale data until the app fully reloads. useFocusEffect re-fetches on every focus,
  // including the initial mount, so a plain useEffect isn't needed alongside it.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      recipeStorageService.getAll().then(async (stored) => {
        if (cancelled) return;
        if (stored.length > 0) {
          setRecipes(stored);
          setIsLoading(false);
          return;
        }

        const seeded = MEAL_SEED.map((meal) => ({
          ...meal,
          isFavorite: false,
          createdAt: Date.now(),
        }));
        const result = await recipeStorageService.seedIfEmpty(seeded);
        if (!cancelled) {
          setRecipes(result);
          setIsLoading(false);
        }
      });

      return () => {
        cancelled = true;
      };
    }, [])
  );

  const addRecipe = useCallback(async (input: NewRecipe) => {
    const name = input.name.trim();
    if (!name) return;

    const recipe: Recipe = {
      id: generateId(),
      name,
      mealType: input.mealType,
      categories: input.categories,
      ingredients: input.ingredients.map((i) => i.trim()).filter(Boolean),
      instructions: input.instructions?.trim() || undefined,
      effort: input.effort,
      time: input.time,
      servings: input.servings,
      nutrition: input.nutrition,
      ingredientLines: input.ingredientLines,
      equipment: input.equipment,
      notes: input.notes?.trim() || undefined,
      isFavorite: false,
      createdAt: Date.now(),
    };

    setRecipes((current) => [...current, recipe]);
    await recipeStorageService.add(recipe);
    return recipe;
  }, []);

  const removeRecipe = useCallback(async (id: string) => {
    setRecipes((current) => current.filter((recipe) => recipe.id !== id));
    await recipeStorageService.remove(id);
  }, []);

  /** Full edit save — preserves id/createdAt/isFavorite/safe-status (the latter two live outside Recipe) and any field not included in the patch. */
  const updateRecipe = useCallback(async (id: string, patch: RecipeUpdate) => {
    setRecipes((current) => current.map((recipe) => (recipe.id === id ? { ...recipe, ...patch } : recipe)));
    await recipeStorageService.update(id, patch);
  }, []);

  /** Re-inserts an exact recipe snapshot (same id, same every field) — the undo half of delete. */
  const restoreRecipe = useCallback(async (recipe: Recipe) => {
    setRecipes((current) => (current.some((existing) => existing.id === recipe.id) ? current : [...current, recipe]));
    await recipeStorageService.add(recipe);
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    let nextValue = false;
    setRecipes((current) =>
      current.map((recipe) => {
        if (recipe.id !== id) return recipe;
        nextValue = !recipe.isFavorite;
        return { ...recipe, isFavorite: nextValue };
      })
    );
    await recipeStorageService.update(id, { isFavorite: nextValue });
  }, []);

  return { recipes, isLoading, addRecipe, removeRecipe, updateRecipe, restoreRecipe, toggleFavorite };
}
