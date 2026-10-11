/**
 * Generic checks applied to EVERY published chapter. The set of chapters comes from the curriculum (never from a hardcoded slug list),
 * so a chapter that is published is automatically held to: metadata, structure, hydration, ids, overflow, mathematics rendering, pager in
 * reading order, axe in both themes (initial state and every exercise in its "wrong answer + solution" state), touch targets, and
 * reduced motion. Chapter-specific mechanisms are tested in <slug>.spec.ts.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { allChapters, neighbours } from '../../src/curriculum/queries';
import { hydrateAll, noPageOverflow } from './helpers';
import { timed } from './timing';

const published = allChapters.filter(r => r.chapter.status === 'available' && r.chapter.slug);
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

async function axe(page: Page, context: string) {
  const results = await timed('axe', () => new AxeBuilder({ page }).withTags(TAGS).analyze());
  expect(results.violations.map(v => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`), context).toEqual([]);
}
const navigate = (page: Page, path: string, phase = 'navigation') => timed(phase, () => page.goto(path));

test('Part I publication: the contents page links exactly the published chapters, in reading order', async ({ page }) => {
  await navigate(page, 'contents/');
  const links = await page.locator('main [data-chapter-id] a').evaluateAll(els => els.map(e => ({ id: e.closest('[data-chapter-id]')!.getAttribute('data-chapter-id'), href: e.getAttribute('href')! })));
  expect(links.map(l => l.id)).toEqual(published.map(r => r.id));
  for (const [i, l] of links.entries()) expect(l.href.endsWith(`chapters/${published[i]!.chapter.slug}/`)).toBe(true);
  await expect(page.locator('main [data-chapter-id]')).toHaveCount(97);
  await expect(page.locator('main .lede')).toContainText(`${published.length} of ${allChapters.length}`);
  await expect(page.locator('.map-sub')).toContainText(`${published.length} of ${allChapters.length}`);
});

for (const ref of published) {
  const path = `chapters/${ref.chapter.slug}/`;
  test.describe(`${ref.id} ${ref.chapter.title}`, () => {
    test.describe('read-only checks', () => {
      // Default mode keeps this group on one worker; a failure restarts it, not skips later assertions.
      test.describe.configure({ mode: 'default' });
      let page: Page;
      const problems: string[] = [];
      test.beforeAll(async ({ browser }, info) => {
        const { baseURL, viewport, isMobile, hasTouch, deviceScaleFactor, colorScheme, reducedMotion } = info.project.use;
        page = await browser.newPage({ baseURL, viewport, isMobile, hasTouch, deviceScaleFactor, colorScheme, reducedMotion });
        page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
        page.on('console', m => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
        page.on('response', r => { if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`); });
        await navigate(page, path, 'setup-navigation');
        await hydrateAll(page, 'setup-hydration');
      });
      test.afterAll(async () => { if (page) await page.context().close(); });
      test.afterEach(async ({}, info: TestInfo) => {
        // The automatic failure screenshot belongs to the built-in page fixture, not our reused read-only page.
        if (info.status !== info.expectedStatus && page && !page.isClosed())
          await info.attach('read-only failure', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
      });
      test('metadata, one h1, structured outline, no skipped heading level', async () => {
        await expect(page).toHaveTitle(`${ref.chapter.title} — Mathematical Foundations`);
        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('.chapter-label')).toContainText(`${ref.id} · ${ref.part.title}`);
        expect(await page.locator('main h2').count()).toBeGreaterThanOrEqual(8);
        const levels = await page.locator('main :is(h1,h2,h3,h4)').evaluateAll(els => els.map(e => Number(e.tagName[1])));
        for (let i = 1; i < levels.length; i++) expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
        expect(problems).toEqual([]);
      });
      test('every required section of the chapter contract is present', async () => {
        const h2 = (await page.locator('main h2').allTextContents()).join(' | ').toLowerCase();
        for (const word of ['definition', 'worked example', 'executable', 'common mistakes', 'connection', 'exercises', 'summary']) expect(h2, word).toContain(word);
        expect(await page.locator('[data-stage]').count()).toBeGreaterThanOrEqual(2);
        expect(await page.locator('[data-exercise]').count()).toBeGreaterThanOrEqual(5);
        expect(await page.locator('figure.code-file').count()).toBeGreaterThanOrEqual(2);
        // the first thing after the header is an interactive stage (priority ladder)
        const firstStageBeforeFirstH2 = await page.evaluate(() => {
          const body = document.querySelector('.chapter-body')!;
          const stage = body.querySelector('[data-stage]'); const h2 = body.querySelector('h2');
          return !!stage && !!h2 && (stage.compareDocumentPosition(h2) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
        });
        expect(firstStageBeforeFirstH2).toBe(true);
      });
      test('no duplicate ids across islands, no page overflow, no raw TeX, MathML twin for every formula', async () => {
        const dupes = await page.evaluate(() => { const seen = new Map<string, number>(); document.querySelectorAll('[id]').forEach(e => seen.set(e.id, (seen.get(e.id) ?? 0) + 1)); return [...seen].filter(([, n]) => n > 1).map(([id]) => id); });
        expect(dupes).toEqual([]);
        expect(await noPageOverflow(page)).toBe(true);
        await expect(page.locator('.katex-error')).toHaveCount(0);
        const text = await page.locator('main').innerText();
        expect(text).not.toMatch(/\\(mathbf|sqrt|frac|norm|lVert|theta|sum|infty|mathbb)\b/);
        const katex = await page.locator('.katex').count();
        expect(katex).toBeGreaterThan(10);
        expect(await page.locator('.katex-mathml math').count()).toBe(katex);
        expect(await page.locator('.katex-html:not([aria-hidden="true"])').count()).toBe(0);
      });
      test('previous / next follow reading order across the whole book', async () => {
        const around = neighbours(ref);
        const pager = page.locator('nav.chapter-pager');
        for (const [side, other] of [['previous', around.previous], ['next', around.next]] as const) {
          const cell = pager.locator(`.pager-${side}`);
          if (!other) { await expect(cell).toHaveCount(0); continue; }
          await expect(cell).toContainText(`${other.id} · ${other.chapter.title}`);
          if (other.chapter.status === 'available') await expect(cell).toHaveAttribute('href', new RegExp(`chapters/${other.chapter.slug}/$`));
          else await expect(cell).toContainText('planned');
        }
      });
      test('stage controls are at least 44 × 44 CSS px and every plane has a model-built text alternative', async () => {
        const small: string[] = [];
        for (const sel of ['.stage .step', '.stage .segment span', '.stage .trace-controls button', '.stage .param-field input', '.stage [data-action="reset"]', '.exercise-actions button', '.exercise input[type="text"]']) {
          for (const el of await page.locator(sel).all()) {
            const b = (await el.boundingBox())!;
            if (b.height < 43.5 || (b.width < 43.5)) small.push(`${sel}: ${Math.round(b.width)}×${Math.round(b.height)}`);
          }
        }
        expect(small).toEqual([]);
        for (const svg of await page.locator('svg.plane').all()) {
          const id = await svg.getAttribute('aria-describedby');
          expect(id).toBeTruthy();
          expect((await page.locator(`[id="${id}"]`).textContent())!.length).toBeGreaterThan(30);
        }
        for (const handle of await page.locator('[data-handle]').all()) {
          const hit = (await handle.locator('.hit').boundingBox())!;
          expect(Math.min(hit.width, hit.height)).toBeGreaterThanOrEqual(44);
          expect(await handle.getAttribute('aria-label')).toBeTruthy();
        }
      });
      test('reduced motion: nothing is animating', async () => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
      });
    });
    for (const scheme of ['light', 'dark'] as const) {
      test(`axe — ${scheme} theme: initial state, then every exercise answered wrongly with its solution shown`, async ({ page }) => {
        test.slow();
        await page.emulateMedia({ colorScheme: scheme });
        await navigate(page, path);
        await hydrateAll(page);
        await axe(page, `${ref.id} (${scheme})`);
        await timed('feedback', async () => {
          for (const ex of await page.locator('[data-exercise]').all()) {
            await ex.scrollIntoViewIfNeeded();
            const radio = ex.locator('input[type="radio"]').first();
            if (await radio.count()) await radio.check();
            else for (const f of await ex.locator('[data-field]').all()) await f.fill('0');
            await ex.locator('[data-action="check"]').click();
            const solution = ex.locator('[data-action="show-solution"]');
            if (await solution.count()) await solution.click();
          }
        });
        await axe(page, `${ref.id} exercise feedback (${scheme})`);
      });
    }
  });
}
