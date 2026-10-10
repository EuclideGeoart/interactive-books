/**
 * Lesson views for the hero of I.1: a number, its square, and its square root, in both directions.
 *
 *   SquareDerived  →  { inspector rows, formulas, verdict, world-space scene, spoken text }
 *
 * The mathematics (exact squares and roots, the sign that squaring forgets, the number of solutions) lives in `math/quantity/square.ts`;
 * every function here takes what that model derived and only chooses how to show it.
 */
import { LENGTH, DIMENSIONLESS } from '../../math/quantity/dimension';
import { rationalForm, rootForm } from '../../math/quantity/exactform';
import { toNumber } from '../../math/quantity/rational';
import type { AreaDerived, SquareDerived, SquareState } from '../../math/quantity/square';
import type { InspectorRowData } from '../../ui/Inspector';
import type { Point, WorldWindow } from '../../platform/geometry/viewport';
import { formatApprox } from '../../platform/numeric/format';
import type { ValueDescription } from '../../platform/numeric/quantity';
import type { ParamSpec } from '../../platform/params';
import { FORMULA_FORMAT, SPOKEN_FORMAT, aligned, given } from '../shared/format';
import { describeGiven, describeRational, describeRoot, rationalTex, statement, unitOf } from './values';

export const SIDE_LIMIT = 6;
export const AREA_MIN = -4;
export const AREA_MAX = 36;
export const CANONICAL_SQUARE: SquareState = Object.freeze({ mode: 'side', side: 3, area: 2, unit: 'm' });

/** x ∈ [−7.5, 7.5]; y is shifted up so the square (which stands on the x-axis) has room above and its labels have room below. */
export const SQUARE_WINDOW: WorldWindow = { xMin: -7.5, xMax: 7.5, yMin: -4.5, yMax: 10.5 };

export const SIDE_SPEC: ParamSpec = {
  id: 'side', name: 'side q', symbolTex: 'q', symbolText: 'q', domain: { min: -SIDE_LIMIT, max: SIDE_LIMIT }, default: 3, step: 0.5, maxDecimals: 2, onInvalid: 'reject',
};
export const AREA_SPEC: ParamSpec = {
  id: 'area', name: 'area A', symbolTex: 'A', symbolText: 'A', domain: { min: AREA_MIN, max: AREA_MAX }, default: 2, step: 1, maxDecimals: 2, onInvalid: 'reject',
};
/** The invisible y-coordinate of the side handle: it only moves along the x-axis. */
export const HANDLE_Y_SPEC: ParamSpec = { id: 'y', name: 'height', symbolTex: 'y', symbolText: 'y', domain: { min: 0, max: 0 }, default: 0, step: 1, onInvalid: 'reject' };

export interface SquarePreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: Partial<SquareState> & { readonly mode: SquareState['mode'] } }
const preset = (id: string, label: string, aria: string, state: SquarePreset['state']): SquarePreset => Object.freeze({ id, label, aria, state: Object.freeze(state) });
export const SQUARE_PRESETS: readonly SquarePreset[] = Object.freeze([
  preset('s3', '3', 'side 3', { mode: 'side', side: 3 }),
  preset('sm3', '−3', 'side minus 3', { mode: 'side', side: -3 }),
  preset('s1.5', '1.5', 'side 1.5', { mode: 'side', side: 1.5 }),
  preset('s0.1', '0.1', 'side 0.1', { mode: 'side', side: 0.1 }),
  preset('s0', '0', 'side 0', { mode: 'side', side: 0 }),
  preset('a9', '9', 'area 9', { mode: 'area', area: 9 }),
  preset('a2', '2', 'area 2', { mode: 'area', area: 2 }),
  preset('a12', '12', 'area 12', { mode: 'area', area: 12 }),
  preset('a0.25', '0.25', 'area 0.25', { mode: 'area', area: 0.25 }),
  preset('a0', '0', 'area 0', { mode: 'area', area: 0 }),
  preset('am4', '−4', 'area minus 4', { mode: 'area', area: -4 }),
]);

export const presetsFor = (mode: SquareState['mode']): readonly SquarePreset[] => SQUARE_PRESETS.filter(p => p.state.mode === mode);
export const applyPreset = (state: SquareState, preset: SquarePreset): SquareState => ({ ...state, ...preset.state });

