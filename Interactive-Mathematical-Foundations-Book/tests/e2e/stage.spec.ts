import { expect, test } from '@playwright/test';
import { chooseSnap, dragHandleTo, planeBox, showPlane, worldToPage, expectInSync, handleCenter, noPageOverflow, openStage, param, rowLines, rowStatus, setParam, stageState, MINUS } from './helpers';

test.describe('canonical state (plan §15.3)', () => {
  test('v = (3, 2) with every required live value', async ({ page }) => {
    const stage = await openStage(page);
    await expectInSync(stage, 3, 2);
    expect(await rowLines(stage, 'magnitude')).toEqual(['= √13', '≈ 3.605551…']);
    expect(await rowLines(stage, 'direction')).toEqual(['≈ 0.588003 rad']);
    expect(await rowLines(stage, 'direction-degrees')).toEqual(['≈ 33.690068°']);
    expect(await rowStatus(stage, 'magnitude')).toBe('exact');
    await expect(param(stage, 'x')).toHaveValue('3');
    await expect(param(stage, 'y')).toHaveValue('2');
    await expect(stage.getByRole('button', { name: 'Reset', exact: true }).first()).toBeDisabled(); // already canonical
  });
  test('the formula panel shows the same derived values', async ({ page }) => {
    const stage = await openStage(page);
    const tex = await stage.locator('.formula-panel .formula').evaluateAll(els => els.map(e => e.getAttribute('data-tex')));
    expect(tex[1]).toContain('\\sqrt{3^{2}+2^{2}}');
    expect(tex[1]).toContain('&=\\sqrt{13}');
    expect(tex[1]).toContain('\\approx 3.605551\\ldots');
    expect(tex[2]).toContain('\\atantwo(2,3)');
    expect(tex[2]).toContain('\\approx 0.588003\\ \\mathrm{rad}');
    expect(tex[2]).toContain('\\approx 33.690068^{\\circ}');
  });
  test('the handle exposes the name, value and instructions required by plan §11.2', async ({ page }) => {
    const stage = await openStage(page);
    const handle = stage.locator('[data-handle]');
    await expect(handle).toHaveAttribute('aria-label', 'Vector endpoint. x = 3, y = 2. Magnitude approximately 3.606. Angle approximately 0.588 radians.');
    await expect(handle).toHaveAttribute('aria-roledescription', 'draggable point');
    await expect(handle).toHaveAttribute('tabindex', '0');
    const hintId = await handle.getAttribute('aria-describedby');
    expect(await page.locator(`[id="${hintId}"]`).textContent()).toMatch(/arrow keys.*Shift/);
  });
});

