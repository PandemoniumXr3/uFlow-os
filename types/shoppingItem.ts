export type ShoppingSource = 'manual' | 'automatic';

export type ShoppingPriority = 'normal' | 'high';

/**
 * Why an automatic item is on the list. 'todayMeal'/'weekMeal' are day-scope
 * flags added at most once each; 'missingForRecipe' is added once per linked
 * recipe so a shared ingredient (e.g. Banana) shows every meal that needs it.
 */
export type ShoppingReasonType =
  | 'todayMeal'
  | 'weekMeal'
  | 'missingForRecipe'
  | 'lowStock'
  | 'empty'
  | 'alwaysInStock'
  | 'manual';

export interface ShoppingReasonDetail {
  type: ShoppingReasonType;
  label: string;
  recipeId?: string;
}

export interface ShoppingItem {
  id: string;
  productId?: string;
  displayName: string;
  normalizedName: string;
  quantity?: number;
  unit?: string;
  source: ShoppingSource;
  reasons: ShoppingReasonDetail[];
  linkedRecipeIds: string[];
  linkedMealPlanIds: string[];
  checked: boolean;
  purchased: boolean;
  priority: ShoppingPriority;
  createdAt: number;
  updatedAt: number;
}

export type NewManualShoppingItem = {
  displayName: string;
  productId?: string;
  quantity?: number;
  unit?: string;
};

/** Per-automatic-item user overlay, keyed by normalizedName so it survives regeneration. */
export interface AutomaticItemOverlayEntry {
  id: string;
  checked: boolean;
  purchased: boolean;
  hidden: boolean;
  updatedAt: number;
}

export type AutomaticItemOverlay = Record<string, AutomaticItemOverlayEntry>;
