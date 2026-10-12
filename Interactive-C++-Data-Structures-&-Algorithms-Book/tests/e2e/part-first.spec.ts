import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { chapters } from '../../src/content/book';
import { parts } from '../../src/content/parts';

async function contained(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('homepage offers ten Parts, Foundations and the full map without chapter initialization', async ({ page, baseURL }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  const base = new URL(baseURL!).pathname;
  await expect(page.locator('.part-card')).toHaveCount(parts.length);
  await expect(page.locator('.part-thumbnail')).toHaveCount(parts.length);
  await expect(page.locator('body')).not.toHaveAttribute('data-chapter-number');
  await expect(page.locator('[data-reading-progress], [data-complete], .book-sidebar')).toHaveCount(0);
  for (const [i, part] of parts.entries()) {
    const card = page.locator('.part-card').nth(i);
    await expect(card).toHaveAttribute('href', `${base}contents/#${part.id}`);
    await expect(card).toContainText(part.title);
    const thumbnail = card.locator('svg');
    await expect(thumbnail).toBeVisible();
    await expect(thumbnail).toHaveAttribute('data-part-thumbnail', part.id);
    await expect(thumbnail).toHaveAttribute('aria-hidden', 'true');
    expect(await thumbnail.evaluate(svg => svg.querySelectorAll('rect, path, circle, text').length)).toBeGreaterThan(2);
    await expect(card).toContainText(`${part.chapters.length} chapter`);
    await card.click();
    await expect(page).toHaveURL(new RegExp(`contents/#${part.id}$`));
    await expect(page.locator(`#${part.id}-title`)).toBeInViewport();
    await page.goto('./');
  }
  await page.getByRole('link', { name: 'Start with C++ Foundations' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-chapter-number', '00');
  await page.goto('./');
  await page.getByRole('link', { name: 'Explore all chapters', exact: true }).click();
  await expect(page.locator('.contents-chapters a')).toHaveCount(67);
  expect(await page.evaluate(() => localStorage.getItem('cpp-book:chapter-undefined'))).toBeNull();
  expect(errors).toEqual([]);
});

test('contents preserves every chapter URL, title, section and adjacent link', async ({ page, request, baseURL }) => {
  const base = new URL(baseURL!).pathname;
  await page.goto('contents/');
  const links = page.locator('.contents-chapters a');
  expect(await links.evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))))
    .toEqual(chapters.map(chapter => `${base}chapters/${chapter.slug}/`));
  await expect(page.locator('main').getByRole('link', { name: 'Book homepage' })).toHaveAttribute('href', base);
  for (const [i, chapter] of chapters.entries()) {
    await expect(links.nth(i)).toContainText(chapter.number);
    await expect(links.nth(i)).toContainText(chapter.title);
    const response = await request.get(`${base}chapters/${chapter.slug}/`);
    expect(response.ok(), chapter.slug).toBe(true);
    const source = await response.text();
    expect(source).toContain(`data-chapter-number="${chapter.number}"`);
    expect(source.match(/data-section(?:=|\s|>)/g)?.length).toBe(chapter.number === '00' ? 14 : 13);
    expect(source).toContain('id="exercises"');
    expect(source).toContain('id="summary"');
    expect(source.match(/\bid="top"/g)).toHaveLength(1);
    const hero = source.match(/<div class="hero-top">[\s\S]*?<\/div>/)![0];
    expect(hero).toContain(`PART ${parts.find(part => part.chapters.includes(chapter))!.numeral} /`);
    const adjacent = source.match(/<nav class="chapter-pagination"[\s\S]*?<\/nav>/)![0];
    const expected = [chapters[i - 1], chapters[i + 1]].filter(Boolean).map(c => `${base}chapters/${c!.slug}/`);
    expect([...adjacent.matchAll(/href="([^"]+)"/g)].map(match => match[1])).toEqual(expected);
    if (i === 66) expect(adjacent).toContain('End of the book');
  }
  await page.locator('#part-v .contents-chapters a').first().click();
  await expect(page.locator('body')).toHaveAttribute('data-chapter-number', '24');
});

test('shared search and theme work on home and contents without progress writes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  expect(await page.evaluate(() => localStorage.getItem('cpp-book:theme'))).toBe('dark');
  await page.goto('contents/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  for (const chord of ['Control+k', 'Meta+k']) {
    await page.keyboard.press(chord);
    await expect(page.getByRole('searchbox')).toBeFocused();
    await page.getByRole('searchbox').fill('pointer-to-pointer');
    const result = page.locator('[data-search-results] a[href*="00-cpp-foundations"]').first();
    await expect(result).toBeVisible();
    await expect(result).toHaveAttribute('href', /chapters\/00-cpp-foundations\/#pointers$/);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-search-dialog]')).not.toBeVisible();
  }
  const opener = page.getByRole('button', { name: 'Search the book', exact: true });
  await opener.click();
  await page.getByRole('searchbox').fill('Dijkstra');
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await opener.click();
  await page.getByRole('searchbox').fill('pointer-to-pointer');
  await page.locator('[data-search-results] a[href*="00-cpp-foundations"]').first().click();
  await expect(page).toHaveURL(/00-cpp-foundations\/#pointers$/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.goto('./');
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('cpp-book:chapter-')))).toEqual(['cpp-book:chapter-00']);
  expect(errors).toEqual([]);
});

