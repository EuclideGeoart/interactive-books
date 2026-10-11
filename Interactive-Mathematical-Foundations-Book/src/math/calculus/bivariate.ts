/**
 * Exact two-variable polynomials (III.7–III.9, III.11). Values, partial derivatives, gradients, Hessians, slices and directional derivatives
 * are exact rationals at rational points. Level curves are a binary64 DRAWING aid (marching squares on a grid), never a source of values.
 */
import { add, eq, int, isZero, mul, neg, sign, sub, toNumber, ZERO, type Rational } from '../quantity/rational';
import { rationalForm } from '../quantity/exactform';
import { poly, type Poly } from './polynomial';
import type { Polyline } from '../../platform/geometry/curve';

/** Σ c·xⁱyʲ with distinct (i, j) and nonzero c. */
export interface Term { readonly i: number; readonly j: number; readonly c: Rational }
export interface Poly2 { readonly terms: readonly Term[] }

export function poly2(...terms: readonly [number, number, Rational | number][]): Poly2 {
  return normalize(terms.map(([i, j, c]) => ({ i, j, c: typeof c === 'number' ? int(c) : c })));
}
function normalize(terms: readonly Term[]): Poly2 {
  const m = new Map<string, Term>();
  for (const t of terms) { const k = `${t.i},${t.j}`, o = m.get(k); m.set(k, o ? { ...o, c: add(o.c, t.c) } : t); }
  return { terms: [...m.values()].filter(t => !isZero(t.c)).sort((a, b) => b.i + b.j - (a.i + a.j) || b.i - a.i) };
}
const pow = (x: Rational, k: number): Rational => { let r: Rational = { num: 1n, den: 1n }; for (let n = 0; n < k; n++) r = mul(r, x); return r; };
export function eval2(p: Poly2, x: Rational, y: Rational): Rational {
  return p.terms.reduce((s, t) => add(s, mul(t.c, mul(pow(x, t.i), pow(y, t.j)))), ZERO);
}
export function eval2Number(p: Poly2, x: number, y: number): number {
  let s = 0; for (const t of p.terms) s += toNumber(t.c) * x ** t.i * y ** t.j; return s;
}
export const dx2 = (p: Poly2): Poly2 => normalize(p.terms.filter(t => t.i > 0).map(t => ({ i: t.i - 1, j: t.j, c: mul(t.c, int(t.i)) })));
export const dy2 = (p: Poly2): Poly2 => normalize(p.terms.filter(t => t.j > 0).map(t => ({ i: t.i, j: t.j - 1, c: mul(t.c, int(t.j)) })));
export const addPoly2 = (a: Poly2, b: Poly2): Poly2 => normalize([...a.terms, ...b.terms]);
export const scalePoly2 = (a: Poly2, s: Rational): Poly2 => normalize(a.terms.map(t => ({ ...t, c: mul(t.c, s) })));

/** The one-variable slice t ↦ f(t, y₀) (axis 'x') or t ↦ f(x₀, t) (axis 'y'), as an exact polynomial in t. */
export function slice(p: Poly2, axis: 'x' | 'y', fixed: Rational): Poly {
  const c: Rational[] = [];
  for (const t of p.terms) {
    const k = axis === 'x' ? t.i : t.j, other = axis === 'x' ? pow(fixed, t.j) : pow(fixed, t.i);
    c[k] = add(c[k] ?? ZERO, mul(t.c, other));
  }
  return poly(...Array.from({ length: c.length }, (_, k) => c[k] ?? ZERO));
}

export type Vec2 = readonly [Rational, Rational];
export const gradient = (p: Poly2, x: Rational, y: Rational): Vec2 => [eval2(dx2(p), x, y), eval2(dy2(p), x, y)];
/** Symmetric 2×2 Hessian [[fxx, fxy], [fyx, fyy]]; the mixed partials are computed in BOTH orders and returned separately. */
export function hessian(p: Poly2, x: Rational, y: Rational): { fxx: Rational; fxy: Rational; fyx: Rational; fyy: Rational } {
  return { fxx: eval2(dx2(dx2(p)), x, y), fxy: eval2(dy2(dx2(p)), x, y), fyx: eval2(dx2(dy2(p)), x, y), fyy: eval2(dy2(dy2(p)), x, y) };
}
export const dot2 = (a: Vec2, b: Vec2): Rational => add(mul(a[0], b[0]), mul(a[1], b[1]));
export const isZeroVec = (v: Vec2) => isZero(v[0]) && isZero(v[1]);

