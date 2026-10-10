/**
 * A point in the plane and where it sits: its quadrant (or the axis / origin that belongs to NO quadrant), the distance to each axis, and
 * the distance to the origin.
 *
 *   quadrant I   x > 0, y > 0          quadrant II   x < 0, y > 0
 *   quadrant III x < 0, y < 0          quadrant IV   x > 0, y < 0
 *   on the x-axis  y = 0 (x ≠ 0)       on the y-axis  x = 0 (y ≠ 0)      the origin  x = y = 0
 *
 * An axis point is in no quadrant: the quadrants are open regions and the axes are their boundaries. The distance FROM P TO the x-axis is
 * |y| (the length of the perpendicular dropped to the x-axis) and the distance to the y-axis is |x|; the order is the classic swap.
 */
import { abs, add, mul, sign, type Rational } from '../quantity/rational';
import { rootOf, type RootResult } from '../quantity/root';
import { exactCoordinate, type ExactPoint } from './coords';

export type Position =
  | { readonly kind: 'quadrant'; readonly index: 1 | 2 | 3 | 4 }
  | { readonly kind: 'axis-x' }
  | { readonly kind: 'axis-y' }
  | { readonly kind: 'origin' };

export interface PointState {
  readonly x: number;
  readonly y: number;
}

/** Where an exact point sits. Decided by the two signs only. */
export function positionOf(x: Rational, y: Rational): Position {
  const sx = sign(x);
  const sy = sign(y);
  if (sx === 0 && sy === 0) return { kind: 'origin' };
  if (sy === 0) return { kind: 'axis-x' };
  if (sx === 0) return { kind: 'axis-y' };
  if (sx > 0) return sy > 0 ? { kind: 'quadrant', index: 1 } : { kind: 'quadrant', index: 4 };
  return sy > 0 ? { kind: 'quadrant', index: 2 } : { kind: 'quadrant', index: 3 };
}

/** The quadrant number 1…4, or `null` for an axis point and the origin. */
export const quadrantIndex = (p: Position): 1 | 2 | 3 | 4 | null => (p.kind === 'quadrant' ? p.index : null);

export const ROMAN: Record<1 | 2 | 3 | 4, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

export interface PointDerived extends ExactPoint {
  readonly position: Position;
  readonly signX: -1 | 0 | 1;
  readonly signY: -1 | 0 | 1;
  /** |x|: the distance from P to the y-axis. */
  readonly distToYAxis: Rational;
  /** |y|: the distance from P to the x-axis. */
  readonly distToXAxis: Rational;
  readonly xSq: Rational;
  readonly ySq: Rational;
  /** x² + y². */
  readonly distSq: Rational;
  /** |OP| = √(x² + y²), exact radical when it can be. */
  readonly distance: RootResult;
}

export function derivePoint(state: PointState): PointDerived {
  const x = exactCoordinate(state.x, 'x');
  const y = exactCoordinate(state.y, 'y');
  const xSq = mul(x, x);
  const ySq = mul(y, y);
  const distSq = add(xSq, ySq);
  return {
    x, y, position: positionOf(x, y), signX: sign(x), signY: sign(y),
    distToYAxis: abs(x), distToXAxis: abs(y), xSq, ySq, distSq, distance: rootOf(distSq, 2),
  };
}
