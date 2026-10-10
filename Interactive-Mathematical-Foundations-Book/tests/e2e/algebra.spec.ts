/**
 * The Algebra chapter (I.4): publication, navigation and every stage, each checked from the DOM and from pixel positions computed
 * here by hand (the world windows below are written out in this file, never read from the application's viewport code), and the
 * exercises through their visible feedback.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { findChapter, neighbours } from '../../src/curriculum/queries';
import { noPageOverflow } from './helpers';

const PATH = 'chapters/algebra/';
/** The trial-value line shows x in [−11, 11]; the reversal lines show [−8, 8] and [−20, 20]; the axis is 42 % of the way down a number line. */
const TRIAL = { xMin: -11, xMax: 11 };
const BEFORE = { xMin: -8, xMax: 8 };
const AFTER = { xMin: -20, xMax: 20 };
type Span = { xMin: number; xMax: number };
/** Square planes: the world window is fitted with one scale for both axes and centred. */
const EXTRANEOUS = { xMin: -8, xMax: 12, yMin: -10, yMax: 10 };
const FALLACY = { xMin: -8, xMax: 8, yMin: -10, yMax: 14 };
const BRACKET = { xMin: -6, xMax: 6, yMin: -12, yMax: 12 };
type Window = typeof EXTRANEOUS;

async function open(page: Page, name: string): Promise<Locator> {
  await page.goto(PATH);
  const stage = page.locator(`[data-stage="${name}"]`);
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute('data-hydrated', 'true');
  await page.evaluate(() => document.fonts.ready);
  return stage;
}
const lines = (stage: Locator, id: string) =>
  stage.locator(`[data-quantity="${id}"] dd .line`).evaluateAll(els => els.map(e => `${e.querySelector('.rel')?.textContent ?? ''} ${e.querySelector('.val')?.textContent ?? ''}`.replace(/\u2212/g, '-').replace(/\s+/g, ' ').trim()));
const spin = (stage: Locator, index: number) => stage.locator('input[role="spinbutton"]').nth(index);
async function enter(field: Locator, text: string) {
  await field.fill(text);
  await field.press('Enter');
}
const choose = (stage: Locator, label: string) => stage.locator('label.segment', { hasText: new RegExp(`^${label}$`) }).click();
const near = (actual: number, expected: number, tolerance = 1.5) => expect(Math.abs(actual - expected), `${actual} vs ${expected}`).toBeLessThan(tolerance);
/** Page pixels of the point x on the nth number line of a stage; the axis is 42 % of the way down. */
async function linePixel(stage: Locator, span: Span, x: number, index = 0) {
  const box = (await stage.locator('svg.plane').nth(index).boundingBox())!;
  const scale = box.width / (span.xMax - span.xMin);
  return { x: box.x + (x - span.xMin) * scale, y: box.y + 0.42 * box.height, scale };
}
/** Page pixels of a world point on a square plane showing `win`: one scale for both axes, the window centred in the plane. */
async function pixel(stage: Locator, win: Window, x: number, y: number) {
  const box = (await stage.locator('svg.plane').boundingBox())!;
  const scale = Math.min(box.width / (win.xMax - win.xMin), box.height / (win.yMax - win.yMin));
  const left = box.x + (box.width - (win.xMax - win.xMin) * scale) / 2;
  const top = box.y + (box.height - (win.yMax - win.yMin) * scale) / 2;
  return { x: left + (x - win.xMin) * scale, y: top + (win.yMax - y) * scale, scale };
}
const centreOf = async (el: Locator) => { const b = (await el.boundingBox())!; return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
async function dragTo(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}
const showPlane = (stage: Locator, index = 0) => stage.locator('svg.plane').nth(index).evaluate(e => e.scrollIntoView({ block: 'center' }));
const preset = (stage: Locator, id: string) => stage.locator(`[data-preset="${id}"]`).click();
const apply = (stage: Locator) => stage.locator('[data-action="apply"]').click();
/** The beam as drawn: the end points of the bar in its own coordinates, and the two pan boxes. */
const beam = (stage: Locator) => stage.locator('.beam-bar').evaluate(e => ({ x1: +e.getAttribute('x1')!, y1: +e.getAttribute('y1')!, x2: +e.getAttribute('x2')!, y2: +e.getAttribute('y2')! }));
const panTops = (stage: Locator) => stage.locator('.beam .pan rect').evaluateAll(els => els.map(e => +e.getAttribute('y')!));

test.describe('publication and navigation', () => {
  test('the chapter exists with the right metadata, one h1, and a section outline', async ({ page }) => {
    await page.goto(PATH);
    await expect(page).toHaveTitle(/Algebraic expressions, equations and inequalities/);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText('same');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /extraneous roots/);
    const h2 = await page.locator('main h2').allTextContents();
    for (const heading of ['Intuition', 'Definition', 'Keeping the balance', 'Inequalities and the order-reversing rule', 'Squaring is not a balanced step', 'Dividing by something that can be zero', 'Expanding brackets', 'Worked examples', 'Executable reference code', 'Explore', 'Common mistakes', 'Numerical considerations', 'Connections', 'Exercises', 'Summary and checkpoints'])
      expect(h2.some(t => t.includes(heading)), heading).toBe(true);
    const levels = await page.locator('main :is(h1,h2,h3,h4)').evaluateAll(els => els.map(e => Number(e.tagName[1])));
    for (let i = 1; i < levels.length; i++) expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
  });
  test('it is reachable from the contents page and sits fourth in Part I', async ({ page }) => {
    expect(findChapter('I.4')!.chapter.status).toBe('available');
    await page.goto('contents/');
    await page.locator('a[href$="chapters/algebra/"]').first().click();
    await expect(page).toHaveURL(/chapters\/algebra\/$/);
    await expect(page.locator('.topbar a[aria-current="true"]')).toHaveAttribute('title', /Part I:/);
  });
  test('the pager links the previous and the next chapter in reading order', async ({ page }) => {
    await page.goto(PATH);
    const around = neighbours(findChapter('I.4')!);
    await expect(page.locator('nav.chapter-pager .pager-previous')).toContainText(`${around.previous!.id} · ${around.previous!.chapter.title}`);
    const next = page.locator('nav.chapter-pager .pager-next');
    await expect(next).toContainText(`${around.next!.id} · ${around.next!.chapter.title}`);
    if (around.next!.chapter.status === 'available') await expect(next).toHaveAttribute('href', new RegExp(`chapters/${around.next!.chapter.slug}/$`));
  });
  test('the cross-references go to the published chapters on both sides of Part I', async ({ page }) => {
    await page.goto(PATH);
    await expect(page.locator('main a[href$="chapters/quantities/"]').first()).toBeVisible();
    await expect(page.locator('main a[href$="chapters/coordinates/"]').first()).toBeVisible();
  });
  test('no duplicate ids across islands, and the page does not overflow', async ({ page }) => {
    await page.goto(PATH);
    await page.locator('[data-stage="worked"][data-hydrated="true"]').waitFor();
    await page.locator('[data-exercise][data-hydrated="true"]').first().waitFor();
    const dupes = await page.evaluate(() => { const seen = new Map<string, number>(); document.querySelectorAll('[id]').forEach(e => seen.set(e.id, (seen.get(e.id) ?? 0) + 1)); return [...seen].filter(([, n]) => n > 1).map(([id]) => id); });
    expect(dupes).toEqual([]);
    expect(await noPageOverflow(page)).toBe(true);
  });
  test('all six stages hydrate', async ({ page }) => {
    await page.goto(PATH);
    for (const s of ['balance', 'reversal', 'extraneous', 'fallacy', 'expression', 'worked']) {
      await page.locator(`[data-stage="${s}"]`).scrollIntoViewIfNeeded();
      await expect(page.locator(`[data-stage="${s}"]`)).toHaveAttribute('data-hydrated', 'true');
    }
  });
});

