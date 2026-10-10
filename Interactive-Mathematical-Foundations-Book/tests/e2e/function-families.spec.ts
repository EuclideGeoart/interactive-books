/**
 * Essential function families (I.6): every stage checked from the DOM and from independently computed pixels (the plane windows are
 * hard-coded here: compare ±7, unit circle ±1.6, undo ±5 — never read back from the application's viewport code).
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { MINUS, noPageOverflow } from './helpers';

const PATH = 'chapters/function-families/';

async function open(page: Page, selector: string): Promise<Locator> {
  await page.goto(PATH);
  const stage = page.locator(selector).first();
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute('data-hydrated', 'true');
  await page.evaluate(() => document.fonts.ready);
  return stage;
}
const compare = (page: Page) => open(page, '[data-stage="compare"].stage-full');
const field = (stage: Locator, name: RegExp) => stage.getByRole('spinbutton', { name });
async function enter(stage: Locator, name: RegExp, text: string) {
  const f = field(stage, name);
  await f.fill(text);
  await f.press('Enter');
}
const lines = (stage: Locator, id: string) =>
  stage.locator(`[data-quantity="${id}"] dd .line`).evaluateAll(els => els.map(e => `${e.querySelector('.rel')?.textContent ?? ''} ${e.querySelector('.val')?.textContent ?? ''}`.replace(/\s+/g, ' ').trim()));
const status = (stage: Locator, id: string) => stage.locator(`[data-quantity="${id}"]`).getAttribute('data-status');

/** The square plane's content box and its pixels per world unit for a window of half-width `half`. */
async function plane(stage: Locator, half: number) {
  const box = await stage.locator('svg.plane').evaluate(svg => {
    const r = svg.getBoundingClientRect();
    const s = getComputedStyle(svg);
    const left = parseFloat(s.borderLeftWidth), top = parseFloat(s.borderTopWidth);
    return { x: r.left + left, y: r.top + top, width: r.width - left - parseFloat(s.borderRightWidth), height: r.height - top - parseFloat(s.borderBottomWidth) };
  });
  const scale = Math.min(box.width, box.height) / (2 * half);
  return { box, scale, at: (x: number, y: number) => ({ x: box.x + box.width / 2 + x * scale, y: box.y + box.height / 2 - y * scale }) };
}
const centre = async (el: Locator) => el.evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
const pathOf = (stage: Locator, part: string) => stage.locator(`path[data-part="${part}"]`).getAttribute('d');

test.describe('publication', () => {
  test('metadata, outline, six hydrated stages, ten exercises, two model-built tables', async ({ page }) => {
    await page.goto(PATH);
    await expect(page).toHaveTitle(/Essential function families/);
    await expect(page.locator('h1')).toHaveCount(1);
    const h2 = await page.locator('main h2').allTextContents();
    for (const heading of ['Intuition', 'Definition', 'Mechanics', 'Worked examples', 'Executable reference code', 'Explore', 'Common mistakes', 'Numerical considerations', 'Connections', 'Exercises', 'Summary and checkpoints'])
      expect(h2.some(t => t.includes(heading)), heading).toBe(true);
    for (const s of ['compare', 'undo', 'circle', 'base', 'worked']) {
      const stage = page.locator(`[data-stage="${s}"]`).first();
      await stage.scrollIntoViewIfNeeded();
      await expect(stage).toHaveAttribute('data-hydrated', 'true');
    }
    await expect(page.locator('[data-stage="compare"]')).toHaveCount(2);
    await expect(page.locator('[data-exercise]')).toHaveCount(10);
    // special angles: 13 rows, exact radicals; the pi/6 row is sqrt(3)/2 and 1/2
    const angles = page.locator('table[data-table="special-angles"] tbody tr');
    await expect(angles).toHaveCount(13);
    await expect(angles.nth(2)).toContainText('π/6');
    await expect(angles.nth(2)).toContainText('√3/2');
    await expect(angles.nth(2)).toContainText('0.866025');
    // exp limits: 710 overflows, -746 underflows, 709 is an ordinary double
    const limits = page.locator('table[data-table="exp-limits"] tbody tr');
    await expect(limits).toHaveCount(10);
    await expect(limits.filter({ hasText: /^710/ })).toContainText('= ∞');
    await expect(limits.filter({ hasText: /^710/ })).toContainText('overflow');
    await expect(limits.filter({ hasText: new RegExp(`^${MINUS}746`) })).toContainText('= 0');
    await expect(limits.filter({ hasText: new RegExp(`^${MINUS}746`) })).toContainText('underflow');
    await expect(limits.filter({ hasText: /^709/ })).toContainText('≈ 8.21841×10³⁰⁷');
  });
  test('no duplicate ids and no page overflow, with every island hydrated', async ({ page }) => {
    await page.goto(PATH);
    await page.locator('[data-stage="worked"][data-hydrated="true"]').waitFor();
    await page.locator('[data-exercise][data-hydrated="true"]').last().waitFor();
    const dupes = await page.evaluate(() => { const seen = new Map<string, number>(); document.querySelectorAll('[id]').forEach(e => seen.set(e.id, (seen.get(e.id) ?? 0) + 1)); return [...seen].filter(([, n]) => n > 1).map(([id]) => id); });
    expect(dupes).toEqual([]);
    expect(await noPageOverflow(page)).toBe(true);
  });
});

