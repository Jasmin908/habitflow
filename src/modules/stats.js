/**
 * Streak and progress calculations.
 *
 * Everything here is a pure function of the stored data: no numbers are
 * invented, and nothing reads the clock (the caller passes `today`).
 *
 * A habit only "counts" on days it is scheduled for. Days it is not
 * scheduled for, and days before its start date, are skipped. They neither
 * extend nor break a streak.
 */
import { addDays, weekdayIndex } from './dates.js';
import { ruleOn } from './schedule.js';

/** Stops runaway loops if stored data is ever inconsistent (about 20 years). */
const MAX_DAYS = 7305;

/** Uses the rule that applied on that day, not the habit's current rule. */
export function isScheduled(habit, dateKey) {
  if (dateKey < habit.startDate) return false;
  const rule = ruleOn(habit, dateKey);
  return rule.type === 'daily' || rule.days.includes(weekdayIndex(dateKey));
}

export function isDone(completions, habitId, dateKey) {
  return completions[dateKey]?.includes(habitId) ?? false;
}

export function habitsForDate(habits, dateKey) {
  return habits.filter((habit) => isScheduled(habit, dateKey));
}

/** Progress of one day. `percent` is null when nothing is scheduled. */
export function dayProgress(state, dateKey) {
  const scheduled = habitsForDate(state.habits, dateKey);
  const done = scheduled.filter((habit) => isDone(state.completions, habit.id, dateKey)).length;
  return {
    scheduled: scheduled.length,
    done,
    percent: scheduled.length === 0 ? null : Math.round((done / scheduled.length) * 100),
  };
}

/**
 * Consecutive scheduled days completed, counted back from today.
 * If today is scheduled but not done yet, the streak is still alive: the
 * day is not over, so counting starts from the previous scheduled day.
 */
export function currentStreak(habit, completions, today) {
  let day = today;
  if (isScheduled(habit, day) && !isDone(completions, habit.id, day)) {
    day = addDays(day, -1);
  }

  let streak = 0;
  for (let i = 0; i < MAX_DAYS && day >= habit.startDate; i += 1) {
    if (isScheduled(habit, day)) {
      if (!isDone(completions, habit.id, day)) break;
      streak += 1;
    }
    day = addDays(day, -1);
  }
  return streak;
}

/** Longest run of consecutive scheduled days completed, up to today. */
export function bestStreak(habit, completions, today) {
  let best = 0;
  let run = 0;
  let day = habit.startDate;
  for (let i = 0; i < MAX_DAYS && day <= today; i += 1) {
    if (isScheduled(habit, day)) {
      run = isDone(completions, habit.id, day) ? run + 1 : 0;
      best = Math.max(best, run);
    }
    day = addDays(day, 1);
  }
  return best;
}

/** The habit with the longest active streak, and the longest streak ever. */
export function streakSummary(state, today) {
  let current = { days: 0, habit: null };
  let best = { days: 0, habit: null };

  for (const habit of state.habits) {
    const active = currentStreak(habit, state.completions, today);
    if (active > current.days) current = { days: active, habit };

    const longest = bestStreak(habit, state.completions, today);
    if (longest > best.days) best = { days: longest, habit };
  }
  return { current, best };
}

/**
 * How a day went, for the calendar and the week strip.
 *   future   – not here yet, never counted as missed
 *   none     – nothing was scheduled
 *   complete – everything scheduled was done
 *   partial  – some of it was done
 *   pending  – today, nothing done yet (the day is not over)
 *   missed   – a past day with scheduled habits and none done
 */
export function dayStatus(state, dateKey, today) {
  if (dateKey > today) return 'future';
  const { scheduled, done } = dayProgress(state, dateKey);
  if (scheduled === 0) return 'none';
  if (done === scheduled) return 'complete';
  if (done > 0) return 'partial';
  return dateKey === today ? 'pending' : 'missed';
}

/** Short description of a schedule, e.g. "Every day" or "Mon, Wed, Fri". */
export function describeSchedule(schedule, weekdays) {
  if (schedule.type === 'daily') return 'Every day';
  const days = [...schedule.days].sort((a, b) => a - b);
  const key = days.join('');
  if (key === '01234') return 'Weekdays';
  if (key === '56') return 'Weekends';
  return days.map((day) => weekdays[day].short).join(', ');
}
