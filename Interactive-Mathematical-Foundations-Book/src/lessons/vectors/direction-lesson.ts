/**
 * Lesson views for the direction counterexample: atan(y/x) versus atan2(y, x) (master plan §15.2 item 4; REF-1).
 *
 *   Vector2 (state) → compareDirections → { world-space scene, inspector rows, formulas, verdict, spoken text, work frames }
 *
 * Every number comes from `DirectionComparison` or `Vector2Derived`; the strings below only arrange them.
 */
import { compareDirections, describeLocation, type DirectionComparison } from '../../math/vector2/direction';
import type { Vector2, Vector2Derived } from '../../math/vector2/vector2';
import { formatApprox, formatGiven } from '../../platform/numeric/format';
import { describeValue, type ExactForm, type Value } from '../../platform/numeric/quantity';
import { traceFrom, type TraceFrame } from '../../platform/trace';
import type { Point } from '../../platform/geometry/viewport';
import { FORMAT, FORMULA_FORMAT, RADIANS, ZERO_VECTOR_REASON, aligned, given, workFrames, type WorkState } from '../foundation/vector-lesson';
import type { PlacementRow } from './placement-lesson';

export { compareDirections };

const tex = (n: number): string => formatApprox(n, FORMULA_FORMAT).tex;
const deg = (radians: number): number => (radians * 180) / Math.PI;

// ---------------------------------------------------------------------------------------------- presets
export interface Preset {
  readonly id: string;
  readonly label: string;
  readonly aria: string;
  readonly x: number;
  readonly y: number;
}
/** Quick starting points: one per quadrant, the two cases where the naive formula is wrong on an axis or has no answer, and zero. */
export const DIRECTION_PRESETS: readonly Preset[] = Object.freeze([
  { id: 'q1', label: 'I', aria: 'quadrant I: (3, 2)', x: 3, y: 2 },
  { id: 'q2', label: 'II', aria: 'quadrant II: (−3, 2)', x: -3, y: 2 },
  { id: 'q3', label: 'III', aria: 'quadrant III: (−3, −2)', x: -3, y: -2 },
  { id: 'q4', label: 'IV', aria: 'quadrant IV: (3, −2)', x: 3, y: -2 },
  { id: 'neg-x', label: '−x axis', aria: 'the negative x-axis: (−4, 0)', x: -4, y: 0 },
  { id: 'pos-y', label: '+y axis', aria: 'the positive y-axis: (0, 4)', x: 0, y: 4 },
  { id: 'zero', label: 'zero', aria: 'the zero vector: (0, 0)', x: 0, y: 0 },
].map(p => Object.freeze(p)));

// ---------------------------------------------------------------------------------------------- inspector
const PI_FORM: ExactForm = { text: 'π', tex: '\\pi', spoken: 'pi', integer: false, irrational: true };
const MINUS_PI_FORM: ExactForm = { text: '−π', tex: '-\\pi', spoken: 'minus pi', integer: false, irrational: true };
const ZERO_FORM: ExactForm = { text: '0', tex: '0', spoken: '0', integer: true, irrational: false };

const RATIO_UNDEFINED = 'x = 0, so y/x is a division by zero.';
const NO_NAIVE = 'With no ratio there is no naive angle.';

const ratioValue = (c: DirectionComparison): Value =>
  c.location.kind === 'origin' ? { kind: 'undefined', reason: ZERO_VECTOR_REASON } : c.ratio === null ? { kind: 'undefined', reason: RATIO_UNDEFINED } : { kind: 'numeric', value: c.ratio };
const naiveValue = (c: DirectionComparison): Value =>
  c.location.kind === 'origin' ? { kind: 'undefined', reason: ZERO_VECTOR_REASON } : c.naiveRadians === null ? { kind: 'undefined', reason: NO_NAIVE } : { kind: 'numeric', value: c.naiveRadians };
const atan2Value = (c: DirectionComparison): Value =>
  c.atan2Radians === null ? { kind: 'undefined', reason: ZERO_VECTOR_REASON } : { kind: 'numeric', value: c.atan2Radians };
