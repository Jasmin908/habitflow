// Tests for what version 2 added: schedule history, migration, analytics,
// calendar status, months, import/export and settings. Run with: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  habitPerformance,
  monthProgress,
  monthSeries,
  rangeProgress,
  totalCompletions,
  trackingSummary,
  weekProgress,
  weeklySeries,
} from '../src/modules/analytics.js';
import { addMonths, daysBetween, monthKeys, startOfMonth } from '../src/modules/dates.js';
import { applyScheduleChange, currentRule, ruleOn, sanitizeSchedules } from '../src/modules/schedule.js';
import { sanitizeSettings } from '../src/modules/settings.js';
import { bestStreak, currentStreak, dayStatus, isScheduled } from '../src/modules/stats.js';
import { sanitizeState } from '../src/modules/storage.js';
import { buildExport, parseImport } from '../src/modules/transfer.js';

const habit = (overrides = {}) => ({
  id: 'a',
  name: 'Read',
  category: 'Learning',
  icon: 'book',
  schedules: [{ from: '2026-09-01', type: 'daily', days: [] }],
  startDate: '2026-09-01',
  createdAt: '2026-09-01',
  ...overrides,
});

const DAILY = { type: 'daily', days: [] };
const MON_WED_FRI = { type: 'weekdays', days: [0, 2, 4] };
const TODAY = '2026-10-09'; // a Friday; 2026-10-05 is the Monday of that week

/* ---------- Schedule history ---------- */

test('changing the schedule adds an entry from today and keeps the old one', () => {
  const before = [{ from: '2026-09-01', ...DAILY }];
  const after = applyScheduleChange(before, MON_WED_FRI, TODAY);
  assert.deepEqual(after, [
    { from: '2026-09-01', ...DAILY },
    { from: TODAY, ...MON_WED_FRI },
  ]);
  assert.deepEqual(before, [{ from: '2026-09-01', ...DAILY }], 'the original list is not modified');
});

test('an unchanged schedule leaves the history alone', () => {
  const before = [{ from: '2026-09-01', ...MON_WED_FRI }];
  assert.equal(applyScheduleChange(before, { type: 'weekdays', days: [4, 0, 2] }, TODAY), before);
});

test('a second change on the same day replaces the first one', () => {
  const once = applyScheduleChange([{ from: '2026-09-01', ...DAILY }], MON_WED_FRI, TODAY);
  const twice = applyScheduleChange(once, { type: 'weekdays', days: [1] }, TODAY);
  assert.deepEqual(twice, [
    { from: '2026-09-01', ...DAILY },
    { from: TODAY, type: 'weekdays', days: [1] },
  ]);
  // Changing back to the original rule on the same day removes the extra entry.
  assert.deepEqual(applyScheduleChange(once, DAILY, TODAY), [{ from: '2026-09-01', ...DAILY }]);
});

test('a habit created today (or starting later) is changed in place', () => {
  assert.deepEqual(applyScheduleChange([{ from: TODAY, ...DAILY }], MON_WED_FRI, TODAY), [{ from: TODAY, ...MON_WED_FRI }]);
  assert.deepEqual(applyScheduleChange([{ from: '2026-11-01', ...DAILY }], MON_WED_FRI, TODAY), [
    { from: '2026-11-01', ...MON_WED_FRI },
  ]);
});

test('each day uses the rule that applied on that day', () => {
  const edited = habit({ schedules: applyScheduleChange([{ from: '2026-09-01', ...DAILY }], MON_WED_FRI, TODAY) });
  assert.deepEqual(ruleOn(edited, '2026-10-06'), { from: '2026-09-01', ...DAILY });
  assert.deepEqual(ruleOn(edited, TODAY), { from: TODAY, ...MON_WED_FRI });
  assert.deepEqual(currentRule(edited), { from: TODAY, ...MON_WED_FRI });

  assert.equal(isScheduled(edited, '2026-10-06'), true, 'Tuesday before the change: still daily');
  assert.equal(isScheduled(edited, '2026-10-13'), false, 'Tuesday after the change: not scheduled');
  assert.equal(isScheduled(edited, '2026-10-12'), true, 'Monday after the change');
});

