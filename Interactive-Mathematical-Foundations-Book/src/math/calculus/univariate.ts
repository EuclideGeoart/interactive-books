/**
 * One-variable functions for Part III, with ANALYTIC answers to the questions the chapters ask: the value at a point, the one-sided limits, the
 * one-sided slopes and the derivative. Numerical samples are drawn and tabulated by the lessons, but they never decide a limit or a derivative.
 *
 * Two kinds of function exist:
 *  - `piecewise(...)`: finitely many pieces, each a RATIONAL FUNCTION num/den with rational coefficients, plus optional isolated point values.
 *    Everything is exact: a removable hole is found by dividing out the common factor (x − a); a pole's sign comes from the multiplicity of the
 *    root in the denominator; a corner is two different exact one-sided slopes.
 *  - a small set of named transcendental functions (`special`) whose limits and derivatives are stated analytically (sin, exp, √x, ∛x,
 *    sin(1/x), x·sin(1/x)). Their values are binary64 approximations and are labelled as such.
 *
 * The vocabulary is fixed. There is no parser and no arbitrary expression execution.
 */
import { cmp, div, eq, int, isZero, sign, toNumber, ZERO, type Rational } from '../quantity/rational';
import { derivative as dPoly, divideRoot, evalPoly, evalPolyNumber, isZeroPoly, mulPoly, poly, polyText, polyTex, rootMultiplicity, subPoly, type Poly } from './polynomial';

export type PointValue =
  | { readonly kind: 'value'; readonly value: number; readonly exact?: Rational }
  | { readonly kind: 'undefined'; readonly reason: string };
export type OneSided =
  | { readonly kind: 'finite'; readonly value: number; readonly exact?: Rational }
  | { readonly kind: 'infinite'; readonly sign: 1 | -1 }
  | { readonly kind: 'none'; readonly reason: string; readonly cause?: 'domain' | 'oscillation' };
export type Side = 'left' | 'right';
export interface Slope {
  readonly kind: 'value' | 'undefined';
  /** The derivative when both one-sided slopes exist and agree. */
  readonly value?: number;
  readonly exact?: Rational;
  readonly reason?: string;
  readonly left: OneSided;
  readonly right: OneSided;
}

export interface Univariate {
  readonly id: string;
  readonly text: string;
  readonly tex: string;
  /** True when every value and slope this function reports is exact rational arithmetic. */
  readonly exact: boolean;
  at(x: Rational): PointValue;
  /** Binary64 value for drawing and numerical experiments; `null` where the function is undefined. */
  number(x: number): number | null;
  limit(a: Rational, side: Side): OneSided;
  slope(x: Rational): Slope;
  /** Second derivative where it exists (used for local-error explanations). */
  second(x: Rational): PointValue;
  /** Abscissae where a drawn curve must be broken (poles, jumps). */
  readonly breaks: readonly number[];
  /** Isolated points to mark (holes and moved values), computed from the analytic description. */
  readonly special: readonly Rational[];
  /** Present when the whole function is one exact polynomial. */
  readonly poly?: Poly;
}

/** Two-sided limit: exists only when both sides agree and are finite. */
export function twoSided(f: Univariate, a: Rational): OneSided & { readonly agree: boolean } {
  const l = f.limit(a, 'left'), r = f.limit(a, 'right');
  if (l.kind === 'finite' && r.kind === 'finite') {
    const same = l.exact && r.exact ? eq(l.exact, r.exact) : l.value === r.value;
    return same ? { ...l, agree: true } : { kind: 'none', reason: 'The left and right limits differ.', agree: false };
  }
  if (l.kind === 'infinite' && r.kind === 'infinite' && l.sign === r.sign) return { ...l, agree: true };
  if (l.kind === 'none') return { kind: 'none', reason: `From the left: ${l.reason}`, agree: false };
  if (r.kind === 'none') return { kind: 'none', reason: `From the right: ${r.reason}`, agree: false };
  return { kind: 'none', reason: 'The one-sided behaviours do not agree (at least one side is unbounded).', agree: false };
}

