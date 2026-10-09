/**
 * Calculations for the Statistics page.
 *
 * Same rules as everywhere else: only days a habit was scheduled for count,
 * and nothing after `today` is ever counted, so the future is never "missed".
 * All functions are pure; an empty history simply produces zeros and nulls.
 */
import { addDays, daysBetween, monthKeys, startOfMonth, startOfWeek } from './dates.js';
import { bestStreak, currentStreak, dayProgress, isDone, isScheduled } from './stats.js';

const percent = (done, scheduled) => (scheduled === 0 ? null : Math.round((done / scheduled) * 100));

/** Scheduled and completed occurrences between two days (inclusive), up to today. */
export function rangeProgress(state, from, to, today) {
  const end = to < today ? to : today;
  let scheduled = 0;
  let done = 0;
  for (let day = from; day <= end; day = addDays(day, 1)) {
    const progress = dayProgress(state, day);
    scheduled += progress.scheduled;
    done += progress.done;
  }
  return { scheduled, done, percent: percent(done, scheduled) };
}

export function weekProgress(state, today) {
  return rangeProgress(state, startOfWeek(today), today, today);
}

export function monthProgress(state, today) {
  return rangeProgress(state, startOfMonth(today), today, today);
}

/**
 * How much history there is to base statistics on, so the page can say so
 * instead of presenting a rate built on two days as if it meant much.
 *   empty    – no habits
 *   upcoming – habits exist, but none has started yet
 *   limited  – less than a week since the first habit started
 *   ok       – a week or more
 */
export function trackingSummary(state, today) {
  if (state.habits.length === 0) return { status: 'empty' };
  const firstDay = state.habits.map((habit) => habit.startDate).sort()[0];
  if (firstDay > today) return { status: 'upcoming', firstDay };
  const days = daysBetween(firstDay, today) + 1;
  return { status: days < 7 ? 'limited' : 'ok', firstDay, days };
}

/** Every completion on record, across all habits and days. */
export function totalCompletions(state) {
  return Object.values(state.completions).reduce((sum, ids) => sum + ids.length, 0);
}

/** The last `count` weeks (Monday to Sunday), oldest first; the last one is the current week. */
export function weeklySeries(state, today, count = 8) {
  const thisMonday = startOfWeek(today);
  return Array.from({ length: count }, (_, index) => {
    const start = addDays(thisMonday, (index - (count - 1)) * 7);
    const end = addDays(start, 6);
    return { start, end, isCurrent: start === thisMonday, ...rangeProgress(state, start, end, today) };
  });
}

/** One entry per day of the month containing `key`. Future days have no percentage. */
export function monthSeries(state, key, today) {
  return monthKeys(key).map((day) => {
    const future = day > today;
    const progress = future ? { scheduled: dayProgress(state, day).scheduled, done: 0, percent: null } : dayProgress(state, day);
    return { key: day, future, ...progress };
  });
}

/** Per-habit figures: the last `days` days, streaks and all-time completions. */
export function habitPerformance(state, today, days = 30) {
  const windowStart = addDays(today, -(days - 1));
  return state.habits.map((habit) => {
    let scheduled = 0;
    let done = 0;
    for (let day = windowStart; day <= today; day = addDays(day, 1)) {
      if (!isScheduled(habit, day)) continue;
      scheduled += 1;
      if (isDone(state.completions, habit.id, day)) done += 1;
    }
    const total = Object.values(state.completions).filter((ids) => ids.includes(habit.id)).length;
    return {
      habit,
      scheduled,
      done,
      percent: percent(done, scheduled),
      current: currentStreak(habit, state.completions, today),
      best: bestStreak(habit, state.completions, today),
      total,
    };
  });
}
