import { useCallback, useEffect, useMemo, useState } from 'react';

import { DEFAULT_SAFE_MEAL_IDS } from '@/constants/safeMealsSeed';
import { safeMealsStorageService } from '@/services/safeMeals/safeMealsStorageService';
import { DEFAULT_SAFE_MEALS_PROFILE, type SafeMealsProfile } from '@/types/safeMeals';

export function useSafeMeals() {
  const [profile, setProfile] = useState<SafeMealsProfile>(DEFAULT_SAFE_MEALS_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    safeMealsStorageService.get().then(async (stored) => {
      if (stored.recipeIds.length > 0 || !__DEV__) {
        setProfile(stored);
        setIsLoading(false);
        return;
      }

      // Dev/testing-only seed (see constants/safeMealsSeed.ts) — a real new user starts empty.
      const seeded = await safeMealsStorageService.seedIfEmpty({
        recipeIds: DEFAULT_SAFE_MEAL_IDS,
        showSafeOnly: false,
      });
      setProfile(seeded);
      setIsLoading(false);
    });
  }, []);

  const safeMealIds = useMemo(() => new Set(profile.recipeIds), [profile.recipeIds]);

  const isSafeMeal = useCallback((recipeId: string) => safeMealIds.has(recipeId), [safeMealIds]);

  const toggleSafeMeal = useCallback((recipeId: string) => {
    setProfile((current) => {
      const next = current.recipeIds.includes(recipeId)
        ? current.recipeIds.filter((id) => id !== recipeId)
        : [...current.recipeIds, recipeId];
      const nextProfile = { ...current, recipeIds: next };
      safeMealsStorageService.save(nextProfile);
      return nextProfile;
    });
  }, []);

  const setShowSafeOnly = useCallback((value: boolean) => {
    setProfile((current) => {
      const nextProfile = { ...current, showSafeOnly: value };
      safeMealsStorageService.save(nextProfile);
      return nextProfile;
    });
  }, []);

  return { profile, isLoading, safeMealIds, isSafeMeal, toggleSafeMeal, setShowSafeOnly };
}
