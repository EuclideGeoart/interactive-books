import { expect, test } from '@playwright/test';
const cases = [
  ['addition', 'vector-addition', 'opposites'], ['scaling', 'vector-scaling', 'k0'], ['norms', 'vector-norms', 'zero'],
  ['dot', 'vector-dot-product', 'perpendicular'], ['projection', 'vector-projection', 'zero-direction'],
  ['span', 'vector-span', 'dependent'], ['basis', 'vector-basis', 'dependent'],
];
for (const [kind, slug, preset] of cases) test(`${kind}: opening and exceptional state`, async ({ page }) => {
  await page.goto(`chapters/${slug}/`); const stage = page.locator(`[data-stage="la-${kind}"]`);
  await expect(stage).toHaveAttribute('data-hydrated', 'true'); await page.evaluate(() => document.fonts.ready);
  // The capture's non-sticky header needs no reserved scroll padding.
  await page.addStyleTag({ content: 'html{scroll-padding:0 !important} .topbar{position:static !important;backdrop-filter:none !important} .skip-link{visibility:hidden !important} *{caret-color:transparent !important}' });
  await page.mouse.move(0, 0); await stage.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await expect(stage).toHaveScreenshot(`ii-${kind}.png`);
  await stage.locator(`[data-preset="${preset}"]`).click(); await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  await stage.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await expect(stage).toHaveScreenshot(`ii-${kind}-exception.png`);
});

const matrixCases = [
  ['transform', 'matrix-transformations', 'collapse'], ['matvec', 'matrix-vector', 'invalid'],
  ['composition', 'matrix-composition', 'invalid'], ['orthogonality', 'matrix-transpose-orthogonality', 'shear'],
  ['determinant', 'matrix-determinant', 'collapse'], ['systems', 'linear-systems', 'parallel'],
];
for (const [kind, slug, preset] of matrixCases) test(`matrix ${kind}: opening and exceptional state`, async ({ page }) => {
  await page.goto(`chapters/${slug}/`); const stage = page.locator(`[data-stage="matrix-${kind}"]`);
  await expect(stage).toHaveAttribute('data-hydrated', 'true'); await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'html{scroll-padding:0 !important} .topbar{position:static !important;backdrop-filter:none !important} .skip-link{visibility:hidden !important} *{caret-color:transparent !important}' });
  await page.mouse.move(0, 0); await stage.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await expect(stage).toHaveScreenshot(`ii-matrix-${kind}.png`);
  await stage.locator(`[data-preset="${preset}"]`).click(); await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  await stage.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await expect(stage).toHaveScreenshot(`ii-matrix-${kind}-exception.png`);
});

test('matrix composition: affine translated squares and output', async ({ page }) => {
  await page.goto('chapters/matrix-composition/'); const stage = page.locator('[data-stage="matrix-composition"]');
  await expect(stage).toHaveAttribute('data-hydrated', 'true'); await page.evaluate(() => document.fonts.ready);
  await stage.locator('[data-preset="affine"]').click();
  await page.addStyleTag({ content: 'html{scroll-padding:0 !important} .topbar{position:static !important;backdrop-filter:none !important} .skip-link{visibility:hidden !important} *{caret-color:transparent !important}' });
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  await page.mouse.move(0, 0); await stage.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await expect(stage).toHaveScreenshot('ii-matrix-composition-affine.png');
});