const correctionValue = (c: DirectionComparison): Value =>
  c.location.kind === 'origin'
    ? { kind: 'undefined', reason: ZERO_VECTOR_REASON }
    : c.halfTurns === null
      ? { kind: 'undefined', reason: 'Nothing to correct: the naive angle does not exist.' }
      : { kind: 'exact', exact: c.halfTurns === 0 ? ZERO_FORM : c.halfTurns === 1 ? PI_FORM : MINUS_PI_FORM, approx: c.halfTurns * Math.PI };

export function directionRows(c: DirectionComparison): PlacementRow[] {
  const x = formatGiven(c.x);
  const y = formatGiven(c.y);
  return [
    { id: 'vector', role: 'primary', symbolTex: '\\mathbf{v}', name: 'vector', description: { status: 'given', lines: [{ relation: '=', text: `(${x.text}, ${y.text})`, tex: `\\begin{bmatrix}${x.tex}\\\\${y.tex}\\end{bmatrix}` }], spoken: `the vector with x equal to ${x.spoken} and y equal to ${y.spoken}` } },
    { id: 'ratio', role: 'caution', symbolTex: '\\dfrac{y}{x}', name: 'the ratio y/x', description: describeValue(ratioValue(c), FORMAT) },
    { id: 'naive', role: 'caution', symbolTex: '\\arctan\\frac{y}{x}', name: 'naive angle, atan(y/x)', description: describeValue(naiveValue(c), FORMAT, RADIANS) },
    { id: 'atan2', role: 'derived', symbolTex: '\\atantwo(y,x)', name: 'true direction, atan2(y, x)', description: describeValue(atan2Value(c), FORMAT, RADIANS) },
    { id: 'correction', role: 'ink', symbolTex: '\\theta-\\arctan\\frac{y}{x}', name: 'what atan was missing', description: describeValue(correctionValue(c), FORMAT) },
  ];
}

// ---------------------------------------------------------------------------------------------- text
/** One plain-language sentence saying what the two formulas do for this vector (also the live status text). */
export function verdictText(c: DirectionComparison): string {
  if (c.location.kind === 'origin') return 'The zero vector has no direction, so neither formula has an answer.';
  if (c.ratio === null) {
    const half = c.y > 0 ? 'π/2 (straight up)' : '−π/2 (straight down)';
    return `x = 0, so y/x is a division by zero and arctan(y/x) has nothing to work with. atan2 does not divide: it reports ${half}.`;
  }
  const where = describeLocation(c.location);
  if (c.halfTurns === 0) return `The vector is in the right half-plane (x > 0, ${where}): arctan(y/x) and atan2 agree.`;
  const turn = c.halfTurns === 1 ? 'adds π' : 'subtracts π';
  return `x < 0 (${where}): the vector points into the LEFT half-plane, but arctan can only answer in the right one, so it is half a turn off. atan2 ${turn} to fix it.`;
}

export function directionSpoken(c: DirectionComparison): string {
  const x = formatGiven(c.x).spoken;
  const y = formatGiven(c.y).spoken;
  const angle = (n: number | null) => (n === null ? 'undefined' : `${formatApprox(n, { digits: 3, scientificAbove: 1e6 }).spoken} radians`);
  return `Vector endpoint. x = ${x}, y = ${y}. ${describeLocation(c.location)}. Naive angle ${angle(c.naiveRadians)}. True direction ${angle(c.atan2Radians)}.`;
}

export function directionDescription(c: DirectionComparison): string {
  const base = 'Coordinate plane from −7 to 7 on both axes. A dashed line through the origin carries the vector v and its opposite −v.';
  const ratioNote = c.ratio === null ? ' The vector is vertical: it has a valid direction (straight up or down), but no ratio y/x is defined, because x = 0.' : ' Where x is not 0, v and −v share the same ratio y/x.';
  if (c.location.kind === 'origin') return `${base} The vector is the zero vector at the origin: it has no direction.`;
  const naive = c.naiveRadians === null ? 'The ratio is undefined, so there is no naive arrow.' : c.halfTurns === 0 ? 'The naive angle gives the same direction.' : 'A dashed caution-coloured arrow shows where the naive angle points: the opposite way.';
  return `${base}${ratioNote} The vector (${formatGiven(c.x).text}, ${formatGiven(c.y).text}) is in ${describeLocation(c.location)}. ${naive}`;
}