test('editing the weekdays does not rewrite past streaks', () => {
  // Done every day from 1 to 8 October under the daily rule.
  const completions = Object.fromEntries(
    ['01', '02', '03', '04', '05', '06', '07', '08'].map((day) => [`2026-10-${day}`, ['a']]),
  );
  const original = habit();
  assert.equal(currentStreak(original, completions, TODAY), 8);
  assert.equal(bestStreak(original, completions, TODAY), 8);

  // On the 9th the habit is switched to Mondays only.
  const edited = habit({ schedules: applyScheduleChange(original.schedules, { type: 'weekdays', days: [0] }, TODAY) });
  assert.equal(currentStreak(edited, completions, TODAY), 8, 'the eight daily completions still count');
  assert.equal(bestStreak(edited, completions, TODAY), 8);

  // A week later, Monday the 12th was missed: only then does the streak end.
  assert.equal(currentStreak(edited, completions, '2026-10-16'), 0);
  assert.equal(bestStreak(edited, completions, '2026-10-16'), 8);

  // The other direction: tightening the schedule must not create missed days in the past.
  const sparse = habit({ schedules: [{ from: '2026-09-01', type: 'weekdays', days: [0] }] });
  const mondays = { '2026-09-28': ['a'], '2026-10-05': ['a'] };
  const tightened = habit({ schedules: applyScheduleChange(sparse.schedules, DAILY, TODAY) });
  assert.equal(currentStreak(tightened, mondays, TODAY), 2, 'Tuesday to Thursday were never expected');
});

/* ---------- Migration from version 1 ---------- */

test('version 1 data is migrated without losing anything', () => {
  const v1 = {
    version: 1,
    habits: [
      { id: 'a', name: 'Read', category: 'Learning', icon: 'book', schedule: { type: 'daily', days: [] }, startDate: '2026-09-01', createdAt: '2026-08-30' },
      { id: 'b', name: 'Gym', category: 'Fitness', icon: 'dumbbell', schedule: { type: 'weekdays', days: [0, 2, 4] }, startDate: '2026-09-07', createdAt: '2026-09-07' },
    ],
    completions: { '2026-10-07': ['a', 'b'], '2026-10-08': ['a'] },
  };
  const migrated = sanitizeState(v1);

  assert.equal(migrated.version, 2);
  assert.deepEqual(migrated.completions, v1.completions);
  assert.deepEqual(migrated.habits[0], {
    id: 'a',
    name: 'Read',
    category: 'Learning',
    icon: 'book',
    schedules: [{ from: '2026-09-01', type: 'daily', days: [] }],
    startDate: '2026-09-01',
    createdAt: '2026-08-30',
  });
  assert.deepEqual(migrated.habits[1].schedules, [{ from: '2026-09-07', type: 'weekdays', days: [0, 2, 4] }]);
  assert.equal('schedule' in migrated.habits[0], false);

  // Streaks are identical before and after the migration.
  assert.equal(currentStreak(migrated.habits[0], migrated.completions, TODAY), 2);
  // Migrating twice changes nothing.
  assert.deepEqual(sanitizeState(migrated), migrated);
});

test('a damaged schedule history is repaired', () => {
  assert.deepEqual(sanitizeSchedules(undefined, undefined, '2026-09-01'), [{ from: '2026-09-01', type: 'daily', days: [] }]);
  assert.deepEqual(
    sanitizeSchedules(
      [
        { from: '2026-10-01', type: 'weekdays', days: [2, 2, 9] },
        { from: 'nonsense', type: 'daily' },
        null,
        { from: '2026-09-01', type: 'daily', days: [] },
        { from: '2026-10-05', type: 'weekdays', days: [2] }, // same rule as the entry before: dropped
      ],
      undefined,
      '2026-09-01',
    ),
    [
      { from: '2026-09-01', type: 'daily', days: [] },
      { from: '2026-10-01', type: 'weekdays', days: [2] },
    ],
  );
});

/* ---------- Calendar ---------- */

test('months are built from local dates', () => {
  assert.equal(startOfMonth('2026-10-09'), '2026-10-01');
  assert.equal(addMonths('2026-10-31', 1), '2026-11-01');
  assert.equal(addMonths('2026-01-15', -1), '2025-12-01');
  assert.equal(monthKeys('2026-10-09').length, 31);
  assert.equal(monthKeys('2026-02-10').length, 28);
  assert.equal(monthKeys('2028-02-10').length, 29);
  assert.equal(monthKeys('2026-10-09').at(-1), '2026-10-31');
});