// ------------------------------------------------------------------------------------------- exact rational functions
interface RationalFn { readonly num: Poly; readonly den: Poly }
const ONE_POLY = poly(1);
/** Cancel every common factor (x − a) of num and den. */
function reduceAt(f: RationalFn, a: Rational): RationalFn {
  let { num, den } = f;
  while (!isZeroPoly(num) && isZero(evalPoly(num, a)) && isZero(evalPoly(den, a))) { num = divideRoot(num, a)!; den = divideRoot(den, a)!; }
  return { num, den };
}
const dRational = (f: RationalFn): RationalFn => ({ num: subPoly(mulPoly(dPoly(f.num), f.den), mulPoly(f.num, dPoly(f.den))), den: mulPoly(f.den, f.den) });
function limitRational(f: RationalFn, a: Rational, side: Side): OneSided {
  const g = reduceAt(f, a);
  const d = evalPoly(g.den, a);
  if (!isZero(d)) { const v = div(evalPoly(g.num, a), d); return { kind: 'finite', value: toNumber(v), exact: v }; }
  const m = rootMultiplicity(g.den, a);
  let q = g.den;
  for (let i = 0; i < m; i++) q = divideRoot(q, a)!;
  const s = sign(evalPoly(g.num, a)) * sign(evalPoly(q, a)) * (side === 'left' && m % 2 === 1 ? -1 : 1);
  return { kind: 'infinite', sign: s > 0 ? 1 : -1 };
}

export interface Piece {
  /** null = unbounded */
  readonly lo: Rational | null;
  readonly hi: Rational | null;
  readonly loClosed: boolean;
  readonly hiClosed: boolean;
  readonly num: Poly;
  readonly den?: Poly;
}
export interface PiecewiseSpec {
  readonly id: string;
  readonly text: string;
  readonly tex: string;
  readonly pieces: readonly Piece[];
  /** Isolated values that override the pieces; `value: null` deletes the point from the domain. */
  readonly points?: readonly { readonly x: Rational; readonly value: Rational | null; readonly reason?: string }[];
  /** Extra plotting breaks (piece boundaries are added automatically). */
  readonly breaks?: readonly number[];
}

const contains = (p: Piece, x: Rational): boolean =>
  (p.lo === null || cmp(x, p.lo) > 0 || (p.loClosed && cmp(x, p.lo) === 0)) && (p.hi === null || cmp(x, p.hi) < 0 || (p.hiClosed && cmp(x, p.hi) === 0));
/** The piece that covers an open interval immediately to one side of a. */
const sidePiece = (pieces: readonly Piece[], a: Rational, side: Side): Piece | undefined => pieces.find(p => side === 'left'
  ? (p.lo === null || cmp(p.lo, a) < 0) && (p.hi === null || cmp(p.hi, a) >= 0)
  : (p.lo === null || cmp(p.lo, a) <= 0) && (p.hi === null || cmp(p.hi, a) > 0));

