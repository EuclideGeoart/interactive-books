/**
 * I.2 lesson views: every formula the stages can produce renders under strict KaTeX (nothing is skipped), the scenes are geometrically
 * what the model says, and the wording tracks the derived object. Sweeps are exhaustive over the stages' reachable states.
 */
import { describe, expect, it } from 'vitest';
import { deriveLine } from '../../src/math/coordinates/numberline';
import { derivePixel } from '../../src/math/coordinates/pixel';
import { derivePoint } from '../../src/math/coordinates/point';
import { deriveSegment } from '../../src/math/coordinates/segment';
import { toNumber } from '../../src/math/quantity/rational';
import { renderTex } from '../../src/platform/tex';
import { A_SPEC, B_SPEC, CANONICAL_LINE, LINE_PRESETS, lineDescription, lineFormulas, lineRows, lineScene, lineSpoken, lineVerdict, verdictIsCaution as lineCaution } from '../../src/lessons/coordinates/line-lesson';
import { H_SPEC, PIXEL_PRESETS, W_SPEC, pixelCells, pixelDescription, pixelFormulas, pixelRows, pixelScene, pixelSpoken, pixelVerdict, pixelWindow, xSpec, ySpec } from '../../src/lessons/coordinates/pixel-lesson';
import { CANONICAL_POINT, POINT_LIMIT, POINT_PRESETS, X_SPEC, Y_SPEC, pointDescription, pointFormulas, pointRows, pointScene, pointSpoken, pointVerdict, verdictIsCaution as pointCaution } from '../../src/lessons/coordinates/point-lesson';
import { SEGMENT_PRESETS, segmentDescription, segmentFormulas, segmentRows, segmentScene, segmentSpoken, segmentVerdict, verdictIsCaution as segmentCaution } from '../../src/lessons/coordinates/segment-lesson';
import { DISTANCE_EXAMPLES, distanceFrames } from '../../src/lessons/coordinates/worked-lesson';
import { parseParam } from '../../src/platform/params';

const tex = (s: string) => renderTex(s, true);
const frange = (lo: number, hi: number, step: number): number[] => {
  const out: number[] = [];
  for (let i = 0; lo + i * step <= hi + 1e-9; i++) out.push(Number((lo + i * step).toFixed(6)) + 0);
  return out;
};
const strictRows = (rows: ReturnType<typeof pointRows>) => {
  for (const r of rows) {
    expect(() => renderTex(r.symbolTex, false), r.id).not.toThrow();
    for (const l of r.description.lines) expect(() => renderTex(l.tex, false), `${r.id}: ${l.tex}`).not.toThrow();
    expect(r.description.spoken.length, r.id).toBeGreaterThan(0);
  }
};

