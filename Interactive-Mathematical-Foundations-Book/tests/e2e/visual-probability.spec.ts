import { expect, test } from '@playwright/test';
const cases: readonly [string, string, string, readonly string[]][] = [
  ['IV.1', 'random-experiments', 'experiments', ['weighted']],
  ['IV.2', 'events-probability', 'events', ['disjoint']],
  ['IV.3', 'counting-probability', 'counting', ['replacement', 'impossible']],
  ['IV.4', 'conditional-probability', 'conditional', ['empty-b']],
  ['IV.5', 'independence', 'independence', ['disjoint', 'zero-a']],
  ['IV.6', 'bayes-theorem', 'bayes', ['common', 'impossible']],
  ['IV.7', 'random-variables', 'variables', ['constant']],
  ['IV.8', 'pmf-pdf-cdf', 'representations', ['uniform', 'point']],
  ['IV.9', 'bernoulli-binomial', 'binomial', ['zero-p', 'empty']],
  ['IV.10', 'uniform-gaussian', 'continuous', ['uniform', 'narrow']],
  ['IV.11', 'expectation', 'expectation', ['shifted']],
  ['IV.12', 'variance-standard-deviation', 'variance', ['constant', 'reversed']],
];
for (const [id, slug, kind, presets] of cases) test(`${id}: opening and exceptional probability states`, async ({ page }) => {
  await page.goto(`chapters/${slug}/`); const stage = page.locator(`[data-stage="probability-${kind}"]`);
  await expect(stage).toHaveAttribute('data-hydrated', 'true'); await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'html{scroll-padding:0 !important} .topbar{position:static !important;backdrop-filter:none !important} .skip-link{visibility:hidden !important} *{caret-color:transparent !important}' });
  const capture = async (suffix: string) => {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.()); await page.mouse.move(0, 0);
    await stage.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await expect(stage).toHaveScreenshot(`iv-${slug}${suffix}.png`);
  };
  await capture('');
  for (const preset of presets) { await stage.locator(`[data-preset="${preset}"]`).click(); await capture(`-${preset}`); }
});
