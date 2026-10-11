import { expect, test } from '@playwright/test';
import { axe, dragHandle, entry, exercises, metrics, open, replayWorked, scanStage, segment, state, touchDrag, worldToSvg } from './calculus-helpers';

test.describe('III.3: secant → tangent', () => {
  const slug = 'derivative-secant-tangent', kind = 'secant';
  test('canonical exact values, numeric and keyboard edits, rejected input and reset', async ({ page }) => {
    const s = await open(page, slug, kind), initial = await state(s);
    expect(await metrics(s)).toMatchObject({ secantExact: '1/6', tangent: -0.5, status: 'differentiable' });
    await expect(s.locator('[data-quantity="secant"]')).toContainText('1/6');
    await s.locator('[data-param="h"] input').press('ArrowDown'); expect((await state(s)).h).toBe(0.75);
    await expect(s.locator('[data-announcement]')).not.toBeEmpty();
    await entry(s, 'h', '0.5'); expect((await metrics(s)).secantExact).toBe('−5/24');
    for (const value of ['3', '0.001', 'abc']) { const input = await entry(s, 'h', value); await expect(input).toHaveAttribute('aria-invalid', 'true'); expect((await state(s)).h).toBe(0.5); }
    await s.locator('[data-param="h"] input').press('Escape');
    await s.locator('[data-action="reset"]').click(); expect(await state(s)).toEqual(initial);
  });
  test('h = 0 is refused as a division by zero; the tangent is derived separately', async ({ page }) => {
    const s = await open(page, slug, kind); await entry(s, 'h', '0');
    await expect(s).toHaveAttribute('data-status', 'zero-h');
    await expect(s.locator('[data-quantity="secant"]')).toHaveAttribute('data-status', 'undefined');
    await expect(s.locator('[data-quantity="tangent"]')).toHaveAttribute('data-status', 'exact');
    await expect(s.locator('line[data-part="secant"]')).toHaveCount(0);
    await expect(s.locator('[data-verdict]')).toContainText('divides by zero');
  });
  test('dragging P and Q along the graph keeps the drawn secant and tangent identical to the model', async ({ page }) => {
    const s = await open(page, slug, kind), plot = s.locator('[data-scene="graph"]');
    await dragHandle(page, plot, 1, { x: 1.5, y: 0 }); // Q rides on the graph: only its x is used
    expect((await state(s)).h).toBe(0.5);
    const p = await dragHandle(page, plot, 0, { x: 2, y: 2 }); expect((await state(s)).x).toBe(2);
    await expect(p).toHaveAttribute('data-world-y', String((await metrics(s)).py));
    await p.press('ArrowLeft'); expect((await state(s)).x).toBe(1.75); await p.press('ArrowUp'); expect((await state(s)).x).toBe(1.75);
    const m = await metrics(s), drawn = await segment(plot, 'secant');
    const expectedFrom = await worldToSvg(plot, { x: -3, y: m.py + m.secant * (-3 - m.px) }), expectedTo = await worldToSvg(plot, { x: 3, y: m.py + m.secant * (3 - m.px) });
    for (const [a, b] of [[drawn.from, expectedFrom], [drawn.to, expectedTo]] as const) { expect(Math.abs(a.x - b.x)).toBeLessThan(0.01); expect(Math.abs(a.y - b.y)).toBeLessThan(0.01); }
    const tan = await segment(plot, 'tangent'), slope = -(tan.to.y - tan.from.y) / (tan.to.x - tan.from.x);
    expect(slope).toBeCloseTo(m.tangent, 9);
  });
  test('touch uses a large target, commits on release and preserves exact state', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch emulation runs on mobile');
    const s = await open(page, slug, kind);
    await touchDrag(page, s.locator('[data-scene="graph"]'), 0, { x: 0.5, y: 0 }, s.locator('[data-announcement]'));
    expect((await state(s)).x).toBe(0.5);
  });
  test('corner, vertical tangent, jump and endpoint report no derivative and draw one-sided evidence', async ({ page }) => {
    const s = await open(page, slug, kind);
    await s.locator('[data-preset="corner"]').click(); await expect(s).toHaveAttribute('data-status', 'corner');
    await expect(s.locator('line[data-part="tangent"]')).toHaveCount(0); await expect(s.locator('line[data-part^="tangent-"]')).toHaveCount(2);
    await expect(s.locator('[data-quantity="left"]')).toContainText('−1'); await expect(s.locator('[data-quantity="right"]')).toContainText('1');
    await expect(s.locator('.calc-table tbody tr').first()).toContainText('−1');
    await s.locator('[data-preset="vertical"]').click(); await expect(s).toHaveAttribute('data-status', 'vertical');
    await s.locator('[data-preset="jump"]').click(); await expect(s).toHaveAttribute('data-status', 'discontinuous');
    await expect(s.locator('circle[data-part^="f-hole"]')).toHaveCount(1); await expect(s.locator('circle[data-filled="true"]')).toHaveCount(1);
    await s.locator('[data-preset="endpoint"]').click(); await expect(s.locator('[data-quantity="left"]')).toHaveAttribute('data-status', 'undefined');
    await s.locator('[data-preset="sine"]').click(); await expect(s.locator('[data-quantity="tangent"] .line').first()).toContainText('≈');
  });
  test('replay of the worked h → 0 sequence', async ({ page }) => {
    await open(page, slug, kind); const work = await replayWorked(page, kind);
    await work.getByRole('button', { name: 'Reset' }).click(); await work.getByRole('button', { name: /^Next/ }).click();
    await expect(work.locator('.trace-body h3')).toHaveText('Secant 2: h = 0.5'); await expect(work.locator('.trace-body p')).toContainText('−5/24');
  });
  test('five graded exercises give corrective feedback and worked solutions', async ({ page }) => {
    await open(page, slug, kind); await exercises(page, { 'iii3-secant': ['5/2'], 'iii3-limit': ['2'] }, 'iii3-');
  });
  for (const theme of ['light', 'dark'] as const) test.describe(theme, () => {
    test.use({ colorScheme: theme });
    test('exceptional and invalid states remain accessible', async ({ page }) => {
      const s = await open(page, slug, kind);
      await s.locator('[data-preset="corner"]').click(); await axe(page);
      await entry(s, 'x', '9'); await scanStage(page);
    });
  });
});

