import { expect, test, type Locator, type Page } from '@playwright/test';
import { pca, type PCAState } from '../../../src/parts/p06/model/pca';
const chapters = [['data-covariance', 'covariance'], ['pca-eigenvectors-variance', 'eigenpairs'], ['pca-projection-reconstruction', 'reconstruction']] as const;
const near = (a: number, b: number, tolerance = 2e-12) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tolerance * (1 + Math.abs(b)));
const field = (root: Locator, name: string) => root.getByRole('textbox', { name: new RegExp('^' + name + '(?: |$)') });
async function commit(root: Locator, name: string, value: string) { const input = field(root, name); await input.fill(value); await input.press('Enter'); }
async function open(page: Page, slug = 'pca-projection-reconstruction', mode = 'reconstruction') {
  await page.goto(`chapters/${slug}/`); const root = page.locator(`[data-pca-lab="${mode}"]`);
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0); await expect(root).toBeVisible(); return root;
}
async function current(root: Locator): Promise<PCAState> { return JSON.parse((await root.getAttribute('data-state'))!); }
async function scalar(root: Locator, name: string, value: number) { const el = root.locator(`[data-scalar="${name}"]`); near(Number(await el.getAttribute('data-number')), value); }
async function stateAndGeometry(root: Locator) {
  const state = await current(root), expected = pca(state);
  const svg = root.locator('[data-pca-plane]'); await svg.scrollIntoViewIfNeeded();
  const scale = Number(await svg.getAttribute('data-scale')), origin = Number(await svg.getAttribute('data-origin'));
  for (const [i, point] of state.points.entries()) {
    const handle = root.locator(`[data-point-handle="${point.id}"]`);
    near(Number(await handle.getAttribute('data-x')), point.x[0]); near(Number(await handle.getAttribute('cx')), origin + scale * point.x[0]);
    near(Number(await handle.getAttribute('cy')), origin - scale * point.x[1]);
    const row = root.locator(`[data-source-row="${point.id}"]`);
    expect(JSON.parse((await row.getAttribute('data-x'))!)).toEqual(point.x);
    if (expected.status === 'defined') {
      const numerical = expected.rows[i]!;
      const reconstructed = JSON.parse((await row.getAttribute('data-reconstruction'))!) as number[];
      reconstructed.forEach((v, j) => near(v, numerical.reconstructed[j]!));
      const residual = JSON.parse((await row.getAttribute('data-residual-vector'))!) as number[];
      residual.forEach((v, j) => near(v, point.x[j]! - reconstructed[j]!));
      near(Number(await row.getAttribute('data-squared-error')), residual.reduce((sum, v) => sum + v * v, 0));
      expect(JSON.parse((await row.getAttribute('data-scores'))!)).toHaveLength(state.k);
      const line = root.locator(`[data-residual="${point.id}"]`), shadow = root.locator(`[data-shadow="${point.id}"]`);
      near(Number(await line.getAttribute('x1')), origin + scale * point.x[0], 1e-6); near(Number(await line.getAttribute('y1')), origin - scale * point.x[1], 1e-6);
      near(Number(await line.getAttribute('x2')), origin + scale * reconstructed[0]!, 1e-6); near(Number(await line.getAttribute('y2')), origin - scale * reconstructed[1]!, 1e-6);
      near(Number(await shadow.getAttribute('x')) + 6, origin + scale * reconstructed[0]!, 1e-6);
      near(Number(await shadow.getAttribute('y')) + 6, origin - scale * reconstructed[1]!, 1e-6);
    } else { await expect(row).not.toHaveAttribute('data-reconstruction', /.+/); }
  }
  if (expected.status === 'defined') {
    await scalar(root, 'sse', expected.sse); await scalar(root, 'mse', expected.mse); await scalar(root, 'entry-mse', expected.entryMse);
    for (const [j, v] of expected.axes.entries()) {
      const line = root.locator(`[data-principal-axis="${j}"]`), painted = JSON.parse((await line.getAttribute('data-vector'))!) as number[];
      painted.forEach((value, h) => near(value, v[h]!));
      const dx = Number(await line.getAttribute('x2')) - Number(await line.getAttribute('x1'));
      const dy = Number(await line.getAttribute('y2')) - Number(await line.getAttribute('y1'));
      near(dx, 14 * scale * v[0], 1e-6); near(dy, -14 * scale * v[1], 1e-6);
      expect(await line.evaluate(el => getComputedStyle(el).stroke)).not.toBe('none');
    }
    // An independent batch sum from DOM residual vectors verifies scalar aggregation.
    const errors = await root.locator('[data-source-row]').evaluateAll(rows => rows.map(row => Number(row.getAttribute('data-squared-error'))));
    await scalar(root, 'sse', errors.reduce((sum, v) => sum + v, 0));
  } else { await expect(root.locator('[data-principal-axis]')).toHaveCount(0); await expect(root.locator('[data-shadow]')).toHaveCount(0); }
  const painted = await root.locator('.p06-point').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).fill));
  expect(painted.every(fill => !['none', 'transparent', 'rgba(0, 0, 0, 0)'].includes(fill))).toBe(true);
}
async function layout(page: Page, root: Locator) {
  await page.evaluate(async () => { await document.fonts.ready; }); const width = page.viewportSize()!.width;
  const actual = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, inner: innerWidth }));
  expect(actual.document).toBeLessThanOrEqual(width + 1); expect(actual.inner).toBeLessThanOrEqual(width + 1);
  const box = (await root.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(-1); expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
  const inspector = await root.locator('.inspector').evaluate(el => {
    const b = el.getBoundingClientRect();
    return [...el.querySelectorAll('dt,dd')].map(child => { const c = child.getBoundingClientRect(); return { left: c.left - b.left, right: c.right - b.right, whitespace: getComputedStyle(child).whiteSpace }; });
  });
  for (const cell of inspector) { expect(cell.left).toBeGreaterThanOrEqual(-1); expect(cell.right).toBeLessThanOrEqual(1); expect(cell.whitespace).not.toBe('nowrap'); }
  for (const node of await root.locator('button,select,input,fieldset,legend').all()) {
    const b = (await node.boundingBox())!; expect(b.x).toBeGreaterThanOrEqual(box.x - 1); expect(b.x + b.width).toBeLessThanOrEqual(box.x + box.width + 1);
  }
  await root.locator('svg').scrollIntoViewIfNeeded();
  const sizes = await root.locator('svg text').evaluateAll(texts => texts.map(text => { const matrix = (text as SVGGraphicsElement).getScreenCTM()!; return parseFloat(getComputedStyle(text).fontSize) * Math.hypot(matrix.a, matrix.b); }));
  expect(sizes.length).toBeGreaterThan(0); sizes.forEach(size => expect(size).toBeGreaterThanOrEqual(13.99));
  for (const handle of await root.locator('[data-point-handle]').all()) { const b = (await handle.boundingBox())!; expect(b.width).toBeGreaterThanOrEqual(44); expect(b.height).toBeGreaterThanOrEqual(44); }
  for (const wrapper of await page.locator('article .table-scroll').all()) {
    const b = (await wrapper.boundingBox())!; expect(b.x).toBeGreaterThanOrEqual(-1); expect(b.x + b.width).toBeLessThanOrEqual(width + 1);
    if (await wrapper.evaluate(el => el.scrollWidth > el.clientWidth + 1)) {
      await expect(wrapper).toHaveAttribute('tabindex', '0'); await expect(wrapper).toHaveAttribute('role', 'region');
      await expect(wrapper).toHaveAttribute('aria-label', /scrollable/); await wrapper.scrollIntoViewIfNeeded(); await wrapper.focus(); await wrapper.press('ArrowRight');
      await expect.poll(() => wrapper.evaluate(el => el.scrollLeft)).toBeGreaterThan(0); await wrapper.evaluate(el => { el.scrollLeft = 0; });
    } else { await expect(wrapper).toHaveAttribute('tabindex', '-1'); await expect(wrapper).not.toHaveAttribute('role', /.+/); }
  }
  expect(await page.locator('article table').evaluateAll(tables => tables.filter(table => !table.closest('.table-scroll')).length)).toBe(0);
}

