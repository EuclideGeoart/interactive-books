import { expect, test } from '@playwright/test';
import { axe, dragHandle, entry, exercises, metrics, open, replayWorked, scanStage, segment, state, touchDrag, worldToSvg } from './calculus-helpers';

test.describe('III.1: limits', () => {
  const slug = 'limits', kind = 'limits';
  test('canonical hole: value undefined, limit 2; numeric, keyboard, rejection and reset', async ({ page }) => {
    const s = await open(page, slug, kind), initial = await state(s);
    expect(await metrics(s)).toMatchObject({ limit: 2, fa: null, kind: 'removable' });
    await expect(s.locator('[data-quantity="fa"]')).toHaveAttribute('data-status', 'undefined');
    await expect(s.locator('[data-quantity="limit"]')).toContainText('2');
    await s.locator('[data-param="x"] input').press('ArrowDown'); expect((await state(s)).x).toBe(1.45);
    await expect(s.locator('[data-announcement]')).not.toBeEmpty();
    await entry(s, 'x', '1'); expect((await metrics(s)).fx).toBeNull();
    for (const v of ['4', '0.125', 'x']) { const i = await entry(s, 'x', v); await expect(i).toHaveAttribute('aria-invalid', 'true'); expect((await state(s)).x).toBe(1); }
    await s.locator('[data-param="x"] input').press('Escape'); await s.locator('[data-action="reset"]').click(); expect(await state(s)).toEqual(initial);
  });
  test('dragging the sample along the graph; drawn limit line and samples equal the model', async ({ page }) => {
    const s = await open(page, slug, kind), plot = s.locator('[data-scene="graph"]');
    const h = await dragHandle(page, plot, 0, { x: 0.5, y: 0 }); expect((await state(s)).x).toBe(0.5);
    await expect(h).toHaveAttribute('data-world-y', '1.5');
    await h.press('ArrowRight'); expect((await state(s)).x).toBe(0.55);
    const line = await segment(plot, 'line-limit'), expected = await worldToSvg(plot, { x: -3, y: 2 });
    expect(Math.abs(line.from.y - expected.y)).toBeLessThan(0.01);
    const dot = plot.locator('circle[data-part="trace-right-2"]'), at = await worldToSvg(plot, { x: 1.25, y: 2.25 });
    expect(Math.abs(Number(await dot.getAttribute('cx')) - at.x)).toBeLessThan(0.01); expect(Math.abs(Number(await dot.getAttribute('cy')) - at.y)).toBeLessThan(0.01);
  });
  test('touch drag commits once on release', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch emulation runs on mobile');
    const s = await open(page, slug, kind); await touchDrag(page, s.locator('[data-scene="graph"]'), 0, { x: 2, y: 0 }, s.locator('[data-announcement]'));
    expect((await state(s)).x).toBe(2);
  });
  test('value versus limit, jump, unbounded and oscillating behaviour', async ({ page }) => {
    const s = await open(page, slug, kind);
    await s.locator('[data-preset="moved"]').click(); expect(await metrics(s)).toMatchObject({ fa: 3, limit: 2 });
    await s.locator('[data-preset="jump"]').click(); await expect(s).toHaveAttribute('data-status', 'jump'); await expect(s.locator('[data-quantity="limit"]')).toHaveAttribute('data-status', 'undefined');
    await s.locator('[data-preset="recip"]').click(); await expect(s.locator('[data-quantity="left"]')).toContainText('−∞'); await expect(s.locator('[data-quantity="right"]')).toContainText('+∞');
    await s.locator('[data-preset="oscillation"]').click(); await expect(s).toHaveAttribute('data-status', 'oscillation'); await expect(s.locator('[data-verdict]')).toContainText('not evidence');
    await s.locator('[data-preset="squeeze"]').click(); expect((await metrics(s)).limit).toBe(0);
    await expect(s.locator('.calc-table tbody tr')).toHaveCount(8);
  });
  test('worked replay', async ({ page }) => { await open(page, slug, kind); const w = await replayWorked(page, kind); await expect(w.locator('[data-trace-count]')).toContainText('of 7'); });
  test('five graded exercises', async ({ page }) => { await open(page, slug, kind); await exercises(page, { 'iii1-hole': ['4'], 'iii1-sides': ['-1', '1'] }, 'iii1-'); });
  for (const theme of ['light', 'dark'] as const) test.describe(theme, () => {
    test.use({ colorScheme: theme });
    test('exceptional and invalid states remain accessible', async ({ page }) => {
      const s = await open(page, slug, kind); await s.locator('[data-preset="recip"]').click(); await axe(page); await entry(s, 'a', '9'); await scanStage(page);
    });
  });
});

