/** Exact decimal geometry for II.1–II.7; binary64 algorithms are explicit, separate companions. */
import { abs, add, cmp, div, fromDecimal, isZero, mul, rational, sub, toNumber, ZERO, type Rational } from '../quantity/rational';
import { rootOf } from '../quantity/root';
import type { Point } from '../../platform/geometry/viewport';

export interface Vector { readonly x: Rational; readonly y: Rational }
export const ORIGIN: Vector = { x: ZERO, y: ZERO };
export function vector(x: number, y: number): Vector {
  const rx = fromDecimal(x, 2), ry = fromDecimal(y, 2);
  if (!rx || !ry || Math.max(Math.abs(x), Math.abs(y)) > 1e6) throw new RangeError('Vector components must be finite decimals, at most two places, within ±1,000,000.');
  return { x: rx, y: ry };
}
export function coefficient(n: number): Rational {
  const r = fromDecimal(n, 2);
  if (!r || Math.abs(n) > 1e6) throw new RangeError('A coefficient must be a finite decimal with at most two places, within ±1,000,000.');
  return r;
}
export const point = (v: Vector): Point => ({ x: toNumber(v.x), y: toNumber(v.y) });
export const zero = (v: Vector): boolean => isZero(v.x) && isZero(v.y);
export const plus = (u: Vector, v: Vector): Vector => ({ x: add(u.x, v.x), y: add(u.y, v.y) });
export const minus = (u: Vector, v: Vector): Vector => ({ x: sub(u.x, v.x), y: sub(u.y, v.y) });
export const times = (k: Rational, v: Vector): Vector => ({ x: mul(k, v.x), y: mul(k, v.y) });
export const dot = (u: Vector, v: Vector): Rational => add(mul(u.x, v.x), mul(u.y, v.y));
export const determinant = (u: Vector, v: Vector): Rational => sub(mul(u.x, v.y), mul(u.y, v.x));
export const squaredNorm = (v: Vector): Rational => dot(v, v);
export const length = (v: Vector) => rootOf(squaredNorm(v), 2);

/** Rescaling first preserves direction even when hypot overflows or the input is subnormal. */
export function normalizeNumeric(v: Point): Point | null {
  if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) throw new RangeError('Normalization requires finite components.');
  const m = Math.max(Math.abs(v.x), Math.abs(v.y));
  if (m === 0) return null;
  const x = v.x / m, y = v.y / m, h = Math.hypot(x, y);
  return { x: x / h, y: y / h };
}

/** The bound covers rounding of two normalized products and their sum; it is never a validity repair. */
export function roundingCosine(c: number): number {
  if (!Number.isFinite(c) || Math.abs(c) > 1 + 8 * Number.EPSILON) throw new RangeError('Invalid cosine: only a few ulps of rounding may be clipped.');
  return Math.max(-1, Math.min(1, c));
}

export function angleNumeric(u: Point, v: Point): { cosine: number; radians: number; clipped: boolean } | null {
  const a = normalizeNumeric(u), b = normalizeNumeric(v);
  if (!a || !b) return null;
  const raw = a.x * b.x + a.y * b.y;
  const cosine = roundingCosine(raw);
  // atan2 retains small angles which acos(1) loses; the cosine connection remains inspectable.
  return { cosine, radians: Math.atan2(Math.abs(a.x * b.y - a.y * b.x), cosine), clipped: raw !== cosine };
}

export function deriveAddition(u: Vector, v: Vector) {
  const sum = plus(u, v), difference = minus(v, u);
  return { u, v, sum, difference, opposite: times(rational(-1n), v), reverseSum: plus(v, u), reverseDifference: minus(u, v) };
}

export function deriveScaling(v: Vector, k: Rational) {
  const scaled = times(k, v);
  return { v, k, scaled, norm: length(v), scaledNorm: length(scaled), direction: zero(scaled) ? 'undefined' : k.num < 0n ? 'reversed' : 'same' } as const;
}

