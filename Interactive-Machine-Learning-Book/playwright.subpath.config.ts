import { defineConfig } from '@playwright/test';
import base from './playwright.config';
process.env.BOOK_TEST_DIST = 'dist-subpath';
export default defineConfig({ ...base, reporter: [['list'], ['json', { outputFile: 'artifacts/browser-subpath.json' }], ['html', { open: 'never' }]], use: { ...base.use, baseURL: 'http://127.0.0.1:4462/machine-learning/' }, testIgnore: ['**/visual*.spec.ts'], webServer: { command: 'node scripts/serve-dist.mjs dist-subpath /machine-learning/ 4462', url: 'http://127.0.0.1:4462/machine-learning/', reuseExistingServer: false } });
