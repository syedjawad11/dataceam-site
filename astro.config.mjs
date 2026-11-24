// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import {
  isLearningPageIndexable,
  lastmodFor,
} from './src/lib/learning-indexing.ts';
import { satteri } from '@astrojs/markdown-satteri';
import { tableScroll } from './src/lib/rehype-table-scroll.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://dataceam.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  markdown: { processor: satteri({ hastPlugins: [tableScroll] }) },
  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    sitemap({
      filter: isLearningPageIndexable,
      serialize(item) {
        const lastmod = lastmodFor(item.url);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
});
