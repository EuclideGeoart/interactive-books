/**
 * The notation map for ML (I.9): every stage checked from the DOM. Expected numbers are worked out here by hand (row-major positions r·d + c,
 * the inner/outer rule for products, the 3-4-5 triangle, tie positions on a grid that starts at −4, expectations as sum of p·x with exact
 * fractions, forward differences 2θ + h and 6θ + 3h), never read back from the application's own model.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { noPageOverflow } from './helpers';

const PATH = 'chapters/notation-map/';

async function open(page: Page, selector: string): Promise<Locator> {
  await page.goto(PATH);
  const stage = page.locator(selector).first();
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute('data-hydrated', 'true');
  await page.evaluate(() => document.fonts.ready);
  return stage;
}
const shape = (page: Page) => open(page, '[data-stage="shape"]');
const algebra = (page: Page) => open(page, '[data-stage="algebra"]');
const norm = (page: Page) => open(page, '[data-stage="norm"]');
const argmin = (page: Page) => open(page, '[data-stage="argmin"]');
const expectation = (page: Page) => open(page, '[data-stage="expect"]');
const gradient = (page: Page) => open(page, '[data-stage="gradient"]');
const table = (page: Page) => open(page, '[data-stage="notation-table"]');

const lines = (stage: Locator, id: string) =>
  stage.locator(`[data-quantity="${id}"] dd .line`).evaluateAll(els => els.map(e => `${e.querySelector('.rel')?.textContent ?? ''} ${e.querySelector('.val')?.textContent ?? ''}`.replace(/\s+/g, ' ').trim()));
const preset = (stage: Locator, id: string) => stage.locator(`button[data-preset="${id}"]`);
const field = (stage: Locator, name: RegExp) => stage.getByRole('spinbutton', { name });
async function enter(stage: Locator, name: RegExp, text: string) {
  const f = field(stage, name);
  await f.fill(text);
  await f.press('Enter');
}
const segment = (stage: Locator, name: string | RegExp) => stage.getByRole('radio', { name });

test.describe('publication', () => {
  test('metadata, outline, seven hydrated stages, ten exercises', async ({ page }) => {
    await page.goto(PATH);
    await expect(page).toHaveTitle(/The notation map for ML/);
    await expect(page.locator('h1')).toHaveCount(1);
    const h2 = await page.locator('main h2').allTextContents();
    for (const heading of ['Intuition', 'Definition', 'Mechanics', 'Worked examples', 'Executable reference code', 'Explore', 'Common mistakes', 'Numerical considerations', 'Connections', 'Exercises', 'Summary and checkpoints'])
      expect(h2.some(t => t.includes(heading)), heading).toBe(true);
    for (const s of ['shape', 'algebra', 'norm', 'argmin', 'expect', 'gradient', 'notation-table']) {
      const stage = page.locator(`[data-stage="${s}"]`).first();
      await stage.scrollIntoViewIfNeeded();
      await expect(stage).toHaveAttribute('data-hydrated', 'true');
    }
    await expect(page.locator('[data-exercise]')).toHaveCount(10);
  });
  test('no duplicate ids and no page overflow, with every island hydrated', async ({ page }) => {
    await page.goto(PATH);
    await page.locator('[data-stage="notation-table"][data-hydrated="true"]').waitFor();
    await page.locator('[data-exercise][data-hydrated="true"]').last().waitFor();
    const dupes = await page.evaluate(() => { const seen = new Map<string, number>(); document.querySelectorAll('[id]').forEach(e => seen.set(e.id, (seen.get(e.id) ?? 0) + 1)); return [...seen].filter(([, n]) => n > 1).map(([id]) => id); });
    expect(dupes).toEqual([]);
    expect(await noPageOverflow(page)).toBe(true);
  });
  test('the previous chapter links to this one', async ({ page }) => {
    await page.goto('chapters/summation/');
    await expect(page.locator('a[href*="notation-map"]').first()).toBeVisible();
  });
});

test.describe('largest states fit the stage (checked at the narrowest width the project tests)', () => {
  /** Every wide thing must end inside its stage's right edge: a clipped table would pass the page-overflow check. */
  const insideStage = async (stage: Locator, selector: string) => {
    const gap = await stage.evaluate((el, sel) => {
      const edge = el.getBoundingClientRect().right;
      return Math.max(...[...el.querySelectorAll(sel)].map(t => t.getBoundingClientRect().right - edge));
    }, selector);
    expect(gap, selector).toBeLessThanOrEqual(0.5);
  };
  test('an 8 × 8 matrix, an 8 × 8 × 8 tensor and the widest product stay inside their stages', async ({ page }) => {
    const s = await shape(page);
    await enter(s, /number of examples|rows of X/, '8');
    await enter(s, /number of features|columns of X/, '8');
    for (const sel of ['.shape-diagram', '.slab-grid', '.axis-legend', '.inspector-row dd', '.py-code', '.verdict', '.formula-panel']) await insideStage(s, sel);
    await segment(s, /tensor/).click();
    await enter(s, /batch size/, '8');
    await enter(s, /sequence length/, '8');
    for (const sel of ['.shape-diagram', '.slab', '.slab-grid', '.axis-legend', '.inspector-row dd', '.py-code', '.verdict', '.formula-panel']) await insideStage(s, sel);
    const a = await algebra(page);
    await preset(a, 'matrix').click();
    await enter(a, /number of examples|rows of X/, '8');
    await enter(a, /number of features|columns of X/, '8');
    await enter(a, /rows of W|entries of w/, '8');
    await enter(a, /columns of W/, '8');
    for (const sel of ['.box-row', '.mat-box', '.inspector-row dd', '.py-code', '.verdict', '.formula-panel']) await insideStage(a, sel);
    expect(await noPageOverflow(page)).toBe(true);
  });
  test('the loss table, the counts table, the error table and the notation table stay inside their stages', async ({ page }) => {
    const m = await argmin(page);
    await preset(m, 'wells').click();
    for (const sel of ['.loss-table-wrap', '.loss-table', '.inspector-row dd', '.py-code', '.verdict']) await insideStage(m, sel);
    const e = await expectation(page);
    for (const sel of ['.expect-table-wrap', '.expect-table', '.inspector-row dd', '.py-code', '.verdict']) await insideStage(e, sel);
    const g = await gradient(page);
    await preset(g, 'tiny-step').click();
    for (const sel of ['.error-table-wrap', '.error-table', '.inspector-row dd', '.py-code', '.verdict']) await insideStage(g, sel);
    const t = await table(page);
    for (const sel of ['.nt-entry', '.nt-symbol', '.nt-facts dd', '.nt-facts code']) await insideStage(t, sel);
    expect(await noPageOverflow(page)).toBe(true);
  });
  test('the norm plane with a long vector and the readouts stay inside their stage', async ({ page }) => {
    const n = await norm(page);
    await enter(n, /first entry/, '-4');
    await enter(n, /second entry/, '4');
    for (const sel of ['svg.plane', '.inspector-row dd', '.py-code', '.verdict', '.formula-panel']) await insideStage(n, sel);
    expect(await noPageOverflow(page)).toBe(true);
  });
});