export type CriticalClass = 'not-critical' | 'minimum' | 'maximum' | 'saddle' | 'inconclusive';
/** Second-derivative test, exact: only at a critical point; det H = 0 is reported as inconclusive. */
export function classify(p: Poly2, x: Rational, y: Rational): { kind: CriticalClass; det: Rational; trace: Rational } {
  const g = gradient(p, x, y), h = hessian(p, x, y);
  const det = sub(mul(h.fxx, h.fyy), mul(h.fxy, h.fyx)), trace = add(h.fxx, h.fyy);
  if (!isZeroVec(g)) return { kind: 'not-critical', det, trace };
  if (sign(det) < 0) return { kind: 'saddle', det, trace };
  if (isZero(det)) return { kind: 'inconclusive', det, trace };
  return { kind: sign(h.fxx) > 0 ? 'minimum' : 'maximum', det, trace };
}
/** Eigenvalues of the symmetric Hessian: exact trace/discriminant, binary64 roots (with the stable product trick for the small root). */
export function hessianEigen(h: { fxx: Rational; fxy: Rational; fyy: Rational }) {
  const tr = add(h.fxx, h.fyy), det = sub(mul(h.fxx, h.fyy), mul(h.fxy, h.fxy));
  const disc = sub(mul(tr, tr), mul(int(4), det)); // ≥ 0 for symmetric matrices
  const t = toNumber(tr), d = Math.sqrt(Math.max(0, toNumber(disc)));
  const big = t >= 0 ? (t + d) / 2 : (t - d) / 2, small = big === 0 ? 0 : toNumber(det) / big;
  const values = [big, small].sort((a, b) => b - a) as [number, number];
  // Unit eigenvector for λ: (fxy, λ − fxx) or (λ − fyy, fxy); axis-aligned when fxy = 0.
  const vec = (l: number): [number, number] => {
    const a = toNumber(h.fxx), b = toNumber(h.fxy), c = toNumber(h.fyy);
    if (b === 0) return Math.abs(l - a) <= Math.abs(l - c) ? [1, 0] : [0, 1];
    const v: [number, number] = Math.abs(l - a) > Math.abs(l - c) ? [b, l - a] : [l - c, b];
    const n = Math.hypot(v[0], v[1]); return [v[0] / n, v[1] / n];
  };
  return { trace: tr, det, discriminant: disc, values, vectors: [vec(values[0]), vec(values[1])] as const, repeated: isZero(disc) };
}

/** Plain-text and LaTeX forms. */
export function poly2Text(p: Poly2, tex = false): string {
  if (!p.terms.length) return '0';
  return p.terms.map((t, k) => {
    const n = t.c.num < 0n, a = n ? neg(t.c) : t.c, one = eq(a, int(1)) && t.i + t.j > 0;
    const f = rationalForm(a), coef = one ? '' : tex ? f.tex.replace('\\frac', '\\tfrac') : t.i + t.j > 0 && !f.integer ? `(${f.text})` : f.text;
    const v = (s: string, e: number) => e === 0 ? '' : e === 1 ? s : tex ? `${s}^{${e}}` : `${s}${'⁰¹²³⁴⁵⁶⁷⁸⁹'[e]}`;
    const body = `${coef}${v('x', t.i)}${v('y', t.j)}`;
    return k === 0 ? `${n ? (tex ? '-' : '−') : ''}${body}` : tex ? `${n ? '-' : '+'}${body}` : ` ${n ? '−' : '+'} ${body}`;
  }).join('');
}

/**
 * Level curves f = c on a uniform grid by marching squares (binary64). Returns short segments; ambiguous saddle cells are resolved by the
 * cell-centre value. A drawing aid only: callers must not read values from it.
 */
export function contours(f: (x: number, y: number) => number, win: { xMin: number; xMax: number; yMin: number; yMax: number }, levels: readonly number[], n = 64): Polyline[] {
  const xs = Array.from({ length: n + 1 }, (_, i) => win.xMin + (win.xMax - win.xMin) * i / n), ys = Array.from({ length: n + 1 }, (_, j) => win.yMin + (win.yMax - win.yMin) * j / n);
  const v = xs.map(x => ys.map(y => f(x, y)));
  const out: Polyline[] = [];
  for (const c of levels) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const q = [v[i]![j]! - c, v[i + 1]![j]! - c, v[i + 1]![j + 1]! - c, v[i]![j + 1]! - c];
    const P = [{ x: xs[i]!, y: ys[j]! }, { x: xs[i + 1]!, y: ys[j]! }, { x: xs[i + 1]!, y: ys[j + 1]! }, { x: xs[i]!, y: ys[j + 1]! }];
    const cross: { x: number; y: number }[] = [];
    for (let e = 0; e < 4; e++) {
      const a = q[e]!, b = q[(e + 1) % 4]!;
      if ((a < 0) !== (b < 0)) { const t = a / (a - b), A = P[e]!, B = P[(e + 1) % 4]!; cross.push({ x: A.x + t * (B.x - A.x), y: A.y + t * (B.y - A.y) }); }
    }
    if (cross.length === 2) out.push([cross[0]!, cross[1]!]);
    else if (cross.length === 4) {
      const centre = f((xs[i]! + xs[i + 1]!) / 2, (ys[j]! + ys[j + 1]!) / 2) - c;
      if ((centre < 0) === (q[0]! < 0)) { out.push([cross[0]!, cross[1]!], [cross[2]!, cross[3]!]); } else { out.push([cross[0]!, cross[3]!], [cross[1]!, cross[2]!]); }
    }
  }
  return out;
}
