export type ExpirationPresetValue = 'today' | 'tomorrow' | '3days' | '1week' | '2weeks' | '1month' | 'none';

export const EXPIRATION_PRESETS: { value: ExpirationPresetValue; label: string; days: number | null }[] = [
  { value: 'today', label: 'Today', days: 0 },
  { value: 'tomorrow', label: 'Tomorrow', days: 1 },
  { value: '3days', label: '3 days', days: 3 },
  { value: '1week', label: '1 week', days: 7 },
  { value: '2weeks', label: '2 weeks', days: 14 },
  { value: '1month', label: '1 month', days: 30 },
  { value: 'none', label: 'No expiration', days: null },
];

/** Resolves a quick preset to a YYYY-MM-DD date string, or undefined for "No expiration". */
export function resolveExpirationDate(preset: ExpirationPresetValue): string | undefined {
  const option = EXPIRATION_PRESETS.find((entry) => entry.value === preset);
  if (!option || option.days === null) return undefined;

  const date = new Date();
  date.setDate(date.getDate() + option.days);
  return date.toISOString().slice(0, 10);
}