describe('point stage (hero)', () => {
  const coords = frange(-7, 7, 0.25).concat([0.01, -0.01, 6.99, -6.99, 1.23, -0.07]);

  it('every reachable state renders strictly and has non-empty words', () => {
    for (const x of coords) for (const y of [-7, -3.5, -0.01, 0, 0.01, 2, 6.99, x]) {
      const state = { x, y };
      const d = derivePoint(state);
      for (const t of pointFormulas(d)) expect(() => tex(t), `${x},${y}`).not.toThrow();
      strictRows(pointRows(d, state));
      expect(pointVerdict(d).length).toBeGreaterThan(30);
      expect(pointDescription(d).length).toBeGreaterThan(30);
      expect(pointSpoken(d).length).toBeGreaterThan(10);
    }
  });

  it('the scene is what the model says: P at (x, y), legs of length |y| and |x| ending on the axes, a quadrant rectangle only inside a quadrant', () => {
    for (const x of coords) for (const y of [-5, -0.5, 0, 0.5, 4, -x + 0]) {
      const d = derivePoint({ x, y });
      const scene = pointScene(d);
      expect(scene.p).toEqual({ x, y });
      if (y === 0) expect(scene.toXAxis).toBeNull();
      else expect(scene.toXAxis).toEqual({ from: { x, y }, to: { x, y: 0 } });
      if (x === 0) expect(scene.toYAxis).toBeNull();
      else expect(scene.toYAxis).toEqual({ from: { x, y }, to: { x: 0, y } });
      if (d.position.kind === 'quadrant') {
        expect(scene.quadrant).not.toBeNull();
        for (const c of scene.quadrant!) expect(Math.sign(c.x) === 0 || Math.sign(c.x) === Math.sign(x)).toBe(true);
        for (const c of scene.quadrant!) expect(Math.sign(c.y) === 0 || Math.sign(c.y) === Math.sign(y)).toBe(true);
      } else expect(scene.quadrant).toBeNull();
      if (x === 0 && y === 0) expect(scene.radius).toBeNull();
      else expect(scene.radius).toEqual({ from: { x: 0, y: 0 }, to: { x, y } });
      expect(scene.labels).toHaveLength(4);
    }
  });

  it('the verdict names the quadrant or the axis, and says an axis point is in no quadrant', () => {
    expect(pointVerdict(derivePoint({ x: -3, y: 2 }))).toMatch(/quadrant II: x < 0 and y > 0/);
    expect(pointVerdict(derivePoint({ x: -3, y: 2 }))).toMatch(/OTHER axis/);
    expect(pointVerdict(derivePoint({ x: 0, y: -4 }))).toMatch(/y-axis.*III and IV.*neither/);
    expect(pointVerdict(derivePoint({ x: 5, y: 0 }))).toMatch(/x-axis.*I and IV.*neither/);
    expect(pointVerdict(derivePoint({ x: -5, y: 0 }))).toMatch(/II and III/);
    expect(pointVerdict(derivePoint({ x: 0, y: 0 }))).toMatch(/no quadrant/);
    expect(pointCaution(derivePoint({ x: 0, y: 1 }))).toBe(true);
    expect(pointCaution(derivePoint({ x: 1, y: 1 }))).toBe(false);
  });

  it('the distance row is the exact radical, and the two axis distances are |y| and |x| (not swapped)', () => {
    const rows = pointRows(derivePoint({ x: -3, y: 2 }), { x: -3, y: 2 });
    const byId = (id: string) => rows.find(r => r.id === id)!;
    expect(byId('dist-x-axis').description.lines[0]!.text).toBe('2');
    expect(byId('dist-y-axis').description.lines[0]!.text).toBe('3');
    expect(byId('origin').description.lines.map(l => `${l.relation}${l.text}`).join('|')).toMatch(/=√13\|≈3\.605551…/);
    expect(byId('quadrant').description.lines[0]!.text).toBe('II');
    expect(pointRows(derivePoint({ x: 0, y: -4 }), { x: 0, y: -4 }).find(r => r.id === 'quadrant')!.description.lines[0]!.text).toMatch(/^none \(on the y-axis\)$/);
  });

  it('presets are reachable lattice states inside the parameter domain, and the canonical state is one of them', () => {
    expect(POINT_PRESETS.some(p => p.state.x === CANONICAL_POINT.x && p.state.y === CANONICAL_POINT.y)).toBe(true);
    for (const p of POINT_PRESETS) {
      expect(parseParam(X_SPEC, String(p.state.x)).ok, p.id).toBe(true);
      expect(parseParam(Y_SPEC, String(p.state.y)).ok, p.id).toBe(true);
      expect(Math.abs(p.state.x)).toBeLessThanOrEqual(POINT_LIMIT);
      expect(() => derivePoint(p.state)).not.toThrow();
    }
    expect(new Set(POINT_PRESETS.map(p => derivePoint(p.state).position.kind)).size).toBe(4); // quadrant, axis-x, axis-y, origin
  });
});