test.describe('mechanism A: the balance, its history and the solution set (the hero stage)', () => {
  test('canonical state: 3x + 2 = x + 10 at x = 0; the right pan is lower and hangs where the numbers say', async ({ page }) => {
    const stage = await open(page, 'balance');
    await expect(stage).toHaveAttribute('data-steps', '0');
    await expect(stage).toHaveAttribute('data-trial', '0');
    await expect(stage).toHaveAttribute('data-solution', 'x = 4');
    await expect(stage).toHaveAttribute('data-holds', 'false');
    expect(await lines(stage, 'left')).toEqual(['= 2']);
    expect(await lines(stage, 'right')).toEqual(['= 10']);
    expect(await lines(stage, 'diff')).toEqual(['= -8']);
    expect(await lines(stage, 'holds')).toEqual(['= false']);
    expect(await lines(stage, 'solution')).toEqual(['= {4}']);
    // the beam: left minus right is −8, so the tilt is 15° · 8 / (8 + 4) = 10° with the right end LOWER (larger y in the drawing)
    await expect(stage.locator('svg.beam')).toHaveAttribute('data-tilt', '-10.00');
    const bar = await beam(stage);
    expect(bar.y2).toBeGreaterThan(bar.y1);
    near(Math.atan2(bar.y2 - bar.y1, bar.x2 - bar.x1) * 180 / Math.PI, 10, 0.05);
    near(Math.hypot(bar.x2 - bar.x1, bar.y2 - bar.y1), 256, 0.05);
    const [leftTop, rightTop] = await panTops(stage);
    expect(rightTop!).toBeGreaterThan(leftTop!);
    await expect(stage.locator('[data-verdict]')).toContainText('the right pan is lower');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'true');
    // the trial handle and the solution marker sit on the pixels of 0 and 4
    await showPlane(stage);
    const h = await centreOf(stage.locator('.drag-point .ring'));
    const zero = await linePixel(stage, TRIAL, 0);
    near(h.x, zero.x);
    near(h.y, zero.y);
    const mark = await centreOf(stage.locator('[data-part="solution"]'));
    near(mark.x, (await linePixel(stage, TRIAL, 4)).x);
  });
  test('dragging the trial value onto the solution levels the beam exactly, and the statement holds', async ({ page }) => {
    const stage = await open(page, 'balance');
    await showPlane(stage);
    await dragTo(page, await centreOf(stage.locator('.drag-point .ring')), await linePixel(stage, TRIAL, 4));
    await expect(stage).toHaveAttribute('data-trial', '4');
    await expect(stage).toHaveAttribute('data-holds', 'true');
    expect(await lines(stage, 'left')).toEqual(['= 14']);
    expect(await lines(stage, 'right')).toEqual(['= 14']);
    expect(await lines(stage, 'diff')).toEqual(['= 0']);
    await expect(stage.locator('svg.beam')).toHaveAttribute('data-tilt', '0.00');
    const bar = await beam(stage);
    expect(bar.y1).toBeCloseTo(bar.y2, 6);
    const [leftTop, rightTop] = await panTops(stage);
    expect(leftTop!).toBeCloseTo(rightTop!, 6);
    const h = await centreOf(stage.locator('.drag-point .ring'));
    near(h.x, (await linePixel(stage, TRIAL, 4)).x);
  });
  test('typing a trial value moves the beam; just left of the solution it tilts the other way', async ({ page }) => {
    const stage = await open(page, 'balance');
    await enter(spin(stage, 1), '9');
    await expect(stage).toHaveAttribute('data-trial', '9');
    // at 9: left 29, right 19, so the LEFT pan is lower and the bar's left end is lower
    expect(await lines(stage, 'diff')).toEqual(['= 10']);
    const bar = await beam(stage);
    expect(bar.y1).toBeGreaterThan(bar.y2);
    await expect(stage.locator('[data-verdict]')).toContainText('the left pan is lower');
  });
  test('the solution path, one balanced step at a time: the solution set never changes, and the history keeps every step', async ({ page }) => {
    const stage = await open(page, 'balance');
    await choose(stage, 'add a multiple of x');
    await enter(spin(stage, 0), '-1');
    await apply(stage);
    await expect(stage).toHaveAttribute('data-steps', '1');
    await expect(stage).toHaveAttribute('data-solution', 'x = 4');
    await choose(stage, 'add a number');
    await enter(spin(stage, 0), '-2');
    await apply(stage);
    await expect(stage).toHaveAttribute('data-steps', '2');
    await expect(stage).toHaveAttribute('data-solution', 'x = 4');
    await choose(stage, 'divide by');
    await enter(spin(stage, 0), '2');
    await apply(stage);
    await expect(stage).toHaveAttribute('data-steps', '3');
    await expect(stage).toHaveAttribute('data-solution', 'x = 4');
    await expect(stage).toHaveAttribute('data-frame', '3');
    // the last statement is x = 4: the left side at the trial value 0 is 0, the right side is 4
    expect(await lines(stage, 'left')).toEqual(['= 0']);
    expect(await lines(stage, 'right')).toEqual(['= 4']);
    // selecting an earlier step only SHOWS it; nothing is undone
    await stage.getByRole('button', { name: /Previous/ }).click();
    await expect(stage).toHaveAttribute('data-frame', '2');
    await expect(stage).toHaveAttribute('data-steps', '3');
    expect(await lines(stage, 'right')).toEqual(['= 8']);
    await expect(stage).toHaveAttribute('data-solution', 'x = 4');
  });
  test('"Remove last step" is its own action and does take a step back', async ({ page }) => {
    const stage = await open(page, 'balance');
    await expect(stage.locator('[data-action="remove-step"]')).toBeDisabled();
    await apply(stage);
    await expect(stage).toHaveAttribute('data-steps', '1');
    await stage.locator('[data-action="remove-step"]').click();
    await expect(stage).toHaveAttribute('data-steps', '0');
    await expect(stage).toHaveAttribute('data-frame', '0');
  });
  test('multiplying or dividing by 0 is refused, with the reason, and nothing is added to the history', async ({ page }) => {
    const stage = await open(page, 'balance');
    await choose(stage, 'multiply by');
    await enter(spin(stage, 0), '0');
    await apply(stage);
    await expect(stage.locator('[data-rejection]')).toHaveAttribute('data-rejected', 'true');
    await expect(stage).toHaveAttribute('data-steps', '0');
    await expect(stage.locator('[data-rejection]')).toContainText('0');
    await choose(stage, 'divide by');
    await apply(stage);
    await expect(stage.locator('[data-rejection]')).toHaveAttribute('data-rejected', 'true');
    await expect(stage).toHaveAttribute('data-steps', '0');
    await enter(spin(stage, 0), '2');
    await apply(stage);
    await expect(stage.locator('[data-rejection]')).toHaveAttribute('data-rejected', 'false');
    await expect(stage).toHaveAttribute('data-steps', '1');
  });
  test('the three kinds of solution set: one number, none, every number', async ({ page }) => {
    const stage = await open(page, 'balance');
    await preset(stage, 'b-none');
    await expect(stage).toHaveAttribute('data-solution', 'no x');
    await expect(stage).toHaveAttribute('data-holds', 'false');
    await expect(stage.locator('[data-part="solution-none"]')).toHaveCount(1);
    await preset(stage, 'b-all');
    await expect(stage).toHaveAttribute('data-solution', 'every x');
    await expect(stage).toHaveAttribute('data-holds', 'true');
    await expect(stage.locator('[data-part="solution-all"]')).toHaveCount(1);
    await preset(stage, 'b-frac');
    await expect(stage).toHaveAttribute('data-solution', 'x = 2/3');
  });
  test('an inequality: the solution is a ray, and dividing by a negative number reverses the relation', async ({ page }) => {
    const stage = await open(page, 'balance');
    await preset(stage, 'b-ge');
    await expect(stage).toHaveAttribute('data-solution', 'x ≥ 3');
    await expect(stage.locator('[data-part="solution-ray"]')).toHaveCount(1);
    // the closed end point (x = 3 is included) is drawn filled, on the pixel of 3
    await showPlane(stage);
    const bound = await centreOf(stage.locator('[data-part="solution-bound"]'));
    near(bound.x, (await linePixel(stage, TRIAL, 3)).x);
    await expect(stage.locator('[data-part="solution-bound"]')).toHaveClass(/is-filled/);
    // 4 − 2x < x + 10: subtract x, subtract 4, then divide by −3
    await preset(stage, 'b-neg');
    await expect(stage).toHaveAttribute('data-solution', 'x > −2');
    await expect(stage.locator('[data-part="solution-bound"]')).toHaveClass(/is-open/);
    await choose(stage, 'add a multiple of x');
    await enter(spin(stage, 0), '-1');
    await apply(stage);
    await choose(stage, 'add a number');
    await enter(spin(stage, 0), '-4');
    await apply(stage);
    await choose(stage, 'divide by');
    await enter(spin(stage, 0), '-3');
    await apply(stage);
    await expect(stage).toHaveAttribute('data-steps', '3');
    await expect(stage).toHaveAttribute('data-solution', 'x > −2');
    await expect(stage.locator('.trace-caption')).toContainText('the relation turns around');
    // the last statement is x > −2: at the trial value 0 it holds
    await expect(stage).toHaveAttribute('data-holds', 'true');
  });
  test('the arrow keys move the trial value by one', async ({ page }) => {
    const stage = await open(page, 'balance');
    await showPlane(stage);
    await stage.locator('.drag-point').focus();
    await page.keyboard.press('ArrowRight');
    await expect(stage).toHaveAttribute('data-trial', '1');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(stage).toHaveAttribute('data-trial', '-1');
  });
  test('Reset returns to the first statement with no history', async ({ page }) => {
    const stage = await open(page, 'balance');
    await preset(stage, 'b-ge');
    await apply(stage);
    await stage.locator('[data-action="reset"]').click();
    await expect(stage).toHaveAttribute('data-steps', '0');
    await expect(stage).toHaveAttribute('data-solution', 'x = 4');
    await expect(stage.locator('[data-action="reset"]')).toBeDisabled();
  });
});

