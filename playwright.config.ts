import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.pw.ts',
  use: {
    baseURL: 'http://127.0.0.1:1421',
    channel: 'msedge',
    viewport: { width: 960, height: 720 },
    launchOptions: { args: ['--no-proxy-server'] },
  },
  webServer: {
    command: 'npm run dev -- --port 1421',
    url: 'http://127.0.0.1:1421',
    reuseExistingServer: false,
  },
});