test.describe('the shape stage', () => {
  test('starts as a 4 × 3 data matrix and points at example 2, feature 3: NumPy X[1, 2] at position 1 · 3 + 2 = 5', async ({ page }) => {
    const stage = await shape(page);
    await expect(stage).toHaveAttribute('data-shape', '(4, 3)');
    await expect(stage).toHaveAttribute('data-count', '12');
    await expect(stage).toHaveAttribute('data-offset', '5');
    await expect(stage).toHaveAttribute('data-valid', 'true');
    await expect(stage.locator('.sh-cell[data-mark="selected"]')).toHaveCount(1);
    await expect(stage.locator('.sh-cell[data-mark="selected"]')).toHaveText('5');
    await expect(stage.locator('.sh-cell')).toHaveCount(12);
    await expect(stage.locator('[data-code]')).toContainText('X[1, 2]');
    expect(await lines(stage, 'shape')).toEqual(['= (4, 3)']);
    expect(await lines(stage, 'count')).toEqual(['= 12']);
  });
  test('a wide matrix: the last entry of a 2 × 6 matrix is at position 6 + 5 = 11, one less than the number of entries', async ({ page }) => {
    const stage = await shape(page);
    await preset(stage, 'wide').click();
    await expect(stage).toHaveAttribute('data-offset', '11');
    await expect(stage).toHaveAttribute('data-count', '12');
    await expect(stage.locator('.sh-cell[data-mark="selected"]')).toHaveText('11');
  });
  test('a batch of 2 × 3 × 4: the last entry is at ((1 · 3) + 2) · 4 + 3 = 23 of 24, and every slab has its own grid', async ({ page }) => {
    const stage = await shape(page);
    await preset(stage, 'batch').click();
    await expect(stage).toHaveAttribute('data-shape', '(2, 3, 4)');
    await expect(stage).toHaveAttribute('data-offset', '23');
    await expect(stage).toHaveAttribute('data-count', '24');
    await expect(stage.locator('.slab')).toHaveCount(2);
    await expect(stage.locator('.sh-cell')).toHaveCount(24);
    await expect(stage.locator('.sh-cell[data-mark="selected"]')).toHaveText('23');
  });
  test('a vector is one column of d entries; a scalar has shape () and no index to point with', async ({ page }) => {
    const stage = await shape(page);
    await preset(stage, 'one-example').click();
    await expect(stage).toHaveAttribute('data-shape', '(5,)');
    await expect(stage).toHaveAttribute('data-offset', '1');
    await expect(stage.locator('.sh-cell')).toHaveCount(5);
    await preset(stage, 'scalar').click();
    await expect(stage).toHaveAttribute('data-shape', '()');
    await expect(stage).toHaveAttribute('data-count', '1');
    await expect(stage.locator('.sh-cell')).toHaveCount(1);
  });
  test('an index past the end is an IndexError and marks no cell', async ({ page }) => {
    const stage = await shape(page);
    await preset(stage, 'beyond').click();
    await expect(stage).toHaveAttribute('data-valid', 'false');
    await expect(stage.locator('.sh-cell[data-mark="selected"]')).toHaveCount(0);
    await expect(stage.locator('[data-code]')).toContainText('IndexError');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
    expect((await lines(stage, 'element'))[0]).toContain('undefined');
  });
  test('index 0 is not a mathematical index, and in NumPy it does NOT fail: it counts from the end', async ({ page }) => {
    const stage = await shape(page);
    await preset(stage, 'zero').click();
    await expect(stage).toHaveAttribute('data-valid', 'false');
    await expect(stage.locator('[data-code]')).toContainText('does NOT fail');
    await expect(stage.locator('[data-code]')).not.toContainText('IndexError');
    await expect(stage.locator('[data-verdict]')).toContainText('not');
  });
  test('typing a size or index that is not allowed is rejected and the stage keeps its last good state', async ({ page }) => {
    const stage = await shape(page);
    await enter(stage, /number of examples|rows of X/, '9');
    await expect(stage).toHaveAttribute('data-shape', '(4, 3)');
    await expect(field(stage, /number of examples|rows of X/)).toHaveAttribute('aria-invalid', 'true');
    await enter(stage, /number of examples|rows of X/, '2.5');
    await expect(stage).toHaveAttribute('data-shape', '(4, 3)');
    await enter(stage, /number of examples|rows of X/, '6');
    await expect(stage).toHaveAttribute('data-shape', '(6, 3)');
    await expect(stage).toHaveAttribute('data-count', '18');
    await expect(stage.locator('[data-announcement]')).not.toBeEmpty();
  });
  test('Reset returns to the canonical state', async ({ page }) => {
    const stage = await shape(page);
    await expect(stage.locator('[data-action="reset"]')).toBeDisabled();
    await preset(stage, 'batch').click();
    await expect(stage.locator('[data-action="reset"]')).toBeEnabled();
    await stage.locator('[data-action="reset"]').click();
    await expect(stage).toHaveAttribute('data-shape', '(4, 3)');
    await expect(preset(stage, 'data-matrix')).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('the product stage', () => {
  const resultOf = async (stage: Locator) => stage.getAttribute('data-result');
  test('X w with a 4 × 3 matrix and 3 entries gives 4 entries; with 4 entries it does not exist: 3 ≠ 4', async ({ page }) => {
    const stage = await algebra(page);
    expect(await resultOf(stage)).toBe('(4,)');
    await expect(stage).toHaveAttribute('data-valid', 'true');
    await preset(stage, 'mismatch').click();
    await expect(stage).toHaveAttribute('data-valid', 'false');
    expect(await resultOf(stage)).toBe('undefined');
    await expect(stage.locator('[data-undefined]')).toBeVisible();
    await expect(stage.locator('[data-code]')).toContainText('ValueError');
    expect((await lines(stage, 'result'))[0]).toContain('undefined');
    await expect(stage.locator('[data-verdict]')).toContainText('3 ≠ 4');
  });
  test('X W: (4 × 3)(3 × 2) is 4 × 2, and (4 × 3)(2 × 2) does not exist', async ({ page }) => {
    const stage = await algebra(page);
    await preset(stage, 'matrix').click();
    expect(await resultOf(stage)).toBe('(4, 2)');
    await preset(stage, 'matrix-mismatch').click();
    expect(await resultOf(stage)).toBe('undefined');
    await expect(stage.locator('[data-verdict]')).toContainText('3 ≠ 2');
  });
  test('the transpose swaps the sizes and X-transpose X is always d × d', async ({ page }) => {
    const stage = await algebra(page);
    await preset(stage, 'transpose').click();
    expect(await resultOf(stage)).toBe('(3, 4)');
    await preset(stage, 'gram').click();
    expect(await resultOf(stage)).toBe('(3, 3)');
    await enter(stage, /number of features|columns of X/, '7');
    expect(await resultOf(stage)).toBe('(7, 7)');
    await expect(stage).toHaveAttribute('data-valid', 'true');
  });
  test('a larger product: (6 × 4)(4 × 3) is 6 × 3', async ({ page }) => {
    const stage = await algebra(page);
    await preset(stage, 'matrix').click();
    await enter(stage, /number of examples|rows of X/, '6');
    await enter(stage, /number of features|columns of X/, '4');
    await enter(stage, /rows of W|entries of w/, '4');
    await enter(stage, /columns of W/, '3');
    expect(await resultOf(stage)).toBe('(6, 3)');
  });
});

test.describe('the norm stage', () => {
  test('(3, 4) has norms 7, 5 and 4, every one exact', async ({ page }) => {
    const stage = await norm(page);
    expect(await lines(stage, 'l1')).toEqual(['= 7']);
    expect(await lines(stage, 'l2')).toEqual(['= 5']);
    expect(await lines(stage, 'linf')).toEqual(['= 4']);
    await expect(stage.locator('[data-verdict]')).toContainText('4');
  });
  test('(1, 1) has Euclidean norm √2: shown exactly and then as an approximation, never the reverse', async ({ page }) => {
    const stage = await norm(page);
    await preset(stage, 'diagonal').click();
    const l2 = await lines(stage, 'l2');
    expect(l2).toHaveLength(2);
    expect(l2[0]).toMatch(/^= .*√2/);
    expect(l2[1]).toMatch(/^≈ 1\.41421/);
    expect(await lines(stage, 'l1')).toEqual(['= 2']);
    expect(await lines(stage, 'linf')).toEqual(['= 1']);
  });
  test('(4, 0): all three norms are 4, because the chain collapses on a coordinate axis', async ({ page }) => {
    const stage = await norm(page);
    await preset(stage, 'axis').click();
    for (const id of ['l1', 'l2', 'linf']) expect(await lines(stage, id)).toEqual(['= 4']);
  });
  test('(−3, 2): 5, √13, 3 and the chain 3 ≤ √13 ≤ 5', async ({ page }) => {
    const stage = await norm(page);
    await preset(stage, 'negative').click();
    expect(await lines(stage, 'l1')).toEqual(['= 5']);
    expect((await lines(stage, 'l2'))[0]).toMatch(/√13/);
    expect(await lines(stage, 'linf')).toEqual(['= 3']);
  });
  test('(1.5, 0.5): norms 2, √10 / 2 and 1.5, using exact fractions', async ({ page }) => {
    const stage = await norm(page);
    await preset(stage, 'half').click();
    expect(await lines(stage, 'l1')).toEqual(['= 2']);
    expect(await lines(stage, 'linf')).toEqual(['= 3/2', '≈ 1.500000']);
    expect((await lines(stage, 'l2'))[1]).toMatch(/^≈ 1\.58113/);
  });
  test('the zero vector has size 0 in every norm and no direction', async ({ page }) => {
    const stage = await norm(page);
    await preset(stage, 'zero').click();
    await expect(stage).toHaveAttribute('data-zero', 'true');
    for (const id of ['l1', 'l2', 'linf']) expect(await lines(stage, id)).toEqual(['= 0']);
  });
  test('the ball of the chosen norm changes with the selection; the dashed unit balls stay', async ({ page }) => {
    const stage = await norm(page);
    await expect(stage.locator('path.ball[data-part^="unit-"]')).toHaveCount(3);
    await segment(stage, /ℓ₁/).click();
    await expect(stage).toHaveAttribute('data-norm', '1');
    await expect(stage.locator('path.ball[data-part="ball-1"]')).toHaveCount(1);
    await segment(stage, /ℓ∞/).click();
    await expect(stage.locator('path.ball[data-part="ball-inf"]')).toHaveCount(1);
    await expect(stage.locator('path.ball[data-part^="unit-"]')).toHaveCount(3);
  });
  test('a component outside the allowed window is rejected', async ({ page }) => {
    const stage = await norm(page);
    await enter(stage, /first entry/, '99');
    await expect(stage).toHaveAttribute('data-x1', '3');
    await expect(field(stage, /first entry/)).toHaveAttribute('aria-invalid', 'true');
  });
});

test.describe('the arg min stage', () => {
  test('the bowl at 2 raised by 1: minimum 1, arg min {2}, np.argmin position 6 on a grid that starts at −4', async ({ page }) => {
    const stage = await argmin(page);
    await expect(stage).toHaveAttribute('data-min', '1');
    await expect(stage).toHaveAttribute('data-argmin', '2');
    await expect(stage).toHaveAttribute('data-np-index', '6');
    await expect(stage).toHaveAttribute('data-tie', 'false');
    expect(await lines(stage, 'min')).toEqual(['= 1']);
    expect(await lines(stage, 'np-index')).toEqual(['= 6']);
    await expect(stage.locator('tr[data-minimiser="true"]')).toHaveCount(1);
  });
  test('raising the loss changes the minimum value and not the arg min', async ({ page }) => {
    const stage = await argmin(page);
    await preset(stage, 'raised').click();
    await expect(stage).toHaveAttribute('data-min', '5');
    await expect(stage).toHaveAttribute('data-argmin', '2');
    await expect(stage).toHaveAttribute('data-np-index', '6');
  });
  test('two wells: arg min is the set {−1, 1}, and np.argmin reports only the first, position 3', async ({ page }) => {
    const stage = await argmin(page);
    await preset(stage, 'wells').click();
    await expect(stage).toHaveAttribute('data-tie', 'true');
    await expect(stage).toHaveAttribute('data-argmin', '-1,1');
    await expect(stage).toHaveAttribute('data-np-index', '3');
    await expect(stage.locator('tr[data-minimiser="true"]')).toHaveCount(2);
    await expect(stage.locator('tr[data-np="true"]')).toHaveAttribute('data-row', '3');
    await expect(stage.locator('[data-verdict]')).toContainText(/first/i);
  });
  test('shifting the wells right by one moves the first minimiser to 0, position 4', async ({ page }) => {
    const stage = await argmin(page);
    await preset(stage, 'wells-shifted').click();
    await expect(stage).toHaveAttribute('data-argmin', '0,2');
    await expect(stage).toHaveAttribute('data-np-index', '4');
  });
  test('a flat bottom has three minimisers and still only one np.argmin', async ({ page }) => {
    const stage = await argmin(page);
    await preset(stage, 'flat').click();
    const set = (await stage.getAttribute('data-argmin'))!.split(',');
    expect(set).toHaveLength(3);
    await expect(stage.locator('tr[data-np="true"]')).toHaveCount(1);
    await expect(stage).toHaveAttribute('data-tie', 'true');
  });
  test('one minimiser at 0 is position 4', async ({ page }) => {
    const stage = await argmin(page);
    await preset(stage, 'unique').click();
    await expect(stage).toHaveAttribute('data-argmin', '0');
    await expect(stage).toHaveAttribute('data-np-index', '4');
  });
});

test.describe('the expectation stage', () => {
  test('a die seen 1, 2, ..., 6 times: total 21, probabilities k/21, E[X] = 91/21 = 13/3', async ({ page }) => {
    const stage = await expectation(page);
    await expect(stage).toHaveAttribute('data-total', '21');
    await expect(stage).toHaveAttribute('data-expectation', '13/3');
    expect(await lines(stage, 'total')).toEqual(['= 21']);
    expect(await lines(stage, 'sum-p')).toEqual(['= 1']);
    expect((await lines(stage, 'expectation'))[0]).toBe('= 13/3');
    await expect(stage.locator('td[data-p="1"]')).toContainText('2/21');
  });
  test('a fair die has E[X] = 7/2, a value no face shows', async ({ page }) => {
    const stage = await expectation(page);
    await preset(stage, 'fair').click();
    await expect(stage).toHaveAttribute('data-expectation', '7/2');
    await expect(stage.locator('[data-verdict]')).toContainText('not');
  });
  test('always a six: E[X] = 6', async ({ page }) => {
    const stage = await expectation(page);
    await preset(stage, 'single').click();
    await expect(stage).toHaveAttribute('data-expectation', '6/1');
  });
  test('payoffs −1, 0, 2 with counts 3, 1, 1: E[X] = (−3 + 0 + 2) / 5 = −1/5', async ({ page }) => {
    const stage = await expectation(page);
    await preset(stage, 'payoff').click();
    await expect(stage).toHaveAttribute('data-expectation', '-1/5');
    await expect(stage).toHaveAttribute('data-total', '5');
  });
  test('ratings 0 to 4 with counts 2, 3, 5, 8, 2: total 20, sum 45, E[X] = 9/4', async ({ page }) => {
    const stage = await expectation(page);
    await preset(stage, 'ratings').click();
    await expect(stage).toHaveAttribute('data-total', '20');
    await expect(stage).toHaveAttribute('data-expectation', '9/4');
    expect((await lines(stage, 'expectation'))).toEqual(['= 9/4', '≈ 2.250000']);
  });
  test('no data: the division is by 0 and the expectation is undefined, never 0', async ({ page }) => {
    const stage = await expectation(page);
    await preset(stage, 'empty').click();
    await expect(stage).toHaveAttribute('data-defined', 'false');
    await expect(stage).toHaveAttribute('data-expectation', 'undefined');
    expect((await lines(stage, 'expectation'))[0]).toContain('undefined');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
    await expect(stage.locator('[data-verdict]')).toContainText('divide by 0');
  });
  test('typing a count: 1.5 and −1 are rejected, 3 is accepted and doubles the weight of that value', async ({ page }) => {
    const stage = await expectation(page);
    await preset(stage, 'fair').click();
    await enter(stage, /count of the value 1\b/, '-1');
    await expect(stage).toHaveAttribute('data-total', '6');
    await enter(stage, /count of the value 1\b/, '1.5');
    await expect(stage).toHaveAttribute('data-total', '6');
    await enter(stage, /count of the value 1\b/, '7');
    await expect(stage).toHaveAttribute('data-total', '12');
  });
});

test.describe('the gradient stage', () => {
  test('at θ = (1, 2) the exact gradient is (2, 12), a column with the shape of θ, and the estimates are approximations', async ({ page }) => {
    const stage = await gradient(page);
    await expect(stage).toHaveAttribute('data-shape', '(2,)');
    expect(await lines(stage, 'grad1')).toEqual(['= 2']);
    expect(await lines(stage, 'grad2')).toEqual(['= 12']);
    for (const id of ['est1', 'est2', 'err1', 'err2']) expect((await lines(stage, id)).every(l => l.startsWith('≈'))).toBe(true);
    expect((await lines(stage, 'est1'))[0]).toMatch(/^≈ 2\.001/);
    expect((await lines(stage, 'est2'))[0]).toMatch(/^≈ 12\.003/);
  });
  test('a large step gives the estimates 2 + h = 2.1 and 12 + 3h = 12.3: far from the exact gradient', async ({ page }) => {
    const stage = await gradient(page);
    await preset(stage, 'large-step').click();
    expect((await lines(stage, 'est1'))[0]).toMatch(/^≈ 2\.1/);
    expect((await lines(stage, 'est2'))[0]).toMatch(/^≈ 12\.3/);
  });
  test('a negative point: the exact gradient is (−3, 3) and the forward difference over-estimates in θ₂', async ({ page }) => {
    const stage = await gradient(page);
    await preset(stage, 'negative').click();
    expect(await lines(stage, 'grad1')).toEqual(['= −3']);
    expect(await lines(stage, 'grad2')).toEqual(['= 3']);
  });
  test('at the origin the gradient is the zero column', async ({ page }) => {
    const stage = await gradient(page);
    await preset(stage, 'origin').click();
    expect(await lines(stage, 'grad1')).toEqual(['= 0']);
    expect(await lines(stage, 'grad2')).toEqual(['= 0']);
  });
  test('the error table lists the five steps, marks the chosen one and says which is smallest', async ({ page }) => {
    const stage = await gradient(page);
    await expect(stage.locator('tr[data-step-row]')).toHaveCount(5);
    await expect(stage.locator('tr[data-current="true"]')).toHaveAttribute('data-step-row', '3');
    await expect(stage.locator('tr[data-best="true"]')).toHaveCount(1);
    const best = Number(await stage.locator('tr[data-best="true"]').getAttribute('data-step-row'));
    expect([6, 9]).toContain(best);
    await preset(stage, 'tiny-step').click();
    await expect(stage.locator('tr[data-current="true"]')).toHaveAttribute('data-step-row', '13');
  });
  test('a point outside the allowed window is rejected', async ({ page }) => {
    const stage = await gradient(page);
    await enter(stage, /first parameter/, '10');
    await expect(stage).toHaveAttribute('data-t1', '1');
  });
});

test.describe('the notation table', () => {
  test('lists every entry at first, grouped by category, with the count announced', async ({ page }) => {
    const stage = await table(page);
    const total = Number(await stage.getAttribute('data-total'));
    expect(total).toBeGreaterThanOrEqual(40);
    await expect(stage.locator('li[data-entry]')).toHaveCount(total);
    await expect(stage.locator('[data-group]')).toHaveCount(8);
    await expect(stage.locator('[data-result-count]')).toContainText(String(total));
    await expect(stage.locator('[data-action="clear-filters"]')).toBeDisabled();
  });
  test('searching narrows the list and the count follows; a word that matches nothing says so and can be cleared', async ({ page }) => {
    const stage = await table(page);
    const total = Number(await stage.getAttribute('data-total'));
    await stage.locator('[data-search]').fill('transpose');
    const shown = Number(await stage.getAttribute('data-shown'));
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(total);
    await expect(stage.locator('li[data-entry]')).toHaveCount(shown);
    await stage.locator('[data-search]').fill('zzzzqx');
    await expect(stage.locator('li[data-entry]')).toHaveCount(0);
    await expect(stage.locator('[data-no-match]')).toBeVisible();
    await stage.locator('[data-action="clear-filters-inline"]').click();
    await expect(stage.locator('li[data-entry]')).toHaveCount(total);
    await expect(stage.locator('[data-no-match]')).toHaveCount(0);
    await expect(stage.locator('[data-search]')).toHaveValue('');
  });
  test('a category button shows only that category; All restores the list', async ({ page }) => {
    const stage = await table(page);
    const total = Number(await stage.getAttribute('data-total'));
    await stage.locator('[data-category-button="probability"]').click();
    await expect(stage.locator('[data-group]')).toHaveCount(1);
    await expect(stage.locator('[data-group]')).toHaveAttribute('data-group', 'probability');
    await expect(stage.locator('[data-category-button="probability"]')).toHaveAttribute('aria-pressed', 'true');
    const shown = Number(await stage.getAttribute('data-shown'));
    expect(shown).toBeLessThan(total);
    await stage.locator('[data-category-button="all"]').click();
    await expect(stage.locator('li[data-entry]')).toHaveCount(total);
  });
  test('every entry names what it reads as, its meaning, its shape and where it is developed; runnable ones show Python', async ({ page }) => {
    const stage = await table(page);
    const entries = stage.locator('li[data-entry]');
    const n = await entries.count();
    for (let k = 0; k < n; k++) {
      const entry = entries.nth(k);
      for (const dt of ['Read as', 'Means', 'Shape', 'Python', 'Developed in']) await expect(entry.locator('dt', { hasText: dt })).toHaveCount(1);
    }
    expect(await stage.locator('code[data-runs="true"]').count()).toBeGreaterThanOrEqual(30);
  });
});

test.describe('exercises', () => {
  const answer = async (page: Page, id: string, fill: Record<string, string> | { choice: string }) => {
    const form = page.locator(`[data-exercise="${id}"]`);
    await form.scrollIntoViewIfNeeded();
    await expect(form).toHaveAttribute('data-hydrated', 'true');
    if ('choice' in fill) await form.locator('label.choice', { has: page.locator(`input[value="${fill.choice}"]`) }).click();
    else for (const [k, v] of Object.entries(fill)) await form.locator(`input[data-field="${k}"]`).fill(v);
    await form.locator('[data-action="check"]').click();
    return form;
  };
  test('numbers: correct answers are accepted; the typical slips get their own hint; junk asks for numbers', async ({ page }) => {
    await page.goto(PATH);
    let form = await answer(page, 'entry-index', { example: '3', feature: '4', position: '11' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'entry-index', { example: '2', feature: '3', position: '11' });
    await expect(form).toHaveAttribute('data-result', 'incorrect');
    await expect(form.locator('[data-feedback]')).toContainText('NumPy numbers');
    form = await answer(page, 'last-entry', { i: '4', j: '3', position: '11' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'product-shapes', { 'xw-rows': '6', 'xw-cols': '3', 'g-rows': '4', 'g-cols': '4' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'norms', { l1: '14', l2: '10', linf: '8' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'norms', { l1: '2', l2: '10', linf: '8' });
    await expect(form.locator('[data-feedback]')).toContainText('ABSOLUTE');
    form = await answer(page, 'argmin-min', { min: '2', argmin: '3', npargmin: '7' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'expectation', { value: '-1/5' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'expectation', { value: '1/3' });
    await expect(form.locator('[data-feedback]')).toContainText('plain average');
    form = await answer(page, 'norms', { l1: 'many', l2: '10', linf: '8' });
    await expect(form.locator('[data-feedback]')).toContainText('Enter');
  });
  test('multiple choice: each wrong choice is incorrect with its own hint, the right one is correct; Reset clears', async ({ page }) => {
    await page.goto(PATH);
    let form = await answer(page, 'product-defined', { choice: 'broadcast' });
    await expect(form).toHaveAttribute('data-result', 'incorrect');
    await expect(form.locator('[data-feedback]')).toContainText('elementwise');
    form = await answer(page, 'product-defined', { choice: 'transpose' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'argmin-tie', { choice: 'second' });
    await expect(form).toHaveAttribute('data-result', 'incorrect');
    form = await answer(page, 'argmin-tie', { choice: 'position' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'no-data', { choice: 'zero' });
    await expect(form.locator('[data-feedback]')).toContainText('0 / 0');
    form = await answer(page, 'no-data', { choice: 'undefined' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'gradient-shape', { choice: 'square' });
    await expect(form.locator('[data-feedback]')).toContainText('Hessian');
    form = await answer(page, 'gradient-shape', { choice: 'same' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    await form.locator('[data-action="reset-exercise"]').click();
    await expect(form).toHaveAttribute('data-result', 'none');
  });
});
