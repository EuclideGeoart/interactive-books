/**
 * Layer 9 — screenshot regression (master plan §12.9): a SMALL, curated set of deterministic states. These catch
 * clipping, axis inversion, label collisions, formula overflow and responsive breakage. They are NOT evidence of
 * mathematical correctness — that is the job of the unit, oracle and synchronisation tests.
 * Baselines are per rendering platform (see playwright.config.ts): the Linux/Chrome references are the established
 * ones; Windows has its own set under __screenshots__/win32/. Fonts are self-hosted, which removes the largest source of drift.
 */
import { expect, test, type Page } from '@playwright/test';
import { chooseSnap, openStage, setParam } from './helpers';

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  // a tall element screenshot would otherwise capture the sticky bar mid-page, and (on Windows Chromium) the
  // fixed, off-screen skip link painted inside the clip. Neither is part of what these baselines are about.
  await page.addStyleTag({ content: '.topbar{position:static !important;backdrop-filter:none !important} .skip-link{visibility:hidden !important} *{caret-color:transparent !important}' });
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
}

test('home — above the fold', async ({ page }) => {
  const stage = await openStage(page, './');
  await settle(page);
  await page.evaluate(() => scrollTo(0, 0));
  await expect(page).toHaveScreenshot('home-fold.png');
  await expect(stage).toBeVisible();
});

test('foundation demo — the stage in its canonical state v = (3, 2)', async ({ page }) => {
  const stage = await openStage(page);
  await settle(page);
  await expect(stage).toHaveScreenshot('stage-canonical.png');
});

test('foundation demo — the stage after editing to v = (−4, 3) (all views follow)', async ({ page, isMobile }) => {
  test.skip(page.viewportSize()!.width === 820, 'covered by desktop and mobile');
  const stage = await openStage(page);
  await setParam(stage, 'x', '-4');
  await setParam(stage, 'y', '3');
  await settle(page);
  await expect(stage).toHaveScreenshot('stage-edited.png');
  void isMobile;
});

test('foundation demo — the zero vector (direction undefined, nothing fabricated)', async ({ page }) => {
  test.skip(page.viewportSize()!.width !== 1440, 'desktop only');
  const stage = await openStage(page);
  await setParam(stage, 'x', '0');
  await setParam(stage, 'y', '0');
  await settle(page);
  await expect(stage).toHaveScreenshot('stage-zero.png');
});

test('foundation demo — fine grid, a vector in the third quadrant (angle arc below the axis)', async ({ page }) => {
  test.skip(page.viewportSize()!.width !== 1440, 'desktop only');
  const stage = await openStage(page);
  await chooseSnap(stage, '½');
  await setParam(stage, 'x', '-2.5');
  await setParam(stage, 'y', '-4');
  await settle(page);
  await expect(stage.locator('.stage-plane')).toHaveScreenshot('plane-third-quadrant.png');
});

test.describe('dark theme', () => {
  test.use({ colorScheme: 'dark' });
  test('foundation demo — stage', async ({ page }) => {
    test.skip(page.viewportSize()!.width !== 1440, 'desktop only');
    const stage = await openStage(page);
    await settle(page);
    await expect(stage).toHaveScreenshot('stage-dark.png');
  });
  test('home — above the fold', async ({ page }) => {
    test.skip(page.viewportSize()!.width !== 1440, 'desktop only');
    await openStage(page, './');
    await settle(page);
    await page.evaluate(() => scrollTo(0, 0));
    await expect(page).toHaveScreenshot('home-fold-dark.png');
  });
});

test('contents — top of the page', async ({ page }) => {
  test.skip(page.viewportSize()!.width === 820, 'covered by desktop and mobile');
  await page.goto('contents/');
  await settle(page);
  await expect(page).toHaveScreenshot('contents-fold.png');
});

test('the book map dialog', async ({ page }) => {
  test.skip(page.viewportSize()!.width === 820, 'covered by desktop and mobile');
  await page.goto('foundation/');
  await page.getByRole('button', { name: 'Contents' }).click();
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveScreenshot('map.png');
});

test('a long equation scrolls inside its own region on a phone', async ({ page }) => {
  test.skip(page.viewportSize()!.width !== 390, 'phone only');
  await page.goto('foundation/#mathematical-typography');
  await settle(page);
  const wide = page.locator('main .chapter-body .katex-display[role="region"]').first();
  await wide.scrollIntoViewIfNeeded();
  await expect(wide).toHaveScreenshot('equation-overflow.png');
});
