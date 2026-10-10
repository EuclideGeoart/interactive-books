import { test, expect } from '@playwright/test';

const chapters = [
  ['01-singly-linked-list', '02'],
  ['04-memory-pool', '09'],
  ['16-b-trees', '12'],
  ['23-unordered-map', '17'],
  ['53-object-pools', '09'],
  ['59-lock-free-introduction', '24'],
  ['60-spatial-hashing', '21'],
] as const;

test('selected chapters link back to their most relevant Chapter 0 lesson', async ({ page }) => {
  const basePath = new URL('./', test.info().project.use.baseURL as string).pathname;
  for (const [slug, lesson] of chapters) {
    await page.goto(`${basePath}chapters/${slug}/`);
    const prerequisite = page.getByRole('complementary', { name: 'C++ prerequisite' });
    await expect(prerequisite).toBeVisible();
    await expect(prerequisite.getByRole('link', { name: 'Chapter 0 →' }))
      .toHaveAttribute('href', `${basePath}chapters/00-cpp-foundations/#lesson-${lesson}`);
  }
});
