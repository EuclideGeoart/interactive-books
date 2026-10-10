/**
 * Exact rationals for the notation-map chapter (master plan §10.3: a small, chapter-owned exact type, not a CAS).
 *
 * A `Q` is a fraction of two BigInts with a positive denominator and no common factor, so equality is structural. Every accumulator,
 * term and closed form shown with "=" in this chapter comes from here: no double is ever involved in a sum.
 */
export interface Q {
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

export function q(num: bigint | number, den: bigint | number = 1n): Q {
  let n = BigInt(num);
  let d = BigInt(den);
  if (d === 0n) throw new RangeError('A rational has a non-zero denominator');
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n, d);
  return g <= 1n ? { num: n, den: d } : { num: n / g, den: d / g };
}

export const ZERO: Q = q(0);
export const ONE: Q = q(1);

export const add = (a: Q, b: Q): Q => q(a.num * b.den + b.num * a.den, a.den * b.den);
export const sub = (a: Q, b: Q): Q => q(a.num * b.den - b.num * a.den, a.den * b.den);
export const mul = (a: Q, b: Q): Q => q(a.num * b.num, a.den * b.den);
export const neg = (a: Q): Q => ({ num: -a.num, den: a.den });
export function div(a: Q, b: Q): Q {
  if (b.num === 0n) throw new RangeError('Division by zero');
  return q(a.num * b.den, a.den * b.num);
}
export const equals = (a: Q, b: Q): boolean => a.num === b.num && a.den === b.den;
export const isZero = (a: Q): boolean => a.num === 0n;
export const isInteger = (a: Q): boolean => a.den === 1n;
export const sign = (a: Q): -1 | 0 | 1 => (a.num < 0n ? -1 : a.num > 0n ? 1 : 0);

/** a^n for an integer n (negative n needs a non-zero base; 0^0 = 1 is the convention of a geometric sum's first term). */
export function pow(a: Q, n: number): Q {
  if (!Number.isInteger(n)) throw new RangeError('pow needs an integer exponent');
  if (n < 0) {
    if (a.num === 0n) throw new RangeError('0 to a negative power is undefined');
    return pow(q(a.den, a.num), -n);
  }
  let out = ONE;
  for (let i = 0; i < n; i++) out = mul(out, a);
  return out;
}

/** The exact rational denoted by the text `p`, `-p`, `p/q` or a decimal `d.ddd` of at most `maxDecimals` places; `null` if it is anything else. */
export function parseQ(text: string, maxDecimals = 4): Q | null {
  const t = text.trim().replace(/−/g, '-');
  let m = /^([+-]?)(\d+)$/.exec(t);
  if (m) return q(BigInt(`${m[1] === '-' ? '-' : ''}${m[2]}`));
  m = /^([+-]?)(\d+)\s*\/\s*(\d+)$/.exec(t);
  if (m) {
    if (BigInt(m[3]!) === 0n) return null;
    return q(BigInt(`${m[1] === '-' ? '-' : ''}${m[2]}`), BigInt(m[3]!));
  }
  m = /^([+-]?)(\d+)\.(\d+)$/.exec(t);
  if (m && m[3]!.length <= maxDecimals) return q(BigInt(`${m[1] === '-' ? '-' : ''}${m[2]}${m[3]}`), 10n ** BigInt(m[3]!.length));
  return null;
}

/** A computed double nearest to the rational (used only for the "≈" line; never for a decision). */
export const toNumber = (a: Q): number => Number(a.num) / Number(a.den);

export interface QForm {
  readonly text: string;
  readonly tex: string;
  readonly spoken: string;
  readonly integer: boolean;
}

const MINUS = '−';

/** An integer `n`, or the fraction `p/q` in lowest terms. Never a decimal: a decimal would be a different (rounded) statement. */
export function form(a: Q): QForm {
  const negative = a.num < 0n;
  const n = abs(a.num).toString();
  if (a.den === 1n) return { text: `${negative ? MINUS : ''}${n}`, tex: `${negative ? '-' : ''}${n}`, spoken: `${negative ? 'minus ' : ''}${n}`, integer: true };
  const d = a.den.toString();
  return { text: `${negative ? MINUS : ''}${n}/${d}`, tex: `${negative ? '-' : ''}\\frac{${n}}{${d}}`, spoken: `${negative ? 'minus ' : ''}${n} over ${d}`, integer: false };
}

/** The rational as TeX, in parentheses when it is negative or a fraction (for use as a factor or a base). */
export function formParen(a: Q): QForm {
  const f = form(a);
  if (a.num >= 0n && f.integer) return f;
  return { text: `(${f.text})`, tex: `\\left(${f.tex}\\right)`, spoken: f.spoken, integer: f.integer };
}
