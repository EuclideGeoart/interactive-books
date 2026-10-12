import { test, expect } from '@playwright/test';
import { chapters } from '../../src/content/book';

const partII = [
  ['06', '06-queue-deque', 'QueueDeque.hpp', 'FIFO'],
  ['07', '07-circular-buffer', 'RingBuffer.hpp', 'modulo'],
  ['08', '08-priority-queue', 'PriorityQueue.hpp', 'priority'],
  ['09', '09-binary-heap', 'BinaryHeap.hpp', 'sift'],
] as const;

test('Part II navigation, search and progress connect all four chapters', async ({ page }) => {
  for (const [number, slug, , term] of partII) {
    await page.goto('/chapters/01-singly-linked-list/');
    await page.getByRole('button', { name: 'Search the book', exact: true }).click();
    await expect(page.locator('.search-scope')).toHaveText(`Search all ${chapters.length} available chapters`);
    await page.getByRole('searchbox').fill(term);
    const result = page.locator(`[data-search-results] a[href*="${slug}"]`).first();
    await expect(result).toBeVisible();
    await result.click();
    await expect(page).toHaveURL(new RegExp(`${slug}/`));
    await expect(page.locator('.hero-top')).toContainText('PART II / QUEUES & ORDERED ACCESS');
    await expect(page.locator('[data-section]')).toHaveCount(13);
    await expect(page.getByRole('button', { name: 'Mark chapter complete' })).toHaveAttribute('aria-pressed', 'false');
    const scope = page.locator('[data-mobile-nav]');
    await page.getByRole('button', { name: 'Chapters in this Part', exact: true }).click();
    const current = scope.locator('[aria-current="page"]');
    await expect(current).toHaveAttribute('href', `/chapters/${slug}/`);
    await expect(current).toBeVisible();
    await expect(scope.getByRole('navigation', { name: 'Chapters in this Part' })).toContainText('PART II');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Mark chapter complete' }).click();
    expect(await page.evaluate(n => JSON.parse(localStorage.getItem(`cpp-book:chapter-${n}`) || '[]').length, number)).toBe(13);
  }
  await page.goto('/chapters/06-queue-deque/');
  await expect(page.getByRole('button', { name: 'Chapter complete' })).toHaveAttribute('aria-pressed', 'true');
  for (const [, slug] of partII.slice(1)) {
    await page.getByRole('navigation', { name: 'Adjacent chapters' }).locator(`a[href="/chapters/${slug}/"]`).click();
    await expect(page).toHaveURL(new RegExp(`${slug}/$`));
  }
  await page.getByRole('navigation', { name: 'Adjacent chapters' }).getByRole('link', { name: '10 / Binary trees →' }).click();
  await expect(page).toHaveURL(/10-binary-trees\/$/);
  await expect(page.locator('.hero-top')).toContainText('PART III / TREES');
  await expect(page.locator('[data-chapter-lab="binary-tree"]')).toHaveAttribute('data-step', '0');
  await page.getByRole('navigation', { name: 'Adjacent chapters' }).getByRole('link', { name: '← 09 / Binary heap' }).click();
  await expect(page).toHaveURL(/09-binary-heap\/$/);
});

test('Part II canonical downloads contain only executable learner sources', async ({ request }) => {
  for (const [number, , header] of partII) {
    const response = await request.get(`/source/chapter-${number}/${header}`);
    expect(response.ok()).toBe(true);
    const source = await response.text();
    expect(source).toContain('#pragma once');
    expect(source).not.toMatch(/@(trace|begin|end)/);
    const main = await request.get(`/source/chapter-${number}/main.cpp`);
    expect(main.ok()).toBe(true);
    expect(await main.text()).toContain(`#include "${header}"`);
    expect((await request.get(`/source/chapter-${number}/parity.cpp`)).status()).toBe(404);
  }
  expect((await request.get('/chapters/00-cpp-foundations/')).ok()).toBe(true);
  expect((await request.get('/chapters/10-binary-tree/')).status()).toBe(404);
});
