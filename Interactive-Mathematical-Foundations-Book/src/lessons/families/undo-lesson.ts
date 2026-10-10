/**
 * Lesson views for the "undoing" stage: a function, its inverse, the mirror line y = x, and what the computer does with the round trip.
 *
 *   RoundTripState → roundTrip → { curves, points, inspector rows, formula chain, verdict, spoken text }
 *
 * The mathematics (which identity holds where, and WHY a round trip fails) is `roundTrip`'s; this module only arranges it.
 */
import type { Point } from '../../platform/geometry/viewport';
import type { Polyline } from '../../platform/geometry/curve';
import type { ParamSpec } from '../../platform/params';
import { describeValue } from '../../platform/numeric/quantity';
import type { InspectorRowData } from '../../ui/Inspector';
import {
  CANONICAL_ROUNDTRIP, ROUNDTRIP_DECIMALS, ROUNDTRIP_LIMIT, roundTrip, undoCurves, reflectPolylines,
  type RoundTrip, type RoundTripFamily, type RoundTripOrder, type RoundTripState, type StepValue, type UndoCurves,
} from '../../math/families/roundtrip';
import { ratTex, ratText, describeStep, num, FORMAT } from './view';
import { SPOKEN_FORMAT, aligned, given } from '../shared/format';
import { toNumber } from '../../math/families/rational';

export { CANONICAL_ROUNDTRIP, roundTrip };

export const UNDO_WINDOW = Object.freeze({ xMin: -5, xMax: 5, yMin: -5, yMax: 5 });
export const UNDO_X_PARAM: ParamSpec = { id: 'x', name: 'input', symbolTex: 'x', symbolText: 'x', domain: { min: -ROUNDTRIP_LIMIT, max: ROUNDTRIP_LIMIT }, default: 1.5, step: 0.5, maxDecimals: ROUNDTRIP_DECIMALS, onInvalid: 'reject' };
/** The on-plane handle covers only what the plane shows. */
export const UNDO_HANDLE_PARAM: ParamSpec = { ...UNDO_X_PARAM, domain: { min: -5, max: 5 } };
export const UNDO_AXIS_Y: ParamSpec = { id: 'axis-y', name: 'height of the handle', symbolTex: 'y', symbolText: 'y', domain: { min: 0, max: 0 }, default: 0, step: 0.5, onInvalid: 'reject' };

export const FAMILY_OPTIONS = [{ id: 'exp', label: 'eˣ, ln' }, { id: 'square', label: 'x², √' }] as const satisfies readonly { id: RoundTripFamily; label: string }[];
export const ORDER_OPTIONS = [{ id: 'forward-first', label: 'forward first' }, { id: 'inverse-first', label: 'inverse first' }] as const satisfies readonly { id: RoundTripOrder; label: string }[];

export interface UndoPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: RoundTripState }
export const UNDO_PRESETS: readonly UndoPreset[] = Object.freeze(([
  { id: 'exp-fine', label: 'ln(e^1.5)', aria: 'ln of e to the 1.5: an ordinary round trip', state: { family: 'exp', order: 'forward-first', x: 1.5 } },
  { id: 'exp-negative', label: 'ln(e^−3)', aria: 'ln of e to the minus 3: negative inputs are fine', state: { family: 'exp', order: 'forward-first', x: -3 } },
  { id: 'ln-negative', label: 'e^(ln −2)', aria: 'e to the ln of minus 2: the logarithm does not exist', state: { family: 'exp', order: 'inverse-first', x: -2 } },
  { id: 'exp-overflow', label: 'ln(e^800)', aria: 'ln of e to the 800: the exponential overflows', state: { family: 'exp', order: 'forward-first', x: 800 } },
  { id: 'exp-underflow', label: 'ln(e^−800)', aria: 'ln of e to the minus 800: the exponential underflows to zero', state: { family: 'exp', order: 'forward-first', x: -800 } },
  { id: 'sq-sign', label: '√((−2)²)', aria: 'square root of minus 2 squared: the sign is lost', state: { family: 'square', order: 'forward-first', x: -2 } },
  { id: 'sq-fine', label: '(√4)²', aria: 'square root of 4, then squared', state: { family: 'square', order: 'inverse-first', x: 4 } },
] as UndoPreset[]).map(p => Object.freeze({ ...p, state: Object.freeze(p.state) })));

