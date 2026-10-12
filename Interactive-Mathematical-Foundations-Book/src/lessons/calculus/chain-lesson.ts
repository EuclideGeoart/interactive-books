/** III.6 — the chain rule: x → u = g(x) → y = f(u), local sensitivities multiply. */
import { fromDecimal, type Rational } from '../../math/quantity/rational';
import { chain, INNER, OUTER } from '../../math/calculus/chain';
import { traceFrom } from '../../platform/trace';
import type { WorldWindow } from '../../platform/geometry/viewport';
import {
  cachedCurve, exactDesc, gtex, gtext, givenDesc, lineThrough, row, scene, spec, undefinedDesc, valueDesc, valueTex, valueText,
  type CalcChoice, type CalcDerived, type CalcFrame,
} from './calculus-view';

export interface ChainState { inner: string; outer: string; x: number; dx: number }
export const CHAIN_CANONICAL: ChainState = { inner: 'square', outer: 'cube', x: 2, dx: 0.5 };
export const chainPresets = [
  { id: 'polynomial', label: 'Exact: (x²/2 − 1)³/4', state: CHAIN_CANONICAL },
  { id: 'flat-inner', label: 'Inner slope 0 (x = 0)', state: { ...CHAIN_CANONICAL, x: 0 } },
  { id: 'sin-exp', label: 'exp(sin x) (binary64)', state: { inner: 'sin', outer: 'exp', x: 1, dx: 0.5 } },
  { id: 'linear-sin', label: 'sin(2x − 1)', state: { inner: 'linear', outer: 'sin', x: 0.5, dx: 0.5 } },
  { id: 'large-step', label: 'Large Δx = 1.5', state: { ...CHAIN_CANONICAL, dx: 1.5 } },
] as const satisfies readonly { id: string; label: string; state: ChainState }[];
export const chainSpecs = { x: spec('x', 2, 'input x', 'x', -2.5, 2.5, 0.25), dx: spec('dx', 0.5, 'input change Δx', '\\Delta x', -1.5, 1.5, 0.25) };
export const chainChoices = (): readonly CalcChoice[] => [
  { field: 'inner', legend: 'Inner function u = g(x)', options: [{ id: 'square', label: 'x²/2 − 1' }, { id: 'linear', label: '2x − 1' }, { id: 'sin', label: 'sin x' }] },
  { field: 'outer', legend: 'Outer function y = f(u)', options: [{ id: 'cube', label: 'u³/4' }, { id: 'sin', label: 'sin u' }, { id: 'exp', label: 'eᵘ' }] },
];
const W: WorldWindow = { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };

