import { asyncStorageClient } from '@/services/storage/asyncStorageClient';
import { removeManyById } from '@/services/storage/batchHelpers';
import type { PlannedMeal, PlannedMealUpdate } from '@/types/mealPlan';

const MEAL_PLAN_KEY = 'uflow.mealPlan';

export interface MealPlanStorageService {
  getAll(): Promise<PlannedMeal[]>;
  save(entries: PlannedMeal[]): Promise<void>;
  add(entry: PlannedMeal): Promise<void>;
  remove(id: string): Promise<void>;
  /** One read + one write for the whole batch — removing several entries via `Promise.all(ids.map(remove))` instead is a real race: each call reads the same pre-removal snapshot, so only the last write survives and the rest are silently dropped. */
  removeMany(ids: string[]): Promise<void>;
  update(id: string, patch: PlannedMealUpdate): Promise<void>;
}

export const mealPlanStorageService: MealPlanStorageService = {
  async getAll() {
    const entries = await asyncStorageClient.getJSON<PlannedMeal[]>(MEAL_PLAN_KEY);
    return entries ?? [];
  },

  async save(entries) {
    await asyncStorageClient.setJSON(MEAL_PLAN_KEY, entries);
  },

  async add(entry) {
    const entries = await mealPlanStorageService.getAll();
    await asyncStorageClient.setJSON(MEAL_PLAN_KEY, [...entries, entry]);
  },

  async remove(id) {
    const entries = await mealPlanStorageService.getAll();
    await asyncStorageClient.setJSON(
      MEAL_PLAN_KEY,
      entries.filter((entry) => entry.id !== id)
    );
  },

  async removeMany(ids) {
    if (ids.length === 0) return;
    const entries = await mealPlanStorageService.getAll();
    await asyncStorageClient.setJSON(MEAL_PLAN_KEY, removeManyById(entries, ids));
  },

  async update(id, patch) {
    const entries = await mealPlanStorageService.getAll();
    await asyncStorageClient.setJSON(
      MEAL_PLAN_KEY,
      entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
    );
  },
};
