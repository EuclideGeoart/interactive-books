import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const cases = [
  ['IV.1', 'random-experiments', 'experiments'], ['IV.2', 'events-probability', 'events'],
  ['IV.3', 'counting-probability', 'counting'], ['IV.4', 'conditional-probability', 'conditional'],
  ['IV.5', 'independence', 'independence'], ['IV.6', 'bayes-theorem', 'bayes'],
] as const;
async function open(page: Page, slug: string, kind: string) {
  await page.goto(`chapters/${slug}/`); const stage = page.locator(`[data-stage="probability-${kind}"]`);
  await expect(stage).toHaveAttribute('data-hydrated', 'true'); return stage;
}
for (const [id, slug, kind] of cases) {
  test(`${id}: keyboard, numeric rejection, reset and replay share canonical state`, async ({ page }) => {
    const stage = await open(page, slug, kind);
    const field = stage.getByRole('spinbutton').first(), initial = await field.inputValue();
    await field.focus(); await field.press('ArrowUp'); await expect(field).not.toHaveValue(initial);
    await expect(stage.locator('[data-announcement]')).not.toBeEmpty();
    await field.fill('-999'); await field.press('Tab'); await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(stage.locator('.param-error')).toContainText('between');
    await stage.locator('[data-action="reset"]').click(); await expect(field).toHaveValue(initial); await expect(field).not.toHaveAttribute('aria-invalid', 'true');
    const trace = stage.locator('.trace'); await trace.getByRole('button', { name: /^Next/ }).click(); await expect(trace).toHaveAttribute('data-trace-index', '1');
    const detail = await trace.locator('[data-trace-detail]').textContent();
    await trace.getByRole('button', { name: /Previous/ }).click(); await trace.getByRole('button', { name: /^Next/ }).click(); await expect(trace.locator('[data-trace-detail]')).toHaveText(detail!);
    await trace.getByRole('slider').fill('2'); await expect(trace).toHaveAttribute('data-trace-index', '2');
    await trace.getByRole('button', { name: /Replay|Play/ }).click(); await expect(trace).toHaveAttribute('data-playing', 'true');
    await trace.getByRole('button', { name: 'Pause', exact: true }).click(); await expect(trace).toHaveAttribute('data-playing', 'false');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}

test('IV.2: event selection and weight changes preserve one authoritative mass table', async ({ page }) => {
  const stage = await open(page, 'events-probability', 'events');
  await expect(stage.locator('[data-quantity="intersection"]')).toContainText('1/3');
  await stage.getByRole('button', { name: 'Outcome 1 in event A', exact: true }).click();
  await expect(stage.locator('[data-quantity="a"]')).toContainText('2/3');
  await stage.locator('[data-preset="weighted"]').click();
  await expect(stage.locator('[data-quantity="a"]')).toContainText('4/7');
  const bar = stage.locator('[data-mass="6"] .prob-track span');
  expect(parseFloat((await bar.getAttribute('style'))!.split(':')[1]!)).toBeCloseTo(100 * 6 / 21, 10);
  await stage.locator('[data-outcome="6"] button').first().click();
  await stage.locator('[data-param="weight"] input').fill('0'); await stage.locator('[data-param="weight"] input').press('Tab');
  await expect(stage.locator('[data-outcome="6"]')).toContainText('Original P = 0');
  await expect(stage.locator('[data-quantity="total"]')).toContainText('1');
});

test('IV.3: ordered selection, replacement weights and impossible outcomes', async ({ page }) => {
  const stage = await open(page, 'counting-probability', 'counting');
  await expect(stage.locator('[data-quantity="count"]')).toContainText('12');
  await stage.getByLabel('Does order matter?').selectOption('false'); await expect(stage.locator('[data-quantity="count"]')).toContainText('6');
  await stage.locator('[data-preset="replacement"]').click(); await expect(stage.locator('[data-verdict]')).toContainText('unequal masses');
  await stage.locator('[data-preset="impossible"]').click(); await expect(stage.locator('[data-verdict]')).toContainText('Impossible selection');
  await stage.locator('[data-preset="empty"]').click(); await expect(stage.locator('[data-quantity="count"]')).toContainText('1');
});

test('IV.4: conditional denominator and zero-mass exception are visible', async ({ page }) => {
  const stage = await open(page, 'conditional-probability', 'conditional');
  await expect(stage.locator('[data-quantity="conditional"]')).toContainText('2/3');
  await expect(stage.locator('[data-outcome="4"]')).toContainText('Inside B: 1/3');
  await stage.locator('[data-preset="empty-b"]').click();
  await expect(stage.locator('[data-quantity="conditional"]')).toHaveAttribute('data-status', 'undefined');
  await expect(stage.locator('[data-verdict]')).toContainText('zero probability');
});

test('IV.5: independence differs from disjointness including empty-event exception', async ({ page }) => {
  const stage = await open(page, 'independence', 'independence');
  await expect(stage.locator('[data-verdict]')).toContainText('Independent:');
  await stage.locator('[data-preset="disjoint"]').click(); await expect(stage.locator('[data-verdict]')).toContainText('Dependent:');
  await stage.locator('[data-preset="zero-a"]').click(); await expect(stage.locator('[data-verdict]')).toContainText('Independent:');
});

test('IV.6: Bayes prior, population counts and posterior bars agree', async ({ page }) => {
  const stage = await open(page, 'bayes-theorem', 'bayes');
  await expect(stage.locator('[data-quantity="posterior"]')).toContainText('2/13');
  await expect(stage.locator('table')).toContainText('495');
  const bar = stage.locator('[data-mass="Posterior A"]'); await expect(bar).toHaveAttribute('data-fraction', '2/13');
  expect(parseFloat((await bar.locator('.prob-track span').getAttribute('style'))!.split(':')[1]!)).toBeCloseTo(200 / 13, 10);
  await stage.locator('[data-probability-slider]').focus(); await stage.locator('[data-probability-slider]').press('ArrowRight');
  await expect(stage.locator('[data-param="prior"] input')).toHaveValue('1.01');
  await stage.locator('[data-preset="common"]').click(); await expect(stage.locator('[data-quantity="posterior"]')).toContainText('18/19');
  await stage.getByLabel('Observed evidence', { exact: true }).selectOption('negative'); await expect(stage.locator('[data-quantity="posterior"]')).toContainText('2/21');
  await stage.locator('[data-preset="impossible"]').click(); await expect(stage.locator('[data-quantity="posterior"]')).toHaveAttribute('data-status', 'undefined');
});

test('IV.1: explicit seed reproduces trials independently of event edits', async ({ page }) => {
  const stage = await open(page, 'random-experiments', 'experiments'), observed = stage.locator('.prob-observations');
  const first = await observed.textContent(); await stage.locator('[data-action="replay-samples"]').click(); await expect(observed).toHaveText(first!);
  await stage.getByRole('button', { name: 'Outcome 1 in event A', exact: true }).click(); await expect(observed).toHaveText(first!);
  const seed = stage.locator('[data-param="seed"] input'); await seed.fill('43'); await seed.press('Tab'); await expect(observed).not.toHaveText(first!);
  await stage.locator('[data-action="reset"]').click(); await expect(observed).toHaveText(first!);
});

for (const theme of ['light', 'dark'] as const) test(`IV.6: ${theme} exceptional evidence accessibility and touch controls`, async ({ page, isMobile }) => {
  await page.emulateMedia({ colorScheme: theme }); const stage = await open(page, 'bayes-theorem', 'bayes');
  if (isMobile) await stage.locator('[data-preset="common"]').tap(); else await stage.locator('[data-preset="common"]').click();
  await stage.locator('[data-preset="impossible"]').click(); await page.evaluate(() => window.scrollTo(0, 0));
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(result.violations.map(v => `${v.id}: ${v.help}`)).toEqual([]);
});
