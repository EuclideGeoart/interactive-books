import { describe, expect, it } from 'vitest';
import { exactCoordinate, isCoordinate } from '../../src/math/coordinates/coords';
import { deriveDistanceWork } from '../../src/math/coordinates/distancework';
import { deriveLine } from '../../src/math/coordinates/numberline';
import { derivePixel, resizePixel, validatePixel } from '../../src/math/coordinates/pixel';
import { derivePoint, positionOf, quadrantIndex } from '../../src/math/coordinates/point';
import { deriveSegment } from '../../src/math/coordinates/segment';
import { int, toNumber, type Rational } from '../../src/math/quantity/rational';

const txt = (r: Rational) => `${r.num}/${r.den}`;

describe('the exact-coordinate guard', () => {
  it('accepts at most two decimals and refuses finer or non-finite input', () => {
    expect(txt(exactCoordinate(0.25))).toBe('1/4');
    expect(txt(exactCoordinate(-3))).toBe('-3/1');
    expect(txt(exactCoordinate(-0))).toBe('0/1');
    for (const bad of [0.001, 1 / 3, NaN, Infinity, 1.005]) expect(() => exactCoordinate(bad)).toThrow(RangeError);
    expect(isCoordinate(0.07)).toBe(true);
    expect(isCoordinate(0.071)).toBe(false);
  });
});

describe('quadrants and axes (worked by hand)', () => {
  it('names the four quadrants by the pair of signs', () => {
    expect(quadrantIndex(positionOf(int(3), int(2)))).toBe(1);
    expect(quadrantIndex(positionOf(int(-3), int(2)))).toBe(2);
    expect(quadrantIndex(positionOf(int(-3), int(-2)))).toBe(3);
    expect(quadrantIndex(positionOf(int(3), int(-2)))).toBe(4);
  });
  it('puts axis points and the origin in NO quadrant, and tells them apart', () => {
    expect(derivePoint({ x: 0, y: -4 }).position).toEqual({ kind: 'axis-y' });
    expect(derivePoint({ x: 5, y: 0 }).position).toEqual({ kind: 'axis-x' });
    expect(derivePoint({ x: 0, y: 0 }).position).toEqual({ kind: 'origin' });
    expect(derivePoint({ x: -0, y: -0 }).position).toEqual({ kind: 'origin' });
    expect(quadrantIndex(derivePoint({ x: 0, y: -4 }).position)).toBeNull();
    expect(derivePoint({ x: -0, y: 2 }).position).toEqual({ kind: 'axis-y' });
  });
  it('a tiny coordinate is still not zero: (-0.01, 0.01) is in quadrant II, (0.01, 0) is on the x-axis', () => {
    expect(derivePoint({ x: -0.01, y: 0.01 }).position).toEqual({ kind: 'quadrant', index: 2 });
    expect(derivePoint({ x: 0.01, y: 0 }).position).toEqual({ kind: 'axis-x' });
  });
  it('the distance to the x-axis is |y|, to the y-axis is |x|', () => {
    const p = derivePoint({ x: -3, y: 2 });
    expect(txt(p.distToXAxis)).toBe('2/1');
    expect(txt(p.distToYAxis)).toBe('3/1');
  });
  it('distance to the origin: 3-4-5 exactly, and an irrational one in radical form', () => {
    const a = derivePoint({ x: 3, y: -4 });
    expect(txt(a.distSq)).toBe('25/1');
    expect(a.distance.kind === 'exact' && a.distance.root.b === 1n && a.distance.root.a === 5n).toBe(true);
    const b = derivePoint({ x: 1, y: 1 });
    expect(b.distance.kind === 'exact' && [b.distance.root.a, b.distance.root.b, b.distance.root.c]).toEqual([1n, 2n, 1n]);
  });
});

