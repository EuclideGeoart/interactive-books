/**
 * The exactness contract of I.2. A coordinate the learner chooses (a dragged handle, a typed number) is a double with at most `DECIMALS`
 * decimal places; this module turns it into the exact rational it stands for. Every derived quantity is then computed with BigInt
 * rationals (`../quantity/rational`), so "is this point on the axis?", "are these two distances equal?" and "is this distance a whole
 * number?" are decided by exact comparison, never by a tolerance. A value with finer detail is REJECTED (a RangeError), not rounded.
 *
 * Derived values (a difference, a midpoint, a squared distance) are never passed back through this guard: a midpoint of two 2-decimal
 * numbers can have 3 decimals and is still exact.
 */
import { fromDecimal, type Rational } from '../quantity/rational';

export const DECIMALS = 2;

/** The exact rational for a learner-chosen coordinate; throws `RangeError` when it is not finite or has more than `DECIMALS` decimals. */
export function exactCoordinate(value: number, name = 'coordinate'): Rational {
  const r = fromDecimal(value, DECIMALS);
  if (!r) throw new RangeError(`${name} = ${value} is not a finite number with at most ${DECIMALS} decimal places`);
  return r;
}

/** Does the double pass the guard? (The UI uses this to decide whether to accept an entry.) */
export const isCoordinate = (value: number): boolean => fromDecimal(value, DECIMALS) !== null;

export interface ExactPoint {
  readonly x: Rational;
  readonly y: Rational;
}