// ---------------------------------------------------------------------------------------------- formulas
/** Two aligned blocks: the naive formula with numbers, and atan2 with the correction. */
export function directionFormulas(c: DirectionComparison): string[] {
  const y = given(c.y);
  const x = given(c.x);
  if (c.location.kind === 'origin') {
    return [aligned([`\\arctan\\frac{y}{x}&=\\arctan\\frac{0}{0}`, '&\\text{undefined}']), aligned([`\\theta&=\\atantwo(0,0)`, '&\\text{undefined: the zero vector has no direction}'])];
  }
  if (c.ratio === null) {
    return [
      aligned([`\\arctan\\frac{y}{x}&=\\arctan\\frac{${y}}{${x}}`, '&\\text{undefined: division by zero}']),
      aligned([`\\theta&=\\atantwo(${y},${x})`, `&=${c.y > 0 ? '' : '-'}\\frac{\\pi}{2}\\approx ${tex(c.atan2Radians as number)}\\ \\mathrm{rad}`]),
    ];
  }
  const naive = aligned([`\\arctan\\frac{y}{x}&=\\arctan\\frac{${y}}{${x}}`, `&\\approx\\arctan(${tex(c.ratio)})`, `&\\approx ${tex(c.naiveRadians as number)}\\ \\mathrm{rad}`]);
  const lines = [`\\theta&=\\atantwo(${y},${x})`];
  if (c.halfTurns === 0) lines.push(`&=\\arctan\\frac{y}{x}\\approx ${tex(c.atan2Radians as number)}\\ \\mathrm{rad}`);
  else {
    const sign = c.halfTurns === 1 ? '+' : '-';
    const naiveText = tex(c.naiveRadians as number);
    lines.push(`&=\\arctan\\frac{y}{x}${sign}\\pi`, `&\\approx ${naiveText}${sign}${tex(Math.PI)}`, `&\\approx ${tex(c.atan2Radians as number)}\\ \\mathrm{rad}`);
  }
  return [naive, aligned(lines)];
}

// ---------------------------------------------------------------------------------------------- scene
export interface DirectionScene {
  /** The vector arrow; `null` for the zero vector. */
  readonly arrow: { readonly from: Point; readonly to: Point } | null;
  readonly handle: Point;
  /** Where the naive angle points, drawn with the vector's own length. Only when it DIFFERS from the true direction. */
  readonly naiveArrow: { readonly from: Point; readonly to: Point } | null;
  /** The line through the origin whose points all share y/x with v: it contains v and −v. */
  readonly sameRatioLine: { readonly from: Point; readonly to: Point } | null;
  /** −v, the other vector on that line. */
  readonly mirror: Point | null;
  /** The angle atan2 measures, from the +x axis. */
  readonly arc: { readonly from: number; readonly to: number } | null;
}

const LINE_REACH = 20;

export function directionScene(c: DirectionComparison, d: Vector2Derived): DirectionScene {
  const origin = { x: 0, y: 0 };
  const tip = { x: c.x, y: c.y };
  if (c.location.kind === 'origin') return { arrow: null, handle: tip, naiveArrow: null, sameRatioLine: null, mirror: null, arc: null };
  const ux = c.x / d.magnitude;
  const uy = c.y / d.magnitude;
  const naiveArrow = c.naiveRadians !== null && c.halfTurns !== 0 ? { from: origin, to: { x: d.magnitude * Math.cos(c.naiveRadians), y: d.magnitude * Math.sin(c.naiveRadians) } } : null;
  return {
    arrow: { from: origin, to: tip },
    handle: tip,
    naiveArrow,
    sameRatioLine: { from: { x: -ux * LINE_REACH, y: -uy * LINE_REACH }, to: { x: ux * LINE_REACH, y: uy * LINE_REACH } },
    mirror: c.mirror,
    arc: c.atan2Radians === null || c.atan2Radians === 0 ? null : { from: 0, to: c.atan2Radians },
  };
}

