/**
 * Lesson views for the two-points stage of I.2: the displacement from A to B and its reverse, the distance, the midpoint, and the
 * taxicab distance that is never shorter than the straight one.
 *
 *   SegmentDerived  →  { inspector rows, formulas, verdict, world-space scene, spoken text }
 */
import { rationalForm, rootForm } from '../../math/quantity/exactform';
import { toNumber, type Rational } from '../../math/quantity/rational';
import type { SegmentDerived, SegmentState } from '../../math/coordinates/segment';
import type { InspectorRowData } from '../../ui/Inspector';
import type { Point, WorldWindow } from '../../platform/geometry/viewport';
import { formatApprox } from '../../platform/numeric/format';
import type { ParamSpec } from '../../platform/params';
import type { ValueDescription } from '../../platform/numeric/quantity';
import { FORMULA_FORMAT, aligned } from '../shared/format';
import { baseTex, describeRational, describeRoot, rationalTex, statement } from '../quantities/values';

export const SEGMENT_LIMIT = 7;
export const CANONICAL_SEGMENT: SegmentState = Object.freeze({ ax: -3, ay: 1, bx: 3, by: -3 });
export const SEGMENT_WINDOW: WorldWindow = { xMin: -7.5, xMax: 7.5, yMin: -7.5, yMax: 7.5 };

const spec = (id: string, symbolTex: string, symbolText: string, name: string, value: number): ParamSpec => ({
  id, name, symbolTex, symbolText, domain: { min: -SEGMENT_LIMIT, max: SEGMENT_LIMIT }, default: value, step: 1, maxDecimals: 2, onInvalid: 'reject',
});
export const AX_SPEC = spec('ax', 'x_A', 'xA', 'x-coordinate of A', CANONICAL_SEGMENT.ax);
export const AY_SPEC = spec('ay', 'y_A', 'yA', 'y-coordinate of A', CANONICAL_SEGMENT.ay);
export const BX_SPEC = spec('bx', 'x_B', 'xB', 'x-coordinate of B', CANONICAL_SEGMENT.bx);
export const BY_SPEC = spec('by', 'y_B', 'yB', 'y-coordinate of B', CANONICAL_SEGMENT.by);

export interface SegmentPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: SegmentState }
const preset = (id: string, label: string, aria: string, state: SegmentState): SegmentPreset => Object.freeze({ id, label, aria, state: Object.freeze(state) });
export const SEGMENT_PRESETS: readonly SegmentPreset[] = Object.freeze([
  preset('s-2-1', `(−3, 1) → (3, −3)`, 'from minus 3, 1 to 3, minus 3: distance 2 root 13', { ax: -3, ay: 1, bx: 3, by: -3 }),
  preset('s345', `(1, 2) → (4, 6)`, 'from 1, 2 to 4, 6: the 3-4-5 triangle', { ax: 1, ay: 2, bx: 4, by: 6 }),
  preset('s-h', `(6, −3) → (1, −3)`, 'from 6, minus 3 to 1, minus 3: a horizontal segment, drawn right to left', { ax: 6, ay: -3, bx: 1, by: -3 }),
  preset('s-v', `(4, −5) → (4, 2)`, 'from 4, minus 5 to 4, 2: a vertical segment', { ax: 4, ay: -5, bx: 4, by: 2 }),
  preset('s-diag', `(0, 0) → (1, 1)`, 'from 0, 0 to 1, 1: the diagonal of a unit square', { ax: 0, ay: 0, bx: 1, by: 1 }),
  preset('s-same', `(2, 3) → (2, 3)`, 'from 2, 3 to 2, 3: the same point', { ax: 2, ay: 3, bx: 2, by: 3 }),
]);