describe('the number line', () => {
  it('distance from -3 to 5 is 8; the signed difference changes sign with the direction', () => {
    const l = deriveLine({ a: -3, b: 5 });
    expect(txt(l.forward)).toBe('8/1');
    expect(txt(l.backward)).toBe('-8/1');
    expect(txt(l.distance)).toBe('8/1');
    expect(txt(l.midpoint)).toBe('1/1');
    expect(l.order).toBe('a-left');
    expect(l.viaZeroEqualsDistance).toBe(true);
  });
  it('|a| + |b| is the distance only when the points are not on the same side of 0', () => {
    const same = deriveLine({ a: 2, b: 7 });
    expect(txt(same.distance)).toBe('5/1');
    expect(txt(same.viaZero)).toBe('9/1');
    expect(same.viaZeroEqualsDistance).toBe(false);
    expect(same.sameSide).toBe(true);
    const zero = deriveLine({ a: 0, b: -4 });
    expect(zero.viaZeroEqualsDistance).toBe(true);
    expect(zero.sameSide).toBe(false);
  });
  it('a = b: zero distance, same order, no sign', () => {
    const l = deriveLine({ a: 1.25, b: 1.25 });
    expect(l.order).toBe('same');
    expect(txt(l.distance)).toBe('0/1');
    expect(txt(l.forward)).toBe('0/1');
  });
  it('a midpoint of two 2-decimal numbers is exact even with three decimals', () => {
    expect(txt(deriveLine({ a: 0.01, b: 0.02 }).midpoint)).toBe('3/200');
  });
});

describe('two points (worked by hand)', () => {
  it('(1,2) → (4,6): displacement (3,4), distance exactly 5, taxicab 7', () => {
    const s = deriveSegment({ ax: 1, ay: 2, bx: 4, by: 6 });
    expect([txt(s.dx), txt(s.dy)]).toEqual(['3/1', '4/1']);
    expect(txt(s.distSq)).toBe('25/1');
    expect(s.distanceIsRational).toBe(true);
    expect(txt(s.taxicab)).toBe('7/1');
    expect(txt(s.crossTerm)).toBe('24/1'); // 7² = 25 + 24
    expect(s.kind).toBe('oblique');
    expect([txt(s.midpoint.x), txt(s.midpoint.y)]).toEqual(['5/2', '4/1']);
  });
  it('(-2,1) → (4,-3): displacement (6,-4), 52 = 4·13, distance 2√13', () => {
    const s = deriveSegment({ ax: -2, ay: 1, bx: 4, by: -3 });
    expect([txt(s.dx), txt(s.dy)]).toEqual(['6/1', '-4/1']);
    expect(txt(s.distSq)).toBe('52/1');
    expect(s.distance.kind === 'exact' && [s.distance.root.a, s.distance.root.b, s.distance.root.c]).toEqual([2n, 13n, 1n]);
    expect(s.distance.kind === 'exact' && s.distance.approx).toBeCloseTo(7.211102550927978, 12);
  });
  it('(0.5,-1.5) → (-2,2): 18.5 = 37/2, distance √74/2', () => {
    const s = deriveSegment({ ax: 0.5, ay: -1.5, bx: -2, by: 2 });
    expect(txt(s.distSq)).toBe('37/2');
    expect(s.distance.kind === 'exact' && [s.distance.root.a, s.distance.root.b, s.distance.root.c]).toEqual([1n, 74n, 2n]);
  });
  it('reversing the direction negates the displacement and keeps the distance', () => {
    const f = deriveSegment({ ax: -2, ay: 1, bx: 4, by: -3 });
    const r = deriveSegment({ ax: 4, ay: -3, bx: -2, by: 1 });
    expect([txt(r.dx), txt(r.dy)]).toEqual([txt(f.rdx), txt(f.rdy)]);
    expect(txt(r.distSq)).toBe(txt(f.distSq));
    expect(r.distance).toEqual(f.distance);
  });
  it('taxicab equals the Euclidean distance exactly for axis-aligned and coincident pairs only', () => {
    expect(deriveSegment({ ax: -4, ay: 2, bx: 3, by: 2 })).toMatchObject({ kind: 'horizontal', taxicabEqualsDistance: true });
    expect(deriveSegment({ ax: 1, ay: 1, bx: 1, by: 6 })).toMatchObject({ kind: 'vertical', taxicabEqualsDistance: true });
    expect(deriveSegment({ ax: 2, ay: 3, bx: 2, by: 3 })).toMatchObject({ kind: 'coincident', taxicabEqualsDistance: true });
    const o = deriveSegment({ ax: 0, ay: 0, bx: 1, by: 1 });
    expect(o.taxicabEqualsDistance).toBe(false);
    expect(toNumber(o.taxicab)).toBeGreaterThan(Math.SQRT2);
  });
  it('equal distances that doubles get wrong are decided exactly: (0.1,0.7) and (0.5,0.5) from the origin', () => {
    // 0.1² + 0.7² = 0.50 and 0.5² + 0.5² = 0.50 exactly
    expect(txt(derivePoint({ x: 0.1, y: 0.7 }).distSq)).toBe('1/2');
    expect(txt(derivePoint({ x: 0.5, y: 0.5 }).distSq)).toBe('1/2');
    // the same sums in binary doubles differ
    expect(0.1 * 0.1 + 0.7 * 0.7 === 0.5 * 0.5 + 0.5 * 0.5).toBe(false);
  });
  it('the distance work from I.1 arrives at the same radical', () => {
    const w = deriveDistanceWork({ ax: -2, ay: 1, bx: 4, by: -3 });
    expect(w.work?.factors?.map(f => `${f.p}^${f.e}`)).toEqual(['2^2', '13^1']);
    expect(w.work?.s).toBe(2n);
    expect(w.work?.b).toBe(13n);
    expect(deriveDistanceWork({ ax: 1, ay: 1, bx: 1, by: 1 }).work).toBeNull();
  });
  it('rejects a coordinate finer than two decimals instead of rounding it', () => {
    expect(() => deriveSegment({ ax: 0.001, ay: 0, bx: 1, by: 1 })).toThrow(RangeError);
    expect(() => derivePoint({ x: 1, y: 0.123 })).toThrow(RangeError);
  });
});

