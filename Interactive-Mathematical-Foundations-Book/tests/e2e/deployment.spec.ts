/**
 * Layer 10 — deployment (master plan §12.10). Runs against BOTH the root build and the sub-directory build:
 * every internal URL must stay under the deployment's base path, resolve (no 4xx, including KaTeX fonts, fontsource
 * files and hashed _astro assets), and nothing may be fetched from another origin.
 */
import { expect, test, type Page } from '@playwright/test';

import { allChapters } from '../../src/curriculum/queries';
import { timed } from './timing';
import { hydrateAll } from './helpers';
import { expectedRoutes, routeBatches, routeCoverage, visitRoutes } from './deployment-coverage';

// every published chapter is crawled; the list is derived from the curriculum, never typed here
const publishedSlugs = allChapters.filter(r => r.chapter.status === 'available').map(r => r.chapter.slug!);
const batches = routeBatches(expectedRoutes(publishedSlugs, 'http://manifest.local/'));

test('the suite really runs against the intended deployment (root vs sub-directory)', async ({ page, baseURL }) => {
  const intended = (process.env.BOOK_TEST_BASE ?? '/').replace(/\/?$/, '/');
  expect(new URL(baseURL!).pathname).toBe(intended);
  // A root-relative URL ("/foundation/") only exists when the site is deployed at the origin root.
  const rootRelative = await page.request.get(new URL('/foundation/', baseURL!).href);
  expect(rootRelative.status()).toBe(intended === '/' ? 200 : 404);
  const underBase = await page.request.get(new URL('foundation/', baseURL!).href);
  expect(underBase.status()).toBe(200);
});


async function internalTargets(page: Page, origin: string, basePath: string) {
  return page.evaluate(({ origin, basePath }) => {
    const urls = new Set<string>();
    const problems: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('a[href], link[href], script[src], img[src], [component-url], [renderer-url], [before-hydration-url]')) {
      for (const attribute of ['href', 'src', 'component-url', 'renderer-url', 'before-hydration-url']) {
        const raw = el.getAttribute(attribute);
        if (raw === null || raw === '' || /^(mailto:|tel:|data:)/.test(raw)) continue;
        const url = new URL(raw, location.href);
        if (url.origin !== origin) { problems.push(`external: ${raw}`); continue; }
        if (!url.pathname.startsWith(basePath)) problems.push(`outside base ${basePath}: ${raw}`);
        urls.add(url.pathname + url.search + url.hash);
      }
    }
    return { urls: [...urls], problems };
  }, { origin, basePath });
}