export function piecewise(spec: PiecewiseSpec): Univariate {
  const fn = (p: Piece): RationalFn => ({ num: p.num, den: p.den ?? ONE_POLY });
  const override = (x: Rational) => spec.points?.find(p => eq(p.x, x));
  const at = (x: Rational): PointValue => {
    const o = override(x);
    if (o) return o.value === null ? { kind: 'undefined', reason: o.reason ?? 'This point is excluded from the domain.' } : { kind: 'value', value: toNumber(o.value), exact: o.value };
    const piece = spec.pieces.find(p => contains(p, x));
    if (!piece) return { kind: 'undefined', reason: 'x is outside the domain of every piece.' };
    const d = evalPoly(fn(piece).den, x);
    if (isZero(d)) return { kind: 'undefined', reason: 'The denominator is exactly zero here; the expression has no value (even if it has a limit).' };
    const v = div(evalPoly(piece.num, x), d);
    return { kind: 'value', value: toNumber(v), exact: v };
  };
  const limit = (a: Rational, side: Side): OneSided => {
    const piece = sidePiece(spec.pieces, a, side);
    if (!piece) return { kind: 'none', reason: `The function is not defined immediately to the ${side} of this point.`, cause: 'domain' };
    return limitRational(fn(piece), a, side);
  };
  const oneSlope = (x: Rational, side: Side, value: PointValue): OneSided => {
    const piece = sidePiece(spec.pieces, x, side);
    if (!piece) return { kind: 'none', reason: `Not defined to the ${side}.` };
    const lim = limitRational(fn(piece), x, side);
    if (value.kind !== 'value' || lim.kind !== 'finite' || !eq(lim.exact!, value.exact!)) return { kind: 'none', reason: `f is not continuous from the ${side}, so the ${side} difference quotient is unbounded or has no limit.` };
    const g = reduceAt(fn(piece), x), dg = dRational(g), den = evalPoly(dg.den, x);
    const v = div(evalPoly(dg.num, x), den);
    return { kind: 'finite', value: toNumber(v), exact: v };
  };
  const slope = (x: Rational): Slope => {
    const value = at(x);
    const left = oneSlope(x, 'left', value), right = oneSlope(x, 'right', value);
    if (value.kind === 'undefined') return { kind: 'undefined', reason: 'f(x) itself is undefined, so no difference quotient at x exists.', left, right };
    if (left.kind === 'finite' && right.kind === 'finite') {
      if (eq(left.exact!, right.exact!)) return { kind: 'value', value: left.value, exact: left.exact, left, right };
      return { kind: 'undefined', reason: 'A corner: the left and right slopes are different finite numbers.', left, right };
    }
    if (left.kind === 'none' && right.kind === 'none') return { kind: 'undefined', reason: 'f is not defined or not continuous on either side of x.', left, right };
    return { kind: 'undefined', reason: left.kind === 'finite' || right.kind === 'finite' ? 'Only a one-sided slope exists here.' : 'No one-sided slope exists here.', left, right };
  };
  const second = (x: Rational): PointValue => {
    const s = slope(x);
    if (s.kind !== 'value') return { kind: 'undefined', reason: 'No first derivative here.' };
    const piece = spec.pieces.find(p => contains(p, x) && (p.lo === null || cmp(x, p.lo) > 0) && (p.hi === null || cmp(x, p.hi) < 0));
    if (!piece || override(x)) return { kind: 'undefined', reason: 'x is a piece boundary; the second derivative is not reported here.' };
    const d2 = dRational(dRational(reduceAt(fn(piece), x))), den = evalPoly(d2.den, x);
    if (isZero(den)) return { kind: 'undefined', reason: 'Denominator zero.' };
    const v = div(evalPoly(d2.num, x), den);
    return { kind: 'value', value: toNumber(v), exact: v };
  };
  const numPieces = spec.pieces.map(p => ({ p, lo: p.lo === null ? -Infinity : toNumber(p.lo), hi: p.hi === null ? Infinity : toNumber(p.hi) }));
  const numPoints = (spec.points ?? []).map(o => ({ x: toNumber(o.x), value: o.value === null ? null : toNumber(o.value) }));
  const number = (x: number): number | null => {
    const o = numPoints.find(p => p.x === x);
    if (o) return o.value;
    const hit = numPieces.find(({ p, lo, hi }) => (x > lo || (p.loClosed && x === lo)) && (x < hi || (p.hiClosed && x === hi)));
    if (!hit) return null;
    const den = hit.p.den ? evalPolyNumber(hit.p.den, x) : 1;
    if (den === 0) return null;
    return evalPolyNumber(hit.p.num, x) / den;
  };
  const boundaries = spec.pieces.flatMap(p => [p.lo, p.hi]).filter((b): b is Rational => b !== null);
  const poles = spec.pieces.flatMap(p => p.den ? rootsOfSmall(p.den) : []);
  return {
    id: spec.id, text: spec.text, tex: spec.tex, exact: true, at, number, limit, slope, second,
    breaks: [...new Set([...boundaries, ...poles].map(toNumber).concat(spec.breaks ?? []))].sort((a, b) => a - b),
    special: uniqueRationals([...(spec.points ?? []).map(p => p.x), ...boundaries, ...poles]),
  };
}
const uniqueRationals = (xs: readonly Rational[]): Rational[] => xs.filter((x, i) => xs.findIndex(y => eq(x, y)) === i).sort(cmp);
/** Quarter-integer roots of a small denominator, enough to break the plotted curve at the lessons' poles. */
function rootsOfSmall(p: Poly): Rational[] {
  const out: Rational[] = [];
  for (let k = -64; k <= 64; k++) { const r = div(int(k), int(4)); if (isZero(evalPoly(p, r))) out.push(r); }
  return out;
}

