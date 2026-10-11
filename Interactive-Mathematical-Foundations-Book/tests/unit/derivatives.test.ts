import { describe, expect, it } from 'vitest';
import { div, int, rational, type Rational } from '../../src/math/quantity/rational';
import { antiderivative, compose, derivative, divideRoot, evalPoly, integrate, mulPoly, poly, polyEqual, polyTex, polyText, rationalRootsIn, rootMultiplicity, shift } from '../../src/math/calculus/polynomial';
import { piecewise, piece, r, sinFn, sqrtFn, cbrtFn, sinRecipFn, xSinRecipFn, twoSided } from '../../src/math/calculus/univariate';
import { cubic, absolute, jump } from '../../src/math/calculus/catalog';
import { finiteDifference, halvings, quotientPolynomial, secant, budget, optimalStep } from '../../src/math/calculus/difference';

const q = (x: Rational) => (x.den === 1n ? `${x.num}` : `${x.num}/${x.den}`);
describe('exact polynomials', () => {
  const p = poly(1, -3, 0, 2); // 2x³ − 3x + 1
  it('evaluates, differentiates and integrates exactly (hand-worked)', () => {
    expect(q(evalPoly(p, r(1, 2)))).toBe('-1/4');
    expect(polyText(derivative(p))).toBe('6x² − 3');
    expect(q(integrate(p, int(0), int(1)))).toBe('0'); // 1/2 − 3/2 + 1
    expect(polyEqual(derivative(antiderivative(p)), p)).toBe(true);
    expect(polyTex(poly(0, -1, 0, r(1, 6)))).toBe('\\tfrac{1}{6}x^{3}-x');
  });
  it('shift is the exact Taylor re-expansion and composition is substitution', () => {
    expect(shift(poly(0, 0, 1), int(3)).coefficients.map(q)).toEqual(['9', '6', '1']); // (3+h)²
    expect(polyText(compose(poly(0, 0, 1), poly(-1, 1)))).toBe('x² − 2x + 1');
  });
  it('divides out known roots, counts multiplicity and finds rational roots', () => {
    const sq = mulPoly(poly(-1, 1), poly(-1, 1));
    expect(rootMultiplicity(sq, int(1))).toBe(2);
    expect(divideRoot(poly(-1, 0, 1), int(1))!.coefficients.map(q)).toEqual(['1', '1']);
    expect(divideRoot(poly(-1, 0, 1), int(2))).toBeNull();
    expect(rationalRootsIn(poly(0, -1, 0, r(1, 4)), int(-3), int(3)).map(q)).toEqual(['-2', '0', '2']);
    expect(rationalRootsIn(poly(-2, 0, 1), int(-3), int(3))).toEqual([]); // ±√2 are irrational: not reported
  });
});
describe('analytic one-variable functions', () => {
  it('a removable hole is undefined at the point but has an exact limit', () => {
    const hole = piecewise({ id: 'h', text: '', tex: '', pieces: [piece(null, null, poly(-1, 0, 1), { den: poly(-1, 1) })] });
    expect(hole.at(int(1)).kind).toBe('undefined');
    const t = twoSided(hole, int(1)); expect(t.kind === 'finite' && q(t.exact!)).toBe('2');
    expect(hole.slope(int(1)).kind).toBe('undefined');
  });
  it('a pole has signed infinite one-sided limits from the denominator multiplicity', () => {
    const recip = piecewise({ id: 'p', text: '', tex: '', pieces: [piece(null, null, poly(1), { den: poly(0, 1) })] });
    expect(recip.limit(int(0), 'left')).toEqual({ kind: 'infinite', sign: -1 });
    expect(recip.limit(int(0), 'right')).toEqual({ kind: 'infinite', sign: 1 });
    const sq = piecewise({ id: 's', text: '', tex: '', pieces: [piece(null, null, poly(1), { den: poly(0, 0, 1) })] });
    expect(twoSided(sq, int(0))).toMatchObject({ kind: 'infinite', sign: 1, agree: true });
  });
  it('corners, jumps and smooth points', () => {
    expect(absolute.slope(int(0))).toMatchObject({ kind: 'undefined', left: { kind: 'finite', value: -1 }, right: { kind: 'finite', value: 1 } });
    expect(absolute.slope(r(1, 2))).toMatchObject({ kind: 'value', value: 1 });
    expect(jump.slope(int(0)).left.kind).toBe('none');
    expect(q(cubic.slope(int(2)).exact!)).toBe('1');
    expect(q(cubic.second(int(2)).kind === 'value' ? (cubic.second(int(2)) as { exact: Rational }).exact : int(0))).toBe('2');
  });
  it('transcendental functions state their exceptional behaviour analytically', () => {
    expect(sinRecipFn.at(int(0)).kind).toBe('undefined');
    expect(twoSided(sinRecipFn, int(0)).kind).toBe('none');
    expect(twoSided(xSinRecipFn, int(0))).toMatchObject({ kind: 'finite', value: 0 });
    expect(sqrtFn.limit(int(0), 'left').kind).toBe('none');
    expect(cbrtFn.slope(int(0)).right).toEqual({ kind: 'infinite', sign: 1 });
    expect(sinFn.slope(int(0)).value).toBe(1);
  });
});
describe('difference quotients', () => {
  it('h = 0 is a division by zero, never the derivative', () => {
    const s = secant(cubic, int(1), int(0));
    expect(s.kind).toBe('undefined');
  });
  it('the quotient polynomial has the derivative as constant term (x²: m(h) = 2x + h)', () => {
    expect(quotientPolynomial(poly(0, 0, 1), int(3)).coefficients.map(q)).toEqual(['6', '1']);
    expect(halvings(int(1), 3).map(q)).toEqual(['1', '1/2', '1/4']);
    expect(q((secant(cubic, int(1), div(int(1), int(4))) as { exactSlope: Rational }).exactSlope)).toBe('-35/96');
    expect(rational(2n, 4n)).toEqual({ num: 1n, den: 2n });
  });
  it('binary64 finite differences stay within their documented budget, and tiny h is worse than moderate h', () => {
    const x = 1, ref = Math.cos(x);
    for (const k of [1, 2, 4, 6, 8, 10, 12, 14]) for (const scheme of ['forward', 'backward', 'centered'] as const) {
      const d = finiteDifference(Math.sin, x, 10 ** -k, scheme, ref, 1, 1);
      expect(d.error).toBeLessThanOrEqual(budget(d));
    }
    const moderate = finiteDifference(Math.sin, x, 1e-8, 'forward', ref, 1, 1).error, tiny = finiteDifference(Math.sin, x, 1e-15, 'forward', ref, 1, 1).error;
    expect(tiny).toBeGreaterThan(moderate);
    expect(optimalStep('forward', Math.sin(1), 1, 1)).toBeCloseTo(Math.sqrt(4 * Number.EPSILON * Math.sin(1)), 20);
  });
});
