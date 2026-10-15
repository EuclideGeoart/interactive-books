import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const dist = process.env.BOOK_TEST_DIST ?? 'dist';
const curriculum = JSON.parse(readFileSync(`${dist}/curriculum.json`, 'utf8')) as {
  chapters: { id: string; slug?: string }[];
};
const chapters = curriculum.chapters.filter(chapter => /^III-(26|27|28|29|30|31)$/.test(chapter.id) && chapter.slug);

test('Wave C publishes all six assigned chapters', () => {
  expect(chapters).toHaveLength(6);
});

for (const chapter of chapters) {
  test(`${chapter.id} owner production captures in both themes`, async ({ page }, testInfo) => {
    await page.goto(`chapters/${chapter.slug}/`);
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    const stage = page.locator('.stage').first();
    await expect(stage.locator('svg').first()).toBeVisible();
    const mount = dist === 'dist-subpath' ? 'subpath' : 'root';
    const directory = `artifacts/wave-c-visuals/${mount}`;
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
      const physical = page.viewportSize()!;
      expect(geometry.innerWidth).toBeLessThanOrEqual(physical.width + 1);
      expect(geometry.pageWidth).toBeLessThanOrEqual(physical.width + 1);
      expect(geometry.left).toBeGreaterThanOrEqual(-1);
      expect(geometry.right).toBeLessThanOrEqual(physical.width + 1);
      // Existing SVG measurement bound; authored text must be at least 14 CSS px.
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
        chapter, mount, theme, state, viewport: physical, geometry,
        files: Object.fromEntries(files.map(path => [path, createHash('sha256').update(readFileSync(path)).digest('hex')])),
      }, null, 2) + '\n');
    }
    for (const theme of ['light', 'dark']) await capture(theme);
    if (mount === 'root' && testInfo.project.name === 'mobile') {
      for (const theme of ['light', 'dark']) {
        await stage.getByRole('button', { name: 'Reset experiment', exact: true }).click();
        const scenarios = chapter.id === 'III-27' ? [
          ['Horizontal local minimum', 'local-minimum'], ['Empty cluster', 'empty-cluster'], ['Coincident observations', 'coincident'],
        ] : chapter.id === 'III-28' ? [['Shared border', 'shared-border']]
          : chapter.id === 'III-30' ? [['Use isotropic cloud', 'repeated-spectrum'], ['Use constant cloud', 'zero-spread']] : [];
        for (const [button, state] of scenarios) {
          await stage.getByRole('button', { name: button!, exact: true }).click();
          await capture(theme, state);
        }
        if (chapter.id === 'III-31') {
          for (const k of ['0', '2']) {
            await stage.getByRole('combobox', { name: 'Retained components k' }).selectOption(k);
            await capture(theme, `k-${k}`);
          }
          await stage.getByRole('button', { name: 'Use singleton cloud', exact: true }).click();
          await capture(theme, 'singleton-sample');
          await stage.getByRole('combobox', { name: 'Covariance normalization' }).selectOption('population');
          await capture(theme, 'singleton-population');
        }
      }
    }
  });
}
