import { CATEGORIES, DEFAULT_CATEGORY, DEFAULT_ICON, HABIT_ICONS } from '../modules/catalog.js';
import { WEEKDAYS, todayKey, weekdayIndex } from '../modules/dates.js';
import { ValidationError, createHabit, updateHabit } from '../modules/habits.js';
import { currentRule } from '../modules/schedule.js';
import { escapeHtml, habitIcon } from './dom.js';

/* ------------------------------------------------------------------
   Create / edit habit
   The native <dialog> provides the focus trap, Escape to close and
   returning focus to the button that opened it.
------------------------------------------------------------------ */
const dialog = document.querySelector('#habit-dialog');
const form = document.querySelector('#habit-form');
const title = document.querySelector('#habit-dialog-title');
const submit = document.querySelector('#habit-submit');
const weekdayPicker = document.querySelector('#weekday-picker');
const scheduleHint = document.querySelector('#schedule-hint');

const errors = {
  name: { input: form.elements.name, message: document.querySelector('#habit-name-error') },
  schedule: { input: null, message: document.querySelector('#schedule-error') },
  startDate: { input: form.elements.startDate, message: document.querySelector('#habit-start-error') },
};

let editingId = null;
let onSaved = () => {};

/** Builds the parts of the form that come from the catalog. Called once. */
export function initHabitDialog({ saved }) {
  onSaved = saved;

  form.elements.category.innerHTML = CATEGORIES.map(
    (category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`,
  ).join('');

  document.querySelector('#icon-grid').innerHTML = Object.entries(HABIT_ICONS)
    .map(
      ([key, icon]) => `
        <label class="icon-option" title="${escapeHtml(icon.label)}">
          <input type="radio" name="icon" value="${key}" />
          <span>${habitIcon(key)}</span>
          <span class="visually-hidden">${escapeHtml(icon.label)}</span>
        </label>`,
    )
    .join('');

  weekdayPicker.innerHTML = WEEKDAYS.map(
    (day, index) => `
      <label class="weekday">
        <input type="checkbox" name="days" value="${index}" />
        <span aria-hidden="true">${day.short}</span>
        <span class="visually-hidden">${day.long}</span>
      </label>`,
  ).join('');

  form.addEventListener('change', (event) => {
    if (event.target.name === 'scheduleType') syncWeekdayPicker();
    if (event.target.name === 'scheduleType' || event.target.name === 'days') clearError('schedule');
  });
  form.elements.name.addEventListener('input', () => clearError('name'));
  form.elements.startDate.addEventListener('input', () => clearError('startDate'));

  form.addEventListener('submit', handleSubmit);
  dialog.addEventListener('click', (event) => {
    // A click on the backdrop lands on the <dialog> element itself.
    if (event.target === dialog || event.target.closest('[data-close]')) dialog.close();
  });
}

function syncWeekdayPicker() {
  weekdayPicker.hidden = form.elements.scheduleType.value !== 'weekdays';
}

function showError(field, message) {
  const { input, message: element } = errors[field];
  element.textContent = message;
  element.hidden = false;
  input?.setAttribute('aria-invalid', 'true');
}

function clearError(field) {
  const { input, message: element } = errors[field];
  element.hidden = true;
  element.textContent = '';
  input?.removeAttribute('aria-invalid');
}

/** @param {object | null} habit The habit to edit, or null to create one. */
export function openHabitDialog(habit, { defaultDay } = {}) {
  editingId = habit?.id ?? null;
  form.reset();
  Object.keys(errors).forEach(clearError);

  title.textContent = habit ? 'Edit habit' : 'New habit';
  submit.textContent = habit ? 'Save changes' : 'Create habit';

  form.elements.name.value = habit?.name ?? '';
  form.elements.category.value = habit?.category ?? DEFAULT_CATEGORY;
  form.elements.icon.value = habit?.icon ?? DEFAULT_ICON;
  form.elements.startDate.value = habit?.startDate ?? todayKey();
  // The form shows the rule in force now; older rules stay in the history.
  const rule = habit ? currentRule(habit) : null;
  form.elements.scheduleType.value = rule?.type ?? 'daily';
  scheduleHint.hidden = !habit;

  // New habit: pre-tick the weekday being viewed, in case "Selected days" is chosen.
  const tickedDays = rule ? rule.days : [weekdayIndex(defaultDay ?? todayKey())];
  form.querySelectorAll('input[name="days"]').forEach((checkbox) => {
    checkbox.checked = tickedDays.includes(Number(checkbox.value));
  });
  syncWeekdayPicker();

  dialog.showModal();
  form.elements.name.focus();
}

function handleSubmit(event) {
  event.preventDefault();
  Object.keys(errors).forEach(clearError);

  const data = {
    name: form.elements.name.value,
    category: form.elements.category.value,
    icon: form.elements.icon.value,
    startDate: form.elements.startDate.value,
    schedule: {
      type: form.elements.scheduleType.value,
      days: [...form.querySelectorAll('input[name="days"]:checked')].map((checkbox) => Number(checkbox.value)),
    },
  };

  try {
    const habit = editingId ? updateHabit(editingId, data) : createHabit(data);
    const wasEditing = Boolean(editingId);
    dialog.close();
    onSaved({ habit, wasEditing });
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
    showError(error.field, error.message);
    (errors[error.field].input ?? weekdayPicker.querySelector('input'))?.focus();
  }
}

/* ------------------------------------------------------------------
   Confirmation
------------------------------------------------------------------ */
const confirmDialog = document.querySelector('#confirm-dialog');

/**
 * @param {{ title: string, text: string, confirmLabel: string, tone?: 'danger' | 'primary' }} options
 * @returns {Promise<boolean>} true when the user confirmed.
 */
export function confirmAction({ title: heading, text, confirmLabel, tone = 'danger' }) {
  confirmDialog.querySelector('#confirm-title').textContent = heading;
  confirmDialog.querySelector('#confirm-text').textContent = text;
  const yes = confirmDialog.querySelector('[data-confirm="yes"]');
  yes.textContent = confirmLabel;
  yes.className = `btn btn--${tone}`;

  return new Promise((resolve) => {
    // Settles exactly once, whichever way the dialog is left: a button,
    // a click on the backdrop, or Escape (which only fires "close").
    const finish = (confirmed) => {
      confirmDialog.removeEventListener('click', onClick);
      confirmDialog.removeEventListener('close', onClose);
      if (confirmDialog.open) confirmDialog.close();
      resolve(confirmed);
    };
    const onClick = (event) => {
      const choice = event.target.closest('[data-confirm]')?.dataset.confirm;
      if (choice) finish(choice === 'yes');
      else if (event.target === confirmDialog) finish(false);
    };
    const onClose = () => {
      // Browsers deliver "close" a moment late. If the dialog is open, this
      // event belongs to the previous confirmation and must not cancel this one.
      if (!confirmDialog.open) finish(false);
    };

    confirmDialog.addEventListener('click', onClick);
    confirmDialog.addEventListener('close', onClose);
    confirmDialog.showModal();
    // Focus the safe choice, so Enter does not delete by accident.
    confirmDialog.querySelector('[data-confirm="no"]').focus();
  });
}

/* ------------------------------------------------------------------
   Toasts (short status messages, announced to screen readers)
------------------------------------------------------------------ */
const toasts = document.querySelector('#toasts');

export function toast(message, { tone = 'info', duration = 4000 } = {}) {
  const element = document.createElement('p');
  element.className = `toast toast--${tone}`;
  element.textContent = message;
  toasts.append(element);
  setTimeout(() => element.remove(), duration);
}
