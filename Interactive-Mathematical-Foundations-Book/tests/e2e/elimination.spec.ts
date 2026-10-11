import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Locator } from '@playwright/test';
const chapters = [
  { n: 14, kind: 'elimination', slug: 'gaussian-elimination', special: 'inconsistent' },
  { n: 15, kind: 'rank', slug: 'rank-invertibility', special: 'zero' },
  { n: 16, kind: 'inverse', slug: 'inverse-matrices', special: 'dependent' },
];
async function open(page: Page, c: typeof chapters[number]) {
  await page.goto(`chapters/${c.slug}/`); const stage = page.locator(`[data-stage="completion-${c.kind}"]`);
  await expect(stage).toHaveAttribute('data-hydrated', 'true'); return stage;
}
async function entry(stage: Locator, id: string, value: string) {
  const input = stage.locator(`[data-param="${id}"] input`); await input.fill(value); await input.press('Enter'); return input;
}
const state = async (stage: Locator) => JSON.parse((await stage.getAttribute('data-state'))!);
const answers: Record<string, string[]> = { 'elim-solve': ['2', '1'], 'elim-row': ['0', '1', '2'], 'rank-nullity': ['1'], 'rank-repeat': ['1'], 'rank-null': ['-2'], 'inv-value': ['1', '-1', '-1', '2'], 'inv-recover': ['2', '1'] };
for (const c of chapters) test.describe(`II.${c.n}: ${c.kind}`, () => {
  test('canonical mathematics and exceptional systems synchronize inspector and trace', async ({ page }) => {
    const stage = await open(page, c); await expect(stage).toHaveAttribute('data-rank', '2');
    if (c.kind === 'elimination') { await expect(stage).toHaveAttribute('data-result-x', '2'); await expect(stage).toHaveAttribute('data-result-y', '1'); }
    if (c.kind === 'inverse') { await expect(stage.locator('[data-quantity="identities"]')).toContainText('I and I, exactly'); await expect(stage.locator('[data-quantity="recovered"]')).toContainText('(2, 1)'); }
    await stage.locator(`[data-preset="${c.special}"]`).click();
    if (c.kind === 'elimination') { await expect(stage).toHaveAttribute('data-status', 'none'); await expect(stage.locator('[data-quantity="solution"]')).toHaveAttribute('data-status', 'undefined'); }
    else await expect(stage).toHaveAttribute('data-rank', c.kind === 'rank' ? '0' : '1');
    if (c.kind !== 'inverse') {
      for (const preset of ['swap', 'fraction', 'skipped', 'wide', 'tall']) { await stage.locator(`[data-preset="${preset}"]`).click(); await expect(stage.locator('[data-trace-index]')).toHaveAttribute('data-trace-index', '0'); }
      await stage.locator('[data-preset="skipped"]').click(); await expect(stage).toHaveAttribute('data-rank', '1'); await expect(stage.locator('[data-quantity="nullity"]')).toContainText('2');
    }
    await stage.locator('[data-preset="near"]').click(); await expect(stage).toHaveAttribute('data-rank', '2');
    await stage.locator('[data-preset="three"]').click(); await expect(stage).toHaveAttribute('data-rank', '3');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
  test('keyboard, exact decimals, rejection, announcement and reset share state', async ({ page }) => {
    const stage = await open(page, c), initial = await state(stage);
    await stage.locator('[data-param="a11"] input').press('ArrowUp'); expect((await state(stage)).a11).toBe(initial.a11 + 0.5);
    await expect(stage.locator('[data-announcement]')).not.toBeEmpty();
    await entry(stage, 'a11', '0.25'); expect((await state(stage)).a11).toBe(0.25);
    for (const value of ['9', '0.001', 'NaN', '1/0']) { const input = await entry(stage, 'a11', value); await expect(input).toHaveAttribute('aria-invalid', 'true'); expect((await state(stage)).a11).toBe(0.25); }
    await stage.locator('[data-param="a11"] input').press('Escape'); await stage.locator('[data-action="reset"]').click(); expect(await state(stage)).toEqual(initial);
  });
  test('actual matrix frames support previous, scrub and user-started replay', async ({ page }) => {
    await open(page, c); const work = page.locator(`[data-stage="completion-worked-${c.kind}"]`), trace = work.locator('[data-trace-index]');
    await work.getByRole('button', { name: /^Next/ }).click(); await expect(trace).toHaveAttribute('data-trace-index', '1');
    await expect(work.locator('table')).toBeVisible(); await expect(work.locator('.formula annotation')).not.toHaveCount(0);
    await work.getByRole('button', { name: /Previous/ }).click(); await expect(trace).toHaveAttribute('data-trace-index', '0');
    await work.getByRole('slider').press('ArrowRight'); await expect(trace).toHaveAttribute('data-trace-index', '1');
    await work.locator('[data-action="play"]').click(); await expect(trace).toHaveAttribute('data-playing', 'true');
    await expect(trace).toHaveAttribute('data-trace-index', '2', { timeout: 5000 }); await work.locator('[data-action="play"]').click();
    await work.getByRole('button', { name: 'Reset', exact: true }).click(); await expect(trace).toHaveAttribute('data-trace-index', '0');
  });
  test('all five exercises correct mistakes and show worked answers', async ({ page }) => {
    await open(page, c); const exercises = page.locator('[data-exercise]'); await expect(exercises).toHaveCount(5);
    for (const e of await exercises.all()) {
      const radios = e.locator('input[type="radio"]'), inputs = e.locator('[data-field]');
      if (await radios.count()) await radios.nth(1).check(); else for (const input of await inputs.all()) await input.fill('999');
      await e.locator('[data-action="check"]').click(); await expect(e).toHaveAttribute('data-result', 'incorrect');
      await e.locator('[data-action="show-solution"]').click(); await expect(e.locator('[data-solution]')).toBeVisible();
      await e.locator('[data-action="reset-exercise"]').click();
      if (await radios.count()) await radios.first().check(); else for (const [i, value] of answers[(await e.getAttribute('data-exercise'))!]!.entries()) await inputs.nth(i).fill(value);
      await e.locator('[data-action="check"]').click(); await expect(e).toHaveAttribute('data-result', 'correct');
    }
  });
  if (c.kind !== 'elimination') test('mouse and keyboard geometry use the exact input and drawn output', async ({ page }) => {
    const stage = await open(page, c), plot = stage.locator('[data-scene="0"]');
    await plot.locator('svg').evaluate(el => el.scrollIntoView({ block: 'center' }));
    const handle = plot.locator('[data-handle]').last(); await handle.press('ArrowRight');
    expect((await state(stage))[c.kind === 'rank' ? 'a12' : 'x1']).toBe(2.5);
    const hit = (await handle.locator('.hit').boundingBox())!, box = (await plot.locator('svg').boundingBox())!, radius = Number(await plot.getAttribute('data-radius'));
    const scale = Math.min(box.width, box.height) / (2*radius), end = { x: box.x + box.width/2 - .5*scale, y: box.y + box.height/2 - 1.5*scale };
    await page.mouse.move(hit.x + hit.width/2, hit.y + hit.height/2); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 8 }); await page.mouse.up();
    expect((await state(stage))[c.kind === 'rank' ? 'a12' : 'x1']).toBe(-.5);
    await expect(handle).toHaveAttribute('data-world-y', '1.5');
    const arrow = plot.locator(`[data-part="${c.kind === 'rank' ? 'column-1' : 'output'}"] path`);
    const actual = await arrow.evaluate(el => { const p = el as SVGPathElement, q = p.getPointAtLength(0); return { x: q.x, y: q.y }; });
    const s = await state(stage), result = c.kind === 'rank' ? [-.5, 1.5] : [s.a11*s.x1+s.a12*s.x2, s.a21*s.x1+s.a22*s.x2];
    const vb = await plot.locator('svg').getAttribute('viewBox'), parts = vb!.split(' ').map(Number), finalRadius = Number(await plot.getAttribute('data-radius')); 
    // SVG geometry queries return float32 coordinates even when the path uses binary64 values.
    expect(actual.x).toBeCloseTo(Math.fround(parts[2]!/2 + result[0]!*Math.min(parts[2]!,parts[3]!)/(2*finalRadius)), 5);
    expect(actual.y).toBeCloseTo(Math.fround(parts[3]!/2 - result[1]!*Math.min(parts[2]!,parts[3]!)/(2*finalRadius)), 5);
  });
  if (c.kind !== 'elimination') test('touch commits exact geometry with a 44px target', async ({ page, context, isMobile }) => {
    test.skip(!isMobile, 'touch emulation runs on mobile'); const stage = await open(page, c), plot = stage.locator('[data-scene="0"]');
    await plot.locator('svg').evaluate(el => el.scrollIntoView({ block: 'center' }));
    const handle = plot.locator('[data-handle]').last(), hit = (await handle.locator('.hit').boundingBox())!;
    expect(hit.width).toBeGreaterThanOrEqual(44); const box = (await plot.locator('svg').boundingBox())!, radius = Number(await plot.getAttribute('data-radius'));
    const scale = Math.min(box.width,box.height)/(2*radius), cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:hit.x+hit.width/2,y:hit.y+hit.height/2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width/2-.5*scale,y:box.y+box.height/2-1.5*scale}]});
    await expect(stage.locator('[data-announcement]')).toBeEmpty(); await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await cdp.detach();
    await expect(handle).toHaveAttribute('data-world-x','-0.5'); await expect(stage.locator('[data-announcement]')).not.toBeEmpty();
  });
  for (const theme of ['light', 'dark'] as const) test.describe(theme, () => {
    test.use({ colorScheme: theme });
    test('exceptional and invalid-entry states remain accessible', async ({ page }) => {
      const stage = await open(page, c); const scan = async () => {
        // Input focus scrolls unrelated presets underneath the frozen sticky header.
        await page.evaluate(() => window.scrollTo(0, 0));
        expect((await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']).analyze()).violations).toEqual([]);
      };
      await stage.locator(`[data-preset="${c.special}"]`).click(); await scan(); await entry(stage,'a11','9'); await scan();
    });
  });
});
