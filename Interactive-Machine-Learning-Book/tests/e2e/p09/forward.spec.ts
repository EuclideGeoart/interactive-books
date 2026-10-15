import { expect, test, type Locator, type Page } from '@playwright/test';
import fixture from '../../../fixtures/p09/forward.fixtures.json' with { type: 'json' };
import { derive, initial, shown } from '../../../src/parts/p09/lesson';
import { forward, operations, type ForwardState, type Input } from '../../../src/parts/p09/model/forward';

const chapters = [['linear-model-artificial-neuron', 'neuron'], ['composition-learned-representations', 'network']] as const;
async function open(page: Page, i: number) {
  const [slug, mode] = chapters[i]!; await page.goto(`chapters/${slug}/`);
  const root = page.locator(`[data-forward-lab="${mode}"]`); await expect(root).toBeVisible(); await expect(page.locator('astro-island[ssr]')).toHaveCount(0); return root;
}
const field = (root: Locator, label: string) => root.getByRole('textbox', { name: new RegExp('^' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?: |$)') });
async function commit(root: Locator, label: string, value: string) { const input = field(root, label); await input.fill(value); await input.press('Enter'); }
async function state(root: Locator): Promise<ForwardState> { return JSON.parse((await root.getAttribute('data-state'))!); }
function near(actual: number, expected: number) { expect(Math.abs(actual - expected)).toBeLessThanOrEqual(32 * Number.EPSILON * (Math.abs(expected) + (expected === 0 || Math.abs(expected) >= 1e-8 ? 1 : 0))); }
function numericalRecord(actual: unknown, expected: unknown, sigmoid: boolean) {
  if (Array.isArray(expected)) {
    expect(Array.isArray(actual)).toBe(true); const values = actual as unknown[]; expect(values.length).toBe(expected.length);
    expected.forEach((v, i) => numericalRecord(values[i], v, sigmoid));
  } else if (expected !== null && typeof expected === 'object') {
    expect(actual).not.toBeNull(); expect(typeof actual).toBe('object');
    expect(Object.keys(actual as object).sort()).toEqual(Object.keys(expected).sort());
    Object.entries(expected).forEach(([key, v]) => {
      // These fields depend only on affine arithmetic or parameter/shape data, not sigmoid.
      const approximate = sigmoid && !['shapes', 'row', 'hidden', 'b', 'W', 'rows'].includes(key);
      numericalRecord((actual as Record<string, unknown>)[key], v, approximate);
    });
  } else if (typeof expected === 'number') {
    expect(typeof actual).toBe('number');
    if (sigmoid) near(actual as number, expected); else expect(actual === expected).toBe(true);
  } else expect(actual).toEqual(expected);
}
const tex = (v: number): string => { const [a, e] = String(v).split('e'); return e === undefined ? a! : `${a}\\times10^{${Number(e)}}`; };
async function semantic(root: Locator) {
  const s = await state(root), value = derive(s), sigmoid = s.input.activation === 'sigmoid';
  const result: ReturnType<typeof forward> = JSON.parse((await root.getAttribute('data-numerical'))!);
  numericalRecord(result, value.numerical, sigmoid);
  for (const [i, { phi }] of value.rows.entries()) {
    const row = result.kind === 'neuron' ? result.row : i < result.hidden.length ? result.hidden[i]! : result.output[i - result.hidden.length]!;
    const a = result.kind === 'neuron' ? result.a : i < result.hidden.length ? result.a1[i]! : row.z;
    const record = root.locator(`[data-forward-row="${i}"]`), svg = root.locator(`[data-rail="${i}"] svg`);
    expect(JSON.parse((await record.getAttribute('data-products'))!)).toEqual(JSON.parse(JSON.stringify(row.products)));
    expect(JSON.parse((await record.getAttribute('data-running'))!)).toEqual(JSON.parse(JSON.stringify(row.running)));
    await expect(record.locator('td').nth(0)).toHaveText(row.products.map(shown).join('; '));
    await expect(record.locator('td').nth(1)).toHaveText(row.running.map(shown).join('; '));
    for (const [key, number] of [['dot', row.dot], ['bias', row.b], ['z', row.z], ['a', a]] as const) {
      await expect(record).toHaveAttribute(`data-${key}`, String(number));
      await expect(svg.locator(`[data-svg-${key}]`)).toHaveAttribute(`data-svg-${key}`, String(number));
      await expect(record).toContainText(shown(number));
    }
    const source = s.input.kind === 'neuron' ? s.input.x : result.kind === 'network' && i >= result.hidden.length ? result.a1 : s.input.x;
    const weights = s.input.kind === 'neuron' ? s.input.w : i < s.input.W1.length ? s.input.W1[i]! : s.input.W2[i - s.input.W1.length]!;
    for (const [j, p] of row.products.entries()) {
      const term = svg.locator(`[data-svg-term="${j}"]`);
      await expect(term).toHaveAttribute('data-product', String(p)); await expect(term).toHaveAttribute('data-running', String(row.running[j]!));
      await expect(term).toHaveAttribute('data-x', String(source[j]!)); await expect(term).toHaveAttribute('data-weight', String(weights[j]!));
      await expect(term).toContainText(shown(p));
      await expect(term.locator('text').nth(0)).toHaveText(shown(source[j]!)); await expect(term.locator('text').nth(1)).toHaveText(shown(weights[j]!));
      expect(Number(await term.locator('text').nth(2).getAttribute('y'))).toBe(60 + 36 * j);
    }
    await expect(svg.locator('desc')).toContainText(`Dot ${row.dot}, bias ${row.b}, z ${row.z}, ${phi} output ${a}.`);
    await expect(root.locator('.formula').nth(i)).toHaveAttribute('data-formula-label', value.formulas[i]!.label);
    await expect(root.locator('.formula').nth(i).locator('annotation')).toHaveText(`z\\approx${tex(row.dot)}+(${tex(row.b)})\\approx${tex(row.z)},\\quad a=\\operatorname{${phi}}(z)\\approx${tex(a)}`);
  }
  await expect(root.locator('[data-current-frame]')).toContainText(operations(s.input, result)[s.phase]!);
  for (const [name, shape] of Object.entries(result.shapes)) {
    const entry = root.locator('dt').filter({ hasText: new RegExp(`^${name} shape$`) }).locator('..');
    await expect(entry.locator('dd')).toHaveText(`${shape[0]} × ${shape[1]}`);
  }
  if (result.kind === 'network') {
    await expect(root.locator('[data-collapse-label]')).toHaveText(value.collapseLabel);
    if (result.collapse.status === 'defined') expect(JSON.parse((await root.locator('[data-collapse-output]').getAttribute('data-collapse-output'))!)).toEqual(JSON.parse(JSON.stringify(result.collapse.rows.map(r => r.z))));
    for (const c of value.binary) {
      const record = root.locator(`[data-binary="${c.x.join(',')}"]`);
      await expect(record).toHaveAttribute('data-binary-status', c.status);
      if (c.status === 'defined') {
        const f = c.forward;
        const hidden: number[] = JSON.parse((await record.getAttribute('data-hidden'))!), output = Number(await record.getAttribute('data-output'));
        numericalRecord(hidden, f.a1, sigmoid); numericalRecord(output, f.output[0]!.z, sigmoid);
        await expect(record.locator('td').nth(1)).toHaveText(shown(hidden[0]!)); await expect(record.locator('td').nth(2)).toHaveText(shown(hidden[1]!)); await expect(record.locator('td').nth(3)).toHaveText(shown(output));
      } else {
        await expect(record.locator('td').first()).toHaveText(`Unavailable: ${c.reason}`);
        await expect(record).toHaveAttribute('data-reason', c.reason);
        expect(await record.getAttribute('data-hidden')).toBeNull(); expect(await record.getAttribute('data-output')).toBeNull();
      }
    }
  }
}
async function layout(page: Page, root: Locator) {
  await page.evaluate(async () => { await document.fonts.ready; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  const bounds = (await root.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(-1); expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  for (const control of await root.locator('button,input,select,summary').all()) {
    const b = (await control.boundingBox())!; expect(b.height).toBeGreaterThanOrEqual(44); expect(b.x).toBeGreaterThanOrEqual(bounds.x - 1); expect(b.x + b.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
  }
  const fonts = await root.locator('svg text').evaluateAll(nodes => nodes.map(node => {
    const m = (node as SVGGraphicsElement).getScreenCTM()!; return parseFloat(getComputedStyle(node).fontSize) * Math.hypot(m.a, m.b);
  })); expect(fonts.length).toBeGreaterThan(0); fonts.forEach(px => expect(px).toBeGreaterThanOrEqual(13.99));
  for (const wrapper of await root.locator('.p09-rail-scroll,.table-scroll').all()) {
    if (await wrapper.evaluate(el => el.scrollWidth > el.clientWidth + 1)) {
      await expect(wrapper).toHaveAttribute('tabindex', '0'); await expect(wrapper).toHaveAttribute('role', 'region'); await expect(wrapper).toHaveAttribute('aria-label', /scrollable/);
      await wrapper.scrollIntoViewIfNeeded(); await wrapper.focus(); await expect(wrapper).toBeFocused(); await wrapper.press('ArrowRight'); await expect.poll(() => wrapper.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    } else {
      await expect(wrapper).toHaveAttribute('tabindex', '-1');
    }
  }
}
for (const [i, [slug, mode]] of chapters.entries()) for (const theme of ['light', 'dark']) test(`${slug}: DOM/SVG/shape state and ${theme} layout`, async ({ page }) => {
  const root = await open(page, i); await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
  expect(await state(root)).toEqual(JSON.parse(JSON.stringify(initial(mode)))); await semantic(root); await layout(page, root);
  await expect(page.locator('.stage').first().locator('[data-state]')).toHaveCount(1); await expect(page.locator('.code-file code')).toContainText('def forward');
  await expect(page.locator('.prerequisites a').first()).toHaveAttribute('href', /\/chapters\//);
});

for (const [i, [, mode]] of chapters.entries()) test(`${mode}: every input/parameter changes real state; keyboard and rejection preserve previous values`, async ({ page }) => {
  const root = await open(page, i);
  const labels = mode === 'neuron' ? ['x 1', 'x 2', 'w 1', 'w 2', 'b'] : ['x 1', 'x 2', 'W1 1,1', 'W1 1,2', 'W1 2,1', 'W1 2,2', 'b1 1', 'b1 2', 'W2 1,1', 'W2 1,2', 'b2 1'];
  for (const label of labels) { const before = await state(root); await commit(root, label, '0.375'); expect(await state(root)).not.toEqual(before); await semantic(root); }
  const before = await state(root);
  for (const bad of ['NaN', 'Infinity', '1001', '-1001', '', '7oops']) {
    await commit(root, 'x 1', bad); await expect(field(root, 'x 1')).toHaveAttribute('aria-invalid', 'true'); expect(await state(root)).toEqual(before);
  }
  await commit(root, 'x 1', '0.5'); await field(root, 'x 1').press('ArrowUp'); near((await state(root)).input.x[0]!, .6);
  await field(root, 'x 1').press('Shift+ArrowDown'); near((await state(root)).input.x[0]!, .1); await semantic(root);
  for (const activation of ['identity', 'relu', 'sigmoid']) { await root.getByRole('combobox', { name: 'Activation', exact: true }).selectOption(activation); expect((await state(root)).input.activation).toBe(activation); await semantic(root); }
  await commit(root, 'x 1', 'bad'); await root.getByRole('button', { name: 'Reset experiment' }).click();
  expect(await state(root)).toEqual(JSON.parse(JSON.stringify(initial(mode)))); await expect(root.locator('[aria-invalid=true]')).toHaveCount(0); await semantic(root);
});

test('negative/positive/zero and stable extreme saturation use actual neuron outputs', async ({ page }) => {
  const root = await open(page, 0);
  for (const [button, output] of [['Sigmoid −1000', 0], ['Sigmoid +1000', 1], ['Zero neuron', 0]] as const) {
    await root.getByRole('button', { name: button, exact: true }).click(); near(Number(await root.locator('[data-forward-row]').getAttribute('data-a')), output); await semantic(root);
  }
  await root.getByRole('combobox', { name: 'Activation', exact: true }).selectOption('sigmoid'); near(Number(await root.locator('[data-forward-row]').getAttribute('data-a')), .5);
  await commit(root, 'b', '-40'); expect(Number(await root.locator('[data-forward-row]').getAttribute('data-a'))).toBeGreaterThan(0); await semantic(root);
  await commit(root, 'b', '2'); near(Number(await root.locator('[data-forward-row]').getAttribute('data-a')), .8807970779778823); await semantic(root);
});

test('four hand-calculated XOR rows and identity counterfactual labels', async ({ page }) => {
  const root = await open(page, 1);
  const cases = fixture.cases.filter(c => c.name.startsWith('XOR '));
  for (const c of cases) {
    const input = c.input as Input; await root.getByRole('button', { name: `Input (${input.x.join(',')})`, exact: true }).click();
    const expected = c.expected as { a1: number[]; output: { z: number }[] };
    expect(JSON.parse((await root.locator(`[data-binary="${input.x.join(',')}"]`).getAttribute('data-hidden'))!)).toEqual(expected.a1);
    near(Number(await root.locator('[data-forward-row="2"]').getAttribute('data-z')), expected.output[0]!.z); await semantic(root);
  }
  await expect(root.locator('[data-collapse-label]')).toContainText('Counterfactual'); await root.getByRole('combobox', { name: 'Activation', exact: true }).selectOption('identity');
  await expect(root.locator('[data-collapse-label]')).toContainText('Identity composition');
  for (const row of await root.locator('[data-binary]').all()) near(Number(await row.getAttribute('data-output')), 0);
  await commit(root, 'b2 1', '0.5'); near(Number(await root.locator('[data-forward-row="2"]').getAttribute('data-z')), .5); await semantic(root);
});

for (const [i, [, mode]] of chapters.entries()) test(`${mode}: immutable replay records, edits at displayed frame, reset and keyboard JSON scroll`, async ({ page }) => {
  const root = await open(page, i); await commit(root, 'x 1', '0.5'); const input = (await state(root)).input;
  await root.getByRole('button', { name: 'Replay forward pass' }).click();
  const nav = root.getByRole('navigation', { name: 'Trace playback' });
  await root.getByText('Complete current forward record', { exact: true }).click();
  const record = root.getByRole('region', { name: 'Complete forward JSON, scrollable' });
  const count = derive({ input, phase: 0 }).steps.length;
  for (let phase = 0; phase < count; phase++) {
    expect((await state(root)).phase).toBe(phase); expect((await state(root)).input).toEqual(input); await semantic(root);
    const stored = JSON.parse((await record.textContent())!); numericalRecord(stored.traceEvent.numerical, forward(input), input.activation === 'sigmoid');
    expect(stored.state).toEqual(await state(root)); expect(stored.traceEvent.numerical).toEqual(stored.numerical);
    if (phase + 1 < count) await nav.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await nav.getByRole('button', { name: 'First', exact: true }).click(); await nav.getByRole('button', { name: 'Next', exact: true }).click();
  await commit(root, 'x 1', '3'); await expect(nav).toHaveCount(0); expect((await state(root)).phase).toBe(1); expect((await state(root)).input.x[0]).toBe(3);
  await record.focus(); await record.press('ArrowDown'); await expect.poll(() => record.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await expect(record.locator('[role="region"]')).toHaveCount(0); await root.getByRole('button', { name: 'Reset experiment' }).click(); expect(await state(root)).toEqual(JSON.parse(JSON.stringify(initial(mode))));
});

for (const [i, [slug]] of chapters.entries()) test(`${slug}: five graded corrective exercises`, async ({ page }) => {
  await open(page, i); const exercises = page.locator('[data-exercise]'); await expect(exercises).toHaveCount(5);
  for (const exercise of await exercises.all()) {
    await exercise.getByRole('radio').nth(1).check(); await exercise.getByRole('button', { name: 'Check answer' }).click(); await expect(exercise.getByRole('status')).toContainText('Try again.');
    await exercise.getByRole('radio').first().check(); await exercise.getByRole('button', { name: 'Check answer' }).click(); await expect(exercise.getByRole('status')).toContainText('Correct.');
  }
});

for (const [i, [, mode]] of chapters.entries()) test(`${mode}: touch controls preserve surrounding native scroll`, async ({ page }, info) => {
  const root = await open(page, i), button = root.getByRole('button', { name: mode === 'neuron' ? 'Sigmoid +1000' : 'Input (0,1)', exact: true });
  await button.scrollIntoViewIfNeeded(); if (info.project.use.hasTouch) await button.tap(); else await button.click(); await semantic(root);
  const reset = root.getByRole('button', { name: 'Reset experiment' }); await reset.scrollIntoViewIfNeeded(); if (info.project.use.hasTouch) await reset.tap(); else await reset.click();
  expect(await state(root)).toEqual(JSON.parse(JSON.stringify(initial(mode))));
  expect(await root.evaluate(el => [el, ...el.querySelectorAll('svg')].map(node => getComputedStyle(node).touchAction))).not.toContain('none');
});

for (const [i, [, mode]] of chapters.entries()) test(`${mode}: native surface scrolling`, async ({ page }, info) => {
  const root = await open(page, i); await root.locator('svg').first().scrollIntoViewIfNeeded();
  const beforeState = await state(root), before = await page.evaluate(() => window.scrollY), size = page.viewportSize()!;
  const x = 10, y = Math.floor(size.height * .8);
  if (info.project.use.hasTouch) {
    const client = await page.context().newCDPSession(page);
    try {
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
      for (let step = 1; step <= 6; step++) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 45, id: 1 }] });
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } finally { await client.detach(); }
  } else {
    await page.mouse.move(x, y); await page.mouse.wheel(0, 300);
  }
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 20);
  expect(await state(root)).toEqual(beforeState);
  await semantic(root);
});

test('numeric tiny-weight edits preserve active zero and mark failing binary rows unavailable', async ({ page }) => {
  const root = await open(page, 1), errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [label, value] of [['x 1', '0'], ['W1 1,2', '0'], ['W2 1,2', '0'], ['W1 1,1', '1e-300'], ['W2 1,1', '1e-300']]) await commit(root, label!, value!);
  await expect(root.locator('[aria-invalid=true]')).toHaveCount(0);
  const before = await state(root); expect(before.input.x).toEqual([0, 0]);
  expect(Number(await root.locator('[data-forward-row="2"]').getAttribute('data-z'))).toBe(0);
  for (const x of ['0,0', '0,1']) await expect(root.locator(`[data-binary="${x}"]`)).toHaveAttribute('data-binary-status', 'defined');
  for (const x of ['1,0', '1,1']) {
    const row = root.locator(`[data-binary="${x}"]`); await expect(row).toHaveAttribute('data-binary-status', 'unavailable');
    await expect(row.locator('td').first()).toContainText('Unavailable:'); await expect(row).toContainText('underflow');
    expect(await row.getAttribute('data-output')).toBeNull(); expect(await row.getAttribute('data-hidden')).toBeNull();
  }
  await semantic(root);
  for (const x of ['1,0', '1,1']) {
    await root.getByRole('button', { name: `Input (${x})`, exact: true }).click();
    await expect(root.getByRole('alert')).toContainText('underflow'); expect(await state(root)).toEqual(before);
  }
  await commit(root, 'b2 1', '1'); expect(Number(await root.locator('[data-forward-row="2"]').getAttribute('data-z'))).toBe(1);
  await semantic(root);
  await root.getByRole('button', { name: 'Reset experiment' }).click();
  expect(await state(root)).toEqual(JSON.parse(JSON.stringify(initial('network')))); await semantic(root); expect(errors).toEqual([]);
});

test('sigmoid record comparator retains exact contracts around the observed one-ULP difference', () => {
  numericalRecord([.5926665999540697, .5926665999540697], [.5926665999540698, .5926665999540698], true);
  expect(() => numericalRecord([.5926665999540697], [.5926665999540698], false)).toThrow();
  expect(() => numericalRecord({ shapes: { a1: [2, 1] } }, { shapes: { a1: [3, 1] } }, true)).toThrow();
  expect(() => numericalRecord({ output: [{ b: .375 }] }, { output: [{ b: .5 }] }, true)).toThrow();
  expect(() => numericalRecord('sigmoid', 'identity', true)).toThrow();
});
