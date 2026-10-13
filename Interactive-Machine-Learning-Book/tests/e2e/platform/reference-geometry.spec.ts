import { expect, test } from '@playwright/test';

test('actual displayed sample centers match equal-scale world projection after input and keyboard changes', async ({ page }) => {
  await page.goto('chapters/linear-regression/');
  const root = page.locator('[data-regression]');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  async function inspect() {
    const errors = await root.evaluate(element => {
      const svg = element.querySelector('[data-plane]')!;
      const bounds = svg.getBoundingClientRect();
      const rows = [...element.querySelectorAll('[data-row-id]')];
      return rows.map(row => {
        const point = element.querySelector(`[data-sample-id="${row.getAttribute('data-row-id')}"]`)!;
        const box = point.getBoundingClientRect();
        const x = Number(row.getAttribute('data-x')), y = Number(row.getAttribute('data-y'));
        return { x: Math.abs(box.x + box.width / 2 - (bounds.x + (320 + 44 * x) * bounds.width / 640)),
          y: Math.abs(box.y + box.height / 2 - (bounds.y + (320 - 44 * y) * bounds.height / 640)) };
      });
    });
    for (const error of errors) { expect(error.x).toBeLessThan(.1); expect(error.y).toBeLessThan(.1); }
  }
  await inspect();
  const x = page.getByRole('textbox', { name: /^Sample x/ });
  await x.fill('-1.23456789'); await x.press('Enter'); await inspect();
  await root.locator('[data-sample-id="s1"]').focus();
  await page.keyboard.press('ArrowRight'); await inspect();
  expect(Number(await root.locator('[data-row-id="s1"]').getAttribute('data-x'))).toBe(-1.23456789 + .1);
});

test('focusing and leaving an unchanged parameter preserves historical replay', async ({ page }) => {
  await page.goto('chapters/linear-regression/');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const root = page.locator('[data-regression]');
  await root.getByRole('button', { name: 'Replay 3 updates' }).click();
  await root.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(root).toHaveAttribute('data-frame-index', '1');
  await page.getByRole('textbox', { name: /^Weight w/ }).focus();
  await root.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(root).toHaveAttribute('data-frame-index', '2');
  expect(Number(await root.getAttribute('data-weight'))).toBeCloseTo(1.332, 12);
});
