/**
 * The Vectors chapter (I.3, REF-1): publication, navigation, and every stage — each checked from the DOM and from
 * independently computed pixels, never from the application's own viewport code.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { MINUS, noPageOverflow } from './helpers';

const PATH = 'chapters/vectors/';

async function open(page: Page, name: string): Promise<Locator> {
  await page.goto(PATH);
  const stage = page.locator(`[data-stage="${name}"]`);
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute('data-hydrated', 'true');
  await page.evaluate(() => document.fonts.ready);
  return stage;
}
const field = (stage: Locator, name: string) => stage.getByRole('spinbutton', { name });
async function enter(stage: Locator, name: string, text: string) {
  const f = field(stage, name);
  await f.fill(text);
  await f.press('Enter');
}
const lines = (stage: Locator, id: string) =>
  stage.locator(`[data-quantity="${id}"] dd .line`).evaluateAll(els => els.map(e => `${e.querySelector('.rel')?.textContent ?? ''} ${e.querySelector('.val')?.textContent ?? ''}`.replace(/\s+/g, ' ').trim()));
/** Page-pixel centres of every drag handle in a stage, plus the pixels per world unit for a window of half-width `half`. */
async function handles(stage: Locator, half: number) {
  const svg = (await stage.locator('svg.plane').boundingBox())!;
  const scale = Math.min(svg.width, svg.height) / (2 * half);
  const centres = await stage.locator('.drag-point .ring').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }));
  return { scale, centres };
}

test.describe('publication and navigation', () => {
  test('the chapter exists with the right metadata, one h1, and a section outline', async ({ page }) => {
    await page.goto(PATH);
    await expect(page).toHaveTitle(/Vectors: components, magnitude, and direction/);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText('vector');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Vectors as displacements/);
    const h2 = await page.locator('main h2').allTextContents();
    for (const heading of ['Intuition', 'Points and displacements', 'Definition', 'Magnitude', 'Direction', 'Why', 'Worked examples', 'Executable reference code', 'Common mistakes', 'Numerical considerations', 'Exercises', 'Summary and checkpoints'])
      expect(h2.some(t => t.includes(heading)), heading).toBe(true);
    // no heading level is skipped
    const levels = await page.locator('main :is(h1,h2,h3,h4)').evaluateAll(els => els.map(e => Number(e.tagName[1])));
    for (let i = 1; i < levels.length; i++) expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
  });
  test('it is reachable from the contents page and the book map, and Part I is the active part', async ({ page }) => {
    await page.goto('contents/');
    await page.locator('a[href$="chapters/vectors/"]').first().click();
    await expect(page).toHaveURL(/chapters\/vectors\/$/);
    await page.getByRole('button', { name: 'Contents' }).click();
    await expect(page.locator('dialog a[href$="chapters/vectors/"]').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.topbar a[aria-current="true"]')).toHaveAttribute('title', /Part I:/);
  });
  test('the pager has planned neighbours that are not links', async ({ page }) => {
    await page.goto(PATH);
    const pager = page.locator('.chapter-pager, nav.pager').first();
    await expect(pager).toContainText('planned');
    await expect(pager.locator('a')).toHaveCount(0);
  });
  test('the foundation demo is still a separate, labelled page linking here', async ({ page }) => {
    await page.goto('foundation/');
    await expect(page).toHaveTitle(/Foundation demo/);
    await expect(page.locator('a[href$="chapters/vectors/"]').first()).toBeVisible();
  });
  test('no duplicate ids across islands, and the page does not overflow', async ({ page }) => {
    await page.goto(PATH);
    await page.locator('[data-stage="worked"][data-hydrated="true"]').waitFor();
    await page.locator('[data-exercise][data-hydrated="true"]').first().waitFor();
    const dupes = await page.evaluate(() => { const seen = new Map<string, number>(); document.querySelectorAll('[id]').forEach(e => seen.set(e.id, (seen.get(e.id) ?? 0) + 1)); return [...seen].filter(([, n]) => n > 1).map(([id]) => id); });
    expect(dupes).toEqual([]);
    expect(await noPageOverflow(page)).toBe(true);
  });
  test('all stages hydrate', async ({ page }) => {
    await page.goto(PATH);
    for (const s of ['vector', 'placement', 'pythagoras', 'direction', 'worked']) {
      await page.locator(`[data-stage="${s}"]`).scrollIntoViewIfNeeded();
      await expect(page.locator(`[data-stage="${s}"]`)).toHaveAttribute('data-hydrated', 'true');
    }
  });
});

