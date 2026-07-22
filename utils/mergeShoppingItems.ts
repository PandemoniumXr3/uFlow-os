import type { ShoppingReasonDetail } from '@/types/shoppingItem';

export interface ShoppingItemCandidate {
  displayName: string;
  normalizedName: string;
  productId?: string;
  quantity?: number;
  unit?: string;
  reasons: ShoppingReasonDetail[];
  linkedRecipeIds: string[];
  linkedMealPlanIds: string[];
}

function reasonKey(reason: ShoppingReasonDetail): string {
  return `${reason.type}:${reason.recipeId ?? ''}`;
}

function dedupe<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

/**
 * Collapses candidates that share a normalizedName into one, unioning their
 * reasons/linkedRecipeIds/linkedMealPlanIds. This is what turns "Banana
 * needed for Açaí Bowl" and "Banana needed for Mango Smoothie" into a single
 * Banana shopping item listing both meals — never operates across the
 * manual/automatic boundary, only within the automatic candidate set.
 */
export function mergeShoppingItems(candidates: ShoppingItemCandidate[]): ShoppingItemCandidate[] {
  const byNormalizedName = new Map<string, ShoppingItemCandidate>();

  for (const candidate of candidates) {
    const existing = byNormalizedName.get(candidate.normalizedName);
    if (!existing) {
      byNormalizedName.set(candidate.normalizedName, {
        ...candidate,
        reasons: [...candidate.reasons],
        linkedRecipeIds: dedupe(candidate.linkedRecipeIds),
        linkedMealPlanIds: dedupe(candidate.linkedMealPlanIds),
      });
      continue;
    }

    const mergedReasons = [...existing.reasons];
    const seenReasonKeys = new Set(mergedReasons.map(reasonKey));
    for (const reason of candidate.reasons) {
      const key = reasonKey(reason);
      if (!seenReasonKeys.has(key)) {
        mergedReasons.push(reason);
        seenReasonKeys.add(key);
      }
    }

    byNormalizedName.set(candidate.normalizedName, {
      ...existing,
      productId: existing.productId ?? candidate.productId,
      quantity: existing.quantity ?? candidate.quantity,
      unit: existing.unit ?? candidate.unit,
      reasons: mergedReasons,
      linkedRecipeIds: dedupe([...existing.linkedRecipeIds, ...candidate.linkedRecipeIds]),
      linkedMealPlanIds: dedupe([...existing.linkedMealPlanIds, ...candidate.linkedMealPlanIds]),
    });
  }

  return Array.from(byNormalizedName.values());
}
