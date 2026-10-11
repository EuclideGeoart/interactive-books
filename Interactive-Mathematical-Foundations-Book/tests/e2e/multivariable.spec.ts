import { expect, test } from '@playwright/test';
import { axe, dragHandle, entry, exercises, metrics, open, replayWorked, scanStage, segment, state, touchDrag, worldToSvg } from './calculus-helpers';

test.describe('III.7: partial derivatives', () => {
  const slug = 'partial-derivatives', kind = 'partials';
  test('exact partials; two-axis keyboard, numeric entry, rejection and reset', async ({ page }) => {
    const s = await open(page, slug, kind), initial = await state(s);
    expect(await metrics(s)).toMatchObject({ fx: 2, fy: -1, f: 0.75 });
    const h = s.locator('[data-scene="map"] [data-handle]');
    await h.press('ArrowUp'); expect((await state(s)).y).toBe(0.75); await h.press('ArrowLeft'); expect((await state(s)).x).toBe(0.75);
    await expect(s.locator('[data-announcement]')).not.toBeEmpty();
    await entry(s, 'x', '2'); expect((await metrics(s)).fx).toBe(4);
    const i = await entry(s, 'y', '3'); await expect(i).toHaveAttribute('aria-invalid', 'true');
    await s.locator('[data-param="y"] input').press('Escape'); await s.locator('[data-action="reset"]').click(); expect(await state(s)).toEqual(initial);
  });
  test('dragging the point moves both slice lines; slice tangents have the partial slopes', async ({ page }) => {
    const s = await open(page, slug, kind), map = s.locator('[data-scene="map"]');
    await dragHandle(page, map, 0, { x: -1, y: 1.5 }); expect(await state(s)).toMatchObject({ x: -1, y: 1.5 });
    const line = await segment(map, 'slice-x'), y = await worldToSvg(map, { x: 0, y: 1.5 }); expect(Math.abs(line.from.y - y.y)).toBeLessThan(0.01);
    const m = await metrics(s);
    for (const [scene, part, value] of [['slice-x', 'tangent-x', m.fx], ['slice-y', 'tangent-y', m.fy]] as const) {
      const t = await segment(s.locator(`[data-scene="${scene}"]`), part); expect(-(t.to.y - t.from.y) / (t.to.x - t.from.x)).toBeCloseTo(value, 9);
    }
  });
  test('touch drag on the map', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch emulation runs on mobile');
    const s = await open(page, slug, kind); await touchDrag(page, s.locator('[data-scene="map"]'), 0, { x: 0, y: 0 }, s.locator('[data-announcement]'));
    expect(await state(s)).toMatchObject({ x: 0, y: 0 }); await expect(s).toHaveAttribute('data-status', 'flat');
  });
  test('worked replay and exercises', async ({ page }) => {
    await open(page, slug, kind); const w = await replayWorked(page, kind); await expect(w.locator('[data-trace-count]')).toContainText('of 4');
    await exercises(page, { 'iii7-partials': ['4', '4'], 'iii7-slice': ['4'], 'iii7-secant': ['2'] }, 'iii7-');
  });
  for (const theme of ['light', 'dark'] as const) test.describe(theme, () => {
    test.use({ colorScheme: theme });
    test('exceptional and invalid states remain accessible', async ({ page }) => { const s = await open(page, slug, kind); await s.locator('[data-preset="origin"]').click(); await axe(page); await entry(s, 'x', '9'); await scanStage(page); });
  });
});

test.describe('III.8: gradient and directional derivatives', () => {
  const slug = 'gradient-directional-derivatives', kind = 'gradient';
  test('directional derivative equals grad·u; edits and reset', async ({ page }) => {
    const s = await open(page, slug, kind), initial = await state(s);
    expect(await metrics(s)).toMatchObject({ gx: 1, gy: 2, du: 1, perp: 0 });
    await entry(s, 'dx', '0.75'); await entry(s, 'dy', '1'); await expect(s.locator('[data-quantity="du"]')).toContainText('2.2');
    const i = await entry(s, 'dx', '5'); await expect(i).toHaveAttribute('aria-invalid', 'true');
    await s.locator('[data-param="dx"] input').press('Escape'); await s.locator('[data-action="reset"]').click(); expect(await state(s)).toEqual(initial);
  });
  test('the gradient arrow is drawn at its declared scale and the direction tip drags relative to the point', async ({ page }) => {
    const s = await open(page, slug, kind), map = s.locator('[data-scene="map"]');
    const m = await metrics(s), line = map.locator('[data-part="gradient"] line'), from = await worldToSvg(map, { x: 1, y: 0.5 });
    expect(Math.abs(Number(await line.getAttribute('x1')) - from.x)).toBeLessThan(0.01);
    await dragHandle(page, map, 0, { x: 1, y: 2.5 }); expect(await state(s)).toMatchObject({ dx: 0, dy: 2 }); expect((await metrics(s)).du).toBe(2);
    await dragHandle(page, map, 1, { x: 0, y: 0 }); await expect(s).toHaveAttribute('data-status', 'stationary'); expect(m.scale).toBe(0.25);
    await expect(map.locator('[data-part="gradient"]')).toHaveCount(0);
  });
  test('zero direction and level direction', async ({ page }) => {
    const s = await open(page, slug, kind);
    await s.locator('[data-preset="zero-direction"]').click(); await expect(s.locator('[data-quantity="du"]')).toHaveAttribute('data-status', 'undefined');
    await s.locator('[data-preset="level"]').click(); await expect(s).toHaveAttribute('data-status', 'level'); expect((await metrics(s)).du).toBe(0);
  });
  test('worked replay and exercises', async ({ page }) => {
    await open(page, slug, kind); await replayWorked(page, kind);
    await exercises(page, { 'iii8-gradient': ['1', '2'], 'iii8-directional': ['11/5'], 'iii8-steepest': ['5'] }, 'iii8-');
  });
  for (const theme of ['light', 'dark'] as const) test.describe(theme, () => {
    test.use({ colorScheme: theme });
    test('exceptional and invalid states remain accessible', async ({ page }) => { const s = await open(page, slug, kind); await s.locator('[data-preset="stationary"]').click(); await axe(page); await entry(s, 'dy', '9'); await scanStage(page); });
  });
});

