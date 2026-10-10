/**
 * Direction (atan vs atan2) and point/displacement placement — hand-worked values, policies, and seeded invariants
 * (master plan §12.2, §12.4). Expected numbers are LITERALS worked by hand, never recomputed with the code under test.
 */
import { describe, expect, it } from 'vitest';
import { compareDirections, describeLocation, locate } from '../../src/math/vector2/direction';
import { derivePlacement, displacementBetween, withTail, withTip } from '../../src/math/vector2/placement';
import { deriveVector2 } from '../../src/math/vector2/vector2';

const A = 0.5880026035475675; // atan(2/3), worked by hand
const PI = Math.PI;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('the four quadrants relative to the reference angle atan(2/3)', () => {
  it('quadrant I: the two formulas agree', () => {
    const c = compareDirections({ x: 3, y: 2 });
    expect(c.location).toEqual({ kind: 'quadrant', quadrant: 'I' });
    expect(c.naiveRadians).toBeCloseTo(A, 15);
    expect(c.atan2Radians).toBeCloseTo(A, 15);
    expect(c.halfTurns).toBe(0);
    expect(c.naiveIsCorrect).toBe(true);
  });
  it('quadrant II: atan gives −A, the true direction is π − A (add π)', () => {
    const c = compareDirections({ x: -3, y: 2 });
    expect(c.ratio).toBeCloseTo(-2 / 3, 15);
    expect(c.naiveRadians).toBeCloseTo(-A, 15);
    expect(c.atan2Radians).toBeCloseTo(PI - A, 14);
    expect(c.halfTurns).toBe(1);
    expect(c.naiveIsCorrect).toBe(false);
  });
  it('quadrant III: atan gives +A (the same as for (3, 2)!), the true direction is A − π (subtract π)', () => {
    const c = compareDirections({ x: -3, y: -2 });
    expect(c.naiveRadians).toBeCloseTo(A, 15);
    expect(c.atan2Radians).toBeCloseTo(A - PI, 14);
    expect(c.halfTurns).toBe(-1);
  });
  it('quadrant IV: the two formulas agree again', () => {
    const c = compareDirections({ x: 3, y: -2 });
    expect(c.atan2Radians).toBeCloseTo(-A, 15);
    expect(c.halfTurns).toBe(0);
  });
});

describe('the information atan(y/x) loses: v and −v share one ratio', () => {
  it('(3, 2) and (−3, −2) have the same ratio and the same naive angle but opposite directions', () => {
    const a = compareDirections({ x: 3, y: 2 });
    const b = compareDirections({ x: -3, y: -2 });
    expect(b.ratio).toBe(a.ratio);
    expect(b.naiveRadians).toBe(a.naiveRadians);
    expect(a.mirror).toEqual({ x: -3, y: -2 });
    expect(Math.abs(a.atan2Radians! - b.atan2Radians!)).toBeCloseTo(PI, 14);
  });
  it('the mirror of the mirror is the vector', () => {
    const c = compareDirections({ x: -3, y: 2 });
    expect(compareDirections(c.mirror).mirror).toEqual({ x: -3, y: 2 });
  });
});

