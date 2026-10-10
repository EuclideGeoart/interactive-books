import { describe, expect, it } from 'vitest';
import { compareDirections } from '../../src/math/vector2/direction';
import { derivePlacement, displacementBetween, isRepresentable, withTail, withTip } from '../../src/math/vector2/placement';
import { deriveVector2 } from '../../src/math/vector2/vector2';
import { DIRECTION_PRESETS, WORKED_EXAMPLES, directionFormulas, directionFrames, directionRows, directionScene, verdictText, workedFrames } from '../../src/lessons/vectors/direction-lesson';
import { parseParam } from '../../src/platform/params';
import { DISP_X, TAIL_X, TIP_X } from '../../src/lessons/vectors/placement-lesson';
import { sameRatio } from '../../src/lessons/vectors/exercises';
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

describe('placement precision contract (Q = P + v and v = Q − P hold exactly for every accepted state)', () => {
  const accepted = (raw: string) => { const r = parseParam(DISP_X, raw); return r.ok ? r.value : null; };
  it('numeric entry rejects what the model cannot represent exactly', () => {
    expect(accepted('0.0000001')).toBeNull();
    expect(accepted('0.0000000001')).toBeNull();
    expect(parseParam(TAIL_X, '0.1234567').ok).toBe(false);
    expect(parseParam(TIP_X, '-0.0000001').ok).toBe(false);
    expect(accepted('0.000001')).toBe(0.000001);
    expect(accepted('-0.000001')).toBe(-0.000001);
  });
  it('smallest accepted displacement is never lost: the tip differs from the tail and Q − P = v', () => {
    const d = derivePlacement({ tx: 0, ty: 0, vx: 0.000001, vy: 0 });
    expect(d.tip.x).toBe(0.000001);
    expect(d.measured).toEqual({ x: 0.000001, y: 0 });
    expect(d.vector.isZero).toBe(false);
  });
  it('relationship holds across precision boundaries, cancellation and negative components', () => {
    const vals = [0, 0.000001, -0.000001, 0.999999, -0.999999, 0.1, 0.2, -0.3, 3.999999, -3.999999, 2.3, 4, -4, 1234.567891];
    for (const tx of vals) for (const vx of vals) {
      const p = { tx, ty: -tx, vx, vy: -vx };
      expect(isRepresentable(p)).toBe(true);
      const d = derivePlacement(p);
      expect(d.measured.x, `${tx}+${vx}`).toBe(vx);
      expect(d.measured.y).toBe(-vx + 0);
      expect(displacementBetween(d.tail, d.tip)).toEqual({ x: d.vector.x, y: d.vector.y });
      // a nonzero displacement always moves the tip
      if (vx !== 0) expect(d.tip.x).not.toBe(d.tail.x);
    }
    // cancellation: P + v lands exactly on the origin
    const c = derivePlacement({ tx: 0.123456, ty: -0.000001, vx: -0.123456, vy: 0.000001 });
    expect(c.tip).toEqual({ x: 0, y: 0 });
    expect(Object.is(c.tip.x, -0)).toBe(false);
  });
  it('isRepresentable is false beyond six decimals', () => {
    expect(isRepresentable({ tx: 0, ty: 0, vx: 1e-10, vy: 0 })).toBe(false);
  });
});

describe('same-ratio exercise predicate', () => {
  const g = (x: string, y: string) => exerciseById('same-ratio')!.grade({ x, y });
  it('accepts exactly the opposite-direction vectors with y/x = −2/3', () => {
    for (const [x, y] of [['3', '-2'], ['1.5', '-1'], ['6', '-4'], ['0.3', '-0.2'], ['1000000', '-666666.6666666667'], ['0.000000000003', '-0.000000000002']]) expect(g(x!, y!).correct, `${x},${y}`).toBe(true);
  });
  it('rejects the same direction, undefined ratios, wrong ratios and near-zero lookalikes', () => {
    expect(g('-3', '2').message).toMatch(/SAME way/);
    expect(g('0', '1').message).toMatch(/undefined/);
    expect(g('0', '0').correct).toBe(false);
    for (const [x, y] of [['0.000000000001', '0'], ['0.000000000001', '0.000000000001'], ['3', '-2.000001'], ['3', '-1.999999'], ['1000000', '-666666'], ['0.000000000003', '-0.000000000003'], ['2', '-3']]) {
      const r = g(x!, y!);
      expect(r.correct, `${x},${y}`).toBe(false);
      expect(r.message).toMatch(/ratio/);
    }
    expect(sameRatio(1e-12, 0)).toBe(false);
  });
  it('never accepts because an intermediate overflowed, underflowed or became NaN', () => {
    const big = '1' + '0'.repeat(308);
    expect(sameRatio(1e308, 1e308)).toBe(false);
    expect(sameRatio(1e308, -1e308)).toBe(false);
    expect(sameRatio(1.7e308, 1.7e308)).toBe(false);
    expect(sameRatio(Infinity, -Infinity)).toBe(false);
    expect(sameRatio(NaN, 1)).toBe(false);
    expect(sameRatio(0, 0)).toBe(false);
    expect(sameRatio(0, 1e308)).toBe(false);
    expect(sameRatio(1e308, 0)).toBe(false);
    expect(g(big, big).correct).toBe(false);
    expect(g(big, big).message).toMatch(/ratio/);
  });
  it('accepts the exact ratio at extreme scales, in both orientations', () => {
    expect(sameRatio(3e307, -2e307)).toBe(true);
    expect(sameRatio(1.5e308, -1e308)).toBe(true);
    expect(sameRatio(-3e307, 2e307)).toBe(true); // ratio holds; direction is a separate check
    expect(sameRatio(3e-300, -2e-300)).toBe(true);
    expect(sameRatio(3e-320, -2e-320)).toBe(true); // subnormal
    expect(sameRatio(3e-320, 2e-320)).toBe(false);
    expect(sameRatio(1e-300, 0)).toBe(false);
    const huge = '3' + '0'.repeat(307);
    const hugeY = '2' + '0'.repeat(307);
    expect(g(huge, '-' + hugeY).correct).toBe(true);
    expect(g('-' + huge, hugeY).message).toMatch(/SAME way/);
  });
  it('the worked solution is well-formed', () => { expect(exerciseById('same-ratio')!.solution).not.toMatch(/,\./); });
});
