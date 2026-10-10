import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const chapters = [
  ['10', '10-binary-trees'],
  ['11', '11-binary-search-trees'],
  ['12', '12-tree-traversal'],
  ['13', '13-tree-mutation'],
  ['14', '14-avl-trees'],
  ['15', '15-red-black-trees'],
  ['16', '16-b-trees'],
  ['17', '17-tries'],
];
const only = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    '/opt/google/chrome/chrome',
});
mkdirSync('tests/visual/trees', { recursive: true });
for (const [name, width, height] of [
  ['desktop', 1440, 1000],
  ['tablet', 1024, 900],
  ['mobile', 390, 844],
]) {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: name === 'mobile',
    hasTouch: name === 'mobile',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  for (const [number, slug] of chapters.filter(
    ([number]) => !only.length || only.includes(number),
  )) {
    await page.goto(
      `${process.env.BOOK_BASE_URL || 'http://127.0.0.1:4337'}/chapters/${slug}/`,
    );
    const lab = page.locator('[data-chapter-lab]').first();
    await lab.waitFor();
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-chapter-lab]')
          ?.getAttribute('data-step') === '0',
    );
    await page.screenshot({
      path: `tests/visual/trees/${number}-${name}-overview.png`,
    });
    await page.addStyleTag({
      content:
        '.topbar,.skip-link{visibility:hidden}.playback-controls{position:static}',
    });
    await lab
      .locator('.lab-workspace')
      .screenshot({
        path: `tests/visual/trees/${number}-${name}-workspace.png`,
      });
    if (name === 'desktop') {
      await page.evaluate(() => {
        document.documentElement.dataset.theme = 'dark';
      });
      await lab
        .locator('.lab-workspace')
        .screenshot({
          path: `tests/visual/trees/${number}-dark-workspace.png`,
        });
    }
  }
  await context.close();
}
await browser.close();
console.log('Tree entry/workspace captures saved under tests/visual/trees.');
