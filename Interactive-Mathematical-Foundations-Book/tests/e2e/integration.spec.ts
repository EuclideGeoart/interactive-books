import { expect, test } from '@playwright/test';
import { axe, dragHandle, entry, exercises, metrics, open, replayWorked, scanStage, segment, state, touchDrag, worldToSvg } from './calculus-helpers';

test.describe('III.12: integrals as accumulation', () => {
  const slug = 'integrals-accumulation', kind = 'riemann';
  test('exact sums, n and rule controls, rejection and reset', async ({ page }) => {
    const s = await open(page, slug, kind), initial = await state(s);
    expect(await metrics(s)).toMatchObject({ sumExact: '0.703125', integralExact: '1.5625', area: 3.5625, panels: 10, status: 'signed' });
    await s.locator('[data-param="n"] input').press('ArrowUp'); expect((await state(s)).n).toBe(11); await expect(s.locator('polygon[data-part^="panel-"]')).toHaveCount(11);
    await s.getByRole('radio', { name: 'trapezoid' }).check(); expect((await state(s)).rule).toBe('trapezoid');
    await entry(s, 'n', '10'); expect((await metrics(s)).sumExact).toBe('1.640625');
    for (const v of ['0', '65', '2.5']) { const i = await entry(s, 'n', v); await expect(i).toHaveAttribute('aria-invalid', 'true'); expect((await state(s)).n).toBe(10); }
    await s.locator('[data-param="n"] input').press('Escape'); await s.locator('[data-action="reset"]').click(); expect(await state(s)).toEqual(initial);
  });
  test('dragging a limit redraws panels that equal the summed panels', async ({ page }) => {
    const s = await open(page, slug, kind), plot = s.locator('[data-scene="graph"]');
    await dragHandle(page, plot, 1, { x: 2, y: 0 }); expect((await state(s)).b).toBe(2);
    const first = (await plot.locator('polygon[data-part="panel-0"]').getAttribute('points'))!.split(' ').map(p => p.split(',').map(Number));
    const x0 = await worldToSvg(plot, { x: -2, y: 0 }), x1 = await worldToSvg(plot, { x: -1.6, y: 0 });
    expect(Math.abs(first[0]![0]! - x0.x)).toBeLessThan(0.01); expect(Math.abs(first[1]![0]! - x1.x)).toBeLessThan(0.01);
    await plot.locator('[data-handle]').first().press('ArrowRight'); expect((await state(s)).a).toBe(-1.75);
  });
  test('touch drag of a limit', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch emulation runs on mobile');
    const s = await open(page, slug, kind); await touchDrag(page, s.locator('[data-scene="graph"]'), 0, { x: 0, y: 0 }, s.locator('[data-announcement]')); expect((await state(s)).a).toBe(0);
  });
  test('signed versus geometric area, cancellation and reversed limits', async ({ page }) => {
    const s = await open(page, slug, kind);
    await s.locator('[data-preset="cancel"]').click(); expect(await metrics(s)).toMatchObject({ integral: 0, area: 1 });
    await s.locator('[data-preset="reversed"]').click(); await expect(s).toHaveAttribute('data-status', 'reversed'); expect((await metrics(s)).integralExact).toBe('−1.5625');
    await s.locator('[data-preset="positive"]').click(); await expect(s).toHaveAttribute('data-status', 'one-sign');
    await s.locator('[data-preset="sine"]').click(); await expect(s.locator('[data-quantity="sum"] .line').first()).toContainText('≈');
  });
  test('worked replay and exercises', async ({ page }) => {
    await open(page, slug, kind); await replayWorked(page, kind);
    await exercises(page, { 'iii12-left': ['1'], 'iii12-signed': ['3/2', '5/2'], 'iii12-reverse': ['-5'] }, 'iii12-');
  });
  for (const theme of ['light', 'dark'] as const) test.describe(theme, () => {
    test.use({ colorScheme: theme });
    test('exceptional and invalid states remain accessible', async ({ page }) => { const s = await open(page, slug, kind); await s.locator('[data-preset="reversed"]').click(); await axe(page); await entry(s, 'n', '99'); await scanStage(page); });
  });
});