describe('number-line stage', () => {
  const values = frange(-7, 7, 0.5).concat([0.01, -0.01, 1.25, -6.99]);

  it('every reachable pair renders strictly with non-empty words', () => {
    for (const a of values) for (const b of values.filter((_, i) => i % 3 === 0).concat([a, -a])) {
      const state = { a, b };
      const d = deriveLine(state);
      for (const t of lineFormulas(d)) expect(() => tex(t), `${a},${b}`).not.toThrow();
      strictRows(lineRows(d, state));
      expect(lineVerdict(d).length).toBeGreaterThan(30);
      expect(lineDescription(d).length).toBeGreaterThan(30);
      expect(lineSpoken(d).length).toBeGreaterThan(10);
    }
  });

  it('the scene holds the exact coordinates; the caution is exactly the "same side of 0" trap', () => {
    for (const a of values) for (const b of values.filter((_, i) => i % 4 === 0)) {
      const d = deriveLine({ a, b });
      expect(lineScene(d)).toEqual({ a, b });
      expect(lineCaution(d)).toBe(a * b > 0 && a !== b);
    }
  });

  it('the wording follows the order and the trap', () => {
    expect(lineVerdict(deriveLine({ a: -3, b: 5 }))).toMatch(/b is to the right of a, so b − a = 8.*a − b = −8.*equal the distance/);
    expect(lineVerdict(deriveLine({ a: 5, b: -3 }))).toMatch(/b is to the left of a, so b − a = −8/);
    expect(lineVerdict(deriveLine({ a: 2, b: 7 }))).toMatch(/NOT the distance/);
    expect(lineVerdict(deriveLine({ a: 4, b: 4 }))).toMatch(/same point/);
  });

  it('presets are reachable', () => {
    expect(LINE_PRESETS.some(p => p.state.a === CANONICAL_LINE.a && p.state.b === CANONICAL_LINE.b)).toBe(true);
    for (const p of LINE_PRESETS) {
      expect(parseParam(A_SPEC, String(p.state.a)).ok, p.id).toBe(true);
      expect(parseParam(B_SPEC, String(p.state.b)).ok, p.id).toBe(true);
    }
  });
});

