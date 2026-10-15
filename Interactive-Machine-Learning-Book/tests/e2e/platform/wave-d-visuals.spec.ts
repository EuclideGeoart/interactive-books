import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const dist = process.env.BOOK_TEST_DIST ?? 'dist';
const curriculum = JSON.parse(readFileSync(`${dist}/curriculum.json`, 'utf8')) as {
  chapters: { id: string; slug?: string }[];
};
const chapters = curriculum.chapters.filter(chapter => /^III-(32|33|34|35|36|37|38|39)$/.test(chapter.id) && chapter.slug);

test('Wave D preserves all eight assigned chapters and the first 39 publications', () => {
  expect(chapters).toHaveLength(8);
  expect(curriculum.chapters.filter(chapter => Number(chapter.id.slice(4)) <= 39 && chapter.slug)).toHaveLength(39);
});

for (const chapter of chapters) {
  test(`${chapter.id} owner production captures in both themes`, async ({ page }, testInfo) => {
    await page.goto(`chapters/${chapter.slug}/`);
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    const stage = page.locator('.stage').first();
    await expect(stage).toBeVisible();
    expect(await stage.locator('[data-state]').count()).toBeGreaterThanOrEqual(1);
    const mount = dist === 'dist-subpath' ? 'subpath' : 'root';
    const directory = `artifacts/wave-d-visuals/${mount}`;
    mkdirSync(directory, { recursive: true });
    async function capture(theme: string, state = 'canonical') {
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      const geometry = await stage.evaluate(node => {
        const rect = node.getBoundingClientRect();
        return {
          innerWidth, pageWidth: document.documentElement.scrollWidth,
          left: rect.left, right: rect.right, width: rect.width, height: rect.height,
          text: node.textContent,
          numericalState: [...node.querySelectorAll('[data-state]')].map(element => JSON.parse(element.getAttribute('data-state')!)),
          plots: [...node.querySelectorAll('svg')].map(element => {
            const plot = element.getBoundingClientRect();
            return { x: plot.left - rect.left, y: plot.top - rect.top, width: plot.width, height: plot.height };
          }),
          labels: [...node.querySelectorAll('svg text')].map(label => {
            const matrix = (label as SVGGraphicsElement).getScreenCTM()!;
            return { text: label.textContent, pixels: parseFloat(getComputedStyle(label).fontSize) * Math.hypot(matrix.c, matrix.d) };
          }),
          inputs: [...node.querySelectorAll('input,select')].map(input => ({
            label: input.closest('label')?.textContent, value: (input as HTMLInputElement).value,
          })),
          painted: [...node.querySelectorAll('svg g,svg circle,svg line,svg path,svg rect')].map(element => ({
            tag: element.tagName, attributes: Object.fromEntries([...element.attributes].map(a => [a.name, a.value])),
          })),
        };
      });
      const viewport = page.viewportSize()!;
      expect(geometry.innerWidth).toBeLessThanOrEqual(viewport.width + 1);
      expect(geometry.pageWidth).toBeLessThanOrEqual(viewport.width + 1);
      expect(geometry.left).toBeGreaterThanOrEqual(-1);
      expect(geometry.right).toBeLessThanOrEqual(viewport.width + 1);
      for (const label of geometry.labels) expect(label.pixels).toBeGreaterThanOrEqual(13.99);
      const name = `${chapter.id}-${testInfo.project.name}-${theme}${state === 'canonical' ? '' : '-' + state}`;
      const file = `${directory}/${name}.png`;
      await stage.screenshot({ path: file, animations: 'disabled', scale: 'css' });
      const files = [file];
      if (state === 'canonical') {
        await page.evaluate(() => scrollTo(0, 0));
        const opening = `${directory}/${name}-opening.png`;
        await page.screenshot({ path: opening, animations: 'disabled', scale: 'css' });
        files.push(opening);
      }
      writeFileSync(`${directory}/${name}.json`, JSON.stringify({
        chapter, mount, theme, state, viewport, geometry,
        capturedUTC: new Date().toISOString(),
        files: Object.fromEntries(files.map(path => [path, createHash('sha256').update(readFileSync(path)).digest('hex')])),
      }, null, 2) + '\n');
    }
    for (const theme of ['light', 'dark']) await capture(theme);
    if (mount === 'root' && testInfo.project.name === 'mobile') {
      for (const theme of ['light', 'dark']) {
        await stage.getByRole('button', { name: 'Reset experiment', exact: true }).click();
        if (chapter.id === 'III-32') {
          for (const preset of ['overlap', 'coincident']) {
            await stage.getByRole('button', { name: `Use ${preset} data`, exact: true }).click();
            await capture(theme, preset);
          }
        } else if (chapter.id === 'III-33') {
          for (const C of ['0.05', '20']) {
            await stage.getByRole('textbox', { name: /^Penalty C(?: |$)/ }).fill(C);
            await stage.getByRole('textbox', { name: /^Penalty C(?: |$)/ }).press('Enter');
            await capture(theme, `C-${C}`);
          }
        } else if (chapter.id === 'III-34') {
          for (const kernel of ['linear', 'polynomial', 'rbf']) {
            await stage.getByRole('combobox', { name: 'Kernel', exact: true }).selectOption(kernel);
            await capture(theme, kernel);
          }
          await stage.getByRole('button', { name: 'Show diagnostic failure', exact: true }).click();
          await expect(stage.locator('[data-svm-lab]')).toHaveAttribute('data-status', 'failed');
          await expect(stage.locator('[data-level]')).toHaveCount(0);
          await capture(theme, 'diagnostic-failure');
        } else if (chapter.id === 'III-35') {
          await stage.getByRole('button', { name: 'Reveal final test', exact: true }).click();
          await capture(theme, 'final-test');
        } else if (chapter.id === 'III-36' || chapter.id === 'III-38') {
          await stage.getByRole('button', { name: 'Use constant data', exact: true }).click();
          await capture(theme, 'constant-data');
        } else if (chapter.id === 'III-37') {
          await stage.getByRole('button', { name: 'Use all-negative data', exact: true }).click();
          await stage.getByRole('textbox', { name: /^Decision threshold(?: |$)/ }).fill('1');
          await stage.getByRole('textbox', { name: /^Decision threshold(?: |$)/ }).press('Enter');
          await capture(theme, 'undefined-metrics');
        } else if (chapter.id === 'III-39') {
          await stage.getByRole('textbox', { name: /^Cancellation t(?: |$)/ }).fill('1');
          await stage.getByRole('textbox', { name: /^Cancellation t(?: |$)/ }).press('Enter');
          await capture(theme, 'well-conditioned-expression');
          await stage.getByText('Complete experiment provenance and parameters', { exact: true }).click();
          await capture(theme, 'complete-provenance');
        }
      }
    }
  });
}