test('day status distinguishes complete, partial, missed, pending, none and future', () => {
  const state = {
    habits: [habit(), habit({ id: 'b', schedules: [{ from: '2026-09-01', ...MON_WED_FRI }] })],
    completions: { '2026-10-05': ['a', 'b'], '2026-10-06': ['a'], '2026-10-07': ['a'] },
  };
  assert.equal(dayStatus(state, '2026-10-05', TODAY), 'complete');
  assert.equal(dayStatus(state, '2026-10-06', TODAY), 'complete', 'Tuesday: only the daily habit is expected');
  assert.equal(dayStatus(state, '2026-10-07', TODAY), 'partial');
  assert.equal(dayStatus(state, '2026-10-08', TODAY), 'missed');
  assert.equal(dayStatus(state, TODAY, TODAY), 'pending', 'today is not missed while the day is not over');
  assert.equal(dayStatus(state, '2026-10-10', TODAY), 'future');
  assert.equal(dayStatus(state, '2026-08-15', TODAY), 'none', 'before the habits started');
  assert.equal(dayStatus({ habits: [], completions: {} }, '2026-10-01', TODAY), 'none');
});

/* ---------- Analytics ---------- */

const analyticsState = () => ({
  habits: [
    habit({ startDate: '2026-10-01', schedules: [{ from: '2026-10-01', ...DAILY }] }),
    habit({ id: 'b', name: 'Gym', startDate: '2026-10-01', schedules: [{ from: '2026-10-01', ...MON_WED_FRI }] }),
  ],
  completions: {
    '2026-10-01': ['a'],
    '2026-10-02': ['a', 'b'],
    '2026-10-05': ['a', 'b'],
    '2026-10-06': ['a'],
    '2026-10-07': ['b'],
    '2026-10-09': ['a'],
  },
});

test('range progress counts only scheduled days up to today', () => {
  const state = analyticsState();
  // Mon 5 to Fri 9: daily habit 5 scheduled / 3 done, gym 3 scheduled / 2 done.
  assert.deepEqual(weekProgress(state, TODAY), { scheduled: 8, done: 5, percent: 63 });
  // Asking for the whole week gives the same: Saturday and Sunday are in the future.
  assert.deepEqual(rangeProgress(state, '2026-10-05', '2026-10-11', TODAY), { scheduled: 8, done: 5, percent: 63 });
  // 1 to 9 October: daily 9 / 5, gym (2nd, 5th, 7th, 9th) 4 / 3.
  assert.deepEqual(monthProgress(state, TODAY), { scheduled: 13, done: 8, percent: 62 });
});

test('empty data gives zeros and no percentage', () => {
  const empty = { habits: [], completions: {} };
  assert.deepEqual(weekProgress(empty, TODAY), { scheduled: 0, done: 0, percent: null });
  assert.deepEqual(monthProgress(empty, TODAY), { scheduled: 0, done: 0, percent: null });
  assert.equal(totalCompletions(empty), 0);
  assert.deepEqual(habitPerformance(empty, TODAY), []);
  assert.equal(weeklySeries(empty, TODAY, 8).every((week) => week.percent === null), true);
});

test('the tracking summary says how much history the figures rest on', () => {
  assert.deepEqual(trackingSummary({ habits: [], completions: {} }, TODAY), { status: 'empty' });
  // Both habits start on 1 October: nine days up to and including the 9th.
  assert.deepEqual(trackingSummary(analyticsState(), TODAY), { status: 'ok', firstDay: '2026-10-01', days: 9 });
  assert.deepEqual(trackingSummary(analyticsState(), '2026-10-03'), { status: 'limited', firstDay: '2026-10-01', days: 3 });
  assert.equal(trackingSummary(analyticsState(), '2026-10-07').status, 'ok', 'the seventh day is a full week');
  assert.deepEqual(trackingSummary(analyticsState(), '2026-09-20'), { status: 'upcoming', firstDay: '2026-10-01' });
});

test('days between two dates ignores daylight-saving shifts', () => {
  assert.equal(daysBetween('2026-10-01', '2026-10-09'), 8);
  assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2); // clocks go back in Europe
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2); // clocks go forward
  assert.equal(daysBetween('2026-10-09', '2026-10-09'), 0);
});

test('total completions counts every record', () => {
  assert.equal(totalCompletions(analyticsState()), 8);
});

