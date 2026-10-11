/**
 * Difference quotients (III.3, III.4, III.14). The secant slope is an honest finite computation with h ≠ 0; h = 0 is REPORTED as a division by
 * zero, never replaced by the derivative. The derivative, when it exists, comes separately from the function's analytic description.
 *
 * Exact path: when f and the inputs are rational, [f(x+h) − f(x)]/h is an exact rational.
 * Binary64 path (III.14): forward, backward and centered quotients in IEEE double, with a documented error budget
 *   truncation  ≈ |f''|·h/2 (one-sided)   or |f'''|·h²/6 (centered),
 *   rounding    ≈ ε·(|f(x+h)| + |f(x)|)/h (one-sided) or ε·(|f(x+h)| + |f(x−h)|)/(2h) (centered)  (ε = 2⁻⁵², one ulp of 1),
 * plus the representation error of x+h itself. The budget is an explanation and an upper-envelope estimate, not a guarantee for arbitrary f.
 */
import { add, div, eq, isZero, sub, toNumber, type Rational } from '../quantity/rational';
import { shift, subPoly, type Poly } from './polynomial';
import type { PointValue, Univariate } from './univariate';

export type Secant =
  | { readonly kind: 'value'; readonly h: Rational; readonly fx: PointValue & { kind: 'value' }; readonly fxh: PointValue & { kind: 'value' }; readonly rise: number; readonly slope: number; readonly exactSlope?: Rational; readonly exactRise?: Rational }
  | { readonly kind: 'undefined'; readonly h: Rational; readonly reason: string };

export function secant(f: Univariate, x: Rational, h: Rational): Secant {
  if (isZero(h)) return { kind: 'undefined', h, reason: 'h = 0 would divide by zero: the secant needs two distinct points. The tangent slope is a LIMIT as h → 0, not the value at h = 0.' };
  const fx = f.at(x), fxh = f.at(add(x, h));
  if (fx.kind === 'undefined') return { kind: 'undefined', h, reason: `f(x) is undefined: ${fx.reason}` };
  if (fxh.kind === 'undefined') return { kind: 'undefined', h, reason: `f(x + h) is undefined: ${fxh.reason}` };
  if (fx.exact && fxh.exact) {
    const exactRise = sub(fxh.exact, fx.exact), exactSlope = div(exactRise, h);
    return { kind: 'value', h, fx, fxh, rise: toNumber(exactRise), slope: toNumber(exactSlope), exactRise, exactSlope };
  }
  const rise = fxh.value - fx.value;
  return { kind: 'value', h, fx, fxh, rise, slope: rise / toNumber(h) };
}

/** h, h/2, h/4, … (exact), stopping before h becomes zero — the semantic h → 0 sequence. */
export function halvings(h: Rational, count: number): Rational[] {
  const out: Rational[] = [];
  let k = h;
  for (let i = 0; i < count; i++) { out.push(k); k = div(k, { num: 2n, den: 1n }); }
  return out;
}

/**
 * For a polynomial, the difference quotient is itself a polynomial in h: m(h) = [p(x+h) − p(x)]/h = p'(x) + p''(x)h/2 + …
 * Returned exactly; its constant term is the derivative, which is why the secant slope approaches it.
 */
export function quotientPolynomial(p: Poly, x: Rational): Poly {
  const s = shift(p, x); // p(x+h) in powers of h; s₀ = p(x)
  const numerator = subPoly(s, { coefficients: s.coefficients.slice(0, 1) });
  return { coefficients: numerator.coefficients.slice(1) };
}
export const sameRational = (a: Rational | undefined, b: Rational | undefined) => !!a && !!b && eq(a, b);

// --------------------------------------------------------------------------------------------- binary64 finite differences
export const EPS = Number.EPSILON; // 2⁻⁵²
export type Scheme = 'forward' | 'backward' | 'centered';
export interface FiniteDifference {
  readonly scheme: Scheme;
  readonly h: number;
  /** The machine number actually used as x+h (or x−h): (x+h)−x may differ from h. */
  readonly effectiveH: number;
  readonly estimate: number;
  readonly error: number;
  readonly truncationBudget: number;
  readonly roundingBudget: number;
}
/**
 * One binary64 finite difference with its error and budget. `ref` is an independently known derivative (analytic, e.g. cos x for sin x);
 * `m2`/`m3` bound |f''| and |f'''| near x (the caller states them analytically).
 */
export function finiteDifference(f: (x: number) => number, x: number, h: number, scheme: Scheme, ref: number, m2: number, m3: number): FiniteDifference {
  const xp = x + h, xm = x - h;
  // Using the representable step (xp − x) is the classical remedy; we deliberately DIVIDE BY h, as naive code does, and report the
  // representation error separately in the budget so the learner sees it.
  let estimate: number, effectiveH: number, trunc: number, round: number;
  if (scheme === 'forward') { effectiveH = xp - x; estimate = (f(xp) - f(x)) / h; trunc = m2 * h / 2; round = EPS * (Math.abs(f(xp)) + Math.abs(f(x))) / h; }
  else if (scheme === 'backward') { effectiveH = x - xm; estimate = (f(x) - f(xm)) / h; trunc = m2 * h / 2; round = EPS * (Math.abs(f(x)) + Math.abs(f(xm))) / h; }
  else { effectiveH = (xp - xm) / 2; estimate = (f(xp) - f(xm)) / (2 * h); trunc = m3 * h * h / 6; round = EPS * (Math.abs(f(xp)) + Math.abs(f(xm))) / (2 * h); }
  // Representation of the step: |effectiveH − h| / h relative error multiplies the derivative.
  round += Math.abs(ref) * Math.abs(effectiveH - h) / h;
  return { scheme, h, effectiveH, estimate, error: Math.abs(estimate - ref), truncationBudget: trunc, roundingBudget: round };
}
/** Total documented budget with a factor 4 safety margin for libm rounding of f itself (each f value may be off by about one ulp). */
export const budget = (d: FiniteDifference) => 4 * (d.truncationBudget + d.roundingBudget) + 4 * EPS * Math.abs(d.estimate);
/** The step minimising the budget's leading terms: h* ≈ √(4ε|f|/|f''|) (one-sided) or ∛(3ε|f|/|f'''|) (centered). */
export function optimalStep(scheme: Scheme, fAbs: number, m2: number, m3: number): number {
  return scheme === 'centered' ? Math.cbrt(3 * EPS * Math.max(fAbs, 1e-300) / Math.max(m3, 1e-300)) : Math.sqrt(4 * EPS * Math.max(fAbs, 1e-300) / Math.max(m2, 1e-300));
}
