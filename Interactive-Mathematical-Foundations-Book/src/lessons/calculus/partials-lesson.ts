/** III.7 — multivariable functions and partial derivatives: hold one input fixed, differentiate the slice. */
import { add, div, fromDecimal, sub, toNumber } from '../../math/quantity/rational';
import { dx2, dy2, eval2, eval2Number, poly2Text, slice } from '../../math/calculus/bivariate';
import { evalPoly, evalPolyNumber, polyTex, polyText, derivative } from '../../math/calculus/polynomial';
import { SURFACES } from '../../math/calculus/surfaces';
import { traceFrom } from '../../platform/trace';
import type { WorldWindow } from '../../platform/geometry/viewport';
import { cachedCurve, gtex, gtext, givenDesc, lineThrough, ratDesc, row, rtex, rtext, scene, spec, type CalcDerived, type CalcFrame } from './calculus-view';
import { cachedContours } from './contour-view';

export interface PartialState { fn: string; x: number; y: number }
export const PARTIAL_CANONICAL: PartialState = { fn: 'saddle', x: 1, y: 0.5 };
export const partialPresets = [
  { id: 'saddle', label: 'Saddle x² − y²', state: PARTIAL_CANONICAL },
  { id: 'product', label: 'Product xy', state: { fn: 'product', x: 1, y: 0.5 } },
  { id: 'elliptic', label: 'Valley x²/2 + 2y²', state: { fn: 'elliptic', x: 1, y: 0.5 } },
  { id: 'plane', label: 'Tilted plane', state: { fn: 'plane', x: 1, y: 0.5 } },
  { id: 'origin', label: 'Saddle at the origin', state: { fn: 'saddle', x: 0, y: 0 } },
] as const satisfies readonly { id: string; label: string; state: PartialState }[];
export const partialSpecs = { x: spec('x', 1, 'input x', 'x', -2.5, 2.5, 0.25), y: spec('y', 0.5, 'input y', 'y', -2.5, 2.5, 0.25) };
export const MAP: WorldWindow = { xMin: -2.5, xMax: 2.5, yMin: -2.5, yMax: 2.5 };
const H = fromDecimal(0.25, 2)!;