test.describe('pointer interaction', () => {
  test('drag to (−4, 3): every view follows the one state (and ‖v‖ becomes exactly 5)', async ({ page }) => {
    const stage = await openStage(page);
    await dragHandleTo(page, stage, -4, 3);
    await expectInSync(stage, -4, 3);
    expect(await rowLines(stage, 'magnitude')).toEqual(['= 5']); // exact integer: no approximation line
    expect(await rowLines(stage, 'direction')).toEqual(['≈ 2.498092 rad']); // atan2(3, −4), worked externally
    expect(await rowLines(stage, 'direction-degrees')).toEqual(['≈ 143.130102°']);
    expect(await stage.locator('[data-handle]').getAttribute('aria-label')).toContain(`x = minus 4, y = 3. Magnitude exactly 5.`);
  });
  test('a grab off-centre does not make the handle jump', async ({ page }) => {
    const stage = await openStage(page);
    const c = await handleCenter(stage);
    await page.mouse.move(c.x + 8, c.y - 7); // inside the 48px hit target, off the visible ring
    await page.mouse.down();
    expect(await stageState(stage)).toEqual({ x: 3, y: 2 });
    await page.mouse.move(c.x + 8, c.y - 7, { steps: 2 });
    expect(await stageState(stage)).toEqual({ x: 3, y: 2 });
    await page.mouse.up();
  });
  test('the default lattice snaps to integers and the domain is clamped (|x|, |y| ≤ 6)', async ({ page }) => {
    const stage = await openStage(page);
    await dragHandleTo(page, stage, 1.4, -2.6);
    await expectInSync(stage, 1, -3);
    await dragHandleTo(page, stage, 6.9, -6.9); // beyond the domain, inside the plane window
    await expectInSync(stage, 6, -6);
  });
  test('Snap to 0.1 gives non-integer states: magnitude is ≈ only, with no exact claim', async ({ page }) => {
    const stage = await openStage(page);
    await chooseSnap(stage, '0.1');
    await dragHandleTo(page, stage, 1.43, -2.58);
    await expect(stage).toHaveAttribute('data-x', '1.4');
    await expect(stage).toHaveAttribute('data-y', '-2.6');
    expect(await rowLines(stage, 'x')).toEqual(['= 1.4']);
    expect(await rowLines(stage, 'magnitude')).toEqual(['≈ 2.952965']); // √(1.96 + 6.76) = √8.72
    expect(await rowStatus(stage, 'magnitude')).toBe('approximate');
    const mag = await stage.locator('.formula-panel .formula').nth(1).getAttribute('data-tex');
    expect(mag).not.toContain('\\ldots'); // "…" only for known-irrational exact values
  });
  test('crossing all four quadrants keeps the angle quadrant-correct', async ({ page }) => {
    const stage = await openStage(page);
    const expected: [number, number, string][] = [[-3, 2, '≈ 2.553590 rad'], [-3, -2, `≈ ${MINUS}2.553590 rad`], [3, -2, `≈ ${MINUS}0.588003 rad`], [3, 2, '≈ 0.588003 rad']];
    for (const [x, y, angle] of expected) {
      await dragHandleTo(page, stage, x, y, 20);
      await expectInSync(stage, x, y);
      expect(await rowLines(stage, 'direction')).toEqual([angle]);
    }
  });
  test('a continuous drag through the origin crosses the undefined state and recovers', async ({ page }) => {
    const stage = await openStage(page);
    await dragHandleTo(page, stage, 0, 0);
    expect(await rowStatus(stage, 'direction')).toBe('undefined');
    await dragHandleTo(page, stage, -2, -1);
    expect(await rowStatus(stage, 'direction')).toBe('approximate');
    await expectInSync(stage, -2, -1);
  });
});

