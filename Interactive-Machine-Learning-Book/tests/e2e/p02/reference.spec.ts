import { expect, test, type Locator, type Page } from '@playwright/test';

const field = (page: Page, label: string) => page.getByRole('textbox', { name: new RegExp(`^${label}`) });
const shown = (value: number) => String(Number(value.toFixed(4)) + 0).replace('-', '−');

async function open(page: Page) {
  await page.goto('chapters/linear-regression/');
  const root = page.locator('[data-regression]');
  await expect(root).toBeVisible();
  await expect.poll(() => root.evaluate(element => element.closest('astro-island')?.hasAttribute('ssr') === false)).toBe(true);
  return root;
}

async function commit(page: Page, label: string, value: string) {
  const input = field(page, label);
  await input.fill(value);
  await input.press('Enter');
}

// Recompute from real DOM observations rather than importing the implementation or its goldens.
async function parity(page: Page, root: Locator) {
  const snapshot = await root.evaluate(element => {
    const number = (node: Element, name: string) => {
      const raw = node.getAttribute(name);
      if (raw === null || !Number.isFinite(Number(raw))) throw new Error(`Missing finite ${name}`);
      return Number(raw);
    };
    return {
      weight: number(element, 'data-weight'), bias: number(element, 'data-bias'),
      rate: number(element, 'data-learning-rate'), mse: number(element, 'data-mse'),
      rows: [...element.querySelectorAll('[data-row-id]')].map(row => ({
        id: row.getAttribute('data-row-id')!, x: number(row, 'data-x'), y: number(row, 'data-y'),
        prediction: number(row, 'data-prediction'), residual: number(row, 'data-residual'), squared: number(row, 'data-squared-error'),
      })),
      handles: [...element.querySelectorAll('[data-sample-id]')].map(handle => ({
        id: handle.getAttribute('data-sample-id')!, cx: number(handle, 'cx'), cy: number(handle, 'cy'),
      })),
    };
  });
  let squaredSum = 0, weightedSum = 0, residualSum = 0;
  for (const row of snapshot.rows) {
    const prediction = snapshot.weight * row.x + snapshot.bias;
    const residual = prediction - row.y;
    expect(row.prediction).toBeCloseTo(prediction, 11);
    expect(row.residual).toBeCloseTo(residual, 11);
    expect(row.squared).toBeCloseTo(residual * residual, 11);
    squaredSum += residual * residual; weightedSum += residual * row.x; residualSum += residual;
    const handle = snapshot.handles.find(point => point.id === row.id)!;
    expect(handle.cx).toBeCloseTo(320 + 44 * row.x, 11);
    expect(handle.cy).toBeCloseTo(320 - 44 * row.y, 11);
    const cells = root.locator(`[data-row-id="${row.id}"] td`);
    await expect(cells.nth(0)).toHaveText(String(row.x));
    await expect(cells.nth(1)).toHaveText(String(row.y));
    await expect(cells.nth(2)).toHaveText(`≈ ${shown(prediction)}`);
    await expect(cells.nth(3)).toHaveText(`≈ ${shown(residual)}`);
    await expect(cells.nth(4)).toHaveText(`≈ ${shown(residual * residual)}`);
  }
  const n = snapshot.rows.length;
  const dw = 2 * weightedSum / n, db = 2 * residualSum / n;
  const scalars = {
    mse: squaredSum / n, 'gradient-weight': dw, 'gradient-bias': db,
    'next-weight': snapshot.weight - snapshot.rate * dw, 'next-bias': snapshot.bias - snapshot.rate * db,
  };
  expect(snapshot.mse).toBeCloseTo(scalars.mse, 11);
  for (const [key, value] of Object.entries(scalars)) {
    const scalar = root.locator(`[data-value="${key}"]`);
    expect(Number(await scalar.getAttribute('data-number'))).toBeCloseTo(value, 11);
    await expect(scalar).toHaveText(`≈ ${shown(value)}`);
  }
  expect(Number(await field(page, 'Weight w').inputValue())).toBe(snapshot.weight);
  expect(Number(await field(page, 'Bias b').inputValue())).toBe(snapshot.bias);
  expect(Number(await field(page, 'Learning rate η').inputValue())).toBe(snapshot.rate);
  const selected = await page.getByRole('combobox', { name: /^Selected sample/ }).inputValue();
  const selectedRow = snapshot.rows.find(row => row.id === selected)!;
  expect(Number(await field(page, 'Sample x').inputValue())).toBe(selectedRow.x);
  expect(Number(await field(page, 'Sample y').inputValue())).toBe(selectedRow.y);
  await expect(root.locator('.inspector dd')).toHaveText([String(n), `${n} × 1`, '1 × 1', `${n} × 1`, 'Scalar']);
  const annotations = await root.locator('.formula annotation').allTextContents();
  expect(annotations[0]).toContain('\\hat y=wx+b');
  expect(annotations[0]).toContain(`w\\approx${shown(snapshot.weight).replace('−', '-')}`);
  expect(annotations[1]).toContain(`\\approx ${shown(scalars.mse).replace('−', '-')}`);
  expect(annotations[2]).toContain('=w-\\eta\\frac{\\partial L}{\\partial w}');
  const line = root.locator('[data-prediction-line]');
  for (const end of ['1', '2']) {
    const x = Number(await line.getAttribute(`data-x${end}`)), y = Number(await line.getAttribute(`data-y${end}`));
    expect(y).toBeCloseTo(snapshot.weight * x + snapshot.bias, 11);
    expect(Number(await line.getAttribute(`x${end}`))).toBeCloseTo(320 + 44 * x, 11);
    expect(Number(await line.getAttribute(`y${end}`))).toBeCloseTo(320 - 44 * y, 11);
  }
  return snapshot;
}

