/**
 * The fixed choices offered in the habit form.
 * Icons are single stroked paths on a 24×24 grid.
 */

export const CATEGORIES = [
  'Health',
  'Fitness',
  'Mind',
  'Learning',
  'Work',
  'Creativity',
  'Home',
  'Social',
  'Other',
];

export const DEFAULT_CATEGORY = 'Health';

export const HABIT_ICONS = {
  target: {
    label: 'Target',
    path: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 12h.01',
  },
  droplet: {
    label: 'Water',
    path: 'M12 3.5c3 3.6 5.5 6.4 5.5 9.5a5.5 5.5 0 0 1-11 0c0-3.1 2.5-5.9 5.5-9.5Z',
  },
  activity: { label: 'Activity', path: 'M3 12h4l2.5-6 4 12 2.5-6h5' },
  dumbbell: { label: 'Strength', path: 'M3.5 9.5v5M6.5 7v10M17.5 7v10M20.5 9.5v5M6.5 12h11' },
  heart: {
    label: 'Heart',
    path: 'M12 20S4.5 15.4 4.5 10a4.2 4.2 0 0 1 7.5-2.6A4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z',
  },
  leaf: { label: 'Leaf', path: 'M5 19c0-8 5-13 14-14 0 9-5 14-14 14ZM5 19l8-8' },
  moon: { label: 'Sleep', path: 'M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z' },
  sun: {
    label: 'Morning',
    path: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  },
  book: {
    label: 'Reading',
    path: 'M5 4.5h10.5A2.5 2.5 0 0 1 18 7v12.5H7.5A2.5 2.5 0 0 1 5 17V4.5ZM5 17a2.5 2.5 0 0 1 2.5-2.5H18M9 8.5h5',
  },
  code: { label: 'Code', path: 'M8.5 7 4 12l4.5 5M15.5 7l4.5 5-4.5 5' },
  pencil: { label: 'Writing', path: 'M4 20l1-4.5L16.5 4a2.1 2.1 0 0 1 3 3L8 18.5 4 20ZM14.5 6l3.5 3.5' },
  music: {
    label: 'Music',
    path: 'M9 17.5v-12l10-2v12M9 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM19 15.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM9 9.5l10-2',
  },
  coffee: {
    label: 'Break',
    path: 'M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9ZM16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5v2M12 3.5v2',
  },
  sparkle: {
    label: 'Sparkle',
    path: 'M12 3.5c.8 4.6 3.4 7.2 8 8-4.6.8-7.2 3.4-8 8-.8-4.6-3.4-7.2-8-8 4.6-.8 7.2-3.4 8-8Z',
  },
};

export const DEFAULT_ICON = 'target';

/** Interface icons (buttons, empty states). */
export const UI_ICONS = {
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6 6 18',
  chevronLeft: 'M14.5 6l-6 6 6 6',
  chevronRight: 'M9.5 6l6 6-6 6',
  edit: 'M4 20l1-4.5L16.5 4a2.1 2.1 0 0 1 3 3L8 18.5 4 20ZM14.5 6l3.5 3.5',
  trash: 'M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5',
  flame: 'M12 3.5c.5 3.5 5 5 5 10a5 5 0 0 1-10 0c0-2 .8-3.4 2-4.5.4 1.6 1 2.4 2 3 0-3 .2-5.5 1-8.5Z',
  calendar: 'M5.5 5.5h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2ZM3.5 10h17M8 3.5v4M16 3.5v4',
  // Navigation
  dashboard: 'M4 4.5h6.5v7H4zM13.5 4.5H20v4h-6.5zM13.5 12.5H20v7h-6.5zM4 15.5h6.5v4H4z',
  statistics: 'M4 20h16M7 16.5V11M12 16.5V6M17 16.5V13',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5',
  // Cards and settings
  list: 'M8.5 7H20M8.5 12H20M8.5 17H20M4.5 7h.01M4.5 12h.01M4.5 17h.01',
  checkCircle: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM8.5 12.5l2.5 2.5 4.5-5.5',
  trend: 'M3.5 17.5l5.5-5.5 3.5 3.5 7.5-7.5M15 8h5v5',
  award: 'M12 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM8.5 13.5 7 20.5l5-2.5 5 2.5-1.5-7',
  info: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 11v5M12 8h.01',
  download: 'M12 4v11M7.5 11l4.5 4.5 4.5-4.5M5 19.5h14',
  upload: 'M12 15.5v-11M7.5 9 12 4.5 16.5 9M5 19.5h14',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  moon: 'M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z',
};
