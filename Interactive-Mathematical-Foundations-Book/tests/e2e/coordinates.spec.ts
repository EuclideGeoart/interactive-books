/**
 * The Coordinates chapter (I.2): publication, navigation, and every stage — each checked from the DOM and from pixels computed here
 * by hand (the world windows below are written out in this file, never read from the application's viewport code), and the
 * exercises through their visible feedback.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { findChapter, neighbours } from '../../src/curriculum/queries';
import { noPageOverflow } from './helpers';

const PATH = 'chapters/coordinates/';
/** The point and segment planes show [−7.5, 7.5] on both axes. */
const SQUARE = { xMin: -7.5, xMax: 7.5, yMin: -7.5, yMax: 7.5 };
type Window = typeof SQUARE;

async function open(page: Page, name: string): Promise<Locator> {
  await page.goto(PATH);
  const stage = page.locator(`[data-stage="${name}"]`);
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute('data-hydrated', 'true');
  await page.evaluate(() => document.fonts.ready);
  return stage;
}
const norm = (s: string) => s.replace(/\u2212/g, '-').replace(/\s+/g, ' ').trim();
const lines = (stage: Locator, id: string) =>
  stage.locator(`[data-quantity="${id}"] dd .line`).evaluateAll(els => els.map(e => `${e.querySelector('.rel')?.textContent ?? ''} ${e.querySelector('.val')?.textContent ?? ''}`.replace(/\u2212/g, '-').replace(/\s+/g, ' ').trim()));
