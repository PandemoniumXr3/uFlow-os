import { describe, expect, it } from 'vitest';

import { ONBOARDING_SCHEMA_VERSION, ONBOARDING_TOTAL_STEPS } from '@/types/onboarding';
import type { UserProfile } from '@/types/profile';
import { resolveOnboardingForProfile } from '@/utils/resolveOnboardingState';

const NOW = new Date('2026-07-23T10:00:00.000Z').getTime();

function baseProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return { id: 'p1', createdAt: 1000, updatedAt: 1000, ...overrides };
}

describe('resolveOnboardingForProfile', () => {
  it('a profile that already has onboarding state passes through unchanged', () => {
    const stored = baseProfile({ onboarding: { status: 'in_progress', currentStep: 2, version: ONBOARDING_SCHEMA_VERSION } });
    const result = resolveOnboardingForProfile(stored, false, NOW);
    expect(result.profile).toBe(stored);
    expect(result.wasCreated).toBe(false);
  });

  it('an existing profile row with no onboarding field is migrated to completed, nothing else touched', () => {
    const stored = baseProfile({ name: 'Alex', nutritionTrackingEnabled: true, updatedAt: 500 });
    const result = resolveOnboardingForProfile(stored, false, NOW);
    expect(result.wasCreated).toBe(false);
    expect(result.profile.id).toBe('p1');
    expect(result.profile.name).toBe('Alex');
    expect(result.profile.nutritionTrackingEnabled).toBe(true);
    expect(result.profile.createdAt).toBe(1000);
    expect(result.profile.onboarding?.status).toBe('completed');
    expect(result.profile.onboarding?.currentStep).toBe(ONBOARDING_TOTAL_STEPS);
    expect(result.profile.onboarding?.completedAt).toBe(new Date(NOW).toISOString());
  });

  it('no profile row and no existing data creates a fresh not_started state', () => {
    const result = resolveOnboardingForProfile(null, false, NOW);
    expect(result.wasCreated).toBe(true);
    expect(result.profile.onboarding?.status).toBe('not_started');
    expect(result.profile.onboarding?.currentStep).toBe(0);
    expect(result.profile.createdAt).toBe(NOW);
  });

  it('no profile row but real existing data creates a migrated completed state instead of not_started', () => {
    const result = resolveOnboardingForProfile(null, true, NOW);
    expect(result.wasCreated).toBe(true);
    expect(result.profile.onboarding?.status).toBe('completed');
    expect(result.profile.onboarding?.completedAt).toBe(new Date(NOW).toISOString());
  });

  it('never overwrites fields on an already-onboarded profile even if data signals are true', () => {
    const stored = baseProfile({ onboarding: { status: 'skipped', currentStep: 1, version: ONBOARDING_SCHEMA_VERSION } });
    const result = resolveOnboardingForProfile(stored, true, NOW);
    expect(result.profile).toBe(stored);
  });
});