describe('axes and the policies at x = 0', () => {
  it('positive x-axis: ratio 0, both angles 0', () => {
    const c = compareDirections({ x: 5, y: 0 });
    expect(c.location).toEqual({ kind: 'axis', axis: '+x' });
    expect(c.ratio).toBe(0);
    expect(c.atan2Radians).toBe(0);
    expect(c.halfTurns).toBe(0);
  });
  it('negative x-axis: naive angle 0 is WRONG, the true direction is +π, whichever zero sign y has', () => {
    for (const y of [0, -0]) {
      const c = compareDirections({ x: -5, y });
      expect(c.location).toEqual({ kind: 'axis', axis: '−x' });
      expect(c.naiveRadians).toBe(0);
      expect(Object.is(c.naiveRadians, -0)).toBe(false);
      expect(c.atan2Radians).toBe(PI);
      expect(c.halfTurns).toBe(1);
      expect(c.naiveIsCorrect).toBe(false);
    }
  });
  it('vertical vectors: the ratio is UNDEFINED (not ±Infinity) so the naive formula gives nothing, while atan2 gives ±π/2', () => {
    for (const [y, angle] of [[5, PI / 2], [-5, -PI / 2]] as const) {
      const c = compareDirections({ x: 0, y });
      expect(c.ratio).toBeNull();
      expect(c.naiveRadians).toBeNull();
      expect(c.halfTurns).toBeNull();
      expect(c.naiveIsCorrect).toBeNull();
      expect(c.atan2Radians).toBeCloseTo(angle, 15);
    }
    expect(compareDirections({ x: -0, y: 5 }).ratio).toBeNull(); // −0 is not a separate case
  });
  it('the zero vector has no direction under either formula', () => {
    for (const v of [{ x: 0, y: 0 }, { x: -0, y: -0 }, { x: -0, y: 0 }]) {
      const c = compareDirections(v);
      expect(c.location).toEqual({ kind: 'origin' });
      expect(c.ratio).toBeNull();
      expect(c.naiveRadians).toBeNull();
      expect(c.atan2Radians).toBeNull();
      expect(c.halfTurns).toBeNull();
      expect(Object.is(c.mirror.x, -0) || Object.is(c.mirror.y, -0)).toBe(false);
    }
  });
  it('negative zero never escapes: 0/(−3) is +0, atan of it is +0', () => {
    const c = compareDirections({ x: -3, y: 0 });
    expect(Object.is(c.ratio, 0)).toBe(true);
    expect(Object.is(c.naiveRadians, 0)).toBe(true);
  });
  it('throws on non-finite components, like deriveVector2', () => {
    for (const bad of [NaN, Infinity, -Infinity]) expect(() => compareDirections({ x: bad, y: 1 })).toThrow(RangeError);
  });
  it('tiny and huge vectors keep their direction', () => {
    expect(compareDirections({ x: -1e-200, y: -1e-200 }).atan2Radians).toBeCloseTo((-3 * PI) / 4, 14);
    expect(compareDirections({ x: 1e200, y: 1e200 }).halfTurns).toBe(0);
  });
});

describe('location names', () => {
  it('classifies every sign pattern', () => {
    expect(locate(1, 1)).toEqual({ kind: 'quadrant', quadrant: 'I' });
    expect(locate(-1, 1)).toEqual({ kind: 'quadrant', quadrant: 'II' });
    expect(locate(-1, -1)).toEqual({ kind: 'quadrant', quadrant: 'III' });
    expect(locate(1, -1)).toEqual({ kind: 'quadrant', quadrant: 'IV' });
    expect(describeLocation(locate(0, -3))).toBe('the negative y-axis');
    expect(describeLocation(locate(2, 0))).toBe('the positive x-axis');
    expect(describeLocation(locate(0, 0))).toBe('the origin');
    expect(describeLocation(locate(-2, 2))).toBe('quadrant II');
  });
});

describe('invariants on 4000 seeded random vectors (plan §12.4)', () => {
  const rnd = mulberry32(20261011);
  const vectors = Array.from({ length: 4000 }, () => ({ x: Math.round((rnd() - 0.5) * 120) / 10, y: Math.round((rnd() - 0.5) * 120) / 10 })).filter(v => v.x !== 0);
  it('atan2 = atan(y/x) + k·π with k = 0, +1, −1 exactly as the quadrant says', () => {
    for (const v of vectors) {
      const c = compareDirections(v);
      expect(c.halfTurns).toBe(v.x > 0 ? 0 : v.y >= 0 ? 1 : -1);
      expect(Math.abs(c.naiveRadians! + c.halfTurns! * PI - c.atan2Radians!), JSON.stringify(v)).toBeLessThan(1e-14);
      expect(Math.abs(c.naiveRadians!)).toBeLessThanOrEqual(PI / 2);
    }
  });
  it('tan(atan2) reproduces the ratio, and (cos, sin) of atan2 point the same way as (x, y)', () => {
    for (const v of vectors) {
      const c = compareDirections(v);
      const m = Math.hypot(v.x, v.y);
      expect(Math.abs(Math.cos(c.atan2Radians!) * m - v.x)).toBeLessThan(1e-12);
      expect(Math.abs(Math.sin(c.atan2Radians!) * m - v.y)).toBeLessThan(1e-12);
    }
  });
  it('the mirror shares the ratio and the naive angle, and its true direction differs by π', () => {
    for (const v of vectors) {
      const a = compareDirections(v);
      const b = compareDirections(a.mirror);
      expect(b.ratio).toBe(a.ratio);
      expect(b.naiveRadians).toBe(a.naiveRadians);
      const diff = Math.abs(a.atan2Radians! - b.atan2Radians!);
      expect(Math.min(Math.abs(diff - PI), Math.abs(diff - PI))).toBeLessThan(1e-14);
    }
  });
  it('the naive formula is correct exactly on the right half-plane (x > 0)', () => {
    for (const v of vectors) expect(compareDirections(v).naiveIsCorrect).toBe(v.x > 0);
  });
});

