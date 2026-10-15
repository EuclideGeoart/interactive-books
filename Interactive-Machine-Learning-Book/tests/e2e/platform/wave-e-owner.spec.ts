import { test, expect, type Locator, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { validationSignature } from '../../../scripts/production-state.mjs';

const mount = process.env.BOOK_TEST_DIST === 'dist-subpath' ? 'subpath' : 'root';
const sourceHead = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const sourceSignature = validationSignature();

async function commit(root: Locator, label: RegExp, value: string) {
  const input = root.getByRole('textbox', { name: label });
  await input.fill(value); await input.press('Enter');
  await expect(input).toHaveAttribute('aria-invalid', 'false');
}

async function capture(page: Page, root: Locator, chapter: { id: string; slug: string }, state: string, project: string) {
  await page.evaluate(() => document.fonts.ready);
  const stage = root.locator('xpath=ancestor::figure[contains(@class,"stage")]');
  const directory = `artifacts/wave-e-visuals/${mount}`;
  mkdirSync(directory, { recursive: true });
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    const geometry = await stage.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return { text: node.textContent, width: rect.width, height: rect.height,
        numericalState: [...node.querySelectorAll('[data-state]')].map(el => JSON.parse(el.getAttribute('data-state')!)),
        numericalResult: [...node.querySelectorAll('[data-numerical]')].map(el => JSON.parse(el.getAttribute('data-numerical')!)),
        plots: [...node.querySelectorAll('svg[viewBox]')].map(el => { const box = el.getBoundingClientRect(); return { x: box.left - rect.left, y: box.top - rect.top, width: box.width, height: box.height }; }),
      };
    });
    const name = `${chapter.id}-${project}-${theme}-${state}`;
    const file = `${directory}/${name}.png`;
    await stage.screenshot({ path: file, animations: 'disabled', scale: 'css' });
    writeFileSync(`${directory}/${name}.json`, JSON.stringify({
      chapter, mount, state, theme, viewport: page.viewportSize(), geometry, sourceHead, sourceSignature,
      capturedUTC: new Date().toISOString(), files: { [file]: createHash('sha256').update(readFileSync(file)).digest('hex') },
    }, null, 2) + '\n');
  }
}

async function physicalRail(root: Locator) {
  const geometry = await root.evaluate(node => [...node.querySelectorAll('svg')].map(svg => {
    const matrix = svg.getScreenCTM()!;
    return {
      labels: [...svg.querySelectorAll('text')].map(text => parseFloat(getComputedStyle(text).fontSize) * Math.hypot(matrix.c, matrix.d)),
      terms: [...svg.querySelectorAll('[data-svg-term]')].map((term, i) => {
        const label = term.querySelector('text')!;
        const x = Number(label.getAttribute('x')), y = Number(label.getAttribute('y'));
        const point = svg.createSVGPoint(); point.x = 53; point.y = 60 + 36 * i;
        const projected = point.matrixTransform(matrix), painted = label.getBoundingClientRect();
        const box = label.getBBox(), top = svg.createSVGPoint(); top.x = box.x; top.y = box.y;
        return { x, y, expectedY: 60 + 36 * i, dx: Math.abs(projected.x - (painted.left + painted.width / 2)), dy: Math.abs(top.matrixTransform(matrix).y - painted.top) };
      }),
    };
  }));
  for (const rail of geometry) {
    for (const pixels of rail.labels) expect(pixels).toBeGreaterThanOrEqual(13.99);
    for (const term of rail.terms) { expect(term.x).toBe(53); expect(term.y).toBe(term.expectedY); expect(term.dx).toBeLessThan(.1); expect(term.dy).toBeLessThan(.1); }
  }
}