// ---------------------------------------------------------------------------------------------- scene
export interface UndoScene {
  readonly curves: UndoCurves;
  /** The reflection of the forward curve in y = x (equal to the inverse's graph, plus the other branch for x²). */
  readonly reflected: readonly Polyline[];
}
/** Depends on the family only. */
export function undoScene(family: RoundTripFamily): UndoScene {
  const curves = undoCurves(family, UNDO_WINDOW);
  return { curves, reflected: reflectPolylines(curves.forward) };
}

export interface UndoPoints {
  /** (x, first(x)): on the graph of the FIRST function the learner applies. */
  readonly onFirst: Point | null;
  /** (first(x), x): its mirror image across y = x. */
  readonly reflected: Point | null;
  /** The point the second function actually returns to, when it differs from the mirror image (√ of x² returns |x|). */
  readonly returned: Point | null;
}
const inWindow = (p: Point): boolean => p.x >= UNDO_WINDOW.xMin && p.x <= UNDO_WINDOW.xMax && p.y >= UNDO_WINDOW.yMin && p.y <= UNDO_WINDOW.yMax;
export function undoPoints(rt: RoundTrip): UndoPoints {
  const m = rt.mirror;
  const keep = (p: Point | undefined): Point | null => (p && inWindow(p) ? p : null);
  const returned = rt.cause === 'sign-lost' && m ? keep({ x: m.reflected.x, y: -m.reflected.y }) : null;
  return { onFirst: keep(m?.onFirst), reflected: keep(m?.reflected), returned };
}
/** Where the direct labels of the curves sit (a fixed, comfortable spot on each curve; presentation only). */
export function undoLabels(family: RoundTripFamily): { forward: Point; inverse: Point; other: Point | null; forwardText: string; inverseText: string; otherText: string } {
  const t = family === 'exp' ? 1.4 : 2.1;
  const f = family === 'exp' ? Math.exp(t) : t * t;
  return {
    forward: { x: t, y: f },
    inverse: { x: f, y: t },
    other: family === 'square' ? { x: f, y: -t } : null,
    forwardText: family === 'exp' ? 'eˣ' : 'x²',
    inverseText: family === 'exp' ? 'ln x' : '√x',
    otherText: '−√x',
  };
}

/** Is the whole mirror pair outside the plane (so the stage must say so)? */
export const offPlane = (rt: RoundTrip): boolean => rt.mirror !== null && !(inWindow(rt.mirror.onFirst) && inWindow(rt.mirror.reflected));

// ---------------------------------------------------------------------------------------------- rows
export function undoRows(rt: RoundTrip): InspectorRowData[] {
  const [s1, s2] = rt.steps;
  const rows: InspectorRowData[] = [
    { id: 'x', role: 'ink', symbolTex: 'x', name: 'input', description: describeValue({ kind: 'given', value: rt.state.x }, FORMAT) },
    { id: 'step-1', role: 'primary', symbolTex: '1', name: `step 1: ${s1.name} (as a double)`, description: describeStep(s1.output) },
    { id: 'step-2', role: 'derived', symbolTex: '2', name: `step 2: ${s2.name} (as a double)`, description: describeStep(s2.output) },
  ];
  const errorDescription = rt.error === null
    ? describeValue({ kind: 'undefined', reason: 'The round trip did not produce a number to compare with x.' }, FORMAT)
    : rt.error === 0
      ? describeValue({ kind: 'exact', exact: { text: '0', tex: '0', spoken: '0', integer: true, irrational: false }, approx: 0 }, FORMAT)
      : describeValue({ kind: 'numeric', value: rt.error }, { digits: 3, scientificAbove: 1e6 });
  rows.push({ id: 'error', role: 'caution', symbolTex: '\\left|\\,\\text{result}-x\\,\\right|', name: 'distance from x', description: errorDescription });
  return rows;
}

// ---------------------------------------------------------------------------------------------- text
export function undoVerdict(rt: RoundTrip): { text: string; tone: 'true' | 'false' | 'none' } {
  const outcome =
    rt.returned === true ? 'The round trip returned x.' : rt.returned === false ? 'The round trip did NOT return x.' : 'The round trip could not be carried out.';
  const math = rt.mathReturns ? 'The identity holds at this x.' : 'The identity does not hold at this x.';
  return { text: `${rt.claim.text} ${math} ${outcome} ${rt.why}`, tone: rt.returned === true ? 'true' : rt.returned === false ? 'false' : 'none' };
}