test.describe('mechanism A — the first stage is the shared vector stage', () => {
  test('numeric entry drives plane, inspector and formulas together; Reset restores v = (3, 2)', async ({ page }) => {
    const stage = await open(page, 'vector');
    await enter(stage, 'x-component', '-3');
    await expect(stage).toHaveAttribute('data-x', '-3');
    expect(await lines(stage, 'vector')).toEqual([`= (${MINUS}3, 2)`]);
    await stage.locator('[data-action="reset"]').click();
    await expect(stage).toHaveAttribute('data-x', '3');
    expect(await lines(stage, 'magnitude')).toEqual(['= √13', '≈ 3.605551…']);
  });
});

test.describe('mechanism B — a point is a place, a vector is a displacement', () => {
  test('sliding the tail changes P and Q but not v, ‖v‖ or θ (inspector AND drawn handles)', async ({ page }) => {
    const stage = await open(page, 'placement');
    const before = { v: await lines(stage, 'vector'), m: await lines(stage, 'magnitude'), a: await lines(stage, 'direction') };
    expect(before.v).toEqual(['= (3, 2)']);
    const h0 = await handles(stage, 9);
    const px0 = { dx: h0.centres[1]!.x - h0.centres[0]!.x, dy: h0.centres[1]!.y - h0.centres[0]!.y };
    // the drawn arrow: 3 units right, 2 units up (page y points down)
    expect(px0.dx / h0.scale).toBeCloseTo(3, 1);
    expect(-px0.dy / h0.scale).toBeCloseTo(2, 1);
    const tailBefore = await lines(stage, 'tail');
    await enter(stage, 'start point x', '2');
    await enter(stage, 'start point y', '3');
    expect(await lines(stage, 'tail')).not.toEqual(tailBefore);
    expect(await lines(stage, 'tail')).toEqual(['= (2, 3)']);
    expect(await lines(stage, 'tip')).toEqual(['= (5, 5)']);
    expect(await lines(stage, 'vector')).toEqual(before.v);
    expect(await lines(stage, 'magnitude')).toEqual(before.m);
    expect(await lines(stage, 'direction')).toEqual(before.a);
    const h1 = await handles(stage, 9);
    expect((h1.centres[1]!.x - h1.centres[0]!.x) / h1.scale).toBeCloseTo(3, 1);
    expect(-(h1.centres[1]!.y - h1.centres[0]!.y) / h1.scale).toBeCloseTo(2, 1);
    // the formulas show the same numbers
    const tex = await stage.locator('.formula-panel .formula').evaluateAll(e => e.map(x => x.getAttribute('data-tex')!));
    expect(tex[0]).toContain('2\\\\3');
    expect(tex[1]).toContain('5\\\\5');
  });
  test('dragging the tail handle slides the arrow; dragging the tip changes v and keeps P', async ({ page }) => {
    const stage = await open(page, 'placement');
    await stage.locator('svg.plane').evaluate(e => e.scrollIntoView({ block: 'center' }));
    let h = await handles(stage, 9);
    const svg = (await stage.locator('svg.plane').boundingBox())!;
    const at = (x: number, y: number) => ({ x: svg.x + svg.width / 2 + x * h.scale, y: svg.y + svg.height / 2 - y * h.scale });
    // tail handle from (-2,-1) to (1,1)
    await page.mouse.move(h.centres[0]!.x, h.centres[0]!.y); await page.mouse.down();
    const t = at(1, 1); await page.mouse.move(t.x, t.y, { steps: 8 }); await page.mouse.up();
    expect(await lines(stage, 'tail')).toEqual(['= (1, 1)']);
    expect(await lines(stage, 'vector')).toEqual(['= (3, 2)']);
    // tip handle (now at (4,3)) to (2,-2): v = (1,-3)
    h = await handles(stage, 9);
    await page.mouse.move(h.centres[1]!.x, h.centres[1]!.y); await page.mouse.down();
    const q = at(2, -2); await page.mouse.move(q.x, q.y, { steps: 8 }); await page.mouse.up();
    expect(await lines(stage, 'tail')).toEqual(['= (1, 1)']);
    expect(await lines(stage, 'vector')).toEqual([`= (1, ${MINUS}3)`]);
    await stage.locator('[data-action="reset"]').click();
    expect(await lines(stage, 'tail')).toEqual([`= (${MINUS}2, ${MINUS}1)`]);
  });
  test('keyboard on the tail handle moves P and never v', async ({ page }) => {
    const stage = await open(page, 'placement');
    await stage.locator('[data-handle]').first().focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowUp');
    expect(await lines(stage, 'tail')).toEqual([`= (${MINUS}1, 0)`]);
    expect(await lines(stage, 'vector')).toEqual(['= (3, 2)']);
  });
  test('the zero displacement draws no arrow and v is still defined as (0, 0)', async ({ page }) => {
    const stage = await open(page, 'placement');
    await enter(stage, 'x-component of v', '0');
    await enter(stage, 'y-component of v', '0');
    expect(await lines(stage, 'vector')).toEqual(['= (0, 0)']);
    await expect(stage.locator('[data-part="vector"]')).toHaveCount(0);
    await expect(stage.locator('[data-quantity="direction"]')).toHaveAttribute('data-status', 'undefined');
  });
});

