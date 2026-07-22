export type DietType = 'vegan' | 'vegetarian' | 'pescatarian' | 'highProtein';

export interface DietProfile {
  active: DietType[];
  matchDietOnly: boolean;
}

export const DEFAULT_DIET_PROFILE: DietProfile = {
  active: [],
  matchDietOnly: false,
};
