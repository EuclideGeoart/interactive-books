import { describe, expect, it } from 'vitest';
import { compareDirections } from '../../src/math/vector2/direction';
import { derivePlacement, withTail, withTip } from '../../src/math/vector2/placement';
import { deriveVector2 } from '../../src/math/vector2/vector2';
import { DIRECTION_PRESETS, WORKED_EXAMPLES, directionFormulas, directionFrames, directionRows, directionScene, verdictText, workedFrames } from '../../src/lessons/vectors/direction-lesson';
import { CANONICAL_PLACEMENT, placementFormulas, placementRows, placementScene } from '../../src/lessons/vectors/placement-lesson';
import { areaEquation, areaRows, pythagorasScene } from '../../src/lessons/vectors/pythagoras-lesson';
import { EXERCISES, exerciseById, parseNumber } from '../../src/lessons/vectors/exercises';
import { renderTex } from '../../src/platform/tex';

const area = (c: readonly { x: number; y: number }[]) => {
  let s = 0;
  for (let i = 0; i < c.length; i++) { const a = c[i]!; const b = c[(i + 1) % c.length]!; s += a.x * b.y - b.x * a.y; }
  return Math.abs(s) / 2;
};
const centroid = (c: readonly { x: number; y: number }[]) => ({ x: c.reduce((s, p) => s + p.x, 0) / c.length, y: c.reduce((s, p) => s + p.y, 0) / c.length });
const grid = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

describe('pythagoras figure', () => {
  it('square areas are side², x² + y² = ‖v‖², and squares lie outside the triangle', () => {
    for (const x of grid) for (const y of grid) {
      const d = deriveVector2({ x, y });
      const scene = pythagorasScene(d);
      if (x === 0 || y === 0) { expect(scene.squares).toHaveLength(0); continue; }
      const [sx, sy, sh] = scene.squares;
      expect(area(sx!.corners)).toBeCloseTo(x * x, 9);
      expect(area(sy!.corners)).toBeCloseTo(y * y, 9);
      expect(area(sh!.corners)).toBeCloseTo(x * x + y * y, 9);
      const tri = centroid([scene.origin, scene.foot, scene.tip]);
      for (const s of scene.squares) {
        const c = s.centre;
        // The square's centre is on the far side of its base from the triangle's centroid.
        const [a, b] = s.corners;
        const cross = (p: { x: number; y: number }) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
        expect(Math.sign(cross(c))).toBe(-Math.sign(cross(tri)));
      }
    }
  });
  it('rows and equation use exact integers when the vector is integral', () => {
    const rows = areaRows(deriveVector2({ x: 3, y: 2 }));
    expect(rows.map(r => r.id)).toEqual(['x-squared', 'y-squared', 'magnitude-squared', 'magnitude']);
    expect(rows[2]!.description.lines[0]!.relation).toBe('=');
    expect(() => renderTex(areaEquation(deriveVector2({ x: 3, y: 2 })), true)).not.toThrow();
    expect(() => renderTex(areaEquation(deriveVector2({ x: 0, y: 0 })), true)).not.toThrow();
  });
});

describe('placement', () => {
  it('sliding the tail never changes v, its rows or its derived values', () => {
    const base = derivePlacement(CANONICAL_PLACEMENT);
    for (const tx of grid) for (const ty of grid) {
      const d = derivePlacement(withTail(CANONICAL_PLACEMENT, { x: tx, y: ty }));
      expect(d.vector).toEqual(base.vector);
      expect(d.measured).toEqual({ x: base.vector.x, y: base.vector.y });
      const rows = placementRows(d);
      expect(rows.filter(r => !['tail', 'tip'].includes(r.id))).toEqual(placementRows(base).filter(r => !['tail', 'tip'].includes(r.id)));
    }
  });
  it('moving the tip changes v and keeps the tail', () => {
    const next = withTip(CANONICAL_PLACEMENT, { x: 3, y: 3 }, 4);
    expect(next.tx).toBe(-2); expect(next.ty).toBe(-1);
    expect([next.vx, next.vy]).toEqual([5 > 4 ? 4 : 5, 4]);
  });
  it('formulas and scene render', () => {
    for (const f of placementFormulas(derivePlacement(CANONICAL_PLACEMENT))) expect(() => renderTex(f, true)).not.toThrow();
    expect(placementScene(derivePlacement({ tx: 1, ty: 1, vx: 0, vy: 0 })).arrow).toBeNull();
  });
});

