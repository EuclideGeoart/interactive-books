import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const cases = [['IV.13', 'joint-distributions', 'joint'], ['IV.14', 'covariance-correlation', 'covariance'], ['IV.15', 'law-of-large-numbers', 'lln'], ['IV.16', 'central-limit-theorem', 'clt']] as const;
async function open(page: Page, slug: string, kind: string) { await page.goto(`chapters/${slug}/`); const stage = page.locator(`[data-stage="probability-${kind}"]`); await expect(stage).toHaveAttribute('data-hydrated', 'true'); return stage; }
for (const [id, slug, kind] of cases) test(`${id}: keyboard commits, invalid input, reset and immutable trace replay`, async ({ page }) => {
  const stage = await open(page, slug, kind), field = stage.getByRole('spinbutton').first(), initial = await field.inputValue();
  await field.focus(); await field.press('ArrowUp'); await expect(field).not.toHaveValue(initial); await expect(stage.locator('[data-announcement]')).not.toBeEmpty();
  await field.fill('-999'); await field.press('Tab'); await expect(field).toHaveAttribute('aria-invalid', 'true');
  await stage.locator('[data-action="reset"]').click(); await expect(field).toHaveValue(initial); await expect(field).not.toHaveAttribute('aria-invalid', 'true');
  const trace = stage.locator('.trace'); await trace.getByRole('button', { name: /^Next/ }).click(); await expect(trace).toHaveAttribute('data-trace-index', '1'); const detail = await trace.locator('[data-trace-detail]').textContent();
  await trace.getByRole('button', { name: /Previous/ }).click(); await trace.getByRole('button', { name: /^Next/ }).click(); await expect(trace.locator('[data-trace-detail]')).toHaveText(detail!);
  await trace.getByRole('slider').fill('2'); await expect(trace).toHaveAttribute('data-trace-index', '2'); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
test('IV.13: selected cells, marginals and conditional mass update together', async ({ page }) => {
  const stage = await open(page, 'joint-distributions', 'joint'); await expect(stage.locator('[data-quantity="conditional"]')).toContainText('0.5');
  await stage.locator('[data-select-row="1"]').click(); await expect(stage.locator('[data-quantity="row"]')).toContainText('0.5'); await expect(stage.locator('[data-quantity="conditional"]')).toContainText('0.25');
  await stage.locator('[data-joint-cell="8"]').click(); const weight = stage.locator('[data-param="weight"] input'); await weight.fill('2'); await weight.press('Tab');
  await expect(stage.locator('[data-quantity="joint"]')).toContainText('2/9'); await expect(stage.locator('[data-joint-cell="8"]')).toHaveText('2/9');
  await stage.locator('[data-preset="empty-row"]').click(); await expect(stage.locator('[data-quantity="conditional"]')).toHaveAttribute('data-status', 'undefined');
  await stage.locator('[data-preset="empty-column"]').click(); await expect(stage.locator('[data-quantity="reverse-conditional"]')).toHaveAttribute('data-status', 'undefined');
});
test('IV.14: weighted nonlinear dependence, reflection and zero-variance collapse are explicit', async ({ page }) => {
  const stage = await open(page, 'covariance-correlation', 'covariance'); await expect(stage.locator('[data-quantity="covariance"]')).toContainText('0.25');
  await stage.locator('[data-preset="reversed"]').click(); await expect(stage.locator('[data-quantity="correlation"]')).toContainText('−0.5');
  await stage.locator('[data-preset="nonlinear"]').click(); await expect(stage.locator('[data-verdict]')).toContainText('Zero covariance'); await expect(stage.locator('[data-verdict]')).toContainText('not make'); await expect(stage.locator('[data-chart="joint-scatter"] circle')).toHaveCount(3);
  await stage.locator('[data-preset="collapsed"]').click(); await expect(stage.locator('[data-quantity="correlation"]')).toHaveAttribute('data-status', 'undefined'); await expect(stage.locator('[data-chart="joint-scatter"] circle')).toHaveCount(3);
});
test('IV.15: seed replay preserves the actual path; observation count and source change it', async ({ page }) => {
  const stage = await open(page, 'law-of-large-numbers', 'lln'), path = stage.locator('[data-chart="lln-path"] [data-curve="primary"]');
  const initial = await path.getAttribute('d'); await stage.locator('[data-action="replay-samples"]').click(); await expect(path).toHaveAttribute('d', initial!);
  const seed = stage.locator('[data-param="seed"] input'); await seed.fill('43'); await seed.press('Tab'); await expect(path).not.toHaveAttribute('d', initial!);
  await stage.locator('[data-preset="short"]').click(); await expect(stage.locator('[data-param="trials"] input')).toHaveValue('10');
  await stage.locator('[data-preset="degenerate"]').click(); await expect(stage.locator('[data-quantity="sample-mean"]')).toContainText('0'); await expect(stage.locator('[data-verdict]')).toContainText('cannot prove');
});
test('IV.16: sample size, repetitions, actual blocks and bounded histogram remain reproducible', async ({ page }) => {
  const stage = await open(page, 'central-limit-theorem', 'clt'), bars = stage.locator('[data-chart="clt-histogram"] [data-bar]'), samples = stage.locator('[data-observed-samples]');
  await expect(bars).toHaveCount(24); await samples.locator('summary').click(); const initial = await samples.textContent(), densities = await bars.evaluateAll(elements => elements.map(el => el.getAttribute('data-value')));
  await stage.locator('[data-action="replay-samples"]').click(); await expect(samples).toHaveText(initial!);
  await stage.locator('[data-preset="short"]').click(); expect(await bars.evaluateAll(elements => elements.map(el => el.getAttribute('data-value')))).not.toEqual(densities); await expect(samples).not.toHaveText(initial!);
  await stage.locator('[data-preset="large"]').click(); await expect(stage.locator('[data-param="n"] input')).toHaveValue('30'); await expect(stage.locator('[data-quantity="iid-mean-variance"]')).toContainText('1/30');
  await stage.locator('[data-preset="maximum"]').click(); await expect(stage.locator('[data-param="n"] input')).toHaveValue('100'); await expect(stage.locator('[data-param="repetitions"] input')).toHaveValue('1000'); await expect(bars).toHaveCount(24);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
test('IV.16: zero variance and dependent observations remove or qualify the normal comparison', async ({ page }) => {
  const stage = await open(page, 'central-limit-theorem', 'clt'); await stage.locator('[data-preset="degenerate"]').click(); await expect(stage.locator('[data-undefined-standardization]')).toBeVisible(); await expect(stage.locator('[data-chart="clt-histogram"]')).toHaveCount(0);
  expect(await stage.locator('.prob-board').evaluate(board => [...board.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent?.trim()).filter(Boolean))).toEqual([]);
  await stage.locator('[data-preset="dependent"]').click(); await expect(stage.locator('[data-assumption]')).toContainText('violates'); await expect(stage.locator('[data-quantity="actual-mean-variance"]')).toContainText('1/12'); await expect(stage.locator('[data-quantity="iid-mean-variance"]')).toContainText('1/96');
});
for (const [slug, kind, preset, id] of [['joint-distributions', 'joint', 'empty-row', 'IV.13'], ['central-limit-theorem', 'clt', 'dependent', 'IV.16']] as const) for (const theme of ['light', 'dark'] as const) test(`${id}: ${theme} exceptional state touch, descriptions and full-page axe`, async ({ page, isMobile }) => {
  await page.emulateMedia({ colorScheme: theme }); const stage = await open(page, slug, kind), button = stage.locator(`[data-preset="${preset}"]`); if (isMobile) await button.tap(); else await button.click();
  await expect(stage.locator('[data-announcement]')).not.toBeEmpty(); const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze(); expect(result.violations.map(v => `${v.id}: ${v.help}`)).toEqual([]);
});
