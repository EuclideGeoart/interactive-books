/**
 * Lesson views for the hero of I.2: a point P in the plane, which quadrant it is in (or why it is in none), how far it is from each axis,
 * and how far it is from the origin.
 *
 *   PointDerived  →  { inspector rows, formulas, verdict, world-space scene, spoken text }
 *
 * The mathematics (signs, quadrants, |x| and |y|, the exact distance to the origin) lives in `math/coordinates/point.ts`; every function
 * here takes what that model derived and only chooses how to show it.
 */
import { rationalForm, rootForm } from '../../math/quantity/exactform';
import { toNumber } from '../../math/quantity/rational';
import { ROMAN, quadrantIndex, type PointDerived, type PointState, type Position } from '../../math/coordinates/point';
import type { InspectorRowData } from '../../ui/Inspector';
import type { Point, WorldWindow } from '../../platform/geometry/viewport';
import { formatApprox } from '../../platform/numeric/format';
import type { ParamSpec } from '../../platform/params';
import { FORMULA_FORMAT, aligned } from '../shared/format';
import { baseTex, describeGiven, describeRational, describeRoot, rationalTex, statement } from '../quantities/values';

export const POINT_LIMIT = 7;
export const CANONICAL_POINT: PointState = Object.freeze({ x: -3, y: 2 });
export const POINT_WINDOW: WorldWindow = { xMin: -7.5, xMax: 7.5, yMin: -7.5, yMax: 7.5 };

const spec = (id: 'x' | 'y', value: number): ParamSpec => ({
  id, name: `${id}-coordinate`, symbolTex: id, symbolText: id, domain: { min: -POINT_LIMIT, max: POINT_LIMIT }, default: value, step: 1, maxDecimals: 2, onInvalid: 'reject',
});
export const X_SPEC: ParamSpec = spec('x', CANONICAL_POINT.x);
export const Y_SPEC: ParamSpec = spec('y', CANONICAL_POINT.y);

export interface PointPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: PointState }
const preset = (id: string, x: number, y: number, aria: string): PointPreset => Object.freeze({ id, label: `(${fmt(x)}, ${fmt(y)})`, aria, state: Object.freeze({ x, y }) });
const fmt = (n: number): string => String(n).replace('-', '−');
export const POINT_PRESETS: readonly PointPreset[] = Object.freeze([
  preset('p-3-2', -3, 2, 'minus 3, 2: quadrant II'),
  preset('p3-4', 3, 4, '3, 4: the 3-4-5 point'),
  preset('p-4-3', -4, -3, 'minus 4, minus 3: quadrant III'),
  preset('p2-5', 2, -5, '2, minus 5: quadrant IV'),
  preset('p0-4', 0, -4, '0, minus 4: on the y-axis'),
  preset('p5-0', 5, 0, '5, 0: on the x-axis'),
  preset('p0-0', 0, 0, '0, 0: the origin'),
]);

const where = (p: Position): string => {
  switch (p.kind) {
    case 'quadrant': return `quadrant ${ROMAN[p.index]}`;
    case 'axis-x': return 'on the x-axis';
    case 'axis-y': return 'on the y-axis';
    case 'origin': return 'at the origin';
  }
};

/** Which two quadrants an axis half-line separates (for the sentence that explains why an axis point is in neither). */
function borders(d: PointDerived): string {
  if (d.position.kind === 'axis-x') return d.signX > 0 ? 'I and IV' : 'II and III';
  if (d.position.kind === 'axis-y') return d.signY > 0 ? 'I and II' : 'III and IV';
  return 'all four quadrants';
}

