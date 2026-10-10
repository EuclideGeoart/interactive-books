/**
 * The Functions chapter (I.5): publication, navigation and every stage, each checked from the DOM and from pixel positions computed
 * here by hand (the world windows below are written out in this file, never read from the application's viewport code), and the
 * exercises through their visible feedback.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { findChapter, neighbours } from '../../src/curriculum/queries';
import { noPageOverflow } from './helpers';

const PATH = 'chapters/functions/';
/** Square planes: the world window is fitted with one scale for both axes and centred. The first two stages show [−8, 8]², the last two [−6, 6]². */
const BIG = { xMin: -8, xMax: 8, yMin: -8, yMax: 8 };
const SMALL = { xMin: -6, xMax: 6, yMin: -6, yMax: 6 };
type Window = typeof BIG;
const STAGES = ['function', 'height', 'composition', 'inverse', 'worked'];

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
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Choose a segment of the nth segmented control of a stage. */
const choose = (stage: Locator, group: number, label: string) => stage.locator('fieldset.segmented').nth(group).locator('label.segment', { hasText: new RegExp(`^${escape(label)}$`) }).click();
const near = (actual: number, expected: number, tolerance = 1.5) => expect(Math.abs(actual - expected), `${actual} vs ${expected}`).toBeLessThan(tolerance);
/** Page pixels of a world point on the square plane of a stage showing `win`. */
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
const showPlane = (stage: Locator) => stage.locator('svg.plane').evaluate(e => e.scrollIntoView({ block: 'center' }));
const preset = (stage: Locator, id: string) => stage.locator(`[data-preset="${id}"]`).click();
const curve = (stage: Locator, name = 'curve') => stage.locator(`path[data-part="${name}"]`).getAttribute('d');
const dot = async (stage: Locator, name: string) => centreOf(stage.locator(`circle[data-part="${name}"]`));

test.describe('publication and navigation', () => {
  test('the chapter exists with the right metadata, one h1, and a section outline', async ({ page }) => {
    await page.goto(PATH);
    await expect(page).toHaveTitle(/Functions as input/);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText('one');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /inverse functions/);
    const h2 = await page.locator('main h2').allTextContents();
    for (const heading of ['Intuition', 'Definition', 'Reading a rule as a pipeline', 'Domain: where the machine refuses', 'Domain, image and the inputs that give an output', 'Composition', 'Running a machine backwards', 'Worked examples', 'Executable reference code', 'Explore', 'Common mistakes', 'Numerical considerations', 'Connections', 'Exercises', 'Summary and checkpoints'])
      expect(h2.some(t => t.includes(heading)), heading).toBe(true);
    const levels = await page.locator('main :is(h1,h2,h3,h4)').evaluateAll(els => els.map(e => Number(e.tagName[1])));
    for (let i = 1; i < levels.length; i++) expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
  });
  test('it is reachable from the contents page and sits fifth in Part I', async ({ page }) => {
    expect(findChapter('I.5')!.chapter.status).toBe('available');
    await page.goto('contents/');
    await page.locator('a[href$="chapters/functions/"]').first().click();
    await expect(page).toHaveURL(/chapters\/functions\/$/);
    await expect(page.locator('.topbar a[aria-current="true"]')).toHaveAttribute('title', /Part I:/);
  });
  test('the pager links the previous and the next chapter in reading order', async ({ page }) => {
    await page.goto(PATH);
    const around = neighbours(findChapter('I.5')!);
    await expect(page.locator('nav.chapter-pager .pager-previous')).toContainText(`${around.previous!.id} · ${around.previous!.chapter.title}`);
    const next = page.locator('nav.chapter-pager .pager-next');
    await expect(next).toContainText(`${around.next!.id} · ${around.next!.chapter.title}`);
    if (around.next!.chapter.status === 'available') await expect(next).toHaveAttribute('href', new RegExp(`chapters/${around.next!.chapter.slug}/$`));
  });
  test('the cross-references go to the published chapters before it', async ({ page }) => {
    await page.goto(PATH);
    for (const slug of ['quantities', 'coordinates', 'algebra']) await expect(page.locator(`main a[href$="chapters/${slug}/"]`).first()).toBeVisible();
  });
  test('the algebra chapter now links forward to this one', async ({ page }) => {
    await page.goto('chapters/algebra/');
    await expect(page.locator('main a[href$="chapters/functions/"]').first()).toBeVisible();
  });
  test('no duplicate ids across islands, and the page does not overflow', async ({ page }) => {
    await page.goto(PATH);
    await page.locator('[data-stage="worked"][data-hydrated="true"]').waitFor();
    await page.locator('[data-exercise][data-hydrated="true"]').first().waitFor();
    const dupes = await page.evaluate(() => { const seen = new Map<string, number>(); document.querySelectorAll('[id]').forEach(e => seen.set(e.id, (seen.get(e.id) ?? 0) + 1)); return [...seen].filter(([, n]) => n > 1).map(([id]) => id); });
    expect(dupes).toEqual([]);
    expect(await noPageOverflow(page)).toBe(true);
  });
  test('all five stages hydrate', async ({ page }) => {
    await page.goto(PATH);
    for (const s of STAGES) {
      await page.locator(`[data-stage="${s}"]`).scrollIntoViewIfNeeded();
      await expect(page.locator(`[data-stage="${s}"]`)).toHaveAttribute('data-hydrated', 'true');
    }
  });
});

