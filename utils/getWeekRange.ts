import { formatDateKey } from '@/utils/date';

export interface WeekRange {
  start: string;
  end: string;
}

/**
 * Calendar week (Monday-Sunday) containing referenceDate, as inclusive
 * YYYY-MM-DD boundaries. Local time throughout, matching getTodayKey.
 */
export function getWeekRange(referenceDate: Date = new Date()): WeekRange {
  const dayOfWeek = referenceDate.getDay(); // 0 = Sunday .. 6 = Saturday
  const daysSinceMonday = (dayOfWeek + 6) % 7;

  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - daysSinceMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return { start: formatDateKey(monday), end: formatDateKey(sunday) };
}

/** Inclusive range check. Works via plain string comparison since YYYY-MM-DD is zero-padded and lexicographically ordered. */
export function isDateWithinRange(dateKey: string, range: WeekRange): boolean {
  return dateKey >= range.start && dateKey <= range.end;
}

const SHORT_WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface DateOption {
  date: string;
  label: string;
}

/**
 * Concrete, selectable dates for a lightweight in-app day picker (tomorrow
 * through +count days) — chip-based, same pattern as the expiration-date
 * presets in Stock, so "plan for another day" never has to guess a date on
 * the user's behalf. Every date returned is a real calendar date; nothing
 * here is a stored concept, it's just candidates for the picker UI.
 */
export function getUpcomingDateOptions(referenceDate: Date = new Date(), count = 6): DateOption[] {
  const options: DateOption[] = [];
  for (let offset = 1; offset <= count; offset++) {
    const date = new Date(referenceDate);
    date.setDate(referenceDate.getDate() + offset);
    const weekday = SHORT_WEEKDAY_NAMES[date.getDay()];
    options.push({ date: formatDateKey(date), label: `${weekday} ${date.getDate()}` });
  }
  return options;
}
