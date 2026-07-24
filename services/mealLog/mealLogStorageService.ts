import { asyncStorageClient } from '@/services/storage/asyncStorageClient';
import type { MealLogEntry } from '@/types/mealLog';

const MEAL_LOG_KEY = 'uflow.mealLog';

/**
 * Domain-level contract for persisting the meal history — an append-only
 * log used to compute repeat/familiarity counts for suggestions. Same
 * swappable AsyncStorage-backed pattern as the other storage services.
 */
export interface MealLogStorageService {
  getAll(): Promise<MealLogEntry[]>;
  /** Full-array replace — used by import replace/merge, where the caller has already computed the exact final list. */
  save(entries: MealLogEntry[]): Promise<void>;
  add(entry: MealLogEntry): Promise<void>;
}

export const mealLogStorageService: MealLogStorageService = {
  async getAll() {
    const entries = await asyncStorageClient.getJSON<MealLogEntry[]>(MEAL_LOG_KEY);
    return entries ?? [];
  },

  async save(entries) {
    await asyncStorageClient.setJSON(MEAL_LOG_KEY, entries);
  },

  async add(entry) {
    const entries = await mealLogStorageService.getAll();
    await asyncStorageClient.setJSON(MEAL_LOG_KEY, [...entries, entry]);
  },
};