for (const [slug, mode] of chapters) for (const theme of ['light', 'dark']) test(`${slug}: literal opening state, painted geometry, all viewport bounds in ${theme}`, async ({ page }) => {
  const root = await open(page, slug, mode); await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
  await scalar(root, 'lambda1', 6); await scalar(root, 'lambda2', 2 / 3); await scalar(root, 'retained', .9);
  await scalar(root, 'sse', 2); await scalar(root, 'mse', .5); await scalar(root, 'entry-mse', .25);
  await stateAndGeometry(root); await layout(page, root); await expect(root.locator('[data-provenance]')).toContainText('Hand-authored');
  await expect(page.locator('.code-file code')).toContainText('def pca'); await expect(page.locator('.prerequisites a').first()).toBeVisible();
});

test('normalization and k change real covariance/eigen/score/residual state', async ({ page }) => {
  const root = await open(page); await root.getByRole('combobox', { name: 'Covariance normalization' }).selectOption('population');
  await scalar(root, 'lambda1', 4.5); await scalar(root, 'lambda2', .5); await scalar(root, 'sse', 2);
  await root.getByRole('combobox', { name: 'Retained components k' }).selectOption('0'); await scalar(root, 'sse', 20); await scalar(root, 'retained', 0); await stateAndGeometry(root);
  await root.getByRole('combobox', { name: 'Retained components k' }).selectOption('2'); await scalar(root, 'sse', 0); await scalar(root, 'retained', 1);
  for (const row of await root.locator('[data-source-row]').all()) expect(await row.getAttribute('data-x')).toBe(await row.getAttribute('data-reconstruction'));
  await stateAndGeometry(root);
});

