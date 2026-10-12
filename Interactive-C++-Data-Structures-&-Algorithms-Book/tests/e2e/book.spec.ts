import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const chapter = '/chapters/01-singly-linked-list/';
test.beforeEach(async ({ page }) => {
  await page.goto(chapter);
  await expect(page.locator('[data-lab]')).toHaveAttribute('data-step', '0');
});

test('book navigation, search, persistent theme and progress', async ({ page }, info) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Singlylinked list.');
  await expect(page.locator('[data-section]')).toHaveCount(13);
  await page.getByRole('button', { name: 'Search the book', exact: true }).click();
  await page.getByRole('searchbox').fill('dangling');
  await expect(page.locator('[data-search-results] a').first()).toBeVisible();
  await page.locator('[data-search-results] a').first().click();
  await expect(page.locator('[data-search-dialog]')).not.toBeVisible();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Mark chapter complete' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Chapter complete' })).toHaveAttribute('aria-pressed', 'true');
  const opener = page.getByRole('button', { name: 'Chapters in this Part', exact: true });
  await opener.click();
  const navigation = page.locator('[data-mobile-nav]');
  await expect(navigation).toBeVisible();
  await expect(navigation.locator('[aria-current="page"]')).toHaveAttribute('href', chapter);
  if (info.project.name === 'mobile') {
    await navigation.getByRole('link', { name: 'Interactive operations', exact: true }).click();
    await expect(navigation).not.toBeVisible();
  } else {
    await page.keyboard.press('Escape');
    await expect(navigation).not.toBeVisible();
    await expect(opener).toBeFocused();
  }
});

test('Escape closes search with a populated query and restores focus', async ({ page }) => {
  const opener=page.getByRole('button', { name: 'Search the book', exact: true });
  await opener.click();
  await page.getByRole('searchbox').fill('publication');
  await expect(page.locator('[data-search-results] a').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-search-dialog]')).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test('head insertion preserves old head until publication and supports exact reverse', async ({ page }) => {
  const lab = page.locator('[data-lab]');
  await lab.locator('[data-jump="head.link"]').click();
  await expect(lab.locator('[data-event]')).toHaveText('AssignPointer');
  await expect(lab.locator('[data-source="head.link"]')).toHaveClass(/executing/);
  await expect(lab.locator('.reference-entry').filter({ hasText: /^head/ })).toContainText('0xA120');
  await expect(lab.locator('[data-from="0xE240"][data-target="0xA120"]')).toHaveCount(1);
  await expect(lab.locator('[data-invariant-summary]')).toContainText('temporary');
  const before = await lab.locator('[data-svg]').innerHTML();
  await lab.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(lab.locator('[data-source="head.publish"]')).toHaveClass(/executing/);
  await expect(lab.locator('.reference-entry').filter({ hasText: /^head/ })).toContainText('0xE240');
  await lab.getByRole('button', { name: 'Previous step' }).click();
  expect(await lab.locator('[data-svg]').innerHTML()).toBe(before);
  await lab.getByRole('button', { name: 'After', exact: true }).click();
  await expect(lab.locator('[data-ascii]')).toHaveText('head → [5] → [10] → [20] → [30] → nullptr');
  await expect(lab.locator('[data-invariant-summary]')).toHaveText('✓ All invariants valid');
  await lab.getByRole('button', { name: 'Reset operation' }).click();
  await expect(lab.locator('[data-node]')).toHaveCount(3);
  await expect(lab.getByRole('button', { name: 'Previous step' })).toBeDisabled();
});