test.describe('III.4: rate and local linear model', () => {
  const slug = 'derivative-rate-linear-model', kind = 'linear-model';
  test('exact model error, keyboard/numeric edits, rejection and reset', async ({ page }) => {
    const s = await open(page, slug, kind), initial = await state(s);
    expect(await metrics(s)).toMatchObject({ errorExact: '2/3', slope: -0.5, status: 'local' });
    await s.locator('[data-param="dx"] input').press('ArrowDown'); await s.locator('[data-param="dx"] input').press('ArrowDown');
    expect((await metrics(s)).errorExact).toBe('7/48');
    const i = await entry(s, 'dx', '5'); await expect(i).toHaveAttribute('aria-invalid', 'true');
    await s.locator('[data-param="dx"] input').press('Escape'); await s.locator('[data-action="reset"]').click(); expect(await state(s)).toEqual(initial);
  });
  test('dragging both points; error segment and marker equal the model', async ({ page }) => {
    const s = await open(page, slug, kind), graph = s.locator('[data-scene="graph"]'), err = s.locator('[data-scene="error"]');
    await dragHandle(page, graph, 1, { x: 1.5, y: 0 }); expect((await state(s)).dx).toBe(0.5);
    await dragHandle(page, graph, 0, { x: 0.5, y: 0 }); expect((await state(s)).x0).toBe(0.5);
    const m = await metrics(s), seg = await segment(graph, 'error'), top = await worldToSvg(graph, { x: 1, y: m.actual }), bottom = await worldToSvg(graph, { x: 1, y: m.linear });
    expect(Math.abs(seg.to.y - top.y)).toBeLessThan(0.01); expect(Math.abs(seg.from.y - bottom.y)).toBeLessThan(0.01);
    const dot = err.locator('circle[data-part="error-now"]'), at = await worldToSvg(err, { x: 0.5, y: m.error });
    expect(Math.abs(Number(await dot.getAttribute('cy')) - at.y)).toBeLessThan(0.01);
  });
  test('far away and corner cases are reported honestly', async ({ page }) => {
    const s = await open(page, slug, kind);
    await s.locator('[data-preset="far"]').click(); await expect(s).toHaveAttribute('data-status', 'far'); expect((await metrics(s)).errorExact).toBe('275/48');
    await s.locator('[data-preset="corner"]').click(); await expect(s).toHaveAttribute('data-status', 'no-derivative'); await expect(s.locator('line[data-part="tangent"]')).toHaveCount(0);
    await s.locator('[data-preset="sine"]').click(); await expect(s.locator('[data-quantity="error"] .line').first()).toContainText('≈');
  });
  test('worked replay and exercises', async ({ page }) => {
    await open(page, slug, kind); await replayWorked(page, kind);
    await exercises(page, { 'iii4-model': ['9.6'], 'iii4-error': ['0.01'], 'iii4-rate': ['4', '2'] }, 'iii4-');
  });
  for (const theme of ['light', 'dark'] as const) test.describe(theme, () => {
    test.use({ colorScheme: theme });
    test('exceptional and invalid states remain accessible', async ({ page }) => { const s = await open(page, slug, kind); await s.locator('[data-preset="corner"]').click(); await axe(page); await entry(s, 'x0', '9'); await scanStage(page); });
  });
});