test.describe('Pythagoras stage', () => {
  test('(3, 2): areas 9, 4, 13 exactly and the side √13; (3, 4): side exactly 5', async ({ page }) => {
    const stage = await open(page, 'pythagoras');
    expect(await lines(stage, 'x-squared')).toEqual(['= 9']);
    expect(await lines(stage, 'y-squared')).toEqual(['= 4']);
    expect(await lines(stage, 'magnitude-squared')).toEqual(['= 13']);
    expect(await lines(stage, 'magnitude')).toEqual(['= √13', '≈ 3.605551…']);
    await enter(stage, 'y-component', '4');
    expect(await lines(stage, 'magnitude')).toEqual(['= 5']);
    expect(await lines(stage, 'magnitude-squared')).toEqual(['= 25']);
  });
  test('the three squares are drawn with areas x², y², x²+y² (measured from the polygon points)', async ({ page }) => {
    const stage = await open(page, 'pythagoras');
    const areas = await stage.locator('polygon.poly').evaluateAll(els => els.map(e => {
      const pts = (e.getAttribute('points') ?? '').trim().split(/\s+/).map(p => p.split(',').map(Number) as [number, number]);
      let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i]!, b = pts[(i + 1) % pts.length]!; s += a[0] * b[1] - b[0] * a[1]; }
      return Math.abs(s) / 2;
    }));
    const scale = (await stage.locator('svg.plane').boundingBox())!.width / 18;
    expect(areas).toHaveLength(3);
    expect(areas[0]! / scale ** 2).toBeCloseTo(9, 1);
    expect(areas[1]! / scale ** 2).toBeCloseTo(4, 1);
    expect(areas[2]! / scale ** 2).toBeCloseTo(13, 1);
  });
  test('a zero component removes the squares; zero vector says so', async ({ page }) => {
    const stage = await open(page, 'pythagoras');
    await enter(stage, 'x-component', '0');
    await expect(stage.locator('polygon.poly')).toHaveCount(0);
    expect(await lines(stage, 'magnitude')).toEqual(['= 2']);
    await enter(stage, 'y-component', '0');
    expect(await lines(stage, 'magnitude')).toEqual(['= 0']);
  });
  test('Reset restores the canonical vector', async ({ page }) => {
    const stage = await open(page, 'pythagoras');
    await enter(stage, 'x-component', '-4');
    await stage.locator('[data-action="reset"]').click();
    await expect(stage).toHaveAttribute('data-x', '3');
  });
});