test('all six operations work on standard, single-node, empty and duplicate lists', async ({ page }) => {
  const lab = page.locator('[data-lab]');
  const expected: Record<string, Record<string, string>> = {
    standard: { 'insert-head': '[5] → [10] → [20] → [30]', 'insert-tail': '[10] → [20] → [30] → [5]', 'insert-after': '[10] → [20] → [5] → [30]', delete: '[10] → [30]', search: '[10] → [20] → [30]', clear: 'head → nullptr' },
    single: { 'insert-head': '[5] → [10]', 'insert-tail': '[10] → [5]', 'insert-after': '[10]', delete: '[10]', search: '[10]', clear: 'head → nullptr' },
    empty: { 'insert-head': '[5]', 'insert-tail': '[5]', 'insert-after': 'head → nullptr', delete: 'head → nullptr', search: 'head → nullptr', clear: 'head → nullptr' },
    duplicates: { 'insert-head': '[5] → [10] → [10] → [20]', 'insert-tail': '[10] → [10] → [20] → [5]', 'insert-after': '[10] → [10] → [20] → [5]', delete: '[10] → [10]', search: '[10] → [10] → [20]', clear: 'head → nullptr' },
  };
  for (const [preset, cases] of Object.entries(expected)) {
    await lab.locator('[name="preset"]').selectOption(preset);
    for (const [operation, values] of Object.entries(cases)) {
      await lab.locator(`button[data-operation="${operation}"]`).click();
      await lab.getByRole('button', { name: 'After', exact: true }).click();
      await expect(lab.locator('[data-ascii]')).toContainText(values);
      await expect(lab.locator('[data-invariant-summary]')).toHaveText('✓ All invariants valid');
      await expect(lab.locator('[data-step-title]')).toHaveText('Operation complete');
    }
  }
});

test('head, middle and tail deletion expose ended lifetime without stale fields', async ({ page }) => {
  const lab = page.locator('[data-lab]');
  for (const [value, address] of [['10', '0xA120'], ['20', '0xD800'], ['30', '0xB470']]) {
    await lab.locator('button[data-operation="delete"]').click();
    await lab.locator('[name="value"]').fill(value!);
    await lab.getByRole('button', { name: 'Load operation' }).click();
    await lab.locator('[data-jump="delete.free"]').click();
    await expect(lab.locator('[data-event]')).toHaveText('Destroy');
    const node = lab.locator(`[data-node="${address}"]`);
    await node.click();
    await expect(node).toContainText('no valid fields');
    await expect(lab.locator('[data-inspector]')).toContainText('Object fields are unavailable');
    await expect(lab.locator('[data-inspector] .node-fields')).toHaveCount(0);
    await lab.getByRole('button', { name: 'Next step', exact: true }).click();
    await expect(lab.locator('[data-event]')).toHaveText('Free');
    await expect(lab.locator('.dangling')).toHaveCount(2);
    await lab.getByRole('button', { name: 'After', exact: true }).click();
    await expect(lab.locator('.dangling')).toHaveCount(0);
    await expect(lab.locator('[data-invariant-summary]')).toHaveText('✓ All invariants valid');
  }
});

test('pointer inspector, memory ordering and SVG keyboard operation', async ({ page }) => {
  const model = page.locator('[data-mental]');
  const first = model.locator('[data-node="0xA120"]');
  await first.focus();
  await page.keyboard.press('Enter');
  await expect(first).toBeFocused();
  await expect(model.locator('[data-inspector] h4')).toHaveText('Node 10');
  await model.locator('.node-fields [data-inspect="0xD800"]').click();
  await expect(model.locator('[data-inspector] h4')).toHaveText('Node 20');
  await expect(model.locator('[data-node="0xD800"]')).toBeFocused();
  await model.getByRole('button', { name: 'Memory view', exact: true }).click();
  const addresses = await model.locator('[data-node]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-node')));
  expect(addresses).toEqual(['0xA120', '0xB470', '0xD800']);
  await expect(model.locator('[data-from="0xA120"][data-target="0xD800"]')).toHaveCount(1);
  await model.locator('[data-from="0xA120"][data-target="0xD800"]').focus();
  await page.keyboard.press('Space');
  await expect(model.locator('[data-inspector] h4')).toHaveText('Node 20');
});

