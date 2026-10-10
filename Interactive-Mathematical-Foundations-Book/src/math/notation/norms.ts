/**
 * Norms of a small vector with rational entries (I.9). The l1 and l-infinity norms are rationals. The l2 norm is the square root of a
 * rational, written exactly as `c * sqrt(r)` with `c` a non-negative rational and `r` a square-free whole number (so it is a rational
 * exactly when `r = 1`). No double is involved in any statement made with "=".
 */
import { ZERO, add, equals, isZero, mul, q, sub, toNumber, type Q } from './rational';

const abs = (a: Q): Q => (a.num < 0n ? { num: -a.num, den: a.den } : a);
const lessOrEqual = (a: Q, b: Q): boolean => a.num * b.den <= b.num * a.den;

/** `coef * sqrt(radicand)` with `radicand` square-free (and at least 1). */
export interface Radical {
  readonly coef: Q;
  readonly radicand: bigint;
}

/** Split `N = s^2 * f` with `f` square-free, by trial division over the prime factorisation (N stays below about 10^10 in this chapter). */
export function squareFreeSplit(N: bigint): { s: bigint; f: bigint } {
  if (N < 1n) throw new RangeError('A positive whole number is needed');
  let rest = N;
  let s = 1n;
  let f = 1n;
  for (let p = 2n; p * p <= rest; p++) {
    let e = 0;
    while (rest % p === 0n) { rest /= p; e++; }
    for (let t = 0; t < Math.floor(e / 2); t++) s *= p;
    if (e % 2 === 1) f *= p;
  }
  if (rest > 1n) f *= rest; // what is left is a single prime
  return { s, f };
}

/** The exact value of sqrt(r) for a non-negative rational r = a/b: sqrt(ab)/b, then the square factors of ab moved out. */
export function sqrtQ(r: Q): Radical {
  if (r.num < 0n) throw new RangeError('The square root of a negative number is not real');
  if (r.num === 0n) return { coef: ZERO, radicand: 1n };
  const { s, f } = squareFreeSplit(r.num * r.den);
  return { coef: q(s, r.den), radicand: f };
}

export const isRational = (x: Radical): boolean => x.radicand === 1n;

/** The nearest double (used only for the "≈" line and for drawing). */
export const radicalToNumber = (x: Radical): number => toNumber(x.coef) * Math.sqrt(Number(x.radicand));

export interface RadicalForm {
  readonly text: string;
  readonly tex: string;
  readonly spoken: string;
  readonly exactRational: boolean;
}

const MINUS = '−';

export function radicalForm(x: Radical): RadicalForm {
  const { coef, radicand } = x;
  const n = coef.num.toString();
  const d = coef.den.toString();
  if (radicand === 1n) {
    return coef.den === 1n
      ? { text: n, tex: n, spoken: n, exactRational: true }
      : { text: `${n}/${d}`, tex: `\\frac{${n}}{${d}}`, spoken: `${n} over ${d}`, exactRational: true };
  }
  const r = radicand.toString();
  const numeratorText = `${coef.num === 1n ? '' : n}√${r}`;
  const numeratorTex = `${coef.num === 1n ? '' : n}\\sqrt{${r}}`;
  const numeratorSpoken = `${coef.num === 1n ? '' : `${n} times `}the square root of ${r}`;
  if (coef.den === 1n) return { text: numeratorText, tex: numeratorTex, spoken: numeratorSpoken, exactRational: false };
  return { text: `${numeratorText}/${d}`, tex: `\\frac{${numeratorTex}}{${d}}`, spoken: `${numeratorSpoken}, divided by ${d}`, exactRational: false };
}

// ------------------------------------------------------------------------------------------------ the norms of a vector
export interface NormsDerived {
  readonly x: readonly Q[];
  readonly zero: boolean;
  readonly l1: Q;
  readonly linf: Q;
  /** The sum of the squares: ||x||_2 squared, exact. */
  readonly l2squared: Q;
  readonly l2: Radical;
  /** The norm chain ||x||_inf <= ||x||_2 <= ||x||_1 <= d ||x||_inf, decided with exact squares. */
  readonly chain: { readonly infLeL2: boolean; readonly l2LeL1: boolean; readonly l1LeDInf: boolean };
  /** Which of the norms are equal for this vector (e.g. all three for a vector along an axis). */
  readonly equalities: readonly string[];
}

export function norms(x: readonly Q[]): NormsDerived {
  if (x.length === 0) throw new RangeError('A vector needs at least one entry');
  let l1 = ZERO;
  let linf = ZERO;
  let l2squared = ZERO;
  for (const v of x) {
    const a = abs(v);
    l1 = add(l1, a);
    if (lessOrEqual(linf, a)) linf = a;
    l2squared = add(l2squared, mul(v, v));
  }
  const l2 = sqrtQ(l2squared);
  const dInf = mul(q(x.length), linf);
  const infLeL2 = lessOrEqual(mul(linf, linf), l2squared);
  const l2LeL1 = lessOrEqual(l2squared, mul(l1, l1));
  const l1LeDInf = lessOrEqual(l1, dInf);
  const equalities: string[] = [];
  if (isRational(l2)) {
    if (equals(l2.coef, linf)) equalities.push('inf=2');
    if (equals(l2.coef, l1)) equalities.push('2=1');
  }
  if (equals(l1, linf)) equalities.push('inf=1');
  return { x, zero: x.every(isZero), l1, linf, l2squared, l2, chain: { infLeL2, l2LeL1, l1LeDInf }, equalities };
}

// ------------------------------------------------------------------------------------------------ the unit balls in the plane
export type NormId = '1' | '2' | 'inf';
export const NORM_IDS: readonly NormId[] = Object.freeze(['1', '2', 'inf'] as const);

/** The corners of the ball of radius r for the l1 norm (a diamond) and the l-infinity norm (a square), counter-clockwise from the right. */
export function ballCorners(norm: '1' | 'inf', r: number): readonly { x: number; y: number }[] {
  return norm === '1'
    ? [{ x: r, y: 0 }, { x: 0, y: r }, { x: -r, y: 0 }, { x: 0, y: -r }]
    : [{ x: r, y: r }, { x: -r, y: r }, { x: -r, y: -r }, { x: r, y: -r }];
}

/** Is `(x1, x2)` exactly on the boundary of the ball of radius `||x||_p` for the chosen norm? (Always true; the check decides it with exact arithmetic.) */
export function onBoundary(norm: NormId, x1: Q, x2: Q): boolean {
  const n = norms([x1, x2]);
  switch (norm) {
    case '1': return equals(add(abs(x1), abs(x2)), n.l1);
    case 'inf': return equals(lessOrEqual(abs(x1), abs(x2)) ? abs(x2) : abs(x1), n.linf);
    case '2': return equals(add(mul(x1, x1), mul(x2, x2)), n.l2squared);
  }
}

/** The difference of two norms' squares helps to say "strictly smaller": exact. */
export const squaredDifference = (a: Q, b: Q): Q => sub(mul(a, a), mul(b, b));
