/**
 * Two points on a number line. The line has one coordinate; the signed difference b − a says which way and how far, and the distance
 * |b − a| forgets the direction.
 *
 *   b − a = −(a − b)          |b − a| = |a − b|          |b − a| ≤ |a| + |b|, with equality exactly when ab ≤ 0
 *
 * The last line is the reason "add the two distances to zero" works for points on opposite sides of 0 and fails for points on the same side.
 */
import { abs, add, cmp, half, mul, neg, sign, sub, type Rational } from '../quantity/rational';
import { exactCoordinate } from './coords';

export interface LineState {
  readonly a: number;
  readonly b: number;
}

export type Order = 'a-left' | 'same' | 'a-right';

export interface LineDerived {
  readonly a: Rational;
  readonly b: Rational;
  /** b − a: positive when b lies to the right of a. */
  readonly forward: Rational;
  /** a − b: exactly −(b − a). */
  readonly backward: Rational;
  /** |b − a| = |a − b|. */
  readonly distance: Rational;
  readonly midpoint: Rational;
  readonly order: Order;
  /** |a| + |b|, the distance travelled going a → 0 → b. */
  readonly viaZero: Rational;
  /** |a| + |b| = |b − a|  ⇔  a and b are not strictly on the same side of 0. */
  readonly viaZeroEqualsDistance: boolean;
  /** Both strictly on the same side of 0 (ab > 0): going through 0 would be a detour. */
  readonly sameSide: boolean;
}

export function deriveLine(state: LineState): LineDerived {
  const a = exactCoordinate(state.a, 'a');
  const b = exactCoordinate(state.b, 'b');
  const forward = sub(b, a);
  const viaZero = add(abs(a), abs(b));
  const c = cmp(a, b);
  const order: Order = c < 0 ? 'a-left' : c > 0 ? 'a-right' : 'same';
  return {
    a, b, forward, backward: neg(forward), distance: abs(forward), midpoint: half(add(a, b)), order,
    viaZero, viaZeroEqualsDistance: cmp(viaZero, abs(forward)) === 0, sameSide: sign(mul(a, b)) > 0,
  };
}