test.describe('compare stage', () => {
  test('starts as eˣ, ln and sin; toggling a family draws or removes exactly its curve; Reset restores', async ({ page }) => {
    const stage = await compare(page);
    await expect(stage).toHaveAttribute('data-visible', 'exp,ln,sin');
    for (const id of ['exp', 'ln', 'sin']) await expect(stage.locator(`path[data-part="curve-${id}"]`)).toHaveCount(1);
    await expect(stage.locator('path[data-part="curve-cos"]')).toHaveCount(0);
    await stage.locator('button[data-family="cos"]').click();
    await expect(stage.locator('path[data-part="curve-cos"]')).toHaveCount(1);
    await expect(stage.locator('button[data-family="cos"]')).toHaveAttribute('aria-pressed', 'true');
    await stage.locator('button[data-family="exp"]').click();
    await expect(stage.locator('path[data-part="curve-exp"]')).toHaveCount(0);
    await expect(stage).toHaveAttribute('data-visible', 'ln,sin,cos');
    await stage.locator('[data-action="reset"]').click();
    await expect(stage).toHaveAttribute('data-visible', 'exp,ln,sin');
  });
  test('values: 2·e^(x−1) at x = 2 is exactly computed, ln at x ≤ h is undefined with a reason, and the readout agrees with the facts cards', async ({ page }) => {
    const stage = await compare(page);
    await stage.locator('button[data-preset="all"]').click();
    await enter(stage, /vertical scale/, '2');
    await enter(stage, /horizontal shift/, '1');
    await enter(stage, /input/, '2');
    await expect(stage).toHaveAttribute('data-x', '2');
    expect(await lines(stage, 'value-linear')).toEqual(['= 2']); // 2·(2−1)
    expect(await lines(stage, 'value-square')).toEqual(['= 2']); // 2·1²
    const exp = (await lines(stage, 'value-exp'))[0]!;
    expect(exp.startsWith('≈ ')).toBe(true);
    expect(Number(exp.replace(/[^0-9.]/g, ''))).toBeCloseTo(2 * Math.E, 5); // 2·e¹ = 5.436564…
    expect(await lines(stage, 'value-ln')).toEqual(['= 0']); // ln 1
    await enter(stage, /input/, '0.5');
    expect(await status(stage, 'value-ln')).toBe('undefined');
    await expect(stage.locator('[data-quantity="value-ln"]')).toContainText('not positive');
    await expect(stage.locator('[data-verdict]')).toContainText('ln has no value');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
    // facts for 2·ln(x − 1): domain x > 1, zero at x = 2, vertical asymptote at x = 1
    const card = stage.locator('[data-fact="ln"]');
    await expect(card).toContainText('x > 1');
    await expect(card).toContainText('x = 2');
    await expect(card).toContainText('x = 1');
  });
  test('the curves depend on a, h and the visible set only: moving x does not change a path, changing a or h does', async ({ page }) => {
    const stage = await compare(page);
    const before = { exp: await pathOf(stage, 'curve-exp'), sin: await pathOf(stage, 'curve-sin'), ln: await pathOf(stage, 'curve-ln') };
    await enter(stage, /input/, '-4');
    await enter(stage, /input/, '4.5');
    expect(await pathOf(stage, 'curve-exp')).toBe(before.exp);
    expect(await pathOf(stage, 'curve-sin')).toBe(before.sin);
    expect(await pathOf(stage, 'curve-ln')).toBe(before.ln);
    await enter(stage, /vertical scale/, '2');
    expect(await pathOf(stage, 'curve-exp')).not.toBe(before.exp);
    await enter(stage, /horizontal shift/, '1');
    expect(await pathOf(stage, 'curve-ln')).not.toBe(before.ln);
  });
  test('drawn geometry: the x handle, the eˣ marker and the ln gap sit at independently computed pixels', async ({ page }) => {
    const stage = await compare(page);
    await stage.locator('svg.plane').evaluate(e => e.scrollIntoView({ block: 'center' }));
    let p = await plane(stage, 7);
    // canonical x = 1: handle on the axis at (1, 0); e¹ ≈ 2.718282 marker above it
    const handle = await centre(stage.locator('.drag-point .ring'));
    expect(handle.x).toBeCloseTo(p.at(1, 0).x, 0);
    expect(handle.y).toBeCloseTo(p.at(1, 0).y, 0);
    const marker = await centre(stage.locator('circle[data-part="marker-exp"]'));
    expect(marker.x).toBeCloseTo(p.at(1, Math.E).x, 0);
    expect(marker.y).toBeCloseTo(p.at(1, Math.E).y, 0);
    // h = 2: the ln gap covers the axis from the left edge (−7) to x = 2
    await enter(stage, /horizontal shift/, '2');
    p = await plane(stage, 7);
    const gap = await stage.locator('line[data-part="ln-gap"]').evaluate(e => ({ x1: Number(e.getAttribute('x1')), x2: Number(e.getAttribute('x2')) }));
    const svg = await stage.locator('svg.plane').boundingBox();
    const left = p.at(-7, 0).x - svg!.x, right = p.at(2, 0).x - svg!.x;
    expect(Math.min(gap.x1, gap.x2)).toBeCloseTo(left, 0);
    expect(Math.max(gap.x1, gap.x2)).toBeCloseTo(right, 0);
    // no gap when h is left of the window
    await enter(stage, /horizontal shift/, '-4');
    await expect(stage.locator('[data-part="ln-gap"]')).toHaveCount(1); // −4 is inside the window [−7, 7]: the gap runs from −7 to −4
  });
  test('dragging the handle moves x on the lattice; arrow keys step it; the field rejects values outside the domain', async ({ page }) => {
    const stage = await compare(page);
    await stage.locator('svg.plane').evaluate(e => e.scrollIntoView({ block: 'center' }));
    const p = await plane(stage, 7);
    const from = await centre(stage.locator('.drag-point .ring'));
    const to = p.at(-3, 0);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 10 });
    await page.mouse.up();
    await expect(stage).toHaveAttribute('data-x', '-3');
    await stage.locator('.drag-point').focus();
    await page.keyboard.press('ArrowRight');
    await expect(stage).toHaveAttribute('data-x', '-2.5');
    await page.keyboard.press('Shift+ArrowRight');
    await expect(stage).toHaveAttribute('data-x', '0');
    await enter(stage, /input/, '7');
    await expect(stage).toHaveAttribute('data-x', '0'); // rejected, not clamped
    await expect(stage.locator('.param-error')).toBeVisible();
    // typed values are not snapped to the 0.5 lattice: two decimals are accepted as typed
    await enter(stage, /vertical scale/, '2.75');
    await expect(stage).toHaveAttribute('data-a', '2.75');
    await enter(stage, /input/, '-1.25');
    await expect(stage).toHaveAttribute('data-x', '-1.25');
  });
  test('the model-built text alternative of the plane names the visible functions', async ({ page }) => {
    const stage = await compare(page);
    const id = await stage.locator('svg.plane').getAttribute('aria-describedby');
    const text = (await page.locator(`[id="${id}"]`).textContent())!;
    expect(text.length).toBeGreaterThan(60);
    expect(text).toMatch(/e to the x/);
    expect(text).toMatch(/natural log of x/);
  });
});

