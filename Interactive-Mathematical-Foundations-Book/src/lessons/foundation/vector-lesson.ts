/**
 * Foundation-demo lesson model: the 2D vector endpoint (shared by the foundation demo and the Vectors chapter, I.3).
 *
 *   Vector2 (state)  →  Vector2Derived  →  { inspector rows, formulas, spoken text, world-space scene, work frames }
 *
 * Every function here takes the `Vector2Derived` that `deriveVector2` produced and nothing else: no view
 * recomputes a magnitude, an angle or a square (master plan §2.3, §6.2, §8.2). The scene is described in
 * WORLD coordinates (y up); the UI maps it to the screen through the viewport, so sign conventions are
 * unit-testable without a browser.
 */
import type { Vector2, Vector2Derived } from '../../math/vector2/vector2';
import { toExactForm } from '../../math/vector2/exact';
import { formatApprox, formatGiven, type NumberFormat } from '../../platform/numeric/format';
import { describeValue, type Unit, type Value, type ValueDescription } from '../../platform/numeric/quantity';
import type { ParamSpec } from '../../platform/params';
import { traceFrom, type TraceFrame } from '../../platform/trace';
import type { WorldWindow, Point } from '../../platform/geometry/viewport';

// ---------------------------------------------------------------------------------------------- conventions
export const CANONICAL_VECTOR: Vector2 = Object.freeze({ x: 3, y: 2 });

/** The part of the plane the demo shows, and the (smaller) region the endpoint may occupy. */
export const WINDOW: WorldWindow = { xMin: -7, xMax: 7, yMin: -7, yMax: 7 };

export const X_PARAM: ParamSpec = {
  id: 'x', name: 'x-component', symbolTex: 'x', symbolText: 'x', domain: { min: -6, max: 6 }, default: CANONICAL_VECTOR.x, step: 0.1, onInvalid: 'reject',
};
export const Y_PARAM: ParamSpec = {
  id: 'y', name: 'y-component', symbolTex: 'y', symbolText: 'y', domain: { min: -6, max: 6 }, default: CANONICAL_VECTOR.y, step: 0.1, onInvalid: 'reject',
};

/** On-screen precision for this lesson (6 decimals, as in plan §15.3). */
export const FORMAT: NumberFormat = { digits: 6, scientificAbove: 1e6 };
/** The same precision for formulas, without trailing zeros: `5.29`, not `5.290000`. */
export const FORMULA_FORMAT: NumberFormat = { ...FORMAT, trimZeros: true };
/** Shorter precision for text a screen reader will speak. */
export const SPOKEN_FORMAT: NumberFormat = { digits: 3, scientificAbove: 1e6 };

export const RADIANS: Unit = { text: 'rad', tex: '\\mathrm{rad}', spoken: 'radians' };
export const DEGREES: Unit = { text: '°', tex: '^{\\circ}', spoken: 'degrees', attached: true };
export const ZERO_VECTOR_REASON = 'The zero vector has no direction.';

// ---------------------------------------------------------------------------------------------- helpers
export type Role = 'primary' | 'x' | 'y' | 'derived';

export const exactValue = (d: Vector2Derived): Value =>
  d.exactMagnitude ? { kind: 'exact', exact: toExactForm(d.exactMagnitude), approx: d.magnitude } : { kind: 'numeric', value: d.magnitude };

export const directionValue = (d: Vector2Derived, unit: 'rad' | 'deg'): Value =>
  d.directionRadians === null
    ? { kind: 'undefined', reason: ZERO_VECTOR_REASON }
    : { kind: 'numeric', value: unit === 'rad' ? d.directionRadians : (d.directionDegrees as number) };

/**
 * `3`, `-3`, `2.3` — and `(-3)` / `(1\\times 10^{-7})` when the number is used as the base of a power:
 * negatives need parentheses to square correctly, and scientific notation would otherwise produce a
 * double superscript (`10^{-7}^{2}`), which is not valid LaTeX.
 */
export const given = (n: number, asPowerBase = false): string => {
  const t = formatGiven(n).tex;
  return asPowerBase && (n < 0 || t.includes('\\times')) ? `(${t})` : t;
};

