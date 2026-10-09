/**
 * Habit data management: the single source of truth for the app.
 *
 * The interface never changes the state directly. It calls the functions
 * below; each one updates the state, saves it and notifies subscribers, so
 * every part of the screen redraws from the same data.
 */
import { CATEGORIES, DEFAULT_CATEGORY, DEFAULT_ICON, HABIT_ICONS } from './catalog.js';
import { isValidKey, todayKey } from './dates.js';
import { applyScheduleChange, normalizeRule } from './schedule.js';
import { emptyState, loadState, sanitizeState, saveState } from './storage.js';

let state = emptyState();
const listeners = new Set();

/** Called once at startup. Returns whether stored data had to be discarded. */
export function initStore() {
  const { state: loaded, recovered, migrated } = loadState();
  state = loaded;
  // Write migrated data back straight away, so the new shape is on disk.
  if (migrated) saveState(state);
  return { recovered };
}

export function getState() {
  return state;
}

/** @param {(event: { saved: boolean }) => void} listener */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function commit() {
  const saved = saveState(state);
  listeners.forEach((listener) => listener({ saved }));
}

/** Another tab changed the data: read it again and redraw. */
export function reloadFromStorage() {
  state = loadState().state;
  listeners.forEach((listener) => listener({ saved: true }));
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class ValidationError extends Error {
  /** @param {'name' | 'schedule' | 'startDate'} field */
  constructor(field, message) {
    super(message);
    this.field = field;
  }
}

/** Checks form input and returns clean values, or throws ValidationError. */
function normalize(input) {
  const name = String(input.name ?? '').trim().replace(/\s+/g, ' ');
  if (!name) throw new ValidationError('name', 'Give the habit a name.');
  if (name.length > 60) throw new ValidationError('name', 'Keep the name under 60 characters.');

  if (input.schedule?.type === 'weekdays' && !(input.schedule.days?.length > 0)) {
    throw new ValidationError('schedule', 'Pick at least one day.');
  }
  if (!isValidKey(input.startDate)) throw new ValidationError('startDate', 'Choose a valid start date.');

  return {
    fields: {
      name,
      category: CATEGORIES.includes(input.category) ? input.category : DEFAULT_CATEGORY,
      icon: Object.hasOwn(HABIT_ICONS, input.icon) ? input.icon : DEFAULT_ICON,
      startDate: input.startDate,
    },
    rule: normalizeRule(input.schedule),
  };
}

export function getHabit(id) {
  return state.habits.find((habit) => habit.id === id) ?? null;
}

export function createHabit(input) {
  const { fields, rule } = normalize(input);
  const habit = {
    id: createId(),
    ...fields,
    schedules: [{ from: fields.startDate, ...rule }],
    createdAt: todayKey(),
  };
  state = { ...state, habits: [...state.habits, habit] };
  commit();
  return habit;
}

/**
 * Keeps the habit's id, creation date and its whole completion history.
 * A changed schedule applies from today; earlier days keep their old rule.
 */
export function updateHabit(id, input) {
  const existing = getHabit(id);
  if (!existing) return null;
  const { fields, rule } = normalize(input);
  const updated = {
    ...existing,
    ...fields,
    schedules: applyScheduleChange(existing.schedules, rule, todayKey()),
  };
  state = { ...state, habits: state.habits.map((habit) => (habit.id === id ? updated : habit)) };
  commit();
  return updated;
}

/** Removes the habit together with its completion history. */
export function deleteHabit(id) {
  if (!getHabit(id)) return;
  const completions = {};
  for (const [dateKey, ids] of Object.entries(state.completions)) {
    const remaining = ids.filter((habitId) => habitId !== id);
    if (remaining.length > 0) completions[dateKey] = remaining;
  }
  state = { ...state, habits: state.habits.filter((habit) => habit.id !== id), completions };
  commit();
}

export function setCompletion(id, dateKey, done) {
  // The future cannot be completed, whatever the interface sends.
  if (!getHabit(id) || !isValidKey(dateKey) || dateKey > todayKey()) return;
  const ids = state.completions[dateKey] ?? [];
  if (ids.includes(id) === done) return;

  const completions = { ...state.completions };
  const next = done ? [...ids, id] : ids.filter((habitId) => habitId !== id);
  if (next.length > 0) completions[dateKey] = next;
  else delete completions[dateKey];

  state = { ...state, completions };
  commit();
}

/** Import: replaces everything with already validated data. */
export function replaceState(next) {
  state = sanitizeState(next);
  commit();
}

/** Settings → Reset: removes every habit and all history. */
export function resetState() {
  state = emptyState();
  commit();
}
