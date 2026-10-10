import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL || 'https://www.rotarykerstkrans.nl';

export default defineConfig({
  site,
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // Eigen, proxy-bewuste CSRF-check in src/middleware.ts (de ingebouwde check
  // gebruikt url.origin, wat achter Passenger/Plesk onbetrouwbaar is).
  security: { checkOrigin: false },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/beheer') && !page.includes('/api/') && !page.includes('/bedankt'),
    }),
  ],
});
