import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
const chapters = ['01-singly-linked-list', '02-stack', '03-doubly-linked-list', '04-memory-pool', '05-intrusive-list'];
const selected = process.argv.slice(2);
mkdirSync('tests/visual/bundle', { recursive: true });
for (const width of [1440, 1024, 390]) {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, colorScheme: 'light', reducedMotion: 'reduce', isMobile: width === 390, hasTouch: width === 390 });
  for (const slug of chapters.filter(chapter => !selected.length || selected.some(number => chapter.startsWith(number)))) {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${process.env.BOOK_TEST_PORT || '4323'}/chapters/${slug}/`);
    const lab = page.locator('[data-lab], [data-chapter-lab]').first();
    await page.waitForFunction(() => document.querySelector('[data-lab], [data-chapter-lab]')?.getAttribute('data-step') === '0');
    await page.screenshot({ path: `tests/visual/bundle/${slug}-${width}-overview.png` });
    await page.addStyleTag({ content: '.topbar,.skip-link{visibility:hidden}.playback-controls{position:static}' });
    await lab.screenshot({ path: `tests/visual/bundle/${slug}-${width}-lab.png` });
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    await lab.screenshot({ path: `tests/visual/bundle/${slug}-${width}-dark.png` });
    await page.close();
  }
  await context.close();
}
await browser.close();