test.describe('mechanism C — atan versus atan2', () => {
  const preset = (stage: Locator, id: string) => stage.locator(`[data-preset="${id}"]`).click();
  test('quadrant II: atan is half a turn off, atan2 is right, and the correction is exactly π', async ({ page }) => {
    const stage = await open(page, 'direction');
    await expect(stage).toHaveAttribute('data-location', /quadrant|left/i);
    expect(await lines(stage, 'ratio')).toEqual([`≈ ${MINUS}0.666667`]);
    expect(await lines(stage, 'naive')).toEqual([`≈ ${MINUS}0.588003 rad`]);
    expect(await lines(stage, 'atan2')).toEqual(['≈ 2.553590 rad']);
    expect(await lines(stage, 'correction')).toEqual(['= π', '≈ 3.141593…']);
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
    await expect(stage.locator('[data-part="naive"]')).toHaveCount(1);
  });
  test('quadrant I: they agree and no naive arrow is drawn', async ({ page }) => {
    const stage = await open(page, 'direction');
    await preset(stage, 'q1');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'true');
    expect(await lines(stage, 'correction')).toEqual(['= 0']);
    await expect(stage.locator('[data-part="naive"]')).toHaveCount(0);
  });
  test('quadrant III: correction is −π', async ({ page }) => {
    const stage = await open(page, 'direction');
    await preset(stage, 'q3');
    expect(await lines(stage, 'correction')).toEqual([`= ${MINUS}π`, `≈ ${MINUS}3.141593…`]);
  });
  test('quadrant IV agrees with atan', async ({ page }) => {
    const stage = await open(page, 'direction');
    await preset(stage, 'q4');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'true');
  });
  test('negative x-axis: atan answers 0, atan2 answers π', async ({ page }) => {
    const stage = await open(page, 'direction');
    await preset(stage, 'neg-x');
    expect(await lines(stage, 'naive')).toEqual(['≈ 0 rad']);
    expect(await lines(stage, 'atan2')).toEqual(['≈ 3.141593 rad']);
  });
  test('positive y-axis: the ratio is undefined but atan2 gives π/2', async ({ page }) => {
    const stage = await open(page, 'direction');
    await preset(stage, 'pos-y');
    await expect(stage.locator('[data-quantity="ratio"]')).toHaveAttribute('data-status', 'undefined');
    await expect(stage.locator('[data-quantity="naive"]')).toHaveAttribute('data-status', 'undefined');
    expect(await lines(stage, 'atan2')).toEqual(['≈ 1.570796 rad']);
  });
  test('zero vector: every angle quantity is undefined and no arrow is drawn', async ({ page }) => {
    const stage = await open(page, 'direction');
    await preset(stage, 'zero');
    for (const id of ['ratio', 'naive', 'atan2', 'correction']) await expect(stage.locator(`[data-quantity="${id}"]`)).toHaveAttribute('data-status', 'undefined');
    await expect(stage.locator('[data-part="vector"]')).toHaveCount(0);
    await expect(stage.locator('[data-verdict]')).toContainText('no direction');
  });
  test('keyboard crosses the y-axis from quadrant II to I and the verdict changes; Reset returns', async ({ page }) => {
    const stage = await open(page, 'direction');
    await stage.locator('[data-handle]').focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight'); // (−3,2) → (0,2) on the axis
    await expect(stage).toHaveAttribute('data-x', '0');
    await expect(stage.locator('[data-quantity="ratio"]')).toHaveAttribute('data-status', 'undefined');
    await page.keyboard.press('ArrowRight');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'true');
    await stage.locator('[data-action="reset"]').click();
    await expect(stage).toHaveAttribute('data-x', '-3');
  });
  test('formula panel and inspector agree on the angle', async ({ page }) => {
    const stage = await open(page, 'direction');
    const tex = await stage.locator('.formula-panel .formula').evaluateAll(e => e.map(x => x.getAttribute('data-tex')!));
    expect(tex[1]).toContain('+\\pi');
    expect(tex[1]).toContain('2.55359');
  });
});

test.describe('worked examples', () => {
  test('stepping, switching examples and the final result', async ({ page }) => {
    const stage = await open(page, 'worked');
    const count = stage.locator('[data-trace-count]');
    await expect(count).toContainText('Step 1');
    for (let i = 0; i < 20 && (await stage.getByRole('button', { name: /Next/ }).isEnabled()); i++) await stage.getByRole('button', { name: /Next/ }).click();
    await expect(stage.locator('.formula').last()).toHaveAttribute('data-tex', /atantwo\(4,3\)/);
    await stage.locator('[data-example="w4"]').click();
    await expect(count).toContainText('Step 1');
    for (let i = 0; i < 20 && (await stage.getByRole('button', { name: /Next/ }).isEnabled()); i++) await stage.getByRole('button', { name: /Next/ }).click();
    await expect(stage.locator('.formula').last()).toHaveAttribute('data-tex', /atantwo\(-5,0\)/);
    await expect(stage.locator('.trace-caption')).toContainText('never divides');
  });
});

