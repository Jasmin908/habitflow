import { WEEKDAYS } from '../modules/dates.js';
import { ruleOn } from '../modules/schedule.js';
import { currentStreak, describeSchedule, habitsForDate, isDone } from '../modules/stats.js';
import { escapeHtml, habitIcon, pluralize, uiIcon } from './dom.js';

function emptyState({ title, text, action, prefix }) {
  return `
    <div class="empty">
      <span class="empty__icon">${uiIcon(action ? 'plus' : 'calendar')}</span>
      <h3>${title}</h3>
      <p>${text}</p>
      ${
        action
          ? `<button class="btn btn--primary" type="button" data-action="new-habit" data-focus-key="${prefix}:empty-create">
               <span class="btn__icon">${uiIcon('plus')}</span><span>Create habit</span>
             </button>`
          : ''
      }
    </div>`;
}

function habitRow(habit, state, selected, today, prefix) {
  const done = isDone(state.completions, habit.id, selected);
  const isFuture = selected > today;
  const streak = currentStreak(habit, state.completions, today);
  const name = escapeHtml(habit.name);
  const checkId = `check-${prefix}-${habit.id}`;

  return `
    <li class="habit${done ? ' is-done' : ''}">
      <input class="habit__check" type="checkbox" id="${checkId}"
        data-action="toggle" data-id="${habit.id}" data-date="${selected}" data-focus-key="${prefix}:check:${habit.id}"
        aria-label="${name}, completed" ${done ? 'checked' : ''} ${isFuture ? 'disabled' : ''} />
      <label class="habit__main" for="${checkId}">
        <span class="habit__icon">${habitIcon(habit.icon)}</span>
        <span class="habit__text">
          <span class="habit__name">${name}</span>
          <span class="habit__meta">
            <span class="chip">${escapeHtml(habit.category)}</span>
            <span>${describeSchedule(ruleOn(habit, selected), WEEKDAYS)}</span>
          </span>
        </span>
      </label>
      <span class="habit__streak${streak > 0 ? ' is-active' : ''}" title="Current streak of this habit">
        ${uiIcon('flame')}<span>${streak}</span>
        <span class="visually-hidden">${pluralize(streak, 'day')} current streak</span>
      </span>
      <span class="habit__actions">
        <button class="icon-btn" type="button" data-action="edit" data-id="${habit.id}"
          data-focus-key="${prefix}:edit:${habit.id}" aria-label="Edit ${name}">${uiIcon('edit')}</button>
        <button class="icon-btn icon-btn--danger" type="button" data-action="delete" data-id="${habit.id}"
          data-focus-key="${prefix}:delete:${habit.id}" aria-label="Delete ${name}">${uiIcon('trash')}</button>
      </span>
    </li>`;
}

/**
 * The habits scheduled for the selected day, or a helpful empty state.
 * Used by the dashboard and by the calendar's day panel; `prefix` keeps the
 * element ids of the two lists apart.
 */
export function renderHabitList(container, state, selected, today, { prefix = 'dash' } = {}) {
  if (state.habits.length === 0) {
    container.innerHTML = emptyState({
      title: 'Start with one habit',
      text: 'Add something small you want to do regularly. You can tick it off each day and watch your streak grow.',
      action: true,
      prefix,
    });
    return;
  }

  const scheduled = habitsForDate(state.habits, selected);
  if (scheduled.length === 0) {
    container.innerHTML = emptyState({
      title: 'Nothing scheduled',
      text: 'None of your habits are planned for this day. Enjoy the break, or pick another day.',
      action: false,
      prefix,
    });
    return;
  }

  // Open habits first, completed ones below; otherwise the order they were created in.
  const ordered = [...scheduled].sort(
    (a, b) => isDone(state.completions, a.id, selected) - isDone(state.completions, b.id, selected),
  );

  container.innerHTML = `<ul class="habits">${ordered
    .map((habit) => habitRow(habit, state, selected, today, prefix))
    .join('')}</ul>`;
}