// ---------------------------------------------------------------------------------------------- inspector
export interface InspectorRow {
  readonly id: string;
  readonly role: Role;
  readonly symbolTex: string;
  readonly name: string;
  readonly description: ValueDescription;
  /** A secondary representation (e.g. degrees) is visually quieter. */
  readonly secondary?: boolean;
}

export function inspectorRows(d: Vector2Derived): InspectorRow[] {
  const x = formatGiven(d.x);
  const y = formatGiven(d.y);
  const vectorText = `(${x.text}, ${y.text})`;
  const vector: ValueDescription = {
    status: 'given',
    lines: [{ relation: '=', text: vectorText, tex: `\\begin{bmatrix}${x.tex}\\\\${y.tex}\\end{bmatrix}` }],
    spoken: `the vector with x equal to ${x.spoken} and y equal to ${y.spoken}`,
  };
  return [
    { id: 'vector', role: 'primary', symbolTex: '\\mathbf{v}', name: 'vector', description: vector },
    { id: 'x', role: 'x', symbolTex: 'x', name: 'x-component', description: describeValue({ kind: 'given', value: d.x }, FORMAT) },
    { id: 'y', role: 'y', symbolTex: 'y', name: 'y-component', description: describeValue({ kind: 'given', value: d.y }, FORMAT) },
    { id: 'magnitude', role: 'primary', symbolTex: '\\norm{\\mathbf{v}}', name: 'magnitude', description: describeValue(exactValue(d), FORMAT) },
    { id: 'direction', role: 'derived', symbolTex: '\\theta', name: 'direction', description: describeValue(directionValue(d, 'rad'), FORMAT, RADIANS) },
    { id: 'direction-degrees', role: 'derived', symbolTex: '\\theta', name: 'direction in degrees', description: describeValue(directionValue(d, 'deg'), FORMAT, DEGREES), secondary: true },
  ];
}

// ---------------------------------------------------------------------------------------------- formulas
export const aligned = (lines: readonly string[]): string => `\\begin{aligned}${lines.join('\\\\')}\\end{aligned}`;

/**
 * Display equations (LaTeX) for the live formula panel: the column vector, then the derivation of ‖v‖ and of
 * θ, each as an aligned multi-line block so a long chain stays inside its column.
 */
export function formulaChain(d: Vector2Derived): string[] {
  const x = given(d.x);
  const y = given(d.y);
  const column = `\\mathbf{v}=\\begin{bmatrix}${x}\\\\${y}\\end{bmatrix}`;

  // ‖v‖ = √(x²+y²) = √(a²+b²) = …
  const magnitude = [`\\norm{\\mathbf{v}}&=\\sqrt{x^{2}+y^{2}}`, `&=\\sqrt{${given(d.x, true)}^{2}+${given(d.y, true)}^{2}}`];
  if (d.exactMagnitude) {
    const exact = toExactForm(d.exactMagnitude);
    const radicand = given(d.magnitudeSquared);
    magnitude.push(`&=\\sqrt{${radicand}}`);
    if (exact.tex !== `\\sqrt{${radicand}}`) magnitude.push(`&=${exact.tex}`);
    if (!exact.integer) magnitude.push(`&\\approx ${formatApprox(d.magnitude, FORMULA_FORMAT).tex}\\ldots`);
  } else {
    magnitude.push(`&\\approx ${formatApprox(d.magnitude, FORMULA_FORMAT).tex}`);
  }

  const direction = [`\\theta&=\\atantwo(y,x)`, `&=\\atantwo(${y},${x})`];
  if (d.directionRadians === null) direction.push('&\\text{undefined: the zero vector has no direction}');
  else {
    direction.push(`&\\approx ${formatApprox(d.directionRadians, FORMULA_FORMAT).tex}\\ \\mathrm{rad}`);
    direction.push(`&\\approx ${formatApprox(d.directionDegrees as number, FORMULA_FORMAT).tex}^{\\circ}`);
  }
  return [column, aligned(magnitude), aligned(direction)];
}

// ---------------------------------------------------------------------------------------------- spoken text
/**
 * One sentence group read when the endpoint receives focus and announced after keyboard / numeric changes
 * (plan §11.2). Built from the same derived object as every other view.
 */