test('play, pause, speed, scrubber and replay stay synchronized', async ({ page }) => {
  const lab = page.locator('[data-lab]');
  await lab.locator('[data-speed]').selectOption('4');
  await lab.locator('[data-action="play"]').click();
  await expect(lab.locator('[data-action="play"]')).toContainText('Pause');
  await expect(lab).not.toHaveAttribute('data-step', '0');
  await lab.locator('[data-action="play"]').click();
  const paused = await lab.getAttribute('data-step');
  await page.waitForTimeout(400);
  await expect(lab).toHaveAttribute('data-step', paused!);
  await lab.getByRole('slider', { name: 'Execution step' }).fill('4');
  await expect(lab.locator('[data-source="head.link"]')).toHaveClass(/executing/);
  await lab.getByRole('button', { name: 'After', exact: true }).click();
  await expect(lab.locator('[data-action="play"]')).toContainText('Replay');
  await lab.locator('[data-action="play"]').click();
  await expect(lab.locator('[data-action="play"]')).toContainText('Pause');
  await lab.locator('button[data-operation="search"]').click();
  await expect(lab).toHaveAttribute('data-step', '0');
  await expect(lab.locator('[data-action="play"]')).toContainText('Play');
});

test('custom data, first match semantics, failed searches and visible input errors', async ({ page }) => {
  const lab = page.locator('[data-lab]');
  await lab.locator('[name="preset"]').selectOption('custom');
  await lab.locator('[name="custom"]').fill('-5, 10, 10');
  await lab.locator('button[data-operation="delete"]').click();
  await lab.locator('[name="value"]').fill('10');
  await lab.getByRole('button', { name: 'Load operation' }).click();
  await lab.getByRole('button', { name: 'After', exact: true }).click();
  await expect(lab.locator('[data-ascii]')).toHaveText('head → [-5] → [10] → nullptr');
  await lab.locator('button[data-operation="search"]').click();
  await lab.locator('[name="value"]').fill('99');
  await lab.getByRole('button', { name: 'Load operation' }).click();
  await lab.getByRole('button', { name: 'After', exact: true }).click();
  await expect(lab.locator('[data-step-explanation]')).toContainText('not found');
  await expect(lab.locator('[data-visits]')).toHaveText('3');
  await lab.locator('[name="custom"]').fill('1, nope, 3');
  await lab.getByRole('button', { name: 'Load operation' }).click();
  await expect(lab.locator('[data-input-error]')).toBeVisible();
  await expect(lab.locator('[data-input-error]')).toContainText('whole numbers');
});

test('Break-It detects each fault and restores valid state', async ({ page }) => {
  const lab = page.locator('[data-break]');
  for (const mode of ['lost', 'cycle', 'dangling']) {
    await lab.locator('[data-break-mode]').selectOption(mode);
    await lab.getByRole('button', { name: 'Run broken line' }).click();
    await expect(lab.locator('[data-break-status]')).toContainText('✕');
    await expect(lab.locator('.invariant-fail').first()).toBeVisible();
    if (mode === 'dangling') await expect(lab.locator('[data-node="0xA120"]')).toContainText('no valid fields');
    await lab.getByRole('button', { name: 'Restore valid list' }).click();
    await expect(lab.locator('[data-break-status]')).toContainText('valid');
    await expect(lab.locator('[data-svg] .freed')).toHaveCount(0);
  }
});

test('complexity changes measured visits and exercises reveal answers', async ({ page }) => {
  const explorer = page.locator('[data-complexity]');
  for (const size of ['8', '32', '128', '1024']) {
    await explorer.locator('[data-size]').selectOption(size);
    await expect(explorer.locator('[data-visited]')).toHaveText(size);
  }
  await explorer.locator('[data-position]').selectOption('first');
  await expect(explorer.locator('[data-visited]')).toHaveText('1');
  await explorer.locator('[data-position]').selectOption('missing');
  await expect(explorer.locator('[data-visited]')).toHaveText('1024');
  await page.locator('.exercise summary').first().click();
  await expect(page.locator('.exercise details').first()).toHaveAttribute('open', '');
});

