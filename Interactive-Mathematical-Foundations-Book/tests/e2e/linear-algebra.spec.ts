import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const chapters = [
  { kind: 'addition', slug: 'vector-addition', vx: 1, vy: 2, result: [3, 3], arrow: 'sum', special: 'opposites', quantity: 'sum' },
  { kind: 'scaling', slug: 'vector-scaling', vx: 3, vy: 2, result: [-4.5, -3], arrow: 'scaled', special: 'k0', quantity: 'direction' },
  { kind: 'norms', slug: 'vector-norms', vx: 3, vy: 4, result: [0.6, 0.8], arrow: 'unit', special: 'zero', quantity: 'unit' },
  { kind: 'dot', slug: 'vector-dot-product', vx: 2, vy: 2, result: null, arrow: null, special: 'zero', quantity: 'angle' },
  { kind: 'projection', slug: 'vector-projection', vx: 1, vy: 3, result: [2, 1], arrow: 'projection', special: 'zero-direction', quantity: 'projection' },
  { kind: 'span', slug: 'vector-span', vx: 1, vy: 2, result: [1.5, 0], arrow: 'combination', special: 'dependent', quantity: 'rank' },
  { kind: 'basis', slug: 'vector-basis', vx: 1, vy: 2, result: [3, 0], arrow: 'target', special: 'dependent', quantity: 'a' },
] as const;
const answers: Record<string, string[]> = {
  'add-sum': ['2', '2'], 'add-difference': ['-4', '6'], 'add-missing': ['3', '-4'],
  'scale-value': ['-6', '2'], 'scale-length': ['7.5'], 'scale-missing': ['-0.5'],
  'norm-length': ['5', '7', '4'], 'norm-unit': ['-3/5', '4/5'], 'norm-construct': ['4/5'],
  'dot-value': ['2'], 'dot-cancel': ['0'], 'dot-construct': ['-2'],
  'proj-vector': ['2', '1'], 'proj-residual': ['-1', '2'], 'proj-construct': ['-1'],
  'span-combine': ['1.5', '0'], 'span-redundant': ['1', '2'], 'span-construct': ['-1', '3'],
  'basis-coordinates': ['2', '-1'], 'basis-det': ['0'], 'basis-target': ['0', '3'],
};
async function open(page: Page, kind: string, slug: string) {
  await page.goto(`chapters/${slug}/`);
  const stage = page.locator(`[data-stage="la-${kind}"]`);
  await expect(stage).toHaveAttribute('data-hydrated', 'true');
  await page.evaluate(() => document.fonts.ready);
  return stage;
}
const field = (stage: Locator, name: string) => stage.locator(`[data-param="${name}"] input`);
async function entry(stage: Locator, name: string, text: string) { await field(stage, name).fill(text); await field(stage, name).press('Enter'); }
async function pointOnPlane(stage: Locator, x: number, y: number) {
  const box = (await stage.locator('svg.plane').boundingBox())!, radius = Number(await stage.getAttribute('data-radius'));
  const scale = Math.min(box.width, box.height) / (2 * radius);
  return { x: box.x + box.width / 2 + x * scale, y: box.y + box.height / 2 - y * scale };
}
async function resultGeometry(stage: Locator, name: string, expected: readonly number[]) {
  expect(Number(await stage.getAttribute('data-result-x'))).toBeCloseTo(expected[0]!, 14);
  expect(Number(await stage.getAttribute('data-result-y'))).toBeCloseTo(expected[1]!, 14);
  const head = await stage.locator(`[data-part="${name}"] path`).getAttribute('d');
  const xy = head!.match(/^M([\d.e+-]+) ([\d.e+-]+)/)!;
  const box = (await stage.locator('svg.plane').boundingBox())!, screen = await pointOnPlane(stage, expected[0]!, expected[1]!);
  expect(Math.abs(Number(xy[1]) - (screen.x - box.x))).toBeLessThan(0.15);
  expect(Math.abs(Number(xy[2]) - (screen.y - box.y))).toBeLessThan(0.15);
}

