import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const chapters = [
  ['45-recursion', 'recursion', 'Recursion'],
  ['46-backtracking', 'backtracking', 'Backtracking'],
  ['47-divide-and-conquer', 'divide-conquer', 'DivideConquer'],
  ['48-greedy-algorithms', 'greedy', 'Greedy'],
  ['49-dynamic-programming', 'dynamic-programming', 'DynamicProgramming'],
  ['50-memoization-tabulation', 'memo-tabulation', 'MemoTabulation'],
] as const;

for (const [slug, kind, header] of chapters) {
  test(`${slug}: every operation, source, reverse, keyboard, themes and visual`, async ({ page, request }, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/chapters/${slug}/`);
    const lab = page.locator(`[data-chapter-lab="technique-${kind}"]`);
    await expect(lab).toHaveAttribute('data-step', '0');
    await expect(page.locator('main .chapter-section')).toHaveCount(13);
    const operations = await lab.locator('[data-operation]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-operation')!));
    for (const operation of operations) {
      await lab.locator(`[data-operation="${operation}"]`).click();
      await expect(lab.locator('[data-input-error]')).toBeHidden();
      const initial = await lab.locator('[data-ascii]').textContent();
      await lab.locator('[data-action="next"]').click();
      await expect(lab.locator('[data-code-region]:not([hidden]) .executing')).toHaveCount(1);
      await lab.locator('[data-action="previous"]').click();
      await expect(lab.locator('[data-ascii]')).toHaveText(initial!);
      await lab.locator('[data-phase="after"]').click();
      await expect(lab.locator('.invariant-fail')).toHaveCount(0);
      await expect(lab.locator('.technique-result')).toBeVisible();
      const final = await lab.locator('[data-ascii]').textContent();
      await lab.locator('[data-action="previous"]').click();
      await lab.locator('[data-action="next"]').click();
      await expect(lab.locator('[data-ascii]')).toHaveText(final!);
      const visibleTag = lab.locator('[data-code-region]:not([hidden]) [data-jump]').first();
      await visibleTag.click();
      await expect(lab.locator('[data-code-region]:not([hidden]) .executing')).toHaveCount(1);
    }
    await lab.locator('[data-operation]').first().click();
    // Preserve the accepted captures' source-scroll history: mobile recursion
    // and backtracking ran two events before Pause; the other views ran one.
    // Control the clock so machine load cannot change that capture sequence.
    const ticks = info.project.name === 'mobile' && ['recursion', 'backtracking'].includes(kind) ? 2 : 1;
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await lab.locator('[data-speed]').selectOption('4');
    await lab.locator('[data-action="play"]').click();
    await page.clock.runFor(275 * ticks);
    await expect(lab).toHaveAttribute('data-step', String(ticks));
    await lab.locator('[data-action="play"]').click();
    await expect(lab.locator('[data-action="play"]')).toContainText('Play');
    const paused = await lab.getAttribute('data-step');
    await page.clock.runFor(350);
    await expect(lab).toHaveAttribute('data-step', paused!);
    await lab.locator('[data-speed]').selectOption('1');
    await page.clock.resume();
    const scrub = lab.locator('[data-scrubber]');
    await scrub.fill(String(Math.max(1, Math.floor(Number(await scrub.getAttribute('max')) / 2))));
    for (const view of ['logical', 'memory']) {
      await lab.locator(`[data-view="${view}"]`).click();
      const selectable = lab.locator('[data-svg] [data-node],[data-svg] [data-inspect]').first();
      await selectable.focus();
      await selectable.press('Enter');
      await expect(selectable).toHaveAttribute('aria-pressed', 'true');
      await expect(selectable).toBeFocused();
      await expect(lab.locator('[data-inspector]')).not.toContainText('Inspect an algorithm state');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    await lab.locator('[data-view="logical"]').click();
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      const axe = await new AxeBuilder({ page }).include('main').analyze();
      expect(axe.violations).toEqual([]);
      await page.addStyleTag({ content: '.topbar,.skip-link{visibility:hidden}.playback-controls{position:static}' });
      await lab.screenshot({ path: info.outputPath(`${slug}-${theme}.png`) });
      await expect(lab).toHaveScreenshot(`${slug}-${theme}.png`, { animations: 'disabled' });
    }
    const response = await request.get(`/source/chapter-${slug.slice(0, 2)}/${header}.hpp`);
    expect(response.ok()).toBe(true);
    expect(await response.text()).not.toContain('@trace');
    expect((await request.get(`/source/chapter-${slug.slice(0, 2)}/main.cpp`)).ok()).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('Part VII search, mobile navigation, counterexample and strategy controls', async ({ page }) => {
  await page.goto('/chapters/48-greedy-algorithms/');
  await page.locator('[data-search-open]').click();
  await page.locator('#book-search').fill('memoization');
  await expect(page.locator('[data-search-results]')).toContainText('CHAPTER 50');
  await page.locator('[data-search-close]').click();
  const lab = page.locator('[data-chapter-lab="technique-greedy"]');
  await lab.locator('[data-operation="coins"]').click();
  await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('[data-ascii]')).toContainText('3');
  if (page.viewportSize()!.width < 600) {
    await page.locator('[data-nav-toggle]').click();
    const nav = page.locator('[data-mobile-nav]');
    await expect(nav).toBeVisible();
    await nav.locator('a[href$="/50-memoization-tabulation/"]').click();
    await expect(page).toHaveURL(/50-memoization-tabulation\/$/);
  } else await page.goto('/chapters/50-memoization-tabulation/');
  const dp = page.locator('[data-chapter-lab="technique-memo-tabulation"]');
  for (const operation of ['memo', 'tabulation']) {
    await dp.locator(`[data-operation="${operation}"]`).click();
    await dp.locator('[name="coins"]').fill('2,4');
    await dp.locator('[name="target"]').fill('7');
    await dp.locator('button[type="submit"]').click();
    await dp.locator('[data-phase="after"]').click();
    await expect(dp.locator('[data-ascii]')).toContainText(/unreachable|impossible|no solution/i);
    await expect(dp.locator('.invariant-fail')).toHaveCount(0);
  }
  const before = await dp.locator('[data-ascii]').textContent();
  await dp.locator('[name="coins"]').fill('0,3');
  await dp.locator('button[type="submit"]').click();
  await expect(dp.locator('[data-input-error]')).toBeVisible();
  await expect(dp.locator('[data-ascii]')).toHaveText(before!);
});
