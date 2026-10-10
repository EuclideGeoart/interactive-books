/**
 * Sets, intervals, and relations (I.7): every stage checked from the DOM, and the two pictures (the Venn diagram and the number line) from
 * independently computed pixels. The Venn constants (a 400 × 280 box, circles of radius 100 centred at (150, 140) and (250, 140)) and the
 * number-line window (−6 to 6, 18 px of padding) are hard-coded here, never read back from the application's layout code.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { noPageOverflow } from './helpers';

const PATH = 'chapters/sets-and-relations/';

async function open(page: Page, selector: string): Promise<Locator> {
  await page.goto(PATH);
  const stage = page.locator(selector).first();
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute('data-hydrated', 'true');
  await page.evaluate(() => document.fonts.ready);
  return stage;
}
const setsFull = (page: Page) => open(page, '[data-stage="sets"].stage-full');
const setsHero = (page: Page) => open(page, '[data-stage="sets"].stage-hero');
const intervals = (page: Page) => open(page, '[data-stage="intervals"]');
const product = (page: Page) => open(page, '[data-stage="product"]');
const relation = (page: Page) => open(page, '[data-stage="relation"]');
const worked = (page: Page) => open(page, '[data-stage="worked"]');

const lines = (stage: Locator, id: string) =>
  stage.locator(`[data-quantity="${id}"] dd .line`).evaluateAll(els => els.map(e => `${e.querySelector('.rel')?.textContent ?? ''} ${e.querySelector('.val')?.textContent ?? ''}`.replace(/\s+/g, ' ').trim()));
const chip = (stage: Locator, set: 'A' | 'B', n: number) => stage.locator(`button.chip[data-set="${set}"][data-element="${n}"]`);
const preset = (stage: Locator, id: string) => stage.locator(`button[data-preset="${id}"]`);
const field = (stage: Locator, name: RegExp) => stage.getByRole('spinbutton', { name });
async function enter(stage: Locator, name: RegExp, text: string) {
  const f = field(stage, name);
  await f.fill(text);
  await f.press('Enter');
}
const prop = (stage: Locator, id: string) => stage.locator(`li[data-property="${id}"]`);

test.describe('publication', () => {
  test('metadata, outline, six hydrated stages, ten exercises', async ({ page }) => {
    await page.goto(PATH);
    await expect(page).toHaveTitle(/Sets, intervals, and relations/);
    await expect(page.locator('h1')).toHaveCount(1);
    const h2 = await page.locator('main h2').allTextContents();
    for (const heading of ['Intuition', 'Definition', 'Mechanics', 'Worked examples', 'Executable reference code', 'Explore', 'Common mistakes', 'Numerical considerations', 'Connections', 'Exercises', 'Summary and checkpoints'])
      expect(h2.some(t => t.includes(heading)), heading).toBe(true);
    for (const s of ['sets', 'intervals', 'product', 'relation', 'worked']) {
      const stage = page.locator(`[data-stage="${s}"]`).first();
      await stage.scrollIntoViewIfNeeded();
      await expect(stage).toHaveAttribute('data-hydrated', 'true');
    }
    await expect(page.locator('[data-stage="sets"]')).toHaveCount(2);
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
  test('the previous page of the book links to this chapter', async ({ page }) => {
    await page.goto('chapters/function-families/');
    await expect(page.locator('a[href*="sets-and-relations"]').first()).toBeVisible();
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
  test('6 × 6 pair tables, the 6 × 6 relation grid and the 12-element lists stay inside their stages', async ({ page }) => {
    const prod = await product(page);
    await preset(prod, 'full').click();
    await insideStage(prod, 'table.pair-table');
    const rel = await relation(page);
    await rel.getByRole('radio', { name: '6' }).nth(0).check({ force: true });
    await rel.getByRole('radio', { name: '6' }).nth(1).check({ force: true });
    await preset(rel, 'all').click(); // 36 pairs: the longest list of pairs the stage can show
    await insideStage(rel, 'table.relation-grid');
    await insideStage(rel, '.inspector-row dd');
    const sets = await setsFull(page);
    await preset(sets, 'disjoint').click();
    await sets.locator('button[data-op="symmetric"]').click(); // all twelve elements in the result
    await insideStage(sets, '.inspector-row dd');
    expect(await noPageOverflow(page)).toBe(true);
  });
});

test.describe('finite sets', () => {
  test('starts as A = {1..5}, B = {4..7} with the union; the operations select the right elements; Reset restores', async ({ page }) => {
    const stage = await setsFull(page);
    await expect(stage).toHaveAttribute('data-a', '1,2,3,4,5');
    await expect(stage).toHaveAttribute('data-b', '4,5,6,7');
    await expect(stage).toHaveAttribute('data-result', '1,2,3,4,5,6,7');
    const expected: Record<string, string> = {
      intersection: '4,5', 'a-minus-b': '1,2,3', 'b-minus-a': '6,7', symmetric: '1,2,3,6,7', 'complement-a': '6,7,8,9,10,11,12', 'complement-b': '1,2,3,8,9,10,11,12',
    };
    for (const [op, result] of Object.entries(expected)) {
      await stage.locator(`button[data-op="${op}"]`).click();
      await expect(stage).toHaveAttribute('data-result', result);
      // the elements the picture marks as selected are exactly the elements of the result
      const marked = await stage.locator('.venn-token[data-selected="true"]').evaluateAll(els => els.map(e => e.getAttribute('data-element')).sort((a, b) => Number(a) - Number(b)).join(','));
      expect(marked).toBe(result);
    }
    await chip(stage, 'A', 12).click();
    await expect(stage).toHaveAttribute('data-a', '1,2,3,4,5,12');
    await stage.locator('[data-action="reset"]').click();
    await expect(stage).toHaveAttribute('data-a', '1,2,3,4,5');
    await expect(stage).toHaveAttribute('data-op', 'union');
  });
  test('the sizes: |A ∪ B| = 5 + 4 − 2 = 7, and the inclusion–exclusion formula follows the sets', async ({ page }) => {
    const stage = await setsFull(page);
    expect(await lines(stage, 'size-a')).toEqual(['= 5']);
    expect(await lines(stage, 'size-b')).toEqual(['= 4']);
    expect(await lines(stage, 'size-result')).toEqual(['= 7']);
    await expect(stage.locator('.formula-panel').first()).toContainText('5+4−2=7');
    await chip(stage, 'B', 3).click(); // B = {3,4,5,6,7}: overlap {3,4,5}
    expect(await lines(stage, 'size-b')).toEqual(['= 5']);
    expect(await lines(stage, 'size-result')).toEqual(['= 7']); // A ∪ B is still {1..7}
    await expect(stage.locator('.formula-panel').first()).toContainText('5+5−3=7');
  });
  test('the Venn diagram puts every element in the right region at independently computed pixels', async ({ page }) => {
    const stage = await setsFull(page);
    const check = async (a: number[], b: number[]) => {
      const svg = stage.locator('svg.venn');
      const geometry = await svg.evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
      const scale = Math.min(geometry.w / 400, geometry.h / 280); // preserveAspectRatio "meet"
      const ox = geometry.x + (geometry.w - 400 * scale) / 2;
      const oy = geometry.y + (geometry.h - 280 * scale) / 2;
      for (let n = 1; n <= 12; n++) {
        const c = await stage.locator(`.venn-token[data-element="${n}"] circle`).evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
        const ux = (c.x - ox) / scale, uy = (c.y - oy) / scale; // back to the 400 × 280 drawing
        const inA = Math.hypot(ux - 150, uy - 140) < 100 - 12 + 0.5;
        const inB = Math.hypot(ux - 250, uy - 140) < 100 - 12 + 0.5;
        const outA = Math.hypot(ux - 150, uy - 140) > 100 + 12 - 0.5;
        const outB = Math.hypot(ux - 250, uy - 140) > 100 + 12 - 0.5;
        expect(a.includes(n) ? inA : outA, `element ${n} against circle A`).toBe(true);
        expect(b.includes(n) ? inB : outB, `element ${n} against circle B`).toBe(true);
        expect(ux > 12 && ux < 388 && uy > 12 && uy < 268, `element ${n} inside the universe box`).toBe(true);
      }
    };
    await check([1, 2, 3, 4, 5], [4, 5, 6, 7]);
    await preset(stage, 'disjoint').click();
    await check([1, 3, 5, 7, 9, 11], [2, 4, 6, 8, 10, 12]);
    await preset(stage, 'subset').click();
    await check([2, 3], [1, 2, 3, 4]);
    await preset(stage, 'all').click();
    await check([1, 2, 3], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
  test('the facts and De Morgan: both sides agree for the canonical pair; disjoint, equal and empty are recognised', async ({ page }) => {
    const stage = await setsFull(page);
    const facts = stage.locator('.fact-list li');
    await expect(facts.filter({ hasText: /A ⊆ B/ })).toHaveAttribute('data-holds', 'false');
    await expect(stage.locator('.formula-panel').first()).toContainText('{8,9,10,11,12}');
    await preset(stage, 'disjoint').click();
    await expect(stage).toHaveAttribute('data-result', ''); // the preset shows the intersection
    await expect(facts.filter({ hasText: /A ∩ B = ∅|A ∩ B = Ø/ })).toHaveAttribute('data-holds', 'true');
    await preset(stage, 'equal').click();
    await expect(facts.filter({ hasText: /A = B/ })).toHaveAttribute('data-holds', 'true');
    await preset(stage, 'subset').click();
    await expect(facts.filter({ hasText: /A ⊆ B/ })).toHaveAttribute('data-holds', 'true');
    await preset(stage, 'empty').click();
    await expect(stage).toHaveAttribute('data-a', '');
    await expect(stage).toHaveAttribute('data-result', '1,2,3,4,5,6,7,8,9,10,11,12'); // the complement of the empty set is the universe
  });
  test('the chips are keyboard operable and say what pressing them does', async ({ page }) => {
    const stage = await setsHero(page);
    const six = chip(stage, 'A', 6);
    await expect(six).toHaveAttribute('aria-pressed', 'false');
    await expect(six).toHaveAttribute('aria-label', /6 is not in A\. Press to add it to A/);
    await six.focus();
    await page.keyboard.press('Space');
    await expect(six).toHaveAttribute('aria-pressed', 'true');
    await expect(stage).toHaveAttribute('data-a', '1,2,3,4,5,6');
    await expect(six).toHaveAttribute('aria-label', /6 is in A\. Press to remove it from A/);
    await page.keyboard.press('Enter');
    await expect(six).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('intervals', () => {
  /** The number line: the window is −6 to 6 with 18 px of padding on each side, drawn at one SVG unit per CSS pixel. */
  async function lineGeometry(stage: Locator) {
    const box = await stage.locator('svg.number-line').evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    return { x: (t: number) => box.x + 18 + ((t + 6) / 12) * (box.w - 36), box };
  }
  const endOf = (stage: Locator, row: string, piece: number, end: 'left' | 'right') => stage.locator(`[data-row="${row}"] .nl-piece`).nth(piece).locator(`circle[data-end="${end}"]`);
  const centreOf = (el: Locator) => el.evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });

  test('starts as (0,1) ∪ (1,2): two pieces, a hole at 1, and 1 is in neither interval', async ({ page }) => {
    const stage = await intervals(page);
    await expect(stage).toHaveAttribute('data-pieces', '2');
    await expect(stage).toHaveAttribute('data-member', 'false');
    expect(await lines(stage, 'result')).toEqual(['= (0, 1) ∪ (1, 2)']);
    expect(await lines(stage, 'pieces')).toEqual(['= 2']);
    const items = stage.locator('[data-membership] li');
    await expect(items.nth(0)).toHaveAttribute('data-member', 'false');
    await expect(items.nth(0)).toContainText('right end of (0, 1), and that end is open');
    await expect(items.nth(1)).toContainText('left end of (1, 2), and that end is open');
    await expect(stage.locator('[data-verdict]')).toContainText('one-point hole');
  });
  test('the adjacency table: the same touching point gives one piece, two pieces, a point or nothing', async ({ page }) => {
    const stage = await intervals(page);
    const cases: [string, string, string][] = [
      ['open-open', '= (0, 1) ∪ (1, 2)', '2'],
      ['closed-open', '= [0, 2)', '1'],
      ['touch-point', '= {1}', '1'],
      ['touch-empty', '= ∅', '0'],
      ['point-complement', '= (−∞, 1) ∪ (1, ∞)', '2'],
      ['carve', '= [0, 2] ∪ [3, 5]', '2'],
    ];
    for (const [id, result, pieces] of cases) {
      await preset(stage, id).click();
      await expect(stage, id).toHaveAttribute('data-pieces', pieces);
      expect((await lines(stage, 'result'))[0], id).toBe(result);
    }
  });
  test('drawn geometry: ends sit at the computed pixels, open ends are rings and closed ends are dots', async ({ page }) => {
    const stage = await intervals(page);
    const g = await lineGeometry(stage);
    // open (0,1) and open (1,2): four open rings, at 0, 1, 1 and 2
    for (const [row, piece, end, t] of [['a', 0, 'left', 0], ['a', 0, 'right', 1], ['b', 0, 'left', 1], ['b', 0, 'right', 2]] as const) {
      const circle = endOf(stage, row, piece, end);
      await expect(circle).toHaveClass(/is-open/);
      const c = await centreOf(circle);
      expect(Math.abs(c.x - g.x(t)), `${row} ${end} at ${t}`).toBeLessThan(1.5);
    }
    // the union has a hole at 1: its two pieces end at 1 with rings
    await expect(stage.locator('[data-row="result"] .nl-piece')).toHaveCount(2);
    await expect(endOf(stage, 'result', 0, 'right')).toHaveClass(/is-open/);
    await expect(endOf(stage, 'result', 1, 'left')).toHaveClass(/is-open/);
    // closing the right end of A makes it a filled dot and joins the union into one piece [0, 2)
    await stage.getByRole('radio', { name: /^closed \]$/ }).first().check({ force: true });
    await expect(endOf(stage, 'a', 0, 'right')).toHaveClass(/is-closed/);
    await expect(stage.locator('[data-row="result"] .nl-piece')).toHaveCount(1);
    // the test marker follows x: x = 1 maps to the pixel of 1
    const marker = await centreOf(stage.locator('[data-part="test-point"]'));
    expect(Math.abs(marker.x - g.x(1))).toBeLessThan(1.5);
    // fill: a closed end is filled with the role colour, an open end with the page colour
    const fills = await stage.locator('[data-row="a"] circle').evaluateAll(els => els.map(e => getComputedStyle(e).fill));
    expect(fills[0]).not.toBe(fills[1]);
  });
  test('typed values off the arrow-key lattice are exact: 0.1 and 2.75 are held as exactly 1/10 and 11/4, never rounded', async ({ page }) => {
    const stage = await intervals(page);
    await preset(stage, 'touch-point').click(); // [0,1] ∩ [1,2] = {1}
    await enter(stage, /right end of A/, '0.1');
    await enter(stage, /left end of B/, '0.1');
    expect(await lines(stage, 'set-a')).toEqual(['= [0, 0.1]']);
    expect(await lines(stage, 'set-b')).toEqual(['= [0.1, 2]']);
    expect(await lines(stage, 'result')).toEqual(['= {0.1}']); // the closed ends meet in exactly one point
    await enter(stage, /test point/, '2.75');
    await expect(stage).toHaveAttribute('data-x', '2.75');
    await expect(stage.locator('[data-membership] li').nth(0)).toHaveAttribute('data-member', 'false');
    await expect(stage.locator('[data-membership] li').nth(1)).toHaveAttribute('data-member', 'false'); // 2.75 > 2
    await enter(stage, /right end of B/, '2.75');
    await expect(stage.locator('[data-membership] li').nth(1)).toHaveAttribute('data-member', 'true'); // the closed end 2.75 belongs to B
    expect(await lines(stage, 'set-b')).toEqual(['= [0.1, 2.75]']);
    // the marker is at 2.75 (pixel computed from the window, not from the model)
    const g = await lineGeometry(stage);
    const marker = await centreOf(stage.locator('[data-part="test-point"]'));
    expect(Math.abs(marker.x - g.x(2.75))).toBeLessThan(1.5);
    const rightEnd = await centreOf(endOf(stage, 'b', 0, 'right'));
    expect(Math.abs(rightEnd.x - g.x(2.75))).toBeLessThan(1.5);
  });
  test('a value with three decimals or outside the range is rejected, not rounded or clamped', async ({ page }) => {
    const stage = await intervals(page);
    await enter(stage, /right end of A/, '1.234');
    await expect(stage.locator('.param-error').first()).toBeVisible();
    expect(await lines(stage, 'set-a')).toEqual(['= (0, 1)']);
    await enter(stage, /right end of A/, '9');
    await expect(stage.locator('.param-error').first()).toBeVisible();
    expect(await lines(stage, 'set-a')).toEqual(['= (0, 1)']);
    await enter(stage, /right end of A/, '1.25');
    expect(await lines(stage, 'set-a')).toEqual(['= (0, 1.25)']);
  });
  test('left end above the right end is the empty set, with its reason, not an error and not swapped', async ({ page }) => {
    const stage = await intervals(page);
    await preset(stage, 'reversed').click();
    expect(await lines(stage, 'set-a')).toEqual(['= ∅']);
    await expect(stage.locator('[data-quantity="set-a"]')).toContainText('left end');
    await expect(stage.locator('[data-row="a"]')).toContainText('empty');
  });
  test('an infinite end has no field and is drawn as an arrow; ℝ \\ {1} is two rays', async ({ page }) => {
    const stage = await intervals(page);
    await preset(stage, 'rays').click();
    await expect(stage.locator('[data-infinite="a"]')).toBeVisible();
    await expect(stage.locator('[data-infinite="d"]')).toBeVisible();
    await expect(stage.locator('[data-row="a"] polygon.nl-arrow')).toHaveCount(1);
    await expect(stage.locator('[data-row="b"] polygon.nl-arrow')).toHaveCount(1);
    expect(await lines(stage, 'set-a')).toEqual(['= (−∞, 1)']);
    // two rays together: the union leaves out 1
    expect((await lines(stage, 'result'))[0]).toBe('= (−∞, 1) ∪ (1, ∞)');
    await expect(stage).toHaveAttribute('data-member', 'false'); // x = 1
  });
  test('the slider moves x by 0.05 from the keyboard and the membership sentences follow', async ({ page }) => {
    const stage = await intervals(page);
    const slider = stage.locator('input[data-slider="x"]');
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await expect(stage).toHaveAttribute('data-x', '1.05');
    await expect(stage).toHaveAttribute('data-member', 'true'); // 1.05 is in (1, 2)
    await expect(stage.locator('[data-membership] li').nth(1)).toHaveAttribute('data-member', 'true');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(stage).toHaveAttribute('data-x', '0.95');
    await expect(stage.locator('[data-membership] li').nth(0)).toHaveAttribute('data-member', 'true'); // in (0, 1)
  });
  test('the complement and the difference follow the ends', async ({ page }) => {
    const stage = await intervals(page);
    await stage.locator('button[data-op="complement-a"]').click(); // ℝ \ (0, 1)
    expect((await lines(stage, 'result'))[0]).toBe('= (−∞, 0] ∪ [1, ∞)');
    await stage.locator('button[data-op="a-minus-b"]').click(); // (0,1) \ (1,2) = (0,1)
    expect((await lines(stage, 'result'))[0]).toBe('= (0, 1)');
  });
});

