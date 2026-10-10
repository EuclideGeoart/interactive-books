import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.setTimeout(60000);

const chapters = [
  ['51-free-lists', 'systems-memory-free-list', 'FreeListStorage'],
  ['52-arena-allocators', 'systems-memory-arena', 'ByteArena'],
  ['53-object-pools', 'systems-memory-object-pool', 'ObjectPool'],
  ['54-sparse-sets', 'organization-sparse', 'SparseSet'],
  ['55-generational-handles', 'systems-memory-handles', 'HandleRegistry'],
  ['56-ecs-storage', 'organization-ecs', 'ECSStorage'],
  ['57-dirty-work-lists', 'organization-dirty', 'DirtyWorkList'],
  ['58-command-buffers', 'organization-commands', 'CommandBuffer'],
  ['59-lock-free-introduction', 'spsc', 'SpscRing'],
] as const;

for (const [slug, kind, header] of chapters) {
  test(`${slug}: operations, source, reversible playback and inspection`, async ({ page, request }, info) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`/chapters/${slug}/`);
    const lab = page.locator(`[data-chapter-lab="${kind}"]`);
    await expect(lab).toHaveAttribute('data-step', '0');
    await expect(page.locator('main .chapter-section')).toHaveCount(13);
    const operations = await lab.locator('[data-operation]').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-operation')!));
    for (const operation of operations) {
      await lab.locator(`button[data-operation="${operation}"]`).click();
      await expect(lab).toHaveAttribute('data-operation', operation);
      await expect(lab.locator('[data-input-error]')).toBeHidden();
      const before = await lab.locator('[data-ascii]').textContent();
      await lab.locator('[data-action="next"]').click();
      await expect(lab).toHaveAttribute('data-step', '1');
      await expect(lab.locator('[data-code-region]:not([hidden]) .executing')).toHaveCount(1);
      await expect(lab.locator('[data-mobile-code]')).toHaveText((await lab.locator('[data-code-region]:not([hidden]) .executing code').textContent())!.trim());
      await lab.locator('[data-action="previous"]').click();
      await expect(lab.locator('[data-ascii]')).toHaveText(before!);
      await lab.locator('[data-phase="after"]').click();
      if (operation.startsWith('break')) await expect(lab.locator('.invariant-fail')).not.toHaveCount(0);
      else await expect(lab.locator('.invariant-fail')).toHaveCount(0);
      const after = await lab.locator('[data-ascii]').textContent();
      await lab.locator('[data-action="previous"]').click();
      await lab.locator('[data-action="next"]').click();
      await expect(lab.locator('[data-ascii]')).toHaveText(after!);
      // A visited canonical line jumps back to its recorded execution.
      const jumps = lab.locator('[data-code-region]:not([hidden]) [data-jump]');
      for (const jump of await jumps.all()) {
        await jump.click();
        if (await lab.locator('[data-code-region]:not([hidden]) .executing').count()) break;
      }
      await expect(lab.locator('[data-code-region]:not([hidden]) .executing')).toHaveCount(1);
    }
    await lab.locator('[data-operation]').first().click();
    await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000));
    await lab.locator('[data-speed]').selectOption('4');
    await lab.locator('[data-action="play"]').click(); await page.clock.runFor(275);
    await expect(lab).toHaveAttribute('data-step', '1');
    await lab.locator('[data-action="play"]').click(); await page.clock.runFor(350);
    await expect(lab).toHaveAttribute('data-step', '1');
    await lab.locator('[data-action="reset"]').click(); await page.clock.resume();
    await expect(lab).toHaveAttribute('data-step', '0');
    const scrub = lab.locator('[data-scrubber]');
    await scrub.fill(String(Math.max(1, Math.floor(Number(await scrub.getAttribute('max')) / 2))));
    for (const view of ['logical', 'memory']) {
      await lab.locator(`[data-view="${view}"]`).click();
      const target = lab.locator('[data-svg] [data-node],[data-svg] [data-inspect]').first();
      await target.focus(); await target.press('Enter');
      await expect(target).toHaveAttribute('aria-pressed', 'true'); await expect(target).toBeFocused();
      await expect(lab.locator('[data-inspector-shell]')).toHaveAttribute('open', '');
      if (info.project.name === 'mobile') await target.tap();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    const source = await request.get(`/source/chapter-${slug.slice(0, 2)}/${header}.hpp`);
    expect(source.ok()).toBe(true); expect(await source.text()).not.toMatch(/@(?:trace|begin|end)/);
    expect((await request.get(`/source/chapter-${slug.slice(0, 2)}/main.cpp`)).ok()).toBe(true);
    expect(errors).toEqual([]);
  });

  test(`${slug}: both themes, both views, fitting and mutation visual`, async ({ page }) => {
    await page.goto(`/chapters/${slug}/`);
    const lab = page.locator(`[data-chapter-lab="${kind}"]`);
    await expect(lab).toHaveAttribute('data-step', '0');
    const scrub = lab.locator('[data-scrubber]');
    await scrub.fill(String(Math.max(1, Math.floor(Number(await scrub.getAttribute('max')) / 2))));
    for (const view of ['logical', 'memory']) {
      await lab.locator(`[data-view="${view}"]`).click();
      const canvas = lab.locator('[data-svg]');
      if (await canvas.locator('svg.systems-diagram').count()) {
        await lab.locator('[data-diagram-size="fit"]').click();
        expect(await canvas.evaluate(el => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1)).toBe(true);
        const boxes = await canvas.locator('svg.systems-diagram').evaluateAll(nodes => nodes.map(node => {
          const svg = node as SVGSVGElement, matrix = svg.getScreenCTM()!, box = svg.viewBox.baseVal;
          const a = new DOMPoint(box.x, box.y).matrixTransform(matrix), b = new DOMPoint(box.x + box.width, box.y + box.height).matrixTransform(matrix);
          const viewport = svg.closest('[data-svg]')!.getBoundingClientRect();
          return a.x >= viewport.left - 1 && b.x <= viewport.right + 1 && a.y >= viewport.top - 1 && b.y <= viewport.bottom + 1;
        }));
        expect(boxes.every(Boolean)).toBe(true);
        await lab.locator('[data-diagram-size="actual"]').click();
        await expect(canvas).toHaveAttribute('data-diagram-scale', 'actual');
        await lab.locator('[data-action="next"]').click();
        await expect(canvas).toHaveAttribute('data-diagram-scale', 'actual');
        await lab.locator('[data-action="previous"]').click();
        await lab.locator('[data-diagram-size="fit"]').click();
      }
      for (const theme of ['light', 'dark']) {
        await page.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
        expect((await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await page.addStyleTag({ content: '.topbar,.skip-link{visibility:hidden}.playback-controls{position:static}' });
        await expect(lab).toHaveScreenshot(`${slug}-${view}-${theme}.png`, { animations: 'disabled' });
      }
    }
  });
}

test('Part VIII navigation, cross-book search and independent progress', async ({ page }) => {
  await page.goto('/chapters/51-free-lists/');
  await page.getByRole('button', { name: 'Mark chapter complete' }).click();
  await page.getByRole('navigation', { name: 'Adjacent chapters' }).getByRole('link', { name: /52/ }).click();
  await expect(page).toHaveURL(/52-arena-allocators/);
  await expect(page.getByRole('button', { name: 'Mark chapter complete' })).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-search-open]').click();
  await page.getByRole('searchbox').fill('publication');
  await expect(page.locator('[data-search-results] a[href*="59-lock-free-introduction"]').first()).toBeVisible();
  if (page.viewportSize()!.width < 600) await page.locator('[data-search-close]').click();
  else await page.keyboard.press('Control+k');
  await expect(page.locator('[data-search-dialog]')).not.toBeVisible();
  if (page.viewportSize()!.width < 600) {
    await page.locator('[data-nav-toggle]').click();
    await page.locator('[data-mobile-nav] a[href$="/59-lock-free-introduction/"]').click();
  } else await page.goto('/chapters/59-lock-free-introduction/');
  await expect(page).toHaveURL(/59-lock-free-introduction/);
  await page.goto('/chapters/51-free-lists/');
  await expect(page.getByRole('button', { name: 'Chapter complete' })).toHaveAttribute('aria-pressed', 'true');
});

