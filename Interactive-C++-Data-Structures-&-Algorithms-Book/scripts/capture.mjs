import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
mkdirSync('tests/visual', { recursive: true });
for (const width of [1440, 1024, 390]) {
  const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 }, colorScheme: 'light', reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `tests/visual/${width}-overview.png` });
  await page.locator('[data-mental]').screenshot({ style: '.topbar,.skip-link{visibility:hidden} .playback-controls{position:static}', path: `tests/visual/${width}-mental.png` });
  await page.locator('[data-lab]').screenshot({ style: '.topbar,.skip-link{visibility:hidden} .playback-controls{position:static}', path: `tests/visual/${width}-lab.png` });
  const measurements = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth, nodes: document.querySelectorAll('[data-lab] [data-node]').length }));
  console.log(JSON.stringify({ width, errors, ...measurements }));
  if (width === 390) {
    await page.locator('[data-lab] [data-svg]').evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + scrollY - 85));
    await page.screenshot({ path: 'tests/visual/mobile-lab-in-use.png' });
    console.log('mobile controls', await page.locator('.playback-controls').boundingBox());
  }
  if (width === 1440) {
    await page.locator('[data-lab] [data-jump="head.link"]').click();
    await page.locator('[data-lab] [data-diagram]').screenshot({ path: 'tests/visual/head-link.png', style: '.topbar{visibility:hidden}' });
    await page.locator('[data-lab] [data-view="memory"]').click();
    await page.locator('[data-lab] [data-diagram]').screenshot({ path: 'tests/visual/head-link-memory.png', style: '.topbar{visibility:hidden}' });
    await page.locator('[data-break-mode]').selectOption('cycle');
    await page.locator('[data-break-run]').click();
    await page.locator('[data-break] [data-diagram]').screenshot({ path: 'tests/visual/cycle.png', style: '.topbar{visibility:hidden}' });
    await page.locator('[data-lab] [data-action="reset"]').click();
    await page.locator('[data-lab] [data-view="logical"]').click();
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: 'tests/visual/dark-overview.png' });
    await page.locator('[data-lab]').screenshot({ style: '.topbar,.skip-link{visibility:hidden} .playback-controls{position:static}', path: 'tests/visual/dark-lab.png' });
  }
  await page.close();
}
await browser.close();