test.describe('mechanism A: the function as a machine (the hero stage)', () => {
  test('canonical state: (x − 2)² at 4 is 4; the boxes, the inspector and the table agree, and the point sits on the curve', async ({ page }) => {
    const stage = await open(page, 'function');
    await expect(stage).toHaveAttribute('data-rule', 'shift');
    await expect(stage).toHaveAttribute('data-a', '2');
    await expect(stage).toHaveAttribute('data-x', '4');
    await expect(stage).toHaveAttribute('data-defined', 'true');
    expect(await lines(stage, 'x')).toEqual(['= 4']);
    expect(await lines(stage, 'step-1')).toEqual(['= 2']);
    expect(await lines(stage, 'y')).toEqual(['= 4']);
    // three values and two operations in the pipeline: 4, then subtract 2, 2, then square, 4
    await expect(stage.locator('[data-pipeline="main"] .pipe-value')).toHaveCount(3);
    await expect(stage.locator('[data-pipeline="main"] .pipe-op')).toHaveCount(2);
    await expect(stage.locator('[data-pipeline="main"] .pipe-tag').first()).toHaveText('input x');
    await expect(stage.locator('[data-pipeline="main"] .pipe-tag').last()).toHaveText('output f(x)');
    await expect(stage.locator('[data-verdict]')).toContainText('exactly one output');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'true');
    // the table: seven fixed inputs and the current one, which is highlighted
    await expect(stage.locator('table.fn-table tbody tr')).toHaveCount(8);
    await expect(stage.locator('table.fn-table tr[data-current="true"]')).toHaveCount(1);
    // the handle is on the curve at the pixel of (4, 4) in the window [−8, 8]²
    await showPlane(stage);
    const h = await centreOf(stage.locator('.drag-point .ring'));
    const at = await pixel(stage, BIG, 4, 4);
    near(h.x, at.x);
    near(h.y, at.y);
  });
  test('two inputs, one output: x = 0 gives 4 as well, and the table still has exactly one current row', async ({ page }) => {
    const stage = await open(page, 'function');
    await preset(stage, 'p-same');
    await expect(stage).toHaveAttribute('data-x', '0');
    expect(await lines(stage, 'step-1')).toEqual(['= -2']);
    expect(await lines(stage, 'y')).toEqual(['= 4']);
    await expect(stage.locator('table.fn-table tr[data-current="true"]')).toHaveCount(1);
    await expect(stage.locator('table.fn-table tbody tr')).toHaveCount(7);
  });
  test('a refusing step: √(x + 3) at −4 stops at the root, the point drops to the x-axis and the verdict names the reason', async ({ page }) => {
    const stage = await open(page, 'function');
    await preset(stage, 'p-root-out');
    await expect(stage).toHaveAttribute('data-defined', 'false');
    await expect(stage.locator('[data-verdict]')).toContainText('cannot take the square root of');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
    await expect(stage.locator('[data-pipeline="main"] .pipe-value.is-refused')).toHaveCount(1);
    await expect(stage.locator('[data-quantity="y"]')).toHaveAttribute('data-status', 'undefined');
    await showPlane(stage);
    const h = await centreOf(stage.locator('.drag-point .ring'));
    const axis = await pixel(stage, BIG, -4, 0);
    near(h.x, axis.x);
    near(h.y, axis.y);
    await expect(stage.locator('.drag-point')).toHaveClass(/role-caution/);
  });
  test('1/(x − 2) at 2: the reciprocal of 0 is refused and the asymptote is drawn at x = 2', async ({ page }) => {
    const stage = await open(page, 'function');
    await preset(stage, 'p-pole');
    await expect(stage).toHaveAttribute('data-defined', 'false');
    await expect(stage.locator('[data-verdict]')).toContainText('take the reciprocal of');
    await expect(stage.locator('[data-part="asymptote"]')).toHaveCount(1);
  });
  test('typing an input moves the point and the pipeline: −2x² at 3 is −18', async ({ page }) => {
    const stage = await open(page, 'function');
    await preset(stage, 'p-stretch');
    expect(await lines(stage, 'step-1')).toEqual(['= 9']);
    expect(await lines(stage, 'y')).toEqual(['= -18']);
    // −18 is below the window: the marker waits at the lower border and the verdict says so
    await expect(stage.locator('[data-verdict]')).toContainText('off the edge');
    await enter(spin(stage, 1), '1.5');
    await expect(stage).toHaveAttribute('data-x', '1.5');
    expect(await lines(stage, 'step-1')).toEqual(['= 2.25']);
    expect(await lines(stage, 'y')).toEqual(['= -4.5']);
  });
  test('dragging the point changes only x, and the arrow keys move it by one grid step', async ({ page }) => {
    const stage = await open(page, 'function');
    await showPlane(stage);
    await dragTo(page, await centreOf(stage.locator('.drag-point .ring')), await pixel(stage, BIG, -1, 9));
    await expect(stage).toHaveAttribute('data-x', '-1');
    await expect(stage).toHaveAttribute('data-rule', 'shift');
    expect(await lines(stage, 'y')).toEqual(['= 9']);
    await stage.locator('.drag-point').focus();
    await page.keyboard.press('ArrowRight');
    await expect(stage).toHaveAttribute('data-x', '-0.5');
    await page.keyboard.press('Shift+ArrowRight');
    await expect(stage).toHaveAttribute('data-x', '2');
    // ArrowUp has no vertical axis to move along
    await page.keyboard.press('ArrowUp');
    await expect(stage).toHaveAttribute('data-x', '2');
  });
  test('sync contract: the curve does not change when x changes, and does when a or the rule changes', async ({ page }) => {
    const stage = await open(page, 'function');
    const before = await curve(stage);
    expect(before).toBeTruthy();
    await enter(spin(stage, 1), '-3');
    await enter(spin(stage, 1), '5.5');
    expect(await curve(stage)).toBe(before);
    await enter(spin(stage, 0), '3');
    const shifted = await curve(stage);
    expect(shifted).not.toBe(before);
    await choose(stage, 0, '|x − a|');
    expect(await curve(stage)).not.toBe(shifted);
  });
  test('changing the rule changes the pipeline: |x − a| has an absolute-value step', async ({ page }) => {
    const stage = await open(page, 'function');
    await choose(stage, 0, '|x − a|');
    await expect(stage).toHaveAttribute('data-rule', 'abs');
    await expect(stage.locator('[data-pipeline="main"] .pipe-words').last()).toContainText('absolute value');
    expect(await lines(stage, 'y')).toEqual(['= 2']);
  });
  test('Reset returns to the canonical machine', async ({ page }) => {
    const stage = await open(page, 'function');
    await preset(stage, 'p-root');
    await expect(stage).toHaveAttribute('data-rule', 'root');
    await stage.locator('[data-action="reset"]').click();
    await expect(stage).toHaveAttribute('data-rule', 'shift');
    await expect(stage).toHaveAttribute('data-x', '4');
  });
});

