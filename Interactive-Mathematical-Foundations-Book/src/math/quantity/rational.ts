/**
 * Exact rational numbers for the "Scalars, quantities, units, powers and roots" chapter (I.1) — and for I.2, which builds on it.
 *
 * A `Rational` is `num/den` in lowest terms with `den > 0`, held in BigInt, so every sum, product, power and comparison below is EXACT:
 * `0.1 * 0.1` is `1/100`, not `0.010000000000000002`. This is a small, chapter-owned type (master plan §10.3), not a number tower.
 *
 * Learner-chosen decimals enter through `fromDecimal`, which reads the DECIMAL STRING of a double (`toFixed(maxDecimals)`) — never its binary
 * expansion — and refuses a value that has more decimal places than the declared contract. A value is therefore either exactly the decimal the
 * learner typed or rejected; it is never rounded into a different number.
 */

export interface Rational {
  readonly num: bigint;
  /** Always positive. */
  readonly den: bigint;
}

export const gcd = (a: bigint, b: bigint): bigint => {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
};

/** `num/den` reduced to lowest terms. Throws on a zero denominator (a bug in the caller, never user input). */
export function rational(num: bigint, den: bigint = 1n): Rational {
  if (den === 0n) throw new RangeError('A rational cannot have a zero denominator');
  const sign = den < 0n ? -1n : 1n;
  const g = gcd(num, den);
  return g <= 1n && sign === 1n ? { num, den } : { num: (sign * num) / (g === 0n ? 1n : g), den: (sign * den) / (g === 0n ? 1n : g) };
}

export const int = (n: number | bigint): Rational => rational(BigInt(n));
export const ZERO: Rational = { num: 0n, den: 1n };
export const ONE: Rational = { num: 1n, den: 1n };

export const isZero = (r: Rational): boolean => r.num === 0n;
export const isInteger = (r: Rational): boolean => r.den === 1n;
export const sign = (r: Rational): -1 | 0 | 1 => (r.num < 0n ? -1 : r.num > 0n ? 1 : 0);
export const eq = (a: Rational, b: Rational): boolean => a.num === b.num && a.den === b.den;
export const cmp = (a: Rational, b: Rational): -1 | 0 | 1 => {
  const d = a.num * b.den - b.num * a.den;
  return d < 0n ? -1 : d > 0n ? 1 : 0;
};
export const neg = (r: Rational): Rational => ({ num: -r.num, den: r.den });
export const abs = (r: Rational): Rational => (r.num < 0n ? neg(r) : r);
export const add = (a: Rational, b: Rational): Rational => rational(a.num * b.den + b.num * a.den, a.den * b.den);
export const sub = (a: Rational, b: Rational): Rational => rational(a.num * b.den - b.num * a.den, a.den * b.den);
export const mul = (a: Rational, b: Rational): Rational => rational(a.num * b.num, a.den * b.den);
/** `a / b`; throws when `b` is zero — callers test `isZero` first and report "division by zero" as an undefined state. */
export const div = (a: Rational, b: Rational): Rational => {
  if (b.num === 0n) throw new RangeError('Division by zero');
  return rational(a.num * b.den, a.den * b.num);
};
export const half = (r: Rational): Rational => rational(r.num, r.den * 2n);

// -------------------------------------------------------------------------------------------- decimals in and out
const DECIMAL = /^([+-]?)(\d*)(?:\.(\d*))?$/;

/**
 * Exact value of a decimal string such as `"-2.5"`, `".5"`, `"3"` (also accepts U+2212). `null` for anything that is not a plain decimal
 * (no exponent, no fraction slash, no spaces inside). No digit limit: a decimal string IS a rational.
 */
export function parseDecimal(text: string): Rational | null {
  const m = DECIMAL.exec(text.trim().replace(/−/g, '-'));
  if (!m || (m[2] === '' && (m[3] ?? '') === '')) return null;
  const frac = m[3] ?? '';
  const num = BigInt(`${m[2] || '0'}${frac}`) * (m[1] === '-' ? -1n : 1n);
  return rational(num, 10n ** BigInt(frac.length));
}

/**
 * The exact rational a learner-chosen double stands for, under the contract "at most `maxDecimals` decimal places". `null` when the number
 * is not finite or has finer detail than the contract (it is REJECTED, not rounded). `Number(toFixed(k)) === value` is the test the UI uses too.
 */
export function fromDecimal(value: number, maxDecimals: number): Rational | null {
  if (!Number.isFinite(value) || Number(value.toFixed(maxDecimals)) !== value) return null;
  return parseDecimal(value.toFixed(maxDecimals));
}