export function deriveNorm(v: Vector) {
  const sq = squaredNorm(v), norm = length(v), unit = normalizeNumeric(point(v));
  const l1 = add(abs(v.x), abs(v.y));
  const linf = cmp(abs(v.x), abs(v.y)) >= 0 ? abs(v.x) : abs(v.y);
  const diamond = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];
  const square = [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }];
  const circle = Array.from({ length: 65 }, (_, i) => ({ x: Math.cos(i * 2 * Math.PI / 64), y: Math.sin(i * 2 * Math.PI / 64) }));
  return { v, sq, norm, unit, l1, linf, unitSq: unit ? rational(1n) : null, diamond, square, circle };
}

export function deriveDot(u: Vector, v: Vector) {
  const product = dot(u, v), cross = determinant(u, v);
  const U = point(u), V = point(v);
  const rawCosine = zero(u) || zero(v) ? null : toNumber(product) / (Math.hypot(U.x, U.y) * Math.hypot(V.x, V.y));
  // Bounded exact inputs retain the tiny cross product near collinearity, before any float conversion.
  const angle = zero(u) || zero(v) ? null : {
    cosine: roundingCosine(rawCosine!),
    radians: Math.atan2(Math.abs(toNumber(cross)), toNumber(product)),
    clipped: rawCosine! < -1 || rawCosine! > 1,
  };
  const startAngle = zero(u) ? null : Math.atan2(toNumber(u.y), toNumber(u.x));
  const turn = cross.num < 0n ? -1 : 1;
  return { u, v, product, xProduct: mul(u.x, v.x), yProduct: mul(u.y, v.y), uNorm: length(u), vNorm: length(v), angle, startAngle, endAngle: angle && startAngle !== null ? startAngle + turn * angle.radians : null, orthogonal: isZero(product), projection: deriveProjection(u, v) };
}

export function deriveProjection(u: Vector, v: Vector) {
  const denominator = squaredNorm(u), product = dot(v, u), uNorm = length(u);
  if (isZero(denominator)) return { u, v, denominator, product, uNorm, defined: false } as const;
  const factor = div(product, denominator), projected = times(factor, u), residual = minus(v, projected);
  const signedScalar = toNumber(product) / Math.hypot(toNumber(u.x), toNumber(u.y));
  return { u, v, denominator, product, uNorm, defined: true, factor, projected, residual, residualDot: dot(residual, u), distance: length(residual), signedScalar, reconstruction: plus(projected, residual) } as const;
}

export function deriveSpan(u: Vector, v: Vector, a: Rational, b: Rational) {
  const det = determinant(u, v), rank = !isZero(det) ? 2 : zero(u) && zero(v) ? 0 : 1;
  const au = times(a, u), bv = times(b, v), w = plus(au, bv);
  const combine = (i: number, j: number) => plus(times(rational(BigInt(i)), u), times(rational(BigInt(j)), v));
  const corners = [combine(-2, -2), combine(2, -2), combine(2, 2), combine(-2, 2)].map(point);
  const grid = [-2, -1, 0, 1, 2].flatMap(i => [
    { from: point(combine(i, -2)), to: point(combine(i, 2)), family: 'u' as const },
    { from: point(combine(-2, i)), to: point(combine(2, i)), family: 'v' as const },
  ]);
  const axis = normalizeNumeric(point(zero(u) ? v : u));
  const reach = rank === 1 ? [...corners].sort((p, q) => (p.x * axis!.x + p.y * axis!.y) - (q.x * axis!.x + q.y * axis!.y)) : null;
  return { u, v, a, b, det, rank, au, bv, w, corners, grid, reach, axis };
}

export function deriveBasis(u: Vector, v: Vector, target: Vector) {
  const span = deriveSpan(u, v, ZERO, ZERO), det = span.det;
  const geometry = { u, v, target, det, rank: span.rank, axis: span.axis, grid: span.grid };
  if (span.rank !== 2) {
    const axis = zero(u) ? v : u;
    const reachable = zero(axis) ? zero(target) : isZero(determinant(axis, target));
    return { ...geometry, unique: false, reachable } as const;
  }
  const a = div(determinant(target, v), det), b = div(determinant(u, target), det);
  const au = times(a, u), bv = times(b, v), reconstructed = plus(au, bv);
  const un = normalizeNumeric(point(u))!, vn = normalizeNumeric(point(v))!;
  const separation = Math.abs(un.x * vn.y - un.y * vn.x);
  return { ...geometry, unique: true, reachable: true, a, b, au, bv, reconstructed, separation, sensitive: separation < 1e-4 } as const;
}
