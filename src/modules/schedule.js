/**
 * Schedule history.
 *
 * A habit does not have one schedule but a list of them, each valid from a
 * date onwards:
 *
 *   schedules: [
 *     { from: '2026-09-01', type: 'daily',    days: [] },
 *     { from: '2026-10-09', type: 'weekdays', days: [0, 2, 4] },
 *   ]
 *
 * Changing the weekdays adds a new entry starting today. Earlier days keep
 * the rule that applied back then, so past expectations and streaks never
 * change after an edit. The first entry also covers any earlier dates.
 */
import { isValidKey } from './dates.js';

/** Cleans a rule of unknown quality into { type, days }. */
export function normalizeRule(rule) {
  if (rule?.type !== 'weekdays' || !Array.isArray(rule.days)) return { type: 'daily', days: [] };
  const days = [...new Set(rule.days)].filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  days.sort((a, b) => a - b);
  // No valid day, or all seven: both mean "every day".
  return days.length === 0 || days.length === 7 ? { type: 'daily', days: [] } : { type: 'weekdays', days };
}

export function sameRule(a, b) {
  return a.type === b.type && a.days.join() === b.days.join();
}

/** The rule in force today and from now on. */
export function currentRule(habit) {
  return habit.schedules.at(-1);
}

/** The rule that applied on the given day. */
export function ruleOn(habit, dateKey) {
  let rule = habit.schedules[0];
  for (const entry of habit.schedules) {
    if (entry.from > dateKey) break;
    rule = entry;
  }
  return rule;
}

/** Sorts by date and drops entries that do not change anything. */
function compact(schedules) {
  const sorted = [...schedules].sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  const result = [];
  for (const entry of sorted) {
    const previous = result.at(-1);
    if (previous && previous.from === entry.from) result[result.length - 1] = entry;
    else if (!previous || !sameRule(previous, entry)) result.push(entry);
  }
  return result;
}

/**
 * Returns the history after the user picked `rule` in the form.
 * The new rule starts today; an entry that already starts today or later
 * (a new habit, or a second edit on the same day) is simply replaced.
 */
export function applyScheduleChange(schedules, rule, today) {
  const next = normalizeRule(rule);
  const last = schedules.at(-1);
  if (sameRule(last, next)) return schedules;

  if (last.from >= today) return compact([...schedules.slice(0, -1), { from: last.from, ...next }]);
  return [...schedules, { from: today, ...next }];
}

/**
 * Builds a valid history from stored data. Version 1 stored a single
 * `schedule`; it becomes one entry starting at the habit's start date, which
 * is exactly how version 1 interpreted it.
 */
export function sanitizeSchedules(rawSchedules, legacyRule, startDate) {
  const entries = (Array.isArray(rawSchedules) ? rawSchedules : [])
    .filter((entry) => entry && typeof entry === 'object' && isValidKey(entry.from))
    .map((entry) => ({ from: entry.from, ...normalizeRule(entry) }));

  const history = compact(entries);
  return history.length > 0 ? history : [{ from: startDate, ...normalizeRule(legacyRule) }];
}
