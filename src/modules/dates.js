/**
 * Date utilities.
 *
 * Days are identified by a "date key": the user's LOCAL calendar date as
 * 'YYYY-MM-DD'. Keys are built from getFullYear/getMonth/getDate, never from
 * toISOString(), which would use UTC and shift the day around midnight.
 * Keys sort correctly as plain strings, so they can be compared with < and >.
 */

const pad = (number) => String(number).padStart(2, '0');

export function toKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local midnight of the given key. */
export function fromKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isValidKey(key) {
  return typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key) && toKey(fromKey(key)) === key;
}

export function todayKey(now = new Date()) {
  return toKey(now);
}

/** setDate() keeps this correct across month ends and daylight-saving changes. */
export function addDays(key, amount) {
  const date = fromKey(key);
  date.setDate(date.getDate() + amount);
  return toKey(date);
}

/** Whole days from `from` to `to`. Rounding absorbs the hour gained or lost at daylight-saving changes. */
export function daysBetween(from, to) {
  return Math.round((fromKey(to) - fromKey(from)) / 86_400_000);
}

/** Monday = 0 … Sunday = 6. */
export function weekdayIndex(key) {
  return (fromKey(key).getDay() + 6) % 7;
}

export function startOfWeek(key) {
  return addDays(key, -weekdayIndex(key));
}

/** The seven keys (Monday to Sunday) of the week containing `key`. */
export function weekKeys(key) {
  const monday = startOfWeek(key);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function startOfMonth(key) {
  return `${key.slice(0, 8)}01`;
}

/** First day of the month `amount` months away. */
export function addMonths(key, amount) {
  const date = fromKey(startOfMonth(key));
  date.setMonth(date.getMonth() + amount);
  return toKey(date);
}

/** All day keys of the month containing `key`. */
export function monthKeys(key) {
  const first = startOfMonth(key);
  const next = addMonths(first, 1);
  const keys = [];
  for (let day = first; day < next; day = addDays(day, 1)) keys.push(day);
  return keys;
}

export const WEEKDAYS = [
  { short: 'Mon', long: 'Monday' },
  { short: 'Tue', long: 'Tuesday' },
  { short: 'Wed', long: 'Wednesday' },
  { short: 'Thu', long: 'Thursday' },
  { short: 'Fri', long: 'Friday' },
  { short: 'Sat', long: 'Saturday' },
  { short: 'Sun', long: 'Sunday' },
];

// The interface is in English, so dates are too: the visitor's own English
// variant when they have one, British English otherwise.
function locale() {
  const preferred = globalThis.navigator?.language ?? '';
  return preferred.startsWith('en') ? preferred : 'en-GB';
}

/** "Friday, 9 October 2026" */
export function formatLong(key) {
  return new Intl.DateTimeFormat(locale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fromKey(key));
}

/** "Fri, 9 Oct" */
export function formatShort(key) {
  return new Intl.DateTimeFormat(locale(), { weekday: 'short', day: 'numeric', month: 'short' }).format(
    fromKey(key),
  );
}

/** "9 Oct" */
export function formatDayMonth(key) {
  return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short' }).format(fromKey(key));
}

/** "October 2026" */
export function formatMonth(key) {
  return new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(fromKey(key));
}

/** "Today", "Yesterday", "Tomorrow" or a weekday name. */
export function relativeLabel(key, today) {
  if (key === today) return 'Today';
  if (key === addDays(today, -1)) return 'Yesterday';
  if (key === addDays(today, 1)) return 'Tomorrow';
  return WEEKDAYS[weekdayIndex(key)].long;
}

export function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