export function spokenSummary(d: Vector2Derived): string {
  const x = formatGiven(d.x).spoken;
  const y = formatGiven(d.y).spoken;
  const exact = d.exactMagnitude ? toExactForm(d.exactMagnitude) : null;
  const magnitudeText = exact?.integer
    ? `Magnitude exactly ${exact.spoken}.`
    : `Magnitude ${describeValue({ kind: 'numeric', value: d.magnitude }, SPOKEN_FORMAT).spoken}.`;
  const direction =
    d.directionRadians === null
      ? 'Direction undefined: the zero vector has no direction.'
      : `Angle ${describeValue({ kind: 'numeric', value: d.directionRadians }, SPOKEN_FORMAT, RADIANS).spoken}.`;
  return `Vector endpoint. x = ${x}, y = ${y}. ${magnitudeText} ${direction}`;
}

// ---------------------------------------------------------------------------------------------- world-space scene
export interface Scene {
  /** The vector arrow; `null` for the zero vector (a zero-length arrow would be a lie about direction). */
  readonly arrow: { readonly from: Point; readonly to: Point } | null;
  /** The handle sits at the endpoint, always. */
  readonly handle: Point;
  readonly xLeg: { readonly from: Point; readonly to: Point };
  readonly yLeg: { readonly from: Point; readonly to: Point };
  /** Corner of the right angle between the legs (x, 0). */
  readonly corner: Point;
  /** Angle arc from the +x axis to the vector, in WORLD radians; `null` if there is no direction or it is exactly 0. */
  readonly arc: { readonly from: number; readonly to: number } | null;
}

export function sceneOf(d: Vector2Derived): Scene {
  const origin = { x: 0, y: 0 };
  const tip = { x: d.x, y: d.y };
  const corner = { x: d.x, y: 0 };
  return {
    arrow: d.isZero ? null : { from: origin, to: tip },
    handle: tip,
    xLeg: { from: origin, to: corner },
    yLeg: { from: corner, to: tip },
    corner,
    arc: d.directionRadians === null || d.directionRadians === 0 ? null : { from: 0, to: d.directionRadians },
  };
}

// ---------------------------------------------------------------------------------------------- work frames (trace)
export interface WorkState {
  /** LaTeX of the equation shown for this step. */
  readonly tex: string;
  /** One-line plain-language caption. */
  readonly caption: string;
}

/** ‖v‖ computed one step at a time: a deterministic function of the current state (plan §2.4). */
export function workFrames(d: Vector2Derived): readonly TraceFrame<WorkState>[] {
  const x = given(d.x, true);
  const y = given(d.y, true);
  const sq = (n: number) => formatApprox(n, FORMULA_FORMAT).tex;
  const integerState = d.exactMagnitude !== null;
  const squares = integerState ? [given(d.xSquared), given(d.ySquared)] : [sq(d.xSquared), sq(d.ySquared)];
  const sum = integerState ? given(d.magnitudeSquared) : sq(d.magnitudeSquared);
  const eq = integerState ? '=' : '\\approx';
  const finalExact = d.exactMagnitude ? toExactForm(d.exactMagnitude) : null;
  const final =
    finalExact && !finalExact.integer
      ? `\\norm{\\mathbf{v}}=${finalExact.tex}\\approx ${formatApprox(d.magnitude, FORMULA_FORMAT).tex}\\ldots`
      : finalExact
        ? `\\norm{\\mathbf{v}}=${finalExact.tex}`
        : `\\norm{\\mathbf{v}}\\approx ${formatApprox(d.magnitude, FORMULA_FORMAT).tex}`;
  return traceFrom<WorkState>([
    { state: { tex: `\\mathbf{v}=\\begin{bmatrix}${given(d.x)}\\\\${given(d.y)}\\end{bmatrix}`, caption: 'Start from the two components: how far right, how far up.' } },
    { state: { tex: `x^{2}=${x}^{2}${eq}${squares[0]},\\qquad y^{2}=${y}^{2}${eq}${squares[1]}`, caption: 'Square each component: the areas of the squares on the two legs.' } },
    { state: { tex: `x^{2}+y^{2}${eq}${squares[0]}+${squares[1]}${eq}${sum}`, caption: 'Add them: the area of the square on the hypotenuse (Pythagoras).' } },
    { state: { tex: final, caption: 'Take the square root to get a length.' } },
  ]);
}

