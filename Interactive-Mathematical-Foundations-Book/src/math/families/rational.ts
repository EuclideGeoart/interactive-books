/**
 * Exact rational numbers for the function-families chapter (master plan §10.3 — a small, chapter-owned exact type, not a CAS).
 *
 * A `Rat` is a fraction of two BigInts with a positive denominator and no common factor, so equality is structural.
 * Everything the chapter shows with "=" for a polynomial family (x, x², x³, a·x²) or for an input shifted by a decimal comes from here:
 * the learner's decimals (at most `maxDecimals` places, declared by the control) are converted EXACTLY, never through a double.
 */
import type { ExactForm } from '../../platform/numeric/quantity';
import { MINUS } from '../../platform/numeric/format';

export interface Rat {
  readonly num: bigint;
  readonly den: bigint;
}

const abs = (a: bigint): bigint => (a < 0n ? -a : a);
const gcd = (a: bigint, b: bigint): bigint => {
  let x = abs(a);
  let y = abs(b);
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
};

export function rat(num: bigint | number, den: bigint | number = 1n): Rat {
  let n = BigInt(num);
  let d = BigInt(den);
  if (d === 0n) throw new RangeError('A rational has a non-zero denominator');
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n, d);
  return g <= 1n ? { num: n, den: d } : { num: n / g, den: d / g };
}

export const ZERO: Rat = rat(0);
export const ONE: Rat = rat(1);

/**
 * The exact rational denoted by a decimal the learner entered, or `null` if the double has more than `maxDecimals` decimal places
 * (such a value is REJECTED by the control; the model never rounds it). `k / 10^d` is one correctly rounded division of two exactly
 * representable integers, so the check `k / 10^d === value` proves that `value` is the double nearest to the decimal k/10^d.
 */
export function fromDecimal(value: number, maxDecimals: number): Rat | null {
  if (!Number.isFinite(value)) return null;
  const scale = 10 ** maxDecimals;
  const k = Math.round(value * scale);
  if (!Number.isSafeInteger(k) || k / scale !== value) return null;
  return rat(BigInt(k), BigInt(scale));
}

/** Like `fromDecimal`, but a precondition: the stage's controls guarantee the precision, so a violation is a programming error. */
export function exactDecimal(value: number, maxDecimals: number): Rat {
  const r = fromDecimal(value, maxDecimals);
  if (r === null) throw new RangeError(`${value} is not a decimal with at most ${maxDecimals} places`);
  return r;
}

export const add = (a: Rat, b: Rat): Rat => rat(a.num * b.den + b.num * a.den, a.den * b.den);
export const sub = (a: Rat, b: Rat): Rat => rat(a.num * b.den - b.num * a.den, a.den * b.den);
export const mul = (a: Rat, b: Rat): Rat => rat(a.num * b.num, a.den * b.den);
export const neg = (a: Rat): Rat => ({ num: -a.num, den: a.den });
export const div = (a: Rat, b: Rat): Rat => {
  if (b.num === 0n) throw new RangeError('Division by zero');
  return rat(a.num * b.den, a.den * b.num);
};
export const sign = (a: Rat): -1 | 0 | 1 => (a.num < 0n ? -1 : a.num > 0n ? 1 : 0);
export const isZero = (a: Rat): boolean => a.num === 0n;
export const equals = (a: Rat, b: Rat): boolean => a.num === b.num && a.den === b.den;
export const compare = (a: Rat, b: Rat): -1 | 0 | 1 => sign(sub(a, b));
export const absRat = (a: Rat): Rat => (a.num < 0n ? neg(a) : a);
export const isInteger = (a: Rat): boolean => a.den === 1n;
export function powInt(a: Rat, n: number): Rat {
  if (!Number.isInteger(n) || n < 0) throw new RangeError('powInt needs a non-negative integer exponent');
  let out = ONE;
  for (let i = 0; i < n; i++) out = mul(out, a);
  return out;
}

/** Integer square root: the largest r with r² ≤ n (Newton's method on BigInt; n ≥ 0). */
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

/** The exact square root when `a` is the square of a rational, otherwise `null` (the root is irrational). Requires a ≥ 0. */
export function exactSqrt(a: Rat): Rat | null {
  if (a.num < 0n) throw new RangeError('exactSqrt of a negative rational');
  const n = isqrt(a.num);
  const d = isqrt(a.den);
  return n * n === a.num && d * d === a.den ? rat(n, d) : null;
}

/** The double nearest to a/b when both fit in 53 bits (one correctly rounded division); otherwise the quotient of the two rounded values. */
export function toNumber(a: Rat): number {
  return Number(a.num) / Number(a.den);
}

/** Does the rational have a terminating decimal expansion with at most `places` places? (the denominator divides 10^places) */
function terminates(a: Rat, places: number): boolean {
  return (10n ** BigInt(places)) % a.den === 0n;
}

function decimalText(a: Rat, places: number): string {
  const scale = 10n ** BigInt(places);
  const scaled = (abs(a.num) * scale) / a.den; // exact: den | scale
  const whole = scaled / scale;
  const frac = (scaled % scale).toString().padStart(places, '0').replace(/0+$/, '');
  return `${a.num < 0n ? '-' : ''}${whole}${frac ? `.${frac}` : ''}`;
}

/**
 * How an exact rational is shown. An integer or a terminating decimal with at most six places is written as that decimal and needs no
 * "≈" line (`integer: true` means exactly that: no approximation line); any other rational is written as a fraction p/q.
 */
export function rationalForm(a: Rat): ExactForm {
  if (a.den === 1n || terminates(a, 6)) {
    const plain = a.den === 1n ? a.num.toString() : decimalText(a, 6);
    const text = plain.replace('-', MINUS);
    return { text, tex: plain, spoken: plain.replace('-', 'minus '), integer: true, irrational: false };
  }
  const n = abs(a.num).toString();
  const d = a.den.toString();
  const negative = a.num < 0n;
  return {
    text: `${negative ? MINUS : ''}${n}/${d}`,
    tex: `${negative ? '-' : ''}\\frac{${n}}{${d}}`,
    spoken: `${negative ? 'minus ' : ''}${n} over ${d}`,
    integer: false,
    irrational: false,
  };
}
