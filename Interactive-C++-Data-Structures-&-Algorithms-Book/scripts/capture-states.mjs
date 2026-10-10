import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
for (const width of [1440, 390]) {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, reducedMotion: 'reduce', colorScheme: 'light', isMobile: width === 390, hasTouch: width === 390 });
  const cases = [
    { slug: '02-stack', name: 'linked-destruction', operation: 'pop', jump: 'lo.delete', select: ['implementation', 'linked'] },
    { slug: '03-doubly-linked-list', name: 'half-rewired', operation: 'delete-middle', jump: 'unlink.forward' },
    { slug: '04-memory-pool', name: 'detached-free-head', operation: 'cycle', jump: 'allocate.head' },
    { slug: '04-memory-pool', name: 'reserved-storage', operation: 'cycle', jump: 'allocate.reserve' },
    { slug: '04-memory-pool', name: 'live-object', operation: 'cycle', jump: 'construct.object' },
    { slug: '04-memory-pool', name: 'destroyed-object', operation: 'cycle', jump: 'destroy.object' },
    { slug: '04-memory-pool', name: 'free-list-reordered', operation: 'reorder', view: 'memory' },
    { slug: '05-intrusive-list', name: 'unlinked-alive', operation: 'remove-middle' },
    { slug: '05-intrusive-list', name: 'independent-hooks', operation: 'multiple-hooks', select: ['hook', 'render'] },
  ];
  for (const state of cases) {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${process.env.BOOK_TEST_PORT || '4323'}/chapters/${state.slug}/`);
    const lab = page.locator('[data-chapter-lab]');
    await page.waitForFunction(() => document.querySelector('[data-chapter-lab]')?.getAttribute('data-step') === '0');
    if (state.select) await lab.locator(`[name="${state.select[0]}"]`).selectOption(state.select[1]);
    await lab.locator(`[data-operation="${state.operation}"]`).click();
    if (state.jump) await lab.locator(`[data-code-region]:not([hidden]) [data-jump="${state.jump}"]`).click();
    else await lab.locator('[data-phase="after"]').click();
    if (state.view) await lab.locator(`[data-view="${state.view}"]`).click();
    await page.addStyleTag({ content: '.topbar,.skip-link{visibility:hidden}.playback-controls{position:static}' });
    await lab.screenshot({ path: `tests/visual/bundle/${state.name}-${width}.png` });
    await page.close();
  }
  for (const [slug, name, selector] of [
    ['02-stack', 'stack-comparison', '[data-stack-comparison]'],
    ['03-doubly-linked-list', 'doubly-complexity', '[data-doubly-complexity]'],
    ['03-doubly-linked-list', 'doubly-broken', '[data-doubly-break]'],
  ]) {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${process.env.BOOK_TEST_PORT || '4323'}/chapters/${slug}/`);
    const panel = page.locator(selector);
    if (name === 'doubly-broken') await panel.locator('[data-break]').click();
    await page.addStyleTag({ content: '.topbar,.skip-link{visibility:hidden}' });
    await panel.screenshot({ path: `tests/visual/bundle/${name}-${width}.png` });
    await page.close();
  }
  await context.close();
}
await browser.close();
