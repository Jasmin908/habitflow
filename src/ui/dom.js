import { HABIT_ICONS, UI_ICONS } from '../modules/catalog.js';

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Every piece of user text goes through this before it is put into HTML. */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ENTITIES[char]);
}

function svg(path) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`;
}

export function uiIcon(name) {
  return svg(UI_ICONS[name]);
}

export function habitIcon(name) {
  return svg((HABIT_ICONS[name] ?? HABIT_ICONS.target).path);
}

/** Fills the static `<span data-icon="…">` placeholders in index.html. */
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((element) => {
    element.innerHTML = uiIcon(element.dataset.icon);
  });
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
