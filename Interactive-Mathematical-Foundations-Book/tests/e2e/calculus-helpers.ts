/** Shared browser-test helpers for the Part III stages. Expected pixels come from the published world window and the plane convention only. */
import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';

export const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
export async function open(page: Page, slug: string, kind: string): Promise<Locator> {
  await page.goto(`chapters/${slug}/`);
  const stage = page.locator(`[data-stage="calculus-${kind}"]`);
  await expect(stage).toHaveAttribute('data-hydrated', 'true');
  await page.evaluate(() => document.fonts.ready);
  return stage;
}
export const state = async (s: Locator) => JSON.parse((await s.getAttribute('data-state'))!);
export const metrics = async (s: Locator) => JSON.parse((await s.getAttribute('data-metrics'))!);
export async function entry(s: Locator, id: string, value: string) {
  const input = s.locator(`[data-param="${id}"] input`);
  await input.fill(value); await input.press('Enter');
  return input;
}
interface Win { xMin: number; xMax: number; yMin: number; yMax: number }
/** World point → SVG user units of one scene, from the plane convention (uniform scale, centred window, y up). */
export async function worldToSvg(plot: Locator, p: { x: number; y: number }) {
  const w: Win = JSON.parse((await plot.getAttribute('data-window'))!);
  const [, , width, height] = (await plot.locator('svg.plane').getAttribute('viewBox'))!.split(' ').map(Number) as [number, number, number, number];
  const scale = Math.min(width / (w.xMax - w.xMin), height / (w.yMax - w.yMin));
  return { x: width / 2 + (p.x - (w.xMin + w.xMax) / 2) * scale, y: height / 2 - (p.y - (w.yMin + w.yMax) / 2) * scale };
}
/** World point → page pixels (for pointer and touch gestures). */
export async function worldToPage(plot: Locator, p: { x: number; y: number }) {
  const svg = await worldToSvg(plot, p), box = (await plot.locator('svg.plane').boundingBox())!;
  const [, , width] = (await plot.locator('svg.plane').getAttribute('viewBox'))!.split(' ').map(Number) as [number, number, number];
  const k = box.width / width;
  return { x: box.x + svg.x * k, y: box.y + svg.y * k };
}
/** A drawn segment's endpoints, read from the DOM. */
export async function segment(plot: Locator, name: string) {
  const line = plot.locator(`line[data-part="${name}"]`);
  return { from: { x: Number(await line.getAttribute('x1')), y: Number(await line.getAttribute('y1')) }, to: { x: Number(await line.getAttribute('x2')), y: Number(await line.getAttribute('y2')) } };
}
export async function dragHandle(page: Page, plot: Locator, index: number, to: { x: number; y: number }) {
  const handle = plot.locator('[data-handle]').nth(index);
  await plot.locator('svg').evaluate(e => e.scrollIntoView({ block: 'center' }));
  const hit = (await handle.locator('.hit').boundingBox())!, end = await worldToPage(plot, to);
  await page.mouse.move(hit.x + hit.width / 2, hit.y + hit.height / 2); await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 }); await page.mouse.up();
  return handle;
}
export async function touchDrag(page: Page, plot: Locator, index: number, to: { x: number; y: number }, announcement: Locator) {
  const handle = plot.locator('[data-handle]').nth(index);
  await plot.locator('svg').evaluate(e => e.scrollIntoView({ block: 'center' }));
  const hit = (await handle.locator('.hit').boundingBox())!, end = await worldToPage(plot, to);
  expect(hit.width).toBeGreaterThanOrEqual(44);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: hit.x + hit.width / 2, y: hit.y + hit.height / 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: end.x, y: end.y }] });
  await expect(announcement).toBeEmpty();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
  await expect(announcement).not.toBeEmpty();
}
export async function replayWorked(page: Page, kind: string) {
  const work = page.locator(`[data-stage="calculus-worked-${kind}"]`), trace = work.locator('[data-trace-index]');
  await expect(work).toHaveAttribute('data-hydrated', 'true');
  await work.getByRole('button', { name: /^Next/ }).click(); await expect(trace).toHaveAttribute('data-trace-index', '1');
  await work.getByRole('button', { name: /Previous/ }).click(); await expect(trace).toHaveAttribute('data-trace-index', '0');
  await work.getByRole('slider').press('ArrowRight'); await expect(trace).toHaveAttribute('data-trace-index', '1');
  await work.locator('[data-action="play"]').click(); await expect(trace).toHaveAttribute('data-trace-index', '2', { timeout: 5000 }); await work.locator('[data-action="play"]').click();
  return work;
}
/** Wrong answer → corrective feedback and a worked solution; reset; literal right answer → correct. */
export async function exercises(page: Page, answers: Record<string, string[]>, prefix: string) {
  const all = page.locator(`[data-exercise^="${prefix}"]`); await expect(all).toHaveCount(5);
  for (const e of await all.all()) {
    const radios = e.locator('input[type="radio"]'), inputs = e.locator('[data-field]');
    if (await radios.count()) await radios.nth(1).check(); else for (const input of await inputs.all()) await input.fill('999');
    await e.locator('[data-action="check"]').click(); await expect(e).toHaveAttribute('data-result', 'incorrect');
    await expect(e.locator('[data-feedback]')).not.toBeEmpty();
    await e.locator('[data-action="show-solution"]').click(); await expect(e.locator('[data-solution]')).toBeVisible();
    await e.locator('[data-action="reset-exercise"]').click();
    if (await radios.count()) await radios.first().check(); else for (const [i, v] of answers[(await e.getAttribute('data-exercise'))!]!.entries()) await inputs.nth(i).fill(v);
    await e.locator('[data-action="check"]').click(); await expect(e).toHaveAttribute('data-result', 'correct');
  }
}
export async function axe(page: Page) {
  expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations).toEqual([]);
}
/** Re-anchor at the top after an invalid entry scrolled focus under the sticky header (same policy as Part II scans). */
export async function scanStage(page: Page) { await page.evaluate(() => window.scrollTo(0, 0)); await axe(page); }
