import { test, expect } from '@playwright/test';
import { chapters } from '../../src/content/book';
import { readdirSync, readFileSync } from 'node:fs';

const hashing = chapters.filter(chapter => Number(chapter.number) >= 18 && Number(chapter.number) <= 23);

for (const chapter of hashing) {
  test(`${chapter.number}: Part IV sections, keyboard navigation and contained memory view`, async ({ page }) => {
    await page.goto(`/chapters/${chapter.slug}/`);
    await expect(page.locator('.hero-top')).toContainText('PART IV / HASHING');
    await expect(page.locator('[data-section]')).toHaveCount(13);
    const lab = page.locator('[data-chapter-lab]').first();
    await expect(lab).toHaveAttribute('data-step', '0');
    for (const view of ['logical', 'memory']) {
      await lab.locator(`[data-view="${view}"]`).click();
      const nodes = lab.locator('[data-node]');
      const first = nodes.first();
      await first.focus();
      await first.press('End');
      await expect(nodes.last()).toBeFocused();
      await nodes.last().press('Enter');
      await expect(lab.locator('[data-inspector-shell]')).toHaveAttribute('open', '');
      await expect(nodes.last()).toBeFocused();
      await expect.poll(async () => {
        const node = await nodes.last().boundingBox(), box = await lab.locator('[data-svg]').boundingBox();
        return Boolean(node && box && node.x >= box.x - 1 && node.x + node.width <= box.x + box.width + 1);
      }).toBe(true);
      await nodes.last().press('Home');
      await expect(first).toBeFocused();
      if (await nodes.count() > 1) {
        await first.press('ArrowRight');
        await expect(nodes.nth(1)).toBeFocused();
        await nodes.nth(1).press('ArrowLeft');
        await expect(first).toBeFocused();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}

test('Part IV canonical downloads preserve every local dependency and hide fixtures', async ({ request }) => {
  for (const { number } of hashing) {
    const folder = `cpp/chapter-${number}`;
    for (const file of readdirSync(folder).filter(name => name.endsWith('.hpp') || name === 'main.cpp')) {
      const response = await request.get(`/source/chapter-${number}/${file}`);
      expect(response.ok()).toBe(true);
      const text = await response.text();
      expect(text).not.toMatch(/@(?:trace|begin|end)/);
      const source = readFileSync(`${folder}/${file}`, 'utf8');
      for (const [, include] of source.matchAll(/#include "([^"]+)"/g)) {
        const dependency = new URL(include!, `http://book/source/chapter-${number}/${file}`).pathname;
        expect((await request.get(dependency)).ok(), dependency).toBe(true);
      }
    }
    expect((await request.get(`/source/chapter-${number}/parity.cpp`)).status()).toBe(404);
  }
});

test('Part IV joins search, progress and sequential navigation through Chapter 23', async ({ page }) => {
  await page.goto('/chapters/17-tries/');
  await page.getByRole('navigation', { name: 'Adjacent chapters' }).locator('a[href*="18-hashing-fundamentals"]').click();
  for (const chapter of hashing) {
    await expect(page).toHaveURL(new RegExp(`${chapter.slug}/$`));
    await expect(page.getByRole('button', { name: 'Mark chapter complete' })).toHaveAttribute('aria-pressed', 'false');
    const scope = page.locator('[data-mobile-nav]');
    await page.getByRole('button', { name: 'Chapters in this Part', exact: true }).click();
    await expect(scope.locator('[aria-current="page"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Mark chapter complete' }).click();
    const next = hashing[hashing.indexOf(chapter) + 1];
    if (next) await page.getByRole('navigation', { name: 'Adjacent chapters' }).locator(`a[href*="${next.slug}"]`).click();
  }
  const following = chapters[chapters.findIndex(chapter => chapter.number === '23') + 1];
  const adjacent = page.getByRole('navigation', { name: 'Adjacent chapters' });
  if (following) await expect(adjacent.locator(`a[href*="${following.slug}"]`)).toBeVisible();
  else await expect(adjacent.locator('a[href*="/chapters/24-"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Search the book', exact: true }).click();
  await page.getByRole('searchbox').fill('tombstone');
  await expect(page.locator('[data-search-results] a[href*="21-open-addressing"]').first()).toBeVisible();
});
