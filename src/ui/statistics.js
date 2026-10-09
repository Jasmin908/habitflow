/**
 * Statistics page. Loaded on demand (it brings Chart.js with it), so the
 * dashboard stays light.
 */
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';

import {
  habitPerformance,
  monthProgress,
  monthSeries,
  totalCompletions,
  trackingSummary,
  weekProgress,
  weeklySeries,
} from '../modules/analytics.js';
import { formatDayMonth, formatLong, formatMonth, fromKey } from '../modules/dates.js';
import { streakSummary } from '../modules/stats.js';
import { escapeHtml, habitIcon, pluralize, uiIcon } from './dom.js';
import { statCard } from './stats.js';

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip);

const container = document.querySelector('#statistics-content');
let charts = [];

const rate = (progress) => (progress.percent === null ? '–' : `${progress.percent}%`);
const rateNote = (progress, empty) =>
  progress.scheduled === 0 ? empty : `${progress.done} of ${progress.scheduled} scheduled completed`;

/** Colours follow the active theme, read from the CSS tokens. */
function palette() {
  const css = getComputedStyle(document.documentElement);
  const token = (name) => css.getPropertyValue(name).trim();
  return {
    accent: token('--violet'),
    accentSoft: token('--chart-soft'),
    text: token('--text'),
    muted: token('--muted'),
    line: token('--chart-grid'),
    surface: token('--surface-3'),
  };
}

/** @param {{ title: Function, label: Function }} tooltip Text shown when a bar or point is hovered or focused. */
function chartOptions(colors, tooltip) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 500 },
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { grid: { display: false }, border: { color: colors.line }, ticks: { color: colors.muted, maxRotation: 0, autoSkipPadding: 12 } },
      y: {
        min: 0,
        max: 100,
        border: { display: false },
        grid: { color: colors.line },
        ticks: { color: colors.muted, stepSize: 25, callback: (value) => `${value}%` },
      },
    },
    plugins: {
      tooltip: {
        backgroundColor: colors.surface,
        titleColor: colors.text,
        bodyColor: colors.text,
        borderColor: colors.line,
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: tooltip,
      },
    },
  };
}

