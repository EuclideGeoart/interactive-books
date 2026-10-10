/**
 * The gradient of f(theta) = theta_1^2 + 3 theta_2^2 (I.9, a preview of Part III: the notation only, no calculus is taught here).
 * The exact gradient is (2 theta_1, 6 theta_2): a vector of the SAME SHAPE as theta. A finite-difference estimate computed with doubles is a
 * genuinely rounded number and is shown with "≈"; its error is the sum of a truncation error (about h times a constant) and a rounding error
 * that GROWS as h shrinks, so there is a best step and a worst one.
 */
import { add, mul, q, toNumber, type Q } from './rational';

export const STEP_EXPONENTS: readonly number[] = Object.freeze([1, 3, 6, 9, 13]);
/** The doubles 1e-1, 1e-3, 1e-6, 1e-9, 1e-13 written as literals so that every language parses exactly the same numbers. */
export const STEP_VALUES: Readonly<Record<number, number>> = Object.freeze({ 1: 1e-1, 3: 1e-3, 6: 1e-6, 9: 1e-9, 13: 1e-13 });
export const THETA_MIN = -4;
export const THETA_MAX = 4;

export interface GradientState {
  readonly t1: number;
  readonly t2: number;
  /** The step is 10^(-e) with e one of STEP_EXPONENTS. */
  readonly e: number;
}

export interface GradientDerived {
  readonly theta: readonly [Q, Q];
  readonly f: Q;
  readonly grad: readonly [Q, Q];
  readonly stationary: boolean;
  readonly h: number;
  /** The forward differences (f(theta + h e_j) - f(theta)) / h computed in double arithmetic. */
  readonly estimate: readonly [number, number];
  /** estimate - exact (as doubles). */
  readonly error: readonly [number, number];
  /** The gradient and theta both have this shape: `(2,)` in NumPy, a 2 x 1 column in the notation. */
  readonly shapeTuple: string;
}

/** The objective evaluated in double arithmetic, in a fixed order of operations: (a*a) + ((3*b)*b). */
export const fDouble = (a: number, b: number): number => a * a + 3 * b * b;

/** theta entries are decimals of at most two places: the exact rational of the number typed. */
export const decimalToQ = (v: number): Q => {
  const scaled = Math.round(v * 100);
  if (Math.abs(scaled / 100 - v) > 1e-9) throw new RangeError('At most two decimal places');
  return q(scaled, 100);
};

export function deriveGradient(s: GradientState): GradientDerived {
  if (!STEP_EXPONENTS.includes(s.e)) throw new RangeError('The step exponent must be one of 1, 3, 6, 9, 13');
  if (s.t1 < THETA_MIN || s.t1 > THETA_MAX || s.t2 < THETA_MIN || s.t2 > THETA_MAX) throw new RangeError(`theta must lie in ${THETA_MIN} … ${THETA_MAX}`);
  const t1 = decimalToQ(s.t1);
  const t2 = decimalToQ(s.t2);
  const f = add(mul(t1, t1), mul(q(3), mul(t2, t2)));
  const grad: readonly [Q, Q] = [mul(q(2), t1), mul(q(6), t2)];
  const h = STEP_VALUES[s.e]!;
  const a = toNumber(t1);
  const b = toNumber(t2);
  const f0 = fDouble(a, b);
  const estimate: readonly [number, number] = [(fDouble(a + h, b) - f0) / h, (fDouble(a, b + h) - f0) / h];
  const error: readonly [number, number] = [estimate[0] - toNumber(grad[0]), estimate[1] - toNumber(grad[1])];
  return { theta: [t1, t2], f, grad, stationary: grad[0].num === 0n && grad[1].num === 0n, h, estimate, error, shapeTuple: '(2,)' };
}
