import { test, expect, type Locator } from '@playwright/test';
import { chapters } from '../../src/content/book';

const diagrams = 'svg.tree-diagram,svg.graph-diagram,svg.heap-diagram,svg.technique-tree-svg';
const affected = chapters.filter(c => {
  const n = Number(c.number);
  return (n >= 9 && n <= 17) || (n >= 24 && n <= 36) || [43, 45, 46, 47, 49].includes(n);
});

async function fits(canvas: Locator) {
  await expect(canvas).toHaveAttribute('data-diagram-scale', 'fit');
  expect(await canvas.evaluate((element, selector) => {
    const svg = element.querySelector<SVGSVGElement>(selector)!;
    const box = svg.getBoundingClientRect(), matrix = svg.getScreenCTM()!;
    const view = svg.viewBox.baseVal;
    const start = new DOMPoint(view.x, view.y).matrixTransform(matrix);
    const end = new DOMPoint(view.x + view.width, view.y + view.height).matrixTransform(matrix);
    const viewport = svg.parentElement!;
    return element.scrollWidth <= element.clientWidth + 1
      && element.scrollHeight <= element.clientHeight + 1
      && viewport.scrollWidth <= viewport.clientWidth + 1
      && viewport.scrollHeight <= viewport.clientHeight + 1
      && start.x >= box.left - 1 && start.y >= box.top - 1
      && end.x <= box.right + 1 && end.y <= box.bottom + 1;
  }, diagrams)).toBe(true);
}

for (const chapter of affected) {
  test(`${chapter.number}: complete diagrams fit both axes in both views`, async ({ page }, info) => {
    await page.goto(`/chapters/${chapter.slug}/`);
    const lab = page.locator('[data-chapter-lab]').first();
    await expect(lab).toHaveAttribute('data-step', '0');
    for (const canvas of await page.locator('[data-svg]').all()) {
      if (await canvas.locator(diagrams).count()) await fits(canvas);
    }
    const scrubber = lab.locator('[data-scrubber]');
    await scrubber.fill(String(Math.max(1, Math.floor(Number(await scrubber.getAttribute('max')) / 2))));
    const canvas = lab.locator('[data-svg]');
    for (const view of ['logical', 'memory']) {
      await lab.locator(`[data-view="${view}"]`).click();
      await fits(canvas);
      const node = canvas.locator('[data-node]').first();
      await node.focus();
      await node.press('Enter');
      await expect(node).toBeFocused();
      await fits(canvas);
    }
    const before = await canvas.locator('[data-node]').evaluateAll(nodes => nodes.map(node => node.outerHTML));
    const routes = await canvas.locator('svg path').evaluateAll(paths => paths.map(path => path.getAttribute('d')));
    const state = await lab.locator('[data-ascii]').textContent();
    await lab.locator('[data-diagram-size="actual"]').focus();
    await lab.locator('[data-diagram-size="actual"]').press('Enter');
    await expect(canvas).toHaveAttribute('data-diagram-scale', 'actual');
    expect(await canvas.locator('[data-node]').evaluateAll(nodes => nodes.map(node => node.outerHTML))).toEqual(before);
    expect(await canvas.locator('svg path').evaluateAll(paths => paths.map(path => path.getAttribute('d')))).toEqual(routes);
    await expect(lab.locator('[data-ascii]')).toHaveText(state!);
    await lab.locator('[data-action="next"]').click();
    await expect(canvas).toHaveAttribute('data-diagram-scale', 'actual');
    const fitButton = lab.locator('[data-diagram-size="fit"]');
    if (info.project.name === 'mobile') await fitButton.tap();
    else { await fitButton.focus(); await fitButton.press('Space'); }
    await fits(canvas);
    if (chapter.number === '43') {
      await lab.locator('[data-phase="after"]').click();
      await fits(canvas);
      await expect(lab.locator('[data-diagram-size="fit"]')).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}

test('dense Fibonacci tree fits completely and can return to readable actual size', async ({ page }, info) => {
  await page.goto('/chapters/49-dynamic-programming/');
  const lab = page.locator('[data-chapter-lab]');
  await lab.locator('[name="n"]').fill('6');
  await lab.locator('button[type="submit"]').click();
  await lab.locator('[data-action="next"]').click();
  const canvas = lab.locator('[data-svg]');
  await fits(canvas);
  const tree = lab.locator('.technique-tree');
  await page.addStyleTag({ content: '.topbar,.skip-link{visibility:hidden}.playback-controls{position:static}' });
  await tree.screenshot({ path: info.outputPath('fibonacci-fit.png') });
  await lab.locator('[data-diagram-size="actual"]').click();
  expect(await lab.locator('.technique-tree-scroll').evaluate(e => e.scrollWidth > e.clientWidth && e.scrollHeight > e.clientHeight)).toBe(true);
  await lab.locator('[data-diagram-size="fit"]').click();
  await fits(canvas);
  await lab.locator('[data-phase="after"]').click();
  await expect(canvas.locator('[data-node]')).toHaveCount(7);
  await fits(canvas);
});