test.describe('undoing stage', () => {
  test('ln(e^800): the exponential overflows, the row says "as a double" with a note, and the identity fails on the computer', async ({ page }) => {
    const stage = await open(page, '[data-stage="undo"]');
    await stage.locator('button[data-preset="exp-overflow"]').click();
    await expect(stage).toHaveAttribute('data-x', '800');
    await expect(stage).toHaveAttribute('data-returned', 'false');
    expect(await lines(stage, 'step-1')).toEqual(['= ∞']);
    await expect(stage.locator('[data-quantity="step-1"]')).toContainText('larger than the largest double');
    expect(await status(stage, 'step-2')).toBe('undefined');
    await expect(stage.locator('[data-verdict]')).toHaveAttribute('data-agree', 'false');
    await stage.locator('button[data-preset="exp-underflow"]').click();
    expect(await lines(stage, 'step-1')).toEqual(['= 0']);
    await expect(stage.locator('[data-quantity="step-1"]')).toContainText('smaller than the smallest double');
  });
  test('√((−2)²): the sign is lost, the open ring lands at (4, 2) and the mirror point at (4, −2)', async ({ page }) => {
    const stage = await open(page, '[data-stage="undo"]');
    await stage.locator('button[data-preset="sq-sign"]').click();
    await expect(stage).toHaveAttribute('data-returned', 'false');
    await stage.locator('svg.plane').evaluate(e => e.scrollIntoView({ block: 'center' }));
    const p = await plane(stage, 5);
    for (const [part, x, y] of [['point-first', -2, 4], ['point-mirror', 4, -2], ['point-returned', 4, 2]] as const) {
      const c = await centre(stage.locator(`circle[data-part="${part}"]`));
      expect(c.x, part).toBeCloseTo(p.at(x, y).x, 0);
      expect(c.y, part).toBeCloseTo(p.at(x, y).y, 0);
    }
    await expect(stage.locator('circle[data-part="point-returned"]')).toHaveAttribute('data-filled', 'false');
  });
  test('ln(e^1.5) returns x; e^(ln −2) cannot start; switching the pair or the order keeps x', async ({ page }) => {
    const stage = await open(page, '[data-stage="undo"]');
    await stage.locator('button[data-preset="exp-fine"]').click();
    await expect(stage).toHaveAttribute('data-returned', 'true');
    await stage.locator('button[data-preset="ln-negative"]').click();
    await expect(stage).toHaveAttribute('data-returned', 'null');
    expect(await status(stage, 'step-1')).toBe('undefined');
    await enter(stage, /input/, '709.78');
    await expect(stage).toHaveAttribute('data-x', '709.78'); // typed values keep their two decimals (the lattice is for the handle only)
    await enter(stage, /input/, '3');
    await expect(stage).toHaveAttribute('data-x', '3');
    await expect(stage).toHaveAttribute('data-order', 'inverse-first');
    await stage.locator('label.segment', { hasText: /^forward first$/ }).click();
    await expect(stage).toHaveAttribute('data-order', 'forward-first');
    await expect(stage).toHaveAttribute('data-x', '3');
    await stage.locator('label.segment', { hasText: /^x², √$/ }).click();
    await expect(stage).toHaveAttribute('data-family', 'square');
    await expect(stage).toHaveAttribute('data-x', '3');
    await stage.locator('[data-action="reset"]').click();
    await expect(stage).toHaveAttribute('data-x', '1.5');
  });
});

