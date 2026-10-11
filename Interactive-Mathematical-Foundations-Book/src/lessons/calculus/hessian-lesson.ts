/** III.11 — Hessian, curvature, the second-derivative test and the local quadratic model. */
import { fromDecimal, toNumber } from '../../math/quantity/rational';
import { classify, eval2, eval2Number, gradient, hessian, hessianEigen, isZeroVec, poly2Text } from '../../math/calculus/bivariate';
import { SURFACES } from '../../math/calculus/surfaces';
import { traceFrom } from '../../platform/trace';
import type { WorldWindow } from '../../platform/geometry/viewport';
import { exactDesc, gtex, gtext, numericDesc, ratDesc, row, rtex, rtext, scene, spec, type CalcDerived, type CalcFrame } from './calculus-view';
import { cachedContours } from './contour-view';

export interface HessianState { fn: string; x: number; y: number; angle: number }
export const HESSIAN_CANONICAL: HessianState = { fn: 'bowl', x: 0, y: 0, angle: 30 };
export const hessianPresets = [
  { id: 'minimum', label: 'Minimum x² + y²', state: HESSIAN_CANONICAL },
  { id: 'maximum', label: 'Maximum −x² − y²', state: { ...HESSIAN_CANONICAL, fn: 'cap' } },
  { id: 'saddle', label: 'Saddle x² − y²', state: { ...HESSIAN_CANONICAL, fn: 'saddle' } },
  { id: 'well-min', label: 'x³ − 3x + y² at (1, 0)', state: { fn: 'double-well', x: 1, y: 0, angle: 30 } },
  { id: 'well-saddle', label: 'same at (−1, 0)', state: { fn: 'double-well', x: -1, y: 0, angle: 30 } },
  { id: 'monkey', label: 'Monkey saddle: inconclusive', state: { ...HESSIAN_CANONICAL, fn: 'monkey' } },
  { id: 'quartic', label: 'x⁴ + y⁴: inconclusive', state: { ...HESSIAN_CANONICAL, fn: 'quartic' } },
  { id: 'cubic-y', label: 'x² + y³: inconclusive', state: { ...HESSIAN_CANONICAL, fn: 'cubic-y' } },
  { id: 'not-critical', label: 'Not a critical point', state: { fn: 'double-well', x: 0, y: 0.5, angle: 30 } },
] as const satisfies readonly { id: string; label: string; state: HessianState }[];
export const hessianSpecs = {
  x: spec('x', 0, 'point x', 'x', -2, 2, 0.25), y: spec('y', 0, 'point y', 'y', -2, 2, 0.25),
  angle: spec('angle', 30, 'direction angle (degrees)', '\\theta^\\circ', -180, 180, 15, 0),
};
const MAP: WorldWindow = { xMin: -2.5, xMax: 2.5, yMin: -2.5, yMax: 2.5 };
const LOCAL = 1.25;