/** A single polynomial on the whole line. */
export const polynomialFn = (id: string, p: Poly, v = 'x'): Univariate => ({
  ...piecewise({ id, text: polyText(p, v), tex: polyTex(p, v), pieces: [{ lo: null, hi: null, loClosed: false, hiClosed: false, num: p }] }),
  poly: p,
});

// ------------------------------------------------------------------------------------------- analytic transcendental functions
const finite = (value: number): OneSided => ({ kind: 'finite', value });
const zeroExact: OneSided = { kind: 'finite', value: 0, exact: ZERO };
const exactIfZero = (x: Rational, v: number): PointValue => isZero(x) && v === 0 ? { kind: 'value', value: 0, exact: ZERO } : { kind: 'value', value: v };
interface Analytic {
  id: string; text: string; tex: string; breaks?: number[]; special?: Rational[];
  value(x: number): number | null; reason(x: number): string;
  limit(a: Rational, side: Side): OneSided; slope(x: Rational): Slope; second(x: Rational): PointValue;
}
function analytic(spec: Analytic): Univariate {
  return {
    id: spec.id, text: spec.text, tex: spec.tex, exact: false, breaks: spec.breaks ?? [], special: spec.special ?? [],
    at: x => { const v = spec.value(toNumber(x)); return v === null ? { kind: 'undefined', reason: spec.reason(toNumber(x)) } : exactIfZero(x, v); },
    number: spec.value, limit: spec.limit, slope: spec.slope, second: spec.second,
  };
}
const smoothSlope = (v: number): Slope => ({ kind: 'value', value: v, left: finite(v), right: finite(v) });

