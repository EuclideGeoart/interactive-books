import { expect, type Locator, type Page } from '@playwright/test';

/** The plane shows [−7, 7] on both axes with ONE scale (plan §3.1, §7.3). Expected pixels are derived from that
 *  convention alone — never from the application's own viewport code. */
export const HALF_WINDOW = 7;
export const MINUS = '−';

export interface Box { x: number; y: number; width: number; height: number }

/** Wait until the stage is hydrated and fonts are loaded; returns the stage locator. */
export async function openStage(page: Page, path = 'foundation/'): Promise<Locator> {
  await page.goto(path);
  const stage = page.locator('[data-stage="vector"]').first();
  await expect(stage).toHaveAttribute('data-hydrated', 'true');
  await page.evaluate(() => document.fonts.ready);
  return stage;
}

/** Content box of the plane's SVG (inside its 1px border), in page pixels. */
export async function planeBox(stage: Locator): Promise<Box> {
  return stage.locator('svg.plane').evaluate(svg => {
    const r = svg.getBoundingClientRect();
    const s = getComputedStyle(svg);
    const left = parseFloat(s.borderLeftWidth), top = parseFloat(s.borderTopWidth);
    return { x: r.left + left, y: r.top + top, width: r.width - left - parseFloat(s.borderRightWidth), height: r.height - top - parseFloat(s.borderBottomWidth) };
  });
}

/** World → page pixels: x right, y UP. */
export function worldToPage(box: Box, x: number, y: number): { x: number; y: number } {
  const scale = Math.min(box.width, box.height) / (2 * HALF_WINDOW);
  return { x: box.x + box.width / 2 + x * scale, y: box.y + box.height / 2 - y * scale };
}

export async function handleCenter(stage: Locator): Promise<{ x: number; y: number }> {
  const b = (await stage.locator('.drag-point .ring').boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

export async function stageState(stage: Locator): Promise<{ x: number; y: number }> {
  return { x: Number(await stage.getAttribute('data-x')), y: Number(await stage.getAttribute('data-y')) };
}

/** Text of one inspector row's value lines as a reader sees them, e.g. ["= √13", "≈ 3.605551…"]. */
export async function rowLines(stage: Locator, id: string): Promise<string[]> {
  return stage.locator(`[data-quantity="${id}"] dd .line`).evaluateAll(els =>
    els.map(e => `${e.querySelector('.rel')?.textContent ?? ''} ${e.querySelector('.val')?.textContent ?? ''}`.replace(/\s+/g, ' ').trim()),
  );
}

/** Choose a snap option by its visible label (the radio input overlays its label, so click the label). */
export const chooseSnap = (stage: Locator, label: string) => stage.locator('label.segment', { hasText: new RegExp(`^${label}$`) }).click();

export const rowStatus = (stage: Locator, id: string) => stage.locator(`[data-quantity="${id}"]`).getAttribute('data-status');

/** Pointer-drag the handle to a world point with intermediate moves (like a real hand). */
/** Scroll so the whole plane is inside the viewport (mouse coordinates are viewport coordinates). */
export async function showPlane(stage: Locator): Promise<void> {
  await stage.locator('svg.plane').evaluate(el => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
}

export async function dragHandleTo(page: Page, stage: Locator, x: number, y: number, steps = 14): Promise<void> {
  await showPlane(stage);
  const from = await handleCenter(stage);
  const to = worldToPage(await planeBox(stage), x, y);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps });
  await page.mouse.up();
}

export const param = (stage: Locator, axis: 'x' | 'y') => stage.getByRole('spinbutton', { name: `${axis}-component` });

/** Type into a parameter field and commit (a text input fires `change` on blur / Enter). */
export async function setParam(stage: Locator, axis: 'x' | 'y', text: string): Promise<void> {
  const field = param(stage, axis);
  await field.fill(text);
  await field.press('Enter');
}

/**
 * The central formula ↔ visual ↔ inspector synchronisation check (plan §12.5, §15.10): for the given
 * mathematical state, the handle sits at the independently computed pixel, and the inspector and formula
 * panel both show that same state.
 */
export async function expectInSync(stage: Locator, x: number, y: number): Promise<void> {
  await showPlane(stage);
  const fmt = (n: number) => (n < 0 ? `${MINUS}${Math.abs(n)}` : String(Math.abs(n) === 0 ? 0 : n));
  await expect(stage).toHaveAttribute('data-x', String(x));
  await expect(stage).toHaveAttribute('data-y', String(y));
  const expected = worldToPage(await planeBox(stage), x, y);
  const actual = await handleCenter(stage);
  expect(Math.abs(actual.x - expected.x), `handle x px (${actual.x} vs ${expected.x})`).toBeLessThan(1.5);
  expect(Math.abs(actual.y - expected.y), `handle y px (${actual.y} vs ${expected.y})`).toBeLessThan(1.5);
  expect(await rowLines(stage, 'vector')).toEqual([`= (${fmt(x)}, ${fmt(y)})`]);
  expect(await rowLines(stage, 'x')).toEqual([`= ${fmt(x)}`]);
  expect(await rowLines(stage, 'y')).toEqual([`= ${fmt(y)}`]);
  const column = await stage.locator('.formula-panel .formula').first().getAttribute('data-tex');
  expect(column).toBe(`\\mathbf{v}=\\begin{bmatrix}${fmt(x).replace(MINUS, '-')}\\\\${fmt(y).replace(MINUS, '-')}\\end{bmatrix}`);
}

export async function noPageOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}
