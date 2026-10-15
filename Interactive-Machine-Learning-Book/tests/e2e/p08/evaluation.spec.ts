import { expect, test, type Locator, type Page } from '@playwright/test';
import { experiment, initial, type State } from '../../../src/parts/p08/model/evaluation';
const chapters = [
  ['cross-validation-hyperparameter-tuning', 'folds'], ['learning-curves-model-selection', 'curves'],
  ['imbalance-calibration-metrics', 'metrics'], ['preprocessing-feature-pipelines', 'pipeline'], ['reproducibility-numerical-reliability', 'reliability'],
] as const;
const field = (root: Locator, name: string) => root.getByRole('textbox', { name: new RegExp('^' + name + '(?: |$)') });
async function commit(root: Locator, name: string, value: string) { const input = field(root, name); await input.fill(value); await input.press('Enter'); }
async function open(page: Page, i = 0) {
  const [slug, mode] = chapters[i]!; await page.goto(`chapters/${slug}/`);
  const root = page.locator(`[data-evaluation-lab="${mode}"]`); await expect(page.locator('astro-island[ssr]')).toHaveCount(0); await expect(root).toBeVisible(); return root;
}
async function state(root: Locator): Promise<State> { return JSON.parse((await root.getAttribute('data-state'))!); }
async function numerical(root: Locator): Promise<ReturnType<typeof experiment>> { return JSON.parse((await root.getAttribute('data-numerical'))!); }
function near(actual: number, expected: number, tolerance = 2e-12) { expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance * (1 + Math.abs(expected))); }
async function scalar(root: Locator, name: string, expected: number) { near(Number(await root.locator(`[data-scalar="${name}"]`).getAttribute('data-number')), expected); }
async function semanticState(root: Locator) {
  const s = await state(root), result = await numerical(root), expected = experiment(s);
  expect(result).toEqual(JSON.parse(JSON.stringify(expected)));
  await expect(root.locator('[data-membership="test"]')).toHaveText(expected.board.test.join(', '));
  await expect(root.locator('[data-membership="development"]')).toHaveText(expected.board.development.join(', '));
  for (const c of expected.candidates) if (await root.locator(`[data-candidate="${c.power}:${c.penalty}"]`).count()) near(Number(await root.locator(`[data-candidate="${c.power}:${c.penalty}"]`).getAttribute('data-cv')), c.meanValidation);
  for (const [i, c] of expected.curves.entries()) if (await root.locator(`[data-curve-training="${c.n}"]`).count()) {
    const dot = root.locator(`[data-curve-training="${c.n}"]`), square = root.locator(`[data-curve-validation="${c.n}"]`);
    near(Number(await dot.getAttribute('data-mse')), c.model.trainingMse); near(Number(await square.getAttribute('data-mse')), c.validation.mse);
    const max = Math.max(1, ...expected.curves.flatMap(p => [p.model.trainingMse, p.validation.mse]));
    near(Number(await dot.getAttribute('cx')), 90 + 460 * c.n / expected.curves.at(-1)!.n);
    near(Number(await dot.getAttribute('cy')), 245 - 180 * c.model.trainingMse / max, 1e-6);
    near(Number(await square.getAttribute('y')) + 6, 245 - 180 * c.validation.mse / max, 1e-6);
    expect(c.model.preprocessing.fitIds).toEqual(c.ids); expect(c.ids.some(id => expected.board.test.includes(id))).toBe(false);
    if (i) expect(expected.curves[i - 1]!.ids.every(id => c.ids.includes(id))).toBe(true);
  }
  for (const b of expected.metrics.bins) if (b.count && await root.locator(`[data-reliability-bin="${b.low}"]`).count()) {
    const point = root.locator(`[data-reliability-bin="${b.low}"]`); near(Number(await point.getAttribute('cx')), 90 + 460 * b.meanProbability!, 1e-6); near(Number(await point.getAttribute('cy')), 245 - 180 * b.frequency!, 1e-6);
  }
  await expect(root.locator(`[data-workflow-phase="${s.phase}"]`)).toHaveAttribute('data-active', 'true');
}
async function layout(page: Page, root: Locator) {
  await page.evaluate(async () => { await document.fonts.ready; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  const box = (await root.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(-1); expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  for (const control of await root.locator('button,select,input').all()) { const b = (await control.boundingBox())!; expect(b.height).toBeGreaterThanOrEqual(44); expect(b.x).toBeGreaterThanOrEqual(box.x - 1); expect(b.x + b.width).toBeLessThanOrEqual(box.x + box.width + 1); }
  const fonts = await root.locator('svg text').evaluateAll(nodes => nodes.map(node => {
    const matrix = (node as SVGGraphicsElement).getScreenCTM()!;
    return parseFloat(getComputedStyle(node).fontSize) * Math.hypot(matrix.a, matrix.b);
  })); expect(fonts.length).toBeGreaterThan(0); fonts.forEach(size => expect(size).toBeGreaterThanOrEqual(13.99));
  for (const wrapper of await root.locator('.table-scroll').all()) {
    const b = (await wrapper.boundingBox())!; expect(b.x).toBeGreaterThanOrEqual(box.x - 1); expect(b.x + b.width).toBeLessThanOrEqual(box.x + box.width + 1);
    if (await wrapper.evaluate(el => el.scrollWidth > el.clientWidth + 1)) {
      await expect(wrapper).toHaveAttribute('tabindex', '0'); await expect(wrapper).toHaveAttribute('role', 'region'); await expect(wrapper).toHaveAttribute('aria-label', /scrollable/);
      await wrapper.scrollIntoViewIfNeeded(); await wrapper.focus(); await wrapper.press('ArrowRight'); await expect.poll(() => wrapper.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    }
  }
}
for (const [i, [slug]] of chapters.entries()) for (const theme of ['light', 'dark']) test(`${slug}: authoritative state and accessible layout in ${theme}`, async ({ page }) => {
  const root = await open(page, i); await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
  expect(await state(root)).toEqual(JSON.parse(JSON.stringify(initial()))); await semanticState(root); await layout(page, root);
  await expect(page.locator('.stage').first().locator('[data-state]')).toHaveCount(1);
  await expect(page.locator('.code-file code')).toContainText('def experiment'); await expect(page.locator('.prerequisites a').first()).toBeVisible();
  await root.getByRole('button', { name: 'Reveal final test' }).click(); await semanticState(root);
  const n = await numerical(root); near(Number(await root.locator('[data-final-mse]').getAttribute('data-number')), n.test.mse);
  expect(n.final.preprocessing.fitIds).toEqual(n.board.development); expect(n.final.trainIds).toEqual(n.board.development);
});

test('seed numeric and keyboard edits replay exact splits; invalid drafts preserve state', async ({ page }) => {
  const root = await open(page); await commit(root, 'Split seed', '0'); await semanticState(root);
  await field(root, 'Split seed').press('ArrowUp'); expect((await state(root)).seed).toBe(1);
  const before = await state(root);
  for (const bad of ['NaN', 'Infinity', '-1', '4294967296', '7oops', '']) {
    await commit(root, 'Split seed', bad); await expect(field(root, 'Split seed')).toHaveAttribute('aria-invalid', 'true'); expect(await state(root)).toEqual(before);
  }
  await commit(root, 'Split seed', '1.5'); await expect(field(root, 'Split seed')).toHaveAttribute('aria-invalid', 'true'); expect(await state(root)).toEqual(before);
  await root.getByRole('button', { name: 'Reset experiment' }).click(); expect(await state(root)).toEqual(JSON.parse(JSON.stringify(initial()))); await expect(root.locator('[aria-invalid=true]')).toHaveCount(0);
  await root.getByRole('combobox', { name: 'Development folds' }).selectOption('4'); expect((await numerical(root)).board.folds).toHaveLength(4); await semanticState(root);
});

test('test target and feature changes have no selection or curve influence', async ({ page }) => {
  const root = await open(page, 1), before = await numerical(root), id = before.board.test[0]!;
  await root.getByRole('combobox', { name: 'Selected row' }).selectOption(id); await commit(root, 'Target y', '-20');
  await commit(root, 'Feature x', '20'); const after = await numerical(root);
  for (const key of ['candidates', 'selected', 'final', 'curves', 'leakage'] as const) expect(after[key]).toEqual(before[key]);
  expect(after.test).not.toEqual(before.test); await semanticState(root);
});

test('threshold equality, undefined denominators and probability editing change genuine metrics', async ({ page }) => {
  const root = await open(page, 2); await scalar(root, 'tp', 2); await scalar(root, 'fp', 2); await scalar(root, 'brier', .195);
  await commit(root, 'Decision threshold', '1'); await expect(root.locator('[data-scalar=precision]')).toContainText('Undefined'); await expect(root.locator('[data-scalar=precision]')).not.toHaveAttribute('data-number', /.+/); await scalar(root, 'recall', 0); await scalar(root, 'brier', .195);
  await root.getByRole('combobox', { name: 'Probability row' }).selectOption('m7'); await commit(root, 'Probability p', '0'); await expect(root.locator('[data-scalar=log-loss]')).toContainText('Unbounded'); await semanticState(root);
  await root.getByRole('button', { name: 'Use all-negative data' }).click(); await expect(root.locator('[data-scalar=recall]')).toContainText('Undefined'); await expect(root.locator('[data-scalar=balanced]')).toContainText('Undefined');
});

test('proper/leaked comparison calculates actual held-out transformations', async ({ page }) => {
  const root = await open(page, 3), before = await numerical(root);
  await scalar(root, 'proper-mse', before.leakage.properScore.mse); await scalar(root, 'leaked-mse', before.leakage.leakedScore.mse); await scalar(root, 'leakage-difference', before.leakage.difference);
  const id = before.board.folds[0]!.validation.find(id => (initial().rows.find(r => r.id === id)!.x[0]) !== null)!;
  await root.getByRole('combobox', { name: 'Selected row' }).selectOption(id); await commit(root, 'Feature x', '20'); const after = await numerical(root);
  expect(after.leakage.proper.preprocessing).toEqual(before.leakage.proper.preprocessing); expect(after.leakage.leaked.preprocessing).not.toEqual(before.leakage.leaked.preprocessing);
  expect(after.leakage.proper.trainIds).toEqual(after.leakage.leaked.trainIds); await semanticState(root);
});

test('workflow replay is immutable and edits start at the displayed phase', async ({ page }) => {
  const root = await open(page, 4); await root.getByRole('button', { name: 'Replay split to final test' }).click();
  const nav = root.getByRole('navigation', { name: 'Trace playback' });
  for (let phase = 0; phase < 5; phase++) { expect((await state(root)).phase).toBe(phase); await semanticState(root); if (phase < 4) await nav.getByRole('button', { name: 'Next', exact: true }).click(); }
  await nav.getByRole('button', { name: 'First', exact: true }).click(); await nav.getByRole('button', { name: 'Next', exact: true }).click();
  await commit(root, 'Split seed', '31'); await expect(nav).toHaveCount(0); expect((await state(root)).phase).toBe(1);
  await root.getByRole('button', { name: 'Reset experiment' }).click(); expect(await state(root)).toEqual(JSON.parse(JSON.stringify(initial())));
  await scalar(root, 'left', 1); await scalar(root, 'right', 0); await scalar(root, 'fragile', 0);
  const stable = Number(await root.locator('[data-scalar=stable]').getAttribute('data-number')); expect(Math.abs(stable / 5e-9 - 1)).toBeLessThan(2e-12);
});

test('expanded complete provenance is a labeled keyboard scroll region', async ({ page }) => {
  const root = await open(page, 4);
  const summary = root.getByText('Complete experiment provenance and parameters', { exact: true }); await summary.focus(); await summary.press('Enter');
  const record = root.getByRole('region', { name: 'Complete experiment provenance JSON, scrollable' }); await expect(record).toBeVisible(); await expect(record).toHaveAttribute('tabindex', '0');
  const text = JSON.parse((await record.textContent())!); expect(text.state).toEqual(await state(root)); expect(text.developmentFit.preprocessing.fitIds).toEqual((await numerical(root)).board.development);
  expect(text.board).toEqual((await numerical(root)).board);
  await expect(record.locator('[role="region"]')).toHaveCount(0);
  await record.focus(); await expect(record).toBeFocused(); await record.press('ArrowDown'); await expect.poll(() => record.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  if (await record.evaluate(el => el.scrollWidth > el.clientWidth + 1)) { await record.press('ArrowRight'); await expect.poll(() => record.evaluate(el => el.scrollLeft)).toBeGreaterThan(0); }
  await layout(page, root);
});

for (const [i, [slug]] of chapters.entries()) test(`${slug}: all five exercises give corrective feedback`, async ({ page }) => {
  await open(page, i); const exercises = page.locator('[data-exercise]'); await expect(exercises).toHaveCount(5);
  for (const exercise of await exercises.all()) {
    await exercise.getByRole('radio').nth(1).check(); await exercise.getByRole('button', { name: 'Check answer' }).click(); await expect(exercise.getByRole('status')).toContainText('Try again.');
    await exercise.getByRole('radio').first().check(); await exercise.getByRole('button', { name: 'Check answer' }).click(); await expect(exercise.getByRole('status')).toContainText('Correct.');
  }
});

test('touch preset, selector and reset paths preserve native surrounding scroll', async ({ page }, info) => {
  const root = await open(page, 1); const control = root.getByRole('button', { name: 'Use constant data' }); await control.scrollIntoViewIfNeeded();
  if (info.project.use.hasTouch) await control.tap(); else await control.click();
  expect((await numerical(root)).selected).toEqual({ power: 1, penalty: 0 }); await semanticState(root);
  const reset = root.getByRole('button', { name: 'Reset experiment' }); if (info.project.use.hasTouch) await reset.tap(); else await reset.click();
  expect(await state(root)).toEqual(JSON.parse(JSON.stringify(initial())));
  const touchActions = await root.evaluate(el => [el, ...el.querySelectorAll('svg')].map(node => getComputedStyle(node).touchAction)); expect(touchActions).not.toContain('none');
});
