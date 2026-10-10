import { test, expect } from '@playwright/test';
import { chapters } from '../../src/content/book';

test('canonical registry preserves Chapters 1–50 and includes current later Parts', async ({ page, request }) => {
  const numbers = chapters.map(c => Number(c.number));
  expect(numbers.filter(n => n >= 1 && n <= 50)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  expect(numbers.filter(n => n >= 60)).toEqual([60, 61, 62, 63, 64, 65, 66]);
  expect(numbers).toEqual([...new Set(numbers)].sort((a, b) => a - b));
  await page.goto('/chapters/24-graph-fundamentals/');
  for (const selector of ['.book-sidebar', '[data-mobile-nav]']) {
    const groups = page.locator(`${selector} .book-navigation .nav-part`).filter({ has: page.locator('a.chapter-link') });
    const systems = chapters.filter(c => Number(c.number) >= 51 && Number(c.number) <= 59).length;
    const sizes = [1, 5, 4, 8, 6, 13, 8, 6, ...(systems ? [systems] : []), 7];
    await expect(groups).toHaveCount(sizes.length);
    for (let i = 0; i < sizes.length; i++) await expect(groups.nth(i).locator('a.chapter-link')).toHaveCount(sizes[i]!);
    expect(await page.locator(`${selector} a.chapter-link`).evaluateAll(nodes => nodes.map(n => n.getAttribute('href'))))
      .toEqual(chapters.map(c => `/chapters/${c.slug}/`));
  }
  const index = JSON.parse((await page.locator('[data-search-index]').textContent())!) as { number: string }[];
  expect([...new Set(index.map(entry => entry.number))]).toEqual(chapters.map(c => c.number));
  for (const { number } of chapters) expect(index.filter(entry => entry.number === number)).toHaveLength(number === '00' ? 14 : 13);
  expect((await request.get('/chapters/45-recursion/')).ok()).toBe(true);
  for (const chapter of chapters.filter(c => Number(c.number) > 50)) expect((await request.get(`/chapters/${chapter.slug}/`)).ok()).toBe(true);
  expect((await request.get('/chapters/00-cpp-foundations/')).ok()).toBe(true);
});

test('hashing and graphs share navigation, persistent progress, search and theme', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/chapters/23-unordered-map/');
  await page.locator('[data-complete]').click();
  await page.locator('[data-theme-toggle]').click();
  const theme = await page.locator('html').getAttribute('data-theme');
  await page.getByRole('navigation', { name: 'Adjacent chapters' }).locator('a[href*="24-graph-fundamentals"]').click();
  await expect(page).toHaveURL(/24-graph-fundamentals\/$/);
  await expect(page.locator('[data-chapter-lab]')).toHaveAttribute('data-step', '0');
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme!);
  await expect(page.locator('[data-complete]')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-complete]').click();
  await page.getByRole('navigation', { name: 'Adjacent chapters' }).locator('a[href*="23-unordered-map"]').click();
  await expect(page.locator('[data-complete]')).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('[data-complete]')).toHaveAttribute('aria-pressed', 'true');
  for (const [query, slug] of [['tombstone', '21-open-addressing'], ['Dijkstra', '33-dijkstra']]) {
    await page.locator('[data-search-open]').click();
    await page.getByRole('searchbox').fill(query!);
    await page.locator(`[data-search-results] a[href*="${slug}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(slug!));
  }
  await page.goto('/chapters/24-graph-fundamentals/');
  await expect(page.locator('[data-complete]')).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/chapters/36-union-find/');
  const adjacent = page.getByRole('navigation', { name: 'Adjacent chapters' });
  await expect(adjacent.locator('a')).toHaveCount(2);
  await expect(adjacent.locator('a').first()).toHaveAttribute('href', '/chapters/35-minimum-spanning-trees/');
  await expect(adjacent.locator('a').last()).toHaveAttribute('href', '/chapters/37-linear-search/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('Parts VI and VII preserve progress and continue to the next implemented Part', async ({ page }) => {
  await page.goto('/chapters/44-counting-radix-sort/');
  await page.locator('[data-complete]').click();
  await page.getByRole('navigation', { name: 'Adjacent chapters' }).locator('a[href*="45-recursion"]').click();
  await expect(page.locator('[data-complete]')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-complete]').click();
  await page.getByRole('navigation', { name: 'Adjacent chapters' }).locator('a[href*="44-counting-radix-sort"]').click();
  await expect(page.locator('[data-complete]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-search-open]').click();
  await page.getByRole('searchbox').fill('memoization');
  await page.locator('[data-search-results] a[href*="50-memoization-tabulation"]').first().click();
  await expect(page.locator('[data-complete]')).toHaveAttribute('aria-pressed', 'false');
  const adjacent = page.getByRole('navigation', { name: 'Adjacent chapters' }).locator('a');
  await expect(adjacent).toHaveCount(2);
  await expect(adjacent.first()).toHaveAttribute('href', '/chapters/49-dynamic-programming/');
  const next = chapters[chapters.findIndex(c => c.number === '50') + 1]!;
  await expect(adjacent.last()).toHaveAttribute('href', `/chapters/${next.slug}/`);
  await page.locator('[data-complete]').click();
  await page.reload();
  await expect(page.locator('[data-complete]')).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/chapters/45-recursion/');
  await expect(page.locator('[data-complete]')).toHaveAttribute('aria-pressed', 'true');
});