// ---------------------------------------------------------------------------------------------- helpers
const pairText = (x: Rational, y: Rational): string => `(${rationalForm(x).text}, ${rationalForm(y).text})`;
const pairTex = (x: Rational, y: Rational): string => `\\left(${rationalTex(x)},\\ ${rationalTex(y)}\\right)`;
const pairSpoken = (x: Rational, y: Rational): string => `${rationalForm(x).spoken} comma ${rationalForm(y).spoken}`;
const pairRow = (x: Rational, y: Rational): ValueDescription => statement(pairText(x, y), pairTex(x, y), pairSpoken(x, y));
const approxText = (d: SegmentDerived): string => (d.distance.kind === 'undefined' ? '' : formatApprox(d.distance.approx, FORMULA_FORMAT).text);

// ---------------------------------------------------------------------------------------------- inspector
export function segmentRows(d: SegmentDerived): InspectorRowData[] {
  return [
    { id: 'a', role: 'ink', symbolTex: 'A', name: 'point A', description: pairRow(d.a.x, d.a.y) },
    { id: 'b', role: 'primary', symbolTex: 'B', name: 'point B', description: pairRow(d.b.x, d.b.y) },
    { id: 'displacement', role: 'derived', symbolTex: 'B-A', name: 'displacement from A to B', description: pairRow(d.dx, d.dy) },
    { id: 'reverse', role: 'derived', symbolTex: 'A-B', name: 'displacement from B to A', description: pairRow(d.rdx, d.rdy), secondary: true },
    { id: 'distance', role: 'x', symbolTex: '\\lvert AB\\rvert', name: 'distance (no direction)', description: describeRoot(d.distance) },
    { id: 'midpoint', role: 'y', symbolTex: 'M', name: 'midpoint', description: pairRow(d.midpoint.x, d.midpoint.y) },
    { id: 'taxicab', role: 'caution', symbolTex: '\\lvert dx\\rvert+\\lvert dy\\rvert', name: 'taxicab distance', description: describeRational(d.taxicab), secondary: true },
  ];
}

// ---------------------------------------------------------------------------------------------- formulas
export function segmentFormulas(d: SegmentDerived): string[] {
  const displacement = aligned([
    `B-A&=\\left(x_B-x_A,\\ y_B-y_A\\right)`,
    `&=\\left(${rationalTex(d.b.x)}-${baseTex(d.a.x)},\\ ${rationalTex(d.b.y)}-${baseTex(d.a.y)}\\right)=${pairTex(d.dx, d.dy)}`,
    `A-B&=${pairTex(d.rdx, d.rdy)}=-(B-A)`,
  ]);
  const distanceLines = [
    `\\lvert AB\\rvert&=\\sqrt{dx^{2}+dy^{2}}=\\sqrt{${baseTex(d.dx)}^{2}+${baseTex(d.dy)}^{2}}`,
    `&=\\sqrt{${rationalTex(d.dxSq)}+${rationalTex(d.dySq)}}=\\sqrt{${rationalTex(d.distSq)}}`,
  ];
  if (d.distance.kind === 'exact') {
    const exact = rootForm(d.distance.root);
    distanceLines.push(`&=${exact.tex}`);
    if (!exact.integer) distanceLines.push(`&\\approx ${formatApprox(d.distance.approx, FORMULA_FORMAT).tex}\\ldots`);
  }
  const midpoint = aligned([
    `M&=\\left(\\tfrac{x_A+x_B}{2},\\ \\tfrac{y_A+y_B}{2}\\right)=${pairTex(d.midpoint.x, d.midpoint.y)}`,
    `\\lvert dx\\rvert+\\lvert dy\\rvert&=${rationalTex(d.taxicab)}\\ ${d.taxicabEqualsDistance ? '=' : '>'}\\ \\lvert AB\\rvert`,
  ]);
  return [displacement, aligned(distanceLines), midpoint];
}

