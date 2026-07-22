/**
 * "Not this" has three tiers, from lightest to heaviest:
 *  - session (in-memory only, e.g. MealSuggestions' local dismissed-ids set) — never persisted, never reaches this type
 *  - 'day' — persisted, only suppresses the recipe for the specific date it was dismissed on
 *  - 'permanent' — persisted, suppresses the recipe everywhere until explicitly un-hidden
 * A reason is always optional — dismissing should never require justification.
 */
export type DismissalScope = 'day' | 'permanent';

export type DismissalReason =
  | 'notInMood'
  | 'tooMuchEffort'
  | 'missingTooMuch'
  | 'tooExpensive'
  | 'notSafeToday'
  | 'recentlyEaten'
  | 'other';

export interface DismissalEntry {
  id: string;
  recipeId: string;
  scope: DismissalScope;
  /** Set only for scope 'day' — the calendar date (YYYY-MM-DD) the dismissal applies to. */
  date?: string;
  reason?: DismissalReason;
  dismissedAt: number;
}