const pow10 = (k: number): bigint => 10n ** BigInt(k);

/** Number of decimal places of a TERMINATING decimal `r` (its denominator is 2ᵃ5ᵇ), or `null` when the expansion never ends (e.g. 1/3). */
export function terminatingDecimals(r: Rational): number | null {
  let d = r.den;
  let twos = 0;
  let fives = 0;
  while (d % 2n === 0n) { d /= 2n; twos++; }
  while (d % 5n === 0n) { d /= 5n; fives++; }
  return d === 1n ? Math.max(twos, fives) : null;
}

/** ASCII decimal text of a rational whose expansion terminates (`"0.01"`, `"-12.5"`, `"7"`); `null` otherwise. Exact, no rounding. */
export function decimalText(r: Rational): string | null {
  const k = terminatingDecimals(r);
  if (k === null) return null;
  const negative = r.num < 0n;
  const scaled = (negative ? -r.num : r.num) * (pow10(k) / r.den);
  const digits = scaled.toString().padStart(k + 1, '0');
  const body = k === 0 ? digits : `${digits.slice(0, digits.length - k)}.${digits.slice(digits.length - k)}`;
  return negative ? `-${body}` : body;
}

/** Number of decimal digits of the numerator and denominator (a cheap measure of how long the exact value is to print). */
export const digitCount = (n: bigint): number => (n < 0n ? -n : n).toString().length;

/**
 * The double nearest to `r` (one rounding, from a decimal string). Used only for DRAWING and for the "≈" line; the exact value never goes
 * through it.
 */
export function toNumber(r: Rational): number {
  const k = terminatingDecimals(r);
  if (k !== null) return Number(`${r.num * (pow10(k) / r.den)}e-${k}`);
  // Non-terminating: 30 digits beyond the point where the quotient first becomes non-zero are far more than a double holds.
  const shift = Math.max(0, digitCount(r.den) - digitCount(r.num)) + 30;
  return Number(`${(r.num * pow10(shift)) / r.den}e-${shift}`);
}

// -------------------------------------------------------------------------------------------- integer powers
export type PowerResult = { readonly kind: 'value'; readonly value: Rational } | { readonly kind: 'undefined'; readonly reason: string };

/**
 * `base^k` for an integer `k`, exactly. Undefined cases are stated, never guessed:
 *  - `0⁰` is left undefined by convention in this book (the limit depends on the path to it);
 *  - `0` to a negative power would be `1/0`.
 */
export function power(base: Rational, k: number): PowerResult {
  if (!Number.isInteger(k)) throw new RangeError('power() takes an integer exponent');
  if (isZero(base)) {
    if (k === 0) return { kind: 'undefined', reason: '0⁰ is left undefined here: it is "a⁰ = 1" and "0ⁿ = 0" pulling in different directions, so the book makes no choice.' };
    if (k < 0) return { kind: 'undefined', reason: `0⁻${superscript(-k)} would be 1/0${superscript(-k)}, which divides by zero.` };
    return { kind: 'value', value: ZERO };
  }
  const e = BigInt(k < 0 ? -k : k);
  const p = rational(base.num ** e, base.den ** e);
  return { kind: 'value', value: k < 0 ? rational(p.den, p.num) : p };
}

const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
export const superscript = (n: number): string => [...String(n)].map(c => SUP[c] ?? c).join('');

// -------------------------------------------------------------------------------------------- integer roots
/** `⌊√n⌋` for `n ≥ 0` (Newton's iteration on BigInt). */
export function isqrt(n: bigint): bigint {
  if (n < 0n) throw new RangeError('isqrt of a negative number');
  if (n < 2n) return n;
  let x = 1n << BigInt((n.toString(2).length + 1) >> 1);
  for (;;) {
    const y = (x + n / x) >> 1n;
    if (y >= x) return x;
    x = y;
  }
}

/** `⌊ⁿ√m⌋` for `m ≥ 0`, `k ≥ 1` (integer Newton iteration). */
export function iroot(m: bigint, k: number): bigint {
  if (m < 0n) throw new RangeError('iroot of a negative number');
  if (k === 1 || m < 2n) return m;
  const kk = BigInt(k);
  let x = 1n << BigInt(Math.ceil(m.toString(2).length / k));
  for (;;) {
    const y = ((kk - 1n) * x + m / x ** (kk - 1n)) / kk;
    if (y >= x) return x;
    x = y;
  }
}
