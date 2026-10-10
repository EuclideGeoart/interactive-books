/**
 * The working behind an exact root, as DATA for the worked-example trace: the lowest-terms fraction, the rationalised radicand, its prime
 * factorisation, the n-th powers taken out, and the common factor cancelled. The trace in the lesson layer only WRITES these numbers;
 * it computes none of them.
 *
 *     ⁿ√(p/q) = ⁿ√(p·q^(n−1)) / q = ⁿ√(s^n · b) / q = s·ⁿ√b / q = (s/g)·ⁿ√b / (q/g)        g = gcd(s, q)
 *
 * The factorisation is plain trial division, and is only produced for radicands small enough to show (N < 10^12, so at most 10^6 trial
 * divisors); beyond that the trace says so instead of printing a wall of digits. The final a, b, c are the ones `rootOf` returns, and a
 * test checks that this working arrives at exactly them.
 */
import { abs, gcd, type Rational } from './rational';
import { rootOf, type RootResult } from './root';

export interface PrimePower {
  readonly p: bigint;
  readonly e: number;
}

/** Radicands up to this size are factorised for display. */
export const DISPLAY_LIMIT = 10n ** 12n;

/** Prime factorisation by trial division, in increasing order of prime; `null` outside the display limit. `1` has no factors. */
export function factorise(N: bigint): PrimePower[] | null {
  if (N < 1n) throw new RangeError('factorise needs N ≥ 1');
  if (N >= DISPLAY_LIMIT) return null;
  const out: PrimePower[] = [];
  let rest = N;
  for (let p = 2n; p * p <= rest; p += p === 2n ? 1n : 2n) {
    let e = 0;
    while (rest % p === 0n) { rest /= p; e++; }
    if (e > 0) out.push({ p, e });
  }
  if (rest > 1n) out.push({ p: rest, e: 1 });
  return out;
}

export interface RadicalWork {
  readonly index: number;
  /** True for a negative radicand (odd index only): the sign is set aside, the root is taken of |A|, and the sign comes back. */
  readonly negative: boolean;
  /** |A| = p/q in lowest terms. */
  readonly p: bigint;
  readonly q: bigint;
  /** p·q^(n−1): the radicand once the denominator is made to disappear from under the root. */
  readonly N: bigint;
  /** Prime factorisation of N; `null` when N is beyond the display limit. */
  readonly factors: readonly PrimePower[] | null;
  /** N = s^n · b with b free of n-th powers (from the factorisation); `null` when there is none. */
  readonly s: bigint | null;
  readonly b: bigint | null;
  /** gcd(s, q): the common factor that cancels at the end (1 when nothing cancels). */
  readonly g: bigint | null;
  readonly root: RootResult;
}

/** The working for ⁿ√A, or `null` when there is nothing to work out: A = 0, or an even root of a negative number (no real value). */
export function radicalWork(A: Rational, n: number): RadicalWork | null {
  const root = rootOf(A, n);
  if (root.kind === 'undefined' || A.num === 0n) return null;
  const magnitude = abs(A);
  const p = magnitude.num;
  const q = magnitude.den;
  const N = p * q ** BigInt(n - 1);
  const factors = factorise(N);
  let s: bigint | null = null;
  let b: bigint | null = null;
  if (factors) {
    s = 1n;
    b = 1n;
    for (const { p: prime, e } of factors) {
      s *= prime ** BigInt(Math.floor(e / n));
      b *= prime ** BigInt(e % n);
    }
  }
  const g = s === null ? null : gcd(s, q);
  return { index: n, negative: A.num < 0n, p, q, N, factors, s, b, g, root };
}

/** The result the working arrives at, as `rational(a, c)`-compatible parts: (±s/g, b, q/g). `null` without a factorisation. */
export function workedResult(w: RadicalWork): { a: bigint; b: bigint; c: bigint } | null {
  if (w.s === null || w.b === null || w.g === null) return null;
  return { a: (w.negative ? -w.s : w.s) / w.g, b: w.b, c: w.q / w.g };
}