test.describe('mechanism B: which inputs give this output (domain, image, preimages)', () => {
  test('canonical: (x − 2)² = 4 has the two inputs 0 and 4 on the line, drawn at those pixels', async ({ page }) => {
    const stage = await open(page, 'height');
    await expect(stage).toHaveAttribute('data-count', '2');
    await expect(stage).toHaveAttribute('data-injective', 'false');
    await showPlane(stage);
    const one = await dot(stage, 'meet-1');
    const two = await dot(stage, 'meet-2');
    near(one.x, (await pixel(stage, BIG, 0, 4)).x);
    near(one.y, (await pixel(stage, BIG, 0, 4)).y);
    near(two.x, (await pixel(stage, BIG, 4, 4)).x);
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'true');
    const handle = await centreOf(stage.locator('.drag-point .ring'));
    near(handle.x, (await pixel(stage, BIG, 7, 4)).x);
    near(handle.y, (await pixel(stage, BIG, 7, 4)).y);
  });
  test('dragging the handle changes only h: down to 0 touches once, below 0 misses', async ({ page }) => {
    const stage = await open(page, 'height');
    await showPlane(stage);
    await dragTo(page, await centreOf(stage.locator('.drag-point .ring')), await pixel(stage, BIG, 7, 0));
    await expect(stage).toHaveAttribute('data-h', '0');
    await expect(stage).toHaveAttribute('data-count', '1');
    await expect(stage).toHaveAttribute('data-rule', 'shift');
    await stage.locator('.drag-point').focus();
    await page.keyboard.press('ArrowDown');
    await expect(stage).toHaveAttribute('data-h', '-0.5');
    await expect(stage).toHaveAttribute('data-count', '0');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
    await expect(stage.locator('circle[data-part="meet-1"]')).toHaveCount(0);
  });
  test('1/(x − 2) = 0 has no solution; 2x = 3 has exactly one, and a line is one-to-one and onto', async ({ page }) => {
    const stage = await open(page, 'height');
    await preset(stage, 'h-pole');
    await expect(stage).toHaveAttribute('data-count', '0');
    await expect(stage).toHaveAttribute('data-onto', 'false');
    await expect(stage.locator('[data-verdict]')).toContainText('never');
    await preset(stage, 'h-line');
    await expect(stage).toHaveAttribute('data-count', '1');
    await expect(stage).toHaveAttribute('data-injective', 'true');
    await expect(stage).toHaveAttribute('data-onto', 'true');
  });
  test('√(x + 3) = 2 has the exact input 1', async ({ page }) => {
    const stage = await open(page, 'height');
    await preset(stage, 'h-root');
    await expect(stage).toHaveAttribute('data-count', '1');
    const meet = await dot(stage, 'meet-1');
    near(meet.x, (await pixel(stage, BIG, 1, 2)).x);
    near(meet.y, (await pixel(stage, BIG, 1, 2)).y);
  });
  test('typing h: the solving lines and the inspector follow, and the image bar stops at the image', async ({ page }) => {
    const stage = await open(page, 'height');
    await enter(spin(stage, 1), '1');
    await expect(stage).toHaveAttribute('data-h', '1');
    await expect(stage).toHaveAttribute('data-count', '2');
    // (x − 2)² = 1: x = 1 and x = 3
    const one = await dot(stage, 'meet-1');
    near(one.x, (await pixel(stage, BIG, 1, 1)).x);
    near((await dot(stage, 'meet-2')).x, (await pixel(stage, BIG, 3, 1)).x);
    // the image of (x − 2)² starts at 0 with a filled end on the y-axis
    await expect(stage.locator('circle[data-part="image-end"]').first()).toHaveAttribute('data-filled', 'true');
  });
});

