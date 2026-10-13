import { expect, test, type Locator, type Page } from '@playwright/test';
import fixture from '../../../fixtures/p02/remainder.fixtures.json';

const shown = (v: number) => `≈ ${Math.abs(v) > 0 && (Math.abs(v) < .00005 || Math.abs(v) >= 1e6) ? v.toExponential(4).replace('-', '−') : String(Number(v.toFixed(4)) + 0).replace('-', '−')}`;
const field = (root: Locator, label: string) => root.getByRole('textbox', { name: new RegExp(`^${label}(?:$|\\s)`) });
async function commit(root: Locator, label: string, value: string) { const input = field(root, label); await input.fill(value); await input.press('Enter'); }
async function open(page: Page, slug: string, selector: string) {
  await page.goto(`chapters/${slug}/`);
  const root = page.locator(selector); await expect(root).toBeVisible();
  await expect.poll(() => root.evaluate(el => !el.closest('astro-island')?.hasAttribute('ssr'))).toBe(true);
  return root;
}
async function scalar(root: Locator, key: string, value: number) {
  const node = root.locator(`[data-value="${key}"]`);
  expect(Number(await node.getAttribute('data-number'))).toBeCloseTo(value, 10);
  await expect(node).toHaveText(shown(value));
}
async function fitParity(root: Locator) {
  const snapshot = await root.evaluate(el => ({
    mode: el.getAttribute('data-fit-lab')!, coefficients: JSON.parse(el.getAttribute('data-coefficients')!) as number[], mse: Number(el.getAttribute('data-mse')),
    rows: [...el.querySelectorAll('[data-fit-row]')].map(row => ({ id: row.getAttribute('data-fit-row')!, x: Number(row.getAttribute('data-x')), y: Number(row.getAttribute('data-y')), prediction: Number(row.getAttribute('data-prediction')), residual: Number(row.getAttribute('data-residual')), features: JSON.parse(row.querySelectorAll('td')[1]!.textContent!) as number[] })),
    scale: Number(el.querySelector('[data-fit-plot]')!.getAttribute('data-scale')),
    points: [...el.querySelectorAll('[data-fit-point]')].map(p => ({ id: p.getAttribute('data-fit-point')!, cx: Number(p.getAttribute('data-cx')), cy: Number(p.getAttribute('data-cy')), py: Number(p.getAttribute('data-py')) })),
  }));
  let error = 0;
  for (const r of snapshot.rows) {
    const prediction = r.features.reduce((sum, x, j) => sum + x * snapshot.coefficients[j]!, 0), residual = prediction - r.y;
    expect(r.prediction).toBeCloseTo(prediction, 9); expect(r.residual).toBeCloseTo(residual, 9); error += residual * residual;
    const p = snapshot.points.find(p => p.id === r.id)!;
    expect(p.cx).toBeCloseTo(280 + snapshot.scale * r.x, 9); expect(p.cy).toBeCloseTo(280 - snapshot.scale * r.y, 9); expect(p.py).toBeCloseTo(280 - snapshot.scale * prediction, 9);
    const cells = root.locator(`[data-fit-row="${r.id}"] td`); await expect(cells.nth(3)).toHaveText(shown(prediction)); await expect(cells.nth(4)).toHaveText(shown(residual));
  }
  expect(snapshot.mse).toBeCloseTo(error / snapshot.rows.length, 9);
  await scalar(root, 'mse', snapshot.mse);
  return snapshot;
}
async function countParity(root: Locator) {
  const threshold = await root.getAttribute('data-threshold');
  const rows = await root.locator('[data-score-row]').evaluateAll(nodes => nodes.map(row => ({ score: Number(row.getAttribute('data-score')), label: Number(row.getAttribute('data-label')), prediction: Number(row.getAttribute('data-prediction')), cell: row.querySelector('td:last-child')!.textContent! })));
  const counts = { TP: 0, FP: 0, TN: 0, FN: 0 };
  for (const r of rows) {
    const predicted = Number(threshold !== 'above-all' && r.score >= Number(threshold)); expect(r.prediction).toBe(predicted);
    const cell = predicted ? (r.label ? 'TP' : 'FP') : (r.label ? 'FN' : 'TN'); expect(r.cell).toBe(cell); counts[cell]++;
  }
  for (const [cell, value] of Object.entries(counts)) { const element = root.locator(`[data-count="${cell}"]`); await expect(element).toHaveText(String(value)); await expect(element).toHaveAttribute('data-number', String(value)); }
  return { rows, counts };
}
async function logisticParity(root: Locator) {
  const b = Number(await field(root, 'Intercept b').inputValue()), w = Number(await field(root, 'Weight w').inputValue());
  const rows = await root.locator('[data-score-row]').evaluateAll(nodes => nodes.map(r => ({ x: Number(r.querySelector('td')!.textContent), label: Number(r.getAttribute('data-label')), z: Number(r.getAttribute('data-logit')), p: Number(r.getAttribute('data-score')), loss: Number(r.getAttribute('data-loss')) })));
  let loss = 0, db = 0, dw = 0;
  for (const r of rows) {
    const z = b + w * r.x, p = 1 / (1 + Math.exp(-z));
    const l = Math.max(0, z) - z * r.label + Math.log1p(Math.exp(-Math.abs(z)));
    expect(r.z).toBeCloseTo(z, 11); expect(r.p).toBeCloseTo(p, 11); expect(r.loss).toBeCloseTo(l, 11);
    loss += l / rows.length; db += (p - r.label) / rows.length; dw += r.x * (p - r.label) / rows.length;
  }
  await scalar(root, 'loss', loss); await countParity(root);
  return { b, w, loss, db, dw };
}

