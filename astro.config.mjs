// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // The www host, not the apex: anvesha26.in 308-redirects to www.anvesha26.in, so this
  // is the URL that actually serves. It has to match, because every canonical link and
  // every sitemap entry is built from it — pointing them at a host that only redirects
  // asks Google to index one URL while being sent to another.
  site: 'https://www.anvesha26.in',

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [
    sitemap({
      // The admin panel and the distribution counter are not pages anyone should find in
      // a search result. robots.txt asks crawlers not to fetch them and the layouts send
      // noindex, but a URL sitting in a sitemap is a positive request to index it — the
      // three have to agree or the strongest signal wins, and it would be this one.
      filter: (page) =>
        !page.includes('/admin') && !page.includes('/distribution'),
    }),
  ],
});
