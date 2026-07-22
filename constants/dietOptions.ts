import type { DietType } from '@/types/diet';

export const DIET_OPTIONS: { value: DietType; label: string }[] = [
  { value: 'vegan', label: 'Vegan' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'highProtein', label: 'High-Protein' },
];
