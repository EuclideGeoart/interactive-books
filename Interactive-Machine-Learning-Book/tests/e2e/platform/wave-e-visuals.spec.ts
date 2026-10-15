import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { validationSignature } from '../../../scripts/production-state.mjs';

const dist = process.env.BOOK_TEST_DIST ?? 'dist';
const curriculum = JSON.parse(readFileSync(`${dist}/curriculum.json`, 'utf8')) as {
  parts: { id: string; slug: string }[];
  chapters: { id: string; slug?: string; partId: string }[];
};
const chapters = curriculum.chapters.filter(chapter => chapter.slug);
const sourceHead = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const sourceSignature = validationSignature();
const mount = dist === 'dist-subpath' ? 'subpath' : 'root';

test('Book III completion exposes the exact 41 chapters across nine Parts', () => {
  expect(chapters.map(chapter => chapter.id)).toEqual(Array.from({ length: 41 }, (_, i) => `III-${String(i + 1).padStart(2, '0')}`));
  expect(curriculum.parts.map(part => part.id)).toEqual(Array.from({ length: 9 }, (_, i) => `p0${i + 1}`));
});

for (const chapter of chapters) {
  test(`${chapter.id} full-book source-bound production pixels in both themes`, async ({ page }, testInfo) => {
    await page.goto(`chapters/${chapter.slug}/`);
    await expect(page.locator('article')).toHaveAttribute('data-chapter-id', chapter.id);
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    const stage = page.locator('.stage').first();
    await expect(stage).toBeVisible();
    const directory = `artifacts/wave-e-visuals/${mount}`;
    mkdirSync(directory, { recursive: true });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      const geometry = await stage.evaluate(node => {
        const rect = node.getBoundingClientRect();
        return {
          innerWidth, pageWidth: document.documentElement.scrollWidth,
          left: rect.left, right: rect.right, width: rect.width, height: rect.height,
          text: node.textContent,
          data: [...node.querySelectorAll('*')].flatMap(element => {
            const attributes = Object.fromEntries([...element.attributes].filter(a => a.name.startsWith('data-')).map(a => [a.name, a.value]));
            return Object.keys(attributes).length ? [{ tag: element.tagName, attributes }] : [];
          }),
          plots: [...node.querySelectorAll('svg[viewBox]')].map(element => {
            const box = element.getBoundingClientRect();
            return { x: box.left - rect.left, y: box.top - rect.top, width: box.width, height: box.height };
          }),
          inputs: [...node.querySelectorAll('input,select')].map(input => ({
            label: input.closest('label')?.textContent, value: (input as HTMLInputElement).value,
          })),
          painted: [...node.querySelectorAll('svg circle,svg line,svg path,svg rect,svg text')].map(element => ({
            tag: element.tagName, text: element.textContent,
            attributes: Object.fromEntries([...element.attributes].map(a => [a.name, a.value])),
          })),
        };
      });
      const viewport = page.viewportSize()!;
      expect(geometry.innerWidth).toBeLessThanOrEqual(viewport.width + 1);
      expect(geometry.pageWidth).toBeLessThanOrEqual(viewport.width + 1);
      expect(geometry.left).toBeGreaterThanOrEqual(-1);
      expect(geometry.right).toBeLessThanOrEqual(viewport.width + 1);
      const name = `${chapter.id}-${testInfo.project.name}-${theme}`;
      const file = `${directory}/${name}.png`;
      await stage.screenshot({ path: file, animations: 'disabled', scale: 'css' });
      await page.evaluate(() => scrollTo(0, 0));
      const opening = `${directory}/${name}-opening.png`;
      await page.screenshot({ path: opening, animations: 'disabled', scale: 'css' });
      writeFileSync(`${directory}/${name}.json`, JSON.stringify({
        chapter, mount, theme, state: 'canonical', viewport, geometry,
        sourceHead, sourceSignature, capturedUTC: new Date().toISOString(),
        files: Object.fromEntries([file, opening].map(path => [path, createHash('sha256').update(readFileSync(path)).digest('hex')])),
      }, null, 2) + '\n');
    }
  });
}

test('the completed book navigates and hydrates all 41 chapters offline', async ({ page, context }) => {
  test.setTimeout(240_000);
  await page.goto('chapters/linear-regression/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  for (const chapter of chapters) {
    await page.goto(`chapters/${chapter.slug}/`);
    await expect(page.locator('article')).toHaveAttribute('data-chapter-id', chapter.id);
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  }
  await context.setOffline(false);
});