export function undoSpoken(rt: RoundTrip): string {
  const step = (s: RoundTrip['steps'][number]) => `${s.name}: ${describeStep(s.output, SPOKEN_FORMAT).spoken.replace(/[.\s]+$/, '')}`;
  const result = rt.returned === true ? 'x came back' : rt.returned === false ? 'x did not come back' : 'the round trip could not be carried out';
  return `x equals ${ratText(rt.x).replace('−', 'minus ')}. Step one, ${step(rt.steps[0])}. Step two, ${step(rt.steps[1])}. ${result}.`;
}

export function undoDescription(rt: RoundTrip, family: RoundTripFamily): string {
  const pair = family === 'exp' ? 'the exponential e to the x, the logarithm ln x' : 'the parabola x squared, the square root of x';
  const pts = undoPoints(rt);
  const shown = pts.onFirst && pts.reflected
    ? `The point (${num(pts.onFirst.x)}, ${num(pts.onFirst.y)}) lies on the graph of the first function and its mirror image (${num(pts.reflected.x)}, ${num(pts.reflected.y)}) lies across the dashed line y = x.`
    : rt.mirror ? 'The pair of points for this input lies outside the plane, which shows only −5 to 5.' : 'There is no point to show: the first step is undefined or has no finite value.';
  return `Coordinate plane from −5 to 5 on both axes with ${pair}, and the dashed line y = x: each graph is the mirror image of the other across that line. ${shown}`;
}

// ---------------------------------------------------------------------------------------------- formulas
type Kind = 'exp' | 'ln' | 'square' | 'sqrt';
function kindsOf(state: RoundTripState): [Kind, Kind] {
  const [fwd, inv]: [Kind, Kind] = state.family === 'exp' ? ['exp', 'ln'] : ['square', 'sqrt'];
  return state.order === 'forward-first' ? [fwd, inv] : [inv, fwd];
}
const applyTex = (kind: Kind, arg: string): string => {
  switch (kind) {
    case 'exp': return `e^{${arg}}`;
    case 'ln': return `\\ln\\left(${arg}\\right)`;
    case 'square': return `\\left(${arg}\\right)^{2}`;
    case 'sqrt': return `\\sqrt{${arg}}`;
  }
};

interface StepTex { readonly rel: '=' | '\\approx'; readonly tex: string }
function stepTex(v: StepValue): StepTex | null {
  switch (v.kind) {
    case 'exact': return { rel: '=', tex: ratTex(v.value) };
    case 'numeric': return { rel: '\\approx', tex: num(v.value) };
    case 'overflow': return { rel: '=', tex: '\\infty' };
    case 'underflow': return { rel: '=', tex: '0' };
    case 'undefined':
    case 'lost': return null;
  }
}

/** The round trip as an aligned chain: the symbolic composition, then the numbers one step at a time. */
export function undoFormula(rt: RoundTrip): string {
  const [k1, k2] = kindsOf(rt.state);
  const xTex = given(rt.state.x);
  const lines: string[] = [`${applyTex(k2, applyTex(k1, 'x'))}&=${applyTex(k2, applyTex(k1, xTex))}`];
  const [s1, s2] = rt.steps;
  const t1 = stepTex(s1.output);
  if (!t1) {
    lines.push(`&=${applyTex(k2, '\\text{undefined}')}`, '&\\text{the first step has no value}');
    return aligned(lines);
  }
  lines.push(`&${t1.rel} ${applyTex(k2, t1.tex)}`);
  const t2 = stepTex(s2.output);
  lines.push(t2 ? `&${t2.rel} ${t2.tex}` : '&\\text{no value}');
  return aligned(lines);
}

/** The claim as a display equation, for the live formula panel. */
export const undoClaimTex = (rt: RoundTrip): string => rt.claim.tex;

export const undoMirrorNote = (rt: RoundTrip): string | null =>
  rt.mirror === null ? null : `The point (${num(rt.mirror.onFirst.x)}, ${num(rt.mirror.onFirst.y)}) and its mirror image (${num(rt.mirror.reflected.x)}, ${num(rt.mirror.reflected.y)}) swap their coordinates.`;

export const xOf = (rt: RoundTrip): number => toNumber(rt.x);
