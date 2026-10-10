/**
 * Exact n-th roots of rational numbers (n = 2 … 5 in the chapter; any n ≥ 2 in the model).
 *
 *     ⁿ√(p/q) = a·ⁿ√b / c       a, c integers with gcd(a, c) = 1,  c > 0,  b a positive integer free of n-th powers.
 *
 * `b = 1` means the root is the rational `a/c`; `b > 1` means it is irrational (an n-th-power-free integer greater than 1 has an irrational
 * n-th root). The form is canonical: the denominator is rationalised, so ⁿ√(1/2) is `√2/2`, never `1/√2`.
 *
 * Method: ⁿ√(p/q) = ⁿ√(p·q^(n−1)) / q, then split N = p·q^(n−1) = s^n·b by trial division. The loop stops as soon as p^n exceeds what is left
 * (then what is left is n-th-power-free), or at `TRIAL_LIMIT`; in the second case the leftover has at most n prime factors (guarded by
 * `maxRadicand`) so it can hide an n-th power only if it IS one, which an integer root test decides. A perfect-power shortcut makes
 * ⁿ√(qⁿ) = |q| cheap and exactly right, whatever the size of q.
 *
 * Outside the guarded range the model returns `numeric` (an honest "exact form not attempted"), never a wrong exact form.
 */
import { abs, eq, gcd, iroot, rational, toNumber, type Rational } from './rational';

export const TRIAL_LIMIT = 100_000n;

/** Largest radicand `N` the factoring below is allowed to attempt for index `n`: below TRIAL_LIMIT^(n+1), so ≤ n prime factors can survive the loop. */
export const maxRadicand = (n: number): bigint => TRIAL_LIMIT ** BigInt(n + 1);

export interface ExactRoot {
  readonly index: number;
  /** Signed: negative only for an odd index and a negative radicand. */
  readonly a: bigint;
  readonly b: bigint;
  readonly c: bigint;
}

export type RootResult =
  | { readonly kind: 'exact'; readonly root: ExactRoot; readonly approx: number }
  | { readonly kind: 'undefined'; readonly reason: string }
  | { readonly kind: 'numeric'; readonly approx: number; readonly reason: string };

export const isRationalRoot = (r: ExactRoot): boolean => r.b === 1n;

/** `N = s^n · b` with `b` free of n-th powers; `null` when `N` is outside the guarded range. Requires `N ≥ 1`. */
export function splitPower(N: bigint, n: number): { s: bigint; b: bigint } | null {
  if (N < 1n) throw new RangeError('splitPower needs N ≥ 1');
  if (N >= maxRadicand(n)) return null;
  const nn = BigInt(n);
  let s = 1n;
  let b = 1n;
  let rest = N;
  let p = 2n;
  // Strip every prime p completely: p^e contributes p^⌊e/n⌋ to s and p^(e mod n) to b. Afterwards `rest` has no prime factor below p.
  for (; p <= TRIAL_LIMIT; p++) {
    if (p ** nn > rest) break; // every prime left is ≥ p, so none can appear n times: `rest` is n-th-power-free
    let e = 0;
    while (rest % p === 0n) { rest /= p; e++; }
    if (e > 0) { s *= p ** BigInt(Math.floor(e / n)); b *= p ** BigInt(e % n); }
  }
  // Stopped by the limit: `rest` has only prime factors above it, at most n of them (guarded above), so it hides an n-th power only if it IS one.
  if (p > TRIAL_LIMIT && rest > 1n) {
    const r = iroot(rest, n);
    if (r ** nn === rest) { s *= r; rest = 1n; }
  }
  return { s, b: b * rest };
}

const ORDINAL: Record<number, string> = { 2: 'square', 3: 'cube', 4: 'fourth', 5: 'fifth' };
export const rootName = (n: number): string => (ORDINAL[n] ? `${ORDINAL[n]} root` : `${n}th root`);

/** Closest double to the real n-th root of `A` (principal root for even n; the real root for odd n, including negative A). */
export function approxRoot(A: Rational, n: number): number {
  const x = toNumber(A);
  if (n === 2) return Math.sqrt(x);
  if (n === 3) return Math.cbrt(x);
  return (x < 0 ? -1 : 1) * Math.pow(Math.abs(x), 1 / n);
}

export function rootOf(A: Rational, n: number): RootResult {
  if (!Number.isInteger(n) || n < 2) throw new RangeError('rootOf needs an integer index n ≥ 2');
  const negative = A.num < 0n;
  if (negative && n % 2 === 0) {
    return {
      kind: 'undefined',
      reason: n === 2
        ? 'A square is never negative (x² ≥ 0 for every real x), so no real number is the square root of a negative number.'
        : `An even power is never negative (xⁿ ≥ 0 for every real x when n is even), so no real number is the ${rootName(n)} of a negative number.`,
    };
  }
  const P = abs(A);
  const sgn = negative ? -1n : 1n;
  const approx = approxRoot(A, n);
  if (P.num === 0n) return { kind: 'exact', root: { index: n, a: 0n, b: 1n, c: 1n }, approx: 0 };
  const nn = BigInt(n);
  const s0 = iroot(P.num, n);
  const t0 = iroot(P.den, n);
  if (s0 ** nn === P.num && t0 ** nn === P.den) return { kind: 'exact', root: { index: n, a: sgn * s0, b: 1n, c: t0 }, approx };
  const split = splitPower(P.num * P.den ** (nn - 1n), n);
  if (!split) return { kind: 'numeric', approx, reason: 'This number is too large for the exact radical form to be attempted here; only the approximation is shown.' };
  const g = gcd(split.s, P.den);
  return { kind: 'exact', root: { index: n, a: sgn * (split.s / g), b: split.b, c: P.den / g }, approx };
}

/** The exact value of the root raised to the n-th power, computed as `aⁿ·b / cⁿ` — the check that `ⁿ√A` raised back to the n-th power gives `A`. */
export function rootPower(r: ExactRoot): Rational {
  const nn = BigInt(r.index);
  return rational(r.a ** nn * r.b, r.c ** nn);
}

/** True when `r` really is an n-th root of `A`: `rⁿ = A` exactly, and for an even index `r ≥ 0` (the principal root). */
export function isNthRootOf(r: ExactRoot, A: Rational): boolean {
  return eq(rootPower(r), A) && (r.index % 2 === 1 || r.a >= 0n);
}

/** Value of the exact form as a double: `(a/c)·b^(1/n)` — used only to cross-check `approx`, never displayed as exact. */
export function rootValue(r: ExactRoot): number {
  return (Number(r.a) / Number(r.c)) * Math.pow(Number(r.b), 1 / r.index);
}

/** Sign-aware comparison helper used by tests: root of `A` compared with a rational `x`. */
export const rootEquals = (res: RootResult, x: Rational): boolean => res.kind === 'exact' && res.root.b === 1n && eq(rational(res.root.a, res.root.c), x);
