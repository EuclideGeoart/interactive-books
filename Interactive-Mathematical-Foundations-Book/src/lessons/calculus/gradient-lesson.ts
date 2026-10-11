/** III.8 — gradient and directional derivatives on a contour map. */
import { div, fromDecimal, isqrt, isZero, mul, toNumber, type Rational } from '../../math/quantity/rational';
import { dot2, eval2, eval2Number, gradient, isZeroVec, poly2Text } from '../../math/calculus/bivariate';
import { SURFACES } from '../../math/calculus/surfaces';
import { traceFrom } from '../../platform/trace';
import type { WorldWindow } from '../../platform/geometry/viewport';
import { cachedCurve, exactDesc, gtex, gtext, numericDesc, ratDesc, row, rtex, rtext, scene, spec, undefinedDesc, type CalcDerived, type CalcFrame } from './calculus-view';
import { cachedContours } from './contour-view';

export interface GradientState { fn: string; x: number; y: number; dx: number; dy: number }
export const GRADIENT_CANONICAL: GradientState = { fn: 'elliptic', x: 1, y: 0.5, dx: 1, dy: 0 };
export const gradientPresets = [
  { id: 'elliptic', label: 'Valley x²/2 + 2y²', state: GRADIENT_CANONICAL },
  { id: 'steepest', label: 'Along the gradient', state: { ...GRADIENT_CANONICAL, dx: 1, dy: 2 } },
  { id: 'level', label: 'Along the level curve', state: { ...GRADIENT_CANONICAL, dx: -2, dy: 1 } },
  { id: 'stationary', label: 'Stationary point', state: { ...GRADIENT_CANONICAL, x: 0, y: 0 } },
  { id: 'zero-direction', label: 'Zero direction', state: { ...GRADIENT_CANONICAL, dx: 0, dy: 0 } },
  { id: 'saddle', label: 'Saddle x² − y²', state: { fn: 'saddle', x: 1, y: 1, dx: 1, dy: 0 } },
  { id: 'plane', label: 'Tilted plane', state: { fn: 'plane', x: 0, y: 0, dx: 1, dy: 0 } },
] as const satisfies readonly { id: string; label: string; state: GradientState }[];
export const gradientSpecs = {
  x: spec('x', 1, 'point x', 'x', -2.5, 2.5, 0.25), y: spec('y', 0.5, 'point y', 'y', -2.5, 2.5, 0.25),
  dx: spec('dx', 1, 'direction d₁', 'd_1', -2, 2, 0.25), dy: spec('dy', 0, 'direction d₂', 'd_2', -2, 2, 0.25),
};
const MAP: WorldWindow = { xMin: -2.5, xMax: 2.5, yMin: -2.5, yMax: 2.5 };
/** √q exactly when q is the square of a rational. */
function exactSqrt(q: Rational): Rational | null { const a = isqrt(q.num), b = isqrt(q.den); return a * a === q.num && b * b === q.den ? { num: a, den: b } : null; }

