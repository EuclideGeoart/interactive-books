/**
 * Lesson views for "where the square root comes from": the squares on the sides of the right triangle whose legs are
 * the components of v (master plan §15.2 item 3; REF-1).
 *
 *   Vector2Derived  →  { world-space squares, inspector rows, area equation, spoken text }
 *
 * The AREAS shown are the derived quantities `xSquared`, `ySquared`, `magnitudeSquared` of the vector model; the
 * only mathematics here is placing a square on a segment (pure geometry in world coordinates, unit-tested).
 */
import type { Vector2Derived } from '../../math/vector2/vector2';
import { formatApprox, formatGiven } from '../../platform/numeric/format';
import { describeValue, type ExactForm, type Value } from '../../platform/numeric/quantity';
import type { ParamSpec } from '../../platform/params';
import type { Point, WorldWindow } from '../../platform/geometry/viewport';
import { FORMAT, FORMULA_FORMAT, exactValue, given, aligned, type InspectorRow } from '../foundation/vector-lesson';

/** The squares on the hypotenuse reach |x| + |y| from the origin: a window of ±9 holds every state with |x|, |y| ≤ 4. */
export const PYTHAGORAS_WINDOW: WorldWindow = { xMin: -9, xMax: 9, yMin: -9, yMax: 9 };
export const PYTHAGORAS_LIMIT = 4;

const spec = (id: 'x' | 'y', value: number): ParamSpec => ({
  id, name: `${id}-component`, symbolTex: id, symbolText: id, domain: { min: -PYTHAGORAS_LIMIT, max: PYTHAGORAS_LIMIT }, default: value, step: 1, onInvalid: 'reject',
});
export const PYTHAGORAS_X: ParamSpec = spec('x', 3);
export const PYTHAGORAS_Y: ParamSpec = spec('y', 2);

export type SquareId = 'x' | 'y' | 'hypotenuse';
export interface Square {
  readonly id: SquareId;
  /** The four corners, in order around the square, in WORLD coordinates. */
  readonly corners: readonly [Point, Point, Point, Point];
  /** Centre, for the label. */
  readonly centre: Point;
  /** Side length (a world length). */
  readonly side: number;
}

/**
 * The square erected on the segment a→b on the side AWAY from `awayFrom` (the triangle's third vertex), so the
 * square never overlaps the triangle. Corners: a, b, b + n, a + n with n the perpendicular of a→b with the same length.
 */
export function squareOn(a: Point, b: Point, awayFrom: Point): Square['corners'] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let nx = -dy;
  let ny = dx;
  if (nx * (awayFrom.x - a.x) + ny * (awayFrom.y - a.y) > 0) { nx = -nx; ny = -ny; }
  return [a, b, { x: b.x + nx, y: b.y + ny }, { x: a.x + nx, y: a.y + ny }];
}

export interface PythagorasScene {
  /** Triangle vertices: the origin, the foot (x, 0) and the tip (x, y). */
  readonly origin: Point;
  readonly foot: Point;
  readonly tip: Point;
  /** With a zero component the triangle is flat: no squares (the "hypotenuse" is the leg). */
  readonly degenerate: boolean;
  readonly squares: readonly Square[];
}

export function pythagorasScene(d: Vector2Derived): PythagorasScene {
  const origin = { x: 0, y: 0 };
  const foot = { x: d.x, y: 0 };
  const tip = { x: d.x, y: d.y };
  const degenerate = d.x === 0 || d.y === 0;
  if (degenerate) return { origin, foot, tip, degenerate, squares: [] };
  const make = (id: SquareId, a: Point, b: Point, away: Point): Square => {
    const corners = squareOn(a, b, away);
    return { id, corners, centre: { x: (corners[0].x + corners[2].x) / 2, y: (corners[0].y + corners[2].y) / 2 }, side: Math.hypot(b.x - a.x, b.y - a.y) };
  };
  return {
    origin, foot, tip, degenerate,
    squares: [make('x', origin, foot, tip), make('y', foot, tip, origin), make('hypotenuse', origin, tip, foot)],
  };
}

// ---------------------------------------------------------------------------------------------- values
/** An exact integer as an `ExactForm`, so the inspector prints `= 9` (and never a rounded-looking `≈ 9`). */
const integerForm = (n: number): ExactForm => {
  const text = formatGiven(n).text;
  return { text, tex: formatGiven(n).tex, spoken: formatGiven(n).spoken, integer: true, irrational: false };
};
/** Squares of integer components are exact integers; anything else is a computed approximation. */
const areaValue = (d: Vector2Derived, area: number): Value =>
  d.exactMagnitude ? { kind: 'exact', exact: integerForm(area), approx: area } : { kind: 'numeric', value: area };

export function areaRows(d: Vector2Derived): InspectorRow[] {
  return [
    { id: 'x-squared', role: 'x', symbolTex: 'x^{2}', name: 'area of the square on the x-leg', description: describeValue(areaValue(d, d.xSquared), FORMAT) },
    { id: 'y-squared', role: 'y', symbolTex: 'y^{2}', name: 'area of the square on the y-leg', description: describeValue(areaValue(d, d.ySquared), FORMAT) },
    { id: 'magnitude-squared', role: 'primary', symbolTex: '\\norm{\\mathbf{v}}^{2}', name: 'area of the square on the arrow', description: describeValue(areaValue(d, d.magnitudeSquared), FORMAT) },
    { id: 'magnitude', role: 'primary', symbolTex: '\\norm{\\mathbf{v}}', name: 'its side: the length', description: describeValue(exactValue(d), FORMAT) },
  ];
}

/** `x² + y² = 9 + 4 = 13`, then the square root. Built from the same derived areas as the rows. */
export function areaEquation(d: Vector2Derived): string {
  const integerState = d.exactMagnitude !== null;
  const t = (n: number) => (integerState ? given(n) : formatApprox(n, FORMULA_FORMAT).tex);
  const eq = integerState ? '=' : '\\approx';
  const lines = [`x^{2}+y^{2}&=${t(d.xSquared)}+${t(d.ySquared)}`, `&${eq}${t(d.magnitudeSquared)}=\\norm{\\mathbf{v}}^{2}`];
  return aligned(lines);
}

export function pythagorasDescription(d: Vector2Derived): string {
  if (d.isZero) return 'The vector is the zero vector: the triangle has shrunk to a point and every square has area 0.';
  const x = formatGiven(d.x).text;
  const y = formatGiven(d.y).text;
  if (d.x === 0 || d.y === 0) return `The triangle is flat because a component is 0: the vector (${x}, ${y}) runs along an axis, and its length is the absolute value of its non-zero component.`;
  return `A right triangle with legs |x| = ${formatGiven(Math.abs(d.x)).text} and |y| = ${formatGiven(Math.abs(d.y)).text} and the vector (${x}, ${y}) as hypotenuse, with a square drawn on each side. The squares on the legs have areas ${formatApprox(d.xSquared, FORMULA_FORMAT).text} and ${formatApprox(d.ySquared, FORMULA_FORMAT).text}; the square on the vector has area ${formatApprox(d.magnitudeSquared, FORMULA_FORMAT).text}, the sum of the other two.`;
}
