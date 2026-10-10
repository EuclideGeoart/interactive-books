/**
 * Direction: `atan(y/x)` versus the quadrant-aware `atan2(y, x)` (master plan §3.4, §15.2 item 4; REF-1).
 *
 * The classroom shortcut θ = arctan(y/x) forgets signs: y/x is the same number for v = (x, y) and for −v = (−x, −y),
 * and arctan only ever returns angles in (−π/2, π/2), i.e. pointing into the right half-plane. This module is the
 * pure, testable statement of exactly what is lost and how `atan2` recovers it.
 *
 * Policies (each has a unit test and an oracle fixture, `fixtures/vector2-direction.fixtures.json`):
 *  - x = 0: the RATIO y/x is undefined (division by zero), so the naive formula has no answer. JavaScript would
 *    quietly produce ±Infinity (and 0/0 = NaN) and `Math.atan(±Infinity) = ±π/2`, which happens to be right on the
 *    y-axis — but only by accident, and the formula itself is undefined there. We report `null`, never an accident.
 *  - The correction `atan2 − atan` is an EXACT element of {0, +π, −π}, decided from the signs of x and y (the
 *    quadrant), never by subtracting two floating-point angles.
 *  - −0 never escapes: the ratio and the angles are canonicalised to +0 (so 0/−3 is 0, not −0).
 *  - The zero vector has no direction at all: every angle field is `null`.
 *  - Components must be finite (anything else throws, as in `deriveVector2`).
 *
 * Conventions as everywhere: +x right, +y up, angles in radians; atan2 lives in (−π, π].
 */

export type Quadrant = 'I' | 'II' | 'III' | 'IV';
export type Axis = '+x' | '−x' | '+y' | '−y';
export type DirectionLocation =
  | { readonly kind: 'quadrant'; readonly quadrant: Quadrant }
  | { readonly kind: 'axis'; readonly axis: Axis }
  | { readonly kind: 'origin' };

/** How `atan2(y, x)` differs from `atan(y/x)`, in whole half-turns: 0 or ±1 (an exact multiple of π). */
export type HalfTurns = -1 | 0 | 1;

export interface DirectionComparison {
  readonly x: number;
  readonly y: number;
  readonly location: DirectionLocation;
  /** y/x; `null` when x = 0 (division by zero). May be ±Infinity only for finite inputs whose quotient overflows. */
  readonly ratio: number | null;
  /** atan(y/x) in (−π/2, π/2); `null` when the ratio is undefined. */
  readonly naiveRadians: number | null;
  /** atan2(y, x) in (−π, π]; `null` for the zero vector. */
  readonly atan2Radians: number | null;
  /** atan2 = atan + halfTurns·π; `null` when the naive angle is undefined (x = 0). */
  readonly halfTurns: HalfTurns | null;
  /** Whether the naive formula already gives the true direction (exactly when x > 0); `null` when it gives nothing. */
  readonly naiveIsCorrect: boolean | null;
  /** −v: the other vector on the same line through the origin, with the same ratio and so the same naive angle. */
  readonly mirror: { readonly x: number; readonly y: number };
}

const clean = (n: number): number => n + 0; // −0 → +0

export function locate(x: number, y: number): DirectionLocation {
  if (x === 0 && y === 0) return { kind: 'origin' };
  if (y === 0) return { kind: 'axis', axis: x > 0 ? '+x' : '−x' };
  if (x === 0) return { kind: 'axis', axis: y > 0 ? '+y' : '−y' };
  if (x > 0) return { kind: 'quadrant', quadrant: y > 0 ? 'I' : 'IV' };
  return { kind: 'quadrant', quadrant: y > 0 ? 'II' : 'III' };
}

export function compareDirections(v: { readonly x: number; readonly y: number }): DirectionComparison {
  if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) throw new RangeError('Vector2 components must be finite numbers');
  const x = clean(v.x);
  const y = clean(v.y);
  const location = locate(x, y);
  const mirror = { x: clean(-x), y: clean(-y) };
  const atan2Radians = location.kind === 'origin' ? null : Math.atan2(y, x);
  if (x === 0) {
    return { x, y, location, ratio: null, naiveRadians: null, atan2Radians, halfTurns: null, naiveIsCorrect: null, mirror };
  }
  const ratio = clean(y / x);
  const naiveRadians = clean(Math.atan(ratio));
  // Decided from the quadrant, never from float subtraction. x < 0: y ≥ 0 → +π, y < 0 → −π.
  const halfTurns: HalfTurns = x > 0 ? 0 : y >= 0 ? 1 : -1;
  return { x, y, location, ratio, naiveRadians, atan2Radians, halfTurns, naiveIsCorrect: halfTurns === 0, mirror };
}

/** Human-readable name of where a vector lies: "quadrant II", "the negative x-axis", "the origin". */
export function describeLocation(location: DirectionLocation): string {
  switch (location.kind) {
    case 'origin': return 'the origin';
    case 'quadrant': return `quadrant ${location.quadrant}`;
    case 'axis': return `the ${location.axis.startsWith('+') ? 'positive' : 'negative'} ${location.axis.slice(1)}-axis`;
  }
}
