// Full-resolution review screenshots of representative pages, for human inspection (NOT the regression baseline —
// that lives in tests/e2e/visual.spec.ts). Requires a running server, e.g. `npm run serve`.
//
//   node scripts/capture-review.mjs <outDir> [baseUrl=http://127.0.0.1:4451] [filter]
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [outDir = 'review-shots', baseArg = 'http://127.0.0.1:4451', filter = ''] = process.argv.slice(2);
const base = baseArg.replace(/\/$/, '');
mkdirSync(outDir, { recursive: true });
const chrome = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync('/opt/google/chrome/chrome') ? '/opt/google/chrome/chrome' : undefined);
const browser = await chromium.launch({ executablePath: chrome });

const sizes = { desktop: { width: 1440, height: 900 }, tablet: { width: 820, height: 1180 }, mobile: { width: 390, height: 844 } };
const shots = [
  // [name, path, size, theme, options]
  ['landing-desktop', '/', 'desktop', 'light', { fullPage: true }],
  ['landing-desktop-dark', '/', 'desktop', 'dark', { fullPage: true }],
  ['landing-mobile', '/', 'mobile', 'light', { fullPage: true }],
  ['foundation-desktop', '/foundation/', 'desktop', 'light', { fullPage: true }],
  ['foundation-desktop-dark', '/foundation/', 'desktop', 'dark', { fullPage: true }],
  ['foundation-tablet', '/foundation/', 'tablet', 'light', { fullPage: true }],
  ['foundation-mobile', '/foundation/', 'mobile', 'light', { fullPage: true }],
  ['hero-desktop', '/', 'desktop', 'light', { selector: '.hero' }],
  ['hero-mobile', '/', 'mobile', 'light', { selector: '.hero' }],
  ['stage-desktop', '/foundation/', 'desktop', 'light', { selector: '[data-stage="vector"]' }],
  ['stage-mobile', '/foundation/', 'mobile', 'light', { selector: '[data-stage="vector"]' }],
  ['contents-desktop', '/contents/', 'desktop', 'light', { fullPage: true }],
  ['contents-mobile', '/contents/', 'mobile', 'light', { fullPage: true }],
  ['map-mobile', '/foundation/', 'mobile', 'light', { openMap: true }],
  ['map-desktop', '/foundation/', 'desktop', 'light', { openMap: true }],
  ['notfound-desktop', '/does-not-exist/', 'desktop', 'light', {}],
];

for (const [name, path, size, theme, options] of shots) {
  if (filter && !name.includes(filter)) continue;
  const context = await browser.newContext({ viewport: sizes[size], deviceScaleFactor: Number(process.env.DSF ?? 2), colorScheme: theme, reducedMotion: 'reduce', isMobile: size === 'mobile', hasTouch: size === 'mobile' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (await page.locator('[data-stage][data-hydrated]').count()) await page.waitForSelector('[data-stage][data-hydrated="true"]');
  if (options.openMap) { await page.locator('[data-map-open]').first().click(); await page.waitForTimeout(150); }
  const target = join(outDir, `${name}.png`);
  if (options.selector) await page.locator(options.selector).first().screenshot({ path: target });
  else await page.screenshot({ path: target, fullPage: Boolean(options.fullPage) });
  console.log(`${name}${errors.length ? '  ERRORS: ' + errors.join(' | ') : ''}`);
  await context.close();
}
await browser.close();
