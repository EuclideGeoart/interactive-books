import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { chapters } from '../../src/content/book';

// Part VII has call/table scenes rather than an initially allocated SVG object.
// Its corresponding playback and inspection coverage lives in techniques.spec.ts.
for (const chapter of chapters.filter(chapter => Number(chapter.number) >= 2 && Number(chapter.number) < 45)) {
  test(`${chapter.number}: shared playback, code, inspection, themes and responsive accessibility`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/chapters/${chapter.slug}/`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const lab = page.locator('[data-chapter-lab]').first();
    await expect(lab).toHaveAttribute('data-step', '0');
    await expect(lab.locator('[data-svg] svg')).toBeVisible();
    const before = await lab.locator('[data-svg]').innerHTML();
    await lab.locator('[data-action="next"]').click();
    await expect(lab).toHaveAttribute('data-step', '1');
    await expect(lab.locator('[data-code-region]:not([hidden]) .executing')).toHaveCount(1);
    await expect(lab.locator('[data-mobile-code]')).toHaveText((await lab.locator('[data-code-region]:not([hidden]) .executing code').textContent())!.trim());
    await lab.locator('[data-action="previous"]').click();
    await expect(lab.locator('[data-svg]')).toHaveJSProperty('innerHTML', before);
    await lab.locator('[data-phase="after"]').click();
    await expect(lab.locator('[data-invariant-summary]')).not.toContainText('broken');
    await lab.locator('[data-action="reset"]').click();
    await expect(lab).toHaveAttribute('data-step', '0');
    await lab.locator('[data-view="memory"]').click();
    const node = lab.locator('[data-node]').first();
    await node.focus();
    await node.press('Enter');
    await expect(lab.locator('[data-inspector-shell]')).toHaveAttribute('open', '');
    await expect(lab.locator('[data-inspector]')).not.toBeEmpty();
    await lab.locator('[data-view="logical"]').click();
    // Freeze the timer while clicking Pause: a one-step trace can otherwise
    // finish between clicks, turning the second click into a new Play action.
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await lab.locator('[data-speed]').selectOption('4');
    await lab.locator('[data-action="play"]').click();
    await expect(lab.locator('[data-action="play"]')).toContainText('Pause');
    await lab.locator('[data-action="play"]').click();
    await expect(lab.locator('[data-action="play"]')).toContainText('Play');
    const stopped = await lab.getAttribute('data-step');
    await page.clock.runFor(350);
    await expect(lab).toHaveAttribute('data-step', stopped!);
    await lab.locator('[data-action="play"]').click();
    await page.clock.runFor(275);
    await expect(lab).toHaveAttribute('data-step', '1');
    await lab.locator('[data-action="reset"]').click();
    await page.clock.resume();
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') await page.getByRole('button', { name: 'Switch to dark theme' }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(result.violations).toEqual([]);
    }
    if (info.project.name === 'mobile') {
      await lab.locator('[data-svg]').scrollIntoViewIfNeeded();
      const dock = await lab.locator('.playback-controls').boundingBox();
      expect(dock!.y).toBeGreaterThanOrEqual(0);
      expect(dock!.y + dock!.height).toBeLessThanOrEqual(845);
    }
    expect(errors).toEqual([]);
  });

  test(`${chapter.number}: all operation controls start an inspectable experiment`, async ({ page }) => {
    await page.goto(`/chapters/${chapter.slug}/`);
    const lab = page.locator('[data-chapter-lab]').first();
    await expect(lab).toHaveAttribute('data-step', '0');
    const ids = await lab.locator('[data-operation]').evaluateAll(elements => elements.map(el => el.getAttribute('data-operation')!));
    for (const id of ids) {
      await lab.locator(`button[data-operation="${id}"]`).click();
      await expect(lab).toHaveAttribute('data-operation', id);
      await expect(lab.locator('[data-input-error]')).toBeHidden();
      await expect(lab.locator('[data-code-region]:not([hidden])')).not.toHaveCount(0);
      await lab.locator('[data-phase="after"]').click();
      await expect(lab.locator('[data-ascii]')).not.toBeEmpty();
      await lab.locator('[data-action="reset"]').click();
    }
  });
}

test('available chapters have independent reading progress and cross-book search', async ({ page }) => {
  await page.goto('/chapters/02-stack/');
  await page.getByRole('button', { name: 'Mark chapter complete' }).click();
  await page.goto('/chapters/03-doubly-linked-list/');
  await expect(page.getByRole('button', { name: 'Mark chapter complete' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Search the book', exact: true }).click();
  await page.getByRole('searchbox').fill('placement');
  const pool = page.locator('[data-search-results] a[href*="04-memory-pool"]').first();
  await expect(pool).toBeVisible();
  await pool.click();
  await expect(page).toHaveURL(/04-memory-pool/);
  await page.goto('/chapters/02-stack/');
  await expect(page.getByRole('button', { name: 'Chapter complete' })).toHaveAttribute('aria-pressed', 'true');
});

test('chapter navigation and all canonical sources are available', async ({ page, request }) => {
  for (const [number, fileName] of [['02', 'Stack.hpp'], ['03', 'DoublyLinkedList.hpp'], ['04', 'Pool.hpp'], ['05', 'IntrusiveList.hpp']]) {
    const header = await request.get(`/source/chapter-${number}/${fileName}`);
    expect(header.ok()).toBe(true);
    expect(await header.text()).not.toContain('@trace');
    const example = await request.get(`/source/chapter-${number}/main.cpp`);
    expect(await example.text()).toContain(`#include "${fileName}"`);
    expect((await request.get(`/source/chapter-${number}/parity.cpp`)).status()).toBe(404);
  }
  await page.goto('/chapters/01-singly-linked-list/');
  await page.getByRole('navigation', { name: 'Adjacent chapters' }).getByRole('link', { name: '02 / Stack' }).click();
  await expect(page).toHaveURL(/02-stack/);
});
