/**
 * Integration (III.12, III.13, III.15). Integrands are piecewise polynomials with rational breakpoints (exact) or a few named transcendental
 * functions with stated antiderivatives (binary64). For exact integrands every Riemann/trapezoid sum, every definite integral, the geometric
 * area ∫|f| (split at the exact rational roots) and the accumulation function F(x) = ∫ₐˣ f are exact rationals.
 *
 * Orientation is respected: ∫ₐᵇ = −∫ᵦᵃ, and a partition of [a, b] with b < a has negative Δx.
 */
import { add, cmp, div, int, mul, neg, sign, sub, toNumber, ZERO, type Rational } from '../quantity/rational';
import { antiderivative, evalPoly, integrate, poly, polyText, rationalRootsIn, type Poly } from './polynomial';
import { piecewise, sinFn, expFn, sqrtFn, r, type Univariate } from './univariate';

export interface PolyPiece { readonly lo: Rational | null; readonly hi: Rational | null; readonly poly: Poly }
export interface ExactIntegrand { readonly kind: 'exact'; readonly id: string; readonly text: string; readonly pieces: readonly PolyPiece[]; readonly f: Univariate }
export interface NumericIntegrand { readonly kind: 'numeric'; readonly id: string; readonly text: string; readonly f: Univariate; readonly antiderivative: (x: number) => number; readonly maxSecond?: number; readonly smooth: boolean }
export type Integrand = ExactIntegrand | NumericIntegrand;

/** Piecewise polynomial integrand; at a breakpoint the RIGHT piece's value is used (sums only sample finitely many points anyway). */
export function exactIntegrand(id: string, text: string, pieces: readonly PolyPiece[]): ExactIntegrand {
  const f = piecewise({ id, text, tex: text, pieces: pieces.map((p, k) => ({ lo: p.lo, hi: p.hi, loClosed: k > 0 || p.lo !== null, hiClosed: k === pieces.length - 1 && p.hi !== null, num: p.poly })) });
  return { kind: 'exact', id, text, pieces, f };
}
const within = (lo: Rational | null, hi: Rational | null, a: Rational, b: Rational): [Rational, Rational] | null => {
  const L = lo === null || cmp(a, lo) > 0 ? a : lo, H = hi === null || cmp(b, hi) < 0 ? b : hi;
  return cmp(L, H) < 0 ? [L, H] : null;
};
/** ∫ₐᵇ f exactly (oriented). */
export function exactIntegral(g: ExactIntegrand, a: Rational, b: Rational): Rational {
  if (cmp(a, b) > 0) return neg(exactIntegral(g, b, a));
  return g.pieces.reduce((s, p) => { const w = within(p.lo, p.hi, a, b); return w ? add(s, integrate(p.poly, w[0], w[1])) : s; }, ZERO);
}
/** Positive part, negative part and geometric area ∫|f| over [min(a,b), max(a,b)], split at exact rational roots. Null if a root is irrational. */
export function signedParts(g: ExactIntegrand, a: Rational, b: Rational): { positive: Rational; negative: Rational; area: Rational } | null {
  const [lo, hi] = cmp(a, b) <= 0 ? [a, b] : [b, a];
  let positive = ZERO, negative = ZERO;
  for (const p of g.pieces) {
    const w = within(p.lo, p.hi, lo, hi); if (!w) continue;
    const roots = rationalRootsIn(p.poly, w[0], w[1]);
    // An irrational sign change inside the piece makes the split inexact: detect by sign change between consecutive rational cut points.
    const cuts = [w[0], ...roots.filter(x => cmp(x, w[0]) > 0 && cmp(x, w[1]) < 0), w[1]];
    for (let k = 0; k + 1 < cuts.length; k++) {
      const mid = div(add(cuts[k]!, cuts[k + 1]!), int(2));
      const v = integrate(p.poly, cuts[k]!, cuts[k + 1]!);
      if (sign(v) !== 0 && sign(evalPoly(p.poly, mid)) !== sign(v)) return null;
      if (hasIrrationalSignChange(p.poly, cuts[k]!, cuts[k + 1]!)) return null;
      if (sign(v) > 0) positive = add(positive, v); else negative = add(negative, v);
    }
  }
  return { positive, negative, area: sub(positive, negative) };
}
function hasIrrationalSignChange(p: Poly, lo: Rational, hi: Rational): boolean {
  // Sample 64 interior points: a sign change between samples with no rational root in between means an irrational root.
  let prev = sign(evalPoly(p, add(lo, div(sub(hi, lo), int(128)))));
  for (let k = 2; k < 128; k++) {
    const s = sign(evalPoly(p, add(lo, div(mul(sub(hi, lo), int(k)), int(128)))));
    if (s !== 0 && prev !== 0 && s !== prev) return true;
    if (s !== 0) prev = s;
  }
  return false;
}

export type Rule = 'left' | 'right' | 'midpoint' | 'trapezoid';
export interface Panel { readonly x0: number; readonly x1: number; readonly heights: readonly [number, number]; readonly signed: number; readonly exact?: Rational }
export type Sum = { readonly kind: 'value'; readonly value: number; readonly exact?: Rational; readonly panels: readonly Panel[]; readonly dx: Rational }
  | { readonly kind: 'undefined'; readonly reason: string; readonly panels: readonly Panel[]; readonly dx: Rational };