test.describe('products', () => {
  test('{1,2,3} × {3,4} has six pairs; A × B and B × A differ, and the dashed pairs are the ones in only one table', async ({ page }) => {
    const stage = await product(page);
    await expect(stage).toHaveAttribute('data-count', '6');
    await expect(stage).toHaveAttribute('data-commutes', 'false');
    expect(await lines(stage, 'size-product')).toEqual(['= 6']);
    await expect(stage.locator('table[data-table="product"] td.pair')).toHaveCount(6);
    await expect(stage.locator('table[data-table="reversed"] td.pair')).toHaveCount(6);
    // (3, 3) is in both, so it is the only pair of A × B that is not dashed
    await expect(stage.locator('table[data-table="product"] td.pair[data-extra="false"]')).toHaveCount(1);
    await expect(stage.locator('table[data-table="product"] td[data-pair="3,3"]')).toHaveAttribute('data-extra', 'false');
    await expect(stage.locator('table[data-table="product"] td[data-pair="1,3"]')).toHaveAttribute('data-extra', 'true');
    await expect(stage.locator('[data-verdict]')).toContainText('(1, 3) is in A × B, but it is not in B × A');
  });
  test('equal sets and empty sets make the two products agree; the size is the product of the sizes', async ({ page }) => {
    const stage = await product(page);
    await preset(stage, 'same').click();
    await expect(stage).toHaveAttribute('data-commutes', 'true');
    await expect(stage.locator('td.pair[data-extra="true"]')).toHaveCount(0);
    await preset(stage, 'empty').click();
    await expect(stage).toHaveAttribute('data-count', '0');
    await expect(stage).toHaveAttribute('data-commutes', 'true');
    await preset(stage, 'full').click();
    await expect(stage).toHaveAttribute('data-count', '36');
    expect(await lines(stage, 'size-product')).toEqual(['= 36']);
    await chip(stage, 'A', 6).click();
    await expect(stage).toHaveAttribute('data-count', '30'); // 5 × 6
    await expect(stage).toHaveAttribute('data-commutes', 'false');
  });
  test('(1, 2) and (2, 1) are different pairs', async ({ page }) => {
    const stage = await product(page);
    await preset(stage, 'single').click(); // {1} × {2}
    await expect(stage).toHaveAttribute('data-count', '1');
    await expect(stage.locator('table[data-table="product"] td[data-pair="1,2"]')).toBeVisible();
    await expect(stage.locator('table[data-table="reversed"] td[data-pair="2,1"]')).toBeVisible();
    await expect(stage.locator('table[data-table="reversed"] td[data-pair="1,2"]')).toHaveCount(0);
    await expect(stage).toHaveAttribute('data-commutes', 'false');
  });
});

