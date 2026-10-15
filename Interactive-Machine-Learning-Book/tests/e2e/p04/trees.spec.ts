import { expect, test, type Locator, type Page } from '@playwright/test';
import fixture from '../../../fixtures/p04/trees.fixtures.json' with { type: 'json' };
const shown = (v: number) => Number(v.toPrecision(6)).toString();
const near = (actual: number, expected: number) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(2e-12 * (1 + Math.abs(expected)));
const field = (root: Locator, label: string) => root.getByRole('textbox', { name: new RegExp(`^${label}(?:$|\\s)`) });
async function commit(root: Locator, label: string, value: string) { const input = field(root, label); await input.fill(value); await input.press('Enter'); }
async function open(page: Page, slug: string, mode: string) {
  await page.goto(`chapters/${slug}/`); const root = page.locator(`[data-tree-lab="${mode}"]`);
  await expect(root).toBeVisible(); await expect.poll(() => root.evaluate(el => !el.closest('astro-island')?.hasAttribute('ssr'))).toBe(true);
  return root;
}
async function scalar(root: Locator, name: string, value: number) {
  const node = root.locator(`[data-scalar="${name}"]`); near(Number(await node.getAttribute('data-number')), value); await expect(node).toHaveText(shown(value));
}
async function rows(root: Locator) {
  return root.locator('[data-source-row]').evaluateAll(nodes => nodes.map(r => ({
    id: r.getAttribute('data-source-row')!, x: JSON.parse(r.getAttribute('data-x')!) as number[], y: Number(r.getAttribute('data-target')),
    prediction: r.hasAttribute('data-prediction') ? Number(r.getAttribute('data-prediction')) : null,
    residual: r.hasAttribute('data-residual') ? Number(r.getAttribute('data-residual')) : null,
  })));
}
async function layout(page: Page, root: Locator) {
  const width = page.viewportSize()!.width;
  const sizes = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, inner: innerWidth }));
  expect(sizes.document).toBeLessThanOrEqual(width + 1); expect(sizes.inner).toBeLessThanOrEqual(width + 1);
  const boxes = await root.evaluate(el => {
    const box = el.getBoundingClientRect();
    return [...el.querySelectorAll('.p04-controls fieldset,.p04-controls legend,.p04-table,.inspector')].map(v => {
      const b = v.getBoundingClientRect(); return { left: b.left - box.left, right: b.right - box.right, width: b.width, rootWidth: box.width };
    });
  });
  for (const b of boxes) { expect(b.left).toBeGreaterThanOrEqual(-1); expect(b.right).toBeLessThanOrEqual(1); expect(b.width).toBeLessThanOrEqual(b.rootWidth + 1); }
  for (const wrapper of await root.locator('.p04-table').all()) {
    expect(await wrapper.evaluate(el => getComputedStyle(el).overflowX)).toBe('auto');
    if (await wrapper.evaluate(el => el.scrollWidth > el.clientWidth + 1)) {
      await wrapper.focus(); await wrapper.press('ArrowRight'); await expect.poll(() => wrapper.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
      await wrapper.evaluate(el => { el.scrollLeft = 0; });
    }
  }
}
async function geometry(root: Locator, regression: boolean) {
  const source = await rows(root), svg = root.locator('[data-plot]');
  const sx = Number(await svg.getAttribute('data-scale-x')), sy = Number(await svg.getAttribute('data-scale-y'));
  const xmin = Number(await svg.getAttribute('data-x-min')), ymin = Number(await svg.getAttribute('data-y-min'));
  await expect.poll(() => svg.evaluate(el => {
    const text = el.querySelector('text')!, matrix = (text as SVGTextElement).getScreenCTM()!;
    return parseFloat(getComputedStyle(text).fontSize) * Math.hypot(matrix.c, matrix.d);
  })).toBeGreaterThanOrEqual(14);
  for (const [i, row] of source.entries()) {
    const group = root.locator(`[data-plot-point="${row.id}"]`), glyph = group.locator('[data-observation-glyph]');
    const center = await glyph.evaluate(el => {
      if (el.tagName === 'circle') return { x: Number(el.getAttribute('cx')), y: Number(el.getAttribute('cy')) };
      return { x: Number(el.getAttribute('x')) + Number(el.getAttribute('width')) / 2, y: Number(el.getAttribute('y')) + Number(el.getAttribute('height')) / 2 };
    });
    near(center.x, 65 + ((regression ? i + 1 : row.x[0]!) - xmin) * sx);
    near(center.y, 440 - ((regression ? row.y : row.x[1]!) - ymin) * sy);
    const paint = await glyph.evaluate(el => { const b = (el as SVGGraphicsElement).getBBox(); const style = getComputedStyle(el); return { cx: b.x + b.width / 2, cy: b.y + b.height / 2, width: b.width, fill: style.fill, opacity: Number(style.opacity), visibility: style.visibility }; });
    // Native SVG BBox coordinates may quantize to float32: 0.001 viewBox unit is far below one CSS pixel.
    expect(Math.abs(paint.cx - center.x)).toBeLessThan(.001); expect(Math.abs(paint.cy - center.y)).toBeLessThan(.001);
    expect(paint.width).toBeGreaterThan(0); expect(paint.fill).not.toBe('none'); expect(paint.opacity).toBeGreaterThan(0); expect(paint.visibility).toBe('visible');
    if (regression && row.prediction !== null) {
      const prediction = await group.locator('[data-prediction-glyph]').evaluate(el => { const b = (el as SVGGraphicsElement).getBBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
      expect(Math.abs(prediction.x - center.x)).toBeLessThan(.001);
      expect(Math.abs(prediction.y - (440 - (row.prediction - ymin) * sy))).toBeLessThan(.001);
      near(row.residual!, row.prediction - row.y);
    }
    const cells = root.locator(`[data-source-row="${row.id}"] td`);
    if (row.prediction !== null) await expect(cells.nth(3)).toHaveText(shown(row.prediction));
  }
}
function expectedCase<T>(name: string): T { return fixture.cases.find(c => c.input.name === name)!.expected as unknown as T; }
const chapters = [
  ['decision-trees', 'splits'], ['entropy-gini-gain', 'impurity'], ['regression-trees-pruning', 'regression'],
  ['bagging-bootstrap', 'bagging'], ['random-forests', 'forest'], ['gradient-boosting', 'boosting'],
] as const;
for (const theme of ['light', 'dark'] as const) for (const [slug, mode] of chapters) test(`${slug}: active numbers, painted glyphs and physical width in ${theme}`, async ({ page }) => {
  await page.emulateMedia({ colorScheme: theme }); const root = await open(page, slug, mode);
  const source = await rows(root);
  const golden = expectedCase<{ predictions: (number | { value: number | null })[] }>(mode === 'boosting' ? 'boosting-tiny' : mode === 'regression' ? 'regression' : mode === 'bagging' || mode === 'forest' ? mode : 'classification-gini');
  source.forEach((r, i) => {
    const e = golden.predictions[i]!, value = typeof e === 'number' ? e : e.value;
    // The opening boosting state shows one stage; the golden carries the whole three-stage trace.
    if (mode === 'boosting') near(r.prediction!, [0.5, 0.5, 1.5, 1.5][i]!); else near(r.prediction!, value!);
  });
  await geometry(root, mode === 'regression' || mode === 'boosting'); await layout(page, root);
  await expect(root.locator('[data-provenance]')).toContainText('Hand-authored');
  await expect(page.locator('.prerequisites a').first()).toBeVisible(); await expect(page.locator('.code-file code')).toContainText('def train_tree');
});
test('candidate memberships, weighted Gini/entropy, equality and illegal endpoints are literal', async ({ page }) => {
  const root = await open(page, 'decision-trees', 'splits');
  await scalar(root, 'parent-impurity', .5); await scalar(root, 'weighted', .25); await scalar(root, 'gain', .25);
  await expect(root.locator('[data-inspected-left]')).toContainText('s1, s2 · n 2');
  await commit(root, 'Query feature 1', '2.5'); await scalar(root, 'query', 0);
  await commit(root, 'Inspection threshold', '3.5'); await expect(root.locator('[data-inspected-left]')).toContainText('s1, s2, s3 · n 3'); await scalar(root, 'gain', 1 / 18);
  await root.getByRole('button', { name: 'Inspect trained split' }).click(); await scalar(root, 'gain', .25);
  await root.getByRole('combobox', { name: 'Impurity criterion' }).selectOption('entropy'); await scalar(root, 'parent-impurity', 1); await scalar(root, 'weighted', .5408520829727552);
  await commit(root, 'Inspection threshold', '-10'); await expect(root.locator('[data-inspected-legality]')).toContainText('Illegal');
  await expect(root.locator('[data-scalar=gain]')).not.toHaveAttribute('data-number', /.+/);
  await root.getByRole('button', { name: 'Set pure class 0' }).click(); await scalar(root, 'parent-impurity', 0); await expect(root.locator('[data-tree-node]')).toHaveCount(1);
});
test('regression SSE, real pruning breakpoints and constant/empty stops update actual predictions', async ({ page }) => {
  const root = await open(page, 'regression-trees-pruning', 'regression');
  await scalar(root, 'leaves', 4); await scalar(root, 'evaluation', 0);
  await commit(root, 'Pruning strength α', '.25'); await scalar(root, 'leaves', 2); await scalar(root, 'risk', .5); await scalar(root, 'cost', 1); await geometry(root, true);
  await commit(root, 'Pruning strength α', '.5'); await scalar(root, 'leaves', 1); await scalar(root, 'evaluation', 1); await scalar(root, 'cost', 1.5);
  await root.getByRole('button', { name: 'Reset experiment' }).click(); await root.getByRole('button', { name: 'Set constant features' }).click();
  await scalar(root, 'leaves', 1); (await rows(root)).forEach(r => near(r.prediction!, 1));
  await root.getByRole('button', { name: 'Use empty data' }).click(); await expect(root.locator('[data-scalar=cost]')).toContainText('Undefined');
  await expect(root.locator('[data-scalar=query]')).toContainText('Undefined'); await layout(page, root);
});
for (const mode of ['bagging', 'forest'] as const) test(`${mode}: multiplicity, exact seed fixtures, actual votes, OOB exclusions and empty query`, async ({ page }) => {
  const root = await open(page, mode === 'bagging' ? 'bagging-bootstrap' : 'random-forests', mode);
  const e = expectedCase<{ trees: { sample: { indices: number[]; counts: { id: string; count: number }[]; oobIds: string[] } }[]; oob: { id: string; treeIds: string[]; values: number[]; value: number | null }[]; oobMetric: number }>(mode);
  for (const [i, t] of e.trees.entries()) {
    await root.getByRole('combobox', { name: 'Bootstrap tree' }).selectOption(String(i));
    expect(await root.locator('[data-bootstrap-draw]').evaluateAll(ns => ns.map(n => Number(n.getAttribute('data-index'))))).toEqual(t.sample.indices);
    for (const c of t.sample.counts) await expect(root.locator(`[data-multiplicity="${c.id}"]`)).toHaveAttribute('data-count', String(c.count));
  }
  for (const p of e.oob) {
    const node = root.locator(`[data-oob-row="${p.id}"]`);
    await expect(node).toHaveAttribute('data-trees', JSON.stringify(p.treeIds)); await expect(node).toHaveAttribute('data-votes', JSON.stringify(p.values));
    if (p.value === null) await expect(node.locator('td').last()).toContainText('Undefined'); else await expect(node).toHaveAttribute('data-value', String(p.value));
  }
  await scalar(root, 'evaluation', e.oobMetric);
  const votes = await root.locator('[data-query-vote]').evaluateAll(ns => ns.filter(n => n.hasAttribute('data-value')).map(n => Number(n.getAttribute('data-value'))));
  await scalar(root, 'query', Number(votes.filter(v => v === 1).length > votes.length / 2));
  await root.getByRole('button', { name: 'Keep one source row' }).click(); await expect(root.locator('[data-scalar=evaluation]')).toContainText('Undefined');
  await root.getByRole('button', { name: 'Use empty data' }).click(); await expect(root.locator('[data-scalar=query]')).toContainText('No eligible');
  await expect(root.locator('[data-scalar=query]')).not.toHaveAttribute('data-number', /.+/);
  for (const vote of await root.locator('[data-query-vote]').all()) await expect(vote.locator('td').first()).toContainText('Undefined');
  await layout(page, root);
});
test('forest feature subset is resampled inside a recursive tree and all-feature policy equals bagging', async ({ page }) => {
  const root = await open(page, 'random-forests', 'forest');
  await root.getByRole('combobox', { name: 'Bootstrap tree' }).selectOption('1');
  await expect(root.locator('[data-node-row=root]')).toHaveAttribute('data-features', '[1]');
  await expect(root.locator('[data-node-row=rootR]')).toHaveAttribute('data-features', '[0]');
  await root.getByRole('combobox', { name: 'Inspect node' }).selectOption('rootR');
  await expect(root.locator('[data-considered-features]')).toContainText('[0]'); await expect(root.locator('[data-candidate]').first()).toHaveAttribute('data-feature', '0');
  await commit(root, 'Features per split', '2');
  const bag = expectedCase<{ predictions: { value: number }[] }>('bagging');
  (await rows(root)).forEach((r, i) => expect(r.prediction).toBe(bag.predictions[i]!.value));
});
test('actual residual fitting ledger, objective identity and stage replay use selected frames', async ({ page }) => {
  const root = await open(page, 'gradient-boosting', 'boosting');
  await scalar(root, 'baseline', 1); await scalar(root, 'evaluation', .125);
  await root.getByRole('button', { name: 'Replay 0–3 stages' }).click(); const nav = root.getByRole('navigation', { name: 'Trace playback' });
  const e = expectedCase<{ stages: { lossAfter: number; after: number[] }[] }>('boosting-tiny');
  for (let i = 0; i < 4; i++) {
    await expect(root).toHaveAttribute('data-frame-index', String(i));
    const source = await rows(root); source.forEach((r, j) => near(r.prediction!, i ? e.stages[i - 1]!.after[j]! : 1));
    await scalar(root, 'evaluation', i ? e.stages[i - 1]!.lossAfter : .5); await geometry(root, true);
    for (const row of await root.locator('[data-residual-row]').all()) {
      const before = Number(await row.getAttribute('data-before')), residual = Number(await row.getAttribute('data-residual'));
      const fitted = Number(await row.getAttribute('data-fitted')), after = Number(await row.getAttribute('data-after'));
      const target = Number(await row.locator('td').first().textContent()); near(residual, target - before); near(after, before + .5 * fitted);
    }
    if (i < 3) await nav.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await nav.getByRole('button', { name: 'First' }).click(); await nav.getByRole('button', { name: 'Next', exact: true }).click();
  await commit(root, 'Learning rate η', '.25'); await expect(nav).toHaveCount(0); await expect(field(root, 'Boosting stages')).toHaveValue('1');
  await scalar(root, 'evaluation', .28125);
  await root.getByRole('button', { name: 'Reset experiment' }).click(); await commit(root, 'Maximum depth', '0'); await scalar(root, 'evaluation', .5);
  await commit(root, 'Maximum depth', '1'); await commit(root, 'Learning rate η', '1'); await scalar(root, 'evaluation', 0);
  await root.getByRole('button', { name: 'Use empty data' }).click(); await expect(root.locator('[data-scalar=baseline]')).toContainText('Undefined');
});
test('numeric focus, strict rejection, historical values and reset during a pending native slider gesture', async ({ page }, testInfo) => {
  const root = await open(page, 'decision-trees', 'splits');
  const input = field(root, 'Observation feature 1'); await input.fill('0.123456789123'); await input.press('Enter'); await expect(input).toBeFocused();
  await input.press('ArrowUp'); await expect(input).toBeFocused(); expect(Number(await input.inputValue())).toBe(.123456789123 + .1);
  const previous = await rows(root); await commit(root, 'Maximum depth', '1.5'); await expect(field(root, 'Maximum depth')).toHaveAttribute('aria-invalid', 'true'); expect(await rows(root)).toEqual(previous);
  await root.getByRole('button', { name: 'Reset experiment' }).click(); await expect(root.locator('[aria-invalid=true]')).toHaveCount(0);
  await root.getByRole('button', { name: 'Replay depth 0–3' }).click(); const nav = root.getByRole('navigation', { name: 'Trace playback' });
  await nav.getByRole('button', { name: 'Next', exact: true }).click(); await expect(field(root, 'Maximum depth')).toHaveValue('1'); await scalar(root, 'evaluation', 1 / 6);
  await commit(root, 'Query feature 1', '4'); await expect(nav).toHaveCount(0); await expect(field(root, 'Maximum depth')).toHaveValue('1');
  const slider = root.getByRole('slider', { name: 'Threshold slider' }); await slider.focus(); await slider.press('ArrowRight');
  await slider.scrollIntoViewIfNeeded(); const box = (await slider.boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44);
  if (testInfo.project.use.hasTouch) await page.touchscreen.tap(box.x + box.width * .35, box.y + box.height / 2);
  else await page.mouse.click(box.x + box.width * .35, box.y + box.height / 2);
  await layout(page, root);
  await page.mouse.move(box.x + box.width * .2, box.y + box.height / 2); await page.mouse.down();
  const reset = root.getByRole('button', { name: 'Reset experiment' }); await reset.focus(); await reset.press('Enter');
  await page.mouse.move(box.x + box.width * .8, box.y + box.height / 2); await page.mouse.up();
  await expect(field(root, 'Inspection threshold')).toHaveValue('2.5'); await expect(field(root, 'Maximum depth')).toHaveValue('3');
});
test('all six lessons hydrate five graded feedback exercises and actual Python', async ({ page }) => {
  test.slow();
  for (const [slug, mode] of chapters) {
    await open(page, slug, mode); await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
    const exercises = page.locator('[data-exercise]'); await expect(exercises).toHaveCount(5);
    const first = exercises.first(); await first.getByRole('radio').nth(1).check(); await first.getByRole('button', { name: 'Check answer' }).click(); await expect(first.getByRole('status')).toContainText('Try again.');
    await first.getByRole('radio').first().check(); await first.getByRole('button', { name: 'Check answer' }).click(); await expect(first.getByRole('status')).toContainText('Correct.');
  }
});

for (const [slug, mode] of chapters) test(slug + ': full chapter prose stays within the physical viewport in both themes', async ({ page }) => {
  await open(page, slug, mode);
  const article = page.locator('article'), viewport = page.viewportSize()!.width;
  await page.evaluate(async () => { await document.fonts.ready; });
  const expectedTables: Record<string, { columns: number; rows: number }> = {
    'decision-trees': { columns: 4, rows: 6 }, 'entropy-gini-gain': { columns: 4, rows: 2 },
    'regression-trees-pruning': { columns: 4, rows: 3 }, 'random-forests': { columns: 3, rows: 2 },
    'gradient-boosting': { columns: 5, rows: 4 },
  };
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    const physicalWidth = async () => {
      const widths = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, inner: innerWidth }));
      expect(widths.document, slug + ' ' + theme + ': whole-document width').toBeLessThanOrEqual(viewport + 1);
      expect(widths.inner, slug + ' ' + theme + ': physical inner width').toBeLessThanOrEqual(viewport + 1);
    };
    await physicalWidth();
    const unbounded = await article.locator('table').evaluateAll(tables => tables.filter(table => !table.closest('.p04-lab') && !table.closest('.table-scroll')).length);
    expect(unbounded, slug + ': every prose table is contained').toBe(0);
    const prose = article.locator('[data-p04-prose-table]'), expected = expectedTables[slug];
    await expect(prose).toHaveCount(expected ? 1 : 0);
    for (const wrapper of await prose.all()) {
      await wrapper.scrollIntoViewIfNeeded();
      const label = (await wrapper.getAttribute('data-scrollable'))!;
      expect(label).toMatch(/III-2[0-5].+scrollable/);
      expect(await wrapper.evaluate(el => getComputedStyle(el).overflowX)).toBe('auto');
      const box = (await wrapper.boundingBox())!, chapter = (await article.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(chapter.x - 1); expect(box.x + box.width).toBeLessThanOrEqual(chapter.x + chapter.width + 1);
      await expect(wrapper.locator('thead th')).toHaveCount(expected!.columns);
      await expect(wrapper.locator('tbody tr')).toHaveCount(expected!.rows);
      await expect(wrapper.locator('tbody td')).toHaveCount(expected!.columns * expected!.rows);
      const overflows = await wrapper.evaluate(el => el.scrollWidth > el.clientWidth + 1);
      if (overflows) {
        await expect(wrapper).toHaveAttribute('role', 'region'); await expect(wrapper).toHaveAttribute('tabindex', '0');
        await expect(wrapper).toHaveAttribute('aria-label', label);
        await wrapper.focus(); await expect(wrapper).toBeFocused();
        await wrapper.press('ArrowRight'); await expect.poll(() => wrapper.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
        await physicalWidth(); await wrapper.evaluate(el => { el.scrollLeft = 0; });
      } else {
        // Accepted syncScrollable semantics: fitting wrappers are not tab stops or landmarks.
        await expect(wrapper).toHaveAttribute('tabindex', '-1');
        await expect(wrapper).not.toHaveAttribute('role', /.+/); await expect(wrapper).not.toHaveAttribute('aria-label', /.+/);
      }
    }
    if (slug === 'gradient-boosting') {
      const table = article.locator('#iii25-worked-stages table');
      expect(await table.locator('thead th').allTextContents()).toEqual(['Stage', 'Residuals before fitting', 'Fitted h', 'Predictions after η=0.5', 'Half MSE']);
      expect(await table.locator('tbody tr').last().locator('td').allTextContents()).toEqual(['3', '[−0.25,−0.25,0.25,0.25]', 'same as residuals', '[0.125,0.125,1.875,1.875]', '0.0078125']);
    }
    await physicalWidth();
  }
});