test.describe('mechanism B: multiplying an inequality by k', () => {
  test('canonical state: 2 < 5 times −2 gives −4 > −10, and the labels sit where the products are', async ({ page }) => {
    const stage = await open(page, 'reversal');
    await expect(stage).toHaveAttribute('data-rule', 'reverses');
    await expect(stage).toHaveAttribute('data-after', 'greater');
    expect(await lines(stage, 'kp')).toEqual(['= -4']);
    expect(await lines(stage, 'kq')).toEqual(['= -10']);
    expect(await lines(stage, 'before')).toEqual(['= 2 < 5']);
    expect(await lines(stage, 'after')).toEqual(['= -4 > -10']);
    expect(await lines(stage, 'unchanged')).toEqual(['= no']);
    await expect(stage.locator('[data-verdict]')).toContainText('REVERSED');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
    await showPlane(stage);
    // p and q on the first line
    const p = await centreOf(stage.locator('.drag-point .ring').nth(0));
    const q = await centreOf(stage.locator('.drag-point .ring').nth(1));
    near(p.x, (await linePixel(stage, BEFORE, 2, 0)).x);
    near(q.x, (await linePixel(stage, BEFORE, 5, 0)).x);
    // kp = −4 and kq = −10 on the second, wider line: kq is LEFT of kp
    const kp = await centreOf(stage.locator('[data-part="label-kp"]'));
    const kq = await centreOf(stage.locator('[data-part="label-kq"]'));
    near(kp.x, (await linePixel(stage, AFTER, -4, 1)).x, 2.5);
    near(kq.x, (await linePixel(stage, AFTER, -10, 1)).x, 2.5);
    expect(kq.x).toBeLessThan(kp.x);
  });
  test('a positive k keeps the order; the arrows have the same direction', async ({ page }) => {
    const stage = await open(page, 'reversal');
    await preset(stage, 'r-pos');
    await expect(stage).toHaveAttribute('data-rule', 'keeps');
    await expect(stage).toHaveAttribute('data-after', 'less');
    expect(await lines(stage, 'after')).toEqual(['= 6 < 15']);
    expect(await lines(stage, 'unchanged')).toEqual(['= yes']);
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'true');
    const kp = await centreOf(stage.locator('[data-part="label-kp"]'));
    const kq = await centreOf(stage.locator('[data-part="label-kq"]'));
    expect(kq.x).toBeGreaterThan(kp.x);
  });
  test('k = 0 is refused: both products collapse to 0 and the strict order is lost', async ({ page }) => {
    const stage = await open(page, 'reversal');
    await preset(stage, 'r-zero');
    await expect(stage).toHaveAttribute('data-rule', 'rejected');
    expect(await lines(stage, 'after')).toEqual(['= 0 = 0']);
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
    await expect(stage.locator('[data-part="label-kp"]')).toContainText('kp = kq');
  });
  test('equal numbers stay equal whatever k is: the rule is about strict order only', async ({ page }) => {
    const stage = await open(page, 'reversal');
    await preset(stage, 'r-equal');
    expect(await lines(stage, 'before')).toEqual(['= 3 = 3']);
    expect(await lines(stage, 'after')).toEqual(['= -6 = -6']);
    expect(await lines(stage, 'unchanged')).toEqual(['= not applicable']);
  });
  test('dragging p past q turns the stated order around; typing k = −1 reverses it', async ({ page }) => {
    const stage = await open(page, 'reversal');
    await showPlane(stage);
    await dragTo(page, await centreOf(stage.locator('.drag-point .ring').nth(0)), await linePixel(stage, BEFORE, 6, 0));
    await expect(stage).toHaveAttribute('data-p', '6');
    expect(await lines(stage, 'before')).toEqual(['= 6 > 5']);
    await enter(spin(stage, 2), '-1');
    await expect(stage).toHaveAttribute('data-k', '-1');
    expect(await lines(stage, 'kp')).toEqual(['= -6']);
    expect(await lines(stage, 'after')).toEqual(['= -6 < -5']);
  });
  test('the multiplier is limited to the stated range, and a rejected entry does not change the state', async ({ page }) => {
    const stage = await open(page, 'reversal');
    await enter(spin(stage, 2), '7');
    await expect(stage).toHaveAttribute('data-k', '-2');
    await expect(stage.locator('.param-error')).toBeVisible();
  });
});

