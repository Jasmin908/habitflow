// Tests for the date, streak and storage logic. Run with: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addDays, fromKey, isValidKey, startOfWeek, toKey, weekKeys, weekdayIndex } from '../src/modules/dates.js';
import { bestStreak, currentStreak, dayProgress, describeSchedule, isScheduled, streakSummary } from '../src/modules/stats.js';
import { sanitizeState } from '../src/modules/storage.js';
import { WEEKDAYS } from '../src/modules/dates.js';

// Version 2 stores a schedule history; a habit that was never edited has one entry.
const daily = (overrides = {}) => ({
  id: 'a',
  name: 'Read',
  category: 'Learning',
  icon: 'book',
  schedules: [{ from: overrides.startDate ?? '2026-10-01', type: 'daily', days: [] }],
  startDate: '2026-10-01',
  createdAt: '2026-10-01',
  ...overrides,
});

// 2026-10-05 is a Monday.
const monWedFri = (overrides = {}) =>
  daily({ id: 'b', schedules: [{ from: '2026-10-01', type: 'weekdays', days: [0, 2, 4] }], ...overrides });

const completions = (id, keys) => Object.fromEntries(keys.map((key) => [key, [id]]));

test('date keys use the local calendar day, not UTC', () => {
  // 23:30 local time is still the same local day, whatever the UTC date is.
  assert.equal(toKey(new Date(2026, 9, 9, 23, 30)), '2026-10-09');
  assert.equal(toKey(new Date(2026, 9, 9, 0, 15)), '2026-10-09');
  assert.equal(toKey(fromKey('2026-01-01')), '2026-01-01');
});

test('addDays crosses months, years and daylight-saving changes', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addDays('2026-03-28', 2), '2026-03-30'); // DST starts in Europe
  assert.equal(addDays('2026-10-24', 2), '2026-10-26'); // DST ends in Europe
  assert.equal(addDays('2028-02-28', 1), '2028-02-29'); // leap year
});

test('weeks start on Monday', () => {
  assert.equal(weekdayIndex('2026-10-05'), 0);
  assert.equal(weekdayIndex('2026-10-11'), 6);
  assert.equal(startOfWeek('2026-10-09'), '2026-10-05');
  assert.deepEqual(weekKeys('2026-10-09').at(-1), '2026-10-11');
});

test('isValidKey rejects impossible dates', () => {
  assert.equal(isValidKey('2026-10-09'), true);
  assert.equal(isValidKey('2026-02-30'), false);
  assert.equal(isValidKey('2026-1-1'), false);
  assert.equal(isValidKey(20261009), false);
});

test('a habit is not scheduled before its start date or on other weekdays', () => {
  assert.equal(isScheduled(daily(), '2026-09-30'), false);
  assert.equal(isScheduled(daily(), '2026-10-01'), true);
  assert.equal(isScheduled(monWedFri(), '2026-10-05'), true); // Monday
  assert.equal(isScheduled(monWedFri(), '2026-10-06'), false); // Tuesday
});

test('current streak counts back over completed days', () => {
  const done = completions('a', ['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']);
  assert.equal(currentStreak(daily(), done, '2026-10-09'), 4);
});

test('today not done yet does not break the streak', () => {
  const done = completions('a', ['2026-10-07', '2026-10-08']);
  assert.equal(currentStreak(daily(), done, '2026-10-09'), 2);
});

test('a missed scheduled day ends the streak', () => {
  const done = completions('a', ['2026-10-05', '2026-10-06', '2026-10-08', '2026-10-09']);
  assert.equal(currentStreak(daily(), done, '2026-10-09'), 2);
});

test('unscheduled days are skipped, not counted as missed', () => {
  // Mon, Wed, Fri done; Tue and Thu are not scheduled.
  const done = completions('b', ['2026-10-05', '2026-10-07', '2026-10-09']);
  assert.equal(currentStreak(monWedFri(), done, '2026-10-09'), 3);
  // Seen from Saturday (not scheduled) the streak is unchanged.
  assert.equal(currentStreak(monWedFri(), done, '2026-10-10'), 3);
});