describe('direction lesson', () => {
  it('every preset renders strict KaTeX, rows and a verdict', () => {
    for (const p of DIRECTION_PRESETS) {
      const c = compareDirections({ x: p.x, y: p.y });
      for (const f of directionFormulas(c)) expect(() => renderTex(f, true)).not.toThrow();
      expect(directionRows(c)).toHaveLength(5);
      expect(verdictText(c).length).toBeGreaterThan(10);
      for (const fr of directionFrames(c)) expect(() => renderTex(fr.state.tex, true)).not.toThrow();
    }
  });
  it('shows a naive arrow only when it disagrees with atan2', () => {
    const scene = (x: number, y: number) => { const v = { x, y }; return directionScene(compareDirections(v), deriveVector2(v)); };
    expect(scene(3, 2).naiveArrow).toBeNull();
    expect(scene(-3, 2).naiveArrow).not.toBeNull();
    expect(scene(0, 4).naiveArrow).toBeNull();
    expect(scene(0, 0).arrow).toBeNull();
  });
  it('worked examples are deterministic and strict-KaTeX safe', () => {
    for (const e of WORKED_EXAMPLES) {
      const v = { x: e.x, y: e.y };
      const a = workedFrames(v, deriveVector2(v));
      const b = workedFrames(v, deriveVector2(v));
      expect(a.map(f => f.state)).toEqual(b.map(f => f.state));
      for (const f of a) expect(() => renderTex(f.state.tex, true)).not.toThrow();
    }
  });
});

describe('exercises', () => {
  const answerFor: Record<string, Record<string, string>> = {
    'magnitude-5-12': { length: '13' },
    'exact-vs-approx': { choice: 'radical' },
    'atan-predict': { choice: 'minus-quarter' },
    'atan2-value': { theta: '2.554' },
    'same-ratio': { x: '3', y: '-2' },
    translation: { qx: '4', qy: '1', q2x: '1', q2y: '6', len2: '13' },
    'same-magnitude': { x: '-2', y: '3' },
    numerics: { choice: 'underflow' },
    'zero-direction': { choice: 'zero' },
  };
  it('has unique ids and a known right answer for each', () => {
    expect(new Set(EXERCISES.map(e => e.id)).size).toBe(EXERCISES.length);
    expect(Object.keys(answerFor).sort()).toEqual(EXERCISES.map(e => e.id).sort());
    for (const e of EXERCISES) expect(e.grade(answerFor[e.id]!).correct, e.id).toBe(true);
  });
  it('rejects empty and non-numeric input without crashing', () => {
    for (const e of EXERCISES) expect(e.grade({}).correct).toBe(false);
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('−2.5')).toBe(-2.5);
  });
  it('recognises the documented misconceptions', () => {
    const g = (id: string, a: Record<string, string>) => exerciseById(id)!.grade(a);
    expect(g('magnitude-5-12', { length: '17' }).message).toMatch(/adds the components/);
    expect(g('magnitude-5-12', { length: '169' }).message).toMatch(/‖v‖²/);
    expect(g('atan2-value', { theta: '-0.588' }).message).toMatch(/add π/);
    expect(g('same-ratio', { x: '-3', y: '2' }).correct).toBe(false);
    expect(g('same-ratio', { x: '0', y: '1' }).message).toMatch(/undefined/);
    expect(g('same-magnitude', { x: '3', y: '2' }).correct).toBe(false);
    expect(g('same-magnitude', { x: '1.5', y: '2' }).correct).toBe(false);
  });
  it('every exercise has a worked solution', () => { for (const e of EXERCISES) expect(e.solution.length).toBeGreaterThan(40); });
});