test.describe('III.9: Jacobian', () => {
  const slug = 'jacobian', kind = 'jacobian';
  test('exact prediction versus independent evaluation; edits and reset', async ({ page }) => {
    const s = await open(page, slug, kind), initial = await state(s);
    expect(await metrics(s)).toMatchObject({ det: 5, errorSquared: 0.015625, px: 1, py: 1.75, qx: 1, qy: 1.875 });
    await s.locator('[data-param="dx"] input').press('ArrowDown'); expect((await state(s)).dx).toBe(0);
    const i = await entry(s, 'dy', '2'); await expect(i).toHaveAttribute('aria-invalid', 'true');
    await s.locator('[data-param="dy"] input').press('Escape'); await s.locator('[data-action="reset"]').click(); expect(await state(s)).toEqual(initial);
  });
  test('dragging δ changes the output arrows to the model values', async ({ page }) => {
    const s = await open(page, slug, kind), input = s.locator('[data-scene="input"]'), out = s.locator('[data-scene="output"]');
    await dragHandle(page, input, 1, { x: 1.5, y: 0.5 }); expect(await state(s)).toMatchObject({ dx: 0.5, dy: 0 });
    const m = await metrics(s), tip = await worldToSvg(out, { x: m.px, y: m.py }), dot = out.locator('circle[data-part="predicted-tip"]');
    expect(Math.abs(Number(await dot.getAttribute('cx')) - tip.x)).toBeLessThan(0.01); expect(Math.abs(Number(await dot.getAttribute('cy')) - tip.y)).toBeLessThan(0.01);
  });
  test('singular, linear and rectangular cases', async ({ page }) => {
    const s = await open(page, slug, kind);
    await s.locator('[data-preset="singular"]').click(); await expect(s).toHaveAttribute('data-status', 'singular');
    await s.locator('[data-preset="linear"]').click(); expect((await metrics(s)).errorSquared).toBe(0);
    await s.locator('[data-preset="lift"]').click(); await expect(s).toHaveAttribute('data-status', 'rectangular');
    await expect(s.locator('[data-quantity="det"]')).toHaveAttribute('data-status', 'undefined'); await expect(s.locator('[data-quantity="shape"]')).toContainText('3 × 2');
  });
  test('worked replay and exercises', async ({ page }) => {
    await open(page, slug, kind); await replayWorked(page, kind);
    await exercises(page, { 'iii9-entries': ['2', '-4', '4', '2'], 'iii9-predict': ['-2.8', '4.4'], 'iii9-shape': ['2', '3'] }, 'iii9-');
  });
  for (const theme of ['light', 'dark'] as const) test.describe(theme, () => {
    test.use({ colorScheme: theme });
    test('exceptional and invalid states remain accessible', async ({ page }) => { const s = await open(page, slug, kind); await s.locator('[data-preset="lift"]').click(); await axe(page); await entry(s, 'x', '9'); await scanStage(page); });
  });
});

test.describe('III.11: Hessian and curvature', () => {
  const slug = 'hessian-curvature', kind = 'hessian';
  test('classification, angle input, rejection and reset', async ({ page }) => {
    const s = await open(page, slug, kind), initial = await state(s);
    await expect(s).toHaveAttribute('data-status', 'minimum');
    await s.locator('[data-param="angle"] input').press('ArrowUp'); expect((await state(s)).angle).toBe(45);
    const i = await entry(s, 'angle', '7.5'); await expect(i).toHaveAttribute('aria-invalid', 'true');
    await s.locator('[data-param="angle"] input').press('Escape'); await s.locator('[data-action="reset"]').click(); expect(await state(s)).toEqual(initial);
  });
  test('all classes, including inconclusive degenerate cases and non-critical points', async ({ page }) => {
    const s = await open(page, slug, kind);
    for (const [preset, kind2] of [['maximum', 'maximum'], ['saddle', 'saddle'], ['well-min', 'minimum'], ['well-saddle', 'saddle'], ['monkey', 'inconclusive'], ['quartic', 'inconclusive'], ['cubic-y', 'inconclusive'], ['not-critical', 'not-critical']] as const) {
      await s.locator(`[data-preset="${preset}"]`).click(); await expect(s).toHaveAttribute('data-status', kind2);
    }
    await expect(s.locator('[data-quantity="fxy"]')).toContainText('symmetric');
    const map = s.locator('[data-scene="map"]'); await dragHandle(page, map, 0, { x: 1, y: 0 }); await expect(s).toHaveAttribute('data-status', 'minimum');
  });
  test('worked replay and exercises', async ({ page }) => {
    await open(page, slug, kind); await replayWorked(page, kind);
    await exercises(page, { 'iii11-hessian': ['6', '0', '2'], 'iii11-det': ['-12'], 'iii11-curvature': ['2', '-2'] }, 'iii11-');
  });
  for (const theme of ['light', 'dark'] as const) test.describe(theme, () => {
    test.use({ colorScheme: theme });
    test('exceptional and invalid states remain accessible', async ({ page }) => { const s = await open(page, slug, kind); await s.locator('[data-preset="monkey"]').click(); await axe(page); await entry(s, 'y', '9'); await scanStage(page); });
  });
});
