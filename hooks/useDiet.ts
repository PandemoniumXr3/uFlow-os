import { useCallback, useEffect, useState } from 'react';

import { dietStorageService } from '@/services/diet/dietStorageService';
import { DEFAULT_DIET_PROFILE, type DietProfile, type DietType } from '@/types/diet';

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

// The current dev profile is vegetarian — seeded once for a brand-new profile only, and only in
// development builds. A real new user (including anyone going through onboarding's optional Food
// Profile step) must start from a genuinely blank DietProfile, never a pre-selected diet.
const DEV_PROFILE_DIET_SEED: DietProfile = { active: ['vegetarian'], matchDietOnly: false };

export function useDiet() {
  const [profile, setProfile] = useState<DietProfile>(DEFAULT_DIET_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = __DEV__ ? dietStorageService.seedIfEmpty(DEV_PROFILE_DIET_SEED) : dietStorageService.get();
    load.then((stored) => {
      setProfile(stored);
      setIsLoading(false);
    });
  }, []);

  const persist = useCallback((next: DietProfile) => {
    setProfile(next);
    dietStorageService.save(next);
  }, []);

  const toggleDiet = useCallback(
    (diet: DietType) => {
      persist({ ...profile, active: toggleValue(profile.active, diet) });
    },
    [profile, persist]
  );

  const setMatchDietOnly = useCallback(
    (value: boolean) => {
      persist({ ...profile, matchDietOnly: value });
    },
    [profile, persist]
  );

  return { profile, isLoading, toggleDiet, setMatchDietOnly };
}