for (const c of chapters) test.describe(`II.${chapters.indexOf(c) + 1}: ${c.kind}`, () => {
  test('real route, chapter contract, canonical math and geometry, scope and ids', async ({ page }) => {
    const stage = await open(page, c.kind, c.slug);
    await expect(page.locator('h1')).toBeVisible();
    const headings = await page.locator('main h2').allTextContents();
    for (const word of ['Intuition', 'Definition', 'Mechanics', 'Derivation', 'Worked examples', 'Executable reference code', 'Explore', 'Common mistakes', 'Numerical considerations', 'Engineering and ML connections', 'Exercises', 'Summary']) expect(headings.some(h => h.includes(word)), word).toBe(true);
    const ids = await page.locator('[id]').evaluateAll(es => es.map(e => e.id)); expect(new Set(ids).size).toBe(ids.length);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const levels = await page.locator('main :is(h1,h2,h3,h4)').evaluateAll(es => es.map(e => Number(e.tagName[1])));
    for (let i = 1; i < levels.length; i++) expect(levels[i]! - levels[i-1]!).toBeLessThanOrEqual(1);
    await expect(stage).toHaveAttribute('data-vx', String(c.vx)); await expect(stage).toHaveAttribute('data-vy', String(c.vy));
    if (c.result && c.arrow) await resultGeometry(stage, c.arrow, c.result);
    await expect(stage.locator('[data-quantity="v"]')).toContainText(`(${c.vx}, ${c.vy})`);
    const formulas = await stage.locator('.formula-panel annotation[encoding="application/x-tex"]').allTextContents();
    if (c.result && c.kind !== 'norms') {
      const quantity = c.kind === 'span' ? 'w' : c.kind === 'basis' ? 'target' : c.arrow;
      const components = `(${c.result[0]}, ${c.result[1]})`.replaceAll('-', '−');
      await expect(stage.locator(`[data-quantity="${quantity}"]`)).toContainText(components);
      expect(formulas.some(t => t.includes(`\\begin{bmatrix}${c.result[0]}\\\\${c.result[1]}\\end{bmatrix}`))).toBe(true);
    }
    if (c.kind === 'norms') {
      await expect(stage.locator('[data-quantity="unit-x"]')).toContainText('0.600000'); await expect(stage.locator('[data-quantity="unit-y"]')).toContainText('0.800000');
      expect(formulas.some(t => t.includes('\\frac{1}{5}\\begin{bmatrix}3\\\\4\\end{bmatrix}'))).toBe(true);
    }
    if (c.kind === 'dot') { await expect(stage.locator('[data-quantity="dot"]')).toContainText('6'); await expect(stage.locator('[data-quantity="angle"]')).toContainText('0.785398'); expect(formulas.some(t => t.includes('=6+(0)=6'))).toBe(true); }
    if (c.kind === 'basis') { await expect(stage.locator('[data-quantity="a"]')).toContainText('2'); await expect(stage.locator('[data-quantity="b"]')).toContainText('−1'); }
  });
  test('keyboard, coarse stepping, precise entry, rejected entry, reset and commit announcements', async ({ page }) => {
    const stage = await open(page, c.kind, c.slug);
    const vhandle = stage.getByRole('button', { name: /^vector v / });
    await vhandle.focus(); await vhandle.press('ArrowLeft'); await expect(stage).toHaveAttribute('data-vx', String(c.vx - 0.5));
    await vhandle.press('Shift+ArrowLeft'); await expect(stage).toHaveAttribute('data-vx', String(Math.max(-4, c.vx - 3)));
    await expect(stage.locator('[data-announcement]')).not.toBeEmpty();
    await entry(stage, 'vx', '0.25'); await expect(stage).toHaveAttribute('data-vx', '0.25');
    await entry(stage, 'vx', '9'); await expect(field(stage, 'vx')).toHaveAttribute('aria-invalid', 'true'); await expect(stage).toHaveAttribute('data-vx', '0.25');
    await entry(stage, 'vx', '0.001'); await expect(field(stage, 'vx')).toHaveAttribute('aria-invalid', 'true'); await expect(stage).toHaveAttribute('data-vx', '0.25');
    await field(stage, 'vx').press('Escape');
    await stage.locator('[data-action="reset"]').click(); await expect(stage).toHaveAttribute('data-vx', String(c.vx));
    await expect(stage.locator('[data-action="reset"]')).toBeDisabled();
  });
  test('pointer move synchronizes handle, exact inspector and formulas', async ({ page }) => {
    const stage = await open(page, c.kind, c.slug), handle = stage.getByRole('button', { name: /^vector v / });
    await stage.locator('svg.plane').evaluate(e => e.scrollIntoView({ block: 'center' }));
    const box = (await handle.boundingBox())!, to = await pointOnPlane(stage, 0.5, 1.5);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 12 }); await page.mouse.up();
    await expect(stage).toHaveAttribute('data-vx', '0.5'); await expect(stage).toHaveAttribute('data-vy', '1.5');
    await expect(stage.locator('[data-quantity="v"]')).toContainText('(0.5, 1.5)');
    await expect(handle).toHaveAttribute('data-world-x', '0.5'); await expect(handle).toHaveAttribute('data-world-y', '1.5');
    const expected = await pointOnPlane(stage, 0.5, 1.5), ring = (await handle.locator('.ring').boundingBox())!;
    expect(Math.abs(ring.x + ring.width / 2 - expected.x)).toBeLessThan(0.2); expect(Math.abs(ring.y + ring.height / 2 - expected.y)).toBeLessThan(0.2);
    await expect(stage.locator('[data-announcement]')).not.toBeEmpty();
    if (c.kind === 'addition') await resultGeometry(stage, 'sum', [2.5, 2.5]);
    if (c.kind === 'scaling') await resultGeometry(stage, 'scaled', [-0.75, -2.25]);
    if (c.kind === 'span') await resultGeometry(stage, 'combination', [1.75, 0.25]);
    await expect(stage.locator('.formula-panel')).toBeVisible();
  });
  test('two-place decimal vectors keep exact values and formulas inside the page', async ({ page }) => {
    const stage = await open(page, c.kind, c.slug);
    await entry(stage, 'vx', '3.97'); await entry(stage, 'vy', '-3.99');
    if (await field(stage, 'ux').count()) { await entry(stage, 'ux', '3.01'); await entry(stage, 'uy', '-2.99'); }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(stage.locator('[data-quantity="v"]')).toContainText('(3.97, −3.99)');
  });
  test('each additional direction, coefficient, target and operation reaches the same model', async ({ page }) => {
    const stage = await open(page, c.kind, c.slug);
    if (await field(stage, 'ux').count()) {
      const u = stage.getByRole('button', { name: /^vector u / });
      const oldY = Number(await stage.getAttribute('data-uy'));
      await u.focus(); await u.press('ArrowUp'); await expect(stage).toHaveAttribute('data-uy', String(oldY + 0.5));
      await stage.locator('[data-action="reset"]').click();
      await stage.locator('svg.plane').evaluate(e => e.scrollIntoView({ block: 'center' }));
      const box = (await u.locator('.ring').boundingBox())!, at = await pointOnPlane(stage, -1, 1);
      await page.mouse.move(box.x + box.width/2, box.y + box.height/2); await page.mouse.down(); await page.mouse.move(at.x, at.y, { steps: 8 }); await page.mouse.up();
      await expect(stage).toHaveAttribute('data-ux', '-1'); await expect(stage).toHaveAttribute('data-uy', '1');
      await expect(stage).toHaveAttribute('data-vx', String(c.vx)); await stage.locator('[data-action="reset"]').click();
    }
    if (c.kind === 'addition') {
      await stage.locator('[data-action="swap"]').click(); await resultGeometry(stage, 'sum', [3, 3]);
      await expect(stage.locator('[data-quantity="difference"]')).toContainText('(1, −1)');
    }
    if (c.kind === 'dot') {
      await stage.locator('[data-action="rotate"]').click(); await expect(stage.locator('[data-quantity="dot"]')).toContainText('−6');
      await expect(stage.locator('[data-quantity="angle"]')).toContainText('2.356194');
    }
    if (c.kind === 'scaling') {
      await field(stage, 'a').press('ArrowUp'); await resultGeometry(stage, 'scaled', [-3.75, -2.5]);
      await entry(stage, 'a', '0'); await expect(stage.locator('[data-quantity="direction"]')).toHaveAttribute('data-status', 'undefined');
    }
    if (c.kind === 'norms') { await entry(stage, 'vy', '-4'); await resultGeometry(stage, 'unit', [0.6, -0.8]); }
    if (c.kind === 'span') {
      await field(stage, 'a').press('ArrowUp'); await resultGeometry(stage, 'combination', [2, 0.25]);
      await entry(stage, 'b', '0.75'); await resultGeometry(stage, 'combination', [3.25, 2.75]);
    }
    if (c.kind === 'basis') {
      const p = stage.getByRole('button', { name: /^target p / }); await p.focus(); await p.press('ArrowDown'); await expect(stage).toHaveAttribute('data-py', '-0.5');
      await entry(stage, 'px', '1.25'); await entry(stage, 'py', '2.75'); await resultGeometry(stage, 'target', [1.25, 2.75]);
      await stage.locator('svg.plane').evaluate(e => e.scrollIntoView({ block: 'center' }));
      const box = (await p.locator('.ring').boundingBox())!, at = await pointOnPlane(stage, 1, 3);
      await page.mouse.move(box.x + box.width/2, box.y + box.height/2); await page.mouse.down(); await page.mouse.move(at.x, at.y, { steps: 8 }); await page.mouse.up();
      await resultGeometry(stage, 'target', [1, 3]);
    }
  });
  test('zero and singular cases expose the mathematical exception or collapsed geometry', async ({ page }) => {
    const stage = await open(page, c.kind, c.slug);
    await stage.locator(`[data-preset="${c.special}"]`).click();
    const q = stage.locator(`[data-quantity="${c.quantity}"]`);
    if (['scaling', 'norms', 'dot', 'projection', 'basis'].includes(c.kind)) await expect(q).toHaveAttribute('data-status', 'undefined');
    if (c.kind === 'addition') { await expect(q).toContainText('(0, 0)'); await expect(stage.locator('[data-part="sum"]')).toHaveCount(0); }
    if (c.kind === 'span') { await expect(stage).toHaveAttribute('data-rank', '1'); await expect(stage.locator('[data-part="reachable"]')).toHaveCount(0); await expect(stage.locator('[data-part="reachable-line"]')).toHaveCount(1); }
    if (c.kind === 'basis') {
      await expect(stage.locator('[data-verdict]')).toContainText('outside the span'); await entry(stage, 'py', '3');
      await expect(stage.locator('[data-verdict]')).toContainText('infinitely many'); await expect(q).toHaveAttribute('data-status', 'undefined');
      await stage.locator('[data-preset="near"]').click(); await expect(stage).toHaveAttribute('data-rank', '2'); await expect(stage.locator('[data-verdict]')).toContainText('almost collinear');
    }
  });
  test('immutable worked trace supports forward, backward, scrub, play and reset', async ({ page }) => {
    await open(page, c.kind, c.slug); const work = page.locator(`[data-stage="la-worked-${c.kind}"]`), trace = work.locator('[data-trace-index]');
    await expect(work).toHaveAttribute('data-hydrated', 'true'); await work.getByRole('button', { name: /^Next/ }).click(); await expect(trace).toHaveAttribute('data-trace-index', '1');
    await work.getByRole('button', { name: /Previous/ }).click(); await expect(trace).toHaveAttribute('data-trace-index', '0');
    await work.getByRole('slider').focus(); await work.getByRole('slider').press('ArrowRight'); await expect(trace).toHaveAttribute('data-trace-index', '1');
    await work.getByRole('button', { name: 'Reset', exact: true }).click();
    await work.locator('[data-action="play"]').click(); await expect(trace).toHaveAttribute('data-playing', 'true');
    await expect(trace).toHaveAttribute('data-trace-index', c.kind === 'basis' ? '2' : '1', { timeout: 6000 });
    await expect(trace).toHaveAttribute('data-playing', 'false'); await work.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(trace).toHaveAttribute('data-trace-index', '0');
  });
  test('all exercises provide correction, worked solution, reset and success', async ({ page }) => {
    await open(page, c.kind, c.slug);
    for (const exercise of await page.locator('[data-exercise]').all()) {
      await expect(exercise).toHaveAttribute('data-hydrated', 'true'); const id = (await exercise.getAttribute('data-exercise'))!;
      const radios = exercise.locator('input[type="radio"]'), inputs = exercise.locator('[data-field]');
      if (await radios.count()) await radios.nth(1).check(); else for (const f of await inputs.all()) await f.fill('999');
      await exercise.locator('[data-action="check"]').click(); await expect(exercise).toHaveAttribute('data-result', 'incorrect');
      await exercise.locator('[data-action="show-solution"]').click(); await expect(exercise.locator('[data-solution]')).toBeVisible();
      await exercise.locator('[data-action="reset-exercise"]').click(); await expect(exercise).toHaveAttribute('data-result', 'none');
      if (await radios.count()) await radios.first().check(); else for (const [i, value] of answers[id]!.entries()) await inputs.nth(i).fill(value);
      await exercise.locator('[data-action="check"]').click(); await expect(exercise).toHaveAttribute('data-result', 'correct');
    }
  });
  test('real touch drag uses a 48px target and commits once at release', async ({ page, context, isMobile }) => {
    test.skip(!isMobile, 'touch emulation belongs to the mobile project');
    const stage = await open(page, c.kind, c.slug), handle = stage.getByRole('button', { name: /^vector v / });
    await stage.locator('svg.plane').evaluate(e => e.scrollIntoView({ block: 'center' }));
    const hit = (await handle.locator('.hit').boundingBox())!; expect(hit.width).toBeGreaterThanOrEqual(44); expect(hit.height).toBeGreaterThanOrEqual(44);
    const start = { x: hit.x + hit.width / 2, y: hit.y + hit.height / 2 }, end = await pointOnPlane(stage, 0.5, 1.5), cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [end] });
    await expect(stage.locator('[data-announcement]')).toBeEmpty();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
    await expect(stage).toHaveAttribute('data-vx', '0.5'); await expect(stage).toHaveAttribute('data-vy', '1.5'); await expect(stage.locator('[data-announcement]')).not.toBeEmpty();
    expect(await stage.locator('svg.plane').evaluate(e => getComputedStyle(e).touchAction)).not.toBe('none');
  });
  for (const theme of ['light', 'dark'] as const) test.describe(`accessibility ${theme}`, () => {
    test.use({ colorScheme: theme });
    test('normal and unusual states, rejected entry and feedback pass axe', async ({ page }) => {
      const stage = await open(page, c.kind, c.slug);
      const scan = async () => expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze()).violations).toEqual([]);
      await scan(); await stage.locator(`[data-preset="${c.special}"]`).click(); await scan();
      await entry(stage, 'vx', '9'); await expect(stage.getByRole('alert')).toBeVisible(); await scan();
      const ex = page.locator('[data-exercise]').first(); await ex.locator('[data-action="check"]').click(); await ex.locator('[data-action="show-solution"]').click(); await scan();
    });
  });
});

test('publication counts and reading order cross I.9 → II.1, II.7 → II.8, and stop before II.14', async ({ page }) => {
  await page.goto('contents/'); await expect(page.locator('main .lede')).toContainText('22 of 97');
  for (const c of chapters) await expect(page.locator(`main a[href$="chapters/${c.slug}/"]`)).toHaveCount(1);
  await page.goto('chapters/notation-map/'); await page.locator('nav.chapter-pager .pager-next').click(); await expect(page).toHaveURL(/chapters\/vector-addition\/$/);
  await page.goto('chapters/vector-basis/'); const next = page.locator('nav.chapter-pager .pager-next'); await expect(next).toContainText('II.8'); await next.click(); await expect(page).toHaveURL(/chapters\/matrix-transformations\/$/);
  await page.goto('chapters/linear-systems/'); const planned = page.locator('nav.chapter-pager .pager-next'); await expect(planned).toContainText('II.14'); await expect(planned).not.toHaveAttribute('href');
});