// ---------------------------------------------------------------------------------------------- worked examples
export interface WorkedExample {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
}
export const WORKED_EXAMPLES: readonly WorkedExample[] = Object.freeze([
  { id: 'w1', label: '(3, 4)', x: 3, y: 4 },
  { id: 'w2', label: '(−3, 2)', x: -3, y: 2 },
  { id: 'w3', label: '(−1, −1)', x: -1, y: -1 },
  { id: 'w4', label: '(0, −5)', x: 0, y: -5 },
].map(e => Object.freeze(e)));

/** The direction half of a worked example: where is it, what does y/x give, what does arctan answer, what is missing, the result. */
export function directionFrames(c: DirectionComparison): readonly TraceFrame<WorkState>[] {
  const x = given(c.x);
  const y = given(c.y);
  const frames: { state: WorkState }[] = [];
  frames.push({ state: { tex: `x=${x},\\ y=${y}\\quad\\Rightarrow\\quad\\text{${describeLocation(c.location)}}`, caption: 'Locate the vector: which side of each axis is its tip on?' } });
  if (c.ratio === null) {
    frames.push({ state: { tex: `\\frac{y}{x}=\\frac{${y}}{${x}}\\quad\\text{undefined}`, caption: 'A vertical vector has no slope: dividing by x = 0 is not allowed, so arctan(y/x) has nothing to work with.' } });
    frames.push({ state: { tex: `\\theta=\\atantwo(${y},${x})=${c.y > 0 ? '' : '-'}\\frac{\\pi}{2}\\approx ${tex(c.atan2Radians as number)}\\ \\mathrm{rad}`, caption: 'atan2 never divides, so it still works: straight up is π/2, straight down is −π/2.' } });
    return traceFrom<WorkState>(frames);
  }
  frames.push({ state: { tex: `\\frac{y}{x}=\\frac{${y}}{${x}}\\approx ${tex(c.ratio)}`, caption: 'Rise over run: the slope of the line through the origin and the tip. The mirror vector −v has exactly the same slope.' } });
  frames.push({ state: { tex: `\\arctan\\frac{y}{x}\\approx\\arctan(${tex(c.ratio)})\\approx ${tex(c.naiveRadians as number)}\\ \\mathrm{rad}`, caption: 'arctan only ever answers between −π/2 and π/2: it can only point into the right half-plane.' } });
  const correction =
    c.halfTurns === 0
      ? { tex: `x>0:\\quad\\text{no correction}\\qquad \\theta=\\arctan\\frac{y}{x}`, caption: 'The tip is in the right half-plane, which is exactly where arctan answers, so nothing is missing.' }
      : { tex: `x<0:\\quad\\theta=\\arctan\\frac{y}{x}${c.halfTurns === 1 ? '+' : '-'}\\pi\\approx ${tex(c.naiveRadians as number)}${c.halfTurns === 1 ? '+' : '-'}${tex(Math.PI)}`, caption: `The tip is in the left half-plane: half a turn away from where arctan put it. ${c.halfTurns === 1 ? 'Above the x-axis, so add π.' : 'Below the x-axis, so subtract π.'}` };
  frames.push({ state: correction });
  const degrees = deg(c.atan2Radians as number);
  frames.push({ state: { tex: `\\theta=\\atantwo(${y},${x})\\approx ${tex(c.atan2Radians as number)}\\ \\mathrm{rad}\\approx ${tex(degrees)}^{\\circ}`, caption: 'The result: the angle from the positive x-axis, counter-clockwise.' } });
  return traceFrom<WorkState>(frames);
}

/** A complete worked example: ‖v‖ first (the foundation frames), then the direction. Deterministic in (x, y). */
export function workedFrames(v: Vector2, d: Vector2Derived): readonly TraceFrame<WorkState>[] {
  const magnitude = workFrames(d).map(f => ({ state: f.state }));
  const direction = directionFrames(compareDirections(v)).map(f => ({ state: f.state }));
  return traceFrom<WorkState>([...magnitude, ...direction]);
}