test.describe('unit-circle stage', () => {
  test('7π/6: exact cos −√3/2 and sin −1/2, the handle at the computed pixels, and the verdict names quadrant III', async ({ page }) => {
    const stage = await open(page, '[data-stage="circle"]');
    await enter(stage, /angle, in steps/, '14');
    await expect(stage).toHaveAttribute('data-mode', 'exact');
    expect(Number(await stage.getAttribute('data-theta'))).toBeCloseTo(7 * Math.PI / 6, 9);
    expect(Number(await stage.getAttribute('data-cos'))).toBeCloseTo(-Math.sqrt(3) / 2, 12);
    expect(Number(await stage.getAttribute('data-sin'))).toBeCloseTo(-0.5, 12);
    expect((await lines(stage, 'cos'))[0]).toBe(`= ${MINUS}√3/2`);
    expect((await lines(stage, 'sin'))[0]).toBe(`= ${MINUS}1/2`);
    expect(await lines(stage, 'pythagoras')).toEqual(['= 1']);
    await expect(stage.locator('[data-verdict], .verdict').first()).toContainText('quadrant III');
    await stage.locator('svg.plane').evaluate(e => e.scrollIntoView({ block: 'center' }));
    const p = await plane(stage, 1.6);
    const h = await centre(stage.locator('.drag-point .ring'));
    expect(h.x).toBeCloseTo(p.at(-Math.sqrt(3) / 2, -0.5).x, 0);
    expect(h.y).toBeCloseTo(p.at(-Math.sqrt(3) / 2, -0.5).y, 0);
  });
  test('arrow keys turn the handle by π/12 counter-clockwise or clockwise; Shift turns by a quarter-turn', async ({ page }) => {
    const stage = await open(page, '[data-stage="circle"]');
    await stage.locator('.drag-point').focus();
    await page.keyboard.press('ArrowRight');
    expect(Number(await stage.getAttribute('data-theta'))).toBeCloseTo(3 * Math.PI / 12, 9);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    expect(Number(await stage.getAttribute('data-theta'))).toBeCloseTo(Math.PI / 12, 9);
    await page.keyboard.press('Shift+ArrowRight');
    expect(Number(await stage.getAttribute('data-theta'))).toBeCloseTo(Math.PI / 12 + Math.PI / 2, 9);
  });
  test('dragging the handle snaps to the nearest π/12 in exact mode and follows the pointer in free mode', async ({ page }) => {
    const stage = await open(page, '[data-stage="circle"]');
    await stage.locator('svg.plane').evaluate(e => e.scrollIntoView({ block: 'center' }));
    const p = await plane(stage, 1.6);
    const from = await centre(stage.locator('.drag-point .ring'));
    const target = (angle: number) => p.at(1.3 * Math.cos(angle), 1.3 * Math.sin(angle));
    let to = target(Math.PI / 2 + 0.05);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.mouse.up();
    expect(Number(await stage.getAttribute('data-theta'))).toBeCloseTo(Math.PI / 2, 9);
    await stage.locator('label.segment', { hasText: /^any angle$/ }).click();
    await expect(stage).toHaveAttribute('data-mode', 'free');
    await stage.locator('svg.plane').evaluate(e => e.scrollIntoView({ block: 'center' }));
    const p2 = await plane(stage, 1.6);
    const f2 = await centre(stage.locator('.drag-point .ring'));
    to = p2.at(1.3 * Math.cos(1), 1.3 * Math.sin(1));
    await page.mouse.move(f2.x, f2.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.mouse.up();
    expect(Number(await stage.getAttribute('data-theta'))).toBeCloseTo(1, 1);
    expect((await lines(stage, 'cos'))[0]!.startsWith('≈ ')).toBe(true);
  });
  test('a typed radian angle of 0.5 gives the double values; 7 is rejected, not clamped', async ({ page }) => {
    const stage = await open(page, '[data-stage="circle"]');
    await stage.locator('label.segment', { hasText: /^any angle$/ }).click();
    await enter(stage, /angle in radians/, '0.5');
    expect(Number(await stage.getAttribute('data-cos'))).toBeCloseTo(Math.cos(0.5), 12);
    expect(Number(await stage.getAttribute('data-sin'))).toBeCloseTo(Math.sin(0.5), 12);
    expect(await lines(stage, 'cos')).toEqual([`≈ ${Math.cos(0.5).toFixed(6)}`]);
    await enter(stage, /angle in radians/, '7');
    expect(Number(await stage.getAttribute('data-theta'))).toBeCloseTo(0.5, 12);
    await expect(stage.locator('.param-error')).toBeVisible();
  });
  test('arcsin(sin θ) is not θ outside the quadrants I and IV: the row and the verdict both say so', async ({ page }) => {
    const stage = await open(page, '[data-stage="circle"]');
    await stage.locator('button[data-preset="10"]').click(); // 5π/6
    await expect(stage.locator('.verdict').first()).toContainText('arcsin(sin θ) = π/6, not θ');
    expect((await lines(stage, 'arcsin'))[0]).toBe('= π/6 rad');
  });
});

test.describe('base stage', () => {
  test('doubling: 2³ = 8, log₂ 8 = 3, and the doubling time is exactly 1', async ({ page }) => {
    const stage = await open(page, '[data-stage="base"]');
    await stage.locator('button[data-preset="doubling"]').click();
    await expect(stage).toHaveAttribute('data-x', '3');
    expect(await lines(stage, 'power')).toEqual(['= 8']);
    await stage.getByRole('spinbutton', { name: /^x$|\bx\b/ }).first().fill('8');
    await stage.getByRole('spinbutton', { name: /^x$|\bx\b/ }).first().press('Enter');
    expect(await lines(stage, 'log')).toEqual(['= 3']);
    expect(await lines(stage, 'period')).toEqual(['= 1']);
  });
  test('base 1 is flagged as not an exponential; x ≤ 0 has no logarithm', async ({ page }) => {
    const stage = await open(page, '[data-stage="base"]');
    await stage.locator('button[data-preset="one"]').click();
    await expect(stage.locator('.verdict').first()).toContainText('not an exponential function');
    await expect(stage.locator('.verdict').first()).toHaveAttribute('data-agree', 'false');
    expect(await status(stage, 'log')).toBe('undefined');
    await stage.locator('button[data-preset="negative-x"]').click();
    expect(await status(stage, 'log')).toBe('undefined');
    expect(await lines(stage, 'power')).toEqual(['= 0.5']);
  });
  test('the identity checker: four cards, all within tolerance for 6, 4, 3; a non-positive number makes them undefined with a reason', async ({ page }) => {
    const stage = await open(page, '[data-stage="base"]');
    const cards = stage.locator('.identity-card');
    await expect(cards).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await expect(cards.nth(i)).toHaveAttribute('data-status', 'checked');
      await expect(cards.nth(i)).toHaveAttribute('data-within', 'true');
      await expect(cards.nth(i)).toContainText('tolerance');
    }
    await enter(stage, /first number/, '-1');
    for (let i = 0; i < 4; i++) {
      await expect(cards.nth(i)).toHaveAttribute('data-status', 'undefined');
      await expect(cards.nth(i)).toContainText('undefined');
    }
    await stage.locator('[data-action="reset"]').click();
    await expect(cards.first()).toHaveAttribute('data-status', 'checked');
  });
});