test.describe('exercises', () => {
  const ex = async (page: Page, id: string) => { await page.goto(PATH); const e = page.locator(`[data-exercise="${id}"]`); await e.scrollIntoViewIfNeeded(); await expect(e).toHaveAttribute('data-hydrated', 'true'); return e; };
  test('a calculation: wrong answers get misconception-specific feedback; the right answer is confirmed', async ({ page }) => {
    const e = await ex(page, 'magnitude-5-12');
    await e.locator('[data-field="length"]').fill('17');
    await e.locator('[data-action="check"]').click();
    await expect(e).toHaveAttribute('data-result', 'incorrect');
    await expect(e.locator('[data-feedback]')).toContainText('adds the components');
    await expect(e.locator('[data-action="show-solution"]')).toBeVisible();
    await e.locator('[data-field="length"]').fill('13');
    await e.locator('[data-action="check"]').click();
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('a prediction with choices', async ({ page }) => {
    const e = await ex(page, 'atan-predict');
    await e.getByLabel('3π/4 (135°)').check();
    await e.locator('[data-action="check"]').click();
    await expect(e.locator('[data-feedback]')).toContainText('TRUE direction');
    await e.getByLabel('−π/4 (−45°)').check();
    await e.locator('[data-action="check"]').click();
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('a construction is validated, not compared with a fixed answer', async ({ page }) => {
    const e = await ex(page, 'same-ratio');
    for (const [x, y, ok] of [['-3', '2', false], ['6', '-4', true], ['1.5', '-1', true]] as const) {
      await e.locator('[data-field="x"]').fill(x);
      await e.locator('[data-field="y"]').fill(y);
      await e.locator('[data-action="check"]').click();
      await expect(e).toHaveAttribute('data-result', ok ? 'correct' : 'incorrect');
    }
  });
  test('the worked solution appears only after an attempt, and Reset clears the exercise', async ({ page }) => {
    const e = await ex(page, 'translation');
    await expect(e.locator('[data-action="show-solution"]')).toHaveCount(0);
    await e.locator('[data-action="check"]').click();
    await expect(e.locator('[data-feedback]')).toContainText('Enter a number');
    await e.locator('[data-action="show-solution"]').click();
    await expect(e.locator('[data-solution]')).toContainText('Q′');
    await e.locator('[data-action="reset-exercise"]').click();
    await expect(e).toHaveAttribute('data-result', 'none');
    await expect(e.locator('[data-solution]')).toHaveCount(0);
  });
  test('feedback is announced politely', async ({ page }) => {
    const e = await ex(page, 'zero-direction');
    await expect(e.locator('.feedback')).toHaveAttribute('aria-live', 'polite');
  });
});

test.describe('code and tables', () => {
  test('all five reference files and both computed tables are present', async ({ page }) => {
    await page.goto(PATH);
    for (const f of ['vector_magnitude.py', 'vector_direction.py', 'vector_displacement.py', 'vector_magnitude_numpy.py', 'vector_batch_numpy.py']) await expect(page.locator('.code-file .file', { hasText: f })).toHaveCount(1);
    const probe = await page.locator('[data-table="probes"] tbody tr').allTextContents();
    expect(probe).toHaveLength(8);
    expect(probe[1]).toContain('differ by +π');
    expect(probe[7]).toContain('no direction');
    await expect(page.locator('[data-table="numerics"] tbody tr').nth(2)).toContainText('wrong');
  });
});

test.describe('responsive', () => {
  test('no horizontal overflow, and plane/handle stay inside the viewport width', async ({ page }) => {
    await page.goto(PATH);
    expect(await noPageOverflow(page)).toBe(true);
    for (const s of ['placement', 'pythagoras', 'direction']) {
      const box = await page.locator(`[data-stage="${s}"]`).boundingBox();
      expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    }
  });
});
