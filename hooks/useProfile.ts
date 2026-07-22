import { useCallback, useEffect, useMemo, useState } from 'react';

import { profileStorageService } from '@/services/profile/profileStorageService';
import type { BudgetPreferences } from '@/types/budget';
import type { NutrientKey } from '@/types/nutrition';
import type { UserProfile } from '@/types/profile';
import { generateId } from '@/utils/id';

const DEFAULT_BUDGET_PREFERENCES: BudgetPreferences = { enabled: false, currency: 'EUR', weekStartsOn: 1 };

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    profileStorageService.get().then(async (stored) => {
      if (stored) {
        setProfile(stored);
        setIsLoading(false);
        return;
      }

      const now = Date.now();
      const created: UserProfile = { id: generateId(), createdAt: now, updatedAt: now };
      await profileStorageService.save(created);
      setProfile(created);
      setIsLoading(false);
    });
  }, []);

  const setNutritionTrackingEnabled = useCallback(
    (value: boolean) => {
      setProfile((current) => {
        if (!current) return current;
        const next = { ...current, nutritionTrackingEnabled: value, updatedAt: Date.now() };
        profileStorageService.save(next);
        return next;
      });
    },
    []
  );

  /** Optional, defaulted at read time (OFF, EUR, week starts Monday) rather than written eagerly at profile creation — same convention as nutritionTrackingEnabled. */
  const budgetPreferences = useMemo<BudgetPreferences>(
    () => ({ ...DEFAULT_BUDGET_PREFERENCES, ...profile?.budget }),
    [profile?.budget]
  );

  const setBudgetPreferences = useCallback((patch: Partial<BudgetPreferences>) => {
    setProfile((current) => {
      if (!current) return current;
      const nextBudget: BudgetPreferences = { ...DEFAULT_BUDGET_PREFERENCES, ...current.budget, ...patch };
      const next = { ...current, budget: nextBudget, updatedAt: Date.now() };
      profileStorageService.save(next);
      return next;
    });
  }, []);

  const hiddenNutrients = useMemo(() => new Set(profile?.hiddenNutrients ?? []), [profile?.hiddenNutrients]);

  const isNutrientVisible = useCallback((key: NutrientKey) => !hiddenNutrients.has(key), [hiddenNutrients]);

  const toggleNutrientVisibility = useCallback((key: NutrientKey) => {
    setProfile((current) => {
      if (!current) return current;
      const currentHidden = current.hiddenNutrients ?? [];
      const nextHidden = currentHidden.includes(key)
        ? currentHidden.filter((k) => k !== key)
        : [...currentHidden, key];
      const next = { ...current, hiddenNutrients: nextHidden, updatedAt: Date.now() };
      profileStorageService.save(next);
      return next;
    });
  }, []);

  return {
    profile,
    isLoading,
    setNutritionTrackingEnabled,
    hiddenNutrients,
    isNutrientVisible,
    toggleNutrientVisibility,
    budgetPreferences,
    setBudgetPreferences,
  };
}