test('current-Part dialog identifies the chapter and supports keyboard focus and section jumps', async ({ page, baseURL }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const base = new URL(baseURL!).pathname;
  await page.goto('chapters/24-graph-fundamentals/');
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Part V · Graphs');
  await expect(page.locator('.part-ruler [aria-current="true"]')).toHaveAttribute('href', `${base}contents/#part-v`);
  const opener = page.getByRole('button', { name: 'Chapters in this Part', exact: true });
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.locator('[data-mobile-nav]');
  await expect(opener).toHaveAttribute('aria-expanded', 'true');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await expect(dialog.locator('.chapter-link')).toHaveCount(13);
  await expect(dialog.locator('[aria-current="page"]')).toHaveAttribute('href', `${base}chapters/24-graph-fundamentals/`);
  await expect(dialog.getByRole('button', { name: 'Close navigation' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('link', { name: 'Chapter summary', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close navigation' })).toBeFocused();
  await expect(dialog.getByRole('link', { name: 'Explore all Parts & chapters' })).toHaveAttribute('href', `${base}contents/`);
  await page.keyboard.press('Escape');
  await expect(opener).toHaveAttribute('aria-expanded', 'false');
  await expect(opener).toBeFocused();
  await opener.click();
  await dialog.getByRole('link', { name: 'Interactive operations', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/#operations$/);
  await expect(page.locator('.chapter-outline a[href="#operations"]')).toHaveAttribute('aria-current', 'location');
  if (info.project.name === 'mobile') {
    await page.locator('.reader-outline > summary').click();
    await expect(page.getByRole('navigation', { name: 'On this page' })).toBeVisible();
  }
  await contained(page);
  expect(errors).toEqual([]);
});

test('chapter progress keeps stored identities through the homepage, contents and reset', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('ux-test:seeded')) {
      localStorage.setItem('cpp-book:chapter-00', JSON.stringify(['reading', 'objects', 'pointers', 'types', 'ownership', 'contracts', 'containers', 'generic', 'indexing', 'later', 'reasoning', 'implementation', 'exercises', 'summary']));
      localStorage.setItem('cpp-book:theme', 'dark');
      localStorage.setItem('ux-test:seeded', 'true');
    }
  });
  await page.goto('chapters/00-cpp-foundations/');
  await expect(page.locator('[data-complete]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-progress-label]')).toHaveText('100%');
  await page.goto('./');
  await page.goto('contents/');
  await page.goto('chapters/00-cpp-foundations/');
  await expect(page.locator('[data-complete]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-reset-progress]').click();
  await expect(page.locator('[data-complete]')).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cpp-book:chapter-00')!).length)).toBeLessThan(14);
  await page.goto('chapters/01-singly-linked-list/');
  await expect(page.locator('[data-complete]')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-complete]').click();
  await page.goto('./');
  await page.goto('chapters/01-singly-linked-list/');
  await expect(page.locator('[data-complete]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('homepage, contents and a large Part are accessible in both themes and responsive', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [route, name] of [['./', 'home'], ['contents/', 'contents'], ['contents/#part-v', 'graphs-map']]) {
    await page.goto(route!);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      await contained(page);
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(result.violations).toEqual([]);
      await page.screenshot({ path: info.outputPath(`${name}-${theme}.png`), fullPage: name !== 'graphs-map', animations: 'disabled' });
    }
  }
  expect(errors).toEqual([]);
});

test('chapter shell screenshots preserve Foundations and interactive chapter layouts', async ({ page }, info) => {
  for (const [route, name] of [['chapters/00-cpp-foundations/', 'foundations'], ['chapters/01-singly-linked-list/', 'interactive'], ['chapters/24-graph-fundamentals/', 'graphs-chapter']]) {
    await page.goto(route!);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      await contained(page);
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(result.violations).toEqual([]);
      await page.screenshot({ path: info.outputPath(`${name}-${theme}.png`), animations: 'disabled' });
    }
    if (info.project.name === 'mobile' && name === 'graphs-chapter') {
      await page.locator('[data-nav-toggle]').click();
      for (const theme of ['light', 'dark']) {
        await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
        expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
        await page.screenshot({ path: info.outputPath(`chapter-navigation-${theme}.png`), animations: 'disabled' });
      }
    }
  }
});
