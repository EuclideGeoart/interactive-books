import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const cases = [
  ['IV.7', 'random-variables', 'variables'], ['IV.8', 'pmf-pdf-cdf', 'representations'], ['IV.9', 'bernoulli-binomial', 'binomial'],
  ['IV.10', 'uniform-gaussian', 'continuous'], ['IV.11', 'expectation', 'expectation'], ['IV.12', 'variance-standard-deviation', 'variance'],
] as const;
async function open(page: Page, slug: string, kind: string) {
  await page.goto(`chapters/${slug}/`); const stage = page.locator(`[data-stage="probability-${kind}"]`);
  await expect(stage).toHaveAttribute('data-hydrated', 'true'); return stage;
}
for (const [id, slug, kind] of cases) test(`${id}: numeric keyboard edits, rejected input and deterministic replay`, async ({ page }) => {
  const stage = await open(page, slug, kind), field = stage.getByRole('spinbutton').first(), initial = await field.inputValue();
  await field.focus(); await field.press('ArrowUp'); await expect(field).not.toHaveValue(initial); await expect(stage.locator('[data-announcement]')).not.toBeEmpty();
  await field.fill('-999'); await field.press('Tab'); await expect(field).toHaveAttribute('aria-invalid', 'true');
  await stage.locator('[data-action="reset"]').click(); await expect(field).toHaveValue(initial); await expect(field).not.toHaveAttribute('aria-invalid', 'true');
  const trace = stage.locator('.trace'); await trace.getByRole('button', { name: /^Next/ }).click(); await expect(trace).toHaveAttribute('data-trace-index', '1');
  const detail = await trace.locator('[data-trace-detail]').textContent(); await trace.getByRole('button', { name: /Previous/ }).click(); await trace.getByRole('button', { name: /^Next/ }).click();
  await expect(trace.locator('[data-trace-detail]')).toHaveText(detail!); await trace.getByRole('slider').fill('2'); await expect(trace).toHaveAttribute('data-trace-index', '2');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
test('IV.7: outcome mapping groups equal values and preserves source mass', async ({ page }) => {
  const stage = await open(page, 'random-variables', 'variables'); await expect(stage.locator('[data-mass="X = 0"]')).toHaveAttribute('data-fraction', '1/3');
  await stage.locator('[data-select-outcome="1"]').click(); const value = stage.locator('[data-param="value"] input'); await value.fill('1'); await value.press('Tab');
  await expect(stage.locator('[data-mass="X = 0"]')).toHaveAttribute('data-fraction', '1/6'); await expect(stage.locator('[data-mass="X = 1"]')).toHaveAttribute('data-fraction', '1/2');
  await stage.locator('[data-preset="constant"]').click(); await expect(stage.locator('[data-quantity="variance"]')).toContainText('0');
});
test('IV.8: PMF jumps, exact area and continuous point semantics stay linked', async ({ page }) => {
  const stage = await open(page, 'pmf-pdf-cdf', 'representations'); await expect(stage.locator('[data-quantity="interval"]')).toContainText('3/4');
  await expect(stage.locator('[data-chart="cdf"] circle')).toHaveCount(6);
  await stage.locator('[data-preset="uniform"]').click(); await expect(stage.locator('[data-quantity="interval"]')).toContainText('1/2'); await expect(stage.locator('[data-quantity="point"]')).toContainText('0');
  await stage.locator('[data-probability-slider]').focus(); await stage.locator('[data-probability-slider]').press('ArrowRight'); await expect(stage.locator('[data-param="lower"] input')).toHaveValue('-0.99');
  await stage.locator('[data-preset="point"]').click(); await expect(stage.locator('[data-quantity="interval"]')).toContainText('0');
});
test('IV.9: p boundaries, empty trials and impossible counts conserve exact mass', async ({ page }) => {
  const stage = await open(page, 'bernoulli-binomial', 'binomial');
  for (const preset of ['zero-p', 'one-p', 'impossible']) { await stage.locator(`[data-preset="${preset}"]`).click(); await expect(stage.locator('[data-quantity="selected"]')).toContainText('0'); await expect(stage.locator('[data-quantity="total"]')).toContainText('1'); }
  await stage.locator('[data-preset="empty"]').click(); await expect(stage.locator('[data-quantity="selected"]')).toContainText('1'); await expect(stage.locator('[data-chart="pmf"] [data-bar]')).toHaveCount(1);
});
test('IV.10: density can exceed one, invalid supports preserve the accepted state', async ({ page }) => {
  const stage = await open(page, 'uniform-gaussian', 'continuous'); await expect(stage.locator('[data-quantity="interval"]')).toContainText('0.682689');
  await stage.locator('[data-preset="narrow"]').click(); await expect(stage.locator('[data-quantity="height"]')).toContainText('3.98942'); await expect(stage.locator('[data-quantity="interval"]')).toContainText('0.682689');
  const start = stage.locator('[data-param="a"] input'); await start.fill('2'); await start.press('Tab'); await expect(stage.locator('[role="alert"]')).toContainText('a < b');
  await expect(stage.locator('[data-quantity="interval"]')).toContainText('0.682689'); await stage.locator('[data-action="reset"]').click(); await expect(stage.locator('[role="alert"]')).toHaveCount(0);
});
test('IV.11: expectation obeys linearity with dependent variables and affine shifts', async ({ page }) => {
  const stage = await open(page, 'expectation', 'expectation'); await expect(stage.locator('[data-quantity="linearity"]')).toContainText('5/2');
  await stage.locator('[data-preset="shifted"]').click(); await expect(stage.locator('[data-quantity="scaled-mean"]')).toContainText('5/2'); await expect(stage.locator('[data-quantity="scaled-variance"]')).toContainText('19/4');
});
test('IV.12: squared geometry and exact spread distinguish scaling from shifting', async ({ page }) => {
  const stage = await open(page, 'variance-standard-deviation', 'variance'); await expect(stage.locator('[data-quantity="variance"]')).toContainText('19/4');
  await expect(stage.locator('.prob-squares')).toContainText('25/4'); await stage.locator('[data-preset="reversed"]').click(); await expect(stage.locator('[data-quantity="scaled-variance"]')).toContainText('19');
  await stage.locator('[data-preset="constant"]').click(); await expect(stage.locator('[data-quantity="variance"]')).toContainText('0'); await expect(stage.locator('[data-quantity="sd"]')).toContainText('0');
});
for (const theme of ['light', 'dark'] as const) test(`IV.10: ${theme} exceptional density, touch and accessibility`, async ({ page, isMobile }) => {
  await page.emulateMedia({ colorScheme: theme }); const stage = await open(page, 'uniform-gaussian', 'continuous');
  if (isMobile) await stage.locator('[data-preset="narrow"]').tap(); else await stage.locator('[data-preset="narrow"]').click();
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze(); expect(result.violations.map(v => `${v.id}: ${v.help}`)).toEqual([]);
});