test('the weekly series covers whole weeks and ends with the current one', () => {
  const weeks = weeklySeries(analyticsState(), TODAY, 4);
  assert.equal(weeks.length, 4);
  assert.deepEqual(
    weeks.map((week) => week.start),
    ['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05'],
  );
  assert.equal(weeks[3].isCurrent, true);
  assert.equal(weeks[3].percent, 63);
  // Week of 28 Sep: habits start on Thu 1 Oct. Daily 4 scheduled / 2 done, gym Fri 1 / 1.
  assert.deepEqual({ scheduled: weeks[2].scheduled, done: weeks[2].done, percent: weeks[2].percent }, { scheduled: 5, done: 3, percent: 60 });
  // Before the habits existed there is nothing to rate.
  assert.equal(weeks[0].percent, null);
});

test('the month series leaves future days without a percentage', () => {
  const days = monthSeries(analyticsState(), TODAY, TODAY);
  assert.equal(days.length, 31);
  assert.deepEqual({ key: days[0].key, percent: days[0].percent, future: days[0].future }, { key: '2026-10-01', percent: 100, future: false });
  assert.equal(days[7].percent, 0, '8 October: scheduled but nothing done');
  assert.equal(days[9].future, true);
  assert.equal(days[9].percent, null);
  assert.equal(days[9].done, 0);
});

test('habit performance looks at the last 30 days of each habit', () => {
  const [read, gym] = habitPerformance(analyticsState(), TODAY, 30);
  assert.deepEqual(
    { scheduled: read.scheduled, done: read.done, percent: read.percent, current: read.current, best: read.best, total: read.total },
    { scheduled: 9, done: 5, percent: 56, current: 1, best: 2, total: 5 },
  );
  assert.deepEqual(
    { scheduled: gym.scheduled, done: gym.done, percent: gym.percent, current: gym.current, best: gym.best, total: gym.total },
    { scheduled: 4, done: 3, percent: 75, current: 3, best: 3, total: 3 },
  );
});

/* ---------- Import and export ---------- */

test('an export can be imported again unchanged', () => {
  const state = sanitizeState(analyticsState());
  const result = parseImport(buildExport(state, new Date(2026, 9, 9, 12)));
  assert.equal(result.ok, true);
  assert.deepEqual(result.state, state);
  assert.equal(result.habits, 2);
  assert.equal(result.completions, 8);
  assert.equal(result.skippedHabits, 0);
});

test('a version 1 backup is accepted and migrated', () => {
  const v1 = { version: 1, habits: [{ id: 'a', name: 'Read', schedule: { type: 'daily', days: [] }, startDate: '2026-09-01' }], completions: { '2026-10-08': ['a'] } };
  const result = parseImport(JSON.stringify(v1));
  assert.equal(result.ok, true);
  assert.equal(result.state.version, 2);
  assert.deepEqual(result.state.habits[0].schedules, [{ from: '2026-09-01', type: 'daily', days: [] }]);
  assert.equal(result.completions, 1);
});

test('files that are not HabitFlow data are rejected with a reason', () => {
  assert.deepEqual(parseImport('not json at all'), { ok: false, error: "This file isn't valid JSON." });
  for (const text of ['[]', '42', 'null', '{"foo": 1}', '{"habits": "many"}', '{"app": "habitflow", "data": 5}']) {
    assert.equal(parseImport(text).ok, false, text);
  }
  assert.equal(parseImport('{"habits": []}').error, 'This file contains no valid habits.');
  assert.equal(parseImport('{"version": 99, "habits": [{"id": "a", "name": "x"}]}').error, 'This file was made by a newer version of HabitFlow.');
});

test('invalid entries in an import are skipped and counted', () => {
  const result = parseImport(JSON.stringify({ habits: [{ id: 'a', name: 'Read' }, { name: 'no id' }, 7], completions: { '2026-10-08': ['a', 'ghost'] } }));
  assert.equal(result.ok, true);
  assert.equal(result.habits, 1);
  assert.equal(result.skippedHabits, 2);
  assert.equal(result.completions, 1);
});

/* ---------- Settings ---------- */

test('settings default to the dark theme', () => {
  assert.deepEqual(sanitizeSettings(undefined), { theme: 'dark' });
  assert.deepEqual(sanitizeSettings({ theme: 'neon' }), { theme: 'dark' });
  assert.deepEqual(sanitizeSettings({ theme: 'light', extra: true }), { theme: 'light' });
});
