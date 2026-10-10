/**
 * Points versus displacement vectors (master plan §3.2, §15.2 item 1; REF-1).
 *
 * A POINT says where something is; a displacement VECTOR says how to get from one point to another. An arrow drawn
 * from a tail point P to a tip point Q represents the vector v = Q − P — and the same v can be drawn from ANY tail.
 * Moving the tail changes the arrow's position and its tip, but not v: components, magnitude and direction are
 * properties of the displacement, not of where the arrow starts.
 *
 * The state is FLAT (tail and displacement components) so a lesson can hold it in one immutable object:
 *     state { tx, ty, vx, vy }  →  derivePlacement  →  tail, tip, vector (deriveVector2), measured v = Q − P
 * Nothing here knows about pixels.
 *
 * Arithmetic policy: tails and components are decimals the learner chose (a drag grid has ≤ 6 decimals). Sums and
 * differences are therefore rounded to 9 decimals — which is EXACT decimal arithmetic for such inputs and removes
 * binary noise such as 2.3 + 0.1 = 2.3999999999999995. −0 is canonicalised to +0.
 *
 * Precision CONTRACT: that exactness holds only for inputs with ≤ `MAX_INPUT_DECIMALS` (6) decimal places. The UI rejects finer
 * numeric input (`ParamSpec.maxDecimals`) and `isRepresentable` states the contract for the model; `derivePlacement` of a
 * representable state satisfies Q = P + v and v = Q − P EXACTLY (no value is ever rounded into a contradiction).
 */
import { deriveVector2, type Vector2, type Vector2Derived } from './vector2';

export interface Point2 {
  readonly x: number;
  readonly y: number;
}

export interface Placement {
  /** Tail P (where the arrow starts). */
  readonly tx: number;
  readonly ty: number;
  /** Displacement v (how far right, how far up). */
  readonly vx: number;
  readonly vy: number;
}

export interface PlacementDerived {
  readonly tail: Point2;
  /** Q = P + v. */
  readonly tip: Point2;
  /** Everything about v: components, magnitude, direction. Independent of the tail by construction. */
  readonly vector: Vector2Derived;
  /** v recomputed from the two points, Q − P — equal to `vector` (this is the point/vector relationship, as data). */
  readonly measured: Vector2;
  /** The tip of the same arrow drawn from the origin ("standard position"): it IS v, read as a point. */
  readonly standardTip: Point2;
}

const DECIMALS = 9;
export const MAX_INPUT_DECIMALS = 6;

/** True when every component has at most `MAX_INPUT_DECIMALS` decimal places, i.e. when the 9-decimal arithmetic is exact. */
export function isRepresentable(p: Placement): boolean {
  return [p.tx, p.ty, p.vx, p.vy].every(n => Number.isFinite(n) && Number(n.toFixed(MAX_INPUT_DECIMALS)) === n);
}

const round = (n: number): number => Number(n.toFixed(DECIMALS)) + 0;
const add = (a: number, b: number): number => round(a + b);
const sub = (a: number, b: number): number => round(a - b);

export function derivePlacement(p: Placement): PlacementDerived {
  const vector = deriveVector2({ x: p.vx, y: p.vy });
  const tail = { x: round(p.tx), y: round(p.ty) };
  const tip = { x: add(p.tx, vector.x), y: add(p.ty, vector.y) };
  return { tail, tip, vector, measured: displacementBetween(tail, tip), standardTip: { x: vector.x, y: vector.y } };
}

/** The displacement from `from` to `to`: Q − P. */
export function displacementBetween(from: Point2, to: Point2): Vector2 {
  return { x: sub(to.x, from.x), y: sub(to.y, from.y) };
}

/** Move the whole arrow (tail and tip together): v is untouched. */
export function withTail(p: Placement, tail: Point2): Placement {
  return { tx: tail.x, ty: tail.y, vx: p.vx, vy: p.vy };
}

/** Drag the tip to Q while the tail stays put: v becomes Q − P (clamped to `limit` per component, if given). */
export function withTip(p: Placement, tip: Point2, limit?: number): Placement {
  const v = displacementBetween({ x: p.tx, y: p.ty }, tip);
  const clamp = (n: number) => (limit === undefined ? n : Math.max(-limit, Math.min(limit, n)));
  return { tx: p.tx, ty: p.ty, vx: clamp(v.x), vy: clamp(v.y) };
}