test.describe('mechanism C: composition, in both orders', () => {
  test('canonical: x² after 2x − 1 at 0 gives 1, the other order gives −1, and the dots sit at those heights', async ({ page }) => {
    const stage = await open(page, 'composition');
    await expect(stage).toHaveAttribute('data-f', 'sq');
    await expect(stage).toHaveAttribute('data-g', 'lin');
    await expect(stage).toHaveAttribute('data-fg-defined', 'true');
    await expect(stage).toHaveAttribute('data-gf-defined', 'true');
    await expect(stage).toHaveAttribute('data-same', 'false');
    await showPlane(stage);
    const fg = await dot(stage, 'point-fg');
    const gf = await dot(stage, 'point-gf');
    near(fg.y, (await pixel(stage, SMALL, 0, 1)).y);
    near(gf.y, (await pixel(stage, SMALL, 0, -1)).y);
    near(fg.x, (await pixel(stage, SMALL, 0, 1)).x);
    await expect(stage.locator('[data-pipeline="fg"] .pipe-value')).toHaveCount(4);
    await expect(stage.locator('[data-pipeline="gf"] .pipe-value')).toHaveCount(4);
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
  });
  test('the order matters at 1 only by accident: both give 1', async ({ page }) => {
    const stage = await open(page, 'composition');
    await preset(stage, 'c-agree');
    await expect(stage).toHaveAttribute('data-x', '1');
    await expect(stage).toHaveAttribute('data-same', 'true');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'true');
  });
  test('√x after 2x − 1 at 0 is refused while the other order answers; the boxes after the refusal are "not reached"', async ({ page }) => {
    const stage = await open(page, 'composition');
    await preset(stage, 'c-refuse');
    await expect(stage).toHaveAttribute('data-fg-defined', 'false');
    await expect(stage).toHaveAttribute('data-gf-defined', 'true');
    await expect(stage.locator('[data-pipeline="fg"] .pipe-value.is-refused')).toHaveCount(1);
    await expect(stage.locator('[data-pipeline="gf"] .pipe-value.is-refused')).toHaveCount(0);
    await expect(stage.locator('[data-domain="fg"]')).toContainText('∞');
    await expect(stage.locator('circle[data-part="point-fg"]')).toHaveCount(0);
    await expect(stage.locator('circle[data-part="point-gf"]')).toHaveCount(1);
    // √x after √x at −1: the inner root refuses, so the outer box is never reached
    await choose(stage, 0, '√x');
    await choose(stage, 1, '√x');
    await enter(spin(stage, 0), '-1');
    await expect(stage.locator('[data-pipeline="fg"] .pipe-value.is-skipped')).toHaveCount(1);
    await expect(stage.locator('[data-pipeline="fg"] .pipe-value.is-skipped')).toContainText('not reached');
  });
  test('beyond the top of the graph no dot is drawn and the stage says so', async ({ page }) => {
    const stage = await open(page, 'composition');
    await enter(spin(stage, 0), '3');
    await expect(stage).toHaveAttribute('data-x', '3');
    await expect(stage.locator('circle[data-part="point-fg"]')).toHaveCount(0);
    await expect(stage.locator('[data-offgraph]')).toBeVisible();
    expect(await lines(stage, 'fg')).toContain('= 25');
    expect(await lines(stage, 'gf')).toContain('= 17');
  });
  test('sync contract: the curves do not change when x changes, and do when f changes', async ({ page }) => {
    const stage = await open(page, 'composition');
    const before = await curve(stage, 'curve-fg');
    await enter(spin(stage, 0), '-2');
    await enter(spin(stage, 0), '2.5');
    expect(await curve(stage, 'curve-fg')).toBe(before);
    await choose(stage, 0, '1/x');
    expect(await curve(stage, 'curve-fg')).not.toBe(before);
  });
  test('2x − 1 after √x at 3 is not a rational number, and 1/x after 1/x is the identity', async ({ page }) => {
    const stage = await open(page, 'composition');
    await preset(stage, 'c-radical');
    await expect(stage.locator('[data-pipeline="fg"] .pipe-value').last()).toHaveAttribute('data-kind', 'exact');
    await preset(stage, 'c-undo');
    await expect(stage).toHaveAttribute('data-same', 'true');
    expect(await lines(stage, 'fg')).toContain('= 4');
  });
});

