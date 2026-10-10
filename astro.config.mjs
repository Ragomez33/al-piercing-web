// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Public base URL for canonical/OG/JSON-LD/robots/sitemap. Set via the SITE env var at build.
  site: process.env.SITE || 'https://alpiercing.com',
  integrations: [
    svelte(),
    // Auto-generates sitemap-index.xml every build; the private /admin area is excluded.
    sitemap({
      filter: (page) => !page.includes('/admin'),
    }),
  ]
});