test.describe('worked examples', () => {
  test('each example steps forward to its final answer and back; Reset returns to the first step', async ({ page }) => {
    const stage = await open(page, '[data-stage="worked"]');
    const count = stage.locator('[data-trace-count]');
    const steps = { shift: 5, undo: 4, circle: 6, base: 5 } as const;
    for (const [id, n] of Object.entries(steps)) {
      await stage.locator(`button[data-example="${id}"]`).click();
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
  test('the circle example reaches cos = −√3/2 and sin = −1/2, and the base example reaches log₂ 10 ≈ 3.321928', async ({ page }) => {
    const stage = await open(page, '[data-stage="worked"]');
    await stage.locator('button[data-example="circle"]').click();
    for (let i = 0; i < 4; i++) await stage.getByRole('button', { name: /^Next/ }).click();
    await expect(stage.locator('.trace-body .formula').first()).toHaveAttribute('data-tex', /-\\frac\{\\sqrt\{3\}\}\{2\}.*-\\frac\{1\}\{2\}/);
    await stage.locator('button[data-example="base"]').click();
    for (let i = 0; i < 3; i++) await stage.getByRole('button', { name: /^Next/ }).click();
    await expect(stage.locator('.trace-body .formula').first()).toHaveAttribute('data-tex', /3\.321928/);
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
  test('a correct numeric answer is accepted; a named misconception gets its own hint; junk asks for numbers', async ({ page }) => {
    await page.goto(PATH);
    let form = await answer(page, 'cosine-quadrant', { cos: '-0.866' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    form = await answer(page, 'arcsin-of-sin', { value: '2' });
    await expect(form).toHaveAttribute('data-result', 'incorrect');
    await expect(form.locator('[data-feedback]')).toContainText('asin only answers');
    form = await answer(page, 'log-bits', { bits: 'ten' });
    await expect(form.locator('[data-feedback]')).toContainText('Enter a number');
  });
  test('a multiple-choice exercise names the mistake behind a wrong choice and accepts the right one', async ({ page }) => {
    await page.goto(PATH);
    let form = await answer(page, 'exp-overflow', { choice: 'inf' });
    await expect(form).toHaveAttribute('data-result', 'incorrect');
    await expect(form.locator('[data-feedback]')).toContainText('NumPy');
    form = await answer(page, 'exp-overflow', { choice: 'error' });
    await expect(form).toHaveAttribute('data-result', 'correct');
    await form.locator('[data-action="reset-exercise"]').click();
    await expect(form).toHaveAttribute('data-result', 'none');
  });
});