export function deriveHessian(s: HessianState): CalcDerived {
  const S = SURFACES[s.fn] ?? SURFACES.bowl!, f = S.f, X = fromDecimal(s.x, 2)!, Y = fromDecimal(s.y, 2)!;
  const z = eval2(f, X, Y), g = gradient(f, X, Y), h = hessian(f, X, Y), c = classify(f, X, Y), e = hessianEigen(h);
  const th = s.angle * Math.PI / 180, u = [Math.cos(th), Math.sin(th)] as const;
  const curvature = toNumber(h.fxx) * u[0] * u[0] + 2 * toNumber(h.fxy) * u[0] * u[1] + toNumber(h.fyy) * u[1] * u[1];
  // Quadratic model Q(δ) = f + ∇f·δ + ½ δᵀHδ, evaluated in binary64 only for drawing its contours.
  const q = (a: number, b: number) => { const d0 = a - s.x, d1 = b - s.y; return toNumber(z) + toNumber(g[0]) * d0 + toNumber(g[1]) * d1 + 0.5 * (toNumber(h.fxx) * d0 * d0 + 2 * toNumber(h.fxy) * d0 * d1 + toNumber(h.fyy) * d1 * d1); };
  const local: WorldWindow = { xMin: s.x - LOCAL, xMax: s.x + LOCAL, yMin: s.y - LOCAL, yMax: s.y + LOCAL };
  const levels = S.levels;
  const map = scene('map', `Contours of f = ${poly2Text(f)}`, '', MAP);
  map.curves.push({ name: 'contours', lines: cachedContours(S.id, (a, b) => eval2Number(f, a, b), MAP, levels), role: 'ink', width: 1.4 });
  e.vectors.forEach((v, k) => map.segments.push({ name: `principal-${k}`, from: { x: s.x - 0.9 * v[0], y: s.y - 0.9 * v[1] }, to: { x: s.x + 0.9 * v[0], y: s.y + 0.9 * v[1] }, role: k === 0 ? 'x' : 'y', dashed: true, width: 2 }));
  map.arrows.push({ name: 'direction', from: { x: s.x, y: s.y }, to: { x: s.x + 0.7 * u[0], y: s.y + 0.7 * u[1] }, role: 'primary' });
  map.handles.push({ id: 'p', label: `point (${gtext(s.x)}, ${gtext(s.y)}), f = ${rtext(z)}`, at: { x: s.x, y: s.y }, role: 'primary', xField: 'x', yField: 'y', step: 0.25 });
  map.description = `Contours of f = ${poly2Text(f)}. At (${gtext(s.x)}, ${gtext(s.y)}) the dashed lines are the principal curvature directions (eigenvectors of the Hessian, eigenvalues ≈ ${e.values.map(v => v.toFixed(4)).join(' and ')}). Classification: ${c.kind}.`;
  const model = scene('model', 'Quadratic model Q(δ) near the point', '', local);
  model.curves.push({ name: 'f-contours', lines: cachedContours(`${S.id}-local-${s.x}-${s.y}`, (a, b) => eval2Number(f, a, b), local, levels, 32), role: 'ink', width: 1.2 });
  model.curves.push({ name: 'q-contours', lines: cachedContours(`${S.id}-q-${s.x}-${s.y}`, q, local, levels, 32), role: 'derived', dashed: true, width: 2 });
  model.markers.push({ name: 'point', at: { x: s.x, y: s.y }, role: 'primary', filled: true });
  model.description = `Near the point, solid contours of f and dashed contours of its quadratic model share the same levels. ${c.kind === 'inconclusive' ? 'Here the Hessian is singular: the quadratic model is degenerate and does not capture the higher-order behaviour that decides the shape.' : 'Close to the point they agree; farther away higher-order terms separate them.'}`;
  const sym = h.fxy.num === h.fyx.num && h.fxy.den === h.fyx.den;
  const formulas = [
    `\\nabla f=\\begin{bmatrix}${rtex(g[0])}\\\\${rtex(g[1])}\\end{bmatrix},\\quad H=\\begin{bmatrix}${rtex(h.fxx)}&${rtex(h.fxy)}\\\\${rtex(h.fyx)}&${rtex(h.fyy)}\\end{bmatrix}`,
    `\\det H=${rtex(c.det)},\\quad \\operatorname{tr}H=${rtex(c.trace)}`,
    `\\mathbf u^{\\mathsf T}H\\mathbf u\\approx ${curvature.toFixed(6)}\\quad(\\theta=${gtex(s.angle)}^\\circ)`,
    `Q(\\delta)=f(p)+\\nabla f\\cdot\\delta+\\tfrac12\\,\\delta^{\\mathsf T}H\\,\\delta`,
  ];
  const kindText: Record<string, string> = { 'not-critical': 'not a critical point', minimum: 'local minimum', maximum: 'local maximum', saddle: 'saddle point', inconclusive: 'test inconclusive' };
  const rows = [
    row('point', '(x,y)', 'Point', exactDesc(`(${gtext(s.x)}, ${gtext(s.y)})`), 'primary'), row('f', 'f', 'Height', ratDesc(z), 'ink'),
    row('grad', '\\nabla f', 'Gradient', exactDesc(`(${rtext(g[0])}, ${rtext(g[1])})`), 'primary'),
    row('fxx', 'f_{xx}', 'Curvature along x', ratDesc(h.fxx), 'x'), row('fyy', 'f_{yy}', 'Curvature along y', ratDesc(h.fyy), 'y'),
    row('fxy', 'f_{xy}=f_{yx}', 'Mixed partials (both orders)', exactDesc(sym ? `${rtext(h.fxy)} = ${rtext(h.fyx)} (symmetric)` : `${rtext(h.fxy)} ≠ ${rtext(h.fyx)}`), 'derived'),
    row('det', '\\det H', 'Determinant', ratDesc(c.det), 'derived'), row('eig', '\\lambda_{1,2}', 'Principal curvatures (eigenvalues)', numericDesc(e.values[0]), 'derived'),
    row('eig2', '\\lambda_2', 'Second eigenvalue', numericDesc(e.values[1]), 'derived', true),
    row('curv', '\\mathbf u^{\\mathsf T}H\\mathbf u', 'Curvature in the chosen direction', numericDesc(curvature), 'primary', true),
    row('class', '\\text{test}', 'Second-derivative test', exactDesc(kindText[c.kind]!), c.kind === 'inconclusive' || c.kind === 'not-critical' ? 'caution' : 'ink'),
  ];
  const verdict = c.kind === 'not-critical' ? `The gradient is not zero here, so this is not a critical point: f increases at rate ‖∇f‖ in the gradient direction. The second-derivative test applies only where ∇f = 0. (The Hessian still describes local curvature.)`
    : c.kind === 'minimum' ? 'det H > 0 and f_xx > 0: both principal curvatures are positive, so the critical point is a strict local minimum.'
      : c.kind === 'maximum' ? 'det H > 0 and f_xx < 0: both principal curvatures are negative — a strict local maximum.'
        : c.kind === 'saddle' ? 'det H < 0: the principal curvatures have opposite signs. f rises along one direction and falls along the other — a saddle.'
          : `det H = 0: the test is INCONCLUSIVE. The quadratic model cannot decide; ${s.fn === 'quartic' ? 'here higher-order terms make it a minimum' : s.fn === 'monkey' ? 'here higher-order terms make it a (monkey) saddle' : s.fn === 'cubic-y' ? 'here the y³ term makes it neither a minimum nor a maximum' : 'higher-order terms decide'}.`;
  const frames = traceFrom<CalcFrame>([
    { state: { semantic: { gradient: g, critical: isZeroVec(g) }, title: 'Is the point critical?', detail: isZeroVec(g) ? '∇f = 0: the test may be applied.' : 'The gradient is not zero: the point is not critical.', formula: formulas[0]! } satisfies CalcFrame },
    { state: { semantic: { hessian: h, symmetric: sym }, title: 'Compute the Hessian', detail: `Second partials in both mixed orders: f_xy = ${rtext(h.fxy)}, f_yx = ${rtext(h.fyx)}.`, formula: formulas[0]! } satisfies CalcFrame },
    { state: { semantic: { det: c.det, trace: c.trace, kind: c.kind }, title: 'Apply the second-derivative test', detail: verdict, formula: formulas[1]! } satisfies CalcFrame },
  ]);
  return {
    rows, formulas, verdict, status: c.kind, caution: c.kind === 'inconclusive' || c.kind === 'not-critical', scenes: [map, model], frames,
    hint: 'Drag the point, or use the arrow keys: left/right change x, up/down change y (steps of 0.25). Numeric fields control the same state.',
    metrics: { x: s.x, y: s.y, det: toNumber(c.det), trace: toNumber(c.trace), kind: c.kind, l1: e.values[0], l2: e.values[1], curvature },
  };
}
