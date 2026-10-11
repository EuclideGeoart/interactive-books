import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/**
 * The same suite against the sub-directory build (BOOK_BASE=/math-foundations/). Visual baselines are not
 * re-checked here (they are identical by construction and checked at the root); everything functional is.
 */
process.env.BOOK_TEST_PORT ??= '4452';
process.env.BOOK_TEST_DIST ??= 'dist-subpath';
process.env.BOOK_TEST_BASE ??= '/math-foundations/';

const port = process.env.BOOK_TEST_PORT;
const mount = process.env.BOOK_TEST_BASE;
const dist = process.env.BOOK_TEST_DIST;

export default defineConfig({
  ...base,
  testIgnore: ['**/visual*.spec.ts'],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}${mount}` },
  webServer: { command: `node scripts/serve-dist.mjs ${dist} ${mount} ${port}`, url: `http://127.0.0.1:${port}${mount}`, reuseExistingServer: false, timeout: 20_000 },
});
