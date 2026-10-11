import { expect, test } from '@playwright/test';
const cases = [
  ['addition', 'vector-addition', 'opposites'], ['scaling', 'vector-scaling', 'k0'], ['norms', 'vector-norms', 'zero'],
  ['dot', 'vector-dot-product', 'perpendicular'], ['projection', 'vector-projection', 'zero-direction'],
  ['span', 'vector-span', 'dependent'], ['basis', 'vector-basis', 'dependent'],
];
for (const [kind, slug, preset] of cases) test(`${kind}: opening and exceptional state`, async ({ page }) => {
  await page.goto(`chapters/${slug}/`); const stage = page.locator(`[data-stage="la-${kind}"]`);
  await expect(stage).toHaveAttribute('data-hydrated', 'true'); await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '.topbar{position:static !important;backdrop-filter:none !important} .skip-link{visibility:hidden !important} *{caret-color:transparent !important}' });
  await page.mouse.move(0, 0); await expect(stage).toHaveScreenshot(`ii-${kind}.png`);
  await stage.locator(`[data-preset="${preset}"]`).click(); await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  await expect(stage).toHaveScreenshot(`ii-${kind}-exception.png`);
});
