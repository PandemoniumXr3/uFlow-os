import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { toleranceStorageService } from '@/services/tolerance/toleranceStorageService';
import { DEFAULT_TOLERANCE_PROFILE, type Allergen, type Intolerance, type ToleranceProfile } from '@/types/tolerance';

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function useTolerance() {
  const [profile, setProfile] = useState<ToleranceProfile>(DEFAULT_TOLERANCE_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(() => {
    return toleranceStorageService.get().then((stored) => {
      setProfile(stored);
      setIsLoading(false);
    });
  }, []);

  // useFocusEffect (not a plain mount-only effect) so returning to an already-mounted screen after
  // a write from elsewhere — e.g. a data import — always shows current data.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const persist = useCallback((next: ToleranceProfile) => {
    setProfile(next);
    toleranceStorageService.save(next);
  }, []);

  const toggleAllergen = useCallback(
    (allergen: Allergen) => {
      persist({ ...profile, allergies: toggleValue(profile.allergies, allergen) });
    },
    [profile, persist]
  );

  const toggleIntolerance = useCallback(
    (intolerance: Intolerance) => {
      persist({ ...profile, intolerances: toggleValue(profile.intolerances, intolerance) });
    },
    [profile, persist]
  );

  const setSafeMealsOnly = useCallback(
    (value: boolean) => {
      persist({ ...profile, safeMealsOnly: value });
    },
    [profile, persist]
  );

  return { profile, isLoading, toggleAllergen, toggleIntolerance, setSafeMealsOnly, refetch };
}
