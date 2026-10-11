/**
 * Exact one-variable polynomials with rational coefficients (Part III). This is the EXACT layer of the calculus chapters: values, difference
 * quotients, derivatives, antiderivatives, Riemann sums and limits of polynomial and rational pieces are computed here without rounding.
 *
 * Deliberately small: coefficients are listed from the constant term upward, degrees stay tiny (the lessons use at most degree 6), and there is
 * no factorisation beyond dividing out a known linear factor. It is not a computer algebra system.
 */
import { add, cmp, div, int, isZero, mul, neg, rational, sub, toNumber, ZERO, ONE, type Rational } from '../quantity/rational';
import { rationalForm } from '../quantity/exactform';

/** `coefficients[k]` multiplies `x^k`. Trailing zeros are always trimmed, so the zero polynomial is `[]`. */
export interface Poly { readonly coefficients: readonly Rational[] }

const trim = (c: readonly Rational[]): Poly => {
  let n = c.length;
  while (n > 0 && isZero(c[n - 1]!)) n--;
  return { coefficients: c.slice(0, n) };
};

/** A polynomial from numbers or rationals, constant term first. Numbers must be exact small decimals (≤ 6 places). */
export function poly(...c: readonly (number | Rational)[]): Poly {
  return trim(c.map(v => typeof v === 'number' ? numberToRational(v) : v));
}

/** Exact rational for a short decimal number; throws for anything finer (a bug in the caller's literal, never user input). */
export function numberToRational(v: number): Rational {
  if (Number.isInteger(v)) return int(v);
  for (let d = 1; d <= 6; d++) {
    const scaled = v * 10 ** d;
    if (Number.isInteger(Math.round(scaled)) && Math.abs(scaled - Math.round(scaled)) < 1e-9 && Number((Math.round(scaled) / 10 ** d).toFixed(d)) === v)
      return rational(BigInt(Math.round(scaled)), 10n ** BigInt(d));
  }
  throw new RangeError(`Not a short decimal: ${v}`);
}

export const ZERO_POLY: Poly = { coefficients: [] };
export const degree = (p: Poly): number => p.coefficients.length - 1; // −1 for the zero polynomial
export const coefficient = (p: Poly, k: number): Rational => p.coefficients[k] ?? ZERO;
export const isZeroPoly = (p: Poly): boolean => p.coefficients.length === 0;

export function addPoly(a: Poly, b: Poly): Poly {
  const n = Math.max(a.coefficients.length, b.coefficients.length);
  return trim(Array.from({ length: n }, (_, k) => add(coefficient(a, k), coefficient(b, k))));
}
export const scalePoly = (p: Poly, s: Rational): Poly => trim(p.coefficients.map(c => mul(c, s)));
export const subPoly = (a: Poly, b: Poly): Poly => addPoly(a, scalePoly(b, int(-1)));
export function mulPoly(a: Poly, b: Poly): Poly {
  if (isZeroPoly(a) || isZeroPoly(b)) return ZERO_POLY;
  const out: Rational[] = Array.from({ length: a.coefficients.length + b.coefficients.length - 1 }, () => ZERO);
  a.coefficients.forEach((x, i) => b.coefficients.forEach((y, j) => { out[i + j] = add(out[i + j]!, mul(x, y)); }));
  return trim(out);
}
export const polyEqual = (a: Poly, b: Poly): boolean => isZeroPoly(subPoly(a, b));

/** Horner evaluation, exact. */
export function evalPoly(p: Poly, x: Rational): Rational {
  let acc = ZERO;
  for (let k = p.coefficients.length - 1; k >= 0; k--) acc = add(mul(acc, x), p.coefficients[k]!);
  return acc;
}
/** Binary64 companion of `evalPoly`, for drawing only. */
export function evalPolyNumber(p: Poly, x: number): number {
  let acc = 0;
  const c = p.coefficients.map(toNumber);
  for (let k = c.length - 1; k >= 0; k--) acc = acc * x + c[k]!;
  return acc;
}

/** Exact derivative: d/dx Σ cₖxᵏ = Σ k cₖ xᵏ⁻¹. */
export const derivative = (p: Poly): Poly => trim(p.coefficients.slice(1).map((c, i) => mul(c, int(i + 1))));
/** The antiderivative with zero constant term: Σ cₖ xᵏ⁺¹/(k+1). */
export const antiderivative = (p: Poly): Poly => trim([ZERO, ...p.coefficients.map((c, k) => div(c, int(k + 1)))]);
/** ∫ₐᵇ p exactly, through the antiderivative. */
export function integrate(p: Poly, a: Rational, b: Rational): Rational {
  const P = antiderivative(p);
  return sub(evalPoly(P, b), evalPoly(P, a));
}

/** p(x + h) as a polynomial in h, for a fixed x: the exact numerator of a difference quotient. */
export function shift(p: Poly, x: Rational): Poly {
  // Taylor at x: p(x+h) = Σ p⁽ᵏ⁾(x) hᵏ / k!
  const out: Rational[] = [];
  let d = p, factorial = ONE;
  for (let k = 0; !isZeroPoly(d); k++) {
    if (k > 0) factorial = mul(factorial, int(k));
    out.push(div(evalPoly(d, x), factorial));
    d = derivative(d);
  }
  return trim(out);
}

