export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

/** Bumped only when the step sequence itself changes shape enough that an in-progress `currentStep` from an older build could point at the wrong screen. */
export const ONBOARDING_SCHEMA_VERSION = 1;

/** Welcome, Priorities, Food profile, Modules, Starting setup, Completion. */
export const ONBOARDING_TOTAL_STEPS = 6;

export interface OnboardingState {
  status: OnboardingStatus;
  currentStep: number;
  startedAt?: string;
  completedAt?: string;
  version: number;
}

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  status: 'not_started',
  currentStep: 0,
  version: ONBOARDING_SCHEMA_VERSION,
};

/** "Where should uFlow help first?" — multi-select, non-binding (see UserProfile.onboardingPriorities docs). */
export type OnboardingPriority =
  | 'decideWhatToEat'
  | 'planMeals'
  | 'reduceWaste'
  | 'manageSafeFoods'
  | 'stayWithinBudget'
  | 'understandNutrition'
  | 'connectGroceryStock';

export type OnboardingStartPath = 'demo' | 'empty' | 'quickStock';
