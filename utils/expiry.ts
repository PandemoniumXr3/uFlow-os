function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Whole days from today until `dateStr` (YYYY-MM-DD). Negative if already past. */
export function daysUntil(dateStr: string): number {
  const today = startOfDay(new Date());
  const target = startOfDay(new Date(dateStr));
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function isExpired(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  return daysUntil(dateStr) < 0;
}

export function isExpiringSoon(dateStr: string | undefined, withinDays = 3): boolean {
  if (!dateStr) return false;
  const days = daysUntil(dateStr);
  return days >= 0 && days <= withinDays;
}
