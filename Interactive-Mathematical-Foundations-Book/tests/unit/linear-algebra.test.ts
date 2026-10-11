import { describe, expect, it } from 'vitest';
import { angleNumeric, coefficient, deriveAddition, deriveBasis, deriveDot, deriveNorm, deriveProjection, deriveScaling, deriveSpan, determinant, dot, minus, normalizeNumeric, plus, roundingCosine, times, vector, zero } from '../../src/math/linear-algebra/vectors';
import { eq, rational, toNumber } from '../../src/math/quantity/rational';
import { rootPower } from '../../src/math/quantity/root';

const xy = (v: ReturnType<typeof vector>) => [toNumber(v.x), toNumber(v.y)];
describe('vector arithmetic and decimal trust boundary', () => {
  it('adds, subtracts, cancels and translates with exact decimal semantics', () => {
    const u = vector(2, 1), v = vector(1, 2), p = vector(-3, 4);
    const d = deriveAddition(u, v);
    expect(xy(d.sum)).toEqual([3, 3]); expect(xy(d.difference)).toEqual([-1, 1]);
    expect(d.sum).toEqual(d.reverseSum);
    expect(minus(plus(p, v), plus(p, u))).toEqual(d.difference);
    expect(plus(u, times(rational(-1n), u))).toEqual(vector(0, 0));
    expect(plus(vector(0.1, 0), vector(0.2, 0))).toEqual(vector(0.3, 0));
  });
  it('rejects nonfinite, out-of-contract precision and range rather than rounding them', () => {
    for (const n of [NaN, Infinity, -Infinity, 0.001, 1000001]) {
      expect(() => vector(n, 0)).toThrow(RangeError); expect(() => coefficient(n)).toThrow(RangeError);
    }
  });
  it('preserves associativity and distributivity over a deterministic decimal lattice', () => {
    for (let i = -10; i <= 10; i++) {
      const u = vector(i / 10, 1), v = vector(2, i / 10), w = vector(-1, 2), k = coefficient(-1.5);
      expect(plus(plus(u, v), w)).toEqual(plus(u, plus(v, w)));
      expect(times(k, plus(u, v))).toEqual(plus(times(k, u), times(k, v)));
    }
  });
});
describe('scaling and norms', () => {
  it('separates zero, negative sign, and nonnegative length', () => {
    const v = vector(3, 4);
    const d = deriveScaling(v, coefficient(-1.5));
    expect(xy(d.scaled)).toEqual([-4.5, -6]); expect(d.direction).toBe('reversed');
    expect(d.scaledNorm.kind !== 'undefined' && d.scaledNorm.approx).toBe(7.5);
    expect(deriveScaling(v, coefficient(0)).direction).toBe('undefined');
    expect(deriveScaling(vector(0, 0), coefficient(1)).direction).toBe('undefined');
  });
  it('normalizes only nonzero vectors and compares three norms', () => {
    const d = deriveNorm(vector(-3, 4));
    expect(d.norm.kind !== 'undefined' && d.norm.approx).toBe(5);
    expect(toNumber(d.l1)).toBe(7); expect(toNumber(d.linf)).toBe(4);
    expect(d.unit).toEqual({ x: -0.6, y: 0.8 });
    expect(deriveNorm(vector(0, 0)).unit).toBeNull();
    if (d.norm.kind === 'exact') expect(rootPower(d.norm.root)).toEqual(rational(25n));
  });
  it('retains unit direction across overflow, underflow and subnormal inputs', () => {
    for (const x of [1.7e308, 1e-300, Number.MIN_VALUE]) {
      const n = normalizeNumeric({ x, y: -x })!;
      expect(n.x).toBeCloseTo(Math.SQRT1_2, 15); expect(n.y).toBeCloseTo(-Math.SQRT1_2, 15);
      expect(Math.hypot(n.x, n.y)).toBeCloseTo(1, 15);
    }
    expect(Math.hypot(1.7e308, 1.7e308)).toBe(Infinity);
    expect(normalizeNumeric({ x: 0, y: -0 })).toBeNull();
    expect(() => normalizeNumeric({ x: Infinity, y: 1 })).toThrow();
  });
});
describe('inner products, angles, and projections', () => {
  it('checks component products, symmetry, exact orthogonality and zero angle policy', () => {
    const u = vector(2, 1), v = vector(-1, 2), d = deriveDot(u, v);
    expect(d.product).toEqual(rational(0n)); expect(dot(u, v)).toEqual(dot(v, u));
    expect(d.orthogonal).toBe(true); expect(d.angle!.radians).toBe(Math.PI / 2);
    expect(deriveDot(u, vector(0, 0)).angle).toBeNull();
    expect(deriveDot(u, times(coefficient(-1), u)).angle!.radians).toBe(Math.PI);
  });
  it('permits rounding corrections only, with invalid computations rejected', () => {
    expect(roundingCosine(1 + Number.EPSILON)).toBe(1);
    expect(roundingCosine(-1 - Number.EPSILON)).toBe(-1);
    for (const c of [1.000001, -1.1, NaN, Infinity]) expect(() => roundingCosine(c)).toThrow();
    expect(angleNumeric({ x: 1.7e308, y: 1.7e308 }, { x: 1.7e308, y: -1.7e308 })!.radians).toBe(Math.PI / 2);
    expect(angleNumeric({ x: 1, y: 0 }, { x: 1, y: 1e-15 })!.radians).toBeCloseTo(1e-15, 29);
  });
  it('reconstructs the vector, with exact residual orthogonality and direction-scale invariance', () => {
    const u = vector(2, 1), v = vector(1, 3), d = deriveProjection(u, v);
    expect(d.defined).toBe(true);
    if (!d.defined) throw new Error('Expected a defined projection');
    expect(xy(d.projected)).toEqual([2, 1]); expect(xy(d.residual)).toEqual([-1, 2]);
    expect(d.reconstruction).toEqual(v); expect(d.residualDot.num).toBe(0n);
    const reversed = deriveProjection(times(coefficient(-3), u), v);
    if (!reversed.defined) throw new Error('Expected a defined projection');
    expect(reversed.projected).toEqual(d.projected); expect(reversed.signedScalar).toBeCloseTo(-d.signedScalar, 14);
    expect(deriveProjection(vector(0, 0), v).defined).toBe(false);
    const zeroInput = deriveProjection(u, vector(0, 0));
    expect(zeroInput.defined && zero(zeroInput.residual)).toBe(true);
  });
});
describe('span and basis coordinates', () => {
  it('distinguishes plane, line and point based on the actual directions', () => {
    const f = (u: [number, number], v: [number, number]) => deriveSpan(vector(...u), vector(...v), coefficient(1), coefficient(-0.5));
    expect(f([2, 1], [1, 2]).rank).toBe(2); expect(xy(f([2, 1], [1, 2]).w)).toEqual([1.5, 0]);
    const line = f([1, 1], [2, 2]); expect(line.rank).toBe(1);
    for (const p of line.corners) expect(p.x).toBe(p.y);
    expect(line.reach![0]).toEqual({ x: -6, y: -6 }); expect(line.reach![3]).toEqual({ x: 6, y: 6 });
    expect(f([0, 0], [0, 0]).rank).toBe(0);
  });
  it('solves unique coordinates without treating near singularity as exact dependence', () => {
    const d = deriveBasis(vector(2, 1), vector(1, 2), vector(3, 0));
    expect(d.unique).toBe(true);
    if (!d.unique) throw new Error('Expected a basis');
    expect([toNumber(d.a), toNumber(d.b)]).toEqual([2, -1]); expect(d.reconstructed).toEqual(vector(3, 0));
    const near = deriveBasis(vector(3, 2.99), vector(3.01, 3), vector(3, 0));
    expect(near.unique).toBe(true); expect(near.unique && near.sensitive).toBe(true);
    expect(determinant(vector(3, 2.99), vector(3.01, 3))).toEqual(rational(1n, 10000n));
  });
  it('does not invent singular coordinates for reachable or unreachable targets', () => {
    for (const p of [vector(3, 3), vector(3, 0)]) {
      const d = deriveBasis(vector(1, 1), vector(2, 2), p);
      expect(d.unique).toBe(false); expect('a' in d).toBe(false);
      expect(d.reachable).toBe(p.x.num === p.y.num);
    }
    expect(deriveBasis(vector(0, 0), vector(0, 0), vector(0, 0)).reachable).toBe(true);
    expect(deriveBasis(vector(0, 0), vector(0, 0), vector(1, 0)).reachable).toBe(false);
  });
  it('has no hidden epsilon in exact cancellation', () => {
    expect(eq(dot(vector(1000000, 1000000), vector(1000000, -1000000)), rational(0n))).toBe(true);
    expect(determinant(vector(0.1, 0.2), vector(0.2, 0.4))).toEqual(rational(0n));
  });
});