test.describe('mechanism C: squaring can invent roots', () => {
  test('canonical state: √(x + 2) = x has the candidates −1 (extraneous, on the dashed branch) and 2 (valid, on the solid one)', async ({ page }) => {
    const stage = await open(page, 'extraneous');
    await expect(stage).toHaveAttribute('data-roots', '2');
    await expect(stage).toHaveAttribute('data-valid', '1');
    await expect(stage).toHaveAttribute('data-extraneous', '1');
    expect(await lines(stage, 'disc')).toEqual(['= 9']);
    expect(await lines(stage, 'root-1')).toEqual(['= -1']);
    expect(await lines(stage, 'status-1')).toEqual(['= extraneous']);
    expect(await lines(stage, 'root-2')).toEqual(['= 2']);
    expect(await lines(stage, 'status-2')).toEqual(['= valid']);
    await showPlane(stage);
    // valid: (2, √4) = (2, 2) on the solid branch; extraneous: (−1, −1) on the dashed one, where the line is
    const good = await centreOf(stage.locator('[data-part="root-valid"]'));
    const bad = await centreOf(stage.locator('[data-part="root-extraneous"]'));
    const g = await pixel(stage, EXTRANEOUS, 2, 2);
    const b = await pixel(stage, EXTRANEOUS, -1, -1);
    near(good.x, g.x); near(good.y, g.y);
    near(bad.x, b.x); near(bad.y, b.y);
    await expect(stage.locator('[data-part="root-valid"]')).toHaveClass(/is-filled/);
    await expect(stage.locator('[data-part="root-extraneous"]')).toHaveClass(/is-open/);
    await expect(stage.locator('[data-verdict]')).toContainText('Squaring produced 2 candidates but only 1 solves the original equation');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
  });
  test('the curves are drawn from the equation: the solid branch passes through (2, 2) and the dashed one through (2, −2)', async ({ page }) => {
    const stage = await open(page, 'extraneous');
    const box = (await stage.locator('svg.plane').boundingBox())!;
    const on = async (part: string, x: number, y: number) => {
      const d = (await stage.locator(`[data-part="${part}"]`).getAttribute('d'))!;
      const pts = [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])] as const);
      const at = await pixel(stage, EXTRANEOUS, x, y);
      const best = Math.min(...pts.map(([px, py]) => Math.hypot(px + box.x - at.x, py + box.y - at.y)));
      return best;
    };
    expect(await on('upper-branch', 2, 2)).toBeLessThan(2);
    expect(await on('lower-branch', 2, -2)).toBeLessThan(2);
    expect(await on('line', 2, 2)).toBeLessThan(2);
    expect(await on('upper-branch', 2, -2)).toBeGreaterThan(10);
  });
  test('irrational candidates are decided exactly: x² − x − 1 = 0 gives (1 ± √5)/2 and only the larger is valid', async ({ page }) => {
    const stage = await open(page, 'extraneous');
    await preset(stage, 'x-1-0');
    expect(await lines(stage, 'root-1')).toEqual(['= (1 - √5)/2', '≈ -0.618034…']);
    expect(await lines(stage, 'status-1')).toEqual(['= extraneous']);
    expect(await lines(stage, 'root-2')).toEqual(['= (1 + √5)/2', '≈ 1.618034…']);
    expect(await lines(stage, 'status-2')).toEqual(['= valid']);
  });
  test('the other presets: p = q has two valid roots, q > p has none, and the big case 6, −6', async ({ page }) => {
    const stage = await open(page, 'extraneous');
    await preset(stage, 'x-0-0');
    await expect(stage).toHaveAttribute('data-valid', '2');
    await expect(stage).toHaveAttribute('data-extraneous', '0');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'true');
    await preset(stage, 'x-0-1');
    await expect(stage).toHaveAttribute('data-roots', '0');
    expect(await lines(stage, 'disc')).toEqual(['= -3']);
    expect(await lines(stage, 'roots')).toEqual(['= none']);
    await expect(stage.locator('[data-part="root-valid"]')).toHaveCount(0);
    await preset(stage, 'x-6-m6');
    expect(await lines(stage, 'root-1')).toEqual(['= 3']);
    expect(await lines(stage, 'status-1')).toEqual(['= extraneous']);
    expect(await lines(stage, 'root-2')).toEqual(['= 10']);
    expect(await lines(stage, 'status-2')).toEqual(['= valid']);
  });
  test('typing p and q recomputes everything: at least one candidate is valid whenever there are candidates', async ({ page }) => {
    const stage = await open(page, 'extraneous');
    for (const p of [-6, -3, 0, 4, 6]) for (const q of [-6, -2, 0, 3, 6]) {
      await enter(spin(stage, 0), String(p));
      await enter(spin(stage, 1), String(q));
      await expect(stage).toHaveAttribute('data-q', String(q));
      const roots = Number(await stage.getAttribute('data-roots'));
      const valid = Number(await stage.getAttribute('data-valid'));
      const D = 4 * p - 4 * q + 1;
      expect(roots, `p=${p} q=${q}`).toBe(D < 0 ? 0 : 2);
      if (roots > 0) expect(valid, `p=${p} q=${q}`).toBeGreaterThanOrEqual(1);
      expect((await lines(stage, 'disc'))[0]).toBe(`= ${D}`.replace('-', '-'));
    }
  });
  test('the curves are redrawn when p or q changes, and are the same again when the parameters return', async ({ page }) => {
    const stage = await open(page, 'extraneous');
    const d = () => stage.locator('[data-part="upper-branch"]').getAttribute('d');
    const line = () => stage.locator('[data-part="line"]').getAttribute('d');
    const first = await d();
    const firstLine = await line();
    await enter(spin(stage, 0), '4');
    expect(await d()).not.toBe(first);
    expect(await line()).toBe(firstLine);
    await enter(spin(stage, 1), '1');
    expect(await line()).not.toBe(firstLine);
    await enter(spin(stage, 0), '2');
    await enter(spin(stage, 1), '0');
    expect(await d()).toBe(first);
    expect(await line()).toBe(firstLine);
  });
});

