/**
 * The division fallacy of I.4: from `x(x − c) = m(x − c)` it is tempting to divide both sides by `x − c` and conclude `x = m`.
 * That step is allowed only where x − c ≠ 0, so it silently discards the case x = c, where both sides are 0.
 *
 *   x(x − c) = m(x − c)   ⇔   (x − c)(x − m) = 0   ⇔   x = c  or  x = m          (a product is 0 exactly when a factor is 0)
 *
 * c and m are integers in [−6, 6]. When m = c the equation is (x − c)² = 0 and the one root c is not "lost" as a value, because dividing
 * gives x = m = c; the model reports `lost: null` there.
 */
import { cmp, eq, int, mul, sub, type Rational } from '../quantity/rational';

export interface FallacyState {
  readonly c: number;
  readonly m: number;
}
export const FALLACY_LIMIT = 6;

export interface FallacyDerived {
  readonly c: Rational;
  readonly m: Rational;
  /** The distinct solutions, ascending. */
  readonly solutions: readonly Rational[];
  /** What dividing both sides by (x − c) concludes: the single value m. */
  readonly afterDividing: Rational;
  /** The solution the division loses (c), or null when m = c so that nothing is lost. */
  readonly lost: Rational | null;
  /** Both sides evaluated at x = c: they are equal (both 0), which is why c IS a solution. */
  readonly atC: { readonly left: Rational; readonly right: Rational };
}

const check = (n: number, name: string): Rational => {
  if (!Number.isInteger(n) || Math.abs(n) > FALLACY_LIMIT) throw new RangeError(`${name} must be a whole number from −${FALLACY_LIMIT} to ${FALLACY_LIMIT}`);
  return int(n);
};

export function deriveFallacy(state: FallacyState): FallacyDerived {
  const c = check(state.c, 'c');
  const m = check(state.m, 'm');
  const same = eq(c, m);
  const solutions = same ? [c] : cmp(c, m) < 0 ? [c, m] : [m, c];
  return { c, m, solutions, afterDividing: m, lost: same ? null : c, atC: { left: mul(c, sub(c, c)), right: mul(m, sub(c, c)) } };
}

/** Is x a solution of x(x − c) = m(x − c)? (A direct evaluation, independent of the factored form above.) */
export function isFallacySolution(state: FallacyState, x: Rational): boolean {
  const c = int(state.c);
  const m = int(state.m);
  return eq(mul(x, sub(x, c)), mul(m, sub(x, c)));
}
