import { expect, test } from '@playwright/test';
import { dragHandleTo, openStage, rowLines } from './helpers';

const PART_SIZES = [7, 19, 14, 16, 10, 10, 8, 10]; // master plan §4

test.describe('the map of the book (contents page)', () => {
  test('eight Parts, 94 chapters, every one planned and none a link', async ({ page }) => {
    await page.goto('contents/');
    const parts = page.locator('main .part');
    await expect(parts).toHaveCount(8);
    for (const [i, size] of PART_SIZES.entries()) await expect(parts.nth(i).locator('.chapter-item')).toHaveCount(size);
    await expect(page.locator('main .chapter-item')).toHaveCount(94);
    await expect(page.locator('main .chapter-item[data-status="planned"]')).toHaveCount(94);
    await expect(page.locator('main .chapter-item a')).toHaveCount(0); // planned content is never a dead link
    const i3 = page.locator('main [data-chapter-id="I.3"]');
    await expect(i3).toContainText('Vectors: components, magnitude, and direction');
    await expect(i3).toContainText('reference chapter');
    await expect(i3).toContainText('planned');
    await expect(page.locator('main [data-chapter-id="VI.4"]')).toContainText('flagship chapter');
  });
  test('direct access to a Part anchor lands on that Part', async ({ page }) => {
    await page.goto('contents/#part-vii');
    const heading = page.locator('#part-vii-title');
    await expect(heading).toHaveText('Information Theory');
    await expect(heading).toBeInViewport();
  });
});

test.describe('the Part ruler and landing page', () => {
  test('Part cards on the landing page lead to their Part on the contents page', async ({ page }) => {
    await page.goto('./');
    await page.locator('.part-card', { hasText: 'Linear Algebra' }).click();
    await expect(page).toHaveURL(/contents\/#part-ii$/);
    await expect(page.locator('#part-ii-title')).toBeInViewport();
  });
  test('the landing page shows eight Parts, with computed emblems', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.part-card')).toHaveCount(8);
    await expect(page.locator('.part-card svg.emblem')).toHaveCount(8);
    for (const emblem of await page.locator('.part-card svg.emblem').all()) expect(await emblem.locator('path, circle').count()).toBeGreaterThan(1);
  });
  test('the Part ruler lists I–VIII with accessible names (shown from 800px)', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 800, 'the ruler is shown from 800px');
    await page.goto('foundation/');
    const links = page.getByRole('navigation', { name: 'Parts of the book' }).getByRole('link');
    await expect(links).toHaveCount(8);
    await expect(links.nth(0)).toHaveAttribute('aria-label', 'Part I: Mathematical Language');
    await expect(links.nth(7)).toHaveAttribute('aria-label', 'Part VIII: Numerical Computing');
    await expect(page.locator('.part-ruler [aria-current]')).toHaveCount(0); // the demo belongs to no Part
    await links.nth(1).click();
    await expect(page).toHaveURL(/contents\/#part-ii$/);
  });
  test('the hero stage on the landing page is live: dragging updates its values', async ({ page }) => {
    const stage = await openStage(page, './');
    await dragHandleTo(page, stage, -2, 4);
    expect(await rowLines(stage, 'vector')).toEqual(['= (−2, 4)']);
    expect(await rowLines(stage, 'magnitude')).toEqual(['= 2√5', '≈ 4.472136…']);
  });
});

