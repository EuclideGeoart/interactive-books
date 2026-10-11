/**
 * Jacobians of polynomial vector maps F: ℝ² → ℝᵐ (III.9). Entries, F(p), F(p + δ) and the linear prediction F(p) + Jδ are exact; the
 * comparison is with an INDEPENDENT evaluation of F at p + δ, not with the linear model itself. Matrix–vector products check shapes.
 */
import { add, mul, sub, toNumber, ZERO, type Rational } from '../quantity/rational';
import { dx2, dy2, eval2 } from './bivariate';
import type { VectorMap } from './surfaces';

export type Matrix = readonly (readonly Rational[])[];
export type Product = { readonly kind: 'value'; readonly value: readonly Rational[] } | { readonly kind: 'undefined'; readonly reason: string };
/** J·v with an explicit shape check: an m×n matrix multiplies only an n-vector. */
export function matVec(J: Matrix, v: readonly Rational[]): Product {
  const n = J[0]?.length ?? 0;
  if (J.some(row => row.length !== n)) return { kind: 'undefined', reason: 'The rows of J have different lengths.' };
  if (v.length !== n) return { kind: 'undefined', reason: `Shape mismatch: J is ${J.length}×${n} but the vector has ${v.length} entries; J·v needs exactly ${n}.` };
  return { kind: 'value', value: J.map(row => row.reduce((s, a, k) => add(s, mul(a, v[k]!)), ZERO)) };
}
export function jacobian(F: VectorMap, x: Rational, y: Rational): Matrix {
  return F.components.map(c => [eval2(dx2(c), x, y), eval2(dy2(c), x, y)]);
}
export const evalMap = (F: VectorMap, x: Rational, y: Rational): Rational[] => F.components.map(c => eval2(c, x, y));
export interface LocalLinear { J: Matrix; Fp: Rational[]; Fq: Rational[]; predicted: Rational[]; error: Rational[]; errorSquared: Rational; deltaSquared: Rational; det: Rational | null }
export function localLinear(F: VectorMap, x: Rational, y: Rational, dx: Rational, dy: Rational): LocalLinear {
  const J = jacobian(F, x, y), Fp = evalMap(F, x, y), Fq = evalMap(F, add(x, dx), add(y, dy));
  const Jd = matVec(J, [dx, dy]); if (Jd.kind !== 'value') throw new Error(Jd.reason);
  const predicted = Fp.map((v, k) => add(v, Jd.value[k]!)), error = Fq.map((v, k) => sub(v, predicted[k]!));
  const sq = (v: readonly Rational[]) => v.reduce((s, a) => add(s, mul(a, a)), ZERO);
  const det = J.length === 2 ? sub(mul(J[0]![0]!, J[1]![1]!), mul(J[0]![1]!, J[1]![0]!)) : null;
  return { J, Fp, Fq, predicted, error, errorSquared: sq(error), deltaSquared: sq([dx, dy]), det };
}
export const toPoint = (v: readonly Rational[]) => ({ x: toNumber(v[0]!), y: toNumber(v[1]!) });
