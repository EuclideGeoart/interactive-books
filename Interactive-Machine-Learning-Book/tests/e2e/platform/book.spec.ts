import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
const curriculum = JSON.parse(readFileSync(`${process.env.BOOK_TEST_DIST ?? 'dist'}/curriculum.json`, 'utf8')) as { parts: { id: string; slug: string; chapters: unknown[] }[]; chapters: { id: string; slug?: string; status: string }[] };

test('Part-first navigation exposes exactly nine Parts and the correct publication count', async ({ page }) => {
  await page.goto('');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('A model is a rule');
  const rows = page.locator('.part-index li');
  await expect(rows).toHaveCount(9);
  await expect(page.locator('.index-heading')).toContainText(`${curriculum.chapters.filter(c => c.slug).length} of 41`);
  await page.getByRole('link', { name: 'Parts', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Explore a Part.');
  for (const part of curriculum.parts) {
    await page.goto(`parts/${part.slug}/`);
    await expect(page.locator('.chapter-list li')).toHaveCount(part.chapters.length);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});

test('theme preference persists, keyboard skip link works and root shell is accessible', async ({ page }) => {
  await page.goto('');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.getByRole('button', { name: 'Switch color theme' }).click();
  const selected = await page.locator('html').getAttribute('data-theme');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', selected!);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});

for (const chapter of curriculum.chapters.filter(c => c.slug)) {
  test(`${chapter.id} publication, hydration, exercises, both-theme accessibility and narrow layout`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`chapters/${chapter.slug}/`);
    await expect(page.locator('article')).toHaveAttribute('data-chapter-id', chapter.id);
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
    expect(await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    })).toEqual([]);
    expect(await page.locator('[data-exercise]').count()).toBeGreaterThanOrEqual(5);
    expect(await page.locator('.code-file code').count()).toBeGreaterThanOrEqual(1);
    await expect(page.locator('.chapter-menu')).not.toHaveAttribute('open');
    await page.locator('.chapter-menu summary').click();
    await expect(page.locator('.chapter-menu a[aria-current=page]')).toContainText(chapter.id);
    await page.locator('.chapter-menu summary').click();
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}

test('PWA precaches actual chapters and assets and survives offline reload', async ({ page, context, baseURL }) => {
  await page.goto('chapters/linear-regression/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const manifest = await page.request.get('manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  expect(manifest.headers()['content-type']).toContain('application/manifest+json');
  const value = await manifest.json();
  const mount = new URL(baseURL!).pathname;
  expect(value.start_url).toBe(mount); expect(value.scope).toBe(mount);
  const caches = await page.evaluate(async () => (await window.caches.keys()).filter(name => name.startsWith('book-iii:')));
  expect(caches.length).toBe(1); expect(caches[0]).toContain(`book-iii:${mount}:`);
  await context.setOffline(true); await page.reload();
  await expect(page.locator('article')).toHaveAttribute('data-chapter-id', 'III-07');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await context.setOffline(false);
});

test('strict production server returns real 404s and rejects malformed/traversal paths', async ({ request, baseURL }) => {
  expect((await request.get('chapters/not-a-published-chapter/')).status()).toBe(404);
  expect((await request.get(new URL('%E0%A4%A', baseURL!).href)).status()).toBe(400);
  expect((await request.get(`${baseURL!}%2e%2e%2fpackage.json`)).status()).toBe(403);
});