for (const theme of ['light', 'dark'] as const) test(`canonical state, projection and touch targets in ${theme}`, async ({ page }) => {
  await page.emulateMedia({ colorScheme: theme });
  const root = await open(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  const state = await parity(page, root);
  expect(state.weight).toBe(0.5); expect(state.bias).toBe(0); expect(state.mse).toBeCloseTo(4.1, 12);
  await expect(root.locator('[data-plane]')).toHaveAttribute('viewBox', '0 0 640 640');
  await expect.poll(() => root.locator('[data-sample-id]').evaluateAll(handles =>
    handles.every(handle => { const box = handle.getBoundingClientRect(); return box.width >= 44 && box.height >= 44; }))).toBe(true);
  expect(await root.locator('[data-plane]').evaluate(svg => {
    const box = svg.getBoundingClientRect(); return Math.abs(box.width - box.height);
  })).toBeLessThan(0.1);
  await expect(root.locator('[data-provenance]')).toContainText('Hand-authored toy data');
});

test('numeric edits reject invalid entries, preserve precision, announce results and reset', async ({ page }) => {
  const root = await open(page);
  await commit(page, 'Weight w', '0.1234567');
  await commit(page, 'Bias b', '-0.2345678');
  await commit(page, 'Learning rate η', '0.05');
  await page.getByRole('combobox', { name: /^Selected sample/ }).selectOption('s3');
  await commit(page, 'Sample x', '0.123456789123'); await commit(page, 'Sample y', '1.23456789123');
  let valid = await parity(page, root);
  expect(valid.weight).toBe(0.1234567);
  expect(valid.rows[2]!.x).toBe(0.123456789123); expect(valid.rows[2]!.y).toBe(1.23456789123);
  await expect(root.locator('[data-sample-id="s3"]')).toHaveAttribute('aria-label', /^Sample s3: x 0\.123456789123, target 1\.23456789123\./);
  await expect(root.locator('[data-announcement]')).toContainText('Sample s3, x 0.123456789123, target 1.23456789123');
  await expect(root.locator('[data-announcement]')).toContainText('Weight 0.1234567');
  await expect(root.locator('[data-announcement]')).toContainText(`Mean squared error approximately ${shown(valid.mse)}`);
  const handle = root.locator('[data-sample-id="s3"]');
  await handle.focus(); await handle.press('ArrowRight'); await handle.press('ArrowUp');
  valid = await parity(page, root);
  expect(valid.rows[2]!.x).toBe(0.123456789123 + 0.1);
  expect(valid.rows[2]!.y).toBe(1.23456789123 + 0.1);
  for (const [label, value] of [['Weight w', '99'], ['Sample x', '6'], ['Learning rate η', '0'], ['Bias b', 'NaN']]) {
    await commit(page, label!, value!);
    await expect(field(page, label!)).toHaveAttribute('aria-invalid', 'true');
    expect(Number(await root.getAttribute('data-weight'))).toBe(valid.weight);
    expect(Number(await root.getAttribute('data-mse'))).toBe(valid.mse);
  }
  await root.getByRole('button', { name: 'Reset experiment' }).click();
  const reset = await parity(page, root);
  expect(reset.weight).toBe(0.5); expect(reset.rows[2]!.x).toBe(0); expect(reset.rows[2]!.y).toBe(1);
  await expect(root.locator('[aria-invalid=true]')).toHaveCount(0);
});

test('keyboard and pointer edits share actual sample state and announce only at drag end', async ({ page }) => {
  const root = await open(page);
  const handle = root.locator('[data-sample-id="s3"]');
  await handle.focus(); await handle.press('ArrowRight'); await handle.press('Shift+ArrowUp');
  let state = await parity(page, root);
  expect(state.rows[2]!.x).toBe(0.1); expect(state.rows[2]!.y).toBe(1.5);
  await expect(root.locator('[data-announcement]')).toContainText('Sample s3, x 0.1, target 1.5');
  await root.getByRole('button', { name: 'Reset experiment' }).click();
  await handle.scrollIntoViewIfNeeded();
  const plot = await root.locator('[data-plane]').boundingBox();
  expect(plot).not.toBeNull();
  const before = await root.locator('[data-announcement]').textContent();
  const start = { x: plot!.x + 320 * plot!.width / 640, y: plot!.y + (320 - 44) * plot!.height / 640 };
  const end = { x: plot!.x + (320 + 22) * plot!.width / 640, y: plot!.y + (320 - 66) * plot!.height / 640 };
  await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 5 });
  expect(await root.locator('[data-announcement]').textContent()).toBe(before);
  await page.mouse.up();
  state = await parity(page, root);
  expect(state.rows[2]!.x).toBe(0.5); expect(state.rows[2]!.y).toBe(1.5);
  await expect(root.locator('[data-announcement]')).toContainText('Drag finished. Sample s3, x 0.5, target 1.5');
});

