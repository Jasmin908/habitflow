# HabitFlow

A habit tracker that runs entirely in your browser. Create habits, tick them
off each day, and follow your progress through streaks, statistics and a
monthly calendar. There is no account and no server: your data stays on your
device.

HabitFlow is a personal project built with plain HTML, CSS and JavaScript,
without a framework.

## Features

**Dashboard**
- Today's habits with one-click completion, and a week strip to move between days
- Overview cards: total habits, completed today, daily completion and the top habit streak
- Create, edit and delete habits, each with a name, category and icon
- Schedules: every day, or selected weekdays

**Statistics**
- Completion rate for the current week and month
- Total completions and the longest streak
- A chart of the last eight weeks and a chart of the current month, day by day
- Per-habit performance over the last 30 days

**Calendar**
- A monthly view showing each day as all done, partly done, missed, still open or nothing scheduled
- Click a day to see its habits; past days can be corrected, future days are locked

**Settings**
- Dark and light theme (dark by default)
- Export all data as a JSON file, and import it again
- Reset all data, after a confirmation

**Under the hood**
- Honest numbers: a habit only counts on days it was scheduled for, and the future is never counted as missed
- Schedule history: changing a habit's weekdays applies from today and does not rewrite the past
- Dates follow the user's local calendar day, not UTC
- Responsive layout with a sidebar on desktop and a tab bar on small screens
- Keyboard accessible, with visible focus states and labelled controls

## Technologies

| | |
| --- | --- |
| Language | JavaScript (ES modules), HTML5, CSS3 |
| Build tool | [Vite](https://vite.dev) |
| Charts | [Chart.js](https://www.chartjs.org), loaded only when the Statistics page is opened |
| Font | [Geist](https://vercel.com/font), self-hosted |
| Storage | The browser's `localStorage` |
| Tests | Node's built-in test runner (`node --test`) |

There is no framework, no backend and no tracking.

## Screenshots

There are no screenshots in this repository yet.

To add some, save them in `docs/screenshots/` and reference them here, for example:

```md
![Dashboard](docs/screenshots/dashboard.png)
```

## Getting started

You need [Node.js](https://nodejs.org) 20.19 or newer.

```bash
git clone <repository-url>
cd habitflow
npm install
npm run dev
```

Vite prints the local address, normally http://localhost:5173.

| Command           | What it does                           |
| ----------------- | -------------------------------------- |
| `npm run dev`     | Start the development server           |
| `npm run build`   | Create the production build in `dist/` |
| `npm run preview` | Serve the production build locally     |
| `npm test`        | Run the automated tests                |

## Testing

```bash
npm test
```

The tests cover the logic that has no user interface: local dates, scheduling,
streaks, completion rates, the calendar's day status, schedule history, data
migration, repair of damaged data, and import/export validation. They run in
Node without a browser and need no extra dependencies.

The interface itself has no automated tests; it was checked by hand in the browser.

## Where your data lives

HabitFlow stores everything in the browser's `localStorage`:

| Key                  | Content                           |
| -------------------- | --------------------------------- |
| `habitflow:v1`       | Habits and the completion history |
| `habitflow:settings` | The chosen theme                  |

This keeps the app simple and private, but it has limits you should know about:

- **One browser, one device.** Data is not synchronised. A different browser,
  another device or a private window starts empty.
- **Tied to the address.** Data belongs to the exact address the app is opened
  from. The same app at a different domain or port has its own separate data.
- **It can be deleted.** Clearing the browser's site data removes it, and some
  browsers clear storage automatically for sites that are not visited for a while.
- **Not encrypted.** Anyone with access to the browser profile can read it.
- **Limited space.** Browsers allow a few megabytes per site, far more than
  habit data needs in practice.

Use **Settings → Export as JSON** to keep a backup, and **Import** to restore
it or move your data to another browser. Importing replaces the current data.

If the stored data cannot be read, the app starts fresh and keeps the
unreadable text under `habitflow:v1:unreadable` instead of deleting it.

## Project structure

```
index.html              page skeleton, the four views and the two dialogs
vite.config.js          fills in the site address for sharing metadata
netlify.toml            build settings for Netlify
public/                 favicon, sharing image, robots.txt
src/
  main.js               start-up, view switching, one click handler for all buttons
  modules/              logic without any DOM access
    dates.js            local date keys ('YYYY-MM-DD'), weeks, months, formatting
    schedule.js         schedule history: which rule applied on which day
    stats.js            scheduling, day progress, streaks, day status
    analytics.js        figures for the Statistics page
    habits.js           the store: create, edit, delete, complete, import, reset
    storage.js          localStorage read/write, migration, repair of damaged data
    transfer.js         building and validating export files
    settings.js         theme preference
    catalog.js          categories and icons
  ui/                   rendering
    dashboard.js        the Dashboard view
    stats.js            overview cards (shared with Statistics)
    week.js             the week strip
    habitList.js        habit rows and empty states (shared with Calendar)
    statistics.js       the Statistics view; loaded on demand with Chart.js
    calendar.js         the Calendar view
    settings.js         the Settings view
    dialogs.js          habit form, confirmation dialog, toasts
    dom.js              HTML escaping and icon helpers
  styles/main.css       all styles; colour tokens for both themes at the top
tests/
  logic.test.js         dates, streaks, storage repair
  v2.test.js            schedule history, migration, analytics, calendar, import/export
```

## How the numbers are calculated

- A habit **counts only on days it is scheduled for**, from its start date on.
  Other days are skipped: they neither extend nor break a streak.
- **Current streak:** consecutive scheduled days completed, counted back from
  today. If today is scheduled but not done yet, the streak is still alive.
- **Completion rates:** completed occurrences divided by scheduled occurrences
  in the period, up to and including today.
- Each habit keeps a **schedule history**. Changing the weekdays adds an entry
  that starts today, so earlier days keep the schedule they had:

  ```js
  schedules: [
    { from: '2026-09-01', type: 'daily',    days: [] },
    { from: '2026-10-09', type: 'weekdays', days: [0, 2, 4] }, // 0 = Monday
  ]
  ```

## Deployment

The app is a static site. `netlify.toml` sets the build command
(`npm run build`), the publish directory (`dist`) and the Node version, so
connecting the repository to Netlify is enough. Any other static host works
the same way: build, then serve the `dist/` folder.

## Ideas for the future

- Optional account and synchronisation between devices
- Reminders or notifications
- Merging an import with existing data instead of replacing it
- Browsing earlier weeks and months in the statistics
- Habits with a target count or duration, not only done or not done
- Pausing or archiving a habit without deleting its history
- Installable as an app with offline support (PWA)
- More languages
- Automated tests for the interface