/** The same numbers as the chart, as a table for screen readers. */
function dataTable(caption, columns, rows) {
  // The wrapper is hidden visually; a <table> itself ignores a 1px width.
  return `
    <div class="visually-hidden">
      <table>
        <caption>${caption}</caption>
        <thead><tr>${columns.map((column) => `<th scope="col">${column}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>`;
}

const describe = (entry) =>
  entry.scheduled === 0 ? 'Nothing scheduled' : `${entry.done} of ${entry.scheduled} completed (${entry.percent}%)`;

function performanceRow(entry) {
  const { habit } = entry;
  const width = entry.percent ?? 0;
  return `
    <li class="perf">
      <span class="habit__icon">${habitIcon(habit.icon)}</span>
      <div class="perf__main">
        <div class="perf__top">
          <span class="perf__name">${escapeHtml(habit.name)}</span>
          <span class="perf__rate">${entry.percent === null ? '–' : `${entry.percent}%`}</span>
        </div>
        <div class="bar" role="img" aria-label="${
          entry.scheduled === 0
            ? 'Not scheduled in the last 30 days'
            : `${entry.done} of ${entry.scheduled} scheduled days completed in the last 30 days`
        }"><span style="width: ${width}%"></span></div>
        <p class="perf__meta">
          <span>${entry.scheduled === 0 ? 'Not scheduled in the last 30 days' : `${entry.done} / ${entry.scheduled} in the last 30 days`}</span>
          <span>Current streak: ${pluralize(entry.current, 'day')}</span>
          <span>Best: ${pluralize(entry.best, 'day')}</span>
          <span>${pluralize(entry.total, 'completion')} in total</span>
        </p>
      </div>
    </li>`;
}

export function renderStatistics(state, today) {
  charts.forEach((chart) => chart.destroy());
  charts = [];

  if (state.habits.length === 0) {
    container.innerHTML = `
      <div class="panel">
        <div class="empty empty--plain">
          <span class="empty__icon">${uiIcon('statistics')}</span>
          <h3>No statistics yet</h3>
          <p>Statistics appear as soon as you have habits and start ticking them off.</p>
          <button class="btn btn--primary" type="button" data-action="new-habit">
            <span class="btn__icon">${uiIcon('plus')}</span><span>Create habit</span>
          </button>
        </div>
      </div>`;
    return;
  }

  // Say so when there is little or no history behind the figures yet.
  const tracking = trackingSummary(state, today);
  const notice =
    tracking.status === 'upcoming'
      ? `Your first habit starts on ${escapeHtml(formatLong(tracking.firstDay))}. Statistics will fill in from then on.`
      : tracking.status === 'limited'
        ? `These figures are based on ${pluralize(tracking.days, 'day')} so far. They'll tell you more once you have a week or two of history.`
        : '';

  const week = weekProgress(state, today);
  const month = monthProgress(state, today);
  const streaks = streakSummary(state, today);
  const weeks = weeklySeries(state, today, 8);
  const days = monthSeries(state, today, today);
  const performance = habitPerformance(state, today, 30);

  container.innerHTML = `
    ${notice ? `<p class="notice"><span class="notice__icon">${uiIcon('info')}</span><span>${notice}</span></p>` : ''}
    <section class="stats" aria-label="Key figures">
      ${statCard({ icon: 'calendar', label: 'This week', value: rate(week), note: rateNote(week, 'Nothing scheduled so far') })}
      ${statCard({ icon: 'trend', label: 'This month', value: rate(month), note: rateNote(month, 'Nothing scheduled so far') })}
      ${statCard({
        icon: 'checkCircle',
        label: 'Total completions',
        value: totalCompletions(state),
        note: 'All habits, all time',
      })}
      ${statCard({
        icon: 'award',
        label: 'Longest streak',
        value: streaks.best.days,
        unit: streaks.best.days === 1 ? 'day' : 'days',
        note: streaks.best.habit ? escapeHtml(streaks.best.habit.name) : 'No streak yet',
      })}
    </section>

    <div class="charts">
      <section class="panel" aria-labelledby="chart-weeks-title">
        <header class="panel__head">
          <div>
            <h2 id="chart-weeks-title">Weekly completion</h2>
            <p class="panel__sub">Share of scheduled habits completed, last 8 weeks</p>
          </div>
        </header>
        <div class="chart"><canvas id="chart-weeks" role="img" aria-label="Bar chart of the weekly completion rate over the last 8 weeks. The figures follow in a table."></canvas></div>
        ${dataTable(
          'Weekly completion rate',
          ['Week starting', 'Result'],
          weeks.map((entry) => [formatDayMonth(entry.start), describe(entry)]),
        )}
      </section>

      <section class="panel" aria-labelledby="chart-month-title">
        <header class="panel__head">
          <div>
            <h2 id="chart-month-title">${escapeHtml(formatMonth(today))}</h2>
            <p class="panel__sub">Daily completion this month. Days without scheduled habits are left out.</p>
          </div>
        </header>
        <div class="chart"><canvas id="chart-month" role="img" aria-label="Line chart of the daily completion rate this month. The figures follow in a table."></canvas></div>
        ${dataTable(
          'Daily completion rate this month',
          ['Day', 'Result'],
          days.filter((entry) => !entry.future).map((entry) => [formatDayMonth(entry.key), describe(entry)]),
        )}
      </section>
    </div>

    <section class="panel" aria-labelledby="performance-title">
      <header class="panel__head">
        <div>
          <h2 id="performance-title">Habit performance</h2>
          <p class="panel__sub">Each habit over the last 30 days, counting only the days it was scheduled</p>
        </div>
      </header>
      <ul class="perf-list">${performance.map(performanceRow).join('')}</ul>
    </section>`;

  const colors = palette();

  charts.push(
    new Chart(container.querySelector('#chart-weeks'), {
      type: 'bar',
      data: {
        labels: weeks.map((entry) => formatDayMonth(entry.start)),
        datasets: [
          {
            data: weeks.map((entry) => entry.percent),
            backgroundColor: weeks.map((entry) => (entry.isCurrent ? colors.accent : colors.accentSoft)),
            borderRadius: 6,
            maxBarThickness: 34,
          },
        ],
      },
      options: chartOptions(colors, {
        title: (items) => {
          const entry = weeks[items[0].dataIndex];
          return `${formatDayMonth(entry.start)} – ${formatDayMonth(entry.end)}${entry.isCurrent ? ' (this week)' : ''}`;
        },
        label: (item) => describe(weeks[item.dataIndex]),
      }),
    }),
  );

  charts.push(
    new Chart(container.querySelector('#chart-month'), {
      type: 'line',
      data: {
        labels: days.map((entry) => fromKey(entry.key).getDate()),
        datasets: [
          {
            data: days.map((entry) => entry.percent),
            borderColor: colors.accent,
            backgroundColor: colors.accent,
            borderWidth: 2,
            // Smooth, but never curving above 100% or below 0%.
            cubicInterpolationMode: 'monotone',
            pointRadius: 3,
            pointHoverRadius: 5,
            spanGaps: true,
          },
        ],
      },
      options: chartOptions(colors, {
        title: (items) => formatDayMonth(days[items[0].dataIndex].key),
        label: (item) => describe(days[item.dataIndex]),
      }),
    }),
  );
}