export function deriveGradient(s: GradientState): CalcDerived {
  const S = SURFACES[s.fn] ?? SURFACES.elliptic!, f = S.f, X = fromDecimal(s.x, 2)!, Y = fromDecimal(s.y, 2)!, D: readonly [Rational, Rational] = [fromDecimal(s.dx, 2)!, fromDecimal(s.dy, 2)!];
  const g = gradient(f, X, Y), z = eval2(f, X, Y), gd = dot2(g, D), dd = dot2(D, D), gg = dot2(g, g);
  const dNorm = exactSqrt(dd), gNorm = exactSqrt(gg), gNum = Math.hypot(toNumber(g[0]), toNumber(g[1]));
  const zeroD = isZero(dd), stationary = isZeroVec(g);
  const duExact = !zeroD && dNorm ? div(gd, dNorm) : null;
  const du = zeroD ? null : { value: duExact ? toNumber(duExact) : toNumber(gd) / Math.sqrt(toNumber(dd)) };
  const tangent: readonly [Rational, Rational] = [mul(g[1], { num: -1n, den: 1n }), g[0]];
  const perp = dot2(g, tangent);
  const P = { x: s.x, y: s.y }, k = S.arrowScale;
  const map = scene('map', `Gradient (drawn ×${k}) on the contours of f = ${poly2Text(f)}`, '', MAP);
  map.curves.push({ name: 'contours', lines: cachedContours(S.id, (a, b) => eval2Number(f, a, b), MAP, S.levels), role: 'ink', width: 1.4 });
  if (!stationary) {
    map.arrows.push({ name: 'gradient', from: P, to: { x: s.x + k * toNumber(g[0]), y: s.y + k * toNumber(g[1]) }, role: 'primary' });
    const t = { x: -toNumber(g[1]) / gNum, y: toNumber(g[0]) / gNum };
    map.segments.push({ name: 'level-tangent', from: { x: s.x - 1.2 * t.x, y: s.y - 1.2 * t.y }, to: { x: s.x + 1.2 * t.x, y: s.y + 1.2 * t.y }, role: 'derived', dashed: true, width: 2 });
    map.labels.push({ name: 'label-gradient', at: { x: s.x + k * toNumber(g[0]), y: s.y + k * toNumber(g[1]) }, text: '∇f', role: 'primary', dx: 14, dy: -10 });
  }
  if (!zeroD) {
    const n = Math.sqrt(toNumber(dd));
    map.arrows.push({ name: 'unit-direction', from: P, to: { x: s.x + toNumber(D[0]) / n, y: s.y + toNumber(D[1]) / n }, role: 'x' });
  }
  const tip = { x: s.x + s.dx, y: s.y + s.dy };
  map.handles.push({ id: 'd', label: `direction tip, d = (${gtext(s.dx)}, ${gtext(s.dy)})`, at: tip, role: 'x', xField: 'dx', step: 0.25,
    spec: { ...gradientSpecs.dx, id: 'd-tip-x', domain: { min: s.x - 2, max: s.x + 2 } }, ySpec: { ...gradientSpecs.dy, id: 'd-tip-y', domain: { min: s.y - 2, max: s.y + 2 } },
    write: (a, b) => ({ dx: Number((a - s.x).toFixed(2)) + 0, dy: Number((b - s.y).toFixed(2)) + 0 }) });
  // The point is drawn after (on top of) the direction tip, so a zero direction never hides it.
  map.handles.push({ id: 'p', label: `point (${gtext(s.x)}, ${gtext(s.y)}), f = ${rtext(z)}`, at: P, role: 'primary', xField: 'x', yField: 'y', step: 0.25 });
  map.description = `Contours of f = ${poly2Text(f)}. At (${gtext(s.x)}, ${gtext(s.y)}) the gradient is (${rtext(g[0])}, ${rtext(g[1])})`
    + (stationary ? ', the zero vector: a stationary point with no steepest direction. ' : `, drawn at scale ${k}; the dashed line is tangent to the level curve and perpendicular to it. `)
    + (zeroD ? 'The direction vector is zero, so no unit direction exists.' : `The blue arrow is the unit direction of d = (${gtext(s.dx)}, ${gtext(s.dy)}).`);
  // Directional derivative as a function of the direction angle: |∇f| cos(θ − θ∇).
  const M = Math.max(1, Math.ceil(gNum * 2.4) / 2), prof: WorldWindow = { xMin: -3.3, xMax: 3.3, yMin: -M, yMax: M };
  const profile = scene('profile', 'Directional derivative versus direction angle θ (radians)', '', prof);
  const tg = Math.atan2(toNumber(g[1]), toNumber(g[0]));
  profile.curves.push({ name: 'profile', lines: cachedCurve(`du-${S.id}-${s.x}-${s.y}-${M}`, th => gNum * Math.cos(th - tg), prof), role: 'primary', width: 2.5 });
  if (!zeroD) { const th = Math.atan2(s.dy, s.dx); profile.markers.push({ name: 'current', at: { x: th, y: du!.value }, role: 'x', filled: true }); }
  if (!stationary) profile.markers.push({ name: 'steepest', at: { x: tg, y: gNum }, role: 'primary', filled: false });
  profile.description = stationary ? 'At a stationary point every directional derivative is 0: the profile is the flat line at height 0.'
    : `The directional derivative ∇f·u = |∇f| cos(θ − θ∇) peaks at θ∇ ≈ ${tg.toFixed(3)} with value |∇f| ≈ ${gNum.toFixed(6)} and is 0 along the level curve.`;
  const g0 = rtex(g[0]), g1 = rtex(g[1]);
  const formulas = [
    `\\nabla f(${gtex(s.x)},${gtex(s.y)})=\\begin{bmatrix}${g0}\\\\${g1}\\end{bmatrix}`,
    `\\|\\nabla f\\|${gNorm ? `=${rtex(gNorm)}` : `=\\sqrt{${rtex(gg)}}\\approx ${gNum.toFixed(6)}`}`,
    zeroD ? `\\mathbf d=\\mathbf 0\\ \\Rightarrow\\ \\mathbf u=\\mathbf d/\\|\\mathbf d\\|\\ \\text{is undefined}`
      : `D_{\\mathbf u}f=\\nabla f\\cdot\\frac{\\mathbf d}{\\|\\mathbf d\\|}=\\frac{${rtex(gd)}}{${dNorm ? rtex(dNorm) : `\\sqrt{${rtex(dd)}}`}}${duExact ? `=${rtex(duExact)}` : `\\approx ${du!.value.toFixed(6)}`}`,
    `\\nabla f\\cdot\\mathbf t=(${g0})(${rtex(tangent[0])})+(${g1})(${rtex(tangent[1])})=${rtex(perp)}`,
  ];
  const rows = [
    row('point', '(x,y)', 'Point', exactDesc(`(${gtext(s.x)}, ${gtext(s.y)})`), 'primary'),
    row('grad', '\\nabla f', 'Gradient (exact)', exactDesc(`(${rtext(g[0])}, ${rtext(g[1])})`), 'primary'),
    row('norm', '\\|\\nabla f\\|', 'Steepest rate of increase', gNorm ? ratDesc(gNorm) : numericDesc(gNum), 'primary'),
    row('d', '\\mathbf d', 'Direction vector', exactDesc(`(${gtext(s.dx)}, ${gtext(s.dy)})`), 'x'),
    row('gd', '\\nabla f\\cdot\\mathbf d', 'Unnormalised rate (exact)', ratDesc(gd), 'x', true),
    row('du', 'D_{\\mathbf u}f', 'Directional derivative', zeroD ? undefinedDesc('d = 0 has no direction: a unit vector u cannot be formed.') : duExact ? ratDesc(duExact) : numericDesc(du!.value), 'x'),
    row('perp', '\\nabla f\\cdot\\mathbf t', 'Gradient · level tangent', ratDesc(perp), 'derived', true),
  ];
  const status = stationary ? 'stationary' : zeroD ? 'zero-direction' : isZero(gd) ? 'level' : 'directional';
  const verdict = stationary ? 'The gradient is zero: f has a stationary point here. Every directional derivative is 0 and there is no direction of steepest increase — a minimum, maximum or saddle is decided by second derivatives (III.11).'
    : zeroD ? 'The zero vector has no direction, so the directional derivative is undefined. Choose any nonzero d.'
      : status === 'level' ? 'This direction runs along the level curve: the directional derivative is exactly 0, because the gradient is perpendicular to the level curve.'
        : `Moving in direction u changes f at rate ${duExact ? rtext(duExact) : `≈ ${du!.value.toFixed(6)}`}, between −|∇f| and |∇f|. The maximum ${gNorm ? rtext(gNorm) : `≈ ${gNum.toFixed(6)}`} occurs along ∇f itself.`;
  const frames = traceFrom<CalcFrame>([
    { state: { semantic: { gradient: g }, title: 'Compute the gradient', detail: `The partial derivatives at the point form ∇f = (${rtext(g[0])}, ${rtext(g[1])}).`, formula: formulas[0]! } satisfies CalcFrame },
    { state: { semantic: { d: D, unit: zeroD ? null : true }, title: 'Normalise the direction', detail: zeroD ? 'd = 0 cannot be normalised.' : `u = d/‖d‖ with ‖d‖² = ${rtext(dd)}.`, formula: zeroD ? formulas[2]! : `\\|\\mathbf d\\|^2=${rtex(dd)}` } satisfies CalcFrame },
    { state: { semantic: { du: du?.value ?? null }, title: 'Project the gradient on u', detail: verdict, formula: formulas[2]! } satisfies CalcFrame },
    { state: { semantic: { perpendicular: perp }, title: 'Perpendicular to the level curve', detail: 'Along the level curve f does not change, so the gradient has zero component there.', formula: formulas[3]! } satisfies CalcFrame },
  ]);
  return {
    rows, formulas, verdict, status, caution: stationary || zeroD, scenes: [map, profile], frames,
    hint: 'Drag the point or the blue direction tip; arrow keys move the focused handle (left/right horizontally, up/down vertically, steps of 0.25). Numeric fields control the same state.',
    metrics: { x: s.x, y: s.y, gx: toNumber(g[0]), gy: toNumber(g[1]), du: du?.value ?? null, norm: gNum, perp: toNumber(perp), status, scale: k },
  };
}
