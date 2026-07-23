import { DEFAULT_ONBOARDING_STATE, ONBOARDING_SCHEMA_VERSION, ONBOARDING_TOTAL_STEPS, type OnboardingState } from '@/types/onboarding';
import type { UserProfile } from '@/types/profile';
import { generateId } from '@/utils/id';

export function createInitialOnboardingState(): OnboardingState {
  return { ...DEFAULT_ONBOARDING_STATE };
}

/** Used for both real migrations and the rare no-profile-row-but-real-data fallback — either way the user is never shown onboarding. */
export function createMigratedOnboardingState(nowMs: number): OnboardingState {
  return {
    status: 'completed',
    currentStep: ONBOARDING_TOTAL_STEPS,
    version: ONBOARDING_SCHEMA_VERSION,
    completedAt: new Date(nowMs).toISOString(),
  };
}

export interface ResolveOnboardingResult {
  profile: UserProfile;
  /** True only the very first time this profile row is ever written — useful for callers that want to distinguish "brand new install" from every other load. */
  wasCreated: boolean;
}

/**
 * The one place that decides what onboarding state a freshly-loaded profile
 * should carry. Called on every app start right after `profileStorageService.get()`.
 *
 * - `stored` already has `onboarding` → nothing to do, pass through unchanged.
 * - `stored` exists but has no `onboarding` field → this profile predates the
 *   onboarding feature, i.e. a real existing user. Migrate in place: add a
 *   completed onboarding record, touch nothing else.
 * - `stored` is null (no profile row at all — the common brand-new-install
 *   case, but also possible if a profile was somehow lost) → check
 *   `isExistingUserByData` (computed by the caller from other domains'
 *   storage) as a defensive fallback so a user with real Stock/Recipes/etc.
 *   still isn't forced into onboarding just because their profile row is
 *   missing. Only when there is truly no profile AND no other data does a
 *   fresh `not_started` state get created.
 */
export function resolveOnboardingForProfile(
  stored: UserProfile | null,
  isExistingUserByData: boolean,
  nowMs: number
): ResolveOnboardingResult {
  if (stored) {
    if (stored.onboarding) return { profile: stored, wasCreated: false };
    return {
      profile: { ...stored, onboarding: createMigratedOnboardingState(nowMs), updatedAt: nowMs },
      wasCreated: false,
    };
  }

  const onboarding = isExistingUserByData ? createMigratedOnboardingState(nowMs) : createInitialOnboardingState();
  return {
    profile: { id: generateId(), createdAt: nowMs, updatedAt: nowMs, onboarding },
    wasCreated: true,
  };
}
