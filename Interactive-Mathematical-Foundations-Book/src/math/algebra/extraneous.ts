/**
 * Extraneous roots of I.4: the equation  √(x + p) = x + q  with integers p, q in [−6, 6].
 *
 * Squaring both sides is NOT an equivalence: it turns the question into  x + p = (x + q)² , which also holds whenever −√(x + p) = x + q.
 * Put t = x + q (the right-hand side). Then x + p = t − q + p and the squared equation reads
 *
 *     t² = t + (p − q)          t = (1 ± √D) / 2          D = 4p − 4q + 1  (always odd)
 *
 * so  x = t − q = (1 − 2q ± √D) / 2 , matching  x² + (2q − 1)x + (q² − p) = 0  with discriminant D.
 * A root x₀ of the squared equation solves the ORIGINAL equation exactly when t = x₀ + q ≥ 0 (the root √(x₀ + p) = |t| is never negative).
 * When t < 0 it solves  −√(x + p) = x + q  instead: it is extraneous. D is never 0 (it is odd), D ≥ 1 gives two roots; at least one is
 * always valid because the two values of t add up to 1.
 *
 * Exactness. A root is `u + v√b` with rational u, v and b a square-free integer (b = 1 means the root is rational). Its sign is decided
 * EXACTLY by comparing squares (`sumSign`), not by evaluating a decimal; the decimal is only the "≈" line.
 */
import { add, cmp, eq, int, mul, neg, rational, sign, toNumber, ZERO, type Rational } from '../quantity/rational';
import { rootOf } from '../quantity/root';

export const EXTRANEOUS_LIMIT = 6;

/** The number `u + v·√b` with b a square-free integer ≥ 1, in a normal form: b = 1 and v = 0 exactly when the number is rational. */
export interface RadicalSum {
  readonly u: Rational;
  readonly v: Rational;
  readonly b: bigint;
}
export function radicalSum(u: Rational, v: Rational, b: bigint): RadicalSum {
  if (b < 1n) throw new RangeError('the radicand must be a positive integer');
  if (b === 1n) return { u: add(u, v), v: ZERO, b: 1n };
  if (v.num === 0n) return { u, v: ZERO, b: 1n };
  return { u, v, b };
}
export const isRationalSum = (s: RadicalSum): boolean => s.b === 1n;
export const sumPlus = (s: RadicalSum, r: Rational): RadicalSum => radicalSum(add(s.u, r), s.v, s.b);
export const sumNeg = (s: RadicalSum): RadicalSum => radicalSum(neg(s.u), neg(s.v), s.b);
export const sumEq = (s: RadicalSum, t: RadicalSum): boolean => s.b === t.b && eq(s.u, t.u) && eq(s.v, t.v);
/** (u + v√b)² = u² + v²b + 2uv√b. */
export function sumSquare(s: RadicalSum): RadicalSum {
  const b = rational(s.b);
  return radicalSum(add(mul(s.u, s.u), mul(mul(s.v, s.v), b)), mul(int(2), mul(s.u, s.v)), s.b);
}
export function sumValue(s: RadicalSum): number {
  return toNumber(s.u) + toNumber(s.v) * Math.sqrt(Number(s.b));
}

/**
 * Exact sign of u + v√b (b > 1, square-free, so √b is irrational and the sum is never 0 unless u = v = 0).
 * If u and v agree in sign (or one is 0) the sign is that sign; otherwise the larger of |u| and |v|√b wins, decided by comparing u² with v²b.
 */
export function sumSign(s: RadicalSum): -1 | 0 | 1 {
  if (s.b === 1n || sign(s.v) === 0) return sign(s.u);
  if (sign(s.u) === 0 || sign(s.u) === sign(s.v)) return sign(s.v);
  const c = cmp(mul(s.u, s.u), mul(mul(s.v, s.v), rational(s.b)));
  return c > 0 ? sign(s.u) : sign(s.v); // c = 0 is impossible for irrational √b
}

export interface ExtraneousState {
  readonly p: number;
  readonly q: number;
}

export type RootStatus = 'valid' | 'extraneous';

export interface ExtraneousRoot {
  /** The root x₀ of the squared equation. */
  readonly x: RadicalSum;
  /** t = x₀ + q, the value of the right-hand side of the original equation at x₀. */
  readonly t: RadicalSum;
  /** The radicand x₀ + p of the left-hand side at x₀. */
  readonly radicand: RadicalSum;
  readonly radicandSign: -1 | 0 | 1;
  readonly tSign: -1 | 0 | 1;
  /** x₀ + p = t² exactly (this is what makes √(x₀ + p) = |t|). */
  readonly radicandIsTSquared: boolean;
  /** √(x₀ + p) at x₀: |t|. For a rational radicand it is also found independently by the exact root of the radicand. */
  readonly lhs: RadicalSum;
  readonly lhsFromRoot: Rational | null;
  readonly status: RootStatus;
  /** Which sign of the root the value satisfies: +√ (valid), −√ (extraneous), or both when t = 0. */
  readonly solves: 'plus' | 'minus' | 'both';
  readonly approx: number;
}

