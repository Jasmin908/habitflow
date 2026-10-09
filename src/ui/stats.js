import { formatShort } from '../modules/dates.js';
import { bestStreak, dayProgress, streakSummary } from '../modules/stats.js';
import { escapeHtml, pluralize, uiIcon } from './dom.js';

const RING_RADIUS = 22;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

export function ring(percent) {
  const offset = RING_LENGTH * (1 - (percent ?? 0) / 100);
  return `
    <svg class="ring" viewBox="0 0 56 56" aria-hidden="true">
      <circle class="ring__track" cx="28" cy="28" r="${RING_RADIUS}" />
      <circle class="ring__value" cx="28" cy="28" r="${RING_RADIUS}"
        stroke-dasharray="${RING_LENGTH.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" />
    </svg>`;
}

/**
 * One overview card. `value`, `unit` and `note` are inserted as HTML, so
 * callers escape any user text (habit names) themselves.
 */
export function statCard({ icon, label, value, unit = '', note, aside = '' }) {
  return `
    <article class="stat${aside ? ' stat--ring' : ''}">
      <div class="stat__body">
        <p class="stat__label"><span class="stat__icon">${uiIcon(icon)}</span>${label}</p>
        <p class="stat__value">${value}${unit ? `<span class="stat__of"> ${unit}</span>` : ''}</p>
        <p class="stat__note">${note}</p>
      </div>
      ${aside}
    </article>`;
}

/** The four dashboard cards. All numbers come straight from the stored data. */
export function renderStats(container, state, selected, today) {
  const progress = dayProgress(state, selected);
  const streaks = streakSummary(state, today);
  const isToday = selected === today;
  const dayLabel = isToday ? 'today' : `on ${escapeHtml(formatShort(selected))}`;

  const progressNote =
    progress.scheduled === 0
      ? `Nothing scheduled ${dayLabel}`
      : progress.done === progress.scheduled
        ? 'All done'
        : `${progress.scheduled - progress.done} to go`;

  // The streak belongs to one habit, so the card always names it.
  const top = streaks.current;
  const streakNote = top.habit
    ? `${escapeHtml(top.habit.name)} · its best: ${pluralize(bestStreak(top.habit, state.completions, today), 'day')}`
    : state.habits.length === 0
      ? 'No habits yet'
      : `No active streak · best so far: ${pluralize(streaks.best.days, 'day')}`;

  container.innerHTML =
    statCard({
      icon: 'list',
      label: 'Total habits',
      value: state.habits.length,
      note: `${progress.scheduled} scheduled ${dayLabel}`,
    }) +
    statCard({
      icon: 'checkCircle',
      label: `Completed ${isToday ? 'today' : escapeHtml(formatShort(selected))}`,
      value: progress.done,
      unit: `/ ${progress.scheduled}`,
      note: progressNote,
    }) +
    statCard({
      icon: 'trend',
      label: 'Daily completion',
      value: progress.percent === null ? '–' : `${progress.percent}%`,
      note: isToday ? 'Today' : escapeHtml(formatShort(selected)),
      aside: ring(progress.percent),
    }) +
    statCard({
      icon: 'flame',
      label: 'Top habit streak',
      value: top.days,
      unit: top.days === 1 ? 'day' : 'days',
      note: streakNote,
    });
}

/** A short line under the greeting, based on today's real progress. */
export function motivation(state, today) {
  if (state.habits.length === 0) return 'Add your first habit to get started.';
  const { scheduled, done } = dayProgress(state, today);
  if (scheduled === 0) return 'Nothing is scheduled today. Enjoy the break.';
  if (done === scheduled) return 'Everything is done for today. Nice work.';
  if (done === 0) return `${pluralize(scheduled, 'habit')} planned for today. One step at a time.`;
  return `${pluralize(scheduled - done, 'habit')} left today. You're already on your way.`;
}
