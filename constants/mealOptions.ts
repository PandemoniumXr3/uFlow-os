import type { Effort, MealCategory, MealType } from '@/types/recipe';

export const MEAL_TYPE_OPTIONS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'drink', label: 'Drink' },
];

export const MEAL_CATEGORY_OPTIONS: { value: MealCategory; label: string }[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'high-protein', label: 'High-Protein' },
  { value: 'comfort', label: 'Comfort' },
  { value: 'healthy', label: 'Healthy' },
  { value: 'quick', label: 'Quick' },
  { value: 'sweet', label: 'Sweet' },
  { value: 'savory', label: 'Savory' },
  { value: 'hot', label: 'Hot' },
  { value: 'cold', label: 'Cold' },
  { value: 'budget', label: 'Budget' },
  { value: 'meal-prep', label: 'Meal Prep' },
  { value: 'low-effort', label: 'Low Effort' },
];

export const EFFORT_OPTIONS: { value: Effort; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];