test.describe('mechanism D: the inverse', () => {
  test('canonical: 2x − 1 at 3 is 5, the inverse returns 3, and the dot and its mirror sit at (3, 5) and (5, 3)', async ({ page }) => {
    const stage = await open(page, 'inverse');
    await expect(stage).toHaveAttribute('data-fn', 'lin');
    await expect(stage).toHaveAttribute('data-has-inverse', 'true');
    await expect(stage).toHaveAttribute('data-in-domain', 'true');
    await showPlane(stage);
    const p = await dot(stage, 'point');
    const m = await dot(stage, 'point-mirror');
    near(p.x, (await pixel(stage, SMALL, 3, 5)).x);
    near(p.y, (await pixel(stage, SMALL, 3, 5)).y);
    near(m.x, (await pixel(stage, SMALL, 5, 3)).x);
    near(m.y, (await pixel(stage, SMALL, 5, 3)).y);
    expect(await lines(stage, 'y')).toEqual(['= 5']);
    expect(await lines(stage, 'back')).toEqual(['= 3']);
    await expect(stage.locator('[data-pipeline="backward"] .pipe-value')).toHaveCount(3);
    await expect(stage.locator('[data-verdict]')).toContainText('exactly');
  });
  test('x² on all of R has no inverse: 2 and −2 share the output 4; restricting to x ≥ 0 gives one', async ({ page }) => {
    const stage = await open(page, 'inverse');
    await preset(stage, 'i-sq');
    await expect(stage).toHaveAttribute('data-has-inverse', 'false');
    await expect(stage.locator('[data-verdict]')).toContainText('no inverse');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
    await expect(stage.locator('[data-pipeline="backward-none"]')).toBeVisible();
    await showPlane(stage);
    const twin = await dot(stage, 'point-twin');
    near(twin.x, (await pixel(stage, SMALL, -2, 4)).x);
    near(twin.y, (await pixel(stage, SMALL, -2, 4)).y);
    await choose(stage, 1, 'only x ≥ 0');
    await expect(stage).toHaveAttribute('data-restrict', 'true');
    await expect(stage).toHaveAttribute('data-has-inverse', 'true');
    await expect(stage.locator('circle[data-part="point-twin"]')).toHaveCount(0);
    expect(await lines(stage, 'back')).toEqual(['= 2']);
  });
  test('the restricted square refuses −2 and no point is drawn; the mirror curve is dashed when there is no inverse and solid when there is', async ({ page }) => {
    const stage = await open(page, 'inverse');
    await preset(stage, 'i-sq');
    await expect(stage.locator('path[data-part="curve-mirror"]')).toHaveCount(1);
    await expect(stage.locator('path[data-part="curve-mirror"]')).toHaveClass(/\bdashed\b/);
    await preset(stage, 'i-sq-r');
    await expect(stage.locator('path[data-part="curve-mirror"]')).not.toHaveClass(/\bdashed\b/);
    await preset(stage, 'i-sq-out');
    await expect(stage).toHaveAttribute('data-in-domain', 'false');
    await expect(stage.locator('circle[data-part="point"]')).toHaveCount(0);
    await expect(stage.locator('[data-verdict]')).toContainText('not in the domain');
  });
  test('√x at 4 is undone by squaring, and 1/x is its own inverse', async ({ page }) => {
    const stage = await open(page, 'inverse');
    await preset(stage, 'i-rt');
    expect(await lines(stage, 'y')).toEqual(['= 2']);
    expect(await lines(stage, 'back')).toEqual(['= 4']);
    await preset(stage, 'i-rec');
    expect(await lines(stage, 'y')).toEqual(['= 0.5']);
    expect(await lines(stage, 'back')).toEqual(['= 2']);
  });
  test('the restriction control appears only for x²', async ({ page }) => {
    const stage = await open(page, 'inverse');
    await expect(stage.locator('fieldset.segmented')).toHaveCount(1);
    await choose(stage, 0, 'x²');
    await expect(stage.locator('fieldset.segmented')).toHaveCount(2);
  });
  test('sync contract: the curves do not change when x changes, and do when the restriction changes', async ({ page }) => {
    const stage = await open(page, 'inverse');
    await choose(stage, 0, 'x²');
    await choose(stage, 1, 'every real x');
    const before = await curve(stage, 'curve-forward');
    await enter(spin(stage, 0), '-1.5');
    expect(await curve(stage, 'curve-forward')).toBe(before);
    await choose(stage, 1, 'only x ≥ 0');
    expect(await curve(stage, 'curve-forward')).not.toBe(before);
  });
});