test('SPSC unsafe publication, CAS mismatch and both handoff boundaries', async ({ page }) => {
  await page.goto('/chapters/59-lock-free-introduction/');
  const lab = page.locator('[data-chapter-lab="spsc"]');
  for (const [operation, expected] of [['publication', 'Consumed: 42'], ['reuse', 'Published 42'], ['cas-failure', 'expected=7'], ['aba', '1 → 2 → 1 → 3'], ['break-publication', 'no valid payload value']]) {
    await lab.locator(`[data-operation="${operation}"]`).click();
    await lab.locator('[data-phase="after"]').click();
    await expect(lab.locator('[data-ascii]')).toContainText(expected!);
  }
});

// Canonical statement jumps select the teaching states, including private
// mutation steps that a default midpoint can miss while setting up a fixture.
const mutationCases = [
  ['51-free-lists', 'systems-memory-free-list', 'reuse', ['fl.link']],
  ['52-arena-allocators', 'systems-memory-arena', 'allocate', ['arena.reserve', 'arena.reserve']],
  ['53-object-pools', 'systems-memory-object-pool', 'lifecycle', ['pool.destroy']],
  ['54-sparse-sets', 'organization-sparse', 'remove', ['sparse.move', 'sparse.pop', 'sparse.repair']],
  ['55-generational-handles', 'systems-memory-handles', 'reuse', ['handle.advance', 'handle.create', 'handle.validate']],
  ['56-ecs-storage', 'organization-ecs', 'remove', ['ecs.move', 'ecs.pop', 'ecs.repair']],
  ['57-dirty-work-lists', 'organization-dirty', 'wave', ['dirty.begin', 'dirty.mark']],
  ['58-command-buffers', 'organization-commands', 'stale', ['commands.delete', 'commands.report', 'commands.report']],
  ['59-lock-free-introduction', 'spsc', 'publication', ['spsc.push.payload']],
  ['59-lock-free-introduction', 'spsc', 'reuse', ['spsc.pop.payload']],
] as const;

