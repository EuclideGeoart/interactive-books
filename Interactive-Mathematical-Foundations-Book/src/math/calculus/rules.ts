/**
 * Derivative rules (III.5) for u(x) = a·x + b and v(x) = x² + c with rational parameters. The rule result is checked against an INDEPENDENT
 * route: for sums and products, the derivative of the exactly expanded polynomial; for a quotient q = u/v, the identity u = q·v differentiated
 * with the product rule, q′ = (u′ − q·v′)/v. Where v(x) = 0 the quotient and its derivative are undefined, and that is reported.
 */
import { add, div, eq, isZero, mul, sub, toNumber, type Rational } from '../quantity/rational';
import { addPoly, derivative, evalPoly, mulPoly, poly, type Poly } from './polynomial';

export type RuleMode = 'sum' | 'product' | 'quotient';
type Num = { value: number; exact: Rational };
const ex = (e: Rational): Num => ({ value: toNumber(e), exact: e });
export interface RuleResult {
  readonly u: Num; readonly v: Num; readonly du: Num; readonly dv: Num;
  readonly value: Num | null; readonly rule: Num | null; readonly independent: Num | null; readonly agree: boolean | null;
  readonly terms: readonly Num[];
  readonly reason?: string;
  /** Product mode: exact increment decomposition Δ(uv) = vΔu + uΔv + ΔuΔv for the displacement Δx. */
  readonly increment?: { readonly total: Num; readonly vDu: Num; readonly uDv: Num; readonly corner: Num; readonly holds: boolean; readonly u2: Num; readonly v2: Num };
}
export const uPoly = (a: Rational, b: Rational): Poly => poly(b, a);
export const vPoly = (c: Rational): Poly => poly(c, 0, 1);

export function applyRule(mode: RuleMode, a: Rational, b: Rational, c: Rational, x: Rational, dx: Rational): RuleResult {
  const U = uPoly(a, b), V = vPoly(c);
  const u = evalPoly(U, x), v = evalPoly(V, x), du = evalPoly(derivative(U), x), dv = evalPoly(derivative(V), x);
  const base = { u: ex(u), v: ex(v), du: ex(du), dv: ex(dv) };
  if (mode === 'sum') {
    const rule = add(du, dv), independent = evalPoly(derivative(addPoly(U, V)), x);
    return { ...base, value: ex(add(u, v)), rule: ex(rule), independent: ex(independent), agree: eq(rule, independent), terms: [ex(du), ex(dv)] };
  }
  if (mode === 'product') {
    const t1 = mul(du, v), t2 = mul(u, dv), rule = add(t1, t2), independent = evalPoly(derivative(mulPoly(U, V)), x);
    const u2 = evalPoly(U, add(x, dx)), v2 = evalPoly(V, add(x, dx)), Du = sub(u2, u), Dv = sub(v2, v);
    const total = sub(mul(u2, v2), mul(u, v)), vDu = mul(v, Du), uDv = mul(u, Dv), corner = mul(Du, Dv);
    return { ...base, value: ex(mul(u, v)), rule: ex(rule), independent: ex(independent), agree: eq(rule, independent), terms: [ex(t1), ex(t2)],
      increment: { total: ex(total), vDu: ex(vDu), uDv: ex(uDv), corner: ex(corner), holds: eq(total, add(add(vDu, uDv), corner)), u2: ex(u2), v2: ex(v2) } };
  }
  if (isZero(v)) return { ...base, value: null, rule: null, independent: null, agree: null, terms: [], reason: 'v(x) = 0: the quotient u/v is undefined here, and so is its derivative.' };
  const t1 = mul(du, v), t2 = mul(u, dv), rule = div(sub(t1, t2), mul(v, v)), q = div(u, v), independent = div(sub(du, mul(q, dv)), v);
  return { ...base, value: ex(q), rule: ex(rule), independent: ex(independent), agree: eq(rule, independent), terms: [ex(t1), ex(t2), ex(mul(v, v))] };
}