const spin = (stage: Locator, index: number) => stage.locator('input[role="spinbutton"]').nth(index);
async function enter(field: Locator, text: string) {
  await field.fill(text);
  await field.press('Enter');
}
/** Page pixels of a world point on a square plane showing `win`: one scale for both axes, the window centred in the plane. */
async function pixel(stage: Locator, win: Window, x: number, y: number) {
  const box = (await stage.locator('svg.plane').boundingBox())!;
  const scale = Math.min(box.width / (win.xMax - win.xMin), box.height / (win.yMax - win.yMin));
  const left = box.x + (box.width - (win.xMax - win.xMin) * scale) / 2;
  const top = box.y + (box.height - (win.yMax - win.yMin) * scale) / 2;
  return { x: left + (x - win.xMin) * scale, y: top + (win.yMax - y) * scale, scale };
}
/** The number line shows x in [−8, 8]; the axis is 42 % of the way down the plane. */
async function linePixel(stage: Locator, x: number) {
  const box = (await stage.locator('svg.plane').boundingBox())!;
  const scale = box.width / 16;
  return { x: box.x + (x + 8) * scale, y: box.y + 0.42 * box.height, scale };
}
async function handleCentre(stage: Locator, index = 0) {
  const b = (await stage.locator('.drag-point .ring').nth(index).boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
async function dragTo(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}
const showPlane = (stage: Locator) => stage.locator('svg.plane').evaluate(e => e.scrollIntoView({ block: 'center' }));
const choose = (stage: Locator, label: string) => stage.locator('label.segment', { hasText: new RegExp(`^${label}$`) }).click();
const near = (actual: number, expected: number, tolerance = 1.5) => expect(Math.abs(actual - expected), `${actual} vs ${expected}`).toBeLessThan(tolerance);
const points = async (el: Locator) => (await el.getAttribute('points'))!.trim().split(/\s+/).map(p => p.split(',').map(Number) as [number, number]);
const lineEnds = async (el: Locator) => ({ x1: Number(await el.getAttribute('x1')), y1: Number(await el.getAttribute('y1')), x2: Number(await el.getAttribute('x2')), y2: Number(await el.getAttribute('y2')) });

test.describe('publication and navigation', () => {
  test('the chapter exists with the right metadata, one h1, and a section outline', async ({ page }) => {
    await page.goto(PATH);
    await expect(page).toHaveTitle(/Coordinates and points/);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText('pin down');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /quadrants/);
    const h2 = await page.locator('main h2').allTextContents();
    for (const heading of ['Intuition', 'Definition', 'The number line', 'The plane', 'The distance formula is Pythagoras', 'Screen rows', 'Worked examples', 'Executable reference code', 'Explore', 'Common mistakes', 'Numerical considerations', 'Connections', 'Exercises', 'Summary and checkpoints'])
      expect(h2.some(t => t.includes(heading)), heading).toBe(true);
    const levels = await page.locator('main :is(h1,h2,h3,h4)').evaluateAll(els => els.map(e => Number(e.tagName[1])));
    for (let i = 1; i < levels.length; i++) expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
  });
  test('it is reachable from the contents page and sits second in Part I', async ({ page }) => {
    expect(findChapter('I.2')!.chapter.status).toBe('available');
    await page.goto('contents/');
    await page.locator('a[href$="chapters/coordinates/"]').first().click();
    await expect(page).toHaveURL(/chapters\/coordinates\/$/);
    await expect(page.locator('.topbar a[aria-current="true"]')).toHaveAttribute('title', /Part I:/);
  });
  test('the pager links the previous and the next chapter in reading order', async ({ page }) => {
    await page.goto(PATH);
    const around = neighbours(findChapter('I.2')!);
    await expect(page.locator('nav.chapter-pager .pager-previous')).toContainText(`${around.previous!.id} · ${around.previous!.chapter.title}`);
    const next = page.locator('nav.chapter-pager .pager-next');
    await expect(next).toContainText(`${around.next!.id} · ${around.next!.chapter.title}`);
    if (around.next!.chapter.status === 'available') await expect(next).toHaveAttribute('href', new RegExp(`chapters/${around.next!.chapter.slug}/$`));
  });
  test('the cross-references go to the published chapters on both sides', async ({ page }) => {
    await page.goto(PATH);
    await expect(page.locator('main a[href$="chapters/quantities/"]').first()).toBeVisible();
    await expect(page.locator('main a[href$="chapters/vectors/"]').first()).toBeVisible();
    await page.goto('chapters/quantities/');
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
  test('all five stages hydrate', async ({ page }) => {
    await page.goto(PATH);
    for (const s of ['point', 'line', 'segment', 'pixel', 'worked']) {
      await page.locator(`[data-stage="${s}"]`).scrollIntoViewIfNeeded();
      await expect(page.locator(`[data-stage="${s}"]`)).toHaveAttribute('data-hydrated', 'true');
    }
  });
});

test.describe('mechanism A — a point, its quadrant and its distances (the hero stage)', () => {
  test('canonical state: (−3, 2) in quadrant II, distances 3 and 2, √13 from the origin; the drawing agrees with the arithmetic', async ({ page }) => {
    const stage = await open(page, 'point');
    await showPlane(stage);
    await expect(stage).toHaveAttribute('data-x', '-3');
    await expect(stage).toHaveAttribute('data-y', '2');
    await expect(stage).toHaveAttribute('data-quadrant', '2');
    expect(await lines(stage, 'x')).toEqual(['= -3']);
    expect(await lines(stage, 'y')).toEqual(['= 2']);
    expect(await lines(stage, 'quadrant')).toEqual(['= II']);
    expect(await lines(stage, 'dist-y-axis')).toEqual(['= 3']);
    expect(await lines(stage, 'dist-x-axis')).toEqual(['= 2']);
    expect(await lines(stage, 'origin')).toEqual(['= √13', '≈ 3.605551…']);
    // the handle is on the pixel of (−3, 2)
    const at = await pixel(stage, SQUARE, -3, 2);
    const h = await handleCentre(stage);
    near(h.x, at.x);
    near(h.y, at.y);
    // the shaded region is exactly the quadrant II rectangle (0,0) (−7.5,0) (−7.5,7.5) (0,7.5)
    const zero = await pixel(stage, SQUARE, 0, 0);
    const corner = await pixel(stage, SQUARE, -7.5, 7.5);
    const svg = (await stage.locator('svg.plane').boundingBox())!;
    const poly = await points(stage.locator('[data-part="quadrant"]'));
    const expected = [[0, 0], [-7.5, 0], [-7.5, 7.5], [0, 7.5]].map(([x, y]) => [zero.x + x! * zero.scale - svg.x, zero.y - y! * zero.scale - svg.y]);
    expect(poly).toHaveLength(4);
    poly.forEach((p, i) => { near(p[0], expected[i]![0]!, 0.6); near(p[1], expected[i]![1]!, 0.6); });
    near(corner.x, svg.x + poly[1]![0], 0.6);
    // the legs: |y| runs straight down to the x-axis, |x| straight across to the y-axis
    const toX = await lineEnds(stage.locator('[data-part="to-x-axis"]'));
    near(toX.x1, at.x - svg.x, 0.6); near(toX.y1, at.y - svg.y, 0.6); near(toX.x2, at.x - svg.x, 0.6); near(toX.y2, zero.y - svg.y, 0.6);
    const toY = await lineEnds(stage.locator('[data-part="to-y-axis"]'));
    near(toY.x1, at.x - svg.x, 0.6); near(toY.y1, at.y - svg.y, 0.6); near(toY.x2, zero.x - svg.x, 0.6); near(toY.y2, at.y - svg.y, 0.6);
    await expect(stage.locator('[data-verdict]')).toContainText('OTHER axis');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'true');
  });
  test('dragging into quadrant IV changes the signs, the distances and the shaded region', async ({ page }) => {
    const stage = await open(page, 'point');
    await showPlane(stage);
    await dragTo(page, await handleCentre(stage), await pixel(stage, SQUARE, 4, -5));
    await expect(stage).toHaveAttribute('data-x', '4');
    await expect(stage).toHaveAttribute('data-y', '-5');
    await expect(stage).toHaveAttribute('data-quadrant', '4');
    expect(await lines(stage, 'quadrant')).toEqual(['= IV']);
    expect(await lines(stage, 'dist-y-axis')).toEqual(['= 4']);
    expect(await lines(stage, 'dist-x-axis')).toEqual(['= 5']);
    expect(await lines(stage, 'origin')).toEqual(['= √41', '≈ 6.403124…']);
    const at = await pixel(stage, SQUARE, 4, -5);
    const h = await handleCentre(stage);
    near(h.x, at.x);
    near(h.y, at.y);
    await expect(stage.locator('[data-part="quadrant"]')).toHaveCount(1);
  });
  test('the quadrant is decided by signs alone: (−0.1, 7) is still quadrant II', async ({ page }) => {
    const stage = await open(page, 'point');
    await enter(spin(stage, 0), '-0.1');
    await enter(spin(stage, 1), '7');
    await expect(stage).toHaveAttribute('data-quadrant', '2');
    expect(await lines(stage, 'dist-y-axis')).toEqual(['= 0.1']);
    expect(await lines(stage, 'dist-x-axis')).toEqual(['= 7']);
  });
  test('an axis point is in no quadrant, and says why; the origin is on both axes', async ({ page }) => {
    const stage = await open(page, 'point');
    await enter(spin(stage, 0), '0');
    await expect(stage).toHaveAttribute('data-quadrant', 'axis-y');
    expect(await lines(stage, 'quadrant')).toEqual(['= none (on the y-axis)']);
    expect(await lines(stage, 'dist-y-axis')).toEqual(['= 0']);
    expect(await lines(stage, 'dist-x-axis')).toEqual(['= 2']);
    await expect(stage.locator('[data-part="quadrant"]')).toHaveCount(0);
    await expect(stage.locator('[data-part="to-y-axis"]')).toHaveCount(0);
    await expect(stage.locator('[data-verdict]')).toContainText('belongs to neither');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
    await enter(spin(stage, 1), '0');
    await expect(stage).toHaveAttribute('data-quadrant', 'origin');
    expect(await lines(stage, 'quadrant')).toEqual(['= none (at the origin)']);
    await expect(stage.locator('[data-part="radius"]')).toHaveCount(0);
    await expect(stage.locator('[data-verdict]')).toContainText('both axes at once');
    await stage.locator('[data-preset="p5-0"]').click();
    await expect(stage).toHaveAttribute('data-quadrant', 'axis-x');
    await expect(stage.locator('[data-verdict]')).toContainText('I and IV');
  });
  test('arrow keys move one grid step (Shift: five), the snap choice changes the step, and the point stops at the window edge', async ({ page }) => {
    const stage = await open(page, 'point');
    await stage.locator('[data-handle]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(stage).toHaveAttribute('data-x', '-2');
    await page.keyboard.press('Shift+ArrowUp');
    await expect(stage).toHaveAttribute('data-y', '7');
    await page.keyboard.press('ArrowUp');
    await expect(stage).toHaveAttribute('data-y', '7');
    await choose(stage, '½');
    await stage.locator('[data-handle]').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(stage).toHaveAttribute('data-x', '-2.5');
    await expect(stage.locator('[data-announcement]')).toContainText('comma');
  });
  test('typed values: out-of-range and over-precise entries are rejected, valid ones are exact', async ({ page }) => {
    const stage = await open(page, 'point');
    await enter(spin(stage, 0), '9');
    await expect(stage).toHaveAttribute('data-x', '-3');
    await enter(spin(stage, 0), '1.234');
    await expect(stage).toHaveAttribute('data-x', '-3');
    await enter(spin(stage, 0), '0.1');
    await enter(spin(stage, 1), '0.7');
    expect(await lines(stage, 'dist-y-axis')).toEqual(['= 0.1']);
    expect(await lines(stage, 'dist-x-axis')).toEqual(['= 0.7']);
    // 0.1² + 0.7² is exactly 1/2, so the distance to the origin is √(1/2) = √2 / 2, not a rounded double
    const origin = await lines(stage, 'origin');
    expect(origin[0]).toMatch(/^= /);
    expect(origin.join(' ')).toContain('√2/2');
  });
  test('the presets visit the 3-4-5 point and reset restores the canonical point', async ({ page }) => {
    const stage = await open(page, 'point');
    await stage.locator('[data-preset="p3-4"]').click();
    expect(await lines(stage, 'origin')).toEqual(['= 5']);
    await stage.locator('[data-action="reset"]').click();
    await expect(stage).toHaveAttribute('data-x', '-3');
    await expect(stage).toHaveAttribute('data-y', '2');
  });
});

test.describe('mechanism B — two points on a number line', () => {
  test('canonical state: a = −3, b = 5; b − a = 8, a − b = −8, |b − a| = 8, midpoint 1', async ({ page }) => {
    const stage = await open(page, 'line');
    await showPlane(stage);
    expect(await lines(stage, 'forward')).toEqual(['= 8']);
    expect(await lines(stage, 'backward')).toEqual(['= -8']);
    expect(await lines(stage, 'distance')).toEqual(['= 8']);
    expect(await lines(stage, 'midpoint')).toEqual(['= 1']);
    expect(await lines(stage, 'via-zero')).toEqual(['= 8']);
    const a = await linePixel(stage, -3);
    const b = await linePixel(stage, 5);
    const ha = await handleCentre(stage, 0);
    const hb = await handleCentre(stage, 1);
    near(ha.x, a.x); near(ha.y, a.y);
    near(hb.x, b.x); near(hb.y, b.y);
    // the signed arrow runs from a to b, below the line
    const arrow = stage.locator('[data-part="signed-step"]').first();
    await expect(arrow).toBeAttached();
    await expect(stage.locator('[data-part="step-label"]')).toContainText('b − a = 8');
    await expect(stage.locator('[data-part="distance"]').first()).toBeAttached();
  });
  test('dragging a past b reverses the arrow: the signed step changes sign, the distance does not', async ({ page }) => {
    const stage = await open(page, 'line');
    await showPlane(stage);
    await dragTo(page, await handleCentre(stage, 0), await linePixel(stage, 7));
    await expect(stage).toHaveAttribute('data-a', '7');
    await expect(stage).toHaveAttribute('data-order', 'a-right');
    expect(await lines(stage, 'forward')).toEqual(['= -2']);
    expect(await lines(stage, 'distance')).toEqual(['= 2']);
    expect(await lines(stage, 'via-zero')).toEqual(['= 12']);
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
    await expect(stage.locator('[data-verdict]')).toContainText('same side');
  });
  test('arrow keys, typed values, and the midpoint at a half', async ({ page }) => {
    const stage = await open(page, 'line');
    await stage.locator('[data-handle]').first().focus();
    await page.keyboard.press('ArrowLeft');
    await expect(stage).toHaveAttribute('data-a', '-4');
    expect(await lines(stage, 'forward')).toEqual(['= 9']);
    await enter(spin(stage, 1), '2');
    expect(await lines(stage, 'midpoint')).toEqual(['= -1']);
    await enter(spin(stage, 0), '-3');
    await enter(spin(stage, 1), '0.5');
    expect(await lines(stage, 'midpoint')).toEqual(['= -1.25']);
  });
  test('a = b: no step, distance 0, and the point just moved lets go so the other one can be pulled away', async ({ page }) => {
    const stage = await open(page, 'line');
    await showPlane(stage);
    await enter(spin(stage, 0), '5');
    await expect(stage).toHaveAttribute('data-order', 'same');
    expect(await lines(stage, 'forward')).toEqual(['= 0']);
    expect(await lines(stage, 'distance')).toEqual(['= 0']);
    await expect(stage.locator('[data-part="step-label"]')).toHaveCount(0);
    await expect(stage.locator('g.behind')).toHaveCount(1);
    // b is on top of a: pulling at the shared pixel moves b, because a was the one just changed
    await showPlane(stage);
    await dragTo(page, await linePixel(stage, 5), await linePixel(stage, 2));
    await expect(stage).toHaveAttribute('data-a', '5');
    await expect(stage).toHaveAttribute('data-b', '2');
    await expect(stage.locator('g.behind')).toHaveCount(0);
  });
  test('the presets include the opposite direction and the same-side warning', async ({ page }) => {
    const stage = await open(page, 'line');
    await stage.locator('[data-preset="l5-3"]').click();
    expect(await lines(stage, 'forward')).toEqual(['= -8']);
    expect(await lines(stage, 'distance')).toEqual(['= 8']);
    await stage.locator('[data-preset="l2-7"]').click();
    expect(await lines(stage, 'via-zero')).toEqual(['= 9']);
    expect(await lines(stage, 'distance')).toEqual(['= 5']);
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
  });
});

test.describe('mechanism C — two points in the plane: displacement, distance, midpoint', () => {
  test('canonical state: A = (−3, 1), B = (3, −3); displacement (6, −4), distance 2√13, midpoint (0, −1), taxicab 10; the drawing agrees', async ({ page }) => {
    const stage = await open(page, 'segment');
    await showPlane(stage);
    await expect(stage).toHaveAttribute('data-kind', 'oblique');
    expect(await lines(stage, 'displacement')).toEqual(['= (6, -4)']);
    expect(await lines(stage, 'reverse')).toEqual(['= (-6, 4)']);
    expect(await lines(stage, 'distance')).toEqual(['= 2√13', '≈ 7.211103…']);
    expect(await lines(stage, 'midpoint')).toEqual(['= (0, -1)']);
    expect(await lines(stage, 'taxicab')).toEqual(['= 10']);
    const a = await pixel(stage, SQUARE, -3, 1);
    const b = await pixel(stage, SQUARE, 3, -3);
    const ha = await handleCentre(stage, 0);
    const hb = await handleCentre(stage, 1);
    near(ha.x, a.x); near(ha.y, a.y); near(hb.x, b.x); near(hb.y, b.y);
    // the corner of the right triangle is (xB, yA) = (3, 1): the legs meet there
    const svg = (await stage.locator('svg.plane').boundingBox())!;
    const corner = await pixel(stage, SQUARE, 3, 1);
    const legX = await lineEnds(stage.locator('[data-part="leg-x"]'));
    near(legX.x1, a.x - svg.x, 0.6); near(legX.y1, a.y - svg.y, 0.6); near(legX.x2, corner.x - svg.x, 0.6); near(legX.y2, corner.y - svg.y, 0.6);
    const legY = await lineEnds(stage.locator('[data-part="leg-y"]'));
    near(legY.x1, corner.x - svg.x, 0.6); near(legY.y1, corner.y - svg.y, 0.6); near(legY.x2, b.x - svg.x, 0.6); near(legY.y2, b.y - svg.y, 0.6);
    // the leg lengths in pixels are |dx| = 6 and |dy| = 4 units
    near(Math.abs(legX.x2 - legX.x1), 6 * a.scale, 0.8);
    near(Math.abs(legY.y2 - legY.y1), 4 * a.scale, 0.8);
    await expect(stage.locator('[data-part="label-dx"]')).toContainText('dx = 6');
    await expect(stage.locator('[data-part="label-dy"]')).toContainText('dy = −4');
    await expect(stage.locator('[data-part="label-distance"]')).toContainText('2√13');
  });
  test('dragging B to (0, 5) makes the 3-4-5 triangle: displacement (3, 4), distance exactly 5, no root left', async ({ page }) => {
    const stage = await open(page, 'segment');
    await showPlane(stage);
    await dragTo(page, await handleCentre(stage, 1), await pixel(stage, SQUARE, 0, 5));
    await expect(stage).toHaveAttribute('data-bx', '0');
    await expect(stage).toHaveAttribute('data-by', '5');
    await expect(stage).toHaveAttribute('data-ax', '-3');
    expect(await lines(stage, 'displacement')).toEqual(['= (3, 4)']);
    expect(await lines(stage, 'distance')).toEqual(['= 5']);
    expect(await lines(stage, 'taxicab')).toEqual(['= 7']);
  });
  test('swapping the two points flips both signs of the displacement and leaves the distance unchanged', async ({ page }) => {
    const stage = await open(page, 'segment');
    await enter(spin(stage, 0), '3');
    await enter(spin(stage, 1), '-3');
    await enter(spin(stage, 2), '-3');
    await enter(spin(stage, 3), '1');
    expect(await lines(stage, 'displacement')).toEqual(['= (-6, 4)']);
    expect(await lines(stage, 'reverse')).toEqual(['= (6, -4)']);
    expect(await lines(stage, 'distance')).toEqual(['= 2√13', '≈ 7.211103…']);
    expect(await lines(stage, 'midpoint')).toEqual(['= (0, -1)']);
  });
  test('keys move B by a grid step: one step down gives √61', async ({ page }) => {
    const stage = await open(page, 'segment');
    await stage.locator('[data-handle]').nth(1).focus();
    await page.keyboard.press('ArrowDown');
    await expect(stage).toHaveAttribute('data-by', '-4');
    expect(await lines(stage, 'displacement')).toEqual(['= (6, -5)']);
    expect(await lines(stage, 'distance')).toEqual(['= √61', '≈ 7.810250…']);
  });
  test('horizontal, vertical and coincident points: the missing leg, the missing right angle, and the plain-language verdict', async ({ page }) => {
    const stage = await open(page, 'segment');
    await stage.locator('[data-preset="s-h"]').click();
    await expect(stage).toHaveAttribute('data-kind', 'horizontal');
    await expect(stage.locator('[data-part="leg-y"]')).toHaveCount(0);
    await expect(stage.locator('[data-part="leg-x"]')).toHaveCount(1);
    expect(await lines(stage, 'displacement')).toEqual(['= (-5, 0)']);
    expect(await lines(stage, 'distance')).toEqual(['= 5']);
    await expect(stage.locator('[data-verdict]')).toContainText('horizontal');
    await stage.locator('[data-preset="s-v"]').click();
    await expect(stage).toHaveAttribute('data-kind', 'vertical');
    await expect(stage.locator('[data-part="leg-x"]')).toHaveCount(0);
    expect(await lines(stage, 'distance')).toEqual(['= 7']);
    await expect(stage.locator('[data-verdict]')).toContainText('vertical');
    await stage.locator('[data-preset="s-same"]').click();
    await expect(stage).toHaveAttribute('data-kind', 'coincident');
    expect(await lines(stage, 'distance')).toEqual(['= 0']);
    await expect(stage.locator('[data-part="displacement"]')).toHaveCount(0);
    await expect(stage.locator('[data-part="label-distance"]')).toHaveCount(0);
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
    await expect(stage.locator('[data-verdict]')).toContainText('no direction');
  });
  test('coincident points: the point just moved lets go, so A can be pulled away from B', async ({ page }) => {
    const stage = await open(page, 'segment');
    await showPlane(stage);
    await stage.locator('[data-preset="s-same"]').click();
    await expect(stage.locator('g.behind')).toHaveCount(1);
    await dragTo(page, await pixel(stage, SQUARE, 2, 3), await pixel(stage, SQUARE, -2, 3));
    await expect(stage).toHaveAttribute('data-ax', '-2');
    await expect(stage).toHaveAttribute('data-bx', '2');
    await expect(stage).toHaveAttribute('data-kind', 'horizontal');
  });
  test('a short segment drops the labels it cannot carry, but keeps the distance', async ({ page }) => {
    const stage = await open(page, 'segment');
    await stage.locator('[data-preset="s-diag"]').click();
    expect(await lines(stage, 'distance')).toEqual(['= √2', '≈ 1.414214…']);
    await expect(stage.locator('[data-part="label-dx"]')).toHaveCount(0);
    await expect(stage.locator('[data-part="label-distance"]')).toHaveCount(1);
  });
});

test.describe('mechanism D — the same pixel in two coordinate systems', () => {
  const win = (w: number, h: number): Window => ({ xMin: -1, xMax: w + 1.6, yMin: -1, yMax: h + 0.2 });
  test('canonical: a 5 × 4 image, the point (3, 1) is row 2, column 3, flat index 13; the table highlights that cell, row 0 on top', async ({ page }) => {
    const stage = await open(page, 'pixel');
    await expect(stage).toHaveAttribute('data-row', '2');
    await expect(stage).toHaveAttribute('data-col', '3');
    expect(await lines(stage, 'row')).toEqual(['= 2']);
    expect(await lines(stage, 'col')).toEqual(['= 3']);
    expect(await lines(stage, 'index')).toEqual(['= 13']);
    const table = stage.locator('[data-table="pixel-array"]');
    await expect(table.locator('tbody tr')).toHaveCount(4);
    await expect(table.locator('thead th[scope="col"]')).toHaveCount(6);
    const selected = table.locator('td[data-selected="true"]');
    await expect(selected).toHaveCount(1);
    await expect(selected).toHaveAttribute('data-row', '2');
    await expect(selected).toHaveAttribute('data-col', '3');
    await expect(selected).toHaveText('(3,1)');
    // the first body row is the TOP of the picture: y = H − 1 = 3
    await expect(table.locator('tbody tr').first().locator('td').first()).toHaveText('(0,3)');
    await expect(table.locator('tbody tr').last().locator('td').first()).toHaveText('(0,0)');
    await expect(table.locator('tbody tr').first().locator('th')).toHaveText('row 0');
    await expect(table.locator('thead th').first().locator('.sr-only')).toHaveCount(1);
  });
  test('showing the flat index numbers the cells 0 … 19 left to right, top to bottom', async ({ page }) => {
    const stage = await open(page, 'pixel');
    await choose(stage, 'flat index');
    const table = stage.locator('[data-table="pixel-array"]');
    expect(await table.locator('td').allTextContents()).toEqual(Array.from({ length: 20 }, (_, i) => String(i)));
    await expect(table.locator('td[data-selected="true"]')).toHaveText('13');
  });
  test('dragging to the top-left cell (0, 3): row 0, column 0; the DOM position agrees with the hand-computed pixel', async ({ page }) => {
    const stage = await open(page, 'pixel');
    await showPlane(stage);
    const start = await pixel(stage, win(5, 4), 3, 1);
    const h0 = await handleCentre(stage);
    near(h0.x, start.x); near(h0.y, start.y);
    await dragTo(page, h0, await pixel(stage, win(5, 4), 0, 3));
    await expect(stage).toHaveAttribute('data-x', '0');
    await expect(stage).toHaveAttribute('data-y', '3');
    await expect(stage).toHaveAttribute('data-row', '0');
    await expect(stage).toHaveAttribute('data-col', '0');
    await expect(stage.locator('[data-table="pixel-array"] td[data-selected="true"]')).toHaveAttribute('data-row', '0');
    expect(await lines(stage, 'index')).toEqual(['= 0']);
  });
  test('the arrow keys move from pixel to pixel: up raises y and lowers the row', async ({ page }) => {
    const stage = await open(page, 'pixel');
    await stage.locator('[data-handle]').focus();
    await page.keyboard.press('ArrowUp');
    await expect(stage).toHaveAttribute('data-y', '2');
    await expect(stage).toHaveAttribute('data-row', '1');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect(stage).toHaveAttribute('data-y', '3');
    await expect(stage).toHaveAttribute('data-row', '0');
    await page.keyboard.press('ArrowRight');
    await expect(stage).toHaveAttribute('data-x', '4');
    await page.keyboard.press('ArrowRight');
    await expect(stage).toHaveAttribute('data-x', '4');
  });
  test('the two slips: H − y is a legal but wrong row, and at y = 0 it does not exist', async ({ page }) => {
    const stage = await open(page, 'pixel');
    expect(await lines(stage, 'slip-row')).toEqual(['= 3']);
    await expect(stage.locator('[data-quantity="slip-row"]')).toContainText('wrong pixel');
    await enter(spin(stage, 3), '0');
    expect(await lines(stage, 'index')).toEqual(['= 18']);
    await expect(stage.locator('[data-quantity="slip-row"]')).toContainText('IndexError');
    await expect(stage.locator('[data-quantity="slip-swap"]')).toContainText('row 3, col 0');
  });
  test('resizing: the image changes shape and the point is clamped inside it; out-of-range sizes are rejected', async ({ page }) => {
    const stage = await open(page, 'pixel');
    await enter(spin(stage, 0), '3');
    await expect(stage).toHaveAttribute('data-w', '3');
    await expect(stage).toHaveAttribute('data-x', '2');
    await expect(stage.locator('[data-table="pixel-array"] tbody tr').first().locator('td')).toHaveCount(3);
    await enter(spin(stage, 1), '2');
    await expect(stage).toHaveAttribute('data-h', '2');
    await expect(stage).toHaveAttribute('data-y', '1');
    await enter(spin(stage, 0), '12');
    await expect(stage).toHaveAttribute('data-w', '3');
    await enter(spin(stage, 1), '1');
    await expect(stage).toHaveAttribute('data-h', '2');
  });
  test('the preset images: 7 × 3 and 3 × 6 have the right tables', async ({ page }) => {
    const stage = await open(page, 'pixel');
    const table = stage.locator('[data-table="pixel-array"]');
    await stage.locator('[data-preset="px-wide"]').click();
    await expect(table.locator('tbody tr')).toHaveCount(3);
    await expect(table.locator('tbody tr').first().locator('td')).toHaveCount(7);
    await expect(stage).toHaveAttribute('data-row', '1');
    await stage.locator('[data-preset="px-tall"]').click();
    await expect(table.locator('tbody tr')).toHaveCount(6);
    await expect(table.locator('tbody tr').first().locator('td')).toHaveCount(3);
    await expect(stage).toHaveAttribute('data-row', '1');
    await expect(stage).toHaveAttribute('data-col', '2');
    await stage.locator('[data-preset="px-bottom-left"]').click();
    await expect(stage).toHaveAttribute('data-row', '3');
  });
});

test.describe('mechanism E — worked examples', () => {
  test('stepping through the 3-4-5 distance, then the 2√13 distance with its root work', async ({ page }) => {
    const stage = await open(page, 'worked');
    const count = stage.locator('[data-trace-count]');
    const caption = stage.locator('.trace-caption');
    await expect(count).toContainText('Step 1');
    await stage.getByRole('button', { name: /Next/ }).click();
    await expect(caption).toContainText('Subtract coordinate by coordinate');
    await stage.getByRole('button', { name: /Next/ }).click();
    await expect(caption).toContainText('signs of dx and dy have disappeared');
    for (let i = 0; i < 20 && (await stage.getByRole('button', { name: /Next/ }).isEnabled()); i++) await stage.getByRole('button', { name: /Next/ }).click();
    await expect(caption).toContainText('Check the other direction');
    await expect(caption).toContainText('(−3, −4)');
    await stage.locator('[data-example="d2"]').click();
    await expect(count).toContainText('Step 1');
    for (let i = 0; i < 20 && (await stage.getByRole('button', { name: /Next/ }).isEnabled()); i++) await stage.getByRole('button', { name: /Next/ }).click();
    await expect(caption).toContainText('Check the other direction');
    await stage.getByRole('button', { name: /Previous/ }).click();
    await expect(caption).toContainText('only a rounding');
  });
  test('all four examples reach a last frame', async ({ page }) => {
    const stage = await open(page, 'worked');
    for (const id of ['d1', 'd2', 'd3', 'd4']) {
      await stage.locator(`[data-example="${id}"]`).click();
      await expect(stage).toHaveAttribute('data-example', id);
      for (let i = 0; i < 30 && (await stage.getByRole('button', { name: /Next/ }).isEnabled()); i++) await stage.getByRole('button', { name: /Next/ }).click();
      await expect(stage.locator('.trace-caption')).toContainText('Check the other direction');
    }
  });
});

test.describe('exercises', () => {
  const ex = async (page: Page, id: string) => { await page.goto(PATH); const e = page.locator(`[data-exercise="${id}"]`); await e.scrollIntoViewIfNeeded(); await expect(e).toHaveAttribute('data-hydrated', 'true'); return e; };
  const check = (e: Locator) => e.locator('[data-action="check"]').click();
  test('all thirteen exercises are present and hydrate', async ({ page }) => {
    await page.goto(PATH);
    const ids = ['quadrant-basic', 'axis-point', 'axis-distance', 'line-distance', 'signed-step', 'distance-345', 'radical-distance', 'midpoint', 'construct-point', 'taxicab', 'equal-distance', 'pixel-row', 'img-indexing'];
    for (const id of ids) {
      const e = page.locator(`[data-exercise="${id}"]`);
      await e.scrollIntoViewIfNeeded();
      await expect(e, id).toHaveAttribute('data-hydrated', 'true');
    }
    await expect(page.locator('[data-exercise]')).toHaveCount(ids.length);
  });
  test('a prediction: the quadrant slips are named, then the right answer is confirmed', async ({ page }) => {
    const e = await ex(page, 'quadrant-basic');
    await e.getByLabel('quadrant IV', { exact: true }).check();
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'incorrect');
    await expect(e.locator('[data-feedback]')).toContainText('opposite signs');
    await expect(e.locator('[data-action="show-solution"]')).toBeVisible();
    await e.getByLabel('quadrant II', { exact: true }).check();
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('an axis point: "no quadrant" is the answer, and "x = 0 puts it in quadrant III" is named as the slip', async ({ page }) => {
    const e = await ex(page, 'axis-point');
    await e.getByLabel('it is in quadrant III', { exact: true }).check();
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('Zero is neither');
    await e.getByLabel('it is on the y-axis, and in no quadrant', { exact: true }).check();
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('the distance to the x-axis is |y|, not |x|', async ({ page }) => {
    const e = await ex(page, 'axis-distance');
    await e.getByLabel('3', { exact: true }).check();
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('y-axis');
    await e.getByLabel('2', { exact: true }).check();
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('number-line distance: the sign slip and the adding slip are both named', async ({ page }) => {
    const e = await ex(page, 'line-distance');
    await e.locator('[data-field="d"]').fill('-8');
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('direction');
    await e.locator('[data-field="d"]').fill('2');
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('adds the coordinates');
    await e.locator('[data-field="d"]').fill('8');
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('a calculation with two fields: the signed step and its distance', async ({ page }) => {
    const e = await ex(page, 'signed-step');
    await e.locator('[data-field="step"]').fill('8');
    await e.locator('[data-field="dist"]').fill('8');
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'incorrect');
    await e.locator('[data-field="step"]').fill('-8');
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('the 3-4-5 distance: the taxicab 7 and the squared 25 are named; 2√13 is entered as a coefficient and a radicand', async ({ page }) => {
    const e = await ex(page, 'distance-345');
    await e.locator('[data-field="d"]').fill('7');
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('taxicab');
    await e.locator('[data-field="d"]').fill('25');
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('SQUARED');
    await e.locator('[data-field="d"]').fill('5');
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'correct');
    const r = await ex(page, 'radical-distance');
    await r.locator('[data-field="a"]').fill('1');
    await r.locator('[data-field="b"]').fill('52');
    await check(r);
    await expect(r.locator('[data-feedback]')).toContainText('Not fully simplified');
    await r.locator('[data-field="a"]').fill('2');
    await r.locator('[data-field="b"]').fill('13');
    await check(r);
    await expect(r).toHaveAttribute('data-result', 'correct');
  });
  test('the midpoint is the average, not half the displacement and not the sum', async ({ page }) => {
    const e = await ex(page, 'midpoint');
    await e.locator('[data-field="mx"]').fill('2');
    await e.locator('[data-field="my"]').fill('2');
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('SUM');
    await e.locator('[data-field="mx"]').fill('1');
    await e.locator('[data-field="my"]').fill('1');
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('a construction is validated, not compared with a fixed answer: quadrant III at distance 5', async ({ page }) => {
    const e = await ex(page, 'construct-point');
    for (const [x, y, ok] of [['3', '4', false], ['0', '-5', false], ['-3', '-4', true], ['-4', '-3', true], ['-1.4', '-4.8', true], ['-7/5', '-24/5', true], ['-3', '-4.01', false], ['abc', '1', false]] as const) {
      await e.locator('[data-field="x"]').fill(x);
      await e.locator('[data-field="y"]').fill(y);
      await check(e);
      await expect(e, `${x},${y}`).toHaveAttribute('data-result', ok ? 'correct' : 'incorrect');
    }
  });
  test('the pixel row: off by one, no flip and swapped are each named', async ({ page }) => {
    const e = await ex(page, 'pixel-row');
    const answer = async (row: string, col: string) => { await e.locator('[data-field="row"]').fill(row); await e.locator('[data-field="col"]').fill(col); await check(e); };
    await answer('3', '4');
    await expect(e.locator('[data-feedback]')).toContainText('off by one');
    await answer('1', '4');
    await expect(e.locator('[data-feedback]')).toContainText('forgets the flip');
    await answer('4', '1');
    await expect(e.locator('[data-feedback]')).toContainText('Swapped');
    await answer('2', '4');
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('NumPy indexing, taxicab versus straight, and equal distances', async ({ page }) => {
    const a = await ex(page, 'img-indexing');
    await a.getByLabel('img[x, y]', { exact: true }).check();
    await check(a);
    await expect(a.locator('[data-feedback]')).toContainText('row first');
    await a.getByLabel('img[H - 1 - y, x]', { exact: true }).check();
    await check(a);
    await expect(a).toHaveAttribute('data-result', 'correct');
    const b = await ex(page, 'taxicab');
    await b.getByLabel('they are always equal', { exact: true }).check();
    await check(b);
    await expect(b.locator('[data-feedback]')).toContainText('1.414');
    await b.getByLabel('taxicab ≥ straight, with equality exactly when dx = 0 or dy = 0', { exact: true }).check();
    await check(b);
    await expect(b).toHaveAttribute('data-result', 'correct');
    const c = await ex(page, 'equal-distance');
    await c.getByLabel('no: 0.1² + 0.7² is slightly smaller than 0.5', { exact: true }).check();
    await check(c);
    await expect(c.locator('[data-feedback]')).toContainText('binary doubles');
    await c.getByLabel('yes: both squared distances equal 0.5 exactly', { exact: true }).check();
    await check(c);
    await expect(c).toHaveAttribute('data-result', 'correct');
  });
  test('the worked solution appears only after an attempt, and Reset clears it; feedback is polite', async ({ page }) => {
    const e = await ex(page, 'midpoint');
    await expect(e.locator('[data-action="show-solution"]')).toHaveCount(0);
    await e.locator('[data-field="mx"]').fill('0');
    await e.locator('[data-field="my"]').fill('0');
    await check(e);
    await e.locator('[data-action="show-solution"]').click();
    await expect(e.locator('[data-solution]')).toContainText('(1, 1)');
    await e.locator('[data-action="reset-exercise"]').click();
    await expect(e).toHaveAttribute('data-result', 'none');
    await expect(e.locator('[data-solution]')).toHaveCount(0);
    await expect(e.locator('.feedback')).toHaveAttribute('aria-live', 'polite');
  });
});

test.describe('code and tables', () => {
  test('the three reference files are shown, and the computed table flags exactly the points where the double is not the true value', async ({ page }) => {
    await page.goto(PATH);
    for (const f of ['coordinates_distance.py', 'coordinates_quadrant.py', 'coordinates_image_index.py']) await expect(page.locator('.code-file .file', { hasText: f })).toHaveCount(1);
    const rows = page.locator('[data-table="distance-exact-vs-double"] tbody tr');
    await expect(rows).toHaveCount(7);
    const text = await rows.allTextContents();
    expect(text[0]).toContain('0.49999999999999994');
    expect(text[4]).toContain('0.05000000000000001');
    expect(text[5]).toContain('6.050000000000001');
    expect(text[6]).toContain('5.449999999999999');
    const agree = await rows.evaluateAll(els => els.map(e => e.getAttribute('data-agree')));
    expect(agree).toEqual(['false', 'true', 'true', 'true', 'false', 'false', 'false']);
  });
});

test.describe('layout', () => {
  test('on a phone width: no page overflow, the pixel table fits, every stage hydrates, and the formulas scroll rather than clip', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PATH);
    for (const s of ['point', 'line', 'segment', 'pixel', 'worked']) {
      await page.locator(`[data-stage="${s}"]`).scrollIntoViewIfNeeded();
      await expect(page.locator(`[data-stage="${s}"]`)).toHaveAttribute('data-hydrated', 'true');
    }
    expect(await noPageOverflow(page)).toBe(true);
    const fits = await page.locator('[data-table="pixel-array"]').evaluate(t => { const r = t.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; });
    expect(fits).toBe(true);
    for (const s of ['point', 'line', 'segment', 'pixel']) {
      const box = (await page.locator(`[data-stage="${s}"] svg.plane`).boundingBox())!;
      expect(box.x, s).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, s).toBeLessThanOrEqual(390.5);
    }
  });
  test('the wide image (10 × 10) still fits the plane and the table on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const stage = await open(page, 'pixel');
    await enter(spin(stage, 0), '10');
    await enter(spin(stage, 1), '10');
    await expect(stage.locator('[data-table="pixel-array"] td')).toHaveCount(100);
    const fits = await stage.locator('[data-table="pixel-array"]').evaluate(t => { const r = t.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; });
    expect(fits).toBe(true);
    expect(await noPageOverflow(page)).toBe(true);
  });
});
