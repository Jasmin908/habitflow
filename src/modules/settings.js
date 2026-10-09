/**
 * Appearance preferences. Stored separately from habit data, so resetting or
 * importing habits never touches them (and the other way round).
 */
export const SETTINGS_KEY = 'habitflow:settings';
export const THEMES = ['dark', 'light'];
const DEFAULTS = { theme: 'dark' };

export function sanitizeSettings(raw) {
  return { theme: THEMES.includes(raw?.theme) ? raw.theme : DEFAULTS.theme };
}

export function loadSettings() {
  try {
    return sanitizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}'));
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(sanitizeSettings(settings)));
    return true;
  } catch {
    return false;
  }
}

/** index.html applies the saved theme before first paint; this keeps it in sync afterwards. */
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f6f5fb' : '#0a0a12');
}
