/**
 * The Quantities chapter (I.1): publication, navigation, and every stage — each checked from the DOM and from independently
 * computed pixels (the world windows below are written out here, never read from the application's viewport code), and the
 * exercises through their visible feedback.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { findChapter, neighbours } from '../../src/curriculum/queries';
import { noPageOverflow } from './helpers';

const PATH = 'chapters/quantities/';
/** The hero plane shows x in [−7.5, 7.5] and y in [−4.5, 10.5]; the roots plane shows [−8.5, 8.5] on both axes. */
const SQUARE_WINDOW = { xMin: -7.5, xMax: 7.5, yMin: -4.5, yMax: 10.5 };
const ROOTS_WINDOW = { xMin: -8.5, xMax: 8.5, yMin: -8.5, yMax: 8.5 };
type Window = typeof SQUARE_WINDOW;

async function open(page: Page, name: string): Promise<Locator> {
  await page.goto(PATH);
  const stage = page.locator(`[data-stage="${name}"]`);
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute('data-hydrated', 'true');
  await page.evaluate(() => document.fonts.ready);
  return stage;
}
const lines = (stage: Locator, id: string) =>
  stage.locator(`[data-quantity="${id}"] dd .line`).evaluateAll(els => els.map(e => `${e.querySelector('.rel')?.textContent ?? ''} ${e.querySelector('.val')?.textContent ?? ''}`.replace(/\s+/g, ' ').trim()));
