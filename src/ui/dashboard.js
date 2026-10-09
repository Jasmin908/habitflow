import { addDays, formatLong, greeting, relativeLabel } from '../modules/dates.js';
import { renderHabitList } from './habitList.js';
import { motivation, renderStats } from './stats.js';
import { renderWeek } from './week.js';

const elements = {
  date: document.querySelector('#today-date'),
  greeting: document.querySelector('#greeting'),
  motivation: document.querySelector('#motivation'),
  stats: document.querySelector('#stats'),
  trackerTitle: document.querySelector('#tracker-title'),
  trackerSub: document.querySelector('#tracker-sub'),
  todayButton: document.querySelector('[data-action="today"]'),
  week: document.querySelector('#week'),
  list: document.querySelector('#habit-list'),
};

/** The day shown in the tracker; null means "today". */
let selected = null;

export function getSelectedDay(today) {
  return selected ?? today;
}

export function renderDashboard(state, today) {
  const day = getSelectedDay(today);

  elements.date.textContent = formatLong(today);
  elements.greeting.textContent = greeting();
  elements.motivation.textContent = motivation(state, today);

  elements.trackerTitle.textContent = relativeLabel(day, today);
  elements.trackerSub.textContent =
    day > today ? `${formatLong(day)} · Future days can't be ticked off yet` : formatLong(day);
  elements.todayButton.disabled = day === today;

  renderStats(elements.stats, state, day, today);
  renderWeek(elements.week, state, day, today);
  renderHabitList(elements.list, state, day, today, { prefix: 'dash' });
}

/** Button handlers; each returns nothing and the caller redraws. */
export function dashboardActions(today) {
  return {
    'prev-day': () => (selected = addDays(getSelectedDay(today()), -1)),
    'next-day': () => (selected = addDays(getSelectedDay(today()), 1)),
    today: () => (selected = null),
    'select-day': (target) => (selected = target.dataset.key === today() ? null : target.dataset.key),
  };
}
