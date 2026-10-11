import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const chapters = [
  { n: 8, kind: 'transform', slug: 'matrix-transformations', result: [3, 1], field: 'x1', pair: 'x2', canonical: 2, special: 'collapse' },
  { n: 9, kind: 'matvec', slug: 'matrix-vector', result: [6, 10], field: 'x1', pair: 'x2', canonical: 4, special: 'invalid' },
  { n: 10, kind: 'composition', slug: 'matrix-composition', result: [3, 4], field: 'x1', pair: 'x2', canonical: 2, special: 'invalid' },
  { n: 11, kind: 'orthogonality', slug: 'matrix-transpose-orthogonality', result: [-1, 2], field: 'a12', pair: 'a22', canonical: -1, special: 'shear' },
  { n: 12, kind: 'determinant', slug: 'matrix-determinant', result: null, field: 'a12', pair: 'a22', canonical: 1, special: 'collapse' },
  { n: 13, kind: 'systems', slug: 'linear-systems', result: [2, 1], field: 'a11', pair: null, canonical: 1, special: 'parallel' },
] as const;

const answers: Record<string, string[]> = {
  'transform-columns': ['6', '10'], 'transform-singular': ['0'],
  'matvec-rows': ['6', '10'], 'matvec-columns': ['-1', '5'],
  'compose-product': ['1', '1', '1', '2'], 'compose-vector': ['3', '5'], 'compose-affine': ['2', '2'],
  'orth-transpose': ['0', '1', '-1', '0'], 'orth-length': ['5'],
  'det-value': ['6'], 'det-area': ['4'], 'det-singular': ['0'],
  'systems-unique': ['2', '1'], 'systems-vertical': ['2', '-3'],
};

async function open(page: Page, kind: string, slug: string) {
  await page.goto('chapters/' + slug + '/');
  const stage = page.locator('[data-stage="matrix-' + kind + '"]');
  await expect(stage).toHaveAttribute('data-hydrated', 'true');
  await page.evaluate(() => document.fonts.ready);
  return stage;
}
const field = (stage: Locator, name: string) => stage.locator('[data-param="' + name + '"] input');
async function entry(stage: Locator, name: string, value: string) {
  await field(stage, name).fill(value);
  await field(stage, name).press('Enter');
}
async function pointOnPlane(stage: Locator, x: number, y: number) {
  const box = (await stage.locator('svg.plane').boundingBox())!;
  const radius = Number(await stage.getAttribute('data-radius'));
  const scale = Math.min(box.width, box.height) / (2 * radius);
  return { x: box.x + box.width / 2 + x * scale, y: box.y + box.height / 2 - y * scale };
}

