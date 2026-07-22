import type { NutrientKey, NutritionInfo } from '@/types/nutrition';
import { getVisibleNutritionRows, type NutritionRow } from '@/utils/getVisibleNutritionRows';
import type { NutrientTotals } from '@/utils/nutrientTotals';
import { getVisibleTotalsRows } from '@/utils/nutrientTotalsRows';

const SOURCE_LABEL: Record<NutritionInfo['source'], string> = {
  verified: 'Verified',
  imported: 'Imported',
  'user-entered': 'Entered by you',
  estimated: 'Estimated',
};

export interface NutritionDisplay {
  /** "420 kcal", or null when kcal specifically isn't known — never "0 kcal". */
  kcalLabel: string | null;
  /** Non-kcal rows that actually have data, respecting the user's per-nutrient visibility choice. */
  macroRows: NutritionRow[];
  /** "Estimated" / "Entered by you" / etc. — null when there's nothing to attribute. */
  sourceLabel: string | null;
  /** True when there is genuinely nothing to show — render "Nutrition unavailable", not a zeroed-out grid. */
  isUnavailable: boolean;
}

const UNAVAILABLE: NutritionDisplay = { kcalLabel: null, macroRows: [], sourceLabel: null, isUnavailable: true };

/** A single recipe's per-serving (or scaled) nutrition — the ground-truth source, so an absent field is simply absent. */
export function resolveRecipeNutritionDisplay(
  nutrition: NutritionInfo | undefined,
  hiddenNutrients: ReadonlySet<NutrientKey>,
  onlyKeys?: NutrientKey[]
): NutritionDisplay {
  if (!nutrition) return UNAVAILABLE;

  const allowed = onlyKeys ? new Set(onlyKeys) : null;
  const rows = getVisibleNutritionRows(nutrition, hiddenNutrients).filter((row) => !allowed || allowed.has(row.key));
  if (rows.length === 0) return UNAVAILABLE;

  const kcalRow = rows.find((row) => row.key === 'kcal');
  return {
    kcalLabel: kcalRow ? `${Math.round(kcalRow.value)} kcal` : null,
    macroRows: rows.filter((row) => row.key !== 'kcal'),
    sourceLabel: SOURCE_LABEL[nutrition.source],
    isUnavailable: false,
  };
}

/**
 * Aggregated totals (consumed/planned, Today/Day Detail/Week) — NutrientTotals
 * always carries numeric zeros by construction (see nutrientTotals.ts), so a
 * plain read of `totals.kcal` can't tell "genuinely zero" apart from "no
 * contributing meal had nutrition data at all." Callers must compute
 * `hasNutritionData` themselves from the raw entries (see
 * utils/nutritionDataPresence.ts) — this function only decides what to
 * render once that's known, so the decision lives in one place.
 */
export function resolveTotalsNutritionDisplay(
  totals: NutrientTotals,
  hasNutritionData: boolean,
  hiddenNutrients: ReadonlySet<NutrientKey>,
  onlyKeys?: NutrientKey[]
): NutritionDisplay {
  if (!hasNutritionData) return UNAVAILABLE;

  const rows = getVisibleTotalsRows(totals, hiddenNutrients, onlyKeys);
  const kcalRow = rows.find((row) => row.key === 'kcal');
  return {
    kcalLabel: kcalRow ? `${Math.round(kcalRow.value)} kcal` : null,
    macroRows: rows.filter((row) => row.key !== 'kcal'),
    sourceLabel: null,
    isUnavailable: false,
  };
}