test.describe('mechanism D: dividing by a factor that can be zero', () => {
  test('canonical state: x(x − 2) = 3(x − 2) has the solutions 2 and 3; dividing by (x − 2) loses 2', async ({ page }) => {
    const stage = await open(page, 'fallacy');
    await expect(stage).toHaveAttribute('data-solutions', '2');
    await expect(stage).toHaveAttribute('data-lost', '2');
    expect(await lines(stage, 'solutions')).toEqual(['= {2, 3}']);
    expect(await lines(stage, 'divided')).toEqual(['= x = 3']);
    expect(await lines(stage, 'lost')).toEqual(['= x = 2']);
    expect(await lines(stage, 'left-at-c')).toEqual(['= 0']);
    expect(await lines(stage, 'right-at-c')).toEqual(['= 0']);
    await showPlane(stage);
    // the two solutions are where the parabola and the line meet: (2, 0) and (3, 3)
    const lost = await centreOf(stage.locator('[data-part="solution-lost"]'));
    const kept = await centreOf(stage.locator('[data-part="solution-kept"]'));
    const l = await pixel(stage, FALLACY, 2, 0);
    const k = await pixel(stage, FALLACY, 3, 3);
    near(lost.x, l.x); near(lost.y, l.y);
    near(kept.x, k.x); near(kept.y, k.y);
    await expect(stage.locator('[data-verdict]')).toContainText('silently throws away x = 2');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
  });
  test('the other presets: the lost root moves with c, c = m loses nothing', async ({ page }) => {
    const stage = await open(page, 'fallacy');
    await preset(stage, 'f-m1-4');
    expect(await lines(stage, 'solutions')).toEqual(['= {-1, 4}']);
    expect(await lines(stage, 'lost')).toEqual(['= x = -1']);
    await preset(stage, 'f-0-2');
    expect(await lines(stage, 'solutions')).toEqual(['= {0, 2}']);
    expect(await lines(stage, 'lost')).toEqual(['= x = 0']);
    await preset(stage, 'f-3-3');
    await expect(stage).toHaveAttribute('data-solutions', '1');
    await expect(stage).toHaveAttribute('data-lost', 'none');
    expect(await lines(stage, 'lost')).toEqual(['= none']);
    await expect(stage.locator('[data-part="solution-lost"]')).toHaveCount(0);
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'true');
    await preset(stage, 'f-2-m2');
    expect(await lines(stage, 'solutions')).toEqual(['= {-2, 2}']);
  });
  test('typing c and m recomputes the solutions, which are always c and m', async ({ page }) => {
    const stage = await open(page, 'fallacy');
    await enter(spin(stage, 0), '-4');
    await enter(spin(stage, 1), '5');
    expect(await lines(stage, 'solutions')).toEqual(['= {-4, 5}']);
    expect(await lines(stage, 'lost')).toEqual(['= x = -4']);
    await showPlane(stage);
    const lost = await centreOf(stage.locator('[data-part="solution-lost"]'));
    const at = await pixel(stage, FALLACY, -4, 0);
    near(lost.x, at.x); near(lost.y, at.y);
  });
});