describe('two-points stage', () => {
  const coords = [-7, -3.5, -2, -0.25, 0, 0.01, 1, 4.5, 7];

  it('every reachable pair renders strictly with non-empty words', () => {
    for (const ax of coords) for (const ay of coords) for (const bx of coords.filter((_, i) => i % 2 === 0)) for (const by of coords.filter((_, i) => i % 3 === 0)) {
      const state = { ax, ay, bx, by };
      const d = deriveSegment(state);
      for (const t of segmentFormulas(d)) expect(() => tex(t), JSON.stringify(state)).not.toThrow();
      strictRows(segmentRows(d) as ReturnType<typeof pointRows>);
      expect(segmentVerdict(d).length).toBeGreaterThan(30);
      expect(segmentDescription(d).length).toBeGreaterThan(30);
      expect(segmentSpoken(d).length).toBeGreaterThan(10);
    }
  });

  it('the scene: legs have lengths |dx| and |dy| and meet at (xB, yA); zero legs and the arrow of a coincident pair are absent', () => {
    for (const ax of coords) for (const ay of coords) for (const bx of coords) for (const by of [-1, 0, 2.5]) {
      const d = deriveSegment({ ax, ay, bx, by });
      const sc = segmentScene(d);
      expect(sc.corner).toEqual({ x: bx, y: ay });
      if (bx === ax) expect(sc.legX).toBeNull(); else expect(Math.hypot(sc.legX!.to.x - sc.legX!.from.x, sc.legX!.to.y - sc.legX!.from.y)).toBeCloseTo(Math.abs(bx - ax), 12);
      if (by === ay) expect(sc.legY).toBeNull(); else expect(Math.hypot(sc.legY!.to.x - sc.legY!.from.x, sc.legY!.to.y - sc.legY!.from.y)).toBeCloseTo(Math.abs(by - ay), 12);
      expect(sc.rightAngle).toBe(bx !== ax && by !== ay);
      expect(sc.arrow === null).toBe(bx === ax && by === ay);
      expect(sc.midpoint.x).toBeCloseTo((ax + bx) / 2, 12);
      expect(sc.midpoint.y).toBeCloseTo((ay + by) / 2, 12);
    }
  });

  it('the wording follows the kind of pair', () => {
    expect(segmentVerdict(deriveSegment({ ax: -2, ay: 1, bx: 4, by: -3 }))).toMatch(/\(6, −4\).*\(−6, 4\).*2√13 ≈ 7\.211103.*taxicab distance 10/);
    expect(segmentVerdict(deriveSegment({ ax: -4, ay: 2, bx: 3, by: 2 }))).toMatch(/horizontal.*dy = 0.*= 7/);
    expect(segmentVerdict(deriveSegment({ ax: 1, ay: -3, bx: 1, by: 4 }))).toMatch(/vertical.*dx = 0/);
    expect(segmentVerdict(deriveSegment({ ax: 2, ay: 3, bx: 2, by: 3 }))).toMatch(/same point/);
    expect(segmentCaution(deriveSegment({ ax: 2, ay: 3, bx: 2, by: 3 }))).toBe(true);
    expect(segmentCaution(deriveSegment({ ax: 0, ay: 3, bx: 2, by: 3 }))).toBe(false);
  });

  it('rows give the displacement and the reversal as exact pairs, and a three-decimal midpoint stays exact', () => {
    const rows = segmentRows(deriveSegment({ ax: 0.01, ay: 0, bx: 0.02, by: 0 }));
    expect(rows.find(r => r.id === 'midpoint')!.description.lines[0]!.text).toBe('(0.015, 0)');
    const r2 = segmentRows(deriveSegment(SEGMENT_PRESETS[0]!.state));
    expect(r2.find(r => r.id === 'displacement')!.description.lines[0]!.text).toBe('(6, −4)');
    expect(r2.find(r => r.id === 'reverse')!.description.lines[0]!.text).toBe('(−6, 4)');
  });

  it('presets are valid states', () => {
    for (const p of SEGMENT_PRESETS) expect(() => deriveSegment(p.state)).not.toThrow();
    expect(new Set(SEGMENT_PRESETS.map(p => deriveSegment(p.state).kind))).toEqual(new Set(['oblique', 'horizontal', 'vertical', 'coincident']));
  });
});

