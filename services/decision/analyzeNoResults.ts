import type { NoResultAnalysis, RelaxationOption, RelaxationType } from '@/services/decision/types';
import type { Recipe } from '@/types/recipe';

export interface NoResultFilterProbe {
  type: RelaxationType;
  label: string;
  passes: (recipe: Recipe) => boolean;
}

/**
 * `candidates` must already be past every hard exclusion (allergies,
 * intolerances, diet, avoided ingredients, permanent hides) — this function
 * only ever considers relaxing the Level-2 explicit-context filters passed
 * in as `filters`, so it can never suggest relaxing a safety constraint.
 * For each filter, checks whether dropping just that one filter (keeping
 * every other) would produce at least one result; the filter that unlocks
 * the fewest recipes is reported as the single narrowest blocker.
 */
export function analyzeNoResults(candidates: Recipe[], filters: NoResultFilterProbe[]): NoResultAnalysis {
  if (candidates.length === 0) {
    return { message: 'No meals match every selected preference.', relaxationOptions: [] };
  }

  const unlocked: { filter: NoResultFilterProbe; count: number }[] = [];
  for (const filter of filters) {
    const others = filters.filter((candidate) => candidate !== filter);
    const count = candidates.filter((recipe) => others.every((other) => other.passes(recipe))).length;
    if (count > 0) unlocked.push({ filter, count });
  }

  unlocked.sort((a, b) => a.count - b.count);

  const relaxationOptions: RelaxationOption[] = unlocked.map((entry) => ({ type: entry.filter.type, label: entry.filter.label }));

  return {
    message: 'No meals match every selected preference.',
    blockingReason: unlocked[0]?.filter.label,
    relaxationOptions,
  };
}