test.describe('III.5: derivative rules', () => {
  const slug = 'derivative-rules', kind = 'rules';
  test('product rule equals the expanded derivative; edits and reset', async ({ page }) => {
    const s = await open(page, slug, kind), initial = await state(s);
    expect(await metrics(s)).toMatchObject({ rule: 6, independent: 6, agree: true });
    await entry(s, 'a', '-1'); expect((await metrics(s)).agree).toBe(true);
    await s.locator('[data-param="x"] input').press('ArrowUp'); expect((await state(s)).x).toBe(1.25);
    const i = await entry(s, 'c', '1.234'); await expect(i).toHaveAttribute('aria-invalid', 'true');
    await s.locator('[data-param="c"] input').press('Escape'); await s.locator('[data-action="reset"]').click(); expect(await state(s)).toEqual(initial);
  });
  test('the area strips are drawn at the exact increments, and mode switching works', async ({ page }) => {
    const s = await open(page, slug, kind), area = s.locator('[data-scene="area"]');
    await expect(area.locator('polygon[data-part="strip-vdu"]')).toHaveCount(1);
    const pts = (await area.locator('polygon[data-part="strip-vdu"]').getAttribute('points'))!.split(' ').map(p => p.split(',').map(Number));
    const corner = await worldToSvg(area, { x: 2.5, y: 0 }); expect(Math.abs(pts[1]![0]! - corner.x)).toBeLessThan(0.01);
    await s.getByRole('radio', { name: 'u / v', exact: true }).check(); expect((await state(s)).mode).toBe('quotient'); await expect(area).toHaveCount(0);
    expect((await metrics(s)).rule).toBe(-0.5);
    await dragHandle(page, s.locator('[data-scene="graph"]'), 0, { x: 2, y: 0 }); expect((await state(s)).x).toBe(2);
  });
  test('a zero denominator makes the quotient and its derivative undefined', async ({ page }) => {
    const s = await open(page, slug, kind); await s.locator('[data-preset="pole"]').click();
    await expect(s).toHaveAttribute('data-status', 'undefined'); await expect(s.locator('[data-quantity="rule"]')).toHaveAttribute('data-status', 'undefined');
    await expect(s.locator('line[data-part="tangent"]')).toHaveCount(0); await expect(s.locator('line[data-part^="pole-"]')).toHaveCount(2);
  });
  test('worked replay and exercises', async ({ page }) => {
    await open(page, slug, kind); await replayWorked(page, kind);
    await exercises(page, { 'iii5-product': ['6'], 'iii5-quotient': ['-1/2'], 'iii5-increment': ['1.5', '0.5', '0.125'] }, 'iii5-');
  });
  for (const theme of ['light', 'dark'] as const) test.describe(theme, () => {
    test.use({ colorScheme: theme });
    test('exceptional and invalid states remain accessible', async ({ page }) => { const s = await open(page, slug, kind); await s.locator('[data-preset="pole"]').click(); await axe(page); await entry(s, 'x', '9'); await scanStage(page); });
  });
});