test('keyboard, numeric, pointer and touch edits use the same displayed state', async ({ page, context }, info) => {
  const root = await open(page), handle = root.locator('[data-point-handle=a]'); await handle.scrollIntoViewIfNeeded(); await handle.focus();
  await handle.press('Shift+ArrowRight'); await expect(handle).toBeFocused(); const keyboard = await current(root);
  await root.getByRole('button', { name: 'Reset experiment' }).click(); await commit(root, 'Point x', '-1.5'); expect(await current(root)).toEqual(keyboard);
  await root.getByRole('button', { name: 'Reset experiment' }).click(); await handle.scrollIntoViewIfNeeded();
  const box = (await root.locator('svg').boundingBox())!;
  const from = { x: box.x + (320 - 64) * box.width / 640, y: box.y + (320 + 32) * box.height / 640 };
  const to = { x: from.x + 16 * box.width / 640, y: from.y };
  if (info.project.use.hasTouch) {
    const session = await context.newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...from, id: 0 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...to, id: 0 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await session.detach();
  } else { await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 4 }); await page.mouse.up(); }
  await expect.poll(() => current(root)).toEqual(keyboard); await stateAndGeometry(root);
  await expect(root.locator('[data-announcement]')).toContainText('Drag finished.');
});

test('invalid numeric edits preserve state and reset clears drafts without changing focus on valid edits', async ({ page }) => {
  const root = await open(page); await commit(root, 'Point x', '.123456789'); await expect(field(root, 'Point x')).toBeFocused();
  await field(root, 'Point x').press('ArrowUp'); await expect(field(root, 'Point x')).toBeFocused();
  near((await current(root)).points[0]!.x[0], .123456789 + .1); const previous = await current(root);
  for (const invalid of ['NaN', 'Infinity', '6', '1oops', '']) {
    await commit(root, 'Point x', invalid); await expect(field(root, 'Point x')).toHaveAttribute('aria-invalid', 'true'); expect(await current(root)).toEqual(previous);
  }
  await root.getByRole('button', { name: 'Reset experiment' }).click(); await expect(root.locator('[aria-invalid=true]')).toHaveCount(0);
  await expect(field(root, 'Point x')).toHaveValue('-2'); await scalar(root, 'sse', 2);
});