test.describe('relations', () => {
  const cell = (stage: Locator, a: number, b: number) => stage.locator(`button[data-cell="${a},${b}"]`);
  test('a < b on {1,2,3,4}: six pairs; not reflexive, not symmetric, antisymmetric and transitive; not a function', async ({ page }) => {
    const stage = await relation(page);
    await expect(stage).toHaveAttribute('data-size', '6');
    await expect(prop(stage, 'reflexive')).toHaveAttribute('data-holds', 'false');
    await expect(prop(stage, 'symmetric')).toHaveAttribute('data-holds', 'false');
    await expect(prop(stage, 'antisymmetric')).toHaveAttribute('data-holds', 'true');
    await expect(prop(stage, 'transitive')).toHaveAttribute('data-holds', 'true');
    await expect(prop(stage, 'equivalence')).toHaveAttribute('data-holds', 'false');
    await expect(prop(stage, 'function')).toHaveAttribute('data-holds', 'false');
    await expect(prop(stage, 'reflexive')).toContainText('(1, 1) is missing');
    await expect(prop(stage, 'symmetric')).toContainText('(1, 2) is in R but (2, 1) is not');
    // the pairs are exactly the cells above the diagonal
    for (let a = 1; a <= 4; a++) for (let b = 1; b <= 4; b++) await expect(cell(stage, a, b), `${a},${b}`).toHaveAttribute('aria-pressed', String(a < b));
  });
  test('divides on {1..6}: a partial order, not symmetric; same parity: an equivalence with two classes', async ({ page }) => {
    const stage = await relation(page);
    await stage.getByRole('radio', { name: '6' }).first().check({ force: true });
    await stage.getByRole('radio', { name: '6' }).nth(1).check({ force: true });
    await expect(stage).toHaveAttribute('data-n', '6');
    await expect(stage).toHaveAttribute('data-k', '6');
    await preset(stage, 'divides').click();
    await expect(stage).toHaveAttribute('data-size', '14'); // 6 + 3 + 2 + 1 + 1 + 1
    await expect(prop(stage, 'reflexive')).toHaveAttribute('data-holds', 'true');
    await expect(prop(stage, 'symmetric')).toHaveAttribute('data-holds', 'false');
    await expect(prop(stage, 'antisymmetric')).toHaveAttribute('data-holds', 'true');
    await expect(prop(stage, 'transitive')).toHaveAttribute('data-holds', 'true');
    await expect(stage).toHaveAttribute('data-equivalence', 'false');
    await preset(stage, 'same-parity').click();
    await expect(stage).toHaveAttribute('data-size', '18'); // 3² + 3²
    await expect(stage).toHaveAttribute('data-equivalence', 'true');
    await expect(prop(stage, 'equivalence')).toContainText('2 classes');
    await expect(prop(stage, 'equivalence')).toContainText('{1, 3, 5}');
    await expect(prop(stage, 'equivalence')).toContainText('{2, 4, 6}');
  });
  test('toggling one pair changes the verdicts and the witness; the function test names an input with no value', async ({ page }) => {
    const stage = await relation(page);
    await preset(stage, 'equal').click(); // a = b: an equivalence, and a function (each a is related to itself only)
    await expect(stage).toHaveAttribute('data-equivalence', 'true');
    await expect(prop(stage, 'function')).toHaveAttribute('data-holds', 'true');
    await cell(stage, 2, 3).click(); // adds (2, 3): symmetry now fails, and 2 has two partners
    await expect(prop(stage, 'symmetric')).toHaveAttribute('data-holds', 'false');
    await expect(prop(stage, 'symmetric')).toContainText('(2, 3) is in R but (3, 2) is not');
    await expect(prop(stage, 'function')).toHaveAttribute('data-holds', 'false');
    await expect(prop(stage, 'function')).toContainText('2 is related to 2 elements of B (2, 3)');
    await cell(stage, 2, 2).click();
    await cell(stage, 2, 3).click(); // remove both pairs of row 2
    await expect(prop(stage, 'function')).toContainText('2 is not related to any element of B');
    await preset(stage, 'empty').click();
    await expect(stage).toHaveAttribute('data-size', '0');
    await expect(prop(stage, 'transitive')).toHaveAttribute('data-holds', 'true'); // by emptiness
    await expect(prop(stage, 'reflexive')).toHaveAttribute('data-holds', 'false');
  });
  test('pressing a property outlines the cells that decide it: a missing pair dashed, a present pair solid', async ({ page }) => {
    const stage = await relation(page);
    await stage.locator('li[data-property="reflexive"] button.prop-name').click();
    await expect(cell(stage, 1, 1)).toHaveAttribute('data-mark', 'missing');
    await stage.locator('li[data-property="symmetric"] button.prop-name').click();
    await expect(stage.locator('button[data-mark]').first()).toBeVisible();
    await expect(cell(stage, 1, 1)).not.toHaveAttribute('data-mark', 'missing');
    await stage.locator('li[data-property="symmetric"] button.prop-name').click(); // press again to clear
    await expect(stage.locator('button[data-mark]')).toHaveCount(0);
  });
  test('with A and B of different sizes the four properties do not apply, and the equivalence line says why', async ({ page }) => {
    const stage = await relation(page);
    await stage.getByRole('radio', { name: '3' }).nth(1).check({ force: true }); // B has 3 elements, A has 4
    await expect(stage).toHaveAttribute('data-k', '3');
    await expect(prop(stage, 'reflexive').locator('button.prop-name')).toBeDisabled();
    await expect(prop(stage, 'equivalence')).toContainText('same size');
  });
});