test.describe('III.13: fundamental theorem', () => {
  const slug = 'fundamental-theorem', kind = 'accumulation';
  test('F, ΔF and F′ = f; edits and reset', async ({ page }) => {
    const s = await open(page, slug, kind), initial = await state(s);
    expect(await metrics(s)).toMatchObject({ FExact: '0.5625', f: -0.75, slope: -0.75, status: 'ftc' });
    await s.locator('[data-param="dx"] input').press('ArrowDown'); expect((await state(s)).dx).toBe(0.25);
    const i = await entry(s, 'x', '4'); await expect(i).toHaveAttribute('aria-invalid', 'true');
    await s.locator('[data-param="x"] input').press('Escape'); await s.locator('[data-action="reset"]').click(); expect(await state(s)).toEqual(initial);
  });
  test('dragging x along f moves the F point and its tangent slope to f(x)', async ({ page }) => {
    const s = await open(page, slug, kind), fp = s.locator('[data-scene="integrand"]'), Fp = s.locator('[data-scene="accumulated"]');
    await dragHandle(page, fp, 1, { x: 2, y: 0 }); expect((await state(s)).x).toBe(2); expect(await metrics(s)).toMatchObject({ FExact: '0', slope: 0 });
    const m = await metrics(s), dot = Fp.locator('circle[data-part="F-point"]'), at = await worldToSvg(Fp, { x: 2, y: m.F });
    expect(Math.abs(Number(await dot.getAttribute('cy')) - at.y)).toBeLessThan(0.01);
    await dragHandle(page, fp, 0, { x: 0, y: 0 }); expect((await state(s)).a).toBe(0); expect((await metrics(s)).slope).toBe(0);
    const t = await segment(Fp, 'tangent'); expect(Math.abs(t.to.y - t.from.y)).toBeLessThan(0.01);
  });
  test('a jump in f gives a corner in F', async ({ page }) => {
    const s = await open(page, slug, kind); await s.locator('[data-preset="jump"]').click();
    await expect(s).toHaveAttribute('data-status', 'corner'); await expect(s.locator('[data-quantity="slope"]')).toHaveAttribute('data-status', 'undefined');
    await expect(s.locator('line[data-part="tangent"]')).toHaveCount(0);
    await s.locator('[data-preset="backward"]').click(); await expect(s.locator('[data-verdict]')).toContainText('x < a');
  });
  test('worked replay and exercises', async ({ page }) => {
    await open(page, slug, kind); await replayWorked(page, kind);
    await exercises(page, { 'iii13-value': ['6', '5'], 'iii13-strip': ['0.03'], 'iii13-lower': ['0', '8', '6'] }, 'iii13-');
  });
  for (const theme of ['light', 'dark'] as const) test.describe(theme, () => {
    test.use({ colorScheme: theme });
    test('exceptional and invalid states remain accessible', async ({ page }) => { const s = await open(page, slug, kind); await s.locator('[data-preset="jump"]').click(); await axe(page); await entry(s, 'a', '9'); await scanStage(page); });
  });
});

test.describe('III.15: numerical integration', () => {
  const slug = 'numerical-integration', kind = 'quadrature';
  test('exact errors, refinement and rule switching; rejection and reset', async ({ page }) => {
    const s = await open(page, slug, kind), initial = await state(s);
    expect(await metrics(s)).toMatchObject({ n: 4, approx: 0.34375, order: 2 });
    await s.locator('[data-param="k"] input').press('ArrowUp'); expect(await metrics(s)).toMatchObject({ n: 8, order: 2 });
    await s.getByRole('radio', { name: 'left' }).check(); expect((await metrics(s)).rule).toBe('left');
    const i = await entry(s, 'k', '11'); await expect(i).toHaveAttribute('aria-invalid', 'true');
    await s.locator('[data-param="k"] input').press('Escape'); await s.locator('[data-action="reset"]').click(); expect(await state(s)).toEqual(initial);
  });
  test('the convergence handle changes k; panels stop being drawn when narrower than a pixel', async ({ page }) => {
    const s = await open(page, slug, kind), conv = s.locator('[data-scene="convergence"]');
    const h = conv.locator('[data-handle]'); await h.press('ArrowRight'); await h.press('ArrowRight'); expect((await state(s)).k).toBe(4);
    await expect(s.locator('polygon[data-part^="panel-"]')).toHaveCount(16);
    await entry(s, 'k', '8'); await expect(s.locator('polygon[data-part^="panel-"]')).toHaveCount(0);
    const m = await metrics(s), dot = conv.locator('circle[data-part="now"]'), at = await worldToSvg(conv, { x: 8, y: Math.log10(m.error) });
    expect(Math.abs(Number(await dot.getAttribute('cy')) - at.y)).toBeLessThan(0.01);
  });
  test('non-smooth integrands report a lower observed order', async ({ page }) => {
    const s = await open(page, slug, kind); await s.locator('[data-preset="sqrt"]').click(); await expect(s).toHaveAttribute('data-status', 'nonsmooth');
    const order = (await metrics(s)).order; expect(order).toBeGreaterThan(1.3); expect(order).toBeLessThan(1.7);
    await s.locator('[data-preset="signed"]').click(); await expect(s.locator('polygon[data-part^="panel-"][class*="caution"]')).not.toHaveCount(0);
  });
  test('worked replay and exercises', async ({ page }) => {
    await open(page, slug, kind); await replayWorked(page, kind);
    await exercises(page, { 'iii15-trap': ['1/2', '1/6'], 'iii15-mid': ['1/4'], 'iii15-order': ['2'] }, 'iii15-');
  });
  for (const theme of ['light', 'dark'] as const) test.describe(theme, () => {
    test.use({ colorScheme: theme });
    test('exceptional and invalid states remain accessible', async ({ page }) => { const s = await open(page, slug, kind); await s.locator('[data-preset="sqrt"]').click(); await axe(page); await entry(s, 'k', '20'); await scanStage(page); });
  });
});