// ---------------------------------------------------------------------------------------------- verdict
export function segmentVerdict(d: SegmentDerived): string {
  const disp = pairText(d.dx, d.dy);
  const back = pairText(d.rdx, d.rdy);
  const taxi = rationalForm(d.taxicab).text;
  switch (d.kind) {
    case 'coincident': return 'A and B are the same point: the displacement is (0, 0), the distance is 0, and the midpoint is the point itself. A zero displacement has no direction to speak of.';
    case 'horizontal': return `A and B are on a horizontal line: dy = 0, so the distance is just |dx| = ${rationalForm(d.taxicab).text}. Walking along the axes costs the same as the straight path, so the taxicab distance ${taxi} equals it. The displacement ${disp} reverses to ${back}.`;
    case 'vertical': return `A and B are on a vertical line: dx = 0, so the distance is just |dy| = ${rationalForm(d.taxicab).text}. Walking along the axes costs the same as the straight path, so the taxicab distance ${taxi} equals it. The displacement ${disp} reverses to ${back}.`;
    case 'oblique': {
      const exact = d.distance.kind === 'exact' ? rootForm(d.distance.root).text : approxText(d);
      const approx = d.distance.kind === 'exact' && !rootForm(d.distance.root).integer ? ` ≈ ${approxText(d)}` : '';
      return `The displacement from A to B is ${disp}; from B to A it is ${back}: reversing the direction flips both signs. The distance ${exact}${approx} is the same either way. The taxicab distance ${taxi} is larger because the path along the axes is not straight (it is equal only when dx or dy is 0).`;
    }
  }
}

/** `data-agree` of the verdict: false only for the degenerate coincident pair. */
export const verdictIsCaution = (d: SegmentDerived): boolean => d.kind === 'coincident';

// ---------------------------------------------------------------------------------------------- scene
export interface SegmentScene {
  readonly a: Point;
  readonly b: Point;
  readonly corner: Point;
  readonly midpoint: Point;
  /** From A along the x direction to (xB, yA): length |dx|; `null` when dx = 0. */
  readonly legX: { readonly from: Point; readonly to: Point } | null;
  /** From (xB, yA) along the y direction to B: length |dy|; `null` when dy = 0. */
  readonly legY: { readonly from: Point; readonly to: Point } | null;
  readonly arrow: { readonly from: Point; readonly to: Point } | null;
  readonly rightAngle: boolean;
}

export function segmentScene(d: SegmentDerived): SegmentScene {
  const a = { x: toNumber(d.a.x), y: toNumber(d.a.y) };
  const b = { x: toNumber(d.b.x), y: toNumber(d.b.y) };
  const corner = { x: b.x, y: a.y };
  return {
    a, b, corner, midpoint: { x: toNumber(d.midpoint.x), y: toNumber(d.midpoint.y) },
    legX: d.dx.num === 0n ? null : { from: a, to: corner },
    legY: d.dy.num === 0n ? null : { from: corner, to: b },
    arrow: d.kind === 'coincident' ? null : { from: a, to: b },
    rightAngle: d.kind === 'oblique',
  };
}

// ---------------------------------------------------------------------------------------------- text alternatives
export function segmentDescription(d: SegmentDerived): string {
  const dist = d.distance.kind === 'exact' ? rootForm(d.distance.root).spoken : 'not available';
  const shape = d.kind === 'coincident' ? 'The two points coincide.' : d.kind === 'horizontal' ? 'The segment is horizontal.' : d.kind === 'vertical' ? 'The segment is vertical.' : 'Dashed legs run horizontally and then vertically between the points and form a right angle at the corner.';
  return `A coordinate plane from minus 7 to 7 on both axes. Point A is at ${pairSpoken(d.a.x, d.a.y)} and point B is at ${pairSpoken(d.b.x, d.b.y)}. The displacement from A to B is ${pairSpoken(d.dx, d.dy)}. ${shape} The distance from A to B is ${dist}. The midpoint is ${pairSpoken(d.midpoint.x, d.midpoint.y)}.`;
}

export function segmentSpoken(d: SegmentDerived): string {
  const dist = d.distance.kind === 'exact' ? rootForm(d.distance.root).spoken : 'not available';
  return `A is ${pairSpoken(d.a.x, d.a.y)}, B is ${pairSpoken(d.b.x, d.b.y)}. Displacement ${pairSpoken(d.dx, d.dy)}. Distance ${dist}.`;
}

export const pointLabel = (name: 'A' | 'B', x: Rational, y: Rational, d: SegmentDerived): string => `Point ${name} at ${pairSpoken(x, y)}. ${segmentSpoken(d)}`;