const dimOf = (state: SquareState) => (state.unit === 'm' ? LENGTH : DIMENSIONLESS);

// ---------------------------------------------------------------------------------------------- inspector
export function squareRows(d: SquareDerived, state: SquareState): InspectorRowData[] {
  const side = unitOf(dimOf(state));
  const area = unitOf(d.areaDim);
  if (d.mode === 'side') {
    return [
      { id: 'side', role: 'x', symbolTex: 'q', name: 'side (signed)', description: describeGiven(state.side, side) },
      { id: 'square', role: 'primary', symbolTex: 'q^{2}', name: 'area of the square', description: describeRational(d.square, area) },
      { id: 'root', role: 'derived', symbolTex: '\\sqrt{q^{2}}', name: 'its square root', description: describeRoot(d.rootOfSquare, side) },
    ];
  }
  const solutions = solutionsDescription(d);
  return [
    { id: 'area', role: 'primary', symbolTex: 'A', name: 'area (given)', description: describeGiven(state.area, area) },
    { id: 'root', role: 'derived', symbolTex: '\\sqrt{A}', name: 'side of that square', description: describeRoot(d.root, side) },
    { id: 'square-back', role: 'primary', symbolTex: '\\left(\\sqrt{A}\\right)^{2}', name: 'the root, squared again', description: d.squareOfRoot ? describeRational(d.squareOfRoot, area) : describeRoot({ kind: 'undefined', reason: d.root.kind === 'undefined' ? d.root.reason : 'not computed' }) },
    { id: 'solutions', role: 'y', symbolTex: 'x^{2}=A', name: 'real numbers x', description: solutions },
  ];
}

function solutionsDescription(d: AreaDerived): ValueDescription {
  if (d.solutions === 0) return statement('none', '\\text{none}', 'no real number', 'undefined', 'A real number squared is never negative, so x² = A has no real solution.');
  if (d.solutions === 1) return statement('0', '0', 'exactly one: zero');
  if (d.root.kind === 'exact') {
    const f = rootForm(d.root.root);
    return statement(`±${f.text}`, `\\pm ${f.tex}`, `plus or minus ${f.spoken}`);
  }
  const approx = d.root.kind === 'numeric' ? formatApprox(d.root.approx, FORMULA_FORMAT) : null;
  return { status: 'approximate', lines: [{ relation: '≈', text: `±${approx?.text ?? ''}`, tex: `\\pm ${approx?.tex ?? ''}` }], spoken: 'plus or minus the root' };
}

// ---------------------------------------------------------------------------------------------- formulas
export function squareFormulas(d: SquareDerived, state: SquareState): string[] {
  if (d.mode === 'side') {
    const q = given(state.side, true);
    const squared = rationalTex(d.square);
    const rootLine = d.rootOfSquare.kind === 'exact' ? rootForm(d.rootOfSquare.root).tex : '';
    return [
      aligned([`q^{2}&=${q}^{2}=${squared}`]),
      aligned([`\\sqrt{q^{2}}&=\\sqrt{${squared}}=${rootLine}`, `&=\\abs{q}${d.signLost ? `\\ne q` : ''}`]),
    ];
  }
  return [aligned(areaRootLines(d)), aligned(areaSolutionLines(d))];
}

function areaRootLines(d: AreaDerived): string[] {
  const radicand = rationalTex(d.area);
  if (d.root.kind === 'undefined') return [`\\sqrt{A}=\\sqrt{${radicand}}&\\quad\\text{no real value}`];
  if (d.root.kind === 'numeric') return [`\\sqrt{A}&=\\sqrt{${radicand}}`, `&\\approx ${formatApprox(d.root.approx, FORMULA_FORMAT).tex}`];
  const exact = rootForm(d.root.root);
  const r = d.root.root;
  const lines = [`\\sqrt{A}&=\\sqrt{${radicand}}`];
  // For a whole-number area the factor that leaves the root is visible: 12 = 2²·3, so √12 = 2√3.
  if (d.area.den === 1n && r.b !== 1n && r.a > 1n && r.c === 1n) lines.push(`&=\\sqrt{${r.a}^{2}\\cdot ${r.b}}`);
  lines.push(`&=${exact.tex}`);
  if (!exact.integer) lines.push(`&\\approx ${formatApprox(d.root.approx, FORMULA_FORMAT).tex}\\ldots`);
  return lines;
}

