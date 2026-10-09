import { WEEKDAYS, formatLong, fromKey, weekKeys } from '../modules/dates.js';
import { dayProgress } from '../modules/stats.js';

/** Seven day buttons for the week of the selected date, each with its progress. */
export function renderWeek(container, state, selected, today) {
  container.innerHTML = weekKeys(selected)
    .map((key, index) => {
      const progress = dayProgress(state, key);
      const isFuture = key > today;
      const percent = isFuture ? 0 : (progress.percent ?? 0);
      const summary =
        progress.scheduled === 0
          ? 'nothing scheduled'
          : isFuture
            ? `${progress.scheduled} scheduled`
            : `${progress.done} of ${progress.scheduled} completed`;

      const classes = ['day'];
      if (key === today) classes.push('is-today');
      if (isFuture) classes.push('is-future');
      if (!isFuture && progress.percent === 100) classes.push('is-complete');

      return `
        <button class="${classes.join(' ')}" type="button"
          data-action="select-day" data-key="${key}" data-focus-key="day:${key}"
          aria-pressed="${key === selected}"
          aria-label="${formatLong(key)}, ${summary}">
          <span class="day__name">${WEEKDAYS[index].short}</span>
          <span class="day__ring" style="--p: ${percent}"><span>${fromKey(key).getDate()}</span></span>
        </button>`;
    })
    .join('');
}
