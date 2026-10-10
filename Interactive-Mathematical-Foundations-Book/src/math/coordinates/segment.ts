/**
 * Two points A and B in the plane: the displacement from A to B, its reverse, the Euclidean distance, the midpoint, and the taxicab distance.
 *
 *   displacement   B − A = (dx, dy)         reverse   A − B = −(B − A)         (direction matters)
 *   distance       |AB| = √(dx² + dy²)      the same for A → B and B → A       (direction does not)
 *   midpoint       ((ax+bx)/2, (ay+by)/2)
 *   taxicab        |dx| + |dy|  ≥  |AB|, with equality exactly when dx = 0 or dy = 0
 *
 * The inequality is exact: taxicab² = dx² + dy² + 2|dx||dy| = |AB|² + 2|dx||dy|, and the extra term vanishes only when a leg is zero.
 */
import { abs, add, half, int, mul, neg, sign, sub, type Rational } from '../quantity/rational';
import { rootOf, type RootResult } from '../quantity/root';
import { exactCoordinate, type ExactPoint } from './coords';

export interface SegmentState {
  readonly ax: number;
  readonly ay: number;
  readonly bx: number;
  readonly by: number;
}

export type SegmentKind = 'coincident' | 'horizontal' | 'vertical' | 'oblique';

export interface SegmentDerived {
  readonly a: ExactPoint;
  readonly b: ExactPoint;
  /** B − A */
  readonly dx: Rational;
  readonly dy: Rational;
  /** A − B = −(B − A) */
  readonly rdx: Rational;
  readonly rdy: Rational;
  readonly dxSq: Rational;
  readonly dySq: Rational;
  /** dx² + dy² */
  readonly distSq: Rational;
  readonly distance: RootResult;
  /** True when |AB| is a rational number (a Pythagorean-style distance: 5, 13/5, …). */
  readonly distanceIsRational: boolean;
  readonly midpoint: ExactPoint;
  readonly taxicab: Rational;
  /** 2|dx||dy| — how much the square of the taxicab distance exceeds the square of the distance. */
  readonly crossTerm: Rational;
  readonly kind: SegmentKind;
  /** The taxicab distance equals the Euclidean distance (axis-aligned or zero length). */
  readonly taxicabEqualsDistance: boolean;
}

export function deriveSegment(state: SegmentState): SegmentDerived {
  const a: ExactPoint = { x: exactCoordinate(state.ax, 'ax'), y: exactCoordinate(state.ay, 'ay') };
  const b: ExactPoint = { x: exactCoordinate(state.bx, 'bx'), y: exactCoordinate(state.by, 'by') };
  const dx = sub(b.x, a.x);
  const dy = sub(b.y, a.y);
  const dxSq = mul(dx, dx);
  const dySq = mul(dy, dy);
  const distSq = add(dxSq, dySq);
  const distance = rootOf(distSq, 2);
  const zx = sign(dx) === 0;
  const zy = sign(dy) === 0;
  const kind: SegmentKind = zx && zy ? 'coincident' : zy ? 'horizontal' : zx ? 'vertical' : 'oblique';
  return {
    a, b, dx, dy, rdx: neg(dx), rdy: neg(dy), dxSq, dySq, distSq, distance,
    distanceIsRational: distance.kind === 'exact' && distance.root.b === 1n,
    midpoint: { x: half(add(a.x, b.x)), y: half(add(a.y, b.y)) },
    taxicab: add(abs(dx), abs(dy)), crossTerm: mul(mul(abs(dx), abs(dy)), int(2)), kind, taxicabEqualsDistance: zx || zy,
  };
}
