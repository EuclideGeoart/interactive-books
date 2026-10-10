import { expect, test, type Page } from '@playwright/test';
import { noPageOverflow } from './helpers';

const pages = [
  { name: 'home', path: './', title: 'Interactive Mathematical Foundations — Book II', hydrated: true, math: true },
  { name: 'contents', path: 'contents/', title: 'The map of the book — Mathematical Foundations', hydrated: false, math: false },
  { name: 'foundation demo', path: 'foundation/', title: 'Foundation demo — Mathematical Foundations', hydrated: true, math: true },
  { name: 'vectors chapter', path: 'chapters/vectors/', title: 'Vectors: components, magnitude, and direction — Mathematical Foundations', hydrated: true, math: true },
];

/** Collect console errors and any response with status ≥ 400 while the callback runs. */
async function watch(page: Page) {
  const errors: string[] = [];
  const failed: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  return { errors, failed };
}

for (const p of pages) {
  test.describe(p.name, () => {
    test('loads with a title, one h1, landmarks, no errors, no failed requests, no overflow', async ({ page }) => {
      const seen = await watch(page);
      const response = await page.goto(p.path);
      expect(response?.status()).toBe(200);
      if (p.hydrated) await expect(page.locator('[data-stage][data-hydrated="true"]').first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveTitle(p.title);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.getByRole('banner')).toHaveCount(1);
      await expect(page.getByRole('contentinfo')).toHaveCount(1);
      // the Part ruler is shown from 800px; below that the Contents button is the way in
      await expect(page.getByRole('navigation', { name: 'Parts of the book' })).toHaveCount((page.viewportSize()?.width ?? 0) >= 800 ? 1 : 0);
      await expect(page.getByRole('button', { name: 'Contents' })).toBeVisible();
      expect(await noPageOverflow(page)).toBe(true);
      expect(seen.failed).toEqual([]);
      expect(seen.errors).toEqual([]);
    });
    test('mathematics is rendered (no raw TeX, no KaTeX error nodes) and carries MathML for assistive technology', async ({ page }) => {
      await page.goto(p.path);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('.katex-error')).toHaveCount(0);
      const text = await page.locator('main').innerText();
      expect(text).not.toMatch(/\\(mathbf|sqrt|frac|norm|lVert|theta|atantwo)\b/);
      expect(text).not.toMatch(/\$[^$\n]{1,40}\$/);
      const katex = await page.locator('.katex').count();
      if (p.math) expect(katex).toBeGreaterThan(0); else expect(katex).toBe(0);
      expect(await page.locator('.katex-mathml math').count()).toBe(katex);
      expect(await page.locator('.katex-mathml annotation[encoding="application/x-tex"]').count()).toBe(katex);
      expect(await page.locator('.katex-html:not([aria-hidden="true"])').count()).toBe(0);
    });
  });
}

test('the skip link is off-screen at rest, appears on keyboard focus, and moves focus into <main>', async ({ page }) => {
  await page.goto('foundation/');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  expect((await skip.boundingBox())!.y).toBeLessThan(0);
  await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  expect((await skip.boundingBox())!.y).toBeGreaterThanOrEqual(0);
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('a missing page is a real 404 whose recovery links stay inside the deployment', async ({ page, baseURL }) => {
  const response = await page.goto('does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('There is no page at this address');
  const hrefs = await page.locator('main a[href]').evaluateAll(els => els.map(e => e.getAttribute('href')!));
  const base = new URL(baseURL!).pathname;
  for (const h of hrefs) expect(h.startsWith(base), h).toBe(true);
  await page.getByRole('link', { name: 'Open the map of the book' }).click();
  await expect(page).toHaveURL(new RegExp(`${base}contents/$`));
});
