import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { chooseSnap, dragHandleTo, openStage, setParam } from './helpers';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

async function scan(page: Page, context: string) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = results.violations.map(v => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
  expect(summary, context).toEqual([]);
}

const pages = [{ name: 'home', path: './' }, { name: 'contents', path: 'contents/' }, { name: 'foundation demo', path: 'foundation/' }];

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`axe — ${scheme} theme`, () => {
    test.use({ colorScheme: scheme });
    for (const p of pages) {
      test(`${p.name}`, async ({ page }) => {
        await page.goto(p.path);
        if (p.path !== 'contents/') await expect(page.locator('[data-stage][data-hydrated="true"]').first()).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await scan(page, `${p.name} (${scheme})`);
      });
    }
    test('the 404 page', async ({ page }) => {
      await page.goto('does-not-exist/');
      await scan(page, `404 (${scheme})`);
    });
    test('the book-map dialog (open, and filtered)', async ({ page }) => {
      await page.goto('foundation/');
      await page.getByRole('button', { name: 'Contents' }).click();
      await scan(page, `map open (${scheme})`);
      await page.getByRole('searchbox').fill('matrix');
      await scan(page, `map filtered (${scheme})`);
    });
    test('the stage in its unusual states: zero vector, rejected input, free mode, after a drag', async ({ page }) => {
      const stage = await openStage(page);
      await setParam(stage, 'x', '0');
      await setParam(stage, 'y', '0');
      await scan(page, `zero vector (${scheme})`);
      await setParam(stage, 'x', '9');
      await expect(stage.getByRole('alert')).toBeVisible();
      await scan(page, `rejected input (${scheme})`);
      await page.keyboard.press('Escape');
      await chooseSnap(stage, 'Free');
      await dragHandleTo(page, stage, -3.3, 2.7);
      await scan(page, `free mode (${scheme})`);
    });
  });
}

test.describe('keyboard operation', () => {
  test('Tab order follows the reading order: handle → x → y → snap → trace; Shift+Tab from the handle reaches Reset', async ({ page }) => {
    const stage = await openStage(page);
    const handle = stage.locator('[data-handle]');
    await handle.focus();
    await page.keyboard.press('ArrowRight'); // leave the canonical state so Reset is enabled
    await page.keyboard.press('Shift+Tab');
    await expect(stage.locator('[data-action="reset"]')).toBeFocused(); // the header precedes the plane
    await handle.focus();
    const names: string[] = [];
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press('Tab');
      names.push(await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const radio = el.matches('input[type=radio]') ? `snap:${(el as HTMLInputElement).value}` : null;
        return radio ?? el.getAttribute('aria-label') ?? el.getAttribute('role') ?? (el.textContent ?? '').trim().slice(0, 14);
      }));
    }
    expect(names.slice(0, 7)).toEqual(['Decrease x-component', 'spinbutton', 'Increase x-component', 'Decrease y-component', 'spinbutton', 'Increase y-component', expect.stringMatching(/^snap:/)]);
    expect(names.slice(7).join('|')).toMatch(/Reset|Previous|Next|Computing/); // then the trace controls
  });
  test('the dialog contains focus and Escape always gets out', async ({ page }) => {
    await page.goto('foundation/');
    await page.getByRole('button', { name: 'Contents' }).click();
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      // focus may only be inside the modal dialog (or, after its last control, handed to the browser: body)
      expect(await page.evaluate(() => !!document.activeElement?.closest('dialog') || document.activeElement === document.body)).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });
  test('every interactive control has a visible focus indicator', async ({ page }) => {
    const stage = await openStage(page);
    await stage.locator('[data-handle]').focus();
    await page.keyboard.press('ArrowRight'); // make Reset enabled
    const controls = stage.locator('button:not([disabled]), input, [data-handle]');
    const n = await controls.count();
    expect(n).toBeGreaterThan(8);
    for (let i = 0; i < n; i++) {
      const c = controls.nth(i);
      await c.focus({ timeout: 2000 }).catch(() => {});
      const visible = await c.evaluate(el => {
        if (el.matches('[data-handle]')) return getComputedStyle(el.querySelector('.focus-ring')!).opacity === '1';
        const target = el.matches('input[type=radio]') ? (el.nextElementSibling as HTMLElement) : el;
        const s = getComputedStyle(target);
        return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2;
      });
      expect(visible, `control ${i}: ${await c.evaluate(el => el.outerHTML.slice(0, 80))}`).toBe(true);
    }
  });
});