test.describe('mechanism E: worked examples', () => {
  const walk = async (stage: Locator) => {
    const captions: string[] = [];
    for (let i = 0; i < 30 && (await stage.getByRole('button', { name: /Next/ }).isEnabled()); i++) {
      await stage.getByRole('button', { name: /Next/ }).click();
      captions.push((await stage.locator('.trace-caption').textContent())!);
    }
    return captions;
  };
  test('evaluate (x − 2)² at −1: subtract, square, and the output is shared by a second input', async ({ page }) => {
    const stage = await open(page, 'worked');
    await expect(stage).toHaveAttribute('data-example', 'evaluate');
    const captions = await walk(stage);
    expect(captions).toHaveLength(4);
    expect(captions[0]).toContain('brackets');
    expect(captions[3]).toContain('Two inputs may share an output');
    expect(captions[3]).toContain('9');
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
    expect(await lastOf('domain')).toContain('At x = −4 the machine refuses');
    expect(await lastOf('image')).toContain('−8');
    expect(await lastOf('compose')).toContain('1/2');
    expect(await lastOf('inverse')).toContain('Restricted to x ≥ 0 it has an inverse');
  });
  test('going back selects an earlier step and changes nothing else', async ({ page }) => {
    const stage = await open(page, 'worked');
    await walk(stage);
    await stage.getByRole('button', { name: /Previous/ }).click();
    await expect(stage.locator('.trace-caption')).toContainText('Second step');
  });
});