test.describe('the book-map dialog', () => {
  test('opens from the top bar, filters structurally, closes with Escape and returns focus', async ({ page }) => {
    await page.goto('foundation/');
    const opener = page.getByRole('button', { name: 'Contents' });
    await opener.click();
    const dialog = page.getByRole('dialog', { name: 'The map of the book' });
    await expect(dialog).toBeVisible();
    // keyboard users on a fine pointer land in the filter; touch users on the close button (no on-screen keyboard)
    const fine = await page.evaluate(() => matchMedia('(pointer: fine)').matches);
    await expect(fine ? dialog.getByRole('searchbox') : dialog.getByRole('button', { name: 'Close the map' })).toBeFocused();
    await dialog.getByRole('searchbox').fill('softmax');
    await expect(dialog.locator('.chapter-item:not([hidden])')).toHaveCount(2); // VII.6 and VII.7
    await expect(dialog.locator('.part:not([hidden])')).toHaveCount(1);
    await expect(dialog.locator('[data-map-count]')).toHaveText('2 matching chapters');
    await dialog.getByRole('searchbox').fill('zzzz');
    await expect(dialog.locator('.chapter-item:not([hidden])')).toHaveCount(0);
    await dialog.getByRole('searchbox').fill('');
    await expect(dialog.locator('.chapter-item:not([hidden])')).toHaveCount(94);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });
  test('lists planned chapters as text (no links) and offers the demo as a clearly labelled non-chapter', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Contents' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('.chapter-item a')).toHaveCount(0);
    const demo = dialog.getByRole('link', { name: /Foundation demo/ });
    await expect(demo).toContainText('platform check, not a chapter');
    await demo.click();
    await expect(page).toHaveURL(/foundation\/$/);
    await expect(page.locator('.label-chip.is-demo')).toContainText('Foundation demo');
  });
  test('the close button closes it', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Contents' }).click();
    await page.getByRole('button', { name: 'Close the map' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});

test.describe('theme', () => {
  test('toggles, persists across reloads, and changes the actual colours', async ({ page }) => {
    await page.goto('foundation/');
    const toggle = page.getByRole('button', { name: 'Dark theme' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    const light = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const dark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(dark).not.toBe(light);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('button', { name: 'Dark theme' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Dark theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
  test('with no stored choice the page follows the system preference — even before scripts run', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark', javaScriptEnabled: false, baseURL });
    const p = await ctx.newPage();
    await p.goto('./');
    const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(14, 18, 20)'); // --paper in dark: #0e1214
    await ctx.close();
  });
});

test.describe('chapter shell', () => {
  test('the foundation demo is labelled as a demo, not a chapter, and I.3 is only offered as "planned"', async ({ page }) => {
    await page.goto('foundation/');
    await expect(page.locator('.label-chip.is-demo')).toContainText('Foundation demo');
    await expect(page.getByText('This is a foundation demo, not Chapter I.3')).toBeVisible();
    const pager = page.getByRole('navigation', { name: 'Neighbouring chapters' });
    await expect(pager.locator('a')).toHaveCount(1);
    await expect(pager.locator('.is-planned')).toContainText('I.3 · Vectors: components, magnitude, and direction');
    await expect(pager.locator('.is-planned')).toContainText('planned');
    await pager.getByRole('link').click();
    await expect(page).toHaveURL(/contents\/$/);
  });
  test('the in-chapter outline is built from the headings (wide screens)', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1180, 'the margin outline appears from 1180px');
    await page.goto('foundation/');
    const links = page.getByRole('navigation', { name: 'In this chapter' }).getByRole('link');
    await expect(links).toHaveText(['What this page checks', 'Conventions in force', 'Mathematical typography', 'Exact and approximate', 'Code that is known to run']);
    await links.nth(3).click();
    await expect(page.locator('#exact-and-approximate')).toBeInViewport();
    await expect(links.nth(3)).toHaveAttribute('aria-current', 'location');
  });
  test('wide equations and tables scroll inside their own region and become keyboard-reachable only when they overflow', async ({ page }) => {
    await page.goto('foundation/');
    await page.evaluate(() => document.fonts.ready);
    // prose equations only: the stage's live formulas are scrolled by their own .math-scroll wrapper (checked in a11y.spec)
    const displays = page.locator('main .chapter-body > .katex-display, main .chapter-body > * > .katex-display').filter({ hasNot: page.locator('.math-scroll') });
    const n = await displays.count();
    let focusable = 0;
    for (let i = 0; i < n; i++) {
      const d = displays.nth(i);
      const { overflow, tab } = await d.evaluate(el => ({ overflow: el.scrollWidth > el.clientWidth + 1, tab: el.getAttribute('tabindex') }));
      expect(tab === '0', `display equation ${i}: a tab stop iff overflowing`).toBe(overflow);
      if (overflow) { focusable++; await expect(d).toHaveAttribute('aria-label', /^Equation( \d+)?, scrollable$/); } else expect(tab).toBe('-1');
    }
    const narrow = (page.viewportSize()?.width ?? 1440) < 700;
    if (narrow) expect(focusable).toBeGreaterThan(0); // the long softmax equation must overflow on a phone
  });
});