const spin = (stage: Locator, index = 0) => stage.locator('input[role="spinbutton"]').nth(index);
async function enter(field: Locator, text: string) {
  await field.fill(text);
  await field.press('Enter');
}
/** Page pixels of a world point on a square plane showing `win` (one scale, window centred). */
async function pixel(stage: Locator, win: Window, x: number, y: number) {
  const box = (await stage.locator('svg.plane').boundingBox())!;
  const scale = Math.min(box.width, box.height) / (win.xMax - win.xMin);
  return { x: box.x + (x - win.xMin) * scale, y: box.y + (win.yMax - y) * scale, scale };
}
async function handleCentre(stage: Locator) {
  const b = (await stage.locator('.drag-point .ring').boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
const showPlane = (stage: Locator) => stage.locator('svg.plane').evaluate(e => e.scrollIntoView({ block: 'center' }));
const choose = (stage: Locator, label: string) => stage.locator('label.segment', { hasText: new RegExp(`^${label}$`) }).click();

test.describe('publication and navigation', () => {
  test('the chapter exists with the right metadata, one h1, and a section outline', async ({ page }) => {
    await page.goto(PATH);
    await expect(page).toHaveTitle(/Scalars, quantities, units, powers and roots/);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText('squaring');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /exponents/);
    const h2 = await page.locator('main h2').allTextContents();
    for (const heading of ['Intuition', 'Definition', 'Squares, roots', 'Units are exponents', 'Powers and their rules', 'Roots as the reverse', 'Worked examples', 'Executable reference code', 'Explore', 'Common mistakes', 'Numerical considerations', 'Connections', 'Exercises', 'Summary and checkpoints'])
      expect(h2.some(t => t.includes(heading)), heading).toBe(true);
    const levels = await page.locator('main :is(h1,h2,h3,h4)').evaluateAll(els => els.map(e => Number(e.tagName[1])));
    for (let i = 1; i < levels.length; i++) expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
  });
  test('it is reachable from the contents page, and the curriculum says it is the first chapter of Part I', async ({ page }) => {
    expect(findChapter('I.1')!.chapter.status).toBe('available');
    await page.goto('contents/');
    await page.locator('a[href$="chapters/quantities/"]').first().click();
    await expect(page).toHaveURL(/chapters\/quantities\/$/);
    await expect(page.locator('.topbar a[aria-current="true"]')).toHaveAttribute('title', /Part I:/);
  });
  test('the pager shows the next chapter in reading order (a link when published, text when planned)', async ({ page }) => {
    await page.goto(PATH);
    const around = neighbours(findChapter('I.1')!);
    expect(around.previous).toBeUndefined();
    const cell = page.locator('nav.chapter-pager .pager-next');
    await expect(cell).toContainText(`${around.next!.id} · ${around.next!.chapter.title}`);
    if (around.next!.chapter.status === 'available') await expect(cell).toHaveAttribute('href', new RegExp(`chapters/${around.next!.chapter.slug}/$`));
    else { await expect(cell).toContainText('planned'); await expect(cell).not.toHaveAttribute('href', /.*/); }
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
    for (const s of ['square', 'units', 'powers', 'roots', 'worked']) {
      await page.locator(`[data-stage="${s}"]`).scrollIntoViewIfNeeded();
      await expect(page.locator(`[data-stage="${s}"]`)).toHaveAttribute('data-hydrated', 'true');
    }
  });
});

test.describe('mechanism A — a square and its side (the hero stage)', () => {
  test('canonical state: side 3 m, area 9 m², root 3 m; the drawn square has its corners where the arithmetic says', async ({ page }) => {
    const stage = await open(page, 'square');
    await showPlane(stage);
    await expect(stage).toHaveAttribute('data-side', '3');
    expect(await lines(stage, 'side')).toEqual(['= 3 m']);
    expect(await lines(stage, 'square')).toEqual(['= 9 m²']);
    expect(await lines(stage, 'root')).toEqual(['= 3 m']);
    // the polygon's corners, in svg pixels, against the corners (0,0) (3,0) (3,3) (0,3) converted by hand
    const box = (await stage.locator('svg.plane').boundingBox())!;
    const s = box.width / 15;
    const points = (await stage.locator('[data-part="square"]').getAttribute('points'))!.trim().split(/\s+/).map(p => p.split(',').map(Number) as [number, number]);
    const expected = [[0, 0], [3, 0], [3, 3], [0, 3]].map(([x, y]) => [(x! + 7.5) * s, (10.5 - y!) * s]);
    expect(points).toHaveLength(4);
    points.forEach((p, i) => { expect(Math.abs(p[0] - expected[i]![0]!)).toBeLessThan(0.6); expect(Math.abs(p[1] - expected[i]![1]!)).toBeLessThan(0.6); });
  });
  test('dragging the corner to the left makes the side negative and the area, the root and the picture follow', async ({ page }) => {
    const stage = await open(page, 'square');
    await showPlane(stage);
    const from = await handleCentre(stage);
    const to = await pixel(stage, SQUARE_WINDOW, -3, 0);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.mouse.up();
    await expect(stage).toHaveAttribute('data-side', '-3');
    expect(await lines(stage, 'side')).toEqual(['= −3 m']);
    expect(await lines(stage, 'square')).toEqual(['= 9 m²']);
    expect(await lines(stage, 'root')).toEqual(['= 3 m']);
    const h = await handleCentre(stage);
    expect(Math.abs(h.x - to.x)).toBeLessThan(1.5);
    expect(Math.abs(h.y - to.y)).toBeLessThan(1.5);
    await expect(stage.locator('[data-verdict]')).toContainText('sign');
  });
  test('arrow keys move the side by one half; typed numbers are exact', async ({ page }) => {
    const stage = await open(page, 'square');
    await stage.locator('[data-handle]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(stage).toHaveAttribute('data-side', '3.5');
    expect(await lines(stage, 'square')).toEqual(['= 12.25 m²']);
    await enter(spin(stage), '0.1');
    expect(await lines(stage, 'square')).toEqual(['= 0.01 m²']);
    expect(await lines(stage, 'root')).toEqual(['= 0.1 m']);
  });
  test('asking from the area: 9 has two sides and one root; 2 is irrational (exact, then rounded); −4 has none', async ({ page }) => {
    const stage = await open(page, 'square');
    await choose(stage, 'the area');
    await expect(stage).toHaveAttribute('data-mode', 'area');
    await enter(spin(stage), '9');
    expect(await lines(stage, 'root')).toEqual(['= 3 m']);
    expect(await lines(stage, 'solutions')).toEqual(['= ±3']);
    await enter(spin(stage), '2');
    expect(await lines(stage, 'root')).toEqual(['= √2 m', '≈ 1.414214… m']);
    await enter(spin(stage), '12');
    expect((await lines(stage, 'root'))[0]).toBe('= 2√3 m');
    await enter(spin(stage), '-4');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
    await expect(stage.locator('[data-verdict]')).toContainText('no real');
    await expect(stage.locator('[data-quantity="root"]')).toHaveAttribute('data-status', 'undefined');
    await stage.locator('[data-action="reset"]').click();
    await expect(stage).toHaveAttribute('data-mode', 'side');
    await expect(stage).toHaveAttribute('data-side', '3');
  });
  test('the area slider is a 44 px control and drives the same state as the field', async ({ page }) => {
    const stage = await open(page, 'square');
    await choose(stage, 'the area');
    const slider = stage.locator('[data-slider="area"]');
    expect((await slider.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await slider.focus();
    await page.keyboard.press('End');
    await expect(stage).toHaveAttribute('data-area', '36');
    expect(await lines(stage, 'root')).toEqual(['= 6 m']);
  });
});

test.describe('mechanism B — units are exponents', () => {
  const preset = (stage: Locator, id: string) => stage.locator(`[data-preset="${id}"]`).click();
  const exponents = (stage: Locator, row: string) => stage.locator(`[data-exponents] tr[data-row="${row}"] td[data-axis]`).allTextContents();
  test('multiplying adds exponent vectors; dividing subtracts them', async ({ page }) => {
    const stage = await open(page, 'units');
    await preset(stage, 'area');
    expect(await exponents(stage, 'a')).toEqual(['1', '0', '0']);
    expect(await exponents(stage, 'result')).toEqual(['2', '0', '0']);
    expect(await lines(stage, 'result')).toEqual(['= 9 m²']);
    await preset(stage, 'speed');
    expect(await lines(stage, 'result')).toEqual(['= 3 m/s']);
    expect(await exponents(stage, 'result')).toEqual(['1', '−1', '0']);
    await preset(stage, 'ratio');
    expect(await lines(stage, 'result')).toEqual(['= 2']);
    expect(await exponents(stage, 'result')).toEqual(['0', '0', '0']);
  });
  test('the meaningless operations are refused, with the reason, and nothing is computed', async ({ page }) => {
    const stage = await open(page, 'units');
    for (const [id, word] of [['add-clash', 'differ'], ['add-area', 'differ'], ['root-bad', 'fractional exponent']] as const) {
      await preset(stage, id);
      await expect(stage).toHaveAttribute('data-ok', 'false');
      await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
      await expect(stage.locator('[data-verdict]')).toContainText(word);
      await expect(stage.locator('[data-quantity="result"]')).toHaveAttribute('data-status', 'undefined');
      expect(await exponents(stage, 'result')).toEqual(['—', '—', '—']);
    }
    await preset(stage, 'root-ok');
    await expect(stage).toHaveAttribute('data-ok', 'true');
    expect(await lines(stage, 'result')).toEqual(['= 3 m']);
    expect(await exponents(stage, 'result')).toEqual(['1', '0', '0']);
  });
  test('the unit list is a real select with a 44 px target; changing it changes the exponent table', async ({ page }) => {
    const stage = await open(page, 'units');
    const select = stage.locator('[data-unit-select="a"]');
    expect((await select.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await select.selectOption('s');
    expect(await stage.locator('[data-exponents] tr[data-row="a"] td[data-axis]').allTextContents()).toEqual(['0', '1', '0']);
    await enter(spin(stage, 1), '0');
    await stage.locator('[data-op="divide"]').click();
    await expect(stage).toHaveAttribute('data-ok', 'false');
    await expect(stage.locator('[data-verdict]')).toContainText('zero');
  });
});

test.describe('mechanism C — powers and their rules', () => {
  const rule = (stage: Locator, id: string) => stage.locator(`[data-rule="${id}"]`);
  test('2³ · 2⁴ = 2⁷ = 128 in exact arithmetic, and all four rules hold', async ({ page }) => {
    const stage = await open(page, 'powers');
    for (const id of ['product', 'power-of-power', 'zero', 'negative']) await expect(rule(stage, id)).toHaveAttribute('data-status', 'holds');
    expect(await lines(stage, 'power-m')).toEqual(['= 8']);
    expect(await lines(stage, 'power-n')).toEqual(['= 16']);
    await expect(rule(stage, 'product')).toContainText('128');
    await expect(rule(stage, 'power-of-power')).toContainText('4096');
    // the ladder: 2^-3 is 0.125, positive
    await expect(stage.locator('[data-ladder] tr[data-k="-3"]')).toContainText('0.125');
    await expect(stage.locator('[data-ladder] tr[data-k="4"]')).toHaveAttribute('data-marked', 'n');
    await expect(stage.locator('[data-ladder] tr[data-k="3"]')).toHaveAttribute('data-marked', 'm');
  });
  test('base 0: a rule is silent where a side does not exist, and no rule ever fails for any preset', async ({ page }) => {
    const stage = await open(page, 'powers');
    await stage.locator('[data-preset="zero-product"]').click();
    await expect(rule(stage, 'product')).toHaveAttribute('data-status', 'no-claim');
    await expect(rule(stage, 'product')).toContainText('no claim');
    await expect(stage.locator('[data-ladder] tr[data-k="-1"]')).toHaveAttribute('data-defined', 'false');
    await expect(stage.locator('[data-ladder] tr[data-k="3"]')).toHaveAttribute('data-defined', 'true');
    for (const id of ['two', 'negative', 'half', 'minus-two', 'zero-product', 'zero-power']) {
      await stage.locator(`[data-preset="${id}"]`).click();
      await expect(stage.locator('[data-rule][data-status="fails"]'), id).toHaveCount(0);
    }
  });
  test('typed exponents work, including a negative one', async ({ page }) => {
    const stage = await open(page, 'powers');
    await enter(spin(stage, 0), '0.5');
    await enter(spin(stage, 1), '2');
    await enter(spin(stage, 2), '-3');
    expect(await lines(stage, 'power-m')).toEqual(['= 0.25']);
    expect(await lines(stage, 'power-n')).toEqual(['= 8']);
    for (const id of ['product', 'power-of-power', 'zero', 'negative']) await expect(rule(stage, id)).toHaveAttribute('data-status', 'holds');
  });
});

test.describe('mechanism D — roots as intersections', () => {
  const curve = (stage: Locator) => stage.locator('[data-part="power-curve"]').first().getAttribute('d');
  test('the curve depends on n only: dragging the level never changes it, changing n does', async ({ page }) => {
    const stage = await open(page, 'roots');
    await showPlane(stage);
    const before = await curve(stage);
    expect(before).toBeTruthy();
    const from = await handleCentre(stage);
    const to = await pixel(stage, ROOTS_WINDOW, 0, 5);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 10 });
    await page.mouse.up();
    await expect(stage).toHaveAttribute('data-a', '5');
    expect(await curve(stage)).toBe(before);
    await choose(stage, '3');
    await expect(stage).toHaveAttribute('data-n', '3');
    expect(await curve(stage)).not.toBe(before);
  });
  test('x² = 2: two intersections at ±√2, drawn where the arithmetic says', async ({ page }) => {
    const stage = await open(page, 'roots');
    await showPlane(stage);
    await expect(stage).toHaveAttribute('data-solutions', '2');
    const markers = stage.locator('[data-part^="root-"].marker');
    await expect(markers).toHaveCount(2);
    const centres = await markers.evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }));
    const want = [await pixel(stage, ROOTS_WINDOW, Math.SQRT2, 2), await pixel(stage, ROOTS_WINDOW, -Math.SQRT2, 2)];
    for (const w of want) expect(centres.some(c => Math.abs(c.x - w.x) < 1.5 && Math.abs(c.y - w.y) < 1.5), `marker near (${w.x}, ${w.y})`).toBe(true);
    expect(await lines(stage, 'root')).toEqual(['= √2', '≈ 1.414214…']);
    expect((await lines(stage, 'solutions')).join(' ')).toContain('±√2');
  });
  test('the three counts: an even root of a negative number has none, an odd one exactly one, zero has one', async ({ page }) => {
    const stage = await open(page, 'roots');
    await stage.locator('[data-preset="sqrt-neg"]').click();
    await expect(stage).toHaveAttribute('data-solutions', '0');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
    await expect(stage.locator('[data-quantity="root"]')).toHaveAttribute('data-status', 'undefined');
    await expect(stage.locator('[data-part^="root-"].marker')).toHaveCount(0);
    await stage.locator('[data-preset="cbrt-8"]').click();
    await expect(stage).toHaveAttribute('data-solutions', '1');
    expect(await lines(stage, 'root')).toEqual(['= −2']);
    await enter(spin(stage), '0');
    await choose(stage, '4');
    await expect(stage).toHaveAttribute('data-solutions', '1');
    expect(await lines(stage, 'root')).toEqual(['= 0']);
  });
  test('fourth roots: 8 has two real solutions, and the root symbol returns the positive one', async ({ page }) => {
    const stage = await open(page, 'roots');
    await stage.locator('[data-preset="fourth-8"]').click();
    await expect(stage).toHaveAttribute('data-solutions', '2');
    expect((await lines(stage, 'root'))[0]).toBe('= ⁴√8');
  });
});

test.describe('mechanism E — worked examples', () => {
  test('stepping through √72, then the area example with its unit', async ({ page }) => {
    const stage = await open(page, 'worked');
    const count = stage.locator('[data-trace-count]');
    await expect(count).toContainText('Step 1');
    for (let i = 0; i < 20 && (await stage.getByRole('button', { name: /Next/ }).isEnabled()); i++) await stage.getByRole('button', { name: /Next/ }).click();
    // the last frame says the decimal is only a rounding; the one before it is the check by raising to the power 2
    await expect(stage.locator('.trace-caption')).toContainText('only a rounding');
    await stage.getByRole('button', { name: /Previous/ }).click();
    await expect(stage.locator('.trace-caption')).toContainText('Check');
    await expect(stage.locator('.formula').last()).toHaveAttribute('data-tex', /72/);
    await stage.locator('[data-example="w4"]').click();
    await expect(count).toContainText('Step 1');
    for (let i = 0; i < 20 && (await stage.getByRole('button', { name: /Next/ }).isEnabled()); i++) await stage.getByRole('button', { name: /Next/ }).click();
    await expect(stage.locator('.trace-caption')).toContainText('Units');
  });
});

test.describe('exercises', () => {
  const ex = async (page: Page, id: string) => { await page.goto(PATH); const e = page.locator(`[data-exercise="${id}"]`); await e.scrollIntoViewIfNeeded(); await expect(e).toHaveAttribute('data-hydrated', 'true'); return e; };
  const check = (e: Locator) => e.locator('[data-action="check"]').click();
  test('a prediction: the sign slip is named, then the right answer is confirmed', async ({ page }) => {
    const e = await ex(page, 'sqrt-of-square');
    await e.getByLabel('−5', { exact: true }).check();
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'incorrect');
    await expect(e.locator('[data-feedback]')).toContainText('erased the sign');
    await expect(e.locator('[data-action="show-solution"]')).toBeVisible();
    await e.getByLabel('5', { exact: true }).check();
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('a calculation with two fields: a partial simplification is recognised as such', async ({ page }) => {
    const e = await ex(page, 'simplify-72');
    await e.locator('[data-field="a"]').fill('2');
    await e.locator('[data-field="b"]').fill('18');
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'incorrect');
    await expect(e.locator('[data-feedback]')).toContainText('not fully simplified');
    await e.locator('[data-field="a"]').fill('6');
    await e.locator('[data-field="b"]').fill('2');
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('a construction is validated, not compared with a fixed answer', async ({ page }) => {
    const e = await ex(page, 'construct-side');
    for (const [side, ok] of [['0.7', false], ['0.07', true], ['7/100', true], ['0.0049', false], ['abc', false]] as const) {
      await e.locator('[data-field="side"]').fill(side);
      await check(e);
      await expect(e, side).toHaveAttribute('data-result', ok ? 'correct' : 'incorrect');
    }
  });
  test('a choice about meaning, and a choice about counting solutions', async ({ page }) => {
    const a = await ex(page, 'units-meaning');
    await a.getByLabel('3 m + 2 s').check();
    await check(a);
    await expect(a.locator('[data-feedback]')).toContainText('different kinds');
    await a.getByLabel('3 m × 2 s').check();
    await check(a);
    await expect(a).toHaveAttribute('data-result', 'correct');
    const b = await ex(page, 'even-root-count');
    await b.getByLabel('Two: x = 2 and x = −2').check();
    await check(b);
    await expect(b.locator('[data-feedback]')).toContainText('+16');
    await b.getByLabel('None').check();
    await check(b);
    await expect(b).toHaveAttribute('data-result', 'correct');
  });
  test('a negative exponent: the sign slip is named; the worked solution appears only after an attempt, and Reset clears it', async ({ page }) => {
    const e = await ex(page, 'negative-power');
    await expect(e.locator('[data-action="show-solution"]')).toHaveCount(0);
    await e.locator('[data-field="value"]').fill('-8');
    await check(e);
    await expect(e.locator('[data-feedback]')).toContainText('does not change the sign');
    await e.locator('[data-action="show-solution"]').click();
    await expect(e.locator('[data-solution]')).toContainText('1/8');
    await e.locator('[data-action="reset-exercise"]').click();
    await expect(e).toHaveAttribute('data-result', 'none');
    await expect(e.locator('[data-solution]')).toHaveCount(0);
    await e.locator('[data-field="value"]').fill('1/8');
    await check(e);
    await expect(e).toHaveAttribute('data-result', 'correct');
  });
  test('feedback is announced politely', async ({ page }) => {
    const e = await ex(page, 'zero-base');
    await expect(e.locator('.feedback')).toHaveAttribute('aria-live', 'polite');
  });
});

test.describe('code and tables', () => {
  test('the three reference files are shown, and the computed table flags the roundings', async ({ page }) => {
    await page.goto(PATH);
    for (const f of ['quantity_exact_roots.py', 'quantity_units.py', 'quantity_float_pitfalls.py']) await expect(page.locator('.code-file .file', { hasText: f })).toHaveCount(1);
    const rows = await page.locator('[data-table="exact-vs-double"] tbody tr').allTextContents();
    expect(rows).toHaveLength(5);
    expect(rows[0]).toContain('0.010000000000000002');
    expect(rows[1]).toContain('2.0000000000000004');
    expect(rows[3]).toContain('yes');
    await expect(page.locator('[data-table="exact-vs-double"] tbody tr').nth(2)).toHaveAttribute('data-agree', 'false');
    await expect(page.locator('[data-table="exact-vs-double"] tbody tr').nth(3)).toHaveAttribute('data-agree', 'true');
  });
});

test.describe('responsive', () => {
  test('no horizontal overflow, every stage fits the viewport width, and the new controls keep 44 px targets', async ({ page }) => {
    await page.goto(PATH);
    expect(await noPageOverflow(page)).toBe(true);
    for (const s of ['square', 'units', 'powers', 'roots', 'worked']) {
      const box = await page.locator(`[data-stage="${s}"]`).boundingBox();
      expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    }
    for (const sel of ['[data-stage="units"] select', '[data-stage="units"] .presets button', '[data-stage="roots"] label.segment']) {
      const heights = await page.locator(sel).evaluateAll(els => els.map(e => e.getBoundingClientRect().height));
      expect(Math.min(...heights), sel).toBeGreaterThanOrEqual(43.5);
    }
  });
});
