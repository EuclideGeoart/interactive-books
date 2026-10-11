import { describe, expect, it } from 'vitest';
import { int, rational } from '../../src/math/quantity/rational';
import { classify, contours, eval2, eval2Number, gradient, hessian, hessianEigen, poly2, poly2Text, slice } from '../../src/math/calculus/bivariate';
import { localLinear, matVec } from '../../src/math/calculus/jacobian';
import { MAPS, SURFACES } from '../../src/math/calculus/surfaces';
import { polyText } from '../../src/math/calculus/polynomial';

describe('exact bivariate polynomials', () => {
  const f = poly2([2, 1, 1], [0, 1, 3]); // x²y + 3y
  it('values, partials and slices (hand-worked)', () => {
    expect(eval2(f, int(1), int(2))).toEqual(int(8));
    expect(gradient(f, int(1), int(2))).toEqual([int(4), int(4)]);
    expect(polyText(slice(f, 'x', int(2)))).toBe('2x² + 6');
    expect(polyText(slice(f, 'y', int(1)), )).toBe('4x');
    expect(poly2Text(f)).toBe('x²y + 3y');
  });
  it('Hessian symmetry, classification and eigen-directions', () => {
    const h = hessian(SURFACES['double-well']!.f, int(-1), int(0));
    expect([h.fxx, h.fxy, h.fyx, h.fyy]).toEqual([int(-6), int(0), int(0), int(2)]);
    expect(classify(SURFACES['double-well']!.f, int(-1), int(0)).kind).toBe('saddle');
    expect(classify(SURFACES.quartic!.f, int(0), int(0)).kind).toBe('inconclusive');
    const e = hessianEigen({ fxx: int(2), fxy: int(1), fyy: int(2) });
    expect(e.values[0]).toBeCloseTo(3, 15); expect(e.values[1]).toBeCloseTo(1, 15);
    expect(Math.abs(e.vectors[0][0] - Math.SQRT1_2)).toBeLessThan(1e-15);
  });
  it('contour segments lie on their level (a drawing aid within grid tolerance)', () => {
    const S = SURFACES.bowl!, w = { xMin: -2.5, xMax: 2.5, yMin: -2.5, yMax: 2.5 };
    const lines = contours((x, y) => eval2Number(S.f, x, y), w, [1, 4]);
    expect(lines.length).toBeGreaterThan(50);
    for (const l of lines) for (const p of l) { const v = p.x * p.x + p.y * p.y; expect(Math.min(Math.abs(v - 1), Math.abs(v - 4))).toBeLessThan(0.05); }
  });
});
describe('Jacobians and shapes', () => {
  it('rejects a shape mismatch and accepts a compatible product', () => {
    expect(matVec([[int(1), int(2)], [int(3), int(4)]], [int(1), int(1), int(1)]).kind).toBe('undefined');
    expect(matVec([[int(1), int(2)], [int(3), int(4)]], [int(1), int(1)])).toEqual({ kind: 'value', value: [int(3), int(7)] });
    const L = localLinear(MAPS.lift!, int(1), rational(1n, 2n), rational(1n, 4n), rational(1n, 4n));
    expect(L.J).toHaveLength(3); expect(L.det).toBeNull();
  });
  it('the error is second order: halving δ divides the squared error by 16', () => {
    const a = localLinear(MAPS.square!, int(1), rational(1n, 2n), rational(1n, 4n), rational(1n, 4n));
    const b = localLinear(MAPS.square!, int(1), rational(1n, 2n), rational(1n, 8n), rational(1n, 8n));
    expect(a.errorSquared.num * b.errorSquared.den).toBe(16n * b.errorSquared.num * a.errorSquared.den);
  });
});