test('the streak never reaches back before the start date', () => {
  const habit = daily({ startDate: '2026-10-08' });
  const done = completions('a', ['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']);
  assert.equal(currentStreak(habit, done, '2026-10-09'), 2);
});

test('no completions means no streak', () => {
  assert.equal(currentStreak(daily(), {}, '2026-10-09'), 0);
  assert.equal(bestStreak(daily(), {}, '2026-10-09'), 0);
});

test('best streak finds the longest run in the history', () => {
  const done = completions('a', ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06']);
  assert.equal(bestStreak(daily(), done, '2026-10-09'), 3);
  assert.equal(currentStreak(daily(), done, '2026-10-09'), 0);
});

test('day progress only counts habits scheduled that day', () => {
  const state = {
    habits: [daily(), monWedFri()],
    completions: { '2026-10-06': ['a'], '2026-10-05': ['a'] },
  };
  // Tuesday: only the daily habit is scheduled, and it is done.
  assert.deepEqual(dayProgress(state, '2026-10-06'), { scheduled: 1, done: 1, percent: 100 });
  // Monday: both scheduled, one done.
  assert.deepEqual(dayProgress(state, '2026-10-05'), { scheduled: 2, done: 1, percent: 50 });
  // Before either habit started: nothing scheduled, no percentage.
  assert.deepEqual(dayProgress(state, '2026-09-01'), { scheduled: 0, done: 0, percent: null });
});

test('streak summary picks the longest active and longest ever streak', () => {
  const state = {
    habits: [daily(), monWedFri()],
    completions: {
      '2026-10-05': ['b'],
      '2026-10-07': ['b'],
      '2026-10-08': ['a'],
      '2026-10-09': ['a', 'b'],
    },
  };
  const summary = streakSummary(state, '2026-10-09');
  assert.equal(summary.current.days, 3);
  assert.equal(summary.current.habit.id, 'b');
  assert.equal(summary.best.days, 3);
  assert.deepEqual(streakSummary({ habits: [], completions: {} }, '2026-10-09').current, { days: 0, habit: null });
});

test('schedules are described in words', () => {
  assert.equal(describeSchedule({ type: 'daily', days: [] }, WEEKDAYS), 'Every day');
  assert.equal(describeSchedule({ type: 'weekdays', days: [0, 1, 2, 3, 4] }, WEEKDAYS), 'Weekdays');
  assert.equal(describeSchedule({ type: 'weekdays', days: [5, 6] }, WEEKDAYS), 'Weekends');
  assert.equal(describeSchedule({ type: 'weekdays', days: [4, 0, 2] }, WEEKDAYS), 'Mon, Wed, Fri');
});

test('damaged stored data is repaired instead of crashing', () => {
  assert.deepEqual(sanitizeState(null), { version: 2, habits: [], completions: {} });
  assert.deepEqual(sanitizeState('nonsense'), { version: 2, habits: [], completions: {} });
  assert.deepEqual(sanitizeState({ habits: 'x', completions: 7 }), { version: 2, habits: [], completions: {} });

  // The damaged entries below use the version 1 shape (a single `schedule`).
  const repaired = sanitizeState({
    habits: [
      daily(),
      daily(), // duplicate id
      { id: 'c', name: '   ' }, // no name
      { name: 'No id' },
      { id: 'd', name: 'Stretch', category: 'Unknown', icon: 'nope', schedule: { type: 'weekdays', days: [9, 1, 1] } },
      null,
    ],
    completions: {
      '2026-10-09': ['a', 'a', 'ghost', 'd'],
      'not-a-date': ['a'],
      '2026-10-08': 'a',
      '2026-10-07': ['ghost'],
    },
  });

  assert.deepEqual(
    repaired.habits.map((habit) => habit.id),
    ['a', 'd'],
  );
  const stretch = repaired.habits[1];
  assert.equal(stretch.category, 'Health');
  assert.equal(stretch.icon, 'target');
  assert.deepEqual(stretch.schedules, [{ from: stretch.startDate, type: 'weekdays', days: [1] }]);
  assert.equal(isValidKey(stretch.startDate), true);
  assert.deepEqual(repaired.completions, { '2026-10-09': ['a', 'd'] });
});
