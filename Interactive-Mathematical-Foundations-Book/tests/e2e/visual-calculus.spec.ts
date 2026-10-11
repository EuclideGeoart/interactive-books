import { expect, test } from '@playwright/test';
/** Part III: each stage's opening state and its pedagogically important exceptional states (Linux root baselines are authoritative). */
const cases: [string, string, string[]][] = [
  ['limits', 'limits', ['jump', 'recip', 'oscillation']],
  ['continuity', 'continuity', ['removable', 'pole', 'endpoint']],
  ['secant', 'derivative-secant-tangent', ['corner', 'zero-h']],
  ['linear-model', 'derivative-rate-linear-model', ['far', 'corner']],
  ['rules', 'derivative-rules', ['quotient', 'pole']],
  ['chain', 'chain-rule', ['flat-inner', 'sin-exp']],
  ['partials', 'partial-derivatives', ['origin', 'product']],
  ['gradient', 'gradient-directional-derivatives', ['stationary', 'zero-direction', 'saddle']],
  ['jacobian', 'jacobian', ['singular', 'large', 'lift']],
  ['autodiff', 'automatic-differentiation', ['scalar-loss', 'many-outputs', 'division-by-zero']],
  ['hessian', 'hessian-curvature', ['saddle', 'monkey', 'cubic-y', 'not-critical']],
];
for (const [kind, slug, states] of cases) test(`calculus ${kind}: opening and exceptional states`, async ({ page }) => {
  await page.goto(`chapters/${slug}/`); const stage = page.locator(`[data-stage="calculus-${kind}"]`);
  await expect(stage).toHaveAttribute('data-hydrated', 'true'); await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'html{scroll-padding:0 !important} .topbar{position:static !important;backdrop-filter:none !important} .skip-link{visibility:hidden !important} *{caret-color:transparent !important}' });
  const capture = async (name: string) => {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.()); await page.mouse.move(0, 0);
    await stage.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' })); await expect(stage).toHaveScreenshot(`iii-calculus-${kind}${name}.png`);
  };
  await capture('');
  for (const preset of states) { await stage.locator(`[data-preset="${preset}"]`).click(); await capture(`-${preset}`); }
});