for (const theme of ['light', 'dark'] as const) test(`all nine mechanisms preserve active numbers and readable geometry in ${theme}`, async ({ page }) => {
  test.slow();
  await page.emulateMedia({ colorScheme: theme });
  for (const [slug, mode] of [['least-squares', 'least-squares'], ['regression-gradient-descent', 'descent'], ['multiple-linear-regression', 'multiple'], ['polynomial-features', 'polynomial'], ['regularization', 'regularization']]) {
    const root = await open(page, slug!, `[data-fit-lab="${mode}"]`); await fitParity(root);
    await expect.poll(() => root.locator('[data-fit-plot]').evaluate(svg => {
      const width = svg.getBoundingClientRect().width, text = svg.querySelector('text')!;
      return parseFloat(getComputedStyle(text).fontSize) * width / 560;
    })).toBeGreaterThanOrEqual(13.9);
    expect(await root.locator('[data-fit-plot]').evaluate(svg => Math.abs(svg.getBoundingClientRect().width - svg.getBoundingClientRect().height))).toBeLessThan(.1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  for (const [slug, mode] of [['logistic-regression', 'logistic'], ['thresholds-confusion', 'threshold'], ['precision-recall-roc', 'metrics'], ['softmax-regression', 'softmax']]) {
    const root = await open(page, slug!, `[data-classification-lab="${mode}"]`);
    if (mode === 'logistic') await logisticParity(root);
    else if (mode !== 'softmax') await countParity(root);
    else await scalar(root, 'loss', fixture.multi[0]!.expected.loss);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});

test('closed form, constant variance, exact numeric precision and reset are distinct actions', async ({ page }) => {
  const root = await open(page, 'least-squares', '[data-fit-lab]');
  await root.getByRole('button', { name: 'Set constant x' }).click();
  expect((await fitParity(root)).coefficients).toEqual([0, .5]);
  await expect(root.locator('[data-optimum]')).toContainText('Zero x-variance');
  await root.getByRole('button', { name: 'Apply closed-form fit' }).click();
  expect((await fitParity(root)).coefficients).toEqual([.8, 0]);
  await root.getByRole('button', { name: 'Reset experiment' }).click();
  await commit(root, 'Observation x', '0.123456789123');
  expect(Number(await field(root, 'Observation x').inputValue())).toBe(.123456789123);
  await field(root, 'Observation x').press('ArrowUp');
  expect(Number(await field(root, 'Observation x').inputValue())).toBe(.123456789123 + .1);
  const before = await fitParity(root); await commit(root, 'Observation target', 'NaN');
  await expect(field(root, 'Observation target')).toHaveAttribute('aria-invalid', 'true'); expect(await fitParity(root)).toEqual(before);
  await root.getByRole('button', { name: 'Reset experiment' }).click(); await expect(root.locator('[aria-invalid=true]')).toHaveCount(0);
  await root.getByRole('button', { name: 'Apply closed-form fit' }).click(); await scalar(root, 'mse', .08);
  await expect(root.locator('[data-announcement]')).toContainText('Coefficients');
});

test('descent uses every selected immutable frame and demonstrates oscillation and divergence', async ({ page }) => {
  const root = await open(page, 'regression-gradient-descent', '[data-fit-lab]');
  await root.getByRole('button', { name: 'Replay 4 updates' }).click();
  const nav = root.getByRole('navigation', { name: 'Trace playback' });
  let w = .5, b = 0;
  for (let i = 0; i < 5; i++) {
    const active = await fitParity(root); expect(active.coefficients[0]).toBeCloseTo(b, 11); expect(active.coefficients[1]).toBeCloseTo(w, 11);
    await expect(root).toHaveAttribute('data-frame-index', String(i));
    if (i < 4) { w -= .1 * 4 * (w - 1.8); b -= .1 * 2 * (b - .8); await nav.getByRole('button', { name: 'Next', exact: true }).click(); }
  }
  await nav.getByRole('button', { name: 'First' }).click(); await nav.getByRole('button', { name: 'Next', exact: true }).click();
  await commit(root, 'Weight w', '.75'); await expect(nav).toHaveCount(0);
  const edited = await fitParity(root); expect(edited.coefficients[0]).toBeCloseTo(.16, 11); expect(edited.coefficients[1]).toBe(.75);
  await root.getByRole('button', { name: 'Rate 0.4', exact: true }).click(); await expect(root.locator('[data-behavior]')).toContainText('convergent oscillation');
  await root.getByRole('button', { name: 'Apply one update' }).click(); expect((await fitParity(root)).coefficients[1]).toBeGreaterThan(1.8);
  await root.getByRole('button', { name: 'Rate 0.75', exact: true }).click(); const before = await fitParity(root);
  await root.getByRole('button', { name: 'Apply one update' }).click(); expect((await fitParity(root)).mse).toBeGreaterThan(before.mse);
  await expect(root.locator('[data-behavior]')).toContainText('divergence');
});

test('editable multiple design exposes rank, robust solve and minimum norm coefficients', async ({ page }) => {
  const root = await open(page, 'multiple-linear-regression', '[data-fit-lab]');
  await root.getByRole('button', { name: 'Solve minimum norm' }).click();
  const original = await fitParity(root); original.coefficients.forEach((v, i) => expect(v).toBeCloseTo([1, 2, -1][i]!, 10));
  await commit(root, 'X row 1 feature 1', '-.75'); await fitParity(root);
  await root.getByRole('button', { name: 'Solve minimum norm' }).click(); await fitParity(root);
  await root.getByRole('button', { name: 'Duplicate feature column' }).click(); await expect(root.locator('[data-rank]')).toContainText('Rank 2 / 3');
  await root.getByRole('button', { name: 'Solve minimum norm' }).click(); const duplicate = await fitParity(root);
  expect(duplicate.coefficients[1]).toBeCloseTo(duplicate.coefficients[2]!, 10);
  await commit(root, 'Coefficient w1', '0.1234567'); expect((await fitParity(root)).coefficients[1]).toBe(.1234567);
});

test('polynomial fit preserves held-out rows and shows interpolation is not best evaluation', async ({ page }) => {
  const root = await open(page, 'polynomial-features', '[data-fit-lab]');
  await scalar(root, 'held-mse', fixture.polynomial[1]!.expected.heldMse);
  await commit(root, 'Polynomial degree', '5'); const high = await fitParity(root);
  expect(high.mse).toBeLessThan(1e-20); await scalar(root, 'held-mse', fixture.polynomial[2]!.expected.heldMse);
  const heldTargets = await root.locator('[data-held-row] td:nth-child(3)').allTextContents();
  await commit(root, 'Observation target', '1.23456789'); await fitParity(root);
  expect(await root.locator('[data-held-row] td:nth-child(3)').allTextContents()).toEqual(heldTargets);
  await commit(root, 'Polynomial degree', '2.5'); await expect(field(root, 'Polynomial degree')).toHaveAttribute('aria-invalid', 'true');
  await root.getByRole('button', { name: 'Reset experiment' }).click(); await scalar(root, 'held-mse', fixture.polynomial[1]!.expected.heldMse);
});

test('regularization has real L2/L1 penalties, explicit intercept treatment and KKT status', async ({ page }) => {
  const root = await open(page, 'regularization', '[data-fit-lab]');
  let active = await fitParity(root); expect(active.coefficients[1]).toBeCloseTo(1.44, 11);
  await scalar(root, 'penalty', .5 * 1.44 ** 2); await scalar(root, 'objective', active.mse + .5 * 1.44 ** 2);
  await root.getByRole('combobox', { name: 'Penalty', exact: true }).selectOption('l1'); active = await fitParity(root);
  expect(active.coefficients[1]).toBeCloseTo(1.675, 11); await scalar(root, 'penalty', .5 * 1.675);
  await root.getByRole('checkbox', { name: 'Penalize the intercept' }).check(); expect((await fitParity(root)).coefficients[0]).toBeCloseTo(.55, 11);
  await commit(root, 'Penalty strength λ', '8'); active = await fitParity(root); expect(active.coefficients).toEqual([0, 0]);
  await expect(root.locator('[data-convergence]')).toContainText('KKT tolerance');
  await commit(root, 'Penalty strength λ', '0'); active = await fitParity(root); expect(active.coefficients[1]).toBeCloseTo(1.8, 10);
});

test('logistic gradients, update/replay, extreme BCE and visible rejection follow active coefficients', async ({ page }) => {
  const root = await open(page, 'logistic-regression', '[data-classification-lab]'); let active = await logisticParity(root);
  await root.getByRole('button', { name: 'Apply one update' }).click();
  const after = await logisticParity(root); expect(after.b).toBeCloseTo(active.b - .2 * active.db, 11); expect(after.w).toBeCloseTo(active.w - .2 * active.dw, 11);
  await root.getByRole('button', { name: 'Replay 3 updates' }).click(); const nav = root.getByRole('navigation', { name: 'Trace playback' });
  for (let i = 0; i < 4; i++) { await logisticParity(root); if (i < 3) await nav.getByRole('button', { name: 'Next', exact: true }).click(); }
  await nav.getByRole('button', { name: 'First' }).click(); await nav.getByRole('button', { name: 'Next', exact: true }).click();
  await commit(root, 'Intercept b', '.1234567'); await expect(nav).toHaveCount(0); await logisticParity(root);
  await root.getByRole('button', { name: 'Reset experiment' }).click(); await commit(root, 'Weight w', '1000'); active = await logisticParity(root);
  expect(Number.isFinite(active.loss)).toBe(true); expect(active.loss).toBeCloseTo((1000 + Math.log(2)) / 5, 10);
  await commit(root, 'Learning rate η', '0'); await expect(field(root, 'Learning rate η')).toHaveAttribute('aria-invalid', 'true');
});

test('threshold ties, keyboard and pointer/touch paths use the same score column', async ({ page }, testInfo) => {
  const root = await open(page, 'thresholds-confusion', '[data-classification-lab]');
  const beforeScores = (await countParity(root)).rows.map(r => r.score);
  await commit(root, 'Decision threshold', '.8'); expect((await countParity(root)).counts).toEqual({ TP: 2, FP: 1, TN: 1, FN: 1 });
  const slider = root.getByRole('slider', { name: 'Threshold slider' }); await slider.focus(); await slider.press('ArrowRight');
  expect((await countParity(root)).counts).toEqual({ TP: 1, FP: 0, TN: 2, FN: 2 });
  await slider.scrollIntoViewIfNeeded(); const box = (await slider.boundingBox())!;
  if (testInfo.project.use.hasTouch) await page.touchscreen.tap(box.x + box.width * .4, box.y + box.height / 2);
  else await page.mouse.click(box.x + box.width * .4, box.y + box.height / 2);
  await countParity(root); expect((await countParity(root)).rows.map(r => r.score)).toEqual(beforeScores);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await root.getByRole('button', { name: 'Reset experiment' }).click(); await countParity(root);
});

test('above-all plus score one has consistent active controls and negative predictions', async ({ page }) => {
  for (const slug of ['thresholds-confusion', 'precision-recall-roc']) {
    const root = await open(page, slug, '[data-classification-lab]');
    await root.getByRole('button', { name: 'Predict no positives' }).click(); await commit(root, 'Example score', '1');
    const state = await countParity(root); expect(state.rows[0]!.score).toBe(1); state.rows.forEach(r => expect(r.prediction).toBe(0));
    await expect(root.locator('[data-above-all-control]')).toContainText('Active threshold: +∞');
    await expect(field(root, 'Decision threshold')).toHaveCount(0); await expect(root.getByRole('slider', { name: 'Threshold slider' })).toHaveCount(0);
    await root.getByRole('button', { name: 'Use finite threshold 0.5' }).click(); await expect(field(root, 'Decision threshold')).toHaveValue('0.5');
    expect((await countParity(root)).rows[0]!.prediction).toBe(1);
  }
});

test('metrics use literal denominators, exact tied sweep and pairwise AUC; missing classes stay undefined', async ({ page }) => {
  const root = await open(page, 'precision-recall-roc', '[data-classification-lab]'); await countParity(root);
  for (const name of ['precision', 'recall', 'f1']) { expect(Number(await root.locator(`[data-metric="${name}"]`).getAttribute('data-number'))).toBeCloseTo(2 / 3, 11); await expect(root.locator(`[data-metric="${name}"]`)).toHaveText(shown(2 / 3)); }
  expect(Number(await root.locator('[data-metric=auc]').getAttribute('data-number'))).toBeCloseTo(7 / 12, 11);
  await expect(root.locator('[data-roc-row]')).toHaveCount(5);
  const roc = await root.locator('[data-roc-threshold]').evaluateAll(points => points.map(p => ({ fpr: Number(p.getAttribute('data-fpr')), tpr: Number(p.getAttribute('data-tpr')) })));
  expect(roc).toEqual([{ fpr: 0, tpr: 0 }, { fpr: 0, tpr: 1 / 3 }, { fpr: .5, tpr: 2 / 3 }, { fpr: 1, tpr: 2 / 3 }, { fpr: 1, tpr: 1 }]);
  await root.getByRole('button', { name: 'Replay threshold sweep' }).click(); const nav = root.getByRole('navigation', { name: 'Trace playback' });
  for (let i = 0; i < 5; i++) { await countParity(root); if (i < 4) await nav.getByRole('button', { name: 'Next', exact: true }).click(); }
  await nav.getByRole('button', { name: 'First' }).click(); await expect(root.locator('[data-metric=precision]')).toContainText('Undefined: No predicted positives');
  await commit(root, 'Example score', '1'); await expect(nav).toHaveCount(0); await countParity(root);
  await root.getByRole('button', { name: 'No actual positives' }).click(); await expect(root.locator('[data-metric=recall]')).toContainText('Undefined');
  await expect(root.locator('[data-metric=auc]')).toContainText('requires both actual classes'); await expect(root.locator('[data-roc-plot]')).toHaveCount(0);
});

test('softmax shift equation and actual logits match while probabilities/loss are invariant', async ({ page }) => {
  const root = await open(page, 'softmax-regression', '[data-classification-lab]');
  const read = () => root.locator('[data-softmax-row]').evaluateAll(nodes => nodes.map(r => ({ logits: JSON.parse(r.getAttribute('data-logits')!) as number[], p: JSON.parse(r.getAttribute('data-probabilities')!) as number[], loss: Number(r.getAttribute('data-loss')) })));
  const original = await read(); await commit(root, 'Common logit shift', '1000'); const shifted = await read();
  shifted.forEach((r, i) => { r.logits.forEach((z, c) => expect(z).toBe(original[i]!.logits[c]! + 1000)); expect(r.p).toEqual(original[i]!.p); expect(r.loss).toBe(original[i]!.loss); });
  await expect(root.locator('.formula').first()).toHaveAttribute('aria-label', /common scalar shift c=1000/);
  expect(await root.locator('.formula annotation').first().textContent()).toContain('Z=XW+c'); expect(await root.locator('.formula annotation').first().textContent()).toContain('c\\approx1000');
  await scalar(root, 'loss', fixture.multi[0]!.expected.loss);
  await root.getByRole('button', { name: 'Apply one update' }).click();
  for (const [j, row] of fixture.multi[0]!.expected.next.entries()) for (const [c, value] of row.entries()) expect(Number(await field(root, `W row ${j + 1} class ${c}`).inputValue())).toBeCloseTo(value, 11);
  await root.getByRole('button', { name: 'Replay 3 updates' }).click(); const nav = root.getByRole('navigation', { name: 'Trace playback' });
  await nav.getByRole('button', { name: 'Next', exact: true }).click(); await commit(root, 'W row 1 class 0', '.1234567'); await expect(nav).toHaveCount(0);
  await root.getByRole('button', { name: 'Reset experiment' }).click(); await scalar(root, 'loss', fixture.multi[0]!.expected.loss);
  for (const [label, value] of [['W row 1 class 0', '1000'], ['W row 1 class 1', '0'], ['W row 1 class 2', '-1000'], ['W row 2 class 0', '0'], ['W row 2 class 2', '0']]) await commit(root, label!, value!);
  await root.getByRole('combobox', { name: 'Class label', exact: true }).selectOption('2');
  expect(Number(await root.locator('[data-softmax-row="0"]').getAttribute('data-loss'))).toBe(2000);
});

test('all nine chapter exercise feedback hydrates and Python/prerequisite content is real', async ({ page }) => {
  test.slow();
  for (const chapter of ['least-squares', 'regression-gradient-descent', 'multiple-linear-regression', 'polynomial-features', 'regularization', 'logistic-regression', 'thresholds-confusion', 'precision-recall-roc', 'softmax-regression']) {
    await page.goto(`chapters/${chapter}/`); await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
    const exercises = page.locator('[data-exercise]'); await expect(exercises).toHaveCount(5);
    const question = exercises.first(); await question.getByRole('radio').nth(1).check(); await question.getByRole('button', { name: 'Check answer' }).click(); await expect(question.getByRole('status')).toContainText('Try again.');
    await question.getByRole('radio').first().check(); await question.getByRole('button', { name: 'Check answer' }).click(); await expect(question.getByRole('status')).toContainText('Correct.');
    await expect(page.locator('.code-file code')).toContainText(chapter === 'softmax-regression' ? 'def multiclass' : chapter === 'logistic-regression' ? 'def logistic' : chapter === 'thresholds-confusion' || chapter === 'precision-recall-roc' ? 'def confusion' : 'def least_norm');
    expect(await page.locator('.prerequisites a').count()).toBeGreaterThan(0);
  }
});