/** Riemann (left/right/midpoint) or trapezoid sum with n equal panels; exact when the integrand is exact. */
export function riemann(g: Integrand, a: Rational, b: Rational, n: number, rule: Rule): Sum {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('n must be a positive integer');
  const dx = div(sub(b, a), int(n)), panels: Panel[] = [];
  let total: Rational | null = ZERO, numeric = 0;
  for (let i = 0; i < n; i++) {
    const x0 = add(a, mul(dx, int(i))), x1 = add(x0, dx);
    const pts = rule === 'left' ? [x0] : rule === 'right' ? [x1] : rule === 'midpoint' ? [div(add(x0, x1), int(2))] : [x0, x1];
    const vals = pts.map(p => g.f.at(p));
    const bad = vals.find(v => v.kind === 'undefined');
    if (bad) return { kind: 'undefined', reason: `The integrand is undefined at a sample point (${(bad as { reason: string }).reason})`, panels, dx };
    const v = vals as { kind: 'value'; value: number; exact?: Rational }[];
    const height = rule === 'trapezoid' ? (v[0]!.exact && v[1]!.exact ? div(add(v[0]!.exact, v[1]!.exact), int(2)) : null) : v[0]!.exact ?? null;
    const hNum = rule === 'trapezoid' ? (v[0]!.value + v[1]!.value) / 2 : v[0]!.value;
    const area = height ? mul(height, dx) : undefined;
    if (total && area) total = add(total, area); else total = null;
    numeric += hNum * toNumber(dx);
    panels.push({ x0: toNumber(x0), x1: toNumber(x1), heights: rule === 'trapezoid' ? [v[0]!.value, v[1]!.value] : [hNum, hNum], signed: area ? toNumber(area) : hNum * toNumber(dx), exact: area });
  }
  return total ? { kind: 'value', value: toNumber(total), exact: total, panels, dx } : { kind: 'value', value: numeric, panels, dx };
}
/** Reference ∫ₐᵇ f: exact for exact integrands, the stated antiderivative difference (binary64) otherwise. */
export function reference(g: Integrand, a: Rational, b: Rational): { value: number; exact?: Rational } {
  if (g.kind === 'exact') { const e = exactIntegral(g, a, b); return { value: toNumber(e), exact: e }; }
  return { value: g.antiderivative(toNumber(b)) - g.antiderivative(toNumber(a)) };
}

/** F(x) = ∫ₐˣ f as an exact piecewise polynomial, continuous by construction (each piece's constant is fixed by the previous piece). */
export function accumulation(g: ExactIntegrand, a: Rational): Univariate & { readonly pieceFormulas: readonly { lo: Rational | null; hi: Rational | null; poly: Poly }[] } {
  const pieces = g.pieces.map(p => {
    // F(x) = ∫ₐˣ f = ∫ₐ^{lo} f + ∫_{lo}^x p, written as P(x) + C with P the zero-constant antiderivative of the piece.
    const P = antiderivative(p.poly);
    const start = p.lo !== null && cmp(a, p.lo) < 0 ? p.lo : p.hi !== null && cmp(a, p.hi) > 0 ? p.hi : a; // a clamped into the piece
    const C = sub(exactIntegral(g, a, start), evalPoly(P, start));
    return { lo: p.lo, hi: p.hi, poly: add0(P, C) };
  });
  const F = piecewise({ id: `F-${g.id}-${a.num}/${a.den}`, text: `F(x) = ∫ f`, tex: 'F(x)', pieces: pieces.map((p, k) => ({ lo: p.lo, hi: p.hi, loClosed: k > 0, hiClosed: k === pieces.length - 1 && p.hi !== null, num: p.poly })) });
  return { ...F, pieceFormulas: pieces };
}
const add0 = (p: Poly, c: Rational): Poly => poly(...[add(p.coefficients[0] ?? ZERO, c), ...p.coefficients.slice(1)]);

// ------------------------------------------------------------------------------------------- catalog
export const INTEGRANDS: Readonly<Record<string, Integrand>> = {
  cubic: exactIntegrand('cubic-int', 'x³/4 − x', [{ lo: null, hi: null, poly: poly(0, -1, 0, r(1, 4)) }]),
  parabola: exactIntegrand('parabola', '4 − x²', [{ lo: null, hi: null, poly: poly(4, 0, -1) }]),
  linear: exactIntegrand('linear', 'x − 1', [{ lo: null, hi: null, poly: poly(-1, 1) }]),
  square: exactIntegrand('square', 'x²', [{ lo: null, hi: null, poly: poly(0, 0, 1) }]),
  signed: exactIntegrand('signed', 'x³ − x', [{ lo: null, hi: null, poly: poly(0, -1, 0, 1) }]),
  step: exactIntegrand('step', '1 for x < 1, −1 for x ≥ 1', [{ lo: null, hi: r(1), poly: poly(1) }, { lo: r(1), hi: null, poly: poly(-1) }]),
  kink: exactIntegrand('kink', '|x − 1/3|', [{ lo: null, hi: r(1, 3), poly: poly(r(1, 3), -1) }, { lo: r(1, 3), hi: null, poly: poly(r(-1, 3), 1) }]),
  sin: { kind: 'numeric', id: 'sin-int', text: 'sin x', f: sinFn, antiderivative: x => -Math.cos(x), maxSecond: 1, smooth: true },
  exp: { kind: 'numeric', id: 'exp-int', text: 'eˣ', f: expFn, antiderivative: Math.exp, smooth: true },
  sqrt: { kind: 'numeric', id: 'sqrt-int', text: '√x', f: sqrtFn, antiderivative: x => (2 / 3) * x ** 1.5, smooth: false },
};
export const integrandText = (g: Integrand) => (g.kind === 'exact' && g.pieces.length === 1 ? polyText(g.pieces[0]!.poly) : g.text);
export const evalIntegrand = (g: Integrand, x: number) => g.f.number(x);