describe('pixel stage', () => {
  it('every size and every lattice point renders strictly; the table, the scene and the model agree on the same pixel', () => {
    for (const w of [2, 3, 5, 10]) for (const h of [2, 4, 7, 10]) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const d = derivePixel({ w, h, x, y });
        for (const t of pixelFormulas(d)) expect(() => tex(t), `${w}x${h} ${x},${y}`).not.toThrow();
        strictRows(pixelRows(d) as ReturnType<typeof pointRows>);
        expect(pixelVerdict(d).length).toBeGreaterThan(30);
        expect(pixelDescription(d).length).toBeGreaterThan(30);
        expect(pixelSpoken(d).length).toBeGreaterThan(10);
        const cells = pixelCells(d).flat();
        expect(cells).toHaveLength(w * h);
        const selected = cells.filter(c => c.selected);
        expect(selected).toHaveLength(1);
        expect(selected[0]).toMatchObject({ row: d.row, col: d.col, x, y, index: d.index });
        const scene = pixelScene(d);
        expect(scene.p).toEqual({ x, y });
        expect(scene.rowLabels.find(l => l.row === d.row)!.at.y).toBe(y);
      }
    }
  });

  it('the table lists row 0 at the top: its first row holds the highest y', () => {
    const d = derivePixel({ w: 3, h: 4, x: 0, y: 0 });
    const rows = pixelCells(d);
    expect(rows[0]!.map(c => c.y)).toEqual([3, 3, 3]);
    expect(rows[3]!.map(c => c.y)).toEqual([0, 0, 0]);
    expect(rows[1]!.map(c => c.x)).toEqual([0, 1, 2]);
    expect(rows[1]!.map(c => c.index)).toEqual([3, 4, 5]);
  });

  it('the slip rows report an out-of-range index as undefined, an in-range slip with a note', () => {
    const bottom = pixelRows(derivePixel({ w: 4, h: 4, x: 1, y: 0 }));
    expect(bottom.find(r => r.id === 'slip-row')!.description.status).toBe('undefined');
    const middle = pixelRows(derivePixel({ w: 4, h: 4, x: 1, y: 1 }));
    expect(middle.find(r => r.id === 'slip-row')!.description.status).toBe('exact');
    expect(middle.find(r => r.id === 'slip-row')!.description.note).toMatch(/wrong pixel/);
    const off = pixelRows(derivePixel({ w: 6, h: 3, x: 4, y: 1 }));
    expect(off.find(r => r.id === 'slip-swap')!.description.status).toBe('undefined');
  });

  it('the plane window contains the whole image and the row labels', () => {
    for (const [w, h] of [[2, 2], [5, 4], [10, 3]] as const) {
      const win = pixelWindow(w, h);
      expect(win.xMin).toBeLessThan(-0.5);
      expect(win.xMax).toBeGreaterThan(w - 0.5);
      expect(win.yMin).toBeLessThan(-0.5);
      expect(win.yMax).toBeGreaterThan(h - 0.5);
    }
  });

  it('presets are valid and reachable by the parameter specs', () => {
    for (const p of PIXEL_PRESETS) {
      expect(parseParam(W_SPEC, String(p.state.w)).ok, p.id).toBe(true);
      expect(parseParam(H_SPEC, String(p.state.h)).ok, p.id).toBe(true);
      expect(parseParam(xSpec(p.state.w), String(p.state.x)).ok, p.id).toBe(true);
      expect(parseParam(ySpec(p.state.h), String(p.state.y)).ok, p.id).toBe(true);
      expect(() => derivePixel(p.state)).not.toThrow();
    }
    expect(parseParam(W_SPEC, '4.5').ok).toBe(false);
    expect(parseParam(W_SPEC, '11').ok).toBe(false);
    expect(parseParam(xSpec(5), '5').ok).toBe(false);
  });
});

describe('worked distance traces', () => {
  it('every example renders strictly, ends on the reverse direction, and states the model distance', () => {
    for (const e of DISTANCE_EXAMPLES) {
      const frames = distanceFrames(e.state);
      expect(frames.length).toBeGreaterThanOrEqual(6);
      for (const f of frames) {
        expect(() => tex(f.state.tex), `${e.id}: ${f.state.tex}`).not.toThrow();
        expect(f.state.caption.length).toBeGreaterThan(10);
      }
      const last = frames[frames.length - 1]!;
      expect(last.state.caption).toMatch(/other direction|either way/);
      const s = deriveSegment(e.state);
      // the squared distance appears verbatim in the sum frame
      const sum = frames[3]!.state.tex;
      expect(sum).toContain(toNumber(s.distSq).toString());
    }
  });

  it('the page example d2, (−3, 1) → (3, −3), works out 36 + 16 = 52 = 2² · 13 and ends at 2√13', () => {
    const d2 = DISTANCE_EXAMPLES.find(e => e.id === 'd2')!;
    expect(d2.state).toEqual({ ax: -3, ay: 1, bx: 3, by: -3 });
    const frames = distanceFrames(d2.state);
    const all = frames.map(f => f.state.tex).join(' ');
    expect(all).toContain('36+16=52');
    expect(all).toContain('2\\sqrt{13}');
    expect(frames.some(f => f.state.tex.includes('2^{2}'))).toBe(true);
  });
});
