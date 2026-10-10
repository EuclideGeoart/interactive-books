/**
 * Indexed quantities and summation (I.8): every stage checked from the DOM. Expected numbers are worked out here by hand or by an
 * independent short computation (triangular numbers 1, 3, 6, 10, 15; the row and column totals of a 3 × 4 table of i·j; the order in which
 * a triangle is visited), never read back from the application's own model.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { noPageOverflow } from './helpers';

const PATH = 'chapters/summation/';

async function open(page: Page, selector: string): Promise<Locator> {
  await page.goto(PATH);
  const stage = page.locator(selector).first();
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute('data-hydrated', 'true');
  await page.evaluate(() => document.fonts.ready);
  return stage;
}
const sum = (page: Page) => open(page, '[data-stage="sum"]');
const loops = (page: Page) => open(page, '[data-stage="loops"]');
const nested = (page: Page) => open(page, '[data-stage="nested"]');
const identities = (page: Page) => open(page, '[data-stage="identities"]');
const worked = (page: Page) => open(page, '[data-stage="worked"]');

const lines = (stage: Locator, id: string) =>
  stage.locator(`[data-quantity="${id}"] dd .line`).evaluateAll(els => els.map(e => `${e.querySelector('.rel')?.textContent ?? ''} ${e.querySelector('.val')?.textContent ?? ''}`.replace(/\s+/g, ' ').trim()));
const preset = (stage: Locator, id: string) => stage.locator(`button[data-preset="${id}"]`);
const field = (stage: Locator, name: RegExp) => stage.getByRole('spinbutton', { name });
async function enter(stage: Locator, name: RegExp, text: string) {
  const f = field(stage, name);
  await f.fill(text);
  await f.press('Enter');
}
const trace = (stage: Locator) => stage.locator('.trace').first();
const index = async (stage: Locator) => Number(await trace(stage).getAttribute('data-trace-index'));
const next = (stage: Locator) => trace(stage).getByRole('button', { name: /^Next/ });
const back = (stage: Locator) => trace(stage).getByRole('button', { name: /^Reset$/ });

test.describe('publication', () => {
  test('metadata, outline, five hydrated stages, ten exercises', async ({ page }) => {
    await page.goto(PATH);
    await expect(page).toHaveTitle(/Indexed quantities and summation/);
    await expect(page.locator('h1')).toHaveCount(1);
    const h2 = await page.locator('main h2').allTextContents();
    for (const heading of ['Intuition', 'Definition', 'Mechanics', 'Worked examples', 'Executable reference code', 'Explore', 'Common mistakes', 'Numerical considerations', 'Connections', 'Exercises', 'Summary and checkpoints'])
      expect(h2.some(t => t.includes(heading)), heading).toBe(true);
    for (const s of ['sum', 'loops', 'nested', 'identities', 'worked']) {
      const stage = page.locator(`[data-stage="${s}"]`).first();
      await stage.scrollIntoViewIfNeeded();
      await expect(stage).toHaveAttribute('data-hydrated', 'true');
    }
    await expect(page.locator('[data-exercise]')).toHaveCount(10);
  });
  test('no duplicate ids and no page overflow, with every island hydrated', async ({ page }) => {
    await page.goto(PATH);
    await page.locator('[data-stage="worked"][data-hydrated="true"]').waitFor();
    await page.locator('[data-exercise][data-hydrated="true"]').last().waitFor();
    const dupes = await page.evaluate(() => { const seen = new Map<string, number>(); document.querySelectorAll('[id]').forEach(e => seen.set(e.id, (seen.get(e.id) ?? 0) + 1)); return [...seen].filter(([, n]) => n > 1).map(([id]) => id); });
    expect(dupes).toEqual([]);
    expect(await noPageOverflow(page)).toBe(true);
  });
  test('the previous chapter links to this one', async ({ page }) => {
    await page.goto('chapters/sets-and-relations/');
    await expect(page.locator('a[href*="summation"]').first()).toBeVisible();
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
  test('a geometric sum with ratio 4.99 over the widest window and an eight-entry list stay inside the stage', async ({ page }) => {
    const stage = await sum(page);
    await preset(stage, 'geometric').click();
    await enter(stage, /ratio/, '4.99');
    await enter(stage, /lower bound/, '-5');
    await enter(stage, /upper bound/, '20');
    await expect(stage).toHaveAttribute('data-count', '26');
    for (const sel of ['.inspector-row dd', '.py-code', '.verdict', '.term-table', '.trace', '.formula-panel']) await insideStage(stage, sel);
    await preset(stage, 'list').click();
    await stage.getByRole('textbox', { name: /your list/ }).fill('-1234.5678, 9999/7, 1/3, 2/3, -7, 8, 1/9, 100');
    await stage.getByRole('textbox', { name: /your list/ }).press('Enter');
    await enter(stage, /upper bound/, '8');
    for (const sel of ['.inspector-row dd', '.py-code', '.verdict', '.term-table', '.list-param']) await insideStage(stage, sel);
    expect(await noPageOverflow(page)).toBe(true);
  });
  test('the loop cards, the 5 × 5 data table and the identities with negative bounds stay inside their stages', async ({ page }) => {
    const l = await loops(page);
    await enter(l, /upper bound/, '12');
    await enter(l, /lower bound/, '-5').catch(() => undefined);
    for (const sel of ['.variant-card', '.py-code', '.variant-facts dd', '.inspector-row dd']) await insideStage(l, sel);
    const n = await nested(page);
    await preset(n, 'table').click();
    for (const sel of ['table.cell-grid', '.cell-grid-wrap', '.inspector-row dd', '.py-code']) await insideStage(n, sel);
    const wrapFits = await n.locator('.cell-grid-wrap').evaluate(el => el.scrollWidth <= el.clientWidth + 1);
    expect(wrapFits).toBe(true);
    const id = await identities(page);
    await enter(id, /lower bound/, '-5');
    await enter(id, /upper bound/, '20');
    await enter(id, /constant factor/, '-5');
    for (const sel of ['.identity-panel', '.pair-list', '.inspector-row dd']) await insideStage(id, sel);
    expect(await noPageOverflow(page)).toBe(true);
  });
});

test.describe('the sum stage', () => {
  test('starts as the sum of i from 1 to 5: five terms, total 15, and the table shows the triangular numbers', async ({ page }) => {
    const stage = await sum(page);
    await expect(stage).toHaveAttribute('data-count', '5');
    await expect(stage).toHaveAttribute('data-total', '15');
    expect(await lines(stage, 'count')).toEqual(['= 5']);
    expect(await lines(stage, 'sum')).toEqual(['= 15']);
    expect(await lines(stage, 'closed')).toEqual(['= 15']);
    const after = await stage.locator('tr[data-row] td:nth-child(3)').allTextContents();
    expect(after).toEqual(['1', '3', '6', '10', '15']);
    await expect(stage.locator('[data-verdict]')).toContainText('loop gives 15 and the closed form gives 15');
    await expect(stage.locator('[data-code]')).toContainText('for i in range(1, 5 + 1):');
  });
  test('the frame and the table row stay in step; the accumulator after row k is the k-th triangular number', async ({ page }) => {
    const stage = await sum(page);
    await back(stage).click();
    await expect(trace(stage)).toHaveAttribute('data-trace-index', '0');
    await expect(stage.locator('tr[data-state="current"]')).toHaveCount(0);
    const partial = [1, 3, 6, 10, 15];
    for (let k = 1; k <= 5; k++) {
      await next(stage).click();
      await expect(trace(stage)).toHaveAttribute('data-trace-index', String(k));
      await expect(stage.locator('tr[data-state="current"]')).toHaveAttribute('data-row', String(k));
      await expect(stage.locator('tr[data-state="current"] td').nth(1)).toHaveText(String(partial[k - 1]));
      await expect(stage.locator('tr[data-state="done"]')).toHaveCount(k - 1);
      await expect(stage.locator('.trace-caption')).toContainText(`acc`);
    }
    await expect(next(stage)).toBeDisabled();
  });
  test('Play at 2× steps through a three-term sum and stops at the end; Replay starts again', async ({ page }) => {
    const stage = await sum(page);
    await enter(stage, /upper bound/, '3');
    await expect(stage).toHaveAttribute('data-total', '6');
    await back(stage).click();
    await trace(stage).locator('select').selectOption('2');
    const play = trace(stage).locator('[data-action="play"]');
    await expect(play).toHaveText('Play');
    await play.click();
    await expect(trace(stage)).toHaveAttribute('data-playing', 'true');
    await expect(play).toHaveText('Pause');
    await expect(trace(stage)).toHaveAttribute('data-trace-index', '3', { timeout: 6000 });
    await expect(trace(stage)).toHaveAttribute('data-playing', 'false');
    await expect(play).toHaveText('Replay');
    await expect(stage.locator('tr[data-state="current"]')).toHaveAttribute('data-row', '3');
    await play.click();
    await expect(trace(stage)).toHaveAttribute('data-trace-index', /^[01]$/);
  });
  test('Pause stops the autoplay: the index does not move afterwards', async ({ page }) => {
    const stage = await sum(page);
    await back(stage).click();
    await trace(stage).locator('select').selectOption('2');
    const play = trace(stage).locator('[data-action="play"]');
    await play.click();
    await expect(trace(stage)).not.toHaveAttribute('data-trace-index', '0', { timeout: 4000 });
    await play.click(); // Pause
    await expect(trace(stage)).toHaveAttribute('data-playing', 'false');
    const frozen = await index(stage);
    await page.waitForTimeout(1700);
    expect(await index(stage)).toBe(frozen);
  });
  test('typing a new bound moves the cursor to the end frame and the table follows', async ({ page }) => {
    const stage = await sum(page);
    await enter(stage, /upper bound/, '8');
    await expect(stage).toHaveAttribute('data-total', '36');
    await expect(trace(stage)).toHaveAttribute('data-trace-index', '8');
    await enter(stage, /lower bound/, '3');
    await expect(stage).toHaveAttribute('data-count', '6');
    await expect(stage).toHaveAttribute('data-total', '33'); // 3 + 4 + 5 + 6 + 7 + 8
  });
  test('values off the allowed set are rejected with a reason, never clamped or rounded', async ({ page }) => {
    const stage = await sum(page);
    await enter(stage, /upper bound/, '2.5');
    await expect(field(stage, /upper bound/)).toHaveAttribute('aria-invalid', 'true');
    await expect(stage.locator('.param-error').first()).toBeVisible();
    await expect(stage).toHaveAttribute('data-n', '5');
    await enter(stage, /upper bound/, '25');
    await expect(field(stage, /upper bound/)).toHaveAttribute('aria-invalid', 'true');
    await expect(stage).toHaveAttribute('data-n', '5');
    await enter(stage, /lower bound/, '-6');
    await expect(stage).toHaveAttribute('data-m', '1');
    await enter(stage, /upper bound/, '7');
    await expect(stage).toHaveAttribute('data-n', '7');
    await preset(stage, 'geometric').click();
    await enter(stage, /ratio/, '0.333');
    await expect(field(stage, /ratio/)).toHaveAttribute('aria-invalid', 'true');
    await expect(stage).toHaveAttribute('data-total', '31/16');
  });
  test('a ratio typed as a two-place decimal is used exactly: r = 0.25 over 0..2 gives 21/16', async ({ page }) => {
    const stage = await sum(page);
    await preset(stage, 'geometric').click();
    await enter(stage, /ratio/, '0.25');
    await enter(stage, /upper bound/, '2');
    await expect(stage).toHaveAttribute('data-total', '21/16');
    expect(await lines(stage, 'sum')).toEqual(['= 21/16', '≈ 1.312500']);
    await expect(stage.locator('[data-code]')).toContainText('Fraction(1, 4)');
  });
  test('the empty sum is 0, with zero terms and a sentence that says it is not an error', async ({ page }) => {
    const stage = await sum(page);
    await preset(stage, 'empty').click();
    await expect(stage).toHaveAttribute('data-empty', 'true');
    await expect(stage).toHaveAttribute('data-total', '0');
    expect(await lines(stage, 'count')).toEqual(['= 0']);
    expect(await lines(stage, 'sum')).toEqual(['= 0']);
    await expect(stage.locator('[data-verdict]')).toContainText('empty sum is a value, not an error');
    await expect(stage.locator('tr[data-row]')).toHaveCount(0);
    await expect(trace(stage).locator('[data-trace-count]')).toHaveText('Step 1 of 1');
  });
  test('a term that does not exist makes the sum undefined: shown as undefined, never as 0, and the trace stops there', async ({ page }) => {
    const stage = await sum(page);
    await preset(stage, 'undefined').click();
    await expect(stage).toHaveAttribute('data-defined', 'false');
    await expect(stage).toHaveAttribute('data-total', 'undefined');
    expect(await lines(stage, 'sum')).toEqual(['= undefined']);
    await expect(stage.locator('tr[data-row="0"] .missing').first()).toHaveText('undefined');
    await expect(stage.locator('[data-verdict]')).toContainText('never read as 0');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
    // frames: start, i = -2, i = -1, then i = 0 which fails
    await expect(trace(stage).locator('[data-trace-count]')).toHaveText('Step 4 of 4');
    await expect(stage.locator('tr[data-state="current"]')).toHaveAttribute('data-row', '0');
    await expect(stage.locator('tr[data-row="0"]')).toContainText('stops here');
    await expect(stage.locator('tr[data-row="1"]')).toHaveAttribute('data-state', 'unreached');
    await expect(stage.locator('[data-announcement]')).toContainText('undefined');
  });
  test('the learner\'s list: valid entries are used exactly; a bad list is rejected and the old one kept; reading past the end is flagged', async ({ page }) => {
    const stage = await sum(page);
    await preset(stage, 'list').click();
    await expect(stage).toHaveAttribute('data-total', '13/2'); // 3 - 1 + 1/2 + 4
    const box = stage.getByRole('textbox', { name: /your list/ });
    await box.fill('1, x, 3');
    await box.press('Enter');
    await expect(stage.locator('.list-param .param-error')).toBeVisible();
    await expect(box).toHaveAttribute('aria-invalid', 'true');
    await expect(stage).toHaveAttribute('data-total', '13/2');
    await box.fill('2, 4, 6, 8');
    await box.press('Enter');
    await expect(stage).toHaveAttribute('data-total', '20');
    await expect(stage.locator('.list-param .param-error')).toHaveCount(0);
    await preset(stage, 'list-past-end').click();
    await expect(stage).toHaveAttribute('data-defined', 'false');
    await expect(stage.locator('[data-verdict]')).toContainText('IndexError');
  });
  test('Reset restores the canonical sum', async ({ page }) => {
    const stage = await sum(page);
    await preset(stage, 'squares').click();
    await expect(stage).toHaveAttribute('data-total', '55');
    await stage.locator('.stage-head [data-action="reset"]').click();
    await expect(stage).toHaveAttribute('data-total', '15');
    await expect(stage).toHaveAttribute('data-seq', 'identity');
  });
  test('the cancelling range, the alternating signs and the ratio 1', async ({ page }) => {
    const stage = await sum(page);
    await preset(stage, 'through-zero').click();
    await expect(stage).toHaveAttribute('data-total', '0');
    await expect(stage).toHaveAttribute('data-count', '7');
    await preset(stage, 'alternating').click();
    await expect(stage).toHaveAttribute('data-total', '−1'); // −1 + 1 − 1 + 1 − 1 (the stage writes the true minus sign)
    await preset(stage, 'ratio-one').click();
    await expect(stage).toHaveAttribute('data-total', '5');
    await expect(stage.locator('[data-verdict]')).toContainText('1 − r = 0');
  });
});

test.describe('the five loops', () => {
  test('odd numbers 1 … 5: only the correct loop and the shifted-list loop are right; the others return 16, 15 and an IndexError', async ({ page }) => {
    const stage = await loops(page);
    const status = (id: string) => stage.locator(`li[data-variant="${id}"]`);
    await expect(status('correct')).toHaveAttribute('data-status', 'correct');
    await expect(status('list-shifted')).toHaveAttribute('data-status', 'correct');
    await expect(status('stop-excluded')).toHaveAttribute('data-status', 'wrong');
    await expect(status('start-shifted')).toHaveAttribute('data-status', 'wrong');
    await expect(status('list-unshifted')).toHaveAttribute('data-status', 'error');
    await expect(status('correct').locator('[data-result]')).toContainText('25');
    await expect(status('stop-excluded').locator('[data-result]')).toContainText('16'); // 1 + 3 + 5 + 7
    await expect(status('start-shifted').locator('[data-result]')).toContainText('15'); // -1 + 1 + 3 + 5 + 7
    await expect(status('list-unshifted').locator('[data-result]')).toContainText('IndexError');
    await expect(status('stop-excluded').locator('[data-visited]')).toHaveText(/1, 2, 3, 4$/);
    await expect(stage.locator('li[data-variant] .status-word')).toHaveText(['Correct', 'Wrong total', 'Wrong total', 'Error', 'Correct']);
  });
  test('the whole numbers hide which slip was made: both wrong loops return 10; with n < m there are no passes and all five agree', async ({ page }) => {
    const stage = await loops(page);
    await preset(stage, 'identity').click();
    await expect(stage.locator('li[data-variant="stop-excluded"] [data-result]')).toContainText('10');
    await expect(stage.locator('li[data-variant="start-shifted"] [data-result]')).toContainText('10');
    await preset(stage, 'empty').click();
    await expect(stage).toHaveAttribute('data-right', '5');
    await expect(stage.locator('[data-verdict]')).toContainText('no off-by-one shows');
    await preset(stage, 'reciprocal').click();
    await expect(stage.locator('li[data-variant="start-shifted"] [data-result]')).toContainText('ZeroDivisionError');
  });
});

test.describe('double sums', () => {
  test('3 × 4 table of i·j: row totals 6, 12, 18, column totals 6, 12, 18, 24, grand total 60 in both orders', async ({ page }) => {
    const stage = await nested(page);
    await expect(stage).toHaveAttribute('data-total', '60');
    await expect(stage).toHaveAttribute('data-cells', '12');
    expect(await stage.locator('[data-row-total]').allTextContents()).toEqual(['10', '20', '30']);
    expect(await stage.locator('[data-col-total]').allTextContents()).toEqual(['6', '12', '18', '24']);
    await expect(stage.locator('[data-grand-total]')).toHaveText('60');
    await stage.getByRole('radio', { name: /column by column/ }).check({ force: true });
    await expect(stage).toHaveAttribute('data-order', 'columns-first');
    await expect(stage).toHaveAttribute('data-total', '60');
    await expect(stage.locator('[data-verdict]')).toContainText('60');
  });
  test('stepping through a triangle visits the cells in the order of the loops, row by row and column by column', async ({ page }) => {
    const stage = await nested(page);
    await preset(stage, 'triangle').click();
    await expect(stage).toHaveAttribute('data-cells', '10');
    await expect(stage).toHaveAttribute('data-total', '65');
    const visit = async () => {
      await back(stage).click();
      const seen: string[] = [];
      for (let k = 1; k <= 10; k++) {
        await next(stage).click();
        await expect(stage.locator('td.cell[data-state="current"]')).toHaveCount(1);
        seen.push((await stage.locator('td.cell[data-state="current"]').getAttribute('data-cell'))!);
      }
      return seen;
    };
    expect(await visit()).toEqual(['1,1', '2,1', '2,2', '3,1', '3,2', '3,3', '4,1', '4,2', '4,3', '4,4']);
    await stage.getByRole('radio', { name: /column by column/ }).check({ force: true });
    expect(await visit()).toEqual(['1,1', '2,1', '3,1', '4,1', '2,2', '3,2', '4,2', '3,3', '4,3', '4,4']);
    await expect(stage.locator('td.cell[data-state="outside"]')).toHaveCount(6);
  });
  test('a triangle of unequal entries added column by column: the unrewritten bounds would return 4, not 13', async ({ page }) => {
    const stage = await nested(page);
    await preset(stage, 'triangle-table').click();
    await expect(stage).toHaveAttribute('data-total', '13');
    await expect(stage.locator('[data-verdict]')).toContainText('return 4');
    await preset(stage, 'triangle').click();
    await expect(stage.locator('[data-verdict]')).toContainText('symmetric'); // i·j is symmetric: the slip would go unnoticed
  });
  test('Play at 2× adds a single row of five cells and stops on the total', async ({ page }) => {
    const stage = await nested(page);
    await preset(stage, 'one-row').click();
    await expect(stage).toHaveAttribute('data-total', '15'); // 1·1 + 1·2 + … + 1·5
    await back(stage).click();
    await trace(stage).locator('select').selectOption('2');
    await trace(stage).locator('[data-action="play"]').click();
    await expect(trace(stage)).toHaveAttribute('data-trace-index', '5', { timeout: 6000 });
    await expect(trace(stage)).toHaveAttribute('data-playing', 'false');
    await expect(stage.locator('td.cell[data-state="done"]')).toHaveCount(4);
    await expect(stage.locator('td.cell[data-state="current"]')).toHaveAttribute('data-cell', '1,5');
  });
  test('the number of rows is validated: 6 and 2.5 are rejected', async ({ page }) => {
    const stage = await nested(page);
    await enter(stage, /number of rows/, '6');
    await expect(field(stage, /number of rows/)).toHaveAttribute('aria-invalid', 'true');
    await expect(stage).toHaveAttribute('data-n', '3');
    await enter(stage, /number of rows/, '2.5');
    await expect(stage).toHaveAttribute('data-n', '3');
    await enter(stage, /number of rows/, '5');
    await expect(stage).toHaveAttribute('data-n', '5');
  });
});

test.describe('the three rewriting rules', () => {
  test('defaults: linearity and the shift hold, the shift with the term forgotten does not', async ({ page }) => {
    const stage = await identities(page);
    await expect(stage).toHaveAttribute('data-linear-holds', 'true');
    await expect(stage).toHaveAttribute('data-shift-holds', 'true');
    await expect(stage).toHaveAttribute('data-wrong-holds', 'false');
    await expect(stage.locator('[data-result="shift"]')).toContainText('86'); // 3² + 4² + 5² + 6² against 1² + … + 4² = 30
  });
  test('a shift of 0, and the coincidence preset, let the forgotten term pass: the page says so', async ({ page }) => {
    const stage = await identities(page);
    await preset(stage, 'no-shift').click();
    await expect(stage).toHaveAttribute('data-wrong-holds', 'true');
    await preset(stage, 'coincidence').click();
    await expect(stage).toHaveAttribute('data-wrong-holds', 'true');
    await expect(stage.locator('[data-result="shift"]')).toContainText('coincidence');
    await expect(stage.locator('[data-result="shift"]')).toHaveAttribute('data-caution', 'true');
  });
  test('Gauss pairing: 1 … 10 is five pairs of 11; 1 … 9 is four pairs of 10 and a lone 5', async ({ page }) => {
    const stage = await identities(page);
    await preset(stage, 'ten').click();
    expect(await stage.locator('[data-pairs] li').allTextContents()).toEqual(['1 + 10 = 11', '2 + 9 = 11', '3 + 8 = 11', '4 + 7 = 11', '5 + 6 = 11']);
    await preset(stage, 'odd-count').click();
    await expect(stage.locator('[data-pairs] li')).toHaveCount(5);
    await expect(stage.locator('[data-middle]')).toContainText('5');
    await preset(stage, 'empty').click();
    await expect(stage.locator('[data-pairs] li')).toHaveCount(0);
    await expect(stage.locator('[data-result="pairing"]')).toContainText('no terms');
  });
  test('negative constants and negative bounds keep linearity true', async ({ page }) => {
    const stage = await identities(page);
    await preset(stage, 'negative').click();
    await expect(stage).toHaveAttribute('data-linear-holds', 'true');
    await enter(stage, /lower bound/, '-5');
    await expect(stage).toHaveAttribute('data-linear-holds', 'true');
    await expect(stage).toHaveAttribute('data-shift-holds', 'true');
  });
});

test.describe('worked examples', () => {
  test('each example steps forward to its final answer and back; Reset returns to the first step', async ({ page }) => {
    const stage = await worked(page);
    const count = stage.locator('[data-trace-count]');
    for (const id of ['count', 'gauss', 'geometric', 'shift', 'triangle']) {
      await stage.locator(`button[data-example="${id}"]`).click();
      const text = await count.textContent();
      const n = Number(/of (\d+)/.exec(text ?? '')![1]);
      expect(n, id).toBeGreaterThanOrEqual(5);
      await expect(count).toHaveText(`Step 1 of ${n}`);
      for (let i = 1; i < n; i++) await stage.getByRole('button', { name: /^Next/ }).click();
      await expect(count).toHaveText(`Step ${n} of ${n}`);
      await expect(stage.getByRole('button', { name: /^Next/ })).toBeDisabled();
      await stage.getByRole('button', { name: /Previous/ }).click();
      await expect(count).toHaveText(`Step ${n - 1} of ${n}`);
      await stage.getByRole('button', { name: /^Reset$/ }).click();
      await expect(count).toHaveText(`Step 1 of ${n}`);
    }
  });
  test('the frames of each example contain independently known numbers: 9 terms, 55, 31/16, 30 and 86, 13 and 4', async ({ page }) => {
    const stage = await worked(page);
    /** The text of the formula shown at every step of the chosen example, from the first to the last. */
    const frames = async (id: string) => {
      await stage.locator(`button[data-example="${id}"]`).click();
      const out: string[] = [];
      for (;;) {
        out.push((await stage.locator('.math-scroll').first().textContent()) ?? '');
        if (!(await next(stage).isEnabled())) break;
        await next(stage).click();
      }
      return out;
    };
    const has = (texts: string[], re: RegExp) => expect(texts.some(t => re.test(t)), String(re)).toBe(true);
    const count = await frames('count');
    has(count, /11.?3.?1=9/); // 3, …, 11 has 9 terms
    has(count, /no terms/); // and 5 … 2 has a negative count: the empty sum
    const gauss = await frames('gauss');
    has(gauss, /11=55/);
    has(gauss, /10.?11/);
    const geo = await frames('geometric');
    has(geo, /3116/); // the fraction 31 over 16, as the text of its numerator and denominator
    has(geo, /r=1/);
    const shift = await frames('shift');
    has(shift, /=30/);
    has(shift, /=86/);
    const tri = await frames('triangle');
    has(tri, /=13/);
    has(tri, /=4≠13/);
  });
  test('Play at 2× runs an example to its end', async ({ page }) => {
    const stage = await worked(page);
    await stage.locator('button[data-example="gauss"]').click();
    await trace(stage).locator('select').selectOption('2');
    await trace(stage).locator('[data-action="play"]').click();
    await expect(trace(stage)).toHaveAttribute('data-playing', 'false', { timeout: 15000 });
    await expect(next(stage)).toBeDisabled();
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
    let form = await answer(page, 'fencepost', { count: '12', empty: '0' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'fencepost', { count: '11', empty: '0' });
    await expect(form).toHaveAttribute('data-result', 'incorrect');
    await expect(form.locator('[data-feedback]')).toContainText('STEPS');
    form = await answer(page, 'geometric', { value: '40/27' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'geometric', { value: '3/2' });
    await expect(form.locator('[data-feedback]')).toContainText('INFINITE');
    form = await answer(page, 'nested-count', { cells: '21', product: '60' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'mean-loss', { n: '4', loss: '4' });
    await expect(form.locator('[data-feedback]')).toContainText('last INDEX');
    form = await answer(page, 'mean-loss', { n: '5', loss: '4' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'fencepost', { count: 'twelve', empty: '0' });
    await expect(form.locator('[data-feedback]')).toContainText('Enter');
  });
  test('multiple choice: each wrong choice is incorrect with its own hint, the right one is correct; Reset clears', async ({ page }) => {
    await page.goto(PATH);
    let form = await answer(page, 'loop-range', { choice: 'to-9' });
    await expect(form).toHaveAttribute('data-result', 'incorrect');
    await expect(form.locator('[data-feedback]')).toContainText('a_9 is never added');
    form = await answer(page, 'loop-range', { choice: 'to-10' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'ratio-one', { choice: 'zero' });
    await expect(form.locator('[data-feedback]')).toContainText('0/0');
    form = await answer(page, 'ratio-one', { choice: 'ten' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'shift', { choice: 'forgot' });
    await expect(form.locator('[data-feedback]')).toContainText('190');
    form = await answer(page, 'shift', { choice: 'right' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'swap-bounds', { choice: 'same' });
    await expect(form.locator('[data-feedback]')).toContainText('OTHER triangle');
    form = await answer(page, 'swap-bounds', { choice: 'right' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'product-trap', { choice: 'product' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'float-sum', { choice: 'false' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    await form.locator('[data-action="reset-exercise"]').click();
    await expect(form).toHaveAttribute('data-result', 'none');
  });
});