function areaSolutionLines(d: AreaDerived): string[] {
  if (d.solutions === 0) return [`x^{2}&=${rationalTex(d.area)}`, `&\\text{has no real solution: }x^{2}\\ge 0`];
  if (d.solutions === 1) return [`x^{2}&=0`, `&\\Rightarrow x=0`];
  if (d.root.kind !== 'exact') return [`x^{2}&=${rationalTex(d.area)}`, `&\\Rightarrow x=\\pm\\sqrt{${rationalTex(d.area)}}`];
  const root = rootForm(d.root.root);
  const back = d.squareOfRoot ? rationalTex(d.squareOfRoot) : '';
  return [`x^{2}&=${rationalTex(d.area)}\\ \\Rightarrow\\ x=\\pm ${root.tex}`, `\\left(${root.tex}\\right)^{2}&=${back}\\qquad \\left(-${root.tex}\\right)^{2}=${back}`];
}

// ---------------------------------------------------------------------------------------------- verdict
export function squareVerdict(d: SquareDerived, state: SquareState): string {
  if (d.mode === 'side') {
    const q = rationalForm(d.q).text;
    const sq = rationalForm(d.square).text;
    if (d.q.num === 0n) return 'Zero squares to zero and the root of zero is zero: the one side that needs no sign.';
    if (d.signLost) return `Squaring forgot the sign. (${q})² = ${sq}, and the square root of ${sq} is the non-negative number ${rationalForm(d.abs).text}, not ${q}: √(q²) = |q|. The two sides ${q} and ${rationalForm(d.abs).text} give the same square.`;
    return `Squaring and then taking the root brings q = ${q} back, because q is not negative. Try the negative twin of q: the same square, but the root returns a different number.`;
  }
  const a = rationalForm(d.area).text;
  if (d.solutions === 0) return `No square has area ${a}: a real number squared is never negative, so there is no real square root of ${a}.`;
  if (d.solutions === 1) return 'Area 0 is the degenerate square, a single point; its only root is 0.';
  if (d.root.kind === 'exact' && d.root.root.b === 1n) return `${a} is a perfect square: the side is exactly ${rootForm(d.root.root).text}. The equation x² = ${a} has two solutions, +${rootForm(d.root.root).text} and −${rootForm(d.root.root).text}; the symbol √ means only the positive one.`;
  if (d.root.kind === 'exact') return `The side of a square of area ${a} is exactly ${rootForm(d.root.root).text}; any decimal such as ${formatApprox(d.root.approx, FORMULA_FORMAT).text} is only a rounding of it. Squaring the exact form returns ${a} exactly; squaring the rounding does not.`;
  return `The side is ≈ ${formatApprox(d.root.kind === 'numeric' ? d.root.approx : 0, FORMULA_FORMAT).text}; this area is too large for the exact form to be attempted, so it is not claimed.`;
}

/** `data-agree` of the verdict: false whenever a caution is shown. */
export const verdictIsCaution = (d: SquareDerived): boolean => (d.mode === 'side' ? d.signLost : d.solutions === 0);

// ---------------------------------------------------------------------------------------------- scene (world coordinates)
export interface SquareScene {
  /** The square's four corners in order; `null` when there is no square (negative area). */
  readonly corners: readonly [Point, Point, Point, Point] | null;
  readonly centre: Point | null;
  /** The signed side q as an arrow along the x-axis (side mode only). */
  readonly sideArrow: { readonly from: Point; readonly to: Point } | null;
  /** Where the principal square root sits on the x-axis, and (when it exists) its negative twin. */
  readonly rootMarker: Point | null;
  readonly negativeRootMarker: Point | null;
  /** Side mode: where the handle sits (the signed side). */
  readonly handle: Point | null;
  /** The side's length as a world number (for the label). */
  readonly side: number | null;
}