test('III-40 owner hand arithmetic is the actual displayed and painted neuron', async ({ page }, info) => {
  const chapter = { id: 'III-40', slug: 'linear-model-artificial-neuron' };
  await page.goto(`chapters/${chapter.slug}/`);
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const root = page.locator('[data-forward-lab="neuron"]');
  await root.getByRole('combobox', { name: 'Activation', exact: true }).selectOption('identity');
  for (const [label, value] of [[/^x 1(?: |$)/, '2'], [/^x 2(?: |$)/, '-3'], [/^w 1(?: |$)/, '-4'], [/^w 2(?: |$)/, '.5'], [/^b(?: |$)/, '1']] as const) await commit(root, label, value);
  const row = root.locator('[data-forward-row="0"]');
  await expect(row).toHaveAttribute('data-products', '[-8,-1.5]');
  await expect(row).toHaveAttribute('data-running', '[-8,-9.5]');
  await expect(row).toHaveAttribute('data-z', '-8.5');
  await expect(row).toHaveAttribute('data-a', '-8.5');
  await expect(root.locator('[data-svg-dot]')).toHaveAttribute('data-svg-dot', '-9.5');
  await expect(root.locator('[data-svg-z]')).toContainText('z ≈ -8.5');
  await expect(root.locator('[data-svg-a]')).toContainText('a ≈ -8.5');
  await physicalRail(root);
  await capture(page, root, chapter, 'owner-negative-identity', info.project.name);
  await root.getByRole('button', { name: 'Sigmoid −1000', exact: true }).click();
  await expect(row).toHaveAttribute('data-z', '-1000'); await expect(row).toHaveAttribute('data-a', '0');
  await capture(page, root, chapter, 'sigmoid-negative-tail', info.project.name);
  await root.getByRole('button', { name: 'Sigmoid +1000', exact: true }).click();
  await expect(row).toHaveAttribute('data-z', '1000'); await expect(row).toHaveAttribute('data-a', '1');
  await capture(page, root, chapter, 'sigmoid-positive-tail', info.project.name);
  await root.getByRole('button', { name: 'Zero neuron', exact: true }).click();
  await expect(row).toHaveAttribute('data-z', '0'); await expect(row).toHaveAttribute('data-a', '0');
  await capture(page, root, chapter, 'relu-boundary', info.project.name);
  await root.getByRole('combobox', { name: 'Activation', exact: true }).selectOption('identity');
  for (const [label, value] of [[/^x 1(?: |$)/, '1'], [/^w 1(?: |$)/, '1'], [/^w 2(?: |$)/, '0'], [/^b(?: |$)/, '1e-16']] as const) await commit(root, label, value);
  await expect(row).toHaveAttribute('data-z', '1');
  await expect(root.locator('.formula annotation')).toContainText('\\approx');
  await expect(root.locator('.formula annotation')).toContainText('10^{-16}');
  await capture(page, root, chapter, 'small-bias-rounding', info.project.name);
});

test('III-41 owner XOR proof matches current hidden values and the live affine counterfactual', async ({ page }, info) => {
  const chapter = { id: 'III-41', slug: 'composition-learned-representations' };
  await page.goto(`chapters/${chapter.slug}/`);
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const root = page.locator('[data-forward-lab="network"]');
  for (const [x, hidden, output] of [['0,0', '[0,0]', '0'], ['0,1', '[0,1]', '1'], ['1,0', '[1,0]', '1'], ['1,1', '[0,0]', '0']]) {
    const row = root.locator(`[data-binary="${x}"]`);
    await expect(row).toHaveAttribute('data-hidden', hidden!); await expect(row).toHaveAttribute('data-output', output!);
  }
  await expect(root.locator('[data-collapse-label]')).toContainText('Counterfactual');
  await root.getByRole('button', { name: 'Input (0,1)', exact: true }).click();
  await expect(root.locator('[data-forward-row="0"]')).toHaveAttribute('data-z', '-1');
  await expect(root.locator('[data-forward-row="1"]')).toHaveAttribute('data-a', '1');
  await expect(root.locator('[data-forward-row="2"]')).toHaveAttribute('data-z', '1');
  await physicalRail(root);
  await capture(page, root, chapter, 'xor-0-1', info.project.name);
  await root.getByRole('combobox', { name: 'Activation', exact: true }).selectOption('identity');
  await expect(root.locator('[data-forward-row="2"]')).toHaveAttribute('data-z', '0');
  await expect(root.locator('[data-collapse-output]')).toHaveAttribute('data-collapse-output', '[0]');
  await expect(root.locator('[data-collapse-label]')).toContainText('algebraically equal');
  await capture(page, root, chapter, 'identity-collapse', info.project.name);
  await commit(root, /^b1 1(?: |$)/, '2');
  await commit(root, /^b2 1(?: |$)/, '3');
  await expect(root.locator('[data-forward-row="2"]')).toHaveAttribute('data-z', '5');
  await expect(root.locator('[data-collapse-output]')).toHaveAttribute('data-collapse-output', '[5]');
  await capture(page, root, chapter, 'edited-affine-biases', info.project.name);
});

test('III-41 failed binary counterfactuals preserve the valid active pass and reject input presets visibly', async ({ page }, info) => {
  const chapter = { id: 'III-41', slug: 'composition-learned-representations' };
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`chapters/${chapter.slug}/`);
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const root = page.locator('[data-forward-lab="network"]');
  await root.getByRole('button', { name: 'Input (0,0)', exact: true }).click();
  for (const [label, value] of [[/^W1 1,1(?: |$)/, '1e-300'], [/^W1 1,2(?: |$)/, '0'], [/^W2 1,1(?: |$)/, '1e-300'], [/^W2 1,2(?: |$)/, '0']] as const) await commit(root, label, value);
  await expect(root.locator('[data-forward-row="2"]')).toHaveAttribute('data-z', '0');
  await expect(root.locator('[data-binary="0,0"]')).toHaveAttribute('data-output', '0');
  for (const x of ['1,0', '1,1']) {
    const row = root.locator(`[data-binary="${x}"]`);
    await expect(row).toContainText(/underflow/i);
    await expect(row).not.toHaveAttribute('data-output', /.+/);
  }
  const active = await root.getAttribute('data-state');
  await root.getByRole('button', { name: 'Input (1,0)', exact: true }).click();
  await expect(root.getByRole('alert')).toContainText(/underflow/i);
  await expect(root).toHaveAttribute('data-state', active!);
  expect(errors).toEqual([]);
  await capture(page, root, chapter, 'binary-underflow-unavailable', info.project.name);
});