test.describe('keyboard interaction (plan §11.1)', () => {
  test('arrow keys move one lattice step, Shift moves five, results clamp, and the change is announced', async ({ page }) => {
    const stage = await openStage(page);
    const handle = stage.locator('[data-handle]');
    await handle.focus();
    await page.keyboard.press('ArrowRight');
    await expectInSync(stage, 4, 2);
    await page.keyboard.press('ArrowUp'); // world y: up increases
    await expectInSync(stage, 4, 3);
    await page.keyboard.press('Shift+ArrowLeft');
    await expectInSync(stage, -1, 3);
    await page.keyboard.press('Shift+ArrowUp'); // 3 + 5 = 8 → clamped to 6
    await expectInSync(stage, -1, 6);
    await page.keyboard.press('ArrowDown');
    await expectInSync(stage, -1, 5);
    await expect(handle).toBeFocused(); // stepping never steals focus
    await expect(stage.locator('[data-announcement]')).toContainText('Vector endpoint. x = minus 1, y = 5.');
  });
  test('the focused handle shows a visible non-colour focus indicator', async ({ page }) => {
    const stage = await openStage(page);
    await page.keyboard.press('Tab'); // skip link
    await stage.locator('[data-handle]').focus();
    await page.keyboard.press('ArrowRight');
    expect(await stage.locator('.drag-point .focus-ring').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
    expect(await stage.locator('.drag-point .focus-ring').evaluate(el => getComputedStyle(el).strokeDasharray)).not.toBe('none');
  });
});

test.describe('numeric input (plan §11.1 alternate path)', () => {
  test('typing x and y moves the vector; the typographic minus is accepted', async ({ page }) => {
    const stage = await openStage(page);
    await setParam(stage, 'x', `${MINUS}5`);
    await setParam(stage, 'y', '4');
    await expectInSync(stage, -5, 4);
    expect(await rowLines(stage, 'magnitude')).toEqual(['= √41', '≈ 6.403124…']);
  });
  test('steppers follow the grid and respect the domain', async ({ page }) => {
    const stage = await openStage(page);
    await stage.getByRole('button', { name: 'Increase x-component' }).click();
    await expectInSync(stage, 4, 2);
    await param(stage, 'x').press('ArrowDown');
    await expectInSync(stage, 3, 2);
    for (let i = 0; i < 12; i++) await stage.getByRole('button', { name: 'Decrease y-component' }).click();
    await expectInSync(stage, 3, -6);
  });
  test('invalid input is REJECTED with a reason; the model does not change; Escape abandons the draft', async ({ page }) => {
    const stage = await openStage(page);
    await setParam(stage, 'x', '7');
    await expect(stage.getByRole('alert')).toHaveText('x must be between −6 and 6.');
    await expect(param(stage, 'x')).toHaveAttribute('aria-invalid', 'true');
    await expect(stage).toHaveAttribute('data-x', '3');
    await setParam(stage, 'x', 'abc');
    await expect(stage.getByRole('alert')).toContainText('plain number');
    await expect(stage).toHaveAttribute('data-x', '3');
    await param(stage, 'x').press('Escape');
    await expect(stage.getByRole('alert')).toHaveCount(0);
    await expect(param(stage, 'x')).toHaveValue('3');
    await setParam(stage, 'y', '');
    await expect(stage.getByRole('alert')).toContainText('Enter a number');
    await expect(stage).toHaveAttribute('data-y', '2');
  });
  test('a stale error clears when the model changes underneath it (drag)', async ({ page }) => {
    const stage = await openStage(page);
    await setParam(stage, 'x', '99');
    await expect(stage.getByRole('alert')).toBeVisible();
    await dragHandleTo(page, stage, 1, 1);
    await expect(stage.getByRole('alert')).toHaveCount(0);
    await expect(param(stage, 'x')).toHaveValue('1');
  });
});

test.describe('edge cases (plan §15.4)', () => {
  test('(0, 0): magnitude 0, direction UNDEFINED, no arrow, no arc, the reason is shown and spoken', async ({ page }) => {
    const stage = await openStage(page);
    await setParam(stage, 'x', '0');
    await setParam(stage, 'y', '0');
    await expectInSync(stage, 0, 0);
    expect(await rowLines(stage, 'magnitude')).toEqual(['= 0']);
    for (const id of ['direction', 'direction-degrees']) {
      expect(await rowStatus(stage, id)).toBe('undefined');
      expect(await rowLines(stage, id)).toEqual(['= undefined']);
      await expect(stage.locator(`[data-quantity="${id}"] .note`)).toHaveText('⚠ The zero vector has no direction.');
    }
    await expect(stage.locator('[data-part="vector"]')).toHaveCount(0);
    await expect(stage.locator('[data-part="angle-arc"]')).toHaveCount(0);
    await expect(stage.locator('[data-part="zero-note"]')).toContainText('zero vector: no direction');
    await expect(stage.locator('[data-handle]')).toHaveAttribute('aria-label', /Direction undefined: the zero vector has no direction\./);
    expect(await stage.locator('.formula-panel .formula').nth(2).getAttribute('data-tex')).toContain('undefined');
  });
  test('(0, 0): the "zero vector" note is centred above the origin and lies wholly inside the plane (C1 follow-up)', async ({ page }) => {
    // Geometry only, no pixels: independent of OS font rasterisation. Guards the Linux baseline question
    // (that reference showed this label shifted right and clipped; the source anchors it centred at the origin).
    const stage = await openStage(page);
    await setParam(stage, 'x', '0');
    await setParam(stage, 'y', '0');
    await showPlane(stage);
    const note = (await stage.locator('[data-part="zero-note"]').boundingBox())!;
    const box = await planeBox(stage);
    const origin = worldToPage(box, 0, 0);
    expect(note.x, 'note starts inside the plane').toBeGreaterThanOrEqual(box.x);
    expect(note.x + note.width, 'note ends inside the plane').toBeLessThanOrEqual(box.x + box.width);
    expect(Math.abs(note.x + note.width / 2 - origin.x), 'note is centred on the origin (px)').toBeLessThan(3);
    expect(note.y + note.height, 'note sits above the origin').toBeLessThan(origin.y);
  });
  test('negative zero never reaches the screen', async ({ page }) => {
    const stage = await openStage(page);
    await setParam(stage, 'y', '-0');
    await expect(stage).toHaveAttribute('data-y', '0');
    expect(await rowLines(stage, 'y')).toEqual(['= 0']);
    expect(await rowLines(stage, 'vector')).toEqual(['= (3, 0)']);
    const text = await stage.locator('.inspector').innerText();
    expect(text).not.toMatch(/[−-]0(?![.\d])/);
  });
  test('axis-aligned vectors: ±x and ±y', async ({ page }) => {
    const stage = await openStage(page);
    const cases: [string, string, string][] = [['5', '0', '≈ 0 rad'], ['-5', '0', '≈ 3.141593 rad'], ['0', '5', '≈ 1.570796 rad'], ['0', '-5', `≈ ${MINUS}1.570796 rad`]];
    for (const [x, y, angle] of cases) {
      await setParam(stage, 'x', x);
      await setParam(stage, 'y', y);
      expect(await rowLines(stage, 'direction'), `${x},${y}`).toEqual([angle]);
      expect((await rowLines(stage, 'magnitude'))[0]).toBe('= 5');
    }
  });
  test('very small non-zero values are NOT treated as zero and NOT shown as 0', async ({ page }) => {
    const stage = await openStage(page);
    await setParam(stage, 'y', '0');
    await setParam(stage, 'x', '0.0000001');
    expect(await rowLines(stage, 'x')).toEqual(['= 1×10⁻⁷']);
    expect(await rowLines(stage, 'magnitude')).toEqual(['≈ 1×10⁻⁷']);
    expect(await rowStatus(stage, 'direction')).toBe('approximate'); // it HAS a direction (+x)
    expect(await rowLines(stage, 'direction')).toEqual(['≈ 0 rad']);
    await expect(stage.locator('[data-part="zero-note"]')).toHaveCount(0);
  });
  test('large values within the interaction bounds', async ({ page }) => {
    const stage = await openStage(page);
    await setParam(stage, 'x', '6');
    await setParam(stage, 'y', '-6');
    await expectInSync(stage, 6, -6);
    expect(await rowLines(stage, 'magnitude')).toEqual(['= 6√2', '≈ 8.485281…']); // √72 = 6√2
  });
  test('integer states give exact forms: (3,4) → 5, (1,1) → √2, (2,2) → 2√2', async ({ page }) => {
    const stage = await openStage(page);
    for (const [x, y, lines] of [['3', '4', ['= 5']], ['1', '1', ['= √2', '≈ 1.414214…']], ['2', '2', ['= 2√2', '≈ 2.828427…']]] as const) {
      await setParam(stage, 'x', x);
      await setParam(stage, 'y', y);
      expect(await rowLines(stage, 'magnitude')).toEqual(lines);
    }
  });
});

test.describe('reset (plan §13 B)', () => {
  test('restores the canonical state, grid and trace', async ({ page }) => {
    const stage = await openStage(page);
    await chooseSnap(stage, 'Free');
    await dragHandleTo(page, stage, -2.37, 4.11);
    await stage.getByRole('button', { name: 'Next', exact: false }).first().click();
    await stage.locator('[data-action="reset"]').click();
    await expectInSync(stage, 3, 2);
    await expect(stage.getByRole('radio', { name: '1', exact: true })).toBeChecked();
    await expect(stage.locator('[data-trace-count]')).toHaveText('Step 1 of 4');
    await expect(stage.locator('[data-action="reset"]')).toBeDisabled();
  });
});

test.describe('"show the work" trace (plan §2.4)', () => {
  test('Next / Previous / scrubber select immutable frames; going back restores exactly the earlier frame', async ({ page }) => {
    const stage = await openStage(page);
    const trace = stage.getByRole('group', { name: 'Computing the magnitude' });
    const tex = () => trace.locator('.formula').getAttribute('data-tex');
    const frames: (string | null)[] = [await tex()];
    expect(frames[0]).toBe('\\mathbf{v}=\\begin{bmatrix}3\\\\2\\end{bmatrix}');
    await expect(trace.getByRole('button', { name: /Previous/ })).toBeDisabled();
    for (let i = 0; i < 3; i++) { await trace.getByRole('button', { name: /Next/ }).click(); frames.push(await tex()); }
    await expect(trace.getByRole('button', { name: /Next/ })).toBeDisabled();
    expect(frames[1]).toBe('x^{2}=3^{2}=9,\\qquad y^{2}=2^{2}=4');
    expect(frames[2]).toBe('x^{2}+y^{2}=9+4=13');
    expect(frames[3]).toBe('\\norm{\\mathbf{v}}=\\sqrt{13}\\approx 3.605551\\ldots');
    await trace.getByRole('button', { name: /Previous/ }).click();
    expect(await tex()).toBe(frames[2]);
    await trace.getByRole('slider').fill('1');
    expect(await tex()).toBe(frames[1]);
    await expect(stage.locator('[data-trace-count]')).toHaveText('Step 2 of 4');
    await trace.getByRole('button', { name: 'Reset' }).click();
    expect(await tex()).toBe(frames[0]);
  });
  test('the trace is a function of the state: moving the vector re-derives it and keeps the selected step', async ({ page }) => {
    const stage = await openStage(page);
    const trace = stage.getByRole('group', { name: 'Computing the magnitude' });
    await trace.getByRole('slider').fill('3');
    await setParam(stage, 'x', '3');
    await setParam(stage, 'y', '4');
    await expect(trace.locator('.formula')).toHaveAttribute('data-tex', '\\norm{\\mathbf{v}}=5');
    await expect(stage.locator('[data-trace-count]')).toHaveText('Step 4 of 4');
  });
});

test.describe('drawn geometry equals the model (formula ↔ visual identity, plan §2.3, §12.5)', () => {
  /** Read the SVG geometry back from the DOM and compare with pixels derived from the plan's conventions only. */
  async function expectGeometry(stage: import('@playwright/test').Locator, x: number, y: number) {
    const box = await planeBox(stage);
    const at = (wx: number, wy: number) => worldToPage(box, wx, wy);
    const page = (ux: number, uy: number) => ({ x: box.x + ux, y: box.y + uy }); // SVG user units are CSS px, origin at the content box
    const near = (a: { x: number; y: number }, b: { x: number; y: number }, what: string) => {
      expect(Math.abs(a.x - b.x), `${what} x: ${a.x} vs ${b.x}`).toBeLessThan(1.2);
      expect(Math.abs(a.y - b.y), `${what} y: ${a.y} vs ${b.y}`).toBeLessThan(1.2);
    };
    const lineAt = async (selector: string) => { const [x1, y1, x2, y2] = await stage.locator(selector).first().evaluate(el => ['x1', 'y1', 'x2', 'y2'].map(a => Number(el.getAttribute(a)))) as number[]; return { a: page(x1!, y1!), b: page(x2!, y2!) }; };
    const line = (part: string) => lineAt(`[data-part="${part}"]`);
    const origin = at(0, 0);
    if (x !== 0) { const l = await line('x-leg'); near(l.a, origin, 'x-leg start'); near(l.b, at(x, 0), 'x-leg end'); }
    if (y !== 0) { const l = await line('y-leg'); near(l.a, at(x, 0), 'y-leg start'); near(l.b, at(x, y), 'y-leg end'); }
    if (x === 0 && y === 0) { await expect(stage.locator('[data-part="vector"]')).toHaveCount(0); return; }
    // the arrow starts at the origin and its head tip is exactly the model point
    const shaft = await stage.locator('[data-part="vector"] line').evaluate(el => ['x1', 'y1'].map(a => Number(el.getAttribute(a)))) as number[];
    near(page(shaft[0]!, shaft[1]!), origin, 'arrow tail');
    const tip = (await stage.locator('[data-part="vector"] path.fill').getAttribute('d'))!.match(/-?\d+(\.\d+)?/g)!.map(Number);
    near(page(tip[0]!, tip[1]!), at(x, y), 'arrow tip');
    // the x dimension line spans exactly the x leg (when it is long enough to be drawn)
    if (Math.abs(x) * (box.width / 14) >= 14) {
      const d = await lineAt('[data-part="x-dimension"] line');
      expect(Math.abs(Math.min(d.a.x, d.b.x) - Math.min(origin.x, at(x, 0).x))).toBeLessThan(1.2);
      expect(Math.abs(Math.max(d.a.x, d.b.x) - Math.max(origin.x, at(x, 0).x))).toBeLessThan(1.2);
    }
    // the angle arc ends at the model's direction: atan2 of the arc's own pixel offsets (y flipped back to maths coordinates)
    const arc = stage.locator('[data-part="angle-arc"]');
    if (y === 0 && x > 0) { await expect(arc).toHaveCount(0); return; }
    const pts = (await arc.getAttribute('d'))!.match(/-?\d+(\.\d+)?/g)!.map(Number);
    const first = page(pts[0]!, pts[1]!), last = page(pts[pts.length - 2]!, pts[pts.length - 1]!);
    near(first, { x: origin.x + 38, y: origin.y }, 'arc start is on the +x axis, 38 px out');
    const drawn = Math.atan2(-(last.y - origin.y), last.x - origin.x);
    expect(Math.abs(Math.hypot(last.x - origin.x, last.y - origin.y) - 38)).toBeLessThan(1);
    const gap = drawn - Math.atan2(y, x); // compare as directions: −π and +π are the same ray
    expect(Math.abs(Math.atan2(Math.sin(gap), Math.cos(gap))), `arc end angle ${drawn} vs atan2(${y}, ${x})`).toBeLessThan(0.03);
  }

  for (const [x, y] of [[3, 2], [-4, 3], [-3, -2], [4, -5], [-6, 0], [0, 5], [6, 6]] as const) {
    test(`v = (${x}, ${y})`, async ({ page }) => {
      const stage = await openStage(page);
      await setParam(stage, 'x', String(x));
      await setParam(stage, 'y', String(y));
      await showPlane(stage);
      await expectGeometry(stage, x, y);
    });
  }
  test('the zero vector draws no arrow, no legs and no arc', async ({ page }) => {
    const stage = await openStage(page);
    await setParam(stage, 'x', '0');
    await setParam(stage, 'y', '0');
    await expectGeometry(stage, 0, 0);
  });
});

test.describe('layout robustness (responsive correctness, plan §12.7)', () => {
  const escapes = (stage: import('@playwright/test').Locator) => stage.evaluate(root => {
    const box = root.getBoundingClientRect();
    const bad: string[] = [];
    for (const el of root.querySelectorAll<HTMLElement>('.stage-head, .stage-head *, .stage-grid, .stage-plane, .stage-readout, .stage-controls, .param, .segmented, .stage-work, .trace-controls, .trace-controls > *')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > box.right + 0.5 || r.left < box.left - 0.5)) bad.push(`${el.tagName}.${el.className} [${Math.round(r.left)}, ${Math.round(r.right)}] vs stage [${Math.round(box.left)}, ${Math.round(box.right)}]`);
    }
    return bad;
  });

  test('long values in free mode never push stage content past the stage edge at ANY trace frame (regression: auto grid track)', async ({ page }) => {
    const stage = await openStage(page);
    await chooseSnap(stage, 'Free');
    await setParam(stage, 'x', '-5.123456');
    await setParam(stage, 'y', '4.654321');
    const trace = stage.getByRole('group', { name: 'Computing the magnitude' });
    for (let frame = 0; frame < 4; frame++) {
      if (frame > 0) await trace.getByRole('button', { name: /Next/ }).click();
      expect(await escapes(stage), `trace frame ${frame + 1}`).toEqual([]);
      expect(await noPageOverflow(page), `trace frame ${frame + 1}: page overflow`).toBe(true);
    }
    await stage.locator('[data-action="reset"]').scrollIntoViewIfNeeded();
    await expect(stage.locator('[data-action="reset"]')).toBeInViewport({ ratio: 1 });
  });
});