test.describe('exercises', () => {
  const ex = async (page: Page, id: string) => { await page.goto(PATH); const e = page.locator(`[data-exercise="${id}"]`); await e.scrollIntoViewIfNeeded(); await expect(e).toHaveAttribute('data-hydrated', 'true'); return e; };
  const check = (e: Locator) => e.locator('[data-action="check"]').click();
  test('all ten exercises are present and hydrate', async ({ page }) => {
    await page.goto(PATH);
    const ids = ['evaluate-shift', 'shift-direction', 'root-domain', 'pole-domain', 'stretch-image', 'preimage-nine', 'composition-order', 'composite-domain', 'construct-output', 'square-inverse'];
    for (const id of ids) {
      const e = page.locator(`[data-exercise="${id}"]`);
      await e.scrollIntoViewIfNeeded();
      await expect(e, id).toHaveAttribute('data-hydrated', 'true');
    }
    await expect(page.locator('[data-exercise]')).toHaveCount(ids.length);
  });
  test('a calculation: the slips on (x − 3)² at −1 are each named, then 16 is confirmed', async ({ page }) => {
    const e = await ex(page, 'evaluate-shift');
    const answer = async (v: string) => { await e.locator('[data-field="y"]').fill(v); await check(e); };
    await answer('-4');
    await expect(e.locator('[data-feedback]')).toContainText('second step');
    await answer('4');
    await expect(e.locator('[data-feedback]')).toContainText('instead of having 3 subtracted');
    await answer('-8');
    await expect(e.locator('[data-feedback]')).toContainText('separately');
    await answer('abc');
    await expect(e).toHaveAttribute('data-result', 'incorrect');
    await answer('16');
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('a prediction: which way the graph moves, with the sign trap named', async ({ page }) => {
    const e = await ex(page, 'shift-direction');
    await e.getByLabel('left by 2', { exact: true }).check();
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('RIGHT');
    await e.getByLabel('right by 2', { exact: true }).check();
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('domains: the edge of a square root belongs, the pole is only one point', async ({ page }) => {
    const root = await ex(page, 'root-domain');
    await root.getByLabel('x > −3', { exact: true }).check();
    await check(root);
    await expect(root.locator('[data-feedback]')).toContainText('edge is included');
    await root.getByLabel('x ≥ −3', { exact: true }).check();
    await check(root);
    await expect(root).toHaveAttribute('data-result', 'correct');
    const pole = page.locator('[data-exercise="pole-domain"]');
    await pole.scrollIntoViewIfNeeded();
    await pole.getByLabel('every real number', { exact: true }).check();
    await check(pole);
    await expect(pole.locator('[data-feedback]')).toContainText('1/0');
    await pole.getByLabel('every real number except 2', { exact: true }).check();
    await check(pole);
    await expect(pole).toHaveAttribute('data-result', 'correct');
  });
  test('two inputs: −1 and 5 give 9, and giving only 5 is named', async ({ page }) => {
    const e = await ex(page, 'preimage-nine');
    const answer = async (small: string, large: string) => { await e.locator('[data-field="small"]').fill(small); await e.locator('[data-field="large"]').fill(large); await check(e); };
    await answer('5', '5');
    await expect(e.locator('[data-feedback]')).toContainText('negative root');
    await answer('5', '-1');
    await expect(e.locator('[data-feedback]')).toContainText('wrong boxes');
    await answer('-1', '5');
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('composition order: 17 is named as the other order, 25 is accepted', async ({ page }) => {
    const e = await ex(page, 'composition-order');
    await e.locator('[data-field="y"]').fill('17');
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('INNER');
    await e.locator('[data-field="y"]').fill('25');
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('a construction: either a = −3 or a = 5 gives f(1) = 16', async ({ page }) => {
    const e = await ex(page, 'construct-output');
    await e.locator('[data-field="a"]').fill('3');
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('f(1) is 4');
    await e.locator('[data-field="a"]').fill('-3');
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'correct');
    await e.locator('[data-field="a"]').fill('5');
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('an explanation: why x² has no inverse on all of R', async ({ page }) => {
    const e = await ex(page, 'square-inverse');
    await e.getByLabel('x² is not a function', { exact: true }).check();
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('BACKWARD');
    await e.getByLabel(/two different inputs, such as 3 and −3/).check();
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('the worked solution appears only after an attempt, and Reset clears it; feedback is polite', async ({ page }) => {
    const e = await ex(page, 'evaluate-shift');
    await expect(e.locator('[data-action="show-solution"]')).toHaveCount(0);
    await e.locator('[data-field="y"]').fill('0');
    await check(e);
    await e.locator('[data-action="show-solution"]').click();
    await expect(e.locator('[data-solution]')).toContainText('Subtract first');
    await e.locator('[data-action="reset-exercise"]').click();
    await expect(e).toHaveAttribute('data-result', 'none');
    await expect(e.locator('[data-solution]')).toHaveCount(0);
    await expect(e.locator('.feedback')).toHaveAttribute('aria-live', 'polite');
  });
});

test.describe('code and tables', () => {
  test('the three reference files are shown, and the computed table flags every row where the double is not the exact value', async ({ page }) => {
    await page.goto(PATH);
    for (const f of ['functions_basic.py', 'functions_domain.py', 'functions_params.py']) await expect(page.locator('.code-file .file', { hasText: f })).toHaveCount(1);
    const rows = page.locator('[data-table="exact-vs-double"] tbody tr');
    await expect(rows).toHaveCount(11);
    const text = await rows.allTextContents();
    expect(text[0]).toContain('2.0000000000000004');
    expect(text[4]).toContain('49.00000000000001');
    expect(text[9]).toContain('1125899906842624');
    expect(text[10]).toContain('ZeroDivisionError');
    const agree = await rows.evaluateAll(els => els.map(e => e.getAttribute('data-agree')));
    expect(agree.every(a => a === 'false')).toBe(true);
  });
});

test.describe('layout', () => {
  test('on a phone width: no page overflow, every stage hydrates, the planes, pipelines and number lines fit', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PATH);
    for (const s of STAGES) {
      await page.locator(`[data-stage="${s}"]`).scrollIntoViewIfNeeded();
      await expect(page.locator(`[data-stage="${s}"]`)).toHaveAttribute('data-hydrated', 'true');
    }
    expect(await noPageOverflow(page)).toBe(true);
    for (const s of ['function', 'height', 'composition', 'inverse']) {
      const box = (await page.locator(`[data-stage="${s}"] svg.plane`).boundingBox())!;
      expect(box.x, s).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, s).toBeLessThanOrEqual(390.5);
    }
    const inside = await page.locator('.pipeline, .setline, .fn-table').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return r.left >= -0.5 && r.right <= window.innerWidth + 0.5; }));
    expect(inside.length).toBeGreaterThan(5);
    expect(inside.every(Boolean)).toBe(true);
    // the choice of rule stays inside the stage and each segment is a 44 px target
    const stage = page.locator('[data-stage="function"]');
    const fits = await stage.locator('.stage-controls .segments').evaluate(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; });
    expect(fits).toBe(true);
    for (const h of await stage.locator('label.segment span').evaluateAll(els => els.map(e => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(43.5);
  });
  test('dragging works on a phone: the handle lands on the pixel of x = −1 and the output is 9', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const stage = await open(page, 'function');
    await showPlane(stage);
    await dragTo(page, await centreOf(stage.locator('.drag-point .ring')), await pixel(stage, BIG, -1, 9));
    await expect(stage).toHaveAttribute('data-x', '-1');
    expect(await lines(stage, 'y')).toEqual(['= 9']);
  });
});