const bare = (v: { value: number; exact?: Rational }) => valueText(v).replace(/^≈ /, '');
export function deriveChain(s: ChainState): CalcDerived {
  const g = INNER[s.inner] ?? INNER.square!, f = OUTER[s.outer] ?? OUTER.cube!, X = fromDecimal(s.x, 2)!, DX = fromDecimal(s.dx, 2)!;
  const c = chain(g, f, X, DX), u = c.u.value, y = c.y.value;
  const inner = scene('inner', `Inner: u = ${g.text('x')}`, '', W), outer = scene('outer', `Outer: y = ${f.text('u')}`, '', W), whole = scene('composite', `Composite: y = f(g(x))`, '', W);
  inner.curves.push({ name: 'g', lines: cachedCurve(`g-${g.id}`, g.value, W), role: 'x', width: 2.5 });
  outer.curves.push({ name: 'f', lines: cachedCurve(`f-${f.id}`, f.value, W), role: 'y', width: 2.5 });
  whole.curves.push({ name: 'h', lines: cachedCurve(`h-${g.id}-${f.id}`, t => f.value(g.value(t)), W), role: 'ink', width: 2.5 });
  inner.segments.push({ name: 'tangent-g', ...lineThrough({ x: s.x, y: u }, c.innerSlope.value, W), role: 'derived', dashed: true, width: 2 });
  outer.segments.push({ name: 'tangent-f', ...lineThrough({ x: u, y }, c.outerSlope.value, W), role: 'derived', dashed: true, width: 2 });
  whole.segments.push({ name: 'tangent-h', ...lineThrough({ x: s.x, y }, c.product.value, W), role: 'primary', width: 2.5 });
  // Propagate the actual increment Δx → Δu → Δy as segments.
  inner.segments.push({ name: 'du', from: { x: s.x + s.dx, y: u }, to: { x: s.x + s.dx, y: u + c.du.value }, role: 'x', width: 3.5 });
  outer.segments.push({ name: 'dy', from: { x: u + c.du.value, y }, to: { x: u + c.du.value, y: y + c.dy.value }, role: 'y', width: 3.5 });
  outer.markers.push({ name: 'u-plus', at: { x: u + c.du.value, y: y + c.dy.value }, role: 'y', filled: false });
  inner.markers.push({ name: 'x-plus', at: { x: s.x + s.dx, y: u + c.du.value }, role: 'x', filled: false });
  outer.markers.push({ name: 'u-now', at: { x: u, y }, role: 'y', filled: true });
  whole.markers.push({ name: 'y-now', at: { x: s.x, y }, role: 'ink', filled: true });
  inner.handles.push({ id: 'x', label: `input x = ${gtext(s.x)}, u = g(x) ${c.u.exact ? '= ' : ''}${valueText(c.u)}`, at: { x: s.x, y: u }, role: 'primary', xField: 'x', step: 0.25 });
  inner.description = `u = ${g.text('x')}; at x = ${gtext(s.x)}, u = ${valueText(c.u)} and the local factor du/dx = ${valueText(c.innerSlope)}. A step Δx = ${gtext(s.dx)} changes u by ${valueText(c.du)}.`;
  outer.description = `y = ${f.text('u')}; at u = ${valueText(c.u)}, y = ${valueText(c.y)} and dy/du = ${valueText(c.outerSlope)}. The change Δu produces Δy = ${valueText(c.dy)}.`;
  whole.description = `Composite y = f(g(x)); its tangent slope at x = ${gtext(s.x)} is the product ${valueText(c.outerSlope)} × ${valueText(c.innerSlope)} = ${valueText(c.product)}.`;
  const x = gtex(s.x), rel = c.product.exact ? '=' : '\\approx';
  const formulas = [
    `x=${x}\\ \\xrightarrow{\\;g\\;}\\ u${c.u.exact ? '=' : '\\approx'}${valueTex(c.u)}\\ \\xrightarrow{\\;f\\;}\\ y${c.y.exact ? '=' : '\\approx'}${valueTex(c.y)}`,
    `\\frac{dy}{dx}=\\underbrace{f'(u)}_{${valueTex(c.outerSlope)}}\\cdot\\underbrace{g'(x)}_{${valueTex(c.innerSlope)}}${rel}${valueTex(c.product)}`,
    `\\Delta u${c.du.exact ? '=' : '\\approx'}${valueTex(c.du)}\\ (\\text{linear: }${c.duLinear.exact ? '' : '\\approx'}${valueTex(c.duLinear)})`,
    `\\Delta y${c.dy.exact ? '=' : '\\approx'}${valueTex(c.dy)}\\ (\\text{linear: }${c.dyLinear.exact ? '' : '\\approx'}${valueTex(c.dyLinear)})`,
    ...(c.composed ? [`h'(${x})=${valueTex(c.direct!)}\\quad\\text{(composed, then differentiated)}`] : []),
  ];
  const rows = [
    row('x', 'x', 'Input', givenDesc(s.x), 'primary'), row('u', 'u', 'Intermediate value g(x)', valueDesc(c.u), 'x'), row('y', 'y', 'Output f(u)', valueDesc(c.y), 'y'),
    row('gp', "g'(x)", 'Inner sensitivity du/dx', valueDesc(c.innerSlope), 'x'), row('fp', "f'(u)", 'Outer sensitivity dy/du, at u', valueDesc(c.outerSlope), 'y'),
    row('product', "f'(u)g'(x)", 'Chain-rule product dy/dx', valueDesc(c.product), 'primary'),
    row('direct', "h'(x)", 'Derivative of the composed formula', c.direct ? valueDesc(c.direct) : undefinedDesc('Only computed when both stages are exact polynomials.'), 'derived'),
    row('agree', '=', 'Exact agreement', c.agree === null ? undefinedDesc('Binary64 stages: no exact comparison is claimed.') : exactDesc(c.agree ? 'yes, exactly equal' : 'NO — a defect'), 'derived', true),
    row('dy', '\\Delta y', 'Actual output change', valueDesc(c.dy), 'y', true), row('dyl', "f'g'\\Delta x", 'Linearized output change', valueDesc(c.dyLinear), 'derived', true),
  ];
  const verdict = c.innerSlope.value === 0 ? `The inner function is flat here (g′(${gtext(s.x)}) = 0): a small change in x barely moves u, so the whole chain is insensitive, whatever f′(u) is.`
    : Math.abs(s.dx) >= 1.5 ? `With a large Δx the linearized change ${valueText(c.dyLinear)} misses the actual change ${valueText(c.dy)}: the chain rule is a statement about LOCAL rates.`
      : `Sensitivities multiply: dy/dx = f′(u)·g′(x), here ${bare(c.outerSlope)} × ${bare(c.innerSlope)} ${c.product.exact ? '=' : '≈'} ${bare(c.product)}${c.product.exact ? ' exactly' : ' (binary64 approximations)'}. The outer slope is evaluated at u = g(x), not at x.`;
  const frames = traceFrom<CalcFrame>([
    { state: { semantic: { x: X, u: c.u }, title: 'Forward: inner stage', detail: `u = g(${gtext(s.x)}) ${c.u.exact ? '= ' : ''}${valueText(c.u)}.`, formula: `u=g(${x})${c.u.exact ? '=' : '\\approx'}${valueTex(c.u)}` } satisfies CalcFrame },
    { state: { semantic: { u: c.u, y: c.y }, title: 'Forward: outer stage', detail: `y = f(u) ${c.y.exact ? '= ' : ''}${valueText(c.y)}.`, formula: `y=f(u)${c.y.exact ? '=' : '\\approx'}${valueTex(c.y)}` } satisfies CalcFrame },
    { state: { semantic: { local: [c.innerSlope, c.outerSlope] }, title: 'Local factors', detail: `Each stage reports its own derivative at its own input: g′(x) ${c.innerSlope.exact ? '= ' : ''}${valueText(c.innerSlope)}, f′(u) ${c.outerSlope.exact ? '= ' : ''}${valueText(c.outerSlope)}.`, formula: `g'(${x})${c.innerSlope.exact ? '=' : '\\approx'}${valueTex(c.innerSlope)},\\quad f'(u)${c.outerSlope.exact ? '=' : '\\approx'}${valueTex(c.outerSlope)}` } satisfies CalcFrame },
    { state: { semantic: { product: c.product, direct: c.direct, agree: c.agree }, title: 'Multiply backward', detail: `Starting from dy/dy = 1, multiply by f′(u), then by g′(x): ${valueText(c.product)}. This backward product is exactly what automatic differentiation (III.10) does on a larger graph.`, formula: formulas[1]! } satisfies CalcFrame },
  ]);
  return {
    rows, formulas, verdict, status: c.innerSlope.value === 0 ? 'flat' : Math.abs(s.dx) >= 1.5 ? 'nonlocal' : c.agree === null ? 'numeric' : 'exact', caution: c.innerSlope.value === 0 || Math.abs(s.dx) >= 1.5,
    scenes: [inner, outer, whole], frames,
    hint: 'The input point rides on the inner graph: drag horizontally, or use the left and right arrow keys (steps of 0.25). Numeric fields control the same state.',
    metrics: { x: s.x, u, y, gp: c.innerSlope.value, fp: c.outerSlope.value, product: c.product.value, direct: c.direct?.value ?? null, agree: c.agree, dx: s.dx },
  };
}