test.describe('mechanism E: brackets, identities and the slip', () => {
  test('canonical state: 2(x + 3) and 2x + 6 are one expression, so the equation is an identity and the two lines coincide', async ({ page }) => {
    const stage = await open(page, 'expression');
    await expect(stage).toHaveAttribute('data-kind', 'identity');
    await expect(stage).toHaveAttribute('data-agrees', 'true');
    expect(await lines(stage, 'product')).toEqual(['= 10']);
    expect(await lines(stage, 'expanded')).toEqual(['= 10']);
    expect(await lines(stage, 'gap')).toEqual(['= 0']);
    expect(await lines(stage, 'kind')).toEqual(['= identity']);
    const a = await stage.locator('[data-part="line-bracket"]').getAttribute('d');
    const b = await stage.locator('[data-part="line-expansion"]').getAttribute('d');
    expect(a).toBe(b);
  });
  test('the slip 2(x + 3) = 2x + 3 gives parallel lines a distance c(a − 1) = 3 apart: a contradiction', async ({ page }) => {
    const stage = await open(page, 'expression');
    await preset(stage, 'd-slip');
    await expect(stage).toHaveAttribute('data-kind', 'contradiction');
    await expect(stage).toHaveAttribute('data-agrees', 'false');
    expect(await lines(stage, 'expanded')).toEqual(['= 7']);
    expect(await lines(stage, 'gap')).toEqual(['= 3']);
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
    await showPlane(stage);
    // both ends of the gap segment are on the plane: its length is 3 units
    const seg = stage.locator('[data-part="gap"]');
    const box = await seg.boundingBox();
    const unit = (await pixel(stage, BRACKET, 0, 0)).scale;
    near(box!.height - 3, 3 * unit, 1.5); // the drawn stroke is 3 px wide, which the bounding box includes
    // the lines are parallel: the solid and the dashed path have the same slope between their first two points
    const slope = async (part: string) => {
      const d = (await stage.locator(`[data-part="${part}"]`).getAttribute('d'))!;
      const n = [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])] as const);
      return (n[1]![1] - n[0]![1]) / (n[1]![0] - n[0]![0]);
    };
    near(await slope('line-bracket'), await slope('line-expansion'), 1e-6);
    const solid = (await stage.locator('[data-part="line-bracket"]').getAttribute('d'))!;
    const dashed = (await stage.locator('[data-part="line-expansion"]').getAttribute('d'))!;
    expect(solid).not.toBe(dashed);
  });
  test('the slip is harmless exactly when a = 1 or c = 0', async ({ page }) => {
    const stage = await open(page, 'expression');
    await preset(stage, 'd-harmless');
    await expect(stage).toHaveAttribute('data-kind', 'identity');
    await expect(stage).toHaveAttribute('data-agrees', 'true');
    await expect(stage.locator('[data-verdict]')).toContainText('harmless');
    // c = 0 with a different a: still harmless
    await enter(spin(stage, 0), '3');
    await enter(spin(stage, 2), '0');
    await expect(stage).toHaveAttribute('data-kind', 'identity');
    // a = 3, c = 1: not harmless
    await enter(spin(stage, 2), '1');
    await expect(stage).toHaveAttribute('data-kind', 'contradiction');
  });
  test('negative numbers: −3(2x − 1) = −6x + 3 and the slip is off by 4', async ({ page }) => {
    const stage = await open(page, 'expression');
    await preset(stage, 'd-neg-slip');
    expect(await lines(stage, 'product')).toEqual(['= -3']);
    expect(await lines(stage, 'expanded')).toEqual(['= -7']);
    expect(await lines(stage, 'gap')).toEqual(['= 4']);
  });
  test('the choice of expansion changes only the dashed line, and the value of x moves the gap marker', async ({ page }) => {
    const stage = await open(page, 'expression');
    const solid = await stage.locator('[data-part="line-bracket"]').getAttribute('d');
    await choose(stage, 'multiply the first term only: abx \\+ c');
    await expect(stage).toHaveAttribute('data-form', 'slip');
    expect(await stage.locator('[data-part="line-bracket"]').getAttribute('d')).toBe(solid);
    await enter(spin(stage, 3), '-1.5');
    await expect(stage).toHaveAttribute('data-x', '-1.5');
    expect(await lines(stage, 'gap')).toEqual(['= 3']);
    expect(await lines(stage, 'inner')).toEqual(['= 1.5']);
  });
});

