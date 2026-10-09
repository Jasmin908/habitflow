import {
  WEEKDAYS,
  addMonths,
  formatLong,
  formatMonth,
  fromKey,
  monthKeys,
  relativeLabel,
  startOfMonth,
  weekdayIndex,
} from '../modules/dates.js';
import { dayProgress, dayStatus } from '../modules/stats.js';
import { renderHabitList } from './habitList.js';

const elements = {
  month: document.querySelector('#calendar-month'),
  grid: document.querySelector('#calendar-grid'),
  dayTitle: document.querySelector('#calendar-day-title'),
  daySub: document.querySelector('#calendar-day-sub'),
  dayList: document.querySelector('#calendar-day-list'),
  todayButton: document.querySelector('[data-action="cal-today"]'),
};

const STATUS_TEXT = {
  future: 'upcoming',
  none: 'nothing scheduled',
  complete: 'all done',
  partial: 'partly done',
  pending: 'not done yet',
  missed: 'missed',
};

/** The month on screen and the chosen day; null means "follow today". */
let month = null;
let selected = null;

function dayCell(state, key, today, selectedDay) {
  const status = dayStatus(state, key, today);
  const progress = dayProgress(state, key);
  const percent = status === 'future' ? 0 : (progress.percent ?? 0);
  const detail =
    progress.scheduled === 0
      ? STATUS_TEXT.none
      : status === 'future'
        ? `${progress.scheduled} scheduled`
        : `${STATUS_TEXT[status]}, ${progress.done} of ${progress.scheduled} completed`;

  return `
    <button class="cell is-${status}${key === today ? ' is-today' : ''}" type="button"
      data-action="cal-select" data-key="${key}" data-focus-key="cal:${key}"
      aria-pressed="${key === selectedDay}" ${key === today ? 'aria-current="date"' : ''}
      aria-label="${formatLong(key)}, ${detail}">
      <span class="day__ring" style="--p: ${percent}"><span>${fromKey(key).getDate()}</span></span>
    </button>`;
}

export function renderCalendar(state, today) {
  const shownMonth = month ?? startOfMonth(today);
  const selectedDay = selected ?? today;
  const keys = monthKeys(shownMonth);

  elements.month.textContent = formatMonth(shownMonth);
  elements.todayButton.disabled = shownMonth === startOfMonth(today) && selectedDay === today;

  const head = WEEKDAYS.map((day) => `<span class="month__weekday" aria-hidden="true">${day.short}</span>`).join('');
  // Empty slots so the 1st lands under its weekday (weeks start on Monday).
  const blanks = '<span class="cell cell--blank" aria-hidden="true"></span>'.repeat(weekdayIndex(keys[0]));
  elements.grid.innerHTML = head + blanks + keys.map((key) => dayCell(state, key, today, selectedDay)).join('');

  elements.dayTitle.textContent = relativeLabel(selectedDay, today);
  elements.daySub.textContent =
    selectedDay > today ? `${formatLong(selectedDay)} · Future days can't be ticked off yet` : formatLong(selectedDay);
  renderHabitList(elements.dayList, state, selectedDay, today, { prefix: 'cal' });
}

export function calendarActions(today) {
  const shown = () => month ?? startOfMonth(today());
  return {
    'cal-prev': () => (month = addMonths(shown(), -1)),
    'cal-next': () => (month = addMonths(shown(), 1)),
    'cal-today': () => {
      month = null;
      selected = null;
    },
    'cal-select': (target) => (selected = target.dataset.key),
  };
}
