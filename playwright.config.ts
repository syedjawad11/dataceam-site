import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:4321',
    browserName: 'chromium',
  },
  webServer: {
    command: 'npx astro preview --ignore-lock --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: false,
  },
});