test.describe('mechanism F: worked examples', () => {
  const walk = async (stage: Locator) => {
    const captions: string[] = [];
    for (let i = 0; i < 30 && (await stage.getByRole('button', { name: /Next/ }).isEnabled()); i++) {
      await stage.getByRole('button', { name: /Next/ }).click();
      captions.push((await stage.locator('.trace-caption').textContent())!);
    }
    return captions;
  };
  test('solve 3x + 2 = x + 10: three balanced steps, then the check in the ORIGINAL statement', async ({ page }) => {
    const stage = await open(page, 'worked');
    await expect(stage).toHaveAttribute('data-example', 'w-solve');
    const captions = await walk(stage);
    expect(captions).toHaveLength(4);
    expect(captions[0]).toContain('Subtract x');
    expect(captions[3]).toContain('ORIGINAL');
    expect(captions[3]).toContain('14');
  });
  test('the five examples are all present and each ends with its lesson', async ({ page }) => {
    const stage = await open(page, 'worked');
    const picks = stage.locator('button[data-example]');
    await expect(picks).toHaveCount(5);
    const lastOf = async (id: string) => {
      await stage.locator(`button[data-example="${id}"]`).click();
      await expect(stage).toHaveAttribute('data-example', id);
      const captions = await walk(stage);
      return captions[captions.length - 1]!;
    };
    expect(await lastOf('w-frac')).toContain('ORIGINAL');
    expect(await lastOf('w-neg')).toMatch(/ORIGINAL|original/);
    expect(await lastOf('w-root')).toContain('only substitution into the original equation');
    expect(await lastOf('w-div')).toContain('both cases appear');
  });
  test('going back selects an earlier step and changes nothing else', async ({ page }) => {
    const stage = await open(page, 'worked');
    await walk(stage);
    await stage.getByRole('button', { name: /Previous/ }).click();
    await expect(stage.locator('.trace-caption')).toContainText('Divide both sides by 2');
  });
});