/** Exact composition p(q(x)). */
export function compose(p: Poly, q: Poly): Poly {
  let acc = ZERO_POLY;
  for (let k = p.coefficients.length - 1; k >= 0; k--) acc = addPoly(mulPoly(acc, q), poly(p.coefficients[k]!));
  return acc;
}

/** Divide by (x − a) when a is a root: synthetic division. Returns null if a is not a root. */
export function divideRoot(p: Poly, a: Rational): Poly | null {
  if (!isZero(evalPoly(p, a))) return null;
  const n = p.coefficients.length;
  const q: Rational[] = Array.from({ length: Math.max(0, n - 1) }, () => ZERO);
  let carry = ZERO;
  for (let k = n - 1; k >= 1; k--) { carry = add(p.coefficients[k]!, mul(carry, a)); q[k - 1] = carry; }
  return trim(q);
}

/** Multiplicity of a as a root (0 when p(a) ≠ 0; Infinity for the zero polynomial). */
export function rootMultiplicity(p: Poly, a: Rational): number {
  if (isZeroPoly(p)) return Infinity;
  let m = 0, q: Poly | null = p;
  while (q && !isZeroPoly(q) && isZero(evalPoly(q, a))) { q = divideRoot(q, a); m++; }
  return m;
}

/**
 * All RATIONAL roots of p in the closed interval [lo, hi], sorted, by the rational-root theorem on the integer-scaled coefficients. Only used for
 * the small polynomials of the lessons; irrational roots are not reported (callers say so and fall back to numerical bracketing).
 */
export function rationalRootsIn(p: Poly, lo: Rational, hi: Rational): Rational[] {
  if (isZeroPoly(p) || degree(p) === 0) return [];
  // Clear denominators.
  const l = p.coefficients.reduce((m, c) => lcm(m, c.den), 1n);
  let ints = p.coefficients.map(c => (c.num * l) / c.den);
  const roots: Rational[] = [];
  // Factor out x = 0.
  while (ints.length && ints[0] === 0n) { ints = ints.slice(1); if (!roots.some(r => isZero(r))) roots.push(ZERO); }
  if (ints.length >= 2) {
    const a0 = ints[0]!, an = ints[ints.length - 1]!;
    const candidates = new Map<string, Rational>();
    for (const pDiv of divisors(a0)) for (const qDiv of divisors(an)) for (const s of [1n, -1n]) {
      const r = rational(s * pDiv, qDiv);
      candidates.set(`${r.num}/${r.den}`, r);
    }
    const reduced = trim(ints.map(v => rational(v)));
    for (const r of candidates.values()) if (isZero(evalPoly(reduced, r))) roots.push(r);
  }
  return roots.filter(r => cmp(r, lo) >= 0 && cmp(r, hi) <= 0).sort(cmp);
}
const absBig = (n: bigint) => (n < 0n ? -n : n);
function lcm(a: bigint, b: bigint): bigint { const g = gcdBig(a, b); return (absBig(a) / g) * absBig(b); }
function gcdBig(a: bigint, b: bigint): bigint { let x = absBig(a), y = absBig(b); while (y) [x, y] = [y, x % y]; return x || 1n; }
function divisors(n: bigint): bigint[] {
  const m = absBig(n), out: bigint[] = [];
  if (m > 1_000_000n) throw new RangeError('rationalRootsIn is only for small lesson polynomials');
  for (let d = 1n; d * d <= m; d++) if (m % d === 0n) { out.push(d); if (d * d !== m) out.push(m / d); }
  return out;
}

/** Plain-text and LaTeX forms (descending powers, in the variable `v`). */
export function polyText(p: Poly, v = 'x'): string { return polyWrite(p, v, false); }
export function polyTex(p: Poly, v = 'x'): string { return polyWrite(p, v, true); }
function polyWrite(p: Poly, v: string, tex: boolean): string {
  if (isZeroPoly(p)) return '0';
  let out = '';
  for (let k = p.coefficients.length - 1; k >= 0; k--) {
    const c = p.coefficients[k]!;
    if (isZero(c)) continue;
    const negative = c.num < 0n, a = negative ? neg(c) : c;
    const one = a.num === 1n && a.den === 1n;
    const form = rationalForm(a);
    const num = tex ? form.tex.replace('\\frac', '\\tfrac') : k > 0 && !form.integer ? `(${form.text})` : form.text;
    const power = k === 0 ? '' : k === 1 ? v : tex ? `${v}^{${k}}` : `${v}${SUP[k] ?? `^${k}`}`;
    const body = k === 0 ? form.text && (tex ? form.tex : form.text) : one ? power : `${num}${power}`;
    if (out === '') out = `${negative ? (tex ? '-' : '−') : ''}${body}`;
    else out += tex ? `${negative ? '-' : '+'}${body}` : ` ${negative ? '−' : '+'} ${body}`;
  }
  return out;
}
const SUP: Record<number, string> = { 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