export interface ExtraneousDerived {
  readonly p: number;
  readonly q: number;
  /** x² + (2q − 1)x + (q² − p) = 0 */
  readonly squared: { readonly linear: Rational; readonly constant: Rational };
  readonly discriminant: bigint;
  /** Ascending. Empty when the squared equation has no real root. */
  readonly roots: readonly ExtraneousRoot[];
  readonly validCount: number;
  readonly extraneousCount: number;
  /** The smallest x with x + p ≥ 0: the domain of the left-hand side is [−p, ∞). */
  readonly domainStart: number;
}

const wholeNumber = (n: number, name: string): number => {
  if (!Number.isInteger(n) || Math.abs(n) > EXTRANEOUS_LIMIT) throw new RangeError(`${name} must be a whole number from −${EXTRANEOUS_LIMIT} to ${EXTRANEOUS_LIMIT}`);
  return n;
};

export function deriveExtraneous(state: ExtraneousState): ExtraneousDerived {
  const p = wholeNumber(state.p, 'p');
  const q = wholeNumber(state.q, 'q');
  const D = BigInt(4 * p - 4 * q + 1);
  const squared = { linear: int(2 * q - 1), constant: int(q * q - p) };
  const roots: ExtraneousRoot[] = [];
  if (D > 0n) {
    const root = rootOf(rational(D), 2);
    if (root.kind !== 'exact') throw new Error('D is far inside the exact-root range');
    const a = root.root.a;
    const b = root.root.b;
    const half = rational(1n, 2n);
    for (const s of [-1n, 1n]) {
      const t = radicalSum(half, rational(s * a, 2n), b);
      roots.push(rootAt(t, p, q));
    }
  }
  const validCount = roots.filter(r => r.status === 'valid').length;
  return { p, q, squared, discriminant: D, roots, validCount, extraneousCount: roots.length - validCount, domainStart: -p };
}

function rootAt(t: RadicalSum, p: number, q: number): ExtraneousRoot {
  const x = sumPlus(t, int(-q));
  const radicand = sumPlus(x, int(p));
  const tSign = sumSign(t);
  const lhs = tSign >= 0 ? t : sumNeg(t);
  let lhsFromRoot: Rational | null = null;
  if (isRationalSum(radicand) && sign(radicand.u) >= 0) {
    const r = rootOf(radicand.u, 2);
    if (r.kind === 'exact' && r.root.b === 1n) lhsFromRoot = rational(r.root.a, r.root.c);
  }
  return {
    x, t, radicand, tSign, radicandSign: sumSign(radicand),
    radicandIsTSquared: sumEq(radicand, sumSquare(t)),
    lhs, lhsFromRoot,
    status: tSign >= 0 ? 'valid' : 'extraneous',
    solves: tSign > 0 ? 'plus' : tSign < 0 ? 'minus' : 'both',
    approx: sumValue(x),
  };
}

/** A direct test of the ORIGINAL equation at an exact rational x (independent of the quadratic): is √(x + p) = x + q? */
export function solvesOriginal(p: number, q: number, x: Rational): boolean {
  const radicand = add(x, int(p));
  if (sign(radicand) < 0) return false;
  const r = rootOf(radicand, 2);
  if (r.kind !== 'exact' || r.root.b !== 1n) return false;
  return eq(rational(r.root.a, r.root.c), add(x, int(q)));
}

/** The same test for −√(x + p) = x + q. */
export function solvesNegated(p: number, q: number, x: Rational): boolean {
  const radicand = add(x, int(p));
  if (sign(radicand) < 0) return false;
  const r = rootOf(radicand, 2);
  if (r.kind !== 'exact' || r.root.b !== 1n) return false;
  return eq(neg(rational(r.root.a, r.root.c)), add(x, int(q)));
}

/** Does x solve the SQUARED equation x + p = (x + q)² ? (exact) */
export function solvesSquared(p: number, q: number, x: Rational): boolean {
  const t = add(x, int(q));
  return eq(add(x, int(p)), mul(t, t));
}

/** The drawn branches y = ±√(x + p), as doubles for the plane (the exact values are the model's; these only place the curve). */
export const upperBranch = (p: number) => (x: number): number => Math.sqrt(x + p);
export const lowerBranch = (p: number) => (x: number): number => -Math.sqrt(x + p);
export const lineAt = (q: number) => (x: number): number => x + q;