test.describe('III.2: continuity', () => {
  const slug = 'continuity', kind = 'continuity';
  test('joining the pieces with c, the three conditions and reset', async ({ page }) => {
    const s = await open(page, slug, kind), initial = await state(s);
    await expect(s).toHaveAttribute('data-status', 'jump');
    await s.locator('[data-param="c"] input').press('ArrowUp'); await s.locator('[data-param="c"] input').press('ArrowUp');
    await s.locator('[data-param="c"] input').press('ArrowUp'); await s.locator('[data-param="c"] input').press('ArrowUp');
    expect((await state(s)).c).toBe(1); await expect(s).toHaveAttribute('data-status', 'continuous');
    for (const id of ['c1', 'c2', 'c3']) await expect(s.locator(`[data-quantity="${id}"]`)).toContainText('yes');
    const i = await entry(s, 'm', '7'); await expect(i).toHaveAttribute('aria-invalid', 'true');
    await s.locator('[data-param="m"] input').press('Escape'); await s.locator('[data-action="reset"]').click(); expect(await state(s)).toEqual(initial);
  });
  test('value mode, custom value drag and the point a', async ({ page }) => {
    const s = await open(page, slug, kind);
    await s.locator('[data-preset="removable"]').click(); await expect(s).toHaveAttribute('data-status', 'removable');
    await expect(s.locator('[data-quantity="c3"]')).toContainText('no');
    const plot = s.locator('[data-scene="graph"]');
    await dragHandle(page, plot, 0, { x: 1, y: 2 }); expect((await state(s)).v).toBe(2); await expect(s).toHaveAttribute('data-status', 'continuous');
    await s.getByRole('radio', { name: 'none', exact: true }).check(); expect((await state(s)).mode).toBe('none'); await expect(s).toHaveAttribute('data-status', 'removable-missing');
    const a = plot.locator('[data-handle]').last(); await a.press('ArrowLeft'); expect((await state(s)).a).toBe(0.75); await expect(s).toHaveAttribute('data-status', 'continuous');
  });
  test('infinite discontinuity, endpoint and local versus global', async ({ page }) => {
    const s = await open(page, slug, kind);
    await s.locator('[data-preset="pole"]').click(); await expect(s).toHaveAttribute('data-status', 'infinite');
    await s.locator('[data-preset="endpoint"]').click(); await expect(s).toHaveAttribute('data-status', 'right-continuous');
    await s.locator('[data-preset="local"]').click(); await expect(s).toHaveAttribute('data-status', 'continuous'); await expect(s.locator('[data-quantity="global"]')).toContainText('at 1');
  });
  test('worked replay', async ({ page }) => { await open(page, slug, kind); const w = await replayWorked(page, kind); await expect(w.locator('[data-trace-count]')).toContainText('of 3'); });
  test('five graded exercises', async ({ page }) => { await open(page, slug, kind); await exercises(page, { 'iii2-join': ['2'], 'iii2-repair': ['6'] }, 'iii2-'); });
  for (const theme of ['light', 'dark'] as const) test.describe(theme, () => {
    test.use({ colorScheme: theme });
    test('exceptional and invalid states remain accessible', async ({ page }) => {
      const s = await open(page, slug, kind); await s.locator('[data-preset="removable"]').click(); await axe(page); await entry(s, 'c', '9'); await scanStage(page);
    });
  });
});
