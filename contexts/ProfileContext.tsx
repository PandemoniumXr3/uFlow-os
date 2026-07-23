import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { gatherExistingUserSignals } from '@/services/onboarding/gatherExistingUserSignals';
import { profileStorageService } from '@/services/profile/profileStorageService';
import type { BudgetPreferences } from '@/types/budget';
import type { NutrientKey } from '@/types/nutrition';
import { ONBOARDING_SCHEMA_VERSION, type OnboardingPriority, type OnboardingState } from '@/types/onboarding';
import type { UserProfile } from '@/types/profile';
import { detectExistingUser } from '@/utils/detectExistingUser';
import { createMigratedOnboardingState, resolveOnboardingForProfile } from '@/utils/resolveOnboardingState';

const DEFAULT_BUDGET_PREFERENCES: BudgetPreferences = { enabled: false, currency: 'EUR', weekStartsOn: 1 };

interface ProfileContextValue {
  profile: UserProfile | null;
  isLoading: boolean;
  setNutritionTrackingEnabled: (value: boolean) => void;
  hiddenNutrients: Set<NutrientKey>;
  isNutrientVisible: (key: NutrientKey) => boolean;
  toggleNutrientVisibility: (key: NutrientKey) => void;
  budgetPreferences: BudgetPreferences;
  setBudgetPreferences: (patch: Partial<BudgetPreferences>) => void;
  contextIntelligenceEnabled: boolean;
  setContextIntelligenceEnabled: (value: boolean) => void;
  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  rerunOnboarding: () => void;
  setOnboardingPriorities: (priorities: OnboardingPriority[]) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

/**
 * Single shared profile instance for the whole app — mounted once at the
 * root (see app/_layout.tsx). Previously every screen held its own
 * `useProfile()` state via a plain hook; that meant a mutation from one
 * screen (e.g. onboarding calling completeOnboarding()) was invisible to
 * every other already-mounted screen's own copy, including the root
 * layout's own routing decision. That staleness caused a real bug: after
 * finishing onboarding, the layout's stale copy still thought onboarding
 * was needed, fought the navigation, and produced a "Maximum update depth
 * exceeded" crash. A Context (the same fix already used for undo — see
 * UndoContext) removes the possibility of two instances disagreeing.
 */
export function ProfileProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    profileStorageService.get().then(async (stored) => {
      // isExistingUserByData only matters when `stored` is null — see resolveOnboardingForProfile.
      const isExistingUserByData = stored ? false : detectExistingUser(await gatherExistingUserSignals());
      const { profile: resolved, wasCreated } = resolveOnboardingForProfile(stored, isExistingUserByData, Date.now());

      if (wasCreated || resolved !== stored) {
        await profileStorageService.save(resolved);
      }
      setProfile(resolved);
      setIsLoading(false);
    });
  }, []);

  const setNutritionTrackingEnabled = useCallback((value: boolean) => {
    setProfile((current) => {
      if (!current) return current;
      const next = { ...current, nutritionTrackingEnabled: value, updatedAt: Date.now() };
      profileStorageService.save(next);
      return next;
    });
  }, []);

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
      const nextHidden = currentHidden.includes(key) ? currentHidden.filter((k) => k !== key) : [...currentHidden, key];
      const next = { ...current, hiddenNutrients: nextHidden, updatedAt: Date.now() };
      profileStorageService.save(next);
      return next;
    });
  }, []);

  /** ON by default so existing users (whose profile predates this flag) see no behavior change. */
  const contextIntelligenceEnabled = profile?.contextIntelligenceEnabled ?? true;

  const setContextIntelligenceEnabled = useCallback((value: boolean) => {
    setProfile((current) => {
      if (!current) return current;
      const next = { ...current, contextIntelligenceEnabled: value, updatedAt: Date.now() };
      profileStorageService.save(next);
      return next;
    });
  }, []);

  /** Advances step and flips status to in_progress — the one place currentStep is written, so persistence-on-navigate is automatic. */
  const setOnboardingStep = useCallback((step: number) => {
    setProfile((current) => {
      if (!current?.onboarding) return current;
      const nextOnboarding: OnboardingState = {
        ...current.onboarding,
        status: 'in_progress',
        currentStep: step,
        startedAt: current.onboarding.startedAt ?? new Date().toISOString(),
      };
      const next = { ...current, onboarding: nextOnboarding, updatedAt: Date.now() };
      profileStorageService.save(next);
      return next;
    });
  }, []);

  const completeOnboarding = useCallback(() => {
    setProfile((current) => {
      if (!current) return current;
      const now = Date.now();
      const next = { ...current, onboarding: createMigratedOnboardingState(now), updatedAt: now };
      profileStorageService.save(next);
      return next;
    });
  }, []);

  const skipOnboarding = useCallback(() => {
    setProfile((current) => {
      if (!current) return current;
      const now = Date.now();
      // Distinct status from 'completed' (for honest reporting/analytics later), but routing treats both identically — see app/_layout.tsx.
      const nextOnboarding: OnboardingState = {
        status: 'skipped',
        currentStep: current.onboarding?.currentStep ?? 0,
        startedAt: current.onboarding?.startedAt,
        completedAt: new Date(now).toISOString(),
        version: ONBOARDING_SCHEMA_VERSION,
      };
      const next = { ...current, onboarding: nextOnboarding, updatedAt: now };
      profileStorageService.save(next);
      return next;
    });
  }, []);

  /** Re-entering onboarding from Settings never touches any other stored data — only this record's status/step reset. */
  const rerunOnboarding = useCallback(() => {
    setProfile((current) => {
      if (!current) return current;
      const nextOnboarding: OnboardingState = {
        status: 'in_progress',
        currentStep: 0,
        startedAt: new Date().toISOString(),
        version: ONBOARDING_SCHEMA_VERSION,
      };
      const next = { ...current, onboarding: nextOnboarding, updatedAt: Date.now() };
      profileStorageService.save(next);
      return next;
    });
  }, []);

  const setOnboardingPriorities = useCallback((priorities: OnboardingPriority[]) => {
    setProfile((current) => {
      if (!current) return current;
      const next = { ...current, onboardingPriorities: priorities, updatedAt: Date.now() };
      profileStorageService.save(next);
      return next;
    });
  }, []);

  const value: ProfileContextValue = {
    profile,
    isLoading,
    setNutritionTrackingEnabled,
    hiddenNutrients,
    isNutrientVisible,
    toggleNutrientVisibility,
    budgetPreferences,
    setBudgetPreferences,
    contextIntelligenceEnabled,
    setContextIntelligenceEnabled,
    setOnboardingStep,
    completeOnboarding,
    skipOnboarding,
    rerunOnboarding,
    setOnboardingPriorities,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within ProfileProvider');
  return context;
}
