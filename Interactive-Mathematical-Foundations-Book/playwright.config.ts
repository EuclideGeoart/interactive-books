import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

/**
 * Browser tests run against a PRODUCTION build served by scripts/serve-dist.mjs (a strict static server), never
 * against the dev server: base paths, 404s and hashed assets then behave as they will in deployment.
 *
 *   npm run build && npm run test:e2e                        # root deployment (dist/ at "/")
 *   npm run build:subpath && npm run test:e2e:subpath        # sub-directory deployment (dist-subpath/ at "/math-foundations/")
 *
 * Test code navigates with RELATIVE paths ("foundation/"), never "/foundation/", so the base path is honoured.
 * Ports 4451/4452 are chosen to stay clear of other projects' dev servers.
 */
export const port = process.env.BOOK_TEST_PORT ?? '4451';
export const dist = process.env.BOOK_TEST_DIST ?? 'dist';
export const mount = (process.env.BOOK_TEST_BASE ?? '/').replace(/\/?$/, '/');
// Linux reference captures were taken with the system Chrome below; elsewhere Playwright's own bundled Chromium is used.
const chrome = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync('/opt/google/chrome/chrome') ? '/opt/google/chrome/chrome' : undefined);

/**
 * Screenshot baselines are PER RENDERING PLATFORM. Text rasterisation differs between operating systems, so a
 * Windows capture is never allowed to overwrite, or be compared with a loosened tolerance against, a Linux one.
 *   - Linux (and any platform without its own set): tests/e2e/__screenshots__/<file>/<project>-<name>.png  (the established references, untouched)
 *   - Windows: tests/e2e/__screenshots__/win32/<file>/<project>-<name>.png  (see that directory's README for its review status)
 * Override with BOOK_BASELINE_PLATFORM (e.g. "linux" to force the reference set; an empty value means the reference set).
 */
const baselinePlatform = process.env.BOOK_BASELINE_PLATFORM ?? (process.platform === 'win32' ? 'win32' : '');
const snapshotDir = baselinePlatform && baselinePlatform !== 'linux' ? `{testDir}/__screenshots__/${baselinePlatform}` : '{testDir}/__screenshots__';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 3,
  timeout: 30_000,
  expect: { timeout: 7_000, toHaveScreenshot: { maxDiffPixelRatio: 0.004, animations: 'disabled' } },
  reporter: [['list'], ['html', { open: 'never' }]],
  snapshotPathTemplate: `${snapshotDir}/{testFileName}/{projectName}-{arg}{ext}`,
  use: {
    baseURL: `http://127.0.0.1:${port}${mount}`,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: chrome ? { executablePath: chrome } : {},
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { viewport: { width: 820, height: 1180 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
  webServer: {
    command: `node scripts/serve-dist.mjs ${dist} ${mount} ${port}`,
    url: `http://127.0.0.1:${port}${mount}`,
    reuseExistingServer: false,
    timeout: 20_000,
  },
});
