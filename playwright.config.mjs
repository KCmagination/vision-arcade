import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.mjs',
  timeout: 180_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  outputDir: 'test-results/browser',
  reporter: [['list'], ['html', { outputFolder: 'test-results/browser-report', open: 'never' }], ['json', { outputFile: 'test-results/browser-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    browserName: 'chromium',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    reducedMotion: 'reduce',
    trace: { mode: 'retain-on-failure', screenshots: false, snapshots: true, sources: false },
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
    launchOptions: { executablePath: process.env.VISION_BROWSER_EXECUTABLE || undefined, args: ['--disable-webgl', '--disable-dev-shm-usage'] },
  },
  projects: [
    { name: 'desktop-mouse', use: { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 } },
    { name: 'mobile-touch', use: { viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: process.env.VISION_BROWSER_PREBUILT === '1' ? 'npm run start -- --hostname 127.0.0.1 --port 3100' : 'npm run build && npm run start -- --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    timeout: 180_000,
    reuseExistingServer: process.env.VISION_BROWSER_REUSE_SERVER === '1' && !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
