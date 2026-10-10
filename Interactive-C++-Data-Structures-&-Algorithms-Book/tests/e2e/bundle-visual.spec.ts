import { test, expect } from '@playwright/test';
import { chapters } from '../../src/content/book';
for (const chapter of chapters.filter(chapter => Number(chapter.number) >= 2)) {
  test(`${chapter.number}: chapter entry and operation workspace visual regression`, async ({ page }, info) => {
    await page.goto(`/chapters/${chapter.slug}/`);
    const lab = page.locator('[data-chapter-lab]').first();
    await expect(lab).toHaveAttribute('data-step', '0');
    await page.evaluate(() => scrollTo(0, 0));
    await expect(page).toHaveScreenshot(`${chapter.slug}-overview.png`, { animations: 'disabled', maxDiffPixelRatio: 0.005 });
    await page.addStyleTag({ content: '.topbar,.skip-link{visibility:hidden}.playback-controls{position:static}' });
    await expect(lab).toHaveScreenshot(`${chapter.slug}-lab.png`, { animations: 'disabled', maxDiffPixelRatio: 0.005 });
    if (info.project.name === 'desktop') {
      await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
      await expect(lab).toHaveScreenshot(`${chapter.slug}-dark.png`, { animations: 'disabled', maxDiffPixelRatio: 0.005 });
    }
  });
}
