/** Owner-run browser source. No author browser/capture execution is authorized. */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { svm, decision, type SVMState, type Result } from '../../../src/parts/p07/model/svm';
import review from '../../../fixtures/p07/review-regressions.json' with { type: 'json' };
const routes = [['maximum-margin-classification', 'hard'], ['soft-margins-regularization', 'soft'], ['kernel-methods', 'kernel']] as const;
const near = (a: number, b: number, tolerance = 2e-10) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tolerance * (1 + Math.abs(b)));
const field = (root: Locator, label: string) => root.getByRole('textbox', { name: new RegExp('^' + label + '(?: |$)') });
async function input(root: Locator, label: string, value: string) { const node = field(root, label); await node.fill(value); await node.press('Enter'); }
async function open(page: Page, slug = 'maximum-margin-classification', mode = 'hard') {
  await page.goto(`chapters/${slug}/`); await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const root = page.locator(`[data-svm-lab="${mode}"]`); await expect(root).toBeVisible(); return root;
}
async function state(root: Locator): Promise<SVMState> { return JSON.parse((await root.getAttribute('data-state'))!); }
async function result(root: Locator): Promise<Result> { return JSON.parse((await root.getAttribute('data-result'))!); }
async function parity(root: Locator) {
  const s = await state(root), expected = svm(s), actual = await result(root);
  expect(actual.status).toBe(expected.status);
  for (const key of ['b', 'norm2', 'halfMargin', 'primal', 'dual', 'gap', 'kkt', 'equality', 'bounds'] as const) {
    if (expected[key] === null) expect(actual[key]).toBeNull(); else near(actual[key]!, expected[key]!);
  }
  expect(actual.rows).toHaveLength(expected.rows.length);
  for (let i = 0; i < expected.rows.length; i++) {
    near(actual.rows[i]!.score, expected.rows[i]!.score); near(actual.rows[i]!.hinge, expected.rows[i]!.hinge); near(actual.rows[i]!.alpha, expected.rows[i]!.alpha);
    const row = root.locator(`[data-row="${s.points[i]!.id}"]`); await expect(row).toContainText(s.points[i]!.id);
    expect(actual.rows[i]!.decision).toBe(expected.rows[i]!.decision);
  }
  for (const p of s.points) {
    const handle = root.locator(`[data-point-handle="${p.id}"]`); near(Number(await handle.getAttribute('cx')), 240 + 32 * p.x[0], 1e-6); near(Number(await handle.getAttribute('cy')), 240 - 32 * p.x[1], 1e-6);
  }
  if (expected.status === 'infeasible' || expected.status === 'failed') await expect(root.locator('[data-level]')).toHaveCount(0);
  else if (expected.w) for (const line of await root.locator('[data-level]').all()) {
    const level = Number(await line.getAttribute('data-level'));
    for (const suffix of ['1', '2']) {
      const x = (Number(await line.getAttribute('x' + suffix)) - 240) / 32, y = (240 - Number(await line.getAttribute('y' + suffix))) / 32;
      near(decision(s, expected, [x, y]), level, 1e-6);
    }
  }
}
async function location(root: Locator, x: number, y: number) {
  const box = (await root.locator('[data-svm-plane]').boundingBox())!;
  return { x: box.x + (240 + 32 * x) * box.width / 480, y: box.y + (240 - 32 * y) * box.height / 480 };
}
for (const [slug, mode] of routes) test(`${mode}: state, geometry, themes, fonts, targets and containment`, async ({ page }) => {
  const root = await open(page, slug, mode); await parity(root);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    const geometry = await root.locator('[data-svm-plane]').evaluate(svg => {
      const m = (svg as SVGSVGElement).getScreenCTM()!;
      return { fonts: [...svg.querySelectorAll('text')].map(t => parseFloat(getComputedStyle(t).fontSize) * Math.hypot(m.a, m.b)), handles: [...svg.querySelectorAll('[data-point-handle]')].map(h => { const b = h.getBoundingClientRect(); return [b.width, b.height]; }) };
    });
    geometry.fonts.forEach(size => expect(size).toBeGreaterThanOrEqual(13.99)); geometry.handles.forEach(box => box.forEach(size => expect(size).toBeGreaterThanOrEqual(43.99)));
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const controls = await root.locator('input,select,button').evaluateAll(nodes => nodes.map(n => { const b = n.getBoundingClientRect(), p = n.closest('[data-svm-lab]')!.getBoundingClientRect(); return { height: b.height, left: b.left - p.left, right: p.right - b.right }; }));
    controls.forEach(c => { expect(c.height).toBeGreaterThanOrEqual(43.99); expect(c.left).toBeGreaterThanOrEqual(-1); expect(c.right).toBeGreaterThanOrEqual(-1); });
    for (const table of await root.locator('table').all()) expect(await table.evaluate(n => !!n.closest('.table-scroll') && getComputedStyle(n.closest('.table-scroll')!).overflowX === 'auto')).toBe(true);
  }
});
for (const [slug, mode] of routes) test(`${mode}: keyboard, numeric rejection, reset and immutable replay`, async ({ page }) => {
  const root = await open(page, slug, mode), canonical = await state(root);
  await root.locator('[data-point-handle="a"]').focus(); await page.keyboard.press('ArrowRight');
  near((await state(root)).points[0]!.x[0], canonical.points[0]!.x[0] + .1); await parity(root);
  const before = await state(root); await input(root, 'Point x', 'NaN'); expect(await state(root)).toEqual(before); await expect(field(root, 'Point x')).toHaveAttribute('aria-invalid', 'true');
  await input(root, 'Point x', '-0.912345'); near((await state(root)).points[0]!.x[0], -.912345); await parity(root);
  await root.getByRole('button', { name: 'Reset experiment', exact: true }).click(); expect(await state(root)).toEqual(canonical);
  await root.getByRole('button', { name: mode === 'hard' ? 'Replay feasibility cases' : 'Replay C tradeoff', exact: true }).click();
  await root.getByRole('button', { name: 'Next', exact: true }).click(); const displayed = await state(root);
  await input(root, 'Point x', '-0.5'); const edited = await state(root); expect(edited.C).toBe(displayed.C); near(edited.points[0]!.x[0], -.5);
  await expect(root.getByRole('navigation', { name: 'Trace playback' })).toHaveCount(0); await parity(root);
  await root.getByRole('button', { name: 'Reset experiment', exact: true }).click(); expect(await state(root)).toEqual(canonical);
});
test('hard infeasibility and exact anchor never display failed separators', async ({ page }) => {
  const root = await open(page);
  for (const name of ['overlap', 'coincident', 'xor']) { await root.getByRole('button', { name: `Use ${name} data`, exact: true }).click(); await expect(root).toHaveAttribute('data-status', 'infeasible'); await expect(root.locator('[data-level]')).toHaveCount(0); await parity(root); }
  await root.getByRole('button', { name: 'Use anchor data', exact: true }).click(); const r = await result(root);
  expect(r.w).toEqual([1, 0]); expect(r.alpha).toEqual([.5, .5]); expect(r.primal).toBe(.5); expect(r.rows.map(row => row.signedDistance)).toEqual([-1, 1]); await parity(root);
});
test('soft C refits outlier separator; coincident labels retain explicit hinge', async ({ page }) => {
  const root = await open(page, 'soft-margins-regularization', 'soft');
  await input(root, 'Penalty C', '.05'); const low = await result(root); await input(root, 'Penalty C', '4'); const high = await result(root);
  expect(Math.hypot(low.w![0] - high.w![0], low.w![1] - high.w![1])).toBeGreaterThan(1e-3); await parity(root);
  await root.getByRole('button', { name: 'Use coincident data', exact: true }).click(); const zero = await result(root); expect(zero.norm2).toBe(0); expect(zero.halfMargin).toBeNull(); expect(zero.rows.map(row => row.hinge)).toEqual([1, 1]); await parity(root);
});
test('kernel choices refit the real Gram and contours; parameters remain bounded', async ({ page }) => {
  const root = await open(page, 'kernel-methods', 'kernel');
  await expect(root.locator('[data-level="0"]')).not.toHaveCount(0);
  await root.getByRole('combobox', { name: 'Kernel', exact: true }).selectOption('linear'); await parity(root); expect((await result(root)).norm2).toBe(0);
  await root.getByRole('combobox', { name: 'Kernel', exact: true }).selectOption('polynomial'); await input(root, 'Polynomial offset', '0'); await parity(root);
  near((await result(root)).primal!, .25); await expect(root.locator('[data-level="0"]')).not.toHaveCount(0);
  const before = await state(root); await input(root, 'Polynomial degree', '1.5'); expect(await state(root)).toEqual(before); await expect(field(root, 'Polynomial degree')).toHaveAttribute('aria-invalid', 'true');
  await root.getByRole('combobox', { name: 'Kernel', exact: true }).selectOption('rbf'); await input(root, 'Kernel gamma', '.5'); await parity(root);
  const s = await state(root), r = await result(root); expect(r.w).toBeNull(); expect(r.rows.every(row => row.signedDistance === null)).toBe(true);
  // Independent Gram reconstruction from the browser input, separate from SVG interpolation.
  for (let i = 0; i < s.points.length; i++) for (let j = 0; j < s.points.length; j++) near(r.gram[i]![j]!, Math.exp(-s.kernel.gamma * ((s.points[i]!.x[0] - s.points[j]!.x[0]) ** 2 + (s.points[i]!.x[1] - s.points[j]!.x[1]) ** 2)));
});
test('kernel diagnostic-failure preset exposes real failed state without fitted contours', async ({ page }) => {
  const root = await open(page, 'kernel-methods', 'kernel'), canonical = await state(root);
  await root.getByRole('button', { name: 'Replay C tradeoff', exact: true }).click();
  await root.getByRole('button', { name: 'Show diagnostic failure', exact: true }).click();
  await expect(root).toHaveAttribute('data-status', 'failed');
  expect(await state(root)).toEqual(review.diagnosticFailure.input);
  const r = await result(root); expect(r.gram).toEqual(review.diagnosticFailure.gram); expect(r.kkt).toBeGreaterThan(2e-5);
  await expect(root.locator('[data-level]')).toHaveCount(0); await expect(root.locator('.p07-region')).toHaveCount(0);
  await expect(root.locator('[data-diagnostic]')).toContainText('Diagnostic failure');
  await expect(root.getByRole('navigation', { name: 'Trace playback' })).toHaveCount(0);
  for (const [label, value] of [['Penalty C', '1'], ['Kernel gamma', '1'], ['Polynomial offset', '1'], ['Polynomial degree', '4']] as const) await expect(field(root, label)).toHaveValue(value);
  const failedState = await state(root); expect(() => decision(failedState, r, [0, 0])).toThrow(/successful fit/);
  await parity(root);
  await root.getByRole('button', { name: 'Reset experiment', exact: true }).click();
  expect(await state(root)).toEqual(canonical); await parity(root);
});
test('pointer and numeric edits agree; selected coincident handle retains its DOM capture node', async ({ page }) => {
  const root = await open(page); await root.getByRole('button', { name: 'Use coincident data', exact: true }).click();
  await root.getByRole('combobox', { name: 'Selected point', exact: true }).selectOption('a'); await root.locator('[data-svm-plane]').scrollIntoViewIfNeeded();
  const start = await location(root, 0, 0), end = await location(root, -.5, .5), handle = (await root.locator('[data-point-handle="a"]').elementHandle())!;
  expect(await page.evaluate(p => document.elementFromPoint(p.x, p.y)?.getAttribute('data-point-handle'), start)).toBe('a');
  await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 5 });
  expect(await handle.evaluate(n => n.isConnected && n === n.ownerDocument.querySelector('[data-point-handle="a"]'))).toBe(true);
  await page.mouse.up(); expect((await state(root)).points[0]!.x).toEqual([-.5, .5]); expect((await state(root)).points[1]!.x).toEqual([0, 0]); await parity(root);
  await root.getByRole('button', { name: 'Use coincident data', exact: true }).click(); await input(root, 'Point x', '-.5'); await input(root, 'Point y', '.5'); expect((await state(root)).points[0]!.x).toEqual([-.5, .5]); await parity(root);
});
test('native touch moves a retained handle repeatedly and preserves surrounding scroll', async ({ page }) => {
  const root = await open(page); await root.getByRole('button', { name: 'Use anchor data', exact: true }).click();
  const plot = root.locator('[data-svm-plane]'); await plot.scrollIntoViewIfNeeded();
  const handle = root.locator('[data-point-handle="a"]'), captured = (await handle.elementHandle())!, start = await location(root, -1, 0);
  await handle.evaluate(node => {
    node.setAttribute('data-cancels', '0');
    node.addEventListener('pointerdown', event => node.setAttribute('data-pointer', String((event as PointerEvent).pointerId)));
    node.addEventListener('pointercancel', () => node.setAttribute('data-cancels', String(Number(node.getAttribute('data-cancels')) + 1)));
    node.addEventListener('touchstart', event => queueMicrotask(() => node.setAttribute('data-touch-prevented', String(event.defaultPrevented))));
  });
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
    for (const [x, y] of [[-1.5, .5], [-2, 1], [-2, .5]]) {
      const destination = await location(root, x!, y!);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...destination, id: 1 }] });
      await expect.poll(async () => (await state(root)).points[0]!.x).toEqual([x, y]);
      expect(await captured.evaluate(node => node.isConnected && node.hasPointerCapture(Number(node.getAttribute('data-pointer'))))).toBe(true);
      await expect(handle).toHaveAttribute('data-cancels', '0'); await expect(handle).toHaveAttribute('data-touch-prevented', 'true');
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => captured.evaluate(node => node.hasPointerCapture(Number(node.getAttribute('data-pointer'))))).toBe(false); await parity(root);
    await plot.evaluate(node => node.addEventListener('touchstart', event => queueMicrotask(() => node.setAttribute('data-background-prevented', String(event.defaultPrevented)))));
    expect(await plot.evaluate(node => getComputedStyle(node).touchAction)).toBe('auto');
    const background = await location(root, -4, -3), before = await page.evaluate(() => window.scrollY);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...background, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: background.x, y: background.y - 80, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(plot).toHaveAttribute('data-background-prevented', 'false');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
  } finally { await cdp.detach(); }
});
test('a stale concurrent finger cannot move or end the newer pointer owner', async ({ page }) => {
  const root = await open(page); await root.getByRole('button', { name: 'Use anchor data', exact: true }).click();
  await root.locator('[data-svm-plane]').scrollIntoViewIfNeeded(); const a = await location(root, -1, 0), b = await location(root, 1, 0);
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...a, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...a, id: 1 }, { ...b, id: 2 }] });
    const movedA = await location(root, -2, 0), movedB = await location(root, 2, .5);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...movedA, id: 1 }, { ...movedB, id: 2 }] });
    await expect.poll(async () => (await state(root)).points.map(p => p.x)).toEqual([[-1, 0], [2, .5]]);
    // CDP touchEnd requires an empty list; partial release uses touchMove with remaining contacts.
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...movedB, id: 2 }] });
    await expect.poll(async () => (await state(root)).points.map(p => p.x)).toEqual([[-1, 0], [2, .5]]);
    const laterB = await location(root, 2, 1);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...laterB, id: 2 }] });
    await expect.poll(async () => (await state(root)).points.map(p => p.x)).toEqual([[-1, 0], [2, 1]]);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await parity(root);
  } finally { await cdp.detach(); }
});
test('reset invalidates a captured pointer and preserves focus/numeric trust boundary', async ({ page }) => {
  const root = await open(page); await root.getByRole('button', { name: 'Use anchor data', exact: true }).click();
  await root.locator('[data-svm-plane]').scrollIntoViewIfNeeded();
  const start = await location(root, -1, 0);
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await root.getByRole('button', { name: 'Reset experiment', exact: true }).evaluate(node => (node as HTMLButtonElement).click());
  const reset = await state(root); await page.mouse.move(start.x + 40, start.y + 40); await page.mouse.up();
  expect(await state(root)).toEqual(reset);
  await input(root, 'Point x', '6'); expect(await state(root)).toEqual(reset); await expect(field(root, 'Point x')).toHaveAttribute('aria-invalid', 'true');
});
