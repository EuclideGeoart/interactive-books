/**
 * Chain rule (III.6): a two-stage pipeline x → u = g(x) → y = f(u). Each stage is a member of a tiny fixed vocabulary with its value and its
 * derivative stated analytically. When both stages are polynomials everything is exact, and the chain-rule product is checked against the
 * derivative of the exactly COMPOSED polynomial — an independent route to the same number.
 */
import { add, mul, sub, toNumber, type Rational } from '../quantity/rational';
import { compose, derivative, evalPoly, poly, polyTex, polyText, type Poly } from './polynomial';
import { r } from './univariate';

export interface Stage { readonly id: string; readonly text: (v: string) => string; readonly tex: (v: string) => string; readonly poly?: Poly; value(u: number): number; slope(u: number): number }
const polyStage = (id: string, p: Poly): Stage => ({ id, poly: p, text: v => polyText(p, v), tex: v => polyTex(p, v),
  value: u => p.coefficients.reduceRight((acc, c) => acc * u + toNumber(c), 0), slope: u => derivative(p).coefficients.reduceRight((acc, c) => acc * u + toNumber(c), 0) });
export const INNER: Readonly<Record<string, Stage>> = {
  square: polyStage('square', poly(-1, 0, r(1, 2))),
  linear: polyStage('linear', poly(-1, 2)),
  sin: { id: 'sin', text: v => `sin ${v}`, tex: v => `\\sin ${v}`, value: Math.sin, slope: Math.cos },
};
export const OUTER: Readonly<Record<string, Stage>> = {
  cube: polyStage('cube', poly(0, 0, 0, r(1, 4))),
  sin: { id: 'sin', text: v => `sin ${v}`, tex: v => `\\sin ${v}`, value: Math.sin, slope: Math.cos },
  exp: { id: 'exp', text: v => (v === 'u' ? 'eᵘ' : `exp(${v})`), tex: v => `e^{${v}}`, value: Math.exp, slope: Math.exp },
};
type Num = { value: number; exact?: Rational };
const ex = (e: Rational): Num => ({ value: toNumber(e), exact: e });
export interface ChainResult {
  readonly u: Num; readonly y: Num; readonly innerSlope: Num; readonly outerSlope: Num; readonly product: Num;
  /** Derivative of the exactly composed polynomial (only when both stages are polynomials). */
  readonly direct: Num | null;
  readonly agree: boolean | null;
  readonly du: Num; readonly dy: Num; readonly duLinear: Num; readonly dyLinear: Num;
  readonly composed?: Poly;
}
export function chain(g: Stage, f: Stage, x: Rational, dx: Rational): ChainResult {
  if (g.poly && f.poly) {
    const u = evalPoly(g.poly, x), y = evalPoly(f.poly, u), gp = evalPoly(derivative(g.poly), x), fp = evalPoly(derivative(f.poly), u);
    const product = mul(fp, gp), h = compose(f.poly, g.poly), direct = evalPoly(derivative(h), x);
    const u2 = evalPoly(g.poly, add(x, dx)), du = sub(u2, u), dy = sub(evalPoly(f.poly, u2), y), duL = mul(gp, dx), dyL = mul(product, dx);
    return { u: ex(u), y: ex(y), innerSlope: ex(gp), outerSlope: ex(fp), product: ex(product), direct: ex(direct), agree: direct.num * product.den === product.num * direct.den,
      du: ex(du), dy: ex(dy), duLinear: ex(duL), dyLinear: ex(dyL), composed: h };
  }
  const xv = toNumber(x), d = toNumber(dx), u = g.value(xv), y = f.value(u), gp = g.slope(xv), fp = f.slope(u);
  const u2 = g.value(xv + d);
  return { u: { value: u }, y: { value: y }, innerSlope: { value: gp }, outerSlope: { value: fp }, product: { value: fp * gp }, direct: null, agree: null,
    du: { value: u2 - u }, dy: { value: f.value(u2) - y }, duLinear: { value: gp * d }, dyLinear: { value: fp * gp * d } };
}