test('replay is immutable, edits fork selected k and reset invalidates a pending pointer gesture', async ({ page }) => {
  const root = await open(page); await root.getByRole('button', { name: 'Replay k = 0, 1, 2' }).click();
  const nav = root.getByRole('navigation', { name: 'Trace playback' });
  for (const [k, sse] of [20, 2, 0].entries()) { await expect(root).toHaveAttribute('data-k', String(k)); await scalar(root, 'sse', sse); await stateAndGeometry(root); if (k < 2) await nav.getByRole('button', { name: 'Next', exact: true }).click(); }
  await nav.getByRole('button', { name: 'First' }).click(); await commit(root, 'Point y', '0'); await expect(nav).toHaveCount(0); await expect(root).toHaveAttribute('data-k', '0');
  await stateAndGeometry(root); await root.getByRole('button', { name: 'Reset experiment' }).click();
  const handle = root.locator('[data-point-handle=a]'); await handle.scrollIntoViewIfNeeded(); const b = (await handle.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  const reset = root.getByRole('button', { name: 'Reset experiment' }); await reset.focus(); await reset.press('Enter');
  await page.mouse.move(b.x + b.width / 2 + 30, b.y + b.height / 2 + 30); await page.mouse.up();
  await expect(field(root, 'Point x')).toHaveValue('-2'); await scalar(root, 'sse', 2);
});

test('line, repeated, zero-spread and singleton cases keep ambiguity and undefined arithmetic visible', async ({ page }) => {
  const root = await open(page);
  await root.getByRole('button', { name: 'Use line cloud' }).click(); await scalar(root, 'lambda2', 0); await scalar(root, 'sse', 0); await stateAndGeometry(root);
  await root.getByRole('button', { name: 'Use isotropic cloud' }).click(); await expect(root.locator('[data-ambiguity]')).toContainText('no unique principal axis'); await scalar(root, 'retained', .5); await stateAndGeometry(root);
  await root.getByRole('button', { name: 'Use constant cloud' }).click(); await scalar(root, 'sse', 0); await expect(root.locator('[data-scalar=retained]')).toContainText('Undefined');
  await expect(root.locator('[data-scalar=retained]')).not.toHaveAttribute('data-number', /.+/); await stateAndGeometry(root); await layout(page, root);
  await root.getByRole('button', { name: 'Use singleton cloud' }).click(); await expect(root).toHaveAttribute('data-status', 'undefined');
  await expect(root.locator('[data-scalar=sse]')).not.toHaveAttribute('data-number', /.+/); await expect(root.locator('[data-ambiguity]')).toContainText('n−1 is zero'); await stateAndGeometry(root);
  await root.getByRole('combobox', { name: 'Covariance normalization' }).selectOption('population'); await scalar(root, 'sse', 0);
  await expect(root.locator('[data-ambiguity]')).toContainText('Zero spread'); await stateAndGeometry(root); await layout(page, root);
});

for (const [slug, mode] of chapters) test(`${slug}: corrective exercise feedback and full prose/table width in both themes`, async ({ page }) => {
  const root = await open(page, slug, mode); const exercises = page.locator('[data-exercise]'); await expect(exercises).toHaveCount(5);
  for (const exercise of await exercises.all()) {
    await exercise.getByRole('radio').nth(1).check(); await exercise.getByRole('button', { name: 'Check answer' }).click(); await expect(exercise.getByRole('status')).toContainText('Try again.');
    await exercise.getByRole('radio').first().check(); await exercise.getByRole('button', { name: 'Check answer' }).click(); await expect(exercise.getByRole('status')).toContainText('Correct.');
  }
  await expect(page.locator('[data-p06-prose-table]')).toHaveCount(1);
  for (const theme of ['light', 'dark']) { await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme); await layout(page, root); }
});

