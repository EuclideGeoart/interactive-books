import { expect, test } from '@playwright/test';
import { axe, entry, exercises, metrics, open, scanStage, state } from './calculus-helpers';

test.describe('III.10: computational graphs and automatic differentiation', () => {
  const slug = 'automatic-differentiation', kind = 'autodiff';
  test('mandatory reference: ∂z/∂x = 2x + y and ∂z/∂y = x from the graph, for edited inputs', async ({ page }) => {
    const s = await open(page, slug, kind), initial = await state(s);
    expect(await metrics(s)).toMatchObject({ adj_x: 7, adj_y: 2 });
    await expect(s.locator('[data-quantity="paths-x"]')).toContainText('2 via u + 5 via z');
    for (const [x, y] of [['-1.5', '4'], ['0', '2.5'], ['3', '-0.5']] as const) {
      await entry(s, 'v1', x); await entry(s, 'v2', y);
      expect(await metrics(s)).toMatchObject({ adj_x: 2 * Number(x) + Number(y), adj_y: Number(x) });
    }
    await s.locator('[data-param="v1"] input').press('ArrowUp'); expect((await state(s)).v1).toBe(3.5);
    await expect(s.locator('[data-announcement]')).not.toBeEmpty();
    const bad = await entry(s, 'v2', '9'); await expect(bad).toHaveAttribute('aria-invalid', 'true');
    await s.locator('[data-param="v2"] input').press('Escape'); await s.locator('[data-action="reset"]').click(); expect(await state(s)).toEqual(initial);
  });
  test('stepping the reverse trace drives the graph view: values, contributions and adjoints come from each frame', async ({ page }) => {
    const s = await open(page, slug, kind), dag = s.locator('[data-dag]'), trace = s.locator('.trace').first();
    await expect(dag).toHaveAttribute('data-phase', 'summary');
    await trace.getByRole('button', { name: 'Reset' }).click();
    await expect(s.locator('[data-node="u"]')).toHaveAttribute('data-value', ''); await expect(s.locator('[data-node="x"]')).toHaveAttribute('data-value', '2');
    await trace.getByRole('button', { name: /^Next/ }).click(); await expect(s.locator('[data-node="u"]')).toHaveAttribute('data-value', '5');
    await expect(s.locator('[data-node="z"]')).toHaveAttribute('data-value', '');
    await trace.getByRole('button', { name: /^Next/ }).click(); await trace.getByRole('button', { name: /^Next/ }).click();
    await expect(dag).toHaveAttribute('data-focus', 'z');
    await expect(s.locator('[data-edge="x->z#1"]')).toHaveAttribute('data-contribution', '5'); await expect(s.locator('[data-edge="u->z#0"]')).toHaveAttribute('data-contribution', '2');
    await expect(s.locator('[data-node="x"]')).toHaveAttribute('data-deriv', '5');
    await trace.getByRole('button', { name: /^Next/ }).click();
    await expect(s.locator('[data-edge="x->u#0"]')).toHaveAttribute('data-contribution', '2'); await expect(s.locator('[data-node="x"]')).toHaveAttribute('data-deriv', '7');
    await expect(s.locator('[data-node="y"]')).toHaveAttribute('data-deriv', '2');
    await trace.getByRole('button', { name: /Previous/ }).click(); await expect(s.locator('[data-node="x"]')).toHaveAttribute('data-deriv', '5');
    await expect(s.locator('[data-edge="u->z#0"]')).toHaveAttribute('data-local', '∂z/∂u=2');
  });
  test('forward mode: one tangent pass per seeded input; cost table and many-output graph', async ({ page }) => {
    const s = await open(page, slug, kind);
    await s.getByRole('radio', { name: 'forward (tangents)' }).check(); await s.getByRole('radio', { name: 'y', exact: true }).check();
    expect(await metrics(s)).toMatchObject({ mode: 'forward', seed: 'y', tan_z: 2 });
    await expect(s.locator('[data-node="z"]')).toHaveAttribute('data-deriv', '2');
    // Forward mode reads ∂(node)/∂(seed) on every frame, including the final summary frame.
    await expect(s.locator('[data-node="z"] .node-adjoint')).toHaveText('∂z/∂y = 2'); await expect(s.locator('[data-node="x"] .node-adjoint')).toHaveText('∂x/∂y = 0');
    await s.locator('[data-preset="many-outputs"]').click(); expect(await metrics(s)).toMatchObject({ tan_s: 3, tan_c: 6.75 });
    await expect(s.locator('.calc-table tbody tr')).toContainText('1'); await expect(s.locator('[data-node="w"]')).toHaveCount(1);
    await s.locator('[data-preset="scalar-loss"]').click(); expect(await metrics(s)).toMatchObject({ adj_a: 4, adj_b: 2, adj_c: 2 });
  });
  test('repeated input and division by zero', async ({ page }) => {
    const s = await open(page, slug, kind);
    await s.locator('[data-preset="square"]').click(); expect((await metrics(s)).adj_x).toBe(6);
    await expect(s.locator('[data-edge="x->q#0"]')).toHaveAttribute('data-contribution', '3'); await expect(s.locator('[data-edge="x->q#1"]')).toHaveAttribute('data-contribution', '3');
    await s.locator('[data-preset="division-by-zero"]').click(); await expect(s).toHaveAttribute('data-status', 'undefined');
    await expect(s.locator('[data-node="r"]')).toHaveAttribute('data-value', 'undef.');
    await expect(s.locator('[data-quantity="fd"]')).toHaveAttribute('data-status', 'undefined'); await expect(s.locator('[data-verdict]')).toContainText('Division by zero');
  });
  test('worked replay of the reference graph', async ({ page }) => {
    await open(page, slug, kind); const w = page.locator('[data-stage="calculus-worked-autodiff"]'), trace = w.locator('[data-trace-index]');
    await expect(w).toHaveAttribute('data-hydrated', 'true'); await expect(trace).toHaveAttribute('data-trace-index', '0');
    for (let k = 0; k < 4; k++) await w.getByRole('button', { name: /^Next/ }).click();
    await expect(w.locator('[data-node="x"]')).toHaveAttribute('data-deriv', '7');
    await w.getByRole('slider').press('Home'); await expect(trace).toHaveAttribute('data-trace-index', '0');
  });
  test('five graded exercises', async ({ page }) => { await open(page, slug, kind); await exercises(page, { 'iii10-forward': ['5', '10'], 'iii10-reverse': ['7', '2'], 'iii10-square': ['3', '3', '6'] }, 'iii10-'); });
  for (const theme of ['light', 'dark'] as const) test.describe(theme, () => {
    test.use({ colorScheme: theme });
    test('exceptional and invalid states remain accessible', async ({ page }) => { const s = await open(page, slug, kind); await s.locator('[data-preset="division-by-zero"]').click(); await axe(page); await entry(s, 'v1', '9'); await scanStage(page); });
  });
});
