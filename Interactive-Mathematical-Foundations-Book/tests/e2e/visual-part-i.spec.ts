/**
 * Layer 9 — representative screenshots for the Part I chapters added in M5 (I.3 is covered in visual.spec.ts):
 * the opening stage of each, in its initial deterministic state. Like every baseline here they catch clipping and
 * responsive breakage; they are not evidence of mathematical correctness. The chapter list comes from the curriculum.
 */
import { expect, test } from '@playwright/test';

import { allChapters } from '../../src/curriculum/queries';

const slugs = allChapters.filter(r => r.part.numeral === 'I' && r.chapter.status === 'available' && r.chapter.slug !== 'vectors').map(r => r.chapter.slug!);

for (const slug of slugs) {
  test(`${slug} — opening stage`, async ({ page }) => {
    await page.goto(`chapters/${slug}/`);
    const stage = page.locator('[data-stage]').first();
    await stage.scrollIntoViewIfNeeded();
    await expect(stage).toHaveAttribute('data-hydrated', 'true');
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: '.topbar{position:static !important;backdrop-filter:none !important} .skip-link{visibility:hidden !important} *{caret-color:transparent !important}' });
    await page.mouse.move(0, 0);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
    await expect(stage).toHaveScreenshot(`part-i-${slug}.png`);
  });
}
