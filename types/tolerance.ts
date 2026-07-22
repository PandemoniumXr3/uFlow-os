export type Allergen =
  | 'gluten'
  | 'dairy'
  | 'eggs'
  | 'peanuts'
  | 'treeNuts'
  | 'soy'
  | 'shellfish'
  | 'fish'
  | 'sesame';

export type Intolerance = 'lactose' | 'ibs' | 'histamine' | 'fructose';

export interface ToleranceProfile {
  allergies: Allergen[];
  intolerances: Intolerance[];
  safeMealsOnly: boolean;
}

export const DEFAULT_TOLERANCE_PROFILE: ToleranceProfile = {
  allergies: [],
  intolerances: [],
  safeMealsOnly: false,
};
