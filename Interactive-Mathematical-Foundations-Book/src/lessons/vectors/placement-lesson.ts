/**
 * Lesson views for "a point is a place, a vector is a displacement" (master plan §15.2 item 1; REF-1).
 *
 *   Placement (state)  →  PlacementDerived  →  { world-space scene, inspector rows, formulas, spoken text }
 *
 * The state is flat — `{ tx, ty, vx, vy }` — so `useLesson` can tell when it is canonical. v is HELD in the state, not
 * recomputed from the tip: moving the tail cannot change it, and the invariance is data, not a coincidence of drawing.
 */
import { derivePlacement, type Placement, type PlacementDerived, type Point2 } from '../../math/vector2/placement';
import { toExactForm } from '../../math/vector2/exact';
import { formatGiven } from '../../platform/numeric/format';
import { describeValue, type ValueDescription } from '../../platform/numeric/quantity';
import type { ParamSpec } from '../../platform/params';
import type { Point, WorldWindow } from '../../platform/geometry/viewport';
import { FORMAT, RADIANS, directionValue, exactValue, given, aligned } from '../foundation/vector-lesson';
import type { Inspector } from '../../ui/Inspector';

export type PlacementRow = Parameters<typeof Inspector>[0]['rows'][number];

/**
 * Precision contract: every placement value has at most this many decimal places. `placement.ts` rounds sums and differences
 * to 9 places, which is exact decimal arithmetic for inputs of ≤ 6 places, so Q = P + v and v = Q − P hold exactly.
 * Finer numeric input is rejected with a message (see `ParamSpec.maxDecimals`), never rounded into a contradiction.
 */
export const PLACEMENT_DECIMALS = 6;
export const PLACEMENT_WINDOW: WorldWindow = { xMin: -9, xMax: 9, yMin: -9, yMax: 9 };
/** Tail and displacement components each range over [−4, 4]; the tip then stays within [−8, 8]. */
export const PLACEMENT_LIMIT = 4;
export const TIP_LIMIT = 2 * PLACEMENT_LIMIT;

/** Start with the arrow away from the origin so that "where it starts" is visibly a separate question from "what it is". */
export const CANONICAL_PLACEMENT: Placement = Object.freeze({ tx: -2, ty: -1, vx: 3, vy: 2 });

const param = (id: string, name: string, symbolTex: string, symbolText: string, value: number, limit = PLACEMENT_LIMIT): ParamSpec => ({
  id, name, symbolTex, symbolText, domain: { min: -limit, max: limit }, default: value, step: 1, onInvalid: 'reject', maxDecimals: PLACEMENT_DECIMALS,
});
export const TAIL_X: ParamSpec = param('tx', 'start point x', 'P_x', 'start x', CANONICAL_PLACEMENT.tx);
export const TAIL_Y: ParamSpec = param('ty', 'start point y', 'P_y', 'start y', CANONICAL_PLACEMENT.ty);
export const DISP_X: ParamSpec = param('vx', 'x-component of v', 'x', 'x', CANONICAL_PLACEMENT.vx);
export const DISP_Y: ParamSpec = param('vy', 'y-component of v', 'y', 'y', CANONICAL_PLACEMENT.vy);
/** The tip handle's own range: the tip is a point, and can be anywhere the tail plus a displacement can reach. */
export const TIP_X: ParamSpec = param('qx', 'tip x', 'Q_x', 'tip x', 1, TIP_LIMIT);
export const TIP_Y: ParamSpec = param('qy', 'tip y', 'Q_y', 'tip y', 1, TIP_LIMIT);

export { derivePlacement };

const pointText = (p: Point2): string => `(${formatGiven(p.x).text}, ${formatGiven(p.y).text})`;
const pointSpoken = (p: Point2): string => `${formatGiven(p.x).spoken} comma ${formatGiven(p.y).spoken}`;
const columnTex = (p: Point2): string => `\\begin{bmatrix}${given(p.x)}\\\\${given(p.y)}\\end{bmatrix}`;

