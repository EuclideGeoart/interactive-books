import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
const chapters = ['06-queue-deque', '07-circular-buffer', '08-priority-queue', '09-binary-heap'];
const output = 'tests/visual/part-ii';
mkdirSync(output, { recursive: true });
try {
  for (const width of [1440, 1024, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, colorScheme: 'light', reducedMotion: 'reduce', isMobile: width === 390, hasTouch: width === 390 });
    for (const slug of chapters) {
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${process.env.BOOK_TEST_PORT || '4332'}/chapters/${slug}/`);
      const lab = page.locator('[data-chapter-lab]').first();
      await page.waitForFunction(() => document.querySelector('[data-chapter-lab]')?.getAttribute('data-step') === '0');
      await page.screenshot({ path: `${output}/${slug}-${width}-overview.png` });
      await page.addStyleTag({ content: '.topbar,.skip-link{visibility:hidden}.playback-controls{position:static}' });
      await lab.screenshot({ path: `${output}/${slug}-${width}-lab.png` });
      await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
      await lab.screenshot({ path: `${output}/${slug}-${width}-dark.png` });
      await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
      if (slug.startsWith('07')) {
        await lab.locator('[data-view="memory"]').click();
        await lab.locator('[data-jump="rp.wrap"]').click();
        await lab.screenshot({ path: `${output}/ring-wrap-${width}.png` });
      }
      if (slug.startsWith('09')) {
        await lab.locator('[data-jump="hu.swap"]').click();
        await lab.screenshot({ path: `${output}/heap-swap-${width}.png` });
      }
      for (const section of ['complexity', 'break-it']) {
        await page.locator(`#${section}`).screenshot({ path: `${output}/${slug}-${width}-${section}.png` });
      }
      await page.close();
    }
    await context.close();
  }
} finally { await browser.close(); }
