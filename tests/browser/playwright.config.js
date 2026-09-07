import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  timeout: 60000,
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000', viewport: { width: 1600, height: 1000 }, headless: true, channel: 'msedge' },
  outputDir: '../../test-results',
  reporter: 'list'
});
