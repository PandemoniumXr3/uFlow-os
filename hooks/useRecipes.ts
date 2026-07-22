import { useCallback, useEffect, useState } from 'react';

import { MEAL_SEED } from '@/constants/mealSeed';
import { recipeStorageService } from '@/services/recipes/recipeStorageService';
import type { NewRecipe, Recipe } from '@/types/recipe';
import { generateId } from '@/utils/id';

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    recipeStorageService.getAll().then(async (stored) => {
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
      setRecipes(result);
      setIsLoading(false);
    });
  }, []);

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
      isFavorite: false,
      createdAt: Date.now(),
    };

    setRecipes((current) => [...current, recipe]);
    await recipeStorageService.add(recipe);
  }, []);

  const removeRecipe = useCallback(async (id: string) => {
    setRecipes((current) => current.filter((recipe) => recipe.id !== id));
    await recipeStorageService.remove(id);
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

  return { recipes, isLoading, addRecipe, removeRecipe, toggleFavorite };
}
