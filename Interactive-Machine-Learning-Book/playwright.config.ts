import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';
const chrome = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync('/opt/google/chrome/chrome') ? '/opt/google/chrome/chrome' : undefined);
process.env.BOOK_TEST_DIST ??= 'dist';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: true, workers: 2, timeout: 30_000,
  expect: { timeout: 7_000 }, reporter: [['list'], ['json', { outputFile: 'artifacts/browser-root.json' }], ['html', { open: 'never' }]],
  snapshotPathTemplate: '{testDir}/{testFileDir}/__screenshots__/{platform}/{testFileName}/{projectName}-{arg}{ext}',
  use: { baseURL: 'http://127.0.0.1:4461/', colorScheme: 'light', reducedMotion: 'reduce', trace: 'retain-on-failure', screenshot: 'only-on-failure', launchOptions: chrome ? { executablePath: chrome } : {} },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { viewport: { width: 820, height: 1180 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
  webServer: { command: 'node scripts/serve-dist.mjs dist / 4461', url: 'http://127.0.0.1:4461/', reuseExistingServer: false },
});
