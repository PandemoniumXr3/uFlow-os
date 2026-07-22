export interface DiversityCandidate {
  recipeId: string;
  score: number;
  /** The recipe's first category tag, if any — the diversity signal the milestone specifies ("avoid three recipes using the same primary category"). */
  primaryCategory?: string;
}

/**
 * Greedily builds a top-`limit` list that prefers not repeating a primary
 * category already selected, without ever dropping below `limit` results
 * just for the sake of variety — if no diverse candidate remains, the next
 * best-scoring one is taken anyway. `ranked` must already be sorted
 * descending by score.
 */
export function diversifySuggestions(ranked: DiversityCandidate[], limit: number): string[] {
  const remaining = [...ranked];
  const selected: DiversityCandidate[] = [];

  while (selected.length < limit && remaining.length > 0) {
    let pickIndex = remaining.findIndex(
      (candidate) => !candidate.primaryCategory || !selected.some((chosen) => chosen.primaryCategory === candidate.primaryCategory)
    );
    if (pickIndex === -1) pickIndex = 0;

    selected.push(remaining[pickIndex]);
    remaining.splice(pickIndex, 1);
  }

  return selected.map((candidate) => candidate.recipeId);
}