describe('screen versus mathematics (integer lattice)', () => {
  it('H = 4: the bottom row y = 0 is row 3, the top row y = 3 is row 0', () => {
    expect(derivePixel({ w: 5, h: 4, x: 2, y: 0 })).toMatchObject({ row: 3, col: 2, index: 17 });
    expect(derivePixel({ w: 5, h: 4, x: 2, y: 3 })).toMatchObject({ row: 0, col: 2, index: 2 });
    expect(derivePixel({ w: 5, h: 4, x: 4, y: 1 })).toMatchObject({ row: 2, col: 4, index: 14 });
  });
  it('the off-by-one slip H − y leaves the array exactly when y = 0', () => {
    expect(derivePixel({ w: 4, h: 4, x: 1, y: 0 }).naiveRowInRange).toBe(false);
    expect(derivePixel({ w: 4, h: 4, x: 1, y: 1 }).naiveRowInRange).toBe(true);
    expect(derivePixel({ w: 4, h: 4, x: 1, y: 1 }).naiveRow).toBe(3);
    expect(derivePixel({ w: 4, h: 4, x: 1, y: 1 }).row).toBe(2);
  });
  it('the swapped index img[x, y] leaves the array when x ≥ H or y ≥ W', () => {
    expect(derivePixel({ w: 6, h: 3, x: 4, y: 1 }).swappedInRange).toBe(false);
    expect(derivePixel({ w: 3, h: 6, x: 1, y: 4 }).swappedInRange).toBe(false);
    expect(derivePixel({ w: 4, h: 4, x: 3, y: 2 }).swappedInRange).toBe(true);
  });
  it('the mapping is a bijection on the lattice: every (row, col) is hit exactly once', () => {
    const w = 4;
    const h = 3;
    const seen = new Set<number>();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) seen.add(derivePixel({ w, h, x, y }).index);
    expect(seen.size).toBe(w * h);
    expect(Math.min(...seen)).toBe(0);
    expect(Math.max(...seen)).toBe(w * h - 1);
  });
  it('refuses a point off the lattice and sizes outside 2…10; resizing clamps the point', () => {
    expect(() => validatePixel({ w: 4, h: 4, x: 4, y: 0 })).toThrow(RangeError);
    expect(() => validatePixel({ w: 4, h: 4, x: 0.5, y: 0 })).toThrow(RangeError);
    expect(() => validatePixel({ w: 1, h: 4, x: 0, y: 0 })).toThrow(RangeError);
    expect(() => validatePixel({ w: 4, h: 11, x: 0, y: 0 })).toThrow(RangeError);
    expect(resizePixel({ w: 8, h: 8, x: 7, y: 6 }, 4, 5)).toEqual({ w: 4, h: 5, x: 3, y: 4 });
  });
});
