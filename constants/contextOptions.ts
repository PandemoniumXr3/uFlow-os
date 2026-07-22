/** Option lists for the Today quick-context chips. Plain data — no wizard/step machinery. */

export const MOOD_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'good', label: 'Good' },
] as const;

export const CRAVING_OPTIONS = [
  { value: 'warm', label: 'Something warm' },
  { value: 'light', label: 'Something light' },
  { value: 'comfort', label: 'Comfort food' },
  { value: 'no-dairy', label: 'No dairy today' },
  { value: 'no-meat', label: 'No meat today' },
  { value: 'surprise', label: 'Surprise me' },
] as const;

export const TEMPERATURE_OPTIONS = [
  { value: 'warm', label: 'Warm' },
  { value: 'cold', label: 'Cold' },
  { value: 'either', label: 'Either' },
] as const;

export const ADVENTURE_OPTIONS = [
  { value: 'safe', label: 'Something familiar' },
  { value: 'new', label: 'Something different' },
  { value: 'either', label: 'Either' },
] as const;

export const BUDGET_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'flexible', label: 'Flexible' },
] as const;

export const LOCATION_OPTIONS = [
  { value: 'home', label: 'Home' },
  { value: 'work', label: 'Work' },
  { value: 'out', label: 'Out' },
] as const;

export const ENERGY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;