for (const [slug, kind, operation, tags] of mutationCases) {
  test(`${slug}: ${operation} critical mutation states`, async ({ page }) => {
    await page.goto(`/chapters/${slug}/`);
    const lab = page.locator(`[data-chapter-lab="${kind}"]`);
    await expect(lab).toHaveAttribute('data-step', '0');
    await lab.locator(`[data-operation="${operation}"]`).click();
    await page.addStyleTag({ content: '.topbar,.skip-link{visibility:hidden}.playback-controls{position:static}' });
    for (const [index, tag] of tags.entries()) {
      await lab.locator(`[data-code-region]:not([hidden]) [data-jump="${tag}"]`).click();
      await expect(lab.locator('[data-code-region]:not([hidden]) .executing [data-jump]')).toHaveAttribute('data-jump', tag);
      const state = await lab.locator('[data-ascii]').textContent();
      await lab.locator('[data-action="previous"]').click();
      await lab.locator('[data-action="next"]').click();
      await expect(lab.locator('[data-ascii]')).toHaveText(state!);
      // Keep intermediate move/pop/repair evidence for each snapshot. For
      // repeated setup tags, only the final occurrence is the intended capture.
      if (index < tags.length - 1 && (tag === tags[index + 1] || kind === 'systems-memory-handles' || kind === 'organization-dirty' || kind === 'organization-commands')) continue;
      for (const view of ['logical', 'memory']) {
        await lab.locator(`[data-view="${view}"]`).click();
        await lab.locator('[data-diagram-size="fit"]').click();
        for (const theme of ['light', 'dark']) {
          await page.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
          await expect(lab).toHaveScreenshot(`${slug}-${operation}-${index}-${tag}-${view}-${theme}.png`, { animations: 'disabled' });
        }
      }
    }
  });
}
