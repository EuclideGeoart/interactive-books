/** III.9 — the Jacobian as the local linear transformation of a vector-valued map. */
import { fromDecimal, sub as subR, toNumber, type Rational } from '../../math/quantity/rational';
import { eval2Number, poly2Text } from '../../math/calculus/bivariate';
import { localLinear, matVec, toPoint } from '../../math/calculus/jacobian';
import { MAPS } from '../../math/calculus/surfaces';
import { traceFrom } from '../../platform/trace';
import type { Point, WorldWindow } from '../../platform/geometry/viewport';
import { exactDesc, gtex, gtext, numericDesc, ratDesc, row, rtex, rtext, scene, spec, undefinedDesc, type CalcDerived, type CalcFrame } from './calculus-view';

export interface JacobianState { map: string; x: number; y: number; dx: number; dy: number }
export const JACOBIAN_CANONICAL: JacobianState = { map: 'square', x: 1, y: 0.5, dx: 0.25, dy: 0.25 };
export const jacobianPresets = [
  { id: 'square', label: 'Complex square', state: JACOBIAN_CANONICAL },
  { id: 'large', label: 'Large displacement', state: { ...JACOBIAN_CANONICAL, dx: 1, dy: -0.75 } },
  { id: 'singular', label: 'Singular at the origin', state: { ...JACOBIAN_CANONICAL, x: 0, y: 0 } },
  { id: 'shear', label: 'Bend', state: { ...JACOBIAN_CANONICAL, map: 'shear' } },
  { id: 'linear', label: 'Linear map: exact', state: { ...JACOBIAN_CANONICAL, map: 'linear', dx: 1, dy: 1 } },
  { id: 'lift', label: 'ℝ² → ℝ³ (3×2)', state: { ...JACOBIAN_CANONICAL, map: 'lift' } },
] as const satisfies readonly { id: string; label: string; state: JacobianState }[];
export const jacobianSpecs = {
  x: spec('x', 1, 'point p₁', 'p_1', -2, 2, 0.25), y: spec('y', 0.5, 'point p₂', 'p_2', -2, 2, 0.25),
  dx: spec('dx', 0.25, 'displacement δ₁', '\\delta_1', -1, 1, 0.25), dy: spec('dy', 0.25, 'displacement δ₂', '\\delta_2', -1, 1, 0.25),
};
const IN: WorldWindow = { xMin: -2.5, xMax: 2.5, yMin: -2.5, yMax: 2.5 };
const SIDE = 0.25;
const mtex = (J: readonly (readonly Rational[])[]) => `\\begin{bmatrix}${J.map(r => r.map(rtex).join('&')).join('\\\\')}\\end{bmatrix}`;
const vtex = (v: readonly Rational[]) => `\\begin{bmatrix}${v.map(rtex).join('\\\\')}\\end{bmatrix}`;
const vtext = (v: readonly Rational[]) => `(${v.map(rtext).join(', ')})`;