test.describe('exercises', () => {
  const ex = async (page: Page, id: string) => { await page.goto(PATH); const e = page.locator(`[data-exercise="${id}"]`); await e.scrollIntoViewIfNeeded(); await expect(e).toHaveAttribute('data-hydrated', 'true'); return e; };
  const check = (e: Locator) => e.locator('[data-action="check"]').click();
  test('all eleven exercises are present and hydrate', async ({ page }) => {
    await page.goto(PATH);
    const ids = ['solve-linear', 'no-solution', 'reverse-predict', 'multiply-zero', 'inequality-boundary', 'valid-root', 'construct-extraneous', 'lost-root', 'distribute-expand', 'pick-identity', 'learning-rate'];
    for (const id of ids) {
      const e = page.locator(`[data-exercise="${id}"]`);
      await e.scrollIntoViewIfNeeded();
      await expect(e, id).toHaveAttribute('data-hydrated', 'true');
    }
    await expect(page.locator('[data-exercise]')).toHaveCount(ids.length);
  });
  test('a calculation: the four wrong answers are each named, then x = 4 is confirmed', async ({ page }) => {
    const e = await ex(page, 'solve-linear');
    const answer = async (v: string) => { await e.locator('[data-field="x"]').fill(v); await check(e); };
    await answer('8/3');
    await expect(e.locator('[data-feedback]')).toContainText('forgetting the x');
    await answer('6');
    await expect(e.locator('[data-feedback]')).toContainText('adds the 2');
    await answer('-4');
    await expect(e.locator('[data-feedback]')).toContainText('wrong sign');
    await answer('2');
    await expect(e.locator('[data-feedback]')).toContainText('adds the x terms');
    await answer('abc');
    await expect(e).toHaveAttribute('data-result', 'incorrect');
    await answer('4');
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('a prediction: no solution, and the misleading choices are explained', async ({ page }) => {
    const e = await ex(page, 'no-solution');
    await e.getByLabel('x = 2', { exact: true }).check();
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('not equal');
    await e.getByLabel('every x is a solution', { exact: true }).check();
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('4 more');
    await e.getByLabel('there is no solution', { exact: true }).check();
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('dividing by a negative: the missed reversal is named with a counterexample', async ({ page }) => {
    const e = await ex(page, 'reverse-predict');
    await e.getByLabel('x < −2', { exact: true }).check();
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('not reversed');
    await e.getByLabel('x > 2', { exact: true }).check();
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('wrong sign');
    await e.getByLabel('x > −2', { exact: true }).check();
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('an explanation: why multiplying by 0 is refused', async ({ page }) => {
    const e = await ex(page, 'multiply-zero');
    await e.getByLabel('0 is not a number', { exact: true }).check();
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('perfectly good operation');
    await e.getByLabel('it turns every equation into 0 = 0, so it cannot be undone and the solution set changes', { exact: true }).check();
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('the boundary of 5x − 1 ≥ 2x + 8: the sign and the collecting slips are named', async ({ page }) => {
    const e = await ex(page, 'inequality-boundary');
    const answer = async (v: string) => { await e.locator('[data-field="b"]').fill(v); await check(e); };
    await answer('7/3');
    await expect(e.locator('[data-feedback]')).toContainText('ADD 1');
    await answer('9/7');
    await expect(e.locator('[data-feedback]')).toContainText('adds the x terms');
    await answer('-3');
    await expect(e.locator('[data-feedback]')).toContainText('positive');
    await answer('3');
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('square, solve, then check: the extraneous 3 is named, the valid 10 is accepted', async ({ page }) => {
    const e = await ex(page, 'valid-root');
    await e.locator('[data-field="x"]').fill('3');
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('extraneous');
    await e.locator('[data-field="x"]').fill('10');
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('a construction is validated, not compared with a fixed answer: exactly one extraneous root', async ({ page }) => {
    const e = await ex(page, 'construct-extraneous');
    for (const [p, q, ok] of [['2', '0', true], ['6', '-6', true], ['1', '0', true], ['3', '3', false], ['0', '0', false], ['0', '1', false], ['7', '0', false], ['x', '1', false], ['4', '2', true]] as const) {
      await e.locator('[data-field="p"]').fill(p);
      await e.locator('[data-field="q"]').fill(q);
      await check(e);
      await expect(e, `${p},${q}`).toHaveAttribute('data-result', ok ? 'correct' : 'incorrect');
    }
    await e.locator('[data-field="p"]').fill('0');
    await e.locator('[data-field="q"]').fill('1');
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('negative');
  });
  test('the lost root: both solutions are required, swapped boxes and the single answer are named', async ({ page }) => {
    const e = await ex(page, 'lost-root');
    const answer = async (s: string, l: string) => { await e.locator('[data-field="small"]').fill(s); await e.locator('[data-field="large"]').fill(l); await check(e); };
    await answer('3', '3');
    await expect(e.locator('[data-feedback]')).toContainText('loses');
    await answer('3', '2');
    await expect(e.locator('[data-feedback]')).toContainText('wrong boxes');
    await answer('2', '3');
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('expanding and identities: the first-term slip is named', async ({ page }) => {
    const e = await ex(page, 'distribute-expand');
    await e.getByLabel('4x − 3', { exact: true }).check();
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('Only the first term');
    await e.getByLabel('4x − 12', { exact: true }).check();
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'correct');
    const f = await ex(page, 'pick-identity');
    await f.getByLabel('3(x + 1) = 3x + 1', { exact: true }).check();
    await check(f);
    await expect(f.locator('[data-feedback]')).toContainText('never true');
    await f.getByLabel('3(x + 1) = 3x + 3', { exact: true }).check();
    await check(f);
    await expect(f).toHaveAttribute('data-result', 'correct');
  });
  test('the learning rate: 0 < η < 1, and each wrong range is refuted with a number', async ({ page }) => {
    const e = await ex(page, 'learning-rate');
    await e.getByLabel('every η > 0', { exact: true }).check();
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('overshoots');
    await e.getByLabel('every η < 1', { exact: true }).check();
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('AWAY');
    await e.getByLabel('0 < η < 1', { exact: true }).check();
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('the worked solution appears only after an attempt, and Reset clears it; feedback is polite', async ({ page }) => {
    const e = await ex(page, 'solve-linear');
    await expect(e.locator('[data-action="show-solution"]')).toHaveCount(0);
    await e.locator('[data-field="x"]').fill('0');
    await check(e);
    await e.locator('[data-action="show-solution"]').click();
    await expect(e.locator('[data-solution]')).toContainText('Divide both sides by 2');
    await e.locator('[data-action="reset-exercise"]').click();
    await expect(e).toHaveAttribute('data-result', 'none');
    await expect(e.locator('[data-solution]')).toHaveCount(0);
    await expect(e.locator('.feedback')).toHaveAttribute('aria-live', 'polite');
  });
});

test.describe('code and tables', () => {
  test('the three reference files are shown, and the computed table flags exactly the equations where the double is not the true solution', async ({ page }) => {
    await page.goto(PATH);
    for (const f of ['algebra_solve.py', 'algebra_extraneous.py', 'algebra_affine.py']) await expect(page.locator('.code-file .file', { hasText: f })).toHaveCount(1);
    const rows = page.locator('[data-table="solve-exact-vs-double"] tbody tr');
    await expect(rows).toHaveCount(7);
    const text = await rows.allTextContents();
    expect(text[1]).toContain('0.9999999999999998');
    expect(text[4]).toContain('2.9999999999999996');
    const agree = await rows.evaluateAll(els => els.map(e => e.getAttribute('data-agree')));
    expect(agree).toEqual(['true', 'false', 'false', 'true', 'false', 'false', 'false']);
  });
});

test.describe('layout', () => {
  test('on a phone width: no page overflow, every stage hydrates, the balance controls and the planes fit', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PATH);
    for (const s of ['balance', 'reversal', 'extraneous', 'fallacy', 'expression', 'worked']) {
      await page.locator(`[data-stage="${s}"]`).scrollIntoViewIfNeeded();
      await expect(page.locator(`[data-stage="${s}"]`)).toHaveAttribute('data-hydrated', 'true');
    }
    expect(await noPageOverflow(page)).toBe(true);
    for (const s of ['balance', 'extraneous', 'fallacy', 'expression']) {
      const box = (await page.locator(`[data-stage="${s}"] svg.plane`).boundingBox())!;
      expect(box.x, s).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, s).toBeLessThanOrEqual(390.5);
    }
    // the four operation names stay inside the stage, and the apply button is a 44 px target
    const stage = page.locator('[data-stage="balance"]');
    const fits = await stage.locator('.balance-controls .segments').evaluate(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; });
    expect(fits).toBe(true);
    const apply = (await stage.locator('[data-action="apply"]').boundingBox())!;
    expect(apply.height).toBeGreaterThanOrEqual(44);
  });
  test('dragging works on a phone: the trial handle lands on the pixel of x = 4 and levels the beam', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const stage = await open(page, 'balance');
    await showPlane(stage);
    await dragTo(page, await centreOf(stage.locator('.drag-point .ring')), await linePixel(stage, TRIAL, 4));
    await expect(stage).toHaveAttribute('data-trial', '4');
    await expect(stage.locator('svg.beam')).toHaveAttribute('data-tilt', '0.00');
  });
});