test.describe('worked examples', () => {
  test('each example steps forward to its final answer and back; Reset returns to the first step', async ({ page }) => {
    const stage = await worked(page);
    const count = stage.locator('[data-trace-count]');
    for (const id of ['holes', 'count', 'de-morgan', 'parity']) {
      await stage.locator(`button[data-example="${id}"]`).click();
      const text = await count.textContent();
      const n = Number(/of (\d+)/.exec(text ?? '')![1]);
      expect(n, id).toBeGreaterThanOrEqual(4);
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
  test('the holes example ends on the single interval [0, 2); the count example on 7; De Morgan on a checkmark', async ({ page }) => {
    const stage = await worked(page);
    const last = async () => { while (await stage.getByRole('button', { name: /^Next/ }).isEnabled()) await stage.getByRole('button', { name: /^Next/ }).click(); };
    await last();
    await expect(stage.locator('.trace-caption')).toContainText('single interval');
    await expect(stage.locator('.math-scroll').first()).toContainText('[0,2)');
    await stage.locator('button[data-example="count"]').click();
    await last();
    await expect(stage.locator('.math-scroll').first()).toContainText('7');
    await stage.locator('button[data-example="de-morgan"]').click();
    await last();
    await expect(stage.locator('.trace-caption')).toContainText('same set');
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
  test('a correct number is accepted; the typical wrong numbers get their own hint; junk asks for numbers', async ({ page }) => {
    await page.goto(PATH);
    let form = await answer(page, 'union-count', { n: '29' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'union-count', { n: '35' });
    await expect(form).toHaveAttribute('data-result', 'incorrect');
    await expect(form.locator('[data-feedback]')).toContainText('counted twice');
    form = await answer(page, 'split-leak', { n: '970' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'product-count', { ab: '7', cc: '25' });
    await expect(form.locator('[data-feedback]')).toContainText('sizes multiply');
    form = await answer(page, 'de-morgan-count', { n: 'five' });
    await expect(form.locator('[data-feedback]')).toContainText('Enter a number');
  });
  test('multiple choice: the interval that closes the gap, the half-open complement, A × B = B × A', async ({ page }) => {
    await page.goto(PATH);
    let form = await answer(page, 'join-closed', { choice: 'open-open' });
    await expect(form).toHaveAttribute('data-result', 'incorrect');
    form = await answer(page, 'join-closed', { choice: 'closed-closed' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'complement-interval', { choice: 'flip' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'product-commute', { choice: 'equal-or-empty' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'near-not-transitive', { choice: 'not-transitive' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'divides-properties', { choice: 'partial-order' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    await form.locator('[data-action="reset-exercise"]').click();
    await expect(form).toHaveAttribute('data-result', 'none');
  });
});