test.describe('touch and pointer targets (plan §11.5)', () => {
  test('stage controls are at least 44 × 44 CSS px; the handle has a 48 px hit target', async ({ page }) => {
    const stage = await openStage(page);
    const hit = (await stage.locator('.drag-point .hit').boundingBox())!;
    expect(Math.min(hit.width, hit.height)).toBeGreaterThanOrEqual(44);
    const small: string[] = [];
    for (const sel of ['.step', '.segment span', '.trace-controls button', '.param-field input', '[data-action="reset"]']) {
      for (const el of await stage.locator(sel).all()) {
        const b = (await el.boundingBox())!;
        if (b.height < 43.5 || b.width < 43.5) small.push(`${sel}: ${Math.round(b.width)}×${Math.round(b.height)}`);
      }
    }
    expect(small).toEqual([]);
  });
  test('shell controls are at least 44 px tall (top bar, dialog, pager, footer)', async ({ page }) => {
    await page.goto('foundation/');
    const small: string[] = [];
    for (const sel of ['.topbar-button', '.chapter-pager a, .chapter-pager p', '.footer-inner nav a']) {
      for (const el of await page.locator(sel).all()) {
        if (!(await el.isVisible())) continue;
        const b = (await el.boundingBox())!;
        if (b.height < 43.5) small.push(`${sel}: ${Math.round(b.width)}×${Math.round(b.height)}`);
      }
    }
    expect(small).toEqual([]);
  });
  test('only the handle captures touch gestures: touching the plane elsewhere still scrolls the page', async ({ page }) => {
    const stage = await openStage(page);
    expect(await stage.locator('[data-handle]').evaluate(el => getComputedStyle(el).touchAction)).toBe('none');
    expect(await stage.locator('svg.plane').evaluate(el => getComputedStyle(el).touchAction)).toBe('auto');
  });
});

test.describe('touch drag (mobile)', () => {
  test('a real touch drag moves the handle and does NOT scroll the page', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch events need the mobile project');
    const stage = await openStage(page);
    await stage.locator('svg.plane').evaluate(el => el.scrollIntoView({ block: 'center' }));
    const before = await page.evaluate(() => scrollY);
    const cdp = await page.context().newCDPSession(page);
    const ring = (await stage.locator('.drag-point .ring').boundingBox())!;
    const plane = (await stage.locator('svg.plane').boundingBox())!;
    const start = { x: ring.x + ring.width / 2, y: ring.y + ring.height / 2 };
    const scale = (plane.width - 2) / 14;
    const end = { x: plane.x + 1 + (plane.width - 2) / 2 + -1 * scale, y: plane.y + 1 + (plane.height - 2) / 2 + 2 * scale }; // world (−1, −2)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + ((end.x - start.x) * i) / 10, y: start.y + ((end.y - start.y) * i) / 10 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(stage).toHaveAttribute('data-x', '-1');
    await expect(stage).toHaveAttribute('data-y', '-2');
    expect(await page.evaluate(() => scrollY)).toBe(before);
    await expect(stage.locator('[data-announcement]')).toContainText('x = minus 1, y = minus 2'); // announced once, on release
  });
});

test.describe('motion, colour and maths accessibility', () => {
  test('reduced motion: nothing animates, and the full interaction still works', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const stage = await openStage(page, './');
    expect(await stage.locator('[data-part="vector"]').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    await dragHandleTo(page, stage, 2, 3);
    await expect(stage).toHaveAttribute('data-x', '2');
  });
  test('motion allowed: the draw-in is only decoration — the canonical state is present from the first frame', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('./');
    await expect(page.locator('[data-stage]').first()).toHaveAttribute('data-x', '3');
    await expect(page.locator('[data-stage] [data-quantity="magnitude"] .val').first()).toHaveText('√13');
  });
  test('meaning never depends on colour alone: x-leg solid vs y-leg dashed, labelled values, ⚠ glyphs, text chips', async ({ page }) => {
    const stage = await openStage(page);
    expect(await stage.locator('[data-part="x-leg"]').evaluate(el => getComputedStyle(el).strokeDasharray)).toBe('none');
    expect(await stage.locator('[data-part="y-leg"]').evaluate(el => getComputedStyle(el).strokeDasharray)).not.toBe('none');
    await expect(stage.locator('[data-part="x-dimension"] text')).toHaveText('x = 3');
    await expect(stage.locator('[data-part="y-dimension"] text')).toHaveText('y = 2');
    await expect(stage.locator('[data-part="vector-label"]')).toHaveText('v');
    await setParam(stage, 'x', '0');
    await setParam(stage, 'y', '0');
    await expect(stage.locator('[data-quantity="direction"] .note')).toContainText('⚠');
    await expect(stage.locator('[data-part="zero-note"]')).toContainText('⚠');
    await page.goto('foundation/');
    expect(await page.locator('.label-chip.is-demo').evaluate(el => getComputedStyle(el, '::before').content)).toContain('⚠');
    for (const callout of await page.locator('.callout').all()) await expect(callout.locator('.callout-title')).not.toBeEmpty();
  });
  test('every KaTeX formula has a MathML twin (read by assistive technology) and a hidden visual layer', async ({ page }) => {
    const stage = await openStage(page);
    const live = await stage.locator('.formula .katex').count();
    expect(live).toBeGreaterThan(5);
    expect(await stage.locator('.formula .katex-mathml math').count()).toBe(live);
    expect(await stage.locator('.formula .katex-html:not([aria-hidden="true"])').count()).toBe(0);
  });
  test('the plane has a text alternative built from the model, and the live region speaks commits, not frames', async ({ page }) => {
    const stage = await openStage(page);
    const describedBy = await stage.locator('svg.plane').getAttribute('aria-describedby');
    expect(await page.locator(`[id="${describedBy}"]`).textContent()).toContain('The vector v runs from the origin (0, 0) to the point (3, 2).');
    const live = stage.locator('[data-announcement]');
    await expect(live).toHaveText('');
    await dragHandleTo(page, stage, 5, -1, 25); // many pointer frames…
    await expect(live).toContainText('Vector endpoint. x = 5, y = minus 1.'); // …announced once, at the end
  });
});
