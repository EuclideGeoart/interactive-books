/**
 * 2D vector model — foundation level (Layer C, master plan §6.3, §15.6).
 *
 * Mathematical state  →  derived quantities  →  { geometry, inspector, formulas, spoken text }.
 * Every view reads `Vector2Derived`; none of them recomputes a magnitude or an angle.
 *
 * Conventions: +x right, +y up; the vector is the column [x, y]ᵀ; angles in radians in (−π, π].
 *
 * Numerical policy (each point has a unit test):
 *  - Components must be finite; anything else throws (an undefined state, not a silent NaN).
 *  - −0 is canonicalised to +0 on input, so the branch cut of atan2 on the negative x-axis is stable
 *    (direction of (−1, ±0) is +π).
 *  - "Zero vector" is decided FROM THE COMPONENTS, never from `magnitude === 0`. A vector such as
 *    (1e-200, 1e-200) has x² and y² that underflow to 0, but its magnitude (via hypot) and direction are fine.
 *  - Magnitude uses `Math.hypot`, which rescales internally; `magnitudeSquared` is kept separately because
 *    it is the quantity the textbook formula displays — and it CAN overflow/underflow where `magnitude` does not.
 *  - The direction of the zero vector is `null`: undefined, not 0.
 *
 * Scope note: REF-1 (M3) will own and extend this module. M2 provides what the foundation demo and the
 * oracle harness need, nothing more.
 */
import { exactMagnitude, type ExactRadical } from './exact';

export interface Vector2 {
  readonly x: number;
  readonly y: number;
}

export interface Vector2Derived {
  readonly x: number;
  readonly y: number;
  readonly xSquared: number;
  readonly ySquared: number;
  /** x² + y² as the textbook formula computes it (may over/underflow for extreme components). */
  readonly magnitudeSquared: number;
  /** ‖v‖ via `Math.hypot` (range-safe). */
  readonly magnitude: number;
  /** True exactly when both components are 0. */
  readonly isZero: boolean;
  /** atan2(y, x) in radians, in (−π, π]; `null` for the zero vector. */
  readonly directionRadians: number | null;
  /** The same direction in degrees — a secondary display only. */
  readonly directionDegrees: number | null;
  /** a·√b with b square-free, only for integer components; `null` means "numeric only". */
  readonly exactMagnitude: ExactRadical | null;
}

export function deriveVector2(v: Vector2): Vector2Derived {
  if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) throw new RangeError('Vector2 components must be finite numbers');
  const x = v.x + 0; // −0 → +0
  const y = v.y + 0;
  const isZero = x === 0 && y === 0;
  const directionRadians = isZero ? null : Math.atan2(y, x);
  return {
    x,
    y,
    xSquared: x * x,
    ySquared: y * y,
    magnitudeSquared: x * x + y * y,
    magnitude: Math.hypot(x, y),
    isZero,
    directionRadians,
    directionDegrees: directionRadians === null ? null : (directionRadians * 180) / Math.PI,
    exactMagnitude: exactMagnitude(x, y),
  };
}