// ---------------------------------------------------------------------------------------------- inspector
export function pointRows(d: PointDerived, state: PointState): InspectorRowData[] {
  const q = quadrantIndex(d.position);
  const quadrant = q !== null
    ? statement(ROMAN[q], `\\text{${ROMAN[q]}}`, `quadrant ${q}`)
    : statement(`none (${where(d.position)})`, `\\text{none}`, `no quadrant: ${where(d.position)}`);
  return [
    { id: 'x', role: 'x', symbolTex: 'x', name: 'x-coordinate (signed)', description: describeGiven(state.x) },
    { id: 'y', role: 'y', symbolTex: 'y', name: 'y-coordinate (signed)', description: describeGiven(state.y) },
    { id: 'quadrant', role: 'primary', symbolTex: '\\mathrm{Q}', name: 'quadrant', description: quadrant },
    { id: 'dist-y-axis', role: 'x', symbolTex: '\\lvert x\\rvert', name: 'distance to the y-axis', description: describeRational(d.distToYAxis) },
    { id: 'dist-x-axis', role: 'y', symbolTex: '\\lvert y\\rvert', name: 'distance to the x-axis', description: describeRational(d.distToXAxis) },
    { id: 'origin', role: 'derived', symbolTex: '\\lvert OP\\rvert', name: 'distance to the origin', description: describeRoot(d.distance) },
  ];
}

// ---------------------------------------------------------------------------------------------- formulas
function signsTex(d: PointDerived): string {
  const cmpTex = (s: -1 | 0 | 1, name: string) => `${name}${s > 0 ? '>' : s < 0 ? '<' : '='}0`;
  return `${cmpTex(d.signX, 'x')},\\ ${cmpTex(d.signY, 'y')}`;
}

export function pointFormulas(d: PointDerived): string[] {
  const q = quadrantIndex(d.position);
  const verdict = q !== null ? `\\text{quadrant ${ROMAN[q]}}` : `\\text{no quadrant}`;
  const where_ = aligned([`P&=(x,\\,y)=\\left(${rationalTex(d.x)},\\ ${rationalTex(d.y)}\\right)`, `&${signsTex(d)}\\ \\Rightarrow\\ ${verdict}`]);
  const lines = [
    `\\lvert x\\rvert&=${rationalTex(d.distToYAxis)},\\qquad \\lvert y\\rvert=${rationalTex(d.distToXAxis)}`,
    `\\lvert OP\\rvert&=\\sqrt{x^{2}+y^{2}}=\\sqrt{${baseTex(d.x)}^{2}+${baseTex(d.y)}^{2}}`,
    `&=\\sqrt{${rationalTex(d.xSq)}+${rationalTex(d.ySq)}}=\\sqrt{${rationalTex(d.distSq)}}`,
  ];
  if (d.distance.kind === 'exact') {
    const exact = rootForm(d.distance.root);
    lines.push(`&=${exact.tex}`);
    if (!exact.integer) lines.push(`&\\approx ${formatApprox(d.distance.approx, FORMULA_FORMAT).tex}\\ldots`);
  } else if (d.distance.kind === 'numeric') {
    lines.push(`&\\approx ${formatApprox(d.distance.approx, FORMULA_FORMAT).tex}`);
  }
  return [where_, aligned(lines)];
}

// ---------------------------------------------------------------------------------------------- verdict
export function pointVerdict(d: PointDerived): string {
  const x = rationalForm(d.x).text;
  const y = rationalForm(d.y).text;
  const ax = rationalForm(d.distToYAxis).text;
  const ay = rationalForm(d.distToXAxis).text;
  switch (d.position.kind) {
    case 'origin': return 'The origin is on both axes at once, so it is in no quadrant, and its distance to each axis is 0.';
    case 'axis-x': return `(${x}, 0) is on the x-axis: y = 0. An axis is the border between two quadrants (${borders(d)}), so the point belongs to neither. Its distance to the x-axis is 0 and to the y-axis is ${ax}.`;
    case 'axis-y': return `(0, ${y}) is on the y-axis: x = 0. An axis is the border between two quadrants (${borders(d)}), so the point belongs to neither. Its distance to the y-axis is 0 and to the x-axis is ${ay}.`;
    case 'quadrant': return `(${x}, ${y}) is in quadrant ${ROMAN[d.position.index]}: x ${d.signX > 0 ? '>' : '<'} 0 and y ${d.signY > 0 ? '>' : '<'} 0. The distance to the x-axis is |y| = ${ay} and to the y-axis is |x| = ${ax}: the coordinate you read along one axis is the distance to the OTHER axis.`;
  }
}

