import { asyncStorageClient } from '@/services/storage/asyncStorageClient';
import { removeManyById } from '@/services/storage/batchHelpers';
import type { DismissalEntry } from '@/types/dismissal';

const DISMISSALS_KEY = 'uflow.dismissals';

/**
 * Domain-level contract for persisting day/permanent dismissals — a flat
 * list, same pattern as the other list-shaped storage services. Session
 * dismissals never reach here (they're plain in-memory component state).
 */
export interface DismissalStorageService {
  getAll(): Promise<DismissalEntry[]>;
  /** Full-array replace — used by import replace/merge, where the caller has already computed the exact final list. */
  save(entries: DismissalEntry[]): Promise<void>;
  add(entry: DismissalEntry): Promise<void>;
  remove(id: string): Promise<void>;
  /** One read + one write for the whole batch — see mealPlanStorageService.removeMany for why Promise.all(ids.map(remove)) is unsafe here. */
  removeMany(ids: string[]): Promise<void>;
  /** Removes every persisted dismissal — the "clear learned suggestion history" action. */
  clearAll(): Promise<void>;
}

export const dismissalStorageService: DismissalStorageService = {
  async getAll() {
    return (await asyncStorageClient.getJSON<DismissalEntry[]>(DISMISSALS_KEY)) ?? [];
  },

  async save(entries) {
    await asyncStorageClient.setJSON(DISMISSALS_KEY, entries);
  },

  async add(entry) {
    const current = await dismissalStorageService.getAll();
    await asyncStorageClient.setJSON(DISMISSALS_KEY, [...current, entry]);
  },

  async remove(id) {
    const current = await dismissalStorageService.getAll();
    await asyncStorageClient.setJSON(
      DISMISSALS_KEY,
      current.filter((entry) => entry.id !== id)
    );
  },

  async removeMany(ids) {
    if (ids.length === 0) return;
    const current = await dismissalStorageService.getAll();
    await asyncStorageClient.setJSON(DISMISSALS_KEY, removeManyById(current, ids));
  },

  async clearAll() {
    await asyncStorageClient.setJSON(DISMISSALS_KEY, []);
  },
};