describe('placement: points versus displacement vectors', () => {
  const canonical = { tx: 1, ty: -1, vx: 3, vy: 2 };
  it('tip = tail + v, and Q − P recovers v', () => {
    const d = derivePlacement(canonical);
    expect(d.tail).toEqual({ x: 1, y: -1 });
    expect(d.tip).toEqual({ x: 4, y: 1 }); // worked by hand
    expect(d.measured).toEqual({ x: 3, y: 2 });
    expect(d.standardTip).toEqual({ x: 3, y: 2 });
  });
  it('moving the tail changes the tip but not one derived property of v (translation invariance)', () => {
    const base = derivePlacement({ tx: 0, ty: 0, vx: 3, vy: 2 });
    const rnd = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      const moved = derivePlacement(withTail({ tx: 0, ty: 0, vx: 3, vy: 2 }, { x: Math.round((rnd() - 0.5) * 80) / 10, y: Math.round((rnd() - 0.5) * 80) / 10 }));
      expect(moved.vector).toEqual(base.vector); // components, magnitude, exact form, direction: all identical
      expect(moved.measured).toEqual({ x: 3, y: 2 });
    }
  });
  it('dragging the tip changes v = Q − P and leaves the tail alone', () => {
    const next = withTip(canonical, { x: -2, y: 3 });
    expect(next).toEqual({ tx: 1, ty: -1, vx: -3, vy: 4 });
    expect(deriveVector2({ x: next.vx, y: next.vy }).exactMagnitude).toEqual({ coefficient: 5n, radicand: 1n });
  });
  it('clamps the displacement to a limit', () => {
    expect(withTip({ tx: -4, ty: 0, vx: 0, vy: 0 }, { x: 6, y: -9 }, 4)).toEqual({ tx: -4, ty: 0, vx: 4, vy: -4 });
  });
  it('decimal arithmetic is exact: 0.1 + 0.2 is 0.3 (binary floating point gives 0.30000000000000004)', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(derivePlacement({ tx: 0.1, ty: 0, vx: 0.2, vy: 0 }).tip.x).toBe(0.3);
    expect(displacementBetween({ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.3 })).toEqual({ x: 0.2, y: 0.1 });
  });
  it('negative zero never appears in a tip or a difference', () => {
    const d = derivePlacement({ tx: -3, ty: 2, vx: 3, vy: -2 });
    expect(Object.is(d.tip.x, 0)).toBe(true);
    expect(Object.is(d.tip.y, 0)).toBe(true);
    expect(Object.is(displacementBetween({ x: 1, y: 1 }, { x: 1, y: 1 }).x, 0)).toBe(true);
  });
  it('a zero displacement is the zero vector wherever its (degenerate) arrow sits', () => {
    const d = derivePlacement({ tx: 4, ty: -4, vx: 0, vy: 0 });
    expect(d.vector.isZero).toBe(true);
    expect(d.vector.directionRadians).toBeNull();
    expect(d.tip).toEqual(d.tail);
  });
});