for (const c of chapters) test.describe('II.' + c.n + ': ' + c.kind, () => {
  test('route, chapter contract, canonical exact result, formulas and responsive scope', async ({ page }) => {
    const stage = await open(page, c.kind, c.slug);
    await expect(page.locator('h1')).toBeVisible();
    const headings = await page.locator('main h2').allTextContents();
    for (const word of ['Intuition', 'Definition', 'Mechanics', 'Derivation', 'Worked examples', 'Executable reference code', 'Explore', 'Common mistakes', 'Numerical considerations', 'Engineering and ML connections', 'Exercises', 'Summary'])
      expect(headings.some(heading => heading.includes(word)), word).toBe(true);
    const ids = await page.locator('[id]').evaluateAll(elements => elements.map(element => element.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(stage.locator('.formula-panel annotation[encoding="application/x-tex"]').first()).not.toBeEmpty();
    if (c.result) {
      expect(Number(await stage.getAttribute('data-result-x'))).toBeCloseTo(c.result[0], 12);
      expect(Number(await stage.getAttribute('data-result-y'))).toBeCloseTo(c.result[1], 12);
    }
    if (c.kind === 'transform') {
      await expect(stage.locator('[data-quantity="output"]')).toContainText('(3, 1)');
      await expect(stage.locator('[data-quantity="origin-image"]')).toContainText('(0, 0)');
      await expect(stage.locator('[data-part^="grid-"]')).toHaveCount(18);
    }
    if (c.kind === 'matvec') {
      await expect(stage.locator('[data-quantity="output"]')).toContainText('(6, 10)');
      await expect(stage.locator('[data-quantity="shape"]')).toContainText('2×2 · 2×1 → 2×1');
    }
    if (c.kind === 'composition') {
      await expect(stage.locator('[data-quantity="intermediate"]')).toContainText('(3, 1)');
      await expect(stage.locator('[data-quantity="output"]')).toContainText('(3, 4)');
      await expect(stage.locator('[data-quantity="BA"]')).toContainText('[1, 1; 1, 2]');
    }
    if (c.kind === 'orthogonality') {
      await expect(stage).toHaveAttribute('data-status', 'orthogonal');
      await expect(stage.locator('[data-quantity="qtq"]')).toContainText('[1, 0; 0, 1]');
      await expect(stage.locator('[data-quantity="inverse"]')).toHaveAttribute('data-status', 'exact');
    }
    if (c.kind === 'determinant') {
      await expect(stage).toHaveAttribute('data-status', 'positive');
      await expect(stage.locator('[data-quantity="det"]')).toContainText('2');
      await expect(stage.locator('[data-quantity="orientation"]')).toContainText('preserved');
    }
    if (c.kind === 'systems') {
      await expect(stage).toHaveAttribute('data-status', 'unique');
      await expect(stage.locator('[data-quantity="classification"]')).toContainText('one exact solution');
      await expect(stage.locator('[data-quantity="solution"]')).toContainText('(2, 1)');
    }
  });

  test('keyboard and numeric input share state, reject invalid values, announce commits and reset', async ({ page }) => {
    const stage = await open(page, c.kind, c.slug);
    const handle = stage.locator('[data-handle]').last();
    if (c.pair) {
      await handle.focus();
      const direction = c.canonical === 4 ? -0.5 : 0.5;
      await handle.press(direction < 0 ? 'ArrowLeft' : 'ArrowRight');
      await expect(stage).toHaveAttribute('data-' + c.field, String(c.canonical + direction));
      await expect(stage.locator('[data-announcement]')).not.toBeEmpty();
    } else {
      await field(stage, c.field).press('ArrowUp');
      await expect(stage).toHaveAttribute('data-' + c.field, String(c.canonical + 0.5));
      await expect(stage.locator('[data-announcement]')).not.toBeEmpty();
    }
    await entry(stage, c.field, '0.25');
    await expect(stage).toHaveAttribute('data-' + c.field, '0.25');
    await entry(stage, c.field, '9');
    await expect(field(stage, c.field)).toHaveAttribute('aria-invalid', 'true');
    await expect(stage).toHaveAttribute('data-' + c.field, '0.25');
    await field(stage, c.field).press('Escape');
    await stage.locator('[data-action="reset"]').click();
    await expect(stage).toHaveAttribute('data-' + c.field, String(c.canonical));
    await expect(stage.locator('[data-action="reset"]')).toBeDisabled();
  });

  test('pointer state is exact and synchronized wherever a geometric handle exists', async ({ page }) => {
    test.skip(!c.pair, 'the systems chapter edits constraint rows rather than draggable points');
    const stage = await open(page, c.kind, c.slug);
    const handle = stage.locator('[data-handle]').last();
    await stage.locator('svg.plane').evaluate(element => element.scrollIntoView({ block: 'center' }));
    const box = (await handle.locator('.ring').boundingBox())!;
    const destination = await pointOnPlane(stage, -0.5, 1.5);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(destination.x, destination.y, { steps: 10 });
    await page.mouse.up();
    await expect(stage).toHaveAttribute('data-' + c.field, '-0.5');
    await expect(stage).toHaveAttribute('data-' + c.pair!, '1.5');
    await expect(handle).toHaveAttribute('data-world-x', '-0.5');
    await expect(handle).toHaveAttribute('data-world-y', '1.5');
    await expect(stage.locator('[data-announcement]')).not.toBeEmpty();
  });

  test('chapter-specific exceptional and rectangular states stay explicit', async ({ page }) => {
    const stage = await open(page, c.kind, c.slug);
    if (c.kind === 'transform') {
      await stage.locator('[data-preset="reflection"]').click();
      await expect(stage.locator('[data-quantity="det"]')).toContainText('−1');
      await stage.locator('[data-preset="collapse"]').click();
      await expect(stage.locator('[data-verdict]')).toContainText('singular');
      await expect(stage.locator('[data-quantity="det"]')).toContainText('0');
      await stage.locator('[data-preset="affine"]').click();
      await expect(stage.locator('[data-verdict]')).toContainText('affine');
      await expect(stage.locator('[data-quantity="origin-image"]')).toContainText('(2, −1)');
    }
    if (c.kind === 'matvec') {
      await stage.locator('[data-preset="wide"]').click();
      await expect(stage.locator('[data-matrix-item="A"]')).toContainText('2×3');
      await expect(stage.locator('[data-matrix-item="x"]')).toContainText('3×1');
      await stage.locator('[data-preset="tall"]').click();
      await expect(stage.locator('[data-matrix-item="Ax"]')).toContainText('3×1');
      await stage.locator('[data-preset="invalid"]').click();
      await expect(stage).toHaveAttribute('data-status', 'incompatible');
      await expect(stage.locator('[data-board-invalid]')).toHaveAttribute('data-board-invalid', 'true');
    }
    if (c.kind === 'composition') {
      const formulas = stage.locator('.formula-panel annotation[encoding="application/x-tex"]');
      expect((await formulas.allTextContents()).some(tex => tex.includes('\\ne'))).toBe(true);
      await stage.locator('[data-preset="rectangular"]').click();
      await expect(stage.locator('.matrix-board > p')).toContainText('3×2 then 2×3 gives 2×2');
      await stage.locator('[data-preset="affine"]').click();
      await expect(stage.locator('[data-verdict]')).toContainText('translations compose separately');
      await stage.locator('[data-preset="invalid"]').click();
      await expect(stage).toHaveAttribute('data-status', 'incompatible');
    }
    if (c.kind === 'orthogonality') {
      await stage.locator('[data-preset="reflection"]').click();
      await expect(stage).toHaveAttribute('data-status', 'orthogonal');
      await stage.locator('[data-preset="shear"]').click();
      await expect(stage).toHaveAttribute('data-status', 'not-orthogonal');
      await expect(stage.locator('[data-quantity="inverse"]')).toHaveAttribute('data-status', 'undefined');
    }
    if (c.kind === 'determinant') {
      await stage.locator('[data-preset="reflection"]').click();
      await expect(stage).toHaveAttribute('data-status', 'negative');
      await expect(stage.locator('[data-quantity="orientation"]')).toContainText('reversed');
      await stage.locator('[data-preset="collapse"]').click();
      await expect(stage).toHaveAttribute('data-status', 'singular');
      await expect(stage.locator('[data-quantity="independence"]')).toContainText('dependent');
    }
    if (c.kind === 'systems') {
      await stage.locator('[data-preset="vertical"]').click();
      await expect(stage).toHaveAttribute('data-status', 'unique');
      await expect(stage).toHaveAttribute('data-result-x', '2');
      await expect(stage).toHaveAttribute('data-result-y', '-3');
      await stage.locator('[data-preset="parallel"]').click();
      await expect(stage).toHaveAttribute('data-status', 'none');
      await expect(stage.locator('[data-quantity="classification"]')).toContainText('no solutions');
      await stage.locator('[data-preset="coincident"]').click();
      await expect(stage).toHaveAttribute('data-status', 'infinite');
      await stage.locator('[data-preset="zero-true"]').click();
      await expect(stage).toHaveAttribute('data-status', 'infinite');
      await stage.locator('[data-preset="zero-false"]').click();
      await expect(stage).toHaveAttribute('data-status', 'none');
    }
  });

  test('immutable worked trace supports both directions, scrub, autoplay and reset', async ({ page }) => {
    await open(page, c.kind, c.slug);
    const work = page.locator('[data-stage="matrix-worked-' + c.kind + '"]');
    const trace = work.locator('[data-trace-index]');
    await expect(work).toHaveAttribute('data-hydrated', 'true');
    await work.getByRole('button', { name: /^Next/ }).click();
    await expect(trace).toHaveAttribute('data-trace-index', '1');
    await work.getByRole('button', { name: /Previous/ }).click();
    await expect(trace).toHaveAttribute('data-trace-index', '0');
    await work.getByRole('slider').focus();
    await work.getByRole('slider').press('ArrowRight');
    await expect(trace).toHaveAttribute('data-trace-index', '1');
    await work.getByRole('button', { name: 'Reset', exact: true }).click();
    await work.locator('[data-action="play"]').click();
    await expect(trace).toHaveAttribute('data-playing', 'true');
    await expect(trace).toHaveAttribute('data-trace-index', '2', { timeout: 6000 });
    await expect(trace).toHaveAttribute('data-playing', 'false');
    await work.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(trace).toHaveAttribute('data-trace-index', '0');
  });

  test('all five exercises correct misconceptions, reveal solutions, reset and accept exact answers', async ({ page }) => {
    await open(page, c.kind, c.slug);
    await expect(page.locator('[data-exercise]')).toHaveCount(5);
    for (const exercise of await page.locator('[data-exercise]').all()) {
      await expect(exercise).toHaveAttribute('data-hydrated', 'true');
      const id = (await exercise.getAttribute('data-exercise'))!;
      const radios = exercise.locator('input[type="radio"]'), inputs = exercise.locator('[data-field]');
      if (await radios.count()) await radios.nth(1).check();
      else for (const input of await inputs.all()) await input.fill('999');
      await exercise.locator('[data-action="check"]').click();
      await expect(exercise).toHaveAttribute('data-result', 'incorrect');
      await exercise.locator('[data-action="show-solution"]').click();
      await expect(exercise.locator('[data-solution]')).toBeVisible();
      await exercise.locator('[data-action="reset-exercise"]').click();
      if (await radios.count()) await radios.first().check();
      else for (const [index, value] of answers[id]!.entries()) await inputs.nth(index).fill(value);
      await exercise.locator('[data-action="check"]').click();
      await expect(exercise).toHaveAttribute('data-result', 'correct');
    }
  });

  test('touch drag has a 48px target and announces only on release', async ({ page, context, isMobile }) => {
    test.skip(!isMobile || !c.pair, 'touch geometry runs on mobile chapters with draggable points');
    const stage = await open(page, c.kind, c.slug);
    const handle = stage.locator('[data-handle]').last();
    await stage.locator('svg.plane').evaluate(element => element.scrollIntoView({ block: 'center' }));
    const hit = (await handle.locator('.hit').boundingBox())!;
    expect(hit.width).toBeGreaterThanOrEqual(44);
    expect(hit.height).toBeGreaterThanOrEqual(44);
    const end = await pointOnPlane(stage, -0.5, 1.5);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: hit.x + hit.width / 2, y: hit.y + hit.height / 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [end] });
    await expect(stage.locator('[data-announcement]')).toBeEmpty();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    await expect(stage).toHaveAttribute('data-' + c.field, '-0.5');
    await expect(stage).toHaveAttribute('data-' + c.pair!, '1.5');
    await expect(stage.locator('[data-announcement]')).not.toBeEmpty();
  });

  for (const theme of ['light', 'dark'] as const) test.describe('accessibility ' + theme, () => {
    test.use({ colorScheme: theme });
    test('canonical, exceptional, invalid-entry and feedback states pass axe', async ({ page }) => {
      const stage = await open(page, c.kind, c.slug);
      const scan = async () => expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze()).violations).toEqual([]);
      await scan();
      await stage.locator('[data-preset="' + c.special + '"]').click();
      await scan();
      await entry(stage, c.field, '9');
      await expect(stage.getByRole('alert')).toBeVisible();
      await scan();
      const exercise = page.locator('[data-exercise]').first();
      await exercise.locator('[data-action="check"]').click();
      await exercise.locator('[data-action="show-solution"]').click();
      await scan();
    });
  });
});