const describePoint = (p: Point2, what: string): ValueDescription => ({
  status: 'given',
  lines: [{ relation: '=', text: pointText(p), tex: `\\begin{bmatrix}${formatGiven(p.x).tex}\\\\${formatGiven(p.y).tex}\\end{bmatrix}` }],
  spoken: `${what} at ${pointSpoken(p)}`,
});

export function placementRows(d: PlacementDerived): PlacementRow[] {
  const v = d.vector;
  const vText = `(${formatGiven(v.x).text}, ${formatGiven(v.y).text})`;
  return [
    { id: 'tail', role: 'ink', symbolTex: 'P', name: 'start point (a place)', description: describePoint(d.tail, 'the point') },
    { id: 'tip', role: 'ink', symbolTex: 'Q', name: 'end point (a place)', description: describePoint(d.tip, 'the point') },
    {
      id: 'vector', role: 'primary', symbolTex: '\\mathbf{v}', name: 'displacement (a vector)',
      description: { status: 'given', lines: [{ relation: '=', text: vText, tex: `\\begin{bmatrix}${formatGiven(v.x).tex}\\\\${formatGiven(v.y).tex}\\end{bmatrix}` }], spoken: `the displacement ${formatGiven(v.x).spoken} right and ${formatGiven(v.y).spoken} up` },
    },
    { id: 'magnitude', role: 'primary', symbolTex: '\\norm{\\mathbf{v}}', name: 'length of v', description: describeValue(exactValue(v), FORMAT) },
    { id: 'direction', role: 'derived', symbolTex: '\\theta', name: 'direction of v', description: describeValue(directionValue(v, 'rad'), FORMAT, RADIANS) },
  ];
}

/** Q = P + v, and v = Q − P, written with the current numbers. */
export function placementFormulas(d: PlacementDerived): string[] {
  const v = { x: d.vector.x, y: d.vector.y };
  return [
    aligned([`Q&=P+\\mathbf{v}`, `\\begin{bmatrix}${given(d.tip.x)}\\\\${given(d.tip.y)}\\end{bmatrix}&=${columnTex(d.tail)}+${columnTex(v)}`]),
    aligned([`\\mathbf{v}&=Q-P`, `${columnTex(v)}&=${columnTex(d.tip)}-${columnTex(d.tail)}`]),
  ];
}

export function placementSpoken(d: PlacementDerived): string {
  const exact = d.vector.exactMagnitude ? toExactForm(d.vector.exactMagnitude) : null;
  const length = exact ? `length exactly ${exact.spoken}` : `length ${formatGiven(Number(d.vector.magnitude.toPrecision(4))).spoken}`;
  return `Arrow from the point ${pointSpoken(d.tail)} to the point ${pointSpoken(d.tip)}. Its displacement is ${formatGiven(d.vector.x).spoken} right and ${formatGiven(d.vector.y).spoken} up, ${length}.`;
}

export interface PlacementScene {
  readonly tail: Point;
  readonly tip: Point;
  /** The arrow P → Q; `null` for the zero displacement. */
  readonly arrow: { readonly from: Point; readonly to: Point } | null;
  /** The same displacement drawn from the origin (standard position): a ghost that shows what does NOT change. */
  readonly ghost: { readonly from: Point; readonly to: Point } | null;
  readonly xLeg: { readonly from: Point; readonly to: Point };
  readonly yLeg: { readonly from: Point; readonly to: Point };
}

export function placementScene(d: PlacementDerived): PlacementScene {
  const origin = { x: 0, y: 0 };
  const corner = { x: d.tip.x, y: d.tail.y };
  return {
    tail: d.tail,
    tip: d.tip,
    arrow: d.vector.isZero ? null : { from: d.tail, to: d.tip },
    ghost: d.vector.isZero ? null : { from: origin, to: d.standardTip },
    xLeg: { from: d.tail, to: corner },
    yLeg: { from: corner, to: d.tip },
  };
}

export function placementDescription(d: PlacementDerived): string {
  return `Coordinate plane from −9 to 9 on both axes. ${placementSpoken(d)} A dashed grey copy of the same arrow starts at the origin and ends at (${formatGiven(d.standardTip.x).text}, ${formatGiven(d.standardTip.y).text}): the same displacement drawn from the origin.`;
}
