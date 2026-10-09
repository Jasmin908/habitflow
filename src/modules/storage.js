/**
 * Persistence in localStorage.
 *
 * Stored shape (version 2):
 *   {
 *     version: 2,
 *     habits: [{ id, name, category, icon, schedules: [{ from, type, days }], startDate, createdAt }],
 *     completions: { 'YYYY-MM-DD': [habitId, ...] }
 *   }
 *
 * Version 1 stored one `schedule` per habit. sanitizeState() reads both: a
 * version 1 habit is migrated to a one-entry schedule history, with nothing
 * else changed, so ids, start dates and the whole completion history carry
 * over. The storage key keeps its original name so existing data is found.
 *
 * Reading never throws: anything missing or damaged is repaired or dropped,
 * and unreadable data is kept under a backup key instead of being deleted.
 */
import { CATEGORIES, DEFAULT_CATEGORY, DEFAULT_ICON, HABIT_ICONS } from './catalog.js';
import { isValidKey, todayKey } from './dates.js';
import { sanitizeSchedules } from './schedule.js';

export const STORAGE_KEY = 'habitflow:v1';
export const DATA_VERSION = 2;
const BACKUP_KEY = 'habitflow:v1:unreadable';

export function emptyState() {
  return { version: DATA_VERSION, habits: [], completions: {} };
}

function sanitizeHabit(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string' || !raw.id) return null;
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 60) : '';
  if (!name) return null;

  const createdAt = isValidKey(raw.createdAt) ? raw.createdAt : todayKey();
  const startDate = isValidKey(raw.startDate) ? raw.startDate : createdAt;
  return {
    id: raw.id,
    name,
    category: CATEGORIES.includes(raw.category) ? raw.category : DEFAULT_CATEGORY,
    icon: Object.hasOwn(HABIT_ICONS, raw.icon) ? raw.icon : DEFAULT_ICON,
    schedules: sanitizeSchedules(raw.schedules, raw.schedule, startDate),
    startDate,
    createdAt,
  };
}

/** Turns anything (parsed JSON of unknown quality, any version) into a valid state. */
export function sanitizeState(raw) {
  const state = emptyState();
  if (!raw || typeof raw !== 'object') return state;

  const seen = new Set();
  for (const item of Array.isArray(raw.habits) ? raw.habits : []) {
    const habit = sanitizeHabit(item);
    if (habit && !seen.has(habit.id)) {
      seen.add(habit.id);
      state.habits.push(habit);
    }
  }

  const completions = raw.completions && typeof raw.completions === 'object' ? raw.completions : {};
  for (const [dateKey, ids] of Object.entries(completions)) {
    if (!isValidKey(dateKey) || !Array.isArray(ids)) continue;
    const valid = [...new Set(ids)].filter((id) => seen.has(id));
    if (valid.length > 0) state.completions[dateKey] = valid;
  }
  return state;
}

/**
 * Reads the saved state.
 * @returns {{ state: object, recovered: boolean, migrated: boolean }}
 *   `recovered`: the stored text could not be parsed and a fresh state was started.
 *   `migrated`: older data was converted and should be saved in the new shape.
 */
export function loadState() {
  let text = null;
  try {
    text = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode, browser settings): run in memory only.
    return { state: emptyState(), recovered: false, migrated: false };
  }
  if (text === null) return { state: emptyState(), recovered: false, migrated: false };

  try {
    const raw = JSON.parse(text);
    return { state: sanitizeState(raw), recovered: false, migrated: raw?.version !== DATA_VERSION };
  } catch {
    try {
      localStorage.setItem(BACKUP_KEY, text);
    } catch {
      // Nothing more we can do; the original stays until the next save.
    }
    return { state: emptyState(), recovered: true, migrated: false };
  }
}

/** @returns {boolean} false when the browser refused to store the data. */
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
