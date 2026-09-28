import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './scripts/feature-guide',
  testMatch: 'generate-feature-guide.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4301',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 940 },
    deviceScaleFactor: 1,
  },
  webServer: {
    command: 'npm start -- --host 127.0.0.1 --port 4301',
    url: 'http://127.0.0.1:4301',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