test('no page overflow, no runtime errors, and usable light and dark accessibility', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test('canonical header and example are downloadable', async ({ page, request }) => {
  const header = await request.get('/source/SinglyLinkedList.hpp');
  expect(header.ok()).toBe(true);
  expect(await header.text()).toContain('class SinglyLinkedList');
  expect(await header.text()).not.toContain('@trace');
  const main = await request.get('/source/main.cpp');
  expect(await main.text()).toContain('#include "SinglyLinkedList.hpp"');
  await expect(page.getByRole('link', { name: 'Download .hpp' })).toHaveAttribute('download', '');
});

test('visual regression: chapter entry', async ({ page }) => {
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(150);
  await expect(page).toHaveScreenshot('chapter-overview.png', { animations: 'disabled', maxDiffPixelRatio: 0.005 });
});

test('visual regression: operation workspace', async ({ page }, info) => {
  await page.addStyleTag({ content: '.topbar,.skip-link{visibility:hidden} .playback-controls{position:static}' });
  await expect(page.locator('[data-lab]')).toHaveScreenshot('operation-lab.png', { animations: 'disabled', maxDiffPixelRatio: 0.005 });
  if (info.project.name === 'desktop') {
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    await expect(page.locator('[data-lab]')).toHaveScreenshot('operation-lab-dark.png', { animations: 'disabled', maxDiffPixelRatio: 0.005 });
  }
});

test('rejected input never changes the loaded operation or source panel', async ({ page }) => {
  const lab = page.locator('[data-lab]');
  await lab.locator('[name="preset"]').selectOption('custom');
  await lab.locator('[name="custom"]').fill('1, invalid');
  await lab.locator('button[data-operation="delete"]').click();
  await expect(lab.locator('[data-input-error]')).toBeVisible();
  await expect(lab).toHaveAttribute('data-operation', 'insert-head');
  await expect(lab.locator('[data-code-region="insert-head"]')).toBeVisible();
  await expect(lab.locator('button[data-operation="insert-head"]')).toHaveAttribute('aria-pressed', 'true');
});

test('mobile playback stays visible with the diagram and echoes the exact source line', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile');
  const lab = page.locator('[data-lab]');
  await lab.locator('[data-svg]').evaluate(element => scrollTo(0, element.getBoundingClientRect().top + scrollY - 85));
  const controls = await lab.locator('.playback-controls').boundingBox();
  expect(controls!.y).toBeGreaterThan(0);
  expect(controls!.y + controls!.height).toBeLessThanOrEqual(844);
  await lab.locator('[data-action="next"]').click();
  await expect(lab.locator('[data-mobile-code]')).toHaveText('Node* newNode = new Node{value, nullptr};');
});

test('pointer paths avoid unrelated objects in logical and memory layouts', async ({ page }) => {
  const lab = page.locator('[data-lab]');
  await lab.locator('[name="preset"]').selectOption('custom');
  await lab.locator('[name="custom"]').fill('10, 20, 30, 40, 50, 60');
  for (const mode of ['logical', 'memory']) {
    await lab.locator(`[data-view="${mode}"]`).click();
    for (const operation of ['insert-head', 'insert-tail', 'insert-after', 'delete']) {
      await lab.locator(`button[data-operation="${operation}"]`).click();
      await lab.getByRole('button', { name: 'After', exact: true }).click();
      const collisions = await lab.locator('[data-svg]').evaluate(root => {
        const collisions: string[] = [];
        const nodes = [...root.querySelectorAll<SVGGElement>('[data-node]')];
        for (const group of root.querySelectorAll<SVGGElement>('[data-from]')) {
          const path = group.querySelector<SVGPathElement>('.reference-arrow')!;
          const source = group.dataset.from, target = group.dataset.target;
          for (const node of nodes) {
            if ([source, target].includes(node.dataset.node)) continue;
            const box = node.querySelector<SVGRectElement>('rect')!.getBBox();
            for (let length = 0; length <= path.getTotalLength(); length += 3) {
              const point = path.getPointAtLength(length);
              if (point.x > box.x + 1 && point.x < box.x + box.width - 1 && point.y > box.y + 1 && point.y < box.y + box.height - 1) {
                collisions.push(`${source} → ${target} crosses ${node.dataset.node}`); break;
              }
            }
          }
        }
        return collisions;
      });
      expect(collisions).toEqual([]);
    }
  }
});