export function deriveJacobian(s: JacobianState): CalcDerived {
  const F = MAPS[s.map] ?? MAPS.square!, X = fromDecimal(s.x, 2)!, Y = fromDecimal(s.y, 2)!, DX = fromDecimal(s.dx, 2)!, DY = fromDecimal(s.dy, 2)!;
  const L = localLinear(F, X, Y, DX, DY), m = F.components.length;
  const Fn = (a: number, b: number) => F.components.slice(0, 2).map(c => eval2Number(c, a, b)) as [number, number];
  const P = { x: s.x, y: s.y }, Q = { x: s.x + s.dx, y: s.y + s.dy };
  const input = scene('input', 'Input plane: point p, displacement δ and a small square', '', IN);
  input.polygons.push({ name: 'square', corners: [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => ({ x: s.x + SIDE * a!, y: s.y + SIDE * b! })), role: 'ink' });
  input.arrows.push({ name: 'delta', from: P, to: Q, role: 'x' });
  input.handles.push({ id: 'p', label: `point p = (${gtext(s.x)}, ${gtext(s.y)})`, at: P, role: 'primary', xField: 'x', yField: 'y', step: 0.25 });
  input.handles.push({ id: 'q', label: `displaced point p + δ, δ = (${gtext(s.dx)}, ${gtext(s.dy)})`, at: Q, role: 'x', xField: 'dx', step: 0.25,
    spec: { ...jacobianSpecs.dx, id: 'q-x', domain: { min: s.x - 1, max: s.x + 1 } }, ySpec: { ...jacobianSpecs.dy, id: 'q-y', domain: { min: s.y - 1, max: s.y + 1 } },
    write: (a, b) => ({ dx: Number((a - s.x).toFixed(2)) + 0, dy: Number((b - s.y).toFixed(2)) + 0 }) });
  input.description = `Input point p = (${gtext(s.x)}, ${gtext(s.y)}), displacement δ = (${gtext(s.dx)}, ${gtext(s.dy)}) and a square of half-side ${SIDE} around p.`;
  // Output window: a local view centred on F(p), rounded so small drags do not move it.
  const c = toPoint(L.Fp), cx = Math.round(c.x * 2) / 2, cy = Math.round(c.y * 2) / 2;
  // The local window grows (in steps of 0.5) until it contains the actual and predicted endpoints, so a large miss is visible.
  const reach = Math.max(...[toPoint(L.Fq), toPoint(L.predicted)].map(p => Math.max(Math.abs(p.x - cx), Math.abs(p.y - cy))));
  const R = Math.max(2, Math.ceil((reach + 0.5) * 2) / 2);
  const out = scene('output', m === 2 ? 'Output near F(p): actual image versus the Jacobian prediction' : 'Output near F(p), projected on (F₁, F₂)', '', { xMin: cx - R, xMax: cx + R, yMin: cy - R, yMax: cy + R });
  const edge: Point[] = [];
  for (const [a0, b0, a1, b1] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]] as const)
    for (let k = 0; k < 16; k++) { const t = k / 16, v = Fn(s.x + SIDE * (a0 + (a1 - a0) * t), s.y + SIDE * (b0 + (b1 - b0) * t)); edge.push({ x: v[0], y: v[1] }); }
  out.polygons.push({ name: 'image', corners: edge, role: 'ink' });
  const J2 = L.J.slice(0, 2), lin = (a: number, b: number) => ({ x: c.x + toNumber(J2[0]![0]!) * a + toNumber(J2[0]![1]!) * b, y: c.y + toNumber(J2[1]![0]!) * a + toNumber(J2[1]![1]!) * b });
  out.polygons.push({ name: 'linear-image', corners: [lin(-SIDE, -SIDE), lin(SIDE, -SIDE), lin(SIDE, SIDE), lin(-SIDE, SIDE)], role: 'derived' });
  out.arrows.push({ name: 'column-1', from: c, to: lin(SIDE, 0), role: 'x' }, { name: 'column-2', from: c, to: lin(0, SIDE), role: 'y' });
  out.arrows.push({ name: 'actual', from: c, to: toPoint(L.Fq), role: 'primary' });
  out.segments.push({ name: 'predicted', from: c, to: toPoint(L.predicted), role: 'derived', dashed: true, width: 2.5 });
  out.markers.push({ name: 'predicted-tip', at: toPoint(L.predicted), role: 'derived', filled: false });
  out.description = `F(p) = ${vtext(L.Fp)}. The grey curved shape is the actual image of the input square; the purple parallelogram is its Jacobian image. `
    + `The orange arrow is the actual change F(p + δ) − F(p); the dashed purple segment ends at the prediction F(p) + Jδ = ${vtext(L.predicted)}.${m === 3 ? ` The third output F₃ is not drawn: F₃(p) = ${rtext(L.Fp[2]!)}.` : ''}`;
  const bad = matVec(L.J, [DX, DY, fromDecimal(0, 0)!]);
  const ratio = toNumber(L.deltaSquared) === 0 ? null : Math.sqrt(toNumber(L.errorSquared) / toNumber(L.deltaSquared));
  const formulas = [
    `F(x,y)=\\begin{bmatrix}${F.components.map(p => poly2Text(p, true)).join('\\\\')}\\end{bmatrix}`,
    `J_F(${gtex(s.x)},${gtex(s.y)})=\\begin{bmatrix}${F.components.map((_, i) => `\\partial_x F_${i + 1}&\\partial_y F_${i + 1}`).join('\\\\')}\\end{bmatrix}=${mtex(L.J)}\\quad(${m}\\times2)`,
    `F(p)+J\\delta=${vtex(L.Fp)}+${mtex(L.J)}${vtex([DX, DY])}=${vtex(L.predicted)}`,
    `F(p+\\delta)=${vtex(L.Fq)},\\qquad F(p+\\delta)-\\big(F(p)+J\\delta\\big)=${vtex(L.error)}`,
  ];
  const rows = [
    row('shape', 'J', 'Shape: outputs × inputs', exactDesc(`${m} × 2 (input ℝ², output ℝ${m === 2 ? '²' : '³'})`), 'ink'),
    row('fp', 'F(p)', 'Output at p', exactDesc(vtext(L.Fp)), 'primary'),
    row('col1', 'J\\mathbf e_1', 'Column 1: response to a unit x-step', exactDesc(vtext(L.J.map(r => r[0]!))), 'x'),
    row('col2', 'J\\mathbf e_2', 'Column 2: response to a unit y-step', exactDesc(vtext(L.J.map(r => r[1]!))), 'y'),
    row('row1', '\\nabla F_1', 'Row 1: gradient of the first output', exactDesc(vtext(L.J[0]!)), 'ink', true),
    row('det', '\\det J', 'Local area factor', L.det ? ratDesc(L.det) : undefinedDesc('Only a square Jacobian has a determinant.'), 'derived'),
    row('pred', 'F(p)+J\\delta', 'Linear prediction', exactDesc(vtext(L.predicted)), 'derived'),
    row('actual', 'F(p+\\delta)', 'Independent evaluation', exactDesc(vtext(L.Fq)), 'primary'),
    row('error', '\\|e\\|^2', 'Squared prediction error (exact)', ratDesc(L.errorSquared), 'caution'),
    row('ratio', '\\|e\\|/\\|\\delta\\|', 'Relative error', ratio === null ? undefinedDesc('δ = 0: nothing to predict.') : numericDesc(ratio), 'caution', true),
    row('mismatch', 'J\\cdot\\mathbb R^3', 'Wrong-shape product', bad.kind === 'undefined' ? undefinedDesc(bad.reason) : exactDesc('defined'), 'ink', true),
  ];
  const singular = L.det !== null && L.det.num === 0n;
  const status = singular ? 'singular' : m === 3 ? 'rectangular' : toNumber(L.errorSquared) === 0 ? 'exact' : Math.abs(s.dx) + Math.abs(s.dy) > 1 ? 'nonlocal' : 'local';
  const verdict = singular ? 'det J = 0 here: the map squashes a neighbourhood of p onto (nearly) a curve, so the local linear map is not invertible. Small squares become very thin shapes.'
    : status === 'rectangular' ? 'A map ℝ² → ℝ³ has a 3 × 2 Jacobian: it multiplies 2-vectors and returns 3-vectors. There is no determinant and no inverse; the picture shows two of the three outputs.'
      : status === 'exact' ? 'For a linear map the Jacobian IS the map: the prediction is exact for every displacement.'
        : status === 'nonlocal' ? `A large displacement: the prediction misses, with squared error ‖e‖² = ${rtext(L.errorSquared)}. The Jacobian describes the map only near p.`
          : `Near p the map acts like the matrix J: the predicted change Jδ = ${vtext(L.predicted.map((v, k) => subR(v, L.Fp[k]!)))} is close to the actual change; the error is second order.`;
  const frames = traceFrom<CalcFrame>([
    { state: { semantic: { Fp: L.Fp }, title: 'Evaluate F at p', detail: `F(p) = ${vtext(L.Fp)}.`, formula: `F(${gtex(s.x)},${gtex(s.y)})=${vtex(L.Fp)}` } satisfies CalcFrame },
    { state: { semantic: { J: L.J }, title: 'Differentiate each output by each input', detail: `Row i is the gradient of Fᵢ; column j is the response to the j-th input. Shape ${m} × 2.`, formula: formulas[1]! } satisfies CalcFrame },
    { state: { semantic: { predicted: L.predicted }, title: 'Predict with the linear map', detail: `F(p) + Jδ = ${vtext(L.predicted)}.`, formula: formulas[2]! } satisfies CalcFrame },
    { state: { semantic: { actual: L.Fq, error: L.error }, title: 'Compare with an independent evaluation', detail: verdict, formula: formulas[3]! } satisfies CalcFrame },
  ]);
  return {
    rows, formulas, verdict, status, caution: singular || status === 'nonlocal', scenes: [input, out], frames,
    hint: 'Drag the point p or the displaced point; arrow keys move the focused handle (steps of 0.25). Numeric fields control the same state.',
    metrics: { x: s.x, y: s.y, dx: s.dx, dy: s.dy, m, det: L.det ? toNumber(L.det) : null, errorSquared: toNumber(L.errorSquared), px: toNumber(L.predicted[0]!), py: toNumber(L.predicted[1]!), qx: toNumber(L.Fq[0]!), qy: toNumber(L.Fq[1]!), cx: c.x, cy: c.y },
  };
}
