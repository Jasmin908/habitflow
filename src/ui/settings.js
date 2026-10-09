import { todayKey } from '../modules/dates.js';
import { getState, replaceState, resetState } from '../modules/habits.js';
import { applyTheme, loadSettings, saveSettings } from '../modules/settings.js';
import { buildExport, countCompletions, parseImport } from '../modules/transfer.js';
import { confirmAction, toast } from './dialogs.js';
import { pluralize } from './dom.js';

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

const elements = {
  theme: document.querySelector('#theme-control'),
  summary: document.querySelector('#data-summary'),
  file: document.querySelector('#import-file'),
  importError: document.querySelector('#import-error'),
};

let settings = loadSettings();

function summarize(state) {
  return `${pluralize(state.habits.length, 'habit')} and ${pluralize(countCompletions(state), 'completion')}`;
}

function showImportError(message) {
  elements.importError.textContent = message;
  elements.importError.hidden = !message;
}

async function handleImportFile(file) {
  showImportError('');
  if (file.size > MAX_IMPORT_BYTES) {
    showImportError('This file is too large to be a HabitFlow export.');
    return;
  }

  let text;
  try {
    text = await file.text();
  } catch {
    showImportError("The file couldn't be read.");
    return;
  }

  const result = parseImport(text);
  if (!result.ok) {
    showImportError(result.error);
    return;
  }

  const skipped = result.skippedHabits > 0 ? ` ${pluralize(result.skippedHabits, 'invalid entry', 'invalid entries')} will be skipped.` : '';
  const confirmed = await confirmAction({
    title: 'Replace your data?',
    text: `The file contains ${pluralize(result.habits, 'habit')} and ${pluralize(result.completions, 'completion')}.${skipped} It will replace the ${summarize(getState())} stored here now.`,
    confirmLabel: 'Import and replace',
    tone: 'primary',
  });
  if (!confirmed) return;

  replaceState(result.state);
  toast(`Imported ${pluralize(result.habits, 'habit')}.`);
}

/** Wires up the controls. Called once at startup. */
export function initSettings({ themeChanged }) {
  applyTheme(settings.theme);

  elements.theme.addEventListener('change', (event) => {
    if (event.target.name !== 'theme') return;
    settings = { ...settings, theme: event.target.value };
    applyTheme(settings.theme);
    if (!saveSettings(settings)) {
      toast("Your browser didn't allow saving this preference.", { tone: 'error' });
    }
    themeChanged();
  });

  elements.file.addEventListener('change', async () => {
    const [file] = elements.file.files;
    // Clear the input so choosing the same file again triggers "change".
    elements.file.value = '';
    if (file) await handleImportFile(file);
  });
}

export function renderSettings(state) {
  elements.theme.querySelectorAll('input').forEach((input) => {
    input.checked = input.value === settings.theme;
  });
  elements.summary.textContent =
    state.habits.length === 0
      ? 'There is nothing to export yet.'
      : `Download a backup of your ${summarize(state)} as a JSON file.`;
}

export const settingsActions = {
  'export-data': () => {
    const state = getState();
    if (state.habits.length === 0) {
      toast('There is nothing to export yet.');
      return;
    }
    const url = URL.createObjectURL(new Blob([buildExport(state)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `habitflow-backup-${todayKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast('Backup file downloaded.');
  },

  'import-data': () => elements.file.click(),

  'reset-data': async () => {
    const state = getState();
    if (state.habits.length === 0) {
      toast('There is no habit data to reset.');
      return;
    }
    const confirmed = await confirmAction({
      title: 'Delete all habit data?',
      text: `This permanently removes ${summarize(state)} from this browser. It cannot be undone. Your theme setting is kept.`,
      confirmLabel: 'Delete everything',
    });
    if (!confirmed) return;
    resetState();
    toast('All habit data was deleted.');
  },
};
