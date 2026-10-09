/**
 * Keeps the mobile tab bar clear of the hosting badge.
 *
 * Netlify adds a small "Powered by Netlify" badge to the bottom-right corner
 * of the live site (an <iframe id="nl-badge-frame">). On phones it would sit
 * on top of the bottom tab bar and swallow taps on the tabs underneath.
 *
 * The badge is left exactly as it is. This module only measures how much
 * room it takes at the bottom of the screen and publishes that as the CSS
 * variable --badge-clearance. The stylesheet uses it to lift the tabs above
 * the badge. Where there is no badge (local development, another host) the
 * value stays 0 and nothing changes.
 */
const BADGE_ID = 'nl-badge-frame';

function measure() {
  const badge = document.getElementById(BADGE_ID);
  let clearance = 0;

  if (badge) {
    const rect = badge.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    // Only a visible badge that sits at the bottom edge needs room.
    const atBottom = rect.height > 0 && rect.bottom >= viewportHeight - 1 && rect.top > viewportHeight / 2;
    if (atBottom) clearance = Math.ceil(viewportHeight - rect.top);
  }

  document.documentElement.style.setProperty('--badge-clearance', `${clearance}px`);
}

export function initBadgeClearance() {
  measure();
  window.addEventListener('resize', measure);

  // The badge is injected after the page has loaded, and may change size.
  const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(measure) : null;
  const watch = () => {
    const badge = document.getElementById(BADGE_ID);
    if (badge) resizeObserver?.observe(badge);
    measure();
  };
  new MutationObserver(watch).observe(document.body, { childList: true });
  watch();
}