export function derivePartial(s: PartialState): CalcDerived {
  const S = SURFACES[s.fn] ?? SURFACES.saddle!, f = S.f, X = fromDecimal(s.x, 2)!, Y = fromDecimal(s.y, 2)!;
  const z = eval2(f, X, Y), fx = eval2(dx2(f), X, Y), fy = eval2(dy2(f), X, Y);
  const sx = slice(f, 'x', Y), sy = slice(f, 'y', X);
  const secX = div(sub(eval2(f, add(X, H), Y), z), H), secY = div(sub(eval2(f, X, add(Y, H)), z), H);
  const map = scene('map', `Contour map of f(x, y) = ${poly2Text(f)}`, '', MAP);
  map.curves.push({ name: 'contours', lines: cachedContours(S.id, (a, b) => eval2Number(f, a, b), MAP, S.levels), role: 'ink', width: 1.4 });
  map.segments.push({ name: 'slice-x', from: { x: MAP.xMin, y: s.y }, to: { x: MAP.xMax, y: s.y }, role: 'x', width: 2.5 },
    { name: 'slice-y', from: { x: s.x, y: MAP.yMin }, to: { x: s.x, y: MAP.yMax }, role: 'y', width: 2.5, dashed: true });
  map.handles.push({ id: 'p', label: `point (x, y) = (${gtext(s.x)}, ${gtext(s.y)}), f = ${rtext(z)}`, at: { x: s.x, y: s.y }, role: 'primary', xField: 'x', yField: 'y', step: 0.25 });
  map.description = `Level curves of f(x, y) = ${poly2Text(f)} at heights ${S.levels.slice(0, 6).join(', ')}…. The point (${gtext(s.x)}, ${gtext(s.y)}) has height ${rtext(z)}. The solid blue line holds y = ${gtext(s.y)}; the dashed green line holds x = ${gtext(s.x)}.`;
  const zw: WorldWindow = { xMin: -2.5, xMax: 2.5, yMin: S.z[0], yMax: S.z[1] };
  const one = (id: string, axis: 'x' | 'y', p: typeof sx, at: number, slope: typeof fx, role: 'x' | 'y') => {
    const sc = scene(id, axis === 'x' ? `Slice y = ${gtext(s.y)}: t ↦ f(t, ${gtext(s.y)})` : `Slice x = ${gtext(s.x)}: t ↦ f(${gtext(s.x)}, t)`, '', zw);
    sc.curves.push({ name: `curve-${axis}`, lines: cachedCurve(`${S.id}-slice-${axis}-${axis === 'x' ? s.y : s.x}`, t => evalPolyNumber(p, t), zw), role, width: 2.5 });
    sc.segments.push({ name: `tangent-${axis}`, ...lineThrough({ x: at, y: toNumber(z) }, toNumber(slope), zw), role: 'primary', width: 2.2 });
    sc.markers.push({ name: `point-${axis}`, at: { x: at, y: toNumber(z) }, role: 'primary', filled: true });
    sc.description = `${axis === 'x' ? 'Holding y fixed' : 'Holding x fixed'}, the slice is the one-variable polynomial ${polyText(p, 't')}. Its tangent at t = ${gtext(at)} has slope ${rtext(slope)} = ∂f/∂${axis}.`;
    return sc;
  };
  const sliceX = one('slice-x', 'x', sx, s.x, fx, 'x'), sliceY = one('slice-y', 'y', sy, s.y, fy, 'y');
  const formulas = [
    `f(x,y)=${poly2Text(f, true)},\\qquad f(${gtex(s.x)},${gtex(s.y)})=${rtex(z)}`,
    `f(t,${gtex(s.y)})=${polyTex(sx, 't')}\\ \\Rightarrow\\ \\frac{\\partial f}{\\partial x}(${gtex(s.x)},${gtex(s.y)})=${polyTex(derivative(sx), 't')}\\Big|_{t=${gtex(s.x)}}=${rtex(fx)}`,
    `f(${gtex(s.x)},t)=${polyTex(sy, 't')}\\ \\Rightarrow\\ \\frac{\\partial f}{\\partial y}(${gtex(s.x)},${gtex(s.y)})=${polyTex(derivative(sy), 't')}\\Big|_{t=${gtex(s.y)}}=${rtex(fy)}`,
    `\\frac{\\partial f}{\\partial x}=${poly2Text(dx2(f), true)},\\qquad \\frac{\\partial f}{\\partial y}=${poly2Text(dy2(f), true)}`,
  ];
  const rows = [
    row('x', 'x', 'Input x', givenDesc(s.x), 'x'), row('y', 'y', 'Input y', givenDesc(s.y), 'y'), row('f', 'f(x,y)', 'Height', ratDesc(z), 'ink'),
    row('fx', '\\partial f/\\partial x', 'Rate along x, y held fixed', ratDesc(fx), 'x'), row('fy', '\\partial f/\\partial y', 'Rate along y, x held fixed', ratDesc(fy), 'y'),
    row('secx', '\\Delta_x f/h', 'Secant along x (h = 0.25)', ratDesc(secX), 'x', true), row('secy', '\\Delta_y f/h', 'Secant along y (h = 0.25)', ratDesc(secY), 'y', true),
  ];
  const verdict = toNumber(fx) === 0 && toNumber(fy) === 0
    ? `Both partial derivatives are 0 here: neither slice is tilted at this point. That alone does not make it a minimum (this may be a saddle — see III.11).`
    : `Moving along x with y fixed changes f at rate ${rtext(fx)}; moving along y with x fixed changes it at rate ${rtext(fy)}. Two different questions, two different slices of the same surface.`;
  const frames = traceFrom<CalcFrame>([
    { state: { semantic: { fixed: 'y', y: Y, slice: sx }, title: 'Hold y fixed', detail: `Set y = ${gtext(s.y)}. What remains is a function of x alone.`, formula: `f(t,${gtex(s.y)})=${polyTex(sx, 't')}` } satisfies CalcFrame },
    { state: { semantic: { partial: 'x', value: fx }, title: 'Differentiate the x-slice', detail: `Its slope at t = ${gtext(s.x)} is ∂f/∂x = ${rtext(fx)}.`, formula: formulas[1]! } satisfies CalcFrame },
    { state: { semantic: { fixed: 'x', x: X, slice: sy }, title: 'Hold x fixed instead', detail: `Set x = ${gtext(s.x)}. Now y varies alone.`, formula: `f(${gtex(s.x)},t)=${polyTex(sy, 't')}` } satisfies CalcFrame },
    { state: { semantic: { partial: 'y', value: fy, check: evalPoly(derivative(sy), Y) }, title: 'Differentiate the y-slice', detail: `Its slope at t = ${gtext(s.y)} is ∂f/∂y = ${rtext(fy)}.`, formula: formulas[2]! } satisfies CalcFrame },
  ]);
  return {
    rows, formulas, verdict, status: toNumber(fx) === 0 && toNumber(fy) === 0 ? 'flat' : 'tilted', caution: false, scenes: [map, sliceX, sliceY], frames,
    hint: 'Drag the point on the contour map, or use the arrow keys: left/right change x, up/down change y (steps of 0.25). Numeric fields control the same state.',
    metrics: { x: s.x, y: s.y, f: toNumber(z), fx: toNumber(fx), fy: toNumber(fy) },
  };
}
