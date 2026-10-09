/**
 * Application start-up: wires the data store to the interface.
 *
 * The screen is a pure function of the stored state, the current view and
 * each view's own selection (a day, a month). Any change calls render(),
 * which redraws the visible view from the data, so numbers never drift apart.
 * Switching views only shows and hides sections: nothing is reloaded and no
 * data is touched.
 */
import '@fontsource-variable/geist';
import './styles/main.css';

import { todayKey } from './modules/dates.js';
import { deleteHabit, getHabit, getState, initStore, reloadFromStorage, setCompletion, subscribe } from './modules/habits.js';
import { SETTINGS_KEY, applyTheme, loadSettings } from './modules/settings.js';
import { STORAGE_KEY } from './modules/storage.js';
import { initBadgeClearance } from './ui/badgeClearance.js';
import { calendarActions, renderCalendar } from './ui/calendar.js';
import { dashboardActions, getSelectedDay, renderDashboard } from './ui/dashboard.js';
import { confirmAction, initHabitDialog, openHabitDialog, toast } from './ui/dialogs.js';
import { hydrateIcons } from './ui/dom.js';
import { initSettings, renderSettings, settingsActions } from './ui/settings.js';

const VIEWS = {
  dashboard: { title: 'Dashboard' },
  statistics: { title: 'Statistics' },
  calendar: { title: 'Calendar' },
  settings: { title: 'Settings' },
};

const HOME_TITLE = document.title;

let today = todayKey();
let view = 'dashboard';
/** The statistics module (and Chart.js) is fetched the first time it is needed. */
let statistics = null;

function viewFromHash() {
  const name = window.location.hash.replace(/^#\/?/, '');
  return Object.hasOwn(VIEWS, name) ? name : 'dashboard';
}

async function render() {
  const state = getState();
  // Redrawing replaces the buttons; remember which one had keyboard focus.
  const focusKey = document.activeElement?.dataset?.focusKey;

  if (view === 'dashboard') renderDashboard(state, today);
  if (view === 'calendar') renderCalendar(state, today);
  if (view === 'settings') renderSettings(state);
  if (view === 'statistics') {
    try {
      statistics ??= await import('./ui/statistics.js');
      // The user may have moved on while the module was loading.
      if (view === 'statistics') statistics.renderStatistics(getState(), today);
    } catch {
      toast("The statistics couldn't be loaded. Check your connection and try again.", { tone: 'error' });
    }
  }

  if (focusKey) document.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`)?.focus();
}

/** Shows one view, marks it in the navigation and moves focus to its heading. */
function showView(name, { moveFocus }) {
  view = name;
  document.querySelectorAll('[data-view]').forEach((section) => {
    section.hidden = section.dataset.view !== name;
  });
  document.querySelectorAll('[data-nav]').forEach((link) => {
    if (link.dataset.nav === name) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  // The dashboard keeps the descriptive title from index.html (the one search engines see).
  document.title = name === 'dashboard' ? HOME_TITLE : `${VIEWS[name].title} · HabitFlow`;

  render();
  if (moveFocus) {
    window.scrollTo(0, 0);
    document.querySelector(`[data-view="${name}"] h1`)?.focus({ preventScroll: true });
  }
}

/* ---------- Actions (one delegated listener for all buttons) ---------- */
const actions = {
  ...dashboardActions(() => today),
  ...calendarActions(() => today),
  ...settingsActions,
  'new-habit': () => openHabitDialog(null, { defaultDay: getSelectedDay(today) }),
  edit: (target) => openHabitDialog(getHabit(target.dataset.id)),
  delete: async (target) => {
    const habit = getHabit(target.dataset.id);
    if (!habit) return;
    const confirmed = await confirmAction({
      title: `Delete "${habit.name}"?`,
      text: 'The habit and its whole completion history will be removed. This cannot be undone.',
      confirmLabel: 'Delete habit',
    });
    if (!confirmed) return;
    deleteHabit(habit.id);
    toast(`"${habit.name}" was deleted.`);
  },
};

/** Actions that change stored data redraw through the store; the rest redraw here. */
const SELF_RENDERING = new Set(['new-habit', 'edit', 'delete', 'export-data', 'import-data', 'reset-data']);

document.addEventListener('click', (event) => {
  const target = event.target.closest('button[data-action]');
  const action = target && actions[target.dataset.action];
  if (!action) return;
  action(target);
  if (!SELF_RENDERING.has(target.dataset.action)) render();
});

document.addEventListener('change', (event) => {
  const target = event.target;
  if (target.dataset?.action === 'toggle') setCompletion(target.dataset.id, target.dataset.date, target.checked);
});

/* ---------- Start ---------- */
hydrateIcons();
initBadgeClearance();
initHabitDialog({
  saved: ({ habit, wasEditing }) => toast(wasEditing ? `"${habit.name}" was updated.` : `"${habit.name}" was added.`),
});
initSettings({ themeChanged: render });

const { recovered } = initStore();
subscribe(({ saved }) => {
  render();
  if (!saved) toast("Your browser didn't allow saving. Changes will be lost when you close the page.", { tone: 'error', duration: 7000 });
});

showView(viewFromHash(), { moveFocus: false });
window.addEventListener('hashchange', () => showView(viewFromHash(), { moveFocus: true }));

if (recovered) {
  toast("Saved data couldn't be read, so HabitFlow started fresh. The unreadable data was kept as a backup.", {
    tone: 'error',
    duration: 9000,
  });
}

// Keep the page correct when the calendar day changes while it is open.
function refreshToday() {
  const now = todayKey();
  if (now === today) return;
  today = now;
  render();
}
setInterval(refreshToday, 60_000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshToday();
});

// Another tab changed the data or the theme.
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY || event.key === null) reloadFromStorage();
  if (event.key === SETTINGS_KEY) {
    applyTheme(loadSettings().theme);
    render();
  }
});
