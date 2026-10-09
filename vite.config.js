import { defineConfig } from 'vite';

/**
 * Social networks need absolute addresses for the sharing image and the
 * canonical link. Netlify provides the site's address as URL during the
 * build; this fills it into the %SITE_URL% placeholders in index.html.
 * Locally the placeholder becomes empty, which leaves root-relative paths.
 */
function siteUrl() {
  const url = (process.env.URL ?? '').replace(/\/$/, '');
  return {
    name: 'habitflow-site-url',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', url),
  };
}

export default defineConfig({
  plugins: [siteUrl()],
});
