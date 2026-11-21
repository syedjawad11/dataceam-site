// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { isLearningPageIndexable } from './src/lib/learning-indexing.ts';

// https://astro.build/config
export default defineConfig({
  site: 'https://dataceam.com',
  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [sitemap({ filter: isLearningPageIndexable })],
});