export function squareScene(d: SquareDerived, state: SquareState): SquareScene {
  if (d.mode === 'side') {
    const q = state.side;
    const r = Math.abs(q);
    const x0 = Math.min(0, q);
    const corners: SquareScene['corners'] = r === 0 ? null : [{ x: x0, y: 0 }, { x: x0 + r, y: 0 }, { x: x0 + r, y: r }, { x: x0, y: r }];
    return {
      corners, centre: r === 0 ? null : { x: x0 + r / 2, y: r / 2 },
      sideArrow: r === 0 ? null : { from: { x: 0, y: 0 }, to: { x: q, y: 0 } },
      rootMarker: d.rootOfSquare.kind === 'exact' ? { x: toNumber(d.abs), y: 0 } : null,
      negativeRootMarker: null,
      handle: { x: q, y: 0 }, side: r,
    };
  }
  if (d.root.kind === 'undefined') return { corners: null, centre: null, sideArrow: null, rootMarker: null, negativeRootMarker: null, handle: null, side: null };
  const r = d.root.approx;
  return {
    corners: r === 0 ? null : [{ x: 0, y: 0 }, { x: r, y: 0 }, { x: r, y: r }, { x: 0, y: r }],
    centre: r === 0 ? null : { x: r / 2, y: r / 2 },
    sideArrow: r === 0 ? null : { from: { x: 0, y: 0 }, to: { x: r, y: 0 } },
    rootMarker: { x: r, y: 0 },
    negativeRootMarker: d.solutions === 2 ? { x: -r, y: 0 } : null,
    handle: null, side: r,
  };
}

/** The text on the dimension line under the square. */
export function sideDimensionLabel(d: SquareDerived, state: SquareState): string {
  const unit = state.unit === 'm' ? ' m' : '';
  if (d.mode === 'side') return `q = ${rationalForm(d.q).text}${unit}`;
  if (d.root.kind === 'undefined') return '';
  return d.root.kind === 'exact' ? `side ${rootForm(d.root.root).text}${unit}` : `side ≈ ${formatApprox(d.root.approx, SPOKEN_FORMAT).text}${unit}`;
}

/** The label placed above the square. */
export function squareCentreLabel(d: SquareDerived): string {
  if (d.mode === 'side') return `q² = ${rationalForm(d.square).text}`;
  return `A = ${rationalForm(d.area).text}`;
}

export function squareDescription(d: SquareDerived, state: SquareState): string {
  const unit = state.unit === 'm' ? ' metres' : '';
  if (d.mode === 'side') {
    const q = rationalForm(d.q).text;
    if (d.q.num === 0n) return 'The side is 0, so the square has shrunk to a point on the origin and its area is 0.';
    return `A square standing on the x-axis whose side runs from 0 to ${q}${unit}, on the ${d.q.num < 0n ? 'left' : 'right'} of the origin, with area ${rationalForm(d.square).text}${state.unit === 'm' ? ' square metres' : ''}. A marker on the positive side of the axis shows the square root of that area, ${rationalForm(d.abs).text}${d.signLost ? ', which is the positive twin of the side you chose, because squaring forgot the sign' : ''}.`;
  }
  if (d.root.kind === 'undefined') return `The area ${rationalForm(d.area).text} is negative, so no square can be drawn: no real number has a negative square.`;
  if (d.area.num === 0n) return 'The area is 0: the square is a single point at the origin and its side is 0.';
  return `A square of area ${rationalForm(d.area).text} standing on the x-axis, with side ${d.root.kind === 'exact' ? rootForm(d.root.root).text : formatApprox(d.root.approx, SPOKEN_FORMAT).text}${unit}. Two markers on the x-axis, at plus and minus that side, are the two numbers whose square is the area.`;
}

export function squareSpoken(d: SquareDerived): string {
  if (d.mode === 'side') {
    const root = d.rootOfSquare.kind === 'exact' ? rootForm(d.rootOfSquare.root).spoken : 'not computed';
    return `Side ${rationalForm(d.q).spoken}. Area exactly ${rationalForm(d.square).spoken}. Square root of the area exactly ${root}.${d.signLost ? ' The sign was lost: the root is the positive number.' : ''}`;
  }
  if (d.root.kind === 'undefined') return `Area ${rationalForm(d.area).spoken}. No real square root: a square is never negative.`;
  const root = d.root.kind === 'exact' ? `exactly ${rootForm(d.root.root).spoken}` : `approximately ${formatApprox(d.root.approx, SPOKEN_FORMAT).spoken}`;
  return `Area ${rationalForm(d.area).spoken}. Side ${root}. ${d.solutions === 2 ? 'Two real numbers have this square: the root and its negative.' : 'One real number has this square: zero.'}`;
}