test.describe('III.6: chain rule', () => {
  const slug = 'chain-rule', kind = 'chain';
  test('local factors multiply exactly; edits and reset', async ({ page }) => {
    const s = await open(page, slug, kind), initial = await state(s);
    expect(await metrics(s)).toMatchObject({ u: 1, gp: 2, fp: 0.75, product: 1.5, direct: 1.5, agree: true });
    await s.locator('[data-param="x"] input').press('ArrowDown'); expect((await state(s)).x).toBe(1.75); expect((await metrics(s)).agree).toBe(true);
    const i = await entry(s, 'x', '3'); await expect(i).toHaveAttribute('aria-invalid', 'true');
    await s.locator('[data-param="x"] input').press('Escape'); await s.locator('[data-action="reset"]').click(); expect(await state(s)).toEqual(initial);
  });
  test('three linked planes follow one drag; the composite tangent has the product slope', async ({ page }) => {
    const s = await open(page, slug, kind), inner = s.locator('[data-scene="inner"]');
    await dragHandle(page, inner, 0, { x: 1, y: 0 }); expect((await state(s)).x).toBe(1);
    const m = await metrics(s), t = await segment(s.locator('[data-scene="composite"]'), 'tangent-h');
    expect(-(t.to.y - t.from.y) / (t.to.x - t.from.x)).toBeCloseTo(m.product, 9);
    const dot = s.locator('[data-scene="outer"] circle[data-part="u-now"]'), at = await worldToSvg(s.locator('[data-scene="outer"]'), { x: m.u, y: m.y });
    expect(Math.abs(Number(await dot.getAttribute('cx')) - at.x)).toBeLessThan(0.01);
  });
  test('function choices, flat inner stage and nonlocal step', async ({ page }) => {
    const s = await open(page, slug, kind);
    await s.locator('[data-preset="flat-inner"]').click(); await expect(s).toHaveAttribute('data-status', 'flat'); expect((await metrics(s)).product).toBe(0);
    await s.getByRole('radio', { name: 'sin u', exact: true }).check(); expect((await state(s)).outer).toBe('sin'); await expect(s.locator('[data-quantity="direct"]')).toHaveAttribute('data-status', 'undefined');
    await s.locator('[data-preset="large-step"]').click(); await expect(s).toHaveAttribute('data-status', 'nonlocal');
  });
  test('worked replay and exercises', async ({ page }) => {
    await open(page, slug, kind); const w = await replayWorked(page, kind); await expect(w.locator('[data-trace-count]')).toContainText('of 4');
    await exercises(page, { 'iii6-chain': ['12'], 'iii6-where': ['3', '6'], 'iii6-change': ['-0.06'] }, 'iii6-');
  });
  for (const theme of ['light', 'dark'] as const) test.describe(theme, () => {
    test.use({ colorScheme: theme });
    test('exceptional and invalid states remain accessible', async ({ page }) => { const s = await open(page, slug, kind); await s.locator('[data-preset="sin-exp"]').click(); await axe(page); await entry(s, 'dx', '9'); await scanStage(page); });
  });
});
