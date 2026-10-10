import { defineConfig } from '@playwright/test';
const port = process.env.BOOK_TEST_PORT || '4321';
const basePath = process.env.BOOK_TEST_BASE || '/';
const baseURL = `http://127.0.0.1:${port}${basePath.endsWith('/') ? basePath : `${basePath}/`}`;
// A frozen production directory keeps concurrent builds out of a regression.
const frozen = process.env.BOOK_TEST_DIST;
const outputArg = frozen ? ` --outDir '${frozen.replace(/'/g, "'\\''")}'` : '';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 3,
  timeout: 30000,
  expect: { timeout: 5000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {},
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'tablet', use: { viewport: { width: 1024, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port}${outputArg}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI && !frozen,
    env: { ASTRO_TELEMETRY_DISABLED: '1' },
  },
});
