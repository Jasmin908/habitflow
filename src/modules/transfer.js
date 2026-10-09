/**
 * Export and import of habit data as JSON.
 * Pure functions: reading the file and downloading happen in the interface.
 */
import { DATA_VERSION, sanitizeState } from './storage.js';

const APP_ID = 'habitflow';

export function countCompletions(state) {
  return Object.values(state.completions).reduce((sum, ids) => sum + ids.length, 0);
}

/** The text of a backup file. */
export function buildExport(state, now = new Date()) {
  return JSON.stringify({ app: APP_ID, version: DATA_VERSION, exportedAt: now.toISOString(), data: state }, null, 2);
}

/**
 * Checks the text of a file chosen for import.
 * Accepts HabitFlow exports of any version; everything inside is validated
 * and repaired the same way stored data is, and invalid entries are skipped.
 *
 * @returns {{ ok: true, state: object, habits: number, completions: number, skippedHabits: number }
 *          | { ok: false, error: string }}
 */
export function parseImport(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't valid JSON." };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: "This file doesn't look like a HabitFlow export." };
  }

  // An export wraps the data; a bare state object is accepted too.
  const raw = parsed.app === APP_ID && parsed.data ? parsed.data : parsed;
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.habits)) {
    return { ok: false, error: "This file doesn't look like a HabitFlow export." };
  }
  if (typeof raw.version === 'number' && raw.version > DATA_VERSION) {
    return { ok: false, error: 'This file was made by a newer version of HabitFlow.' };
  }

  const state = sanitizeState(raw);
  if (state.habits.length === 0) {
    return { ok: false, error: 'This file contains no valid habits.' };
  }
  return {
    ok: true,
    state,
    habits: state.habits.length,
    completions: countCompletions(state),
    skippedHabits: raw.habits.length - state.habits.length,
  };
}