export const sinFn = analytic({
  id: 'sin', text: 'sin x', tex: '\\sin x', value: Math.sin, reason: () => '',
  limit: a => { const v = Math.sin(toNumber(a)); return isZero(a) ? zeroExact : finite(v); },
  slope: x => smoothSlope(Math.cos(toNumber(x))), second: x => ({ kind: 'value', value: -Math.sin(toNumber(x)) }),
});
export const expFn = analytic({
  id: 'exp', text: 'eˣ', tex: 'e^{x}', value: Math.exp, reason: () => '',
  limit: a => isZero(a) ? { kind: 'finite', value: 1, exact: int(1) } : finite(Math.exp(toNumber(a))),
  slope: x => smoothSlope(Math.exp(toNumber(x))), second: x => ({ kind: 'value', value: Math.exp(toNumber(x)) }),
});
/** √x: defined for x ≥ 0, right-continuous at 0 with an infinite right slope (vertical tangent). */
export const sqrtFn = analytic({
  id: 'sqrt', text: '√x', tex: '\\sqrt{x}', special: [ZERO], value: x => x >= 0 ? Math.sqrt(x) : null, reason: () => 'The real square root of a negative number is undefined.',
  limit: (a, side) => sign(a) < 0 || (isZero(a) && side === 'left') ? { kind: 'none', reason: 'No real values to this side.', cause: 'domain' } : isZero(a) ? zeroExact : finite(Math.sqrt(toNumber(a))),
  slope: x => sign(x) > 0 ? smoothSlope(0.5 / Math.sqrt(toNumber(x))) : isZero(x)
    ? { kind: 'undefined', reason: 'At 0 only the right side exists and its difference quotient 1/√h grows without bound: a vertical tangent.', left: { kind: 'none', reason: 'Not defined to the left.' }, right: { kind: 'infinite', sign: 1 } }
    : { kind: 'undefined', reason: 'Outside the domain.', left: { kind: 'none', reason: 'Outside the domain.' }, right: { kind: 'none', reason: 'Outside the domain.' } },
  second: x => sign(x) > 0 ? { kind: 'value', value: -0.25 * toNumber(x) ** -1.5 } : { kind: 'undefined', reason: 'No second derivative here.' },
});
/** ∛x: defined everywhere; vertical tangent (infinite slope from both sides) at 0. */
export const cbrtFn = analytic({
  id: 'cbrt', text: '∛x', tex: '\\sqrt[3]{x}', value: Math.cbrt, reason: () => '',
  limit: a => isZero(a) ? zeroExact : finite(Math.cbrt(toNumber(a))),
  slope: x => isZero(x) ? { kind: 'undefined', reason: 'Vertical tangent: the difference quotient h^(−2/3) grows without bound from both sides.', left: { kind: 'infinite', sign: 1 }, right: { kind: 'infinite', sign: 1 } }
    : smoothSlope(1 / (3 * Math.cbrt(toNumber(x)) ** 2)),
  second: x => isZero(x) ? { kind: 'undefined', reason: 'No derivative at 0.' } : { kind: 'value', value: -2 / (9 * Math.cbrt(toNumber(x)) ** 5) },
});
/** sin(1/x): undefined at 0; oscillates between −1 and 1 on every one-sided neighbourhood, so no limit exists. */
export const sinRecipFn = analytic({
  id: 'sin-recip', text: 'sin(1/x)', tex: '\\sin(1/x)', breaks: [0], special: [ZERO],
  value: x => x === 0 ? null : Math.sin(1 / x), reason: () => '1/x divides by zero at x = 0.',
  limit: (a, side) => isZero(a) ? { kind: 'none', reason: `Oscillation: on every interval to the ${side} of 0 the values reach both −1 and 1 infinitely often.`, cause: 'oscillation' } : finite(Math.sin(1 / toNumber(a))),
  slope: x => isZero(x) ? { kind: 'undefined', reason: 'f(0) is undefined.', left: { kind: 'none', reason: 'Oscillation.' }, right: { kind: 'none', reason: 'Oscillation.' } }
    : smoothSlope(-Math.cos(1 / toNumber(x)) / toNumber(x) ** 2),
  second: x => isZero(x) ? { kind: 'undefined', reason: 'f(0) is undefined.' } : { kind: 'value', value: (2 * toNumber(x) * Math.cos(1 / toNumber(x)) - Math.sin(1 / toNumber(x))) / toNumber(x) ** 4 },
});
/** x·sin(1/x): undefined at 0 (the formula divides by zero), but squeezed: |x sin(1/x)| ≤ |x| → 0. */
export const xSinRecipFn = analytic({
  id: 'x-sin-recip', text: 'x·sin(1/x)', tex: 'x\\sin(1/x)', special: [ZERO],
  value: x => x === 0 ? null : x * Math.sin(1 / x), reason: () => 'The formula contains 1/x, which divides by zero at x = 0.',
  limit: a => isZero(a) ? zeroExact : finite(toNumber(a) * Math.sin(1 / toNumber(a))),
  slope: x => isZero(x) ? { kind: 'undefined', reason: 'f(0) is undefined.', left: { kind: 'none', reason: 'f(0) undefined.' }, right: { kind: 'none', reason: 'f(0) undefined.' } }
    : smoothSlope(Math.sin(1 / toNumber(x)) - Math.cos(1 / toNumber(x)) / toNumber(x)),
  second: x => isZero(x) ? { kind: 'undefined', reason: 'f(0) is undefined.' } : { kind: 'value', value: -Math.sin(1 / toNumber(x)) / toNumber(x) ** 3 },
});

// ------------------------------------------------------------------------------------------- small helpers
export const r = (n: number, d = 1): Rational => div(int(n), int(d));
export const piece = (lo: Rational | null, hi: Rational | null, num: Poly, opts: { loClosed?: boolean; hiClosed?: boolean; den?: Poly } = {}): Piece =>
  ({ lo, hi, num, den: opts.den, loClosed: opts.loClosed ?? false, hiClosed: opts.hiClosed ?? false });