test.describe('every internal link, script and stylesheet resolves, stays under the base path, and never leaves the origin', () => {
  for (const [index, batch] of batches.entries()) test(`route batch ${index + 1}/${batches.length}`, async ({ page, baseURL }, info) => {
    const base = new URL(baseURL!);
    const failed: string[] = [];
    const foreign: string[] = [];
    page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
    page.on('requestfailed', r => failed.push(`${r.failure()?.errorText}: ${r.url()}`));
    page.on('pageerror', error => failed.push(`pageerror: ${error.message}`));
    page.on('request', r => { const u = new URL(r.url()); if (u.origin !== base.origin && !/^(data|blob):/.test(r.url())) foreign.push(r.url()); });

    const publicationExpected = expectedRoutes(publishedSlugs, base.href);
    const expected = batch.map(path => new URL(path.slice(1), base).pathname);
    const visited = new Set<string>();
    const problems: string[] = [];
    const assets = new Set<string>();
    const ids = new Map<string, Set<string>>();
    const anchors: { from: string; path: string; fragment: string }[] = [];
    try { await visitRoutes(expected, async path => {
      const response = await timed('navigation', () => page.goto(path));
      expect(response?.status(), path).toBe(200);
      await hydrateAll(page);
      ids.set(path, new Set(await page.locator('[id]').evaluateAll(elements => elements.map(element => element.id))));
      const { urls, problems: p } = await internalTargets(page, base.origin, base.pathname);
      problems.push(...p.map(x => `${path}: ${x}`));
      for (const u of urls) {
        const target = new URL(u, base.origin);
        if (target.pathname.endsWith('/') || target.pathname.endsWith('.html')) {
          if (!publicationExpected.includes(target.pathname)) problems.push(`${path}: linked route outside publication manifest: ${target.pathname}`);
          if (target.hash.length > 1) anchors.push({ from: path, path: target.pathname, fragment: target.hash.slice(1) });
        } else {
          const asset = target.pathname + target.search;
          if (!assets.has(asset)) {
            assets.add(asset);
            try { const r = await page.request.get(asset); if (r.status() >= 400) failed.push(`${r.status()} ${asset} (linked from ${path})`); }
            catch (error) { failed.push(`${asset}: ${String(error)}`); }
          }
        }
      }
      // fragment targets exist on the page they point to
      const broken = await page.evaluate(() => [...document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')].map(a => a.getAttribute('href')!).filter(h => h.length > 1 && !document.getElementById(decodeURIComponent(h.slice(1)))));
      expect(broken, `${path}: in-page anchors without a target`).toEqual([]);
    }, visited);
    for (const anchor of anchors) {
      try {
        if (!ids.has(anchor.path) && publicationExpected.includes(anchor.path)) {
          const response = await page.request.get(anchor.path);
          if (response.status() !== 200) failed.push(`${response.status()} ${anchor.path} (anchor from ${anchor.from})`);
          ids.set(anchor.path, new Set([...(await response.text()).matchAll(/\sid="([^"]+)"/g)].map(match => match[1]!)));
        }
        if (!ids.get(anchor.path)?.has(decodeURIComponent(anchor.fragment))) problems.push(`${anchor.from}: broken anchor ${anchor.path}#${anchor.fragment}`);
      }
      catch { problems.push(`${anchor.from}: invalid fragment encoding #${anchor.fragment}`); }
    }
    } finally {
      await info.attach('deployment-coverage', { body: JSON.stringify({ publicationExpected, batch: index + 1, ...routeCoverage(expected, visited), assets: [...assets], problems, failed, foreign }, null, 2), contentType: 'application/json' });
    }
    expect(routeCoverage(expected, visited).missing).toEqual([]);
    expect(routeCoverage(expected, visited).unexpected).toEqual([]);
    expect(visited.size).toBe(expected.length);
    expect(problems).toEqual([]);
    expect(failed).toEqual([]);
    expect(foreign).toEqual([]);
  });
});

test('fonts: the KaTeX and text fonts that the page uses are served (200) from the deployment, not from a CDN', async ({ page, baseURL }) => {
  const fonts: { url: string; status: number }[] = [];
  page.on('response', r => { if (/\.(woff2?|ttf)(\?|$)/.test(r.url())) fonts.push({ url: r.url(), status: r.status() }); });
  await page.goto('foundation/');
  await page.locator('[data-stage][data-hydrated="true"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  expect(fonts.length).toBeGreaterThan(3);
  expect(fonts.filter(f => f.status !== 200)).toEqual([]);
  const used = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/['"]/g, '')));
  expect(used).toEqual(expect.arrayContaining(['KaTeX_Main', 'KaTeX_Math', 'Source Serif 4 Variable']));
  for (const f of fonts) expect(new URL(f.url).pathname.startsWith(new URL(baseURL!).pathname), f.url).toBe(true);
});

test.describe('direct access (no click-through)', () => {
  const direct: [string, string, string][] = [
    ['contents/#part-iii', '#part-iii-title', 'Calculus'],
    ['contents/#ch-vii-6', '[data-chapter-id="VII.6"]', 'Logits and softmax'],
    ['foundation/#conventions-in-force', '#conventions-in-force', 'Conventions in force'],
  ];
  for (const [url, selector, text] of direct) {
    test(url, async ({ page }) => {
      await page.goto(url);
      await expect(page.locator(selector).first()).toContainText(text);
      await expect(page.locator(selector).first()).toBeInViewport();
    });
  }
  test('the 404 page works from a deep missing path and its assets load', async ({ page, baseURL }) => {
    const failed: string[] = [];
    page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('/no/such/page/')) failed.push(`${r.status()} ${r.url()}`); });
    const response = await page.goto('no/such/page/');
    expect(response?.status()).toBe(404);
    await page.evaluate(() => document.fonts.ready);
    expect(failed).toEqual([]);
    expect((await page.locator('link[rel=stylesheet]').count())).toBeGreaterThan(0);
    const href = await page.getByRole('link', { name: 'Open the map of the book' }).getAttribute('href');
    expect(href).toBe(`${new URL(baseURL!).pathname}contents/`);
  });
});
