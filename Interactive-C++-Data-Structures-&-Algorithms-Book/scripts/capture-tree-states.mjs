import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// Review evidence for mechanically significant intermediate states.
const cases = [
  [
    'bst-successor-bypass',
    '13-tree-mutation',
    '#tree-mutation',
    'erase',
    { preset: 'custom', values: '50,25,75,60,90,55,57', value: '50' },
    'erase.successor-bypass',
  ],
  [
    'dfs-stack',
    '12-tree-traversal',
    '#traversal',
    'inorder',
    {},
    'dfs.emit-in',
  ],
  [
    'bfs-queue',
    '12-tree-traversal',
    '#traversal',
    'bfs',
    {},
    'bfs.enqueue-right',
  ],
  [
    'avl-transfer',
    '14-avl-trees',
    '#avl-lab',
    'insert',
    { values: '50,30,70,20,40', value: '10' },
    'avl.right.detach',
  ],
  [
    'avl-double-restored',
    '14-avl-trees',
    '#avl-lab',
    'insert',
    { values: '30,10', value: '20' },
    null,
  ],
  [
    'rb-recolor',
    '15-red-black-trees',
    '#red-black-lab',
    'insert',
    { values: '20,10,30', value: '5' },
    'rb.fix.uncle-black',
  ],
  [
    'btree-promote',
    '16-b-trees',
    '#btree-lab',
    'insert',
    { values: '10,20,30', value: '40' },
    'bt.split.promote',
  ],
  [
    'bplus-promote',
    '16-b-trees',
    '#bplus-lab',
    'insert',
    { values: '10,20,30', value: '40' },
    'bp.split.promote',
  ],
  [
    'bplus-range',
    '16-b-trees',
    '#bplus-lab',
    'range',
    { values: '5,10,20,25,30,40,50,60', value: '15', high: '50' },
    null,
  ],
  [
    'trie-unmark',
    '17-tries',
    '#trie-lab',
    'erase',
    { word: 'car' },
    'trie.erase.unmark',
  ],
  [
    'skewed-search',
    '11-binary-search-trees',
    '#bst',
    'search',
    {
      preset: 'custom',
      values: Array.from({ length: 15 }, (_, i) => i + 1).join(','),
      value: '15',
    },
    'search.equal',
    15,
  ],
];
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    '/opt/google/chrome/chrome',
});
mkdirSync('tests/visual/trees', { recursive: true });
for (const [name, width, height] of [
  ['desktop', 1440, 1000],
  ['mobile', 390, 844],
]) {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: name === 'mobile',
    hasTouch: name === 'mobile',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  for (const [
    label,
    slug,
    selector,
    op,
    inputs,
    source,
    occurrences = 1,
  ] of cases) {
    await page.goto(
      `${process.env.BOOK_BASE_URL || 'http://127.0.0.1:4337'}/chapters/${slug}/`,
    );
    const lab = page.locator(selector);
    await page.waitForFunction(
      (selector) =>
        document.querySelector(selector)?.getAttribute('data-step') === '0',
      selector,
    );
    for (const [field, value] of Object.entries(inputs)) {
      const input = lab.locator(`[name="${field}"]`);
      if (field === 'preset') await input.selectOption(value);
      else await input.fill(value);
    }
    await lab.locator(`[data-operation="${op}"]`).click();
    if (source)
      for (let i = 0; i < occurrences; i++)
        await lab
          .locator(`[data-code-region]:not([hidden]) [data-jump="${source}"]`)
          .click();
    else await lab.locator('[data-phase="after"]').click();
    await page.addStyleTag({
      content:
        '.topbar,.skip-link{visibility:hidden}.playback-controls{position:static}',
    });
    await lab
      .locator('.lab-workspace')
      .screenshot({ path: `tests/visual/trees/state-${label}-${name}.png` });
  }
  await context.close();
}
await browser.close();
console.log('Intermediate tree states captured at desktop and mobile widths.');