test('every replay frame drives controls, plot, table, formulas and inspector; editing starts there', async ({ page }) => {
  const root = await open(page);
  await root.getByRole('button', { name: 'Replay 3 updates' }).click();
  const playback = root.getByRole('navigation', { name: 'Trace playback' });
  let weight = 0.5, bias = 0;
  const observations = [[-2, -3], [-1, -1], [0, 1], [1, 3], [2, 4]];
  for (let index = 0; index < 4; index++) {
    const state = await parity(page, root);
    expect(state.weight).toBeCloseTo(weight, 12); expect(state.bias).toBeCloseTo(bias, 12);
    await expect(root).toHaveAttribute('data-frame-index', String(index));
    await expect(root.locator('[data-current-frame]')).toContainText(`Frame ${index + 1} / 4`);
    if (index < 3) {
      const residuals = observations.map(([x, y]) => ({ x: x!, r: weight * x! + bias - y! }));
      weight -= 0.1 * 2 / 5 * residuals.reduce((sum, row) => sum + row.r * row.x, 0);
      bias -= 0.1 * 2 / 5 * residuals.reduce((sum, row) => sum + row.r, 0);
      await playback.getByRole('button', { name: 'Next', exact: true }).click();
    }
  }
  await playback.getByRole('button', { name: 'First', exact: true }).click();
  await playback.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(root.locator('[data-announcement]')).toContainText('Replay frame 2 of 4');
  await commit(page, 'Weight w', '0.75');
  await expect(playback).toHaveCount(0);
  const edited = await parity(page, root);
  expect(edited.weight).toBe(0.75); expect(edited.bias).toBeCloseTo(0.16, 12);
  await root.getByRole('button', { name: 'Apply one update' }).click();
  await parity(page, root);
  await expect(root).toHaveAttribute('data-updates', '1');
});

test('unsupported updates and replays visibly preserve the valid state', async ({ page }) => {
  const root = await open(page);
  await commit(page, 'Learning rate η', '1');
  const before = await parity(page, root);
  for (const action of ['Apply one update', 'Replay 3 updates']) {
    await root.getByRole('button', { name: action }).click();
    await expect(root.locator('[data-rejection]')).toContainText('supported range');
    const after = await parity(page, root);
    expect(after).toEqual(before);
  }
});

test('reduced motion keeps manual replay usable and touch capture local to handles', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const root = await open(page);
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  expect(await root.evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0);
  expect(await root.locator('[data-plane]').evaluate(element => getComputedStyle(element).touchAction)).toBe('auto');
  expect(await root.locator('[data-sample-id="s1"]').evaluate(element => getComputedStyle(element).touchAction)).toBe('none');
  await root.getByRole('button', { name: 'Replay 3 updates' }).click();
  await root.getByRole('navigation', { name: 'Trace playback' }).getByRole('button', { name: 'Next', exact: true }).click();
  await parity(page, root);
});

test('prerequisites, real Python and graded misconception feedback are present', async ({ page }) => {
  await open(page);
  await expect(page.locator('.prerequisites a[href$="/chapters/matrix-vector/"]')).toContainText('II.9');
  await expect(page.locator('.prerequisites a[href$="/chapters/partial-derivatives/"]')).toContainText('III.7');
  await expect(page.locator('.prerequisites a[href$="/chapters/gradient-directional-derivatives/"]')).toContainText('III.8');
  await expect(page.locator('.code-file')).toContainText('def derive_regression(state)');
  await expect(page.locator('[data-exercise]')).toHaveCount(6);
  const exercise = page.locator('[data-exercise="iii07-residual"]');
  await exercise.getByRole('radio', { name: '2.5', exact: true }).check();
  await exercise.getByRole('button', { name: 'Check answer' }).click();
  await expect(exercise.getByRole('status')).toContainText('Try again.');
  await exercise.getByRole('radio', { name: '−2.5', exact: true }).check();
  await exercise.getByRole('button', { name: 'Check answer' }).click();
  await expect(exercise.getByRole('status')).toContainText('Correct.');
});