/** `data-agree` of the verdict: false whenever the point is on an axis (the "no quadrant" caution). */
export const verdictIsCaution = (d: PointDerived): boolean => d.position.kind !== 'quadrant';

// ---------------------------------------------------------------------------------------------- scene (world coordinates)
export interface PointScene {
  readonly p: Point;
  /** The rectangle of the quadrant that contains P (within the window); `null` for an axis point or the origin. */
  readonly quadrant: readonly [Point, Point, Point, Point] | null;
  /** From P to the x-axis: vertical, length |y|. */
  readonly toXAxis: { readonly from: Point; readonly to: Point } | null;
  /** From P to the y-axis: horizontal, length |x|. */
  readonly toYAxis: { readonly from: Point; readonly to: Point } | null;
  readonly radius: { readonly from: Point; readonly to: Point } | null;
  readonly labels: ReadonlyArray<{ readonly index: 1 | 2 | 3 | 4; readonly at: Point }>;
}

const EDGE = POINT_WINDOW.xMax;
const QUADRANT_LABEL_AT = 6.2;
const QUADRANT_SIGNS: Record<1 | 2 | 3 | 4, readonly [number, number]> = { 1: [1, 1], 2: [-1, 1], 3: [-1, -1], 4: [1, -1] };

export function pointScene(d: PointDerived): PointScene {
  const p = { x: toNumber(d.x), y: toNumber(d.y) };
  const q = quadrantIndex(d.position);
  const quadrant: PointScene['quadrant'] = q === null ? null : (() => {
    const [sx, sy] = QUADRANT_SIGNS[q];
    return [{ x: 0, y: 0 }, { x: sx * EDGE, y: 0 }, { x: sx * EDGE, y: sy * EDGE }, { x: 0, y: sy * EDGE }] as const;
  })();
  return {
    p, quadrant,
    toXAxis: d.signY === 0 ? null : { from: p, to: { x: p.x, y: 0 } },
    toYAxis: d.signX === 0 ? null : { from: p, to: { x: 0, y: p.y } },
    radius: d.signX === 0 && d.signY === 0 ? null : { from: { x: 0, y: 0 }, to: p },
    labels: ([1, 2, 3, 4] as const).map(index => ({ index, at: { x: QUADRANT_SIGNS[index][0] * QUADRANT_LABEL_AT, y: QUADRANT_SIGNS[index][1] * QUADRANT_LABEL_AT } })),
  };
}

// ---------------------------------------------------------------------------------------------- text alternatives
/** The distance to the origin, said aloud (never undefined for real coordinates; the other branches keep the type honest). */
function distanceSpoken(d: PointDerived): string {
  if (d.distance.kind === 'exact') return rootForm(d.distance.root).spoken;
  return d.distance.kind === 'numeric' ? `about ${formatApprox(d.distance.approx, FORMULA_FORMAT).text}` : 'not defined';
}

export function pointDescription(d: PointDerived): string {
  const root = distanceSpoken(d);
  const legs = d.signX === 0 && d.signY === 0 ? 'The point is the origin, where the axes cross.' : 'Dashed segments run from the point straight to each axis: the vertical one has length |y| and ends on the x-axis, the horizontal one has length |x| and ends on the y-axis.';
  return `A coordinate plane from minus 7 to 7 on both axes. The point P is at ${rationalForm(d.x).spoken} comma ${rationalForm(d.y).spoken}, ${where(d.position)}${d.position.kind === 'quadrant' ? ' (highlighted)' : ''}. ${legs} The distance from P to the origin is ${root}.`;
}

export function pointSpoken(d: PointDerived): string {
  const root = distanceSpoken(d);
  return `P is at ${rationalForm(d.x).spoken} comma ${rationalForm(d.y).spoken}, ${where(d.position)}. Distance to the x-axis ${rationalForm(d.distToXAxis).spoken}, to the y-axis ${rationalForm(d.distToYAxis).spoken}, to the origin ${root}.`;
}

export const pointLabel = (d: PointDerived): string => `Point P at x = ${rationalForm(d.x).spoken}, y = ${rationalForm(d.y).spoken}, ${where(d.position)}.`;