test('two real touch pointers on one handle cannot move or finish each other’s drag', async ({ page, context }) => {
  const root = await open(page); await root.locator('svg').scrollIntoViewIfNeeded();
  const box = (await root.locator('svg').boundingBox())!;
  const x = box.x + 256 * box.width / 640, y = box.y + 352 * box.height / 640;
  const first = { id: 33, x, y }, second = { id: 44, x, y };
  const initial = await current(root), session = await context.newCDPSession(page);
  const captured = (await root.locator('[data-point-handle=a]').elementHandle())!;
  await captured.evaluate(node => {
    node.setAttribute('data-native-pointers', '[]'); node.setAttribute('data-native-cancels', '[]');
    for (const [type, attribute] of [['pointerdown', 'data-native-pointers'], ['pointercancel', 'data-native-cancels']]) {
      node.addEventListener(type!, event => {
        const ids = JSON.parse(node.getAttribute(attribute!)!) as number[];
        node.setAttribute(attribute!, JSON.stringify([...ids, (event as PointerEvent).pointerId]));
      });
    }
  });
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first, second] });
  const pointers = await captured.evaluate(node => JSON.parse(node.getAttribute('data-native-pointers')!) as number[]);
  expect(pointers).toHaveLength(2); const latest = pointers[1]!;
  const hasLatestCapture = () => captured.evaluate((node, pointer) =>
    node.isConnected && node === document.querySelector('[data-point-handle=a]') && (node as SVGCircleElement).hasPointerCapture(pointer), latest);
  await expect.poll(hasLatestCapture).toBe(true);
  // Latest down owns the drag. A removed touch is released with touchMove containing only the active touch.
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...first, x: x + 48 * box.width / 640 }, second] });
  expect(await current(root)).toEqual(initial); await expect.poll(hasLatestCapture).toBe(true);
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [second] });
  expect(await current(root)).toEqual(initial); await expect.poll(hasLatestCapture).toBe(true);
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...second, x: x + 16 * box.width / 640 }] });
  await expect.poll(async () => (await current(root)).points[0]!.x[0]).toBe(-1.5); await expect.poll(hasLatestCapture).toBe(true);
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...second, x: x + 64 * box.width / 640 }] });
  await expect.poll(async () => (await current(root)).points[0]!.x[0]).toBe(0); await expect.poll(hasLatestCapture).toBe(true);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(hasLatestCapture).toBe(false);
  expect(await captured.evaluate(node => JSON.parse(node.getAttribute('data-native-cancels')!))).toEqual([]);
  await expect(root.locator('[data-announcement]')).toContainText('Drag finished.'); await stateAndGeometry(root);
  // A native swipe on blank SVG space must still scroll the page, outside the handle-only prevention.
  const blank = (await root.locator('svg').boundingBox())!, before = await page.evaluate(() => scrollY);
  const outside = { id: 55, x: blank.x + 600 * blank.width / 640, y: blank.y + 600 * blank.height / 640 };
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [outside] });
  for (const distance of [20, 40, 60, 80])
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...outside, y: outside.y - distance }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before); await session.detach();
});

test('the point selector brings an overlapping touch target forward without detaching an active drag', async ({ page }) => {
  const root = await open(page);
  for (const id of ['a', 'b', 'c', 'd']) {
    await root.getByRole('combobox', { name: 'Selected point' }).selectOption(id);
    const handle = root.locator(`[data-point-handle="${id}"]`); await handle.scrollIntoViewIfNeeded();
    const b = (await handle.boundingBox())!;
    const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.getAttribute('data-point-handle'), { x: b.x + b.width / 2, y: b.y + b.height / 2 });
    expect(hit).toBe(id);
  }
});
