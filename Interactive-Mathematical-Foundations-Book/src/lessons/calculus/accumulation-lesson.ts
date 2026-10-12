/** III.13 — the accumulation function F(x) = ∫ₐˣ f(t) dt and why F′(x) = f(x) where f is continuous. */
import { add, div, fromDecimal, mul as mulR, sub, toNumber } from '../../math/quantity/rational';
import { accumulation, INTEGRANDS, integrandText, type ExactIntegrand } from '../../math/calculus/integration';
import { polyTex } from '../../math/calculus/polynomial';
import { traceFrom } from '../../platform/trace';
import type { Point, WorldWindow } from '../../platform/geometry/viewport';
import {
  cachedCurve, gtex, gtext, givenDesc, lineThrough, oneSidedText, pointDesc, ratDesc, row, rtex, rtext, scene, spec, undefinedDesc, valueDesc, valueText,
  type CalcDerived, type CalcFrame,
} from './calculus-view';

export interface AccumulationState { fn: string; a: number; x: number; dx: number }
export const ACCUMULATION_CANONICAL: AccumulationState = { fn: 'cubic', a: -2, x: 1, dx: 0.5 };
export const accumulationPresets = [
  { id: 'cubic', label: 'Sign changes: x³/4 − x', state: ACCUMULATION_CANONICAL },
  { id: 'peak', label: 'F turns where f = 0', state: { ...ACCUMULATION_CANONICAL, x: 2 } },
  { id: 'lower', label: 'Move the lower limit', state: { ...ACCUMULATION_CANONICAL, a: 0 } },
  { id: 'backward', label: 'x < a', state: { ...ACCUMULATION_CANONICAL, a: 1, x: -1 } },
  { id: 'jump', label: 'Jump in f: corner in F', state: { fn: 'step', a: -1, x: 1, dx: 0.5 } },
  { id: 'linear', label: 'Linear f, quadratic F', state: { fn: 'linear', a: -1, x: 2, dx: 0.5 } },
] as const satisfies readonly { id: string; label: string; state: AccumulationState }[];
export const accumulationSpecs = {
  a: spec('a', -2, 'lower limit a', 'a', -3, 3, 0.25), x: spec('x', 1, 'upper limit x', 'x', -3, 3, 0.25),
  dx: spec('dx', 0.5, 'increment Δx', '\\Delta x', -1, 1, 0.25),
};
const FW: WorldWindow = { xMin: -3.25, xMax: 3.25, yMin: -3.5, yMax: 4.5 };
const FRANGE: Record<string, [number, number]> = { cubic: [-4, 4], linear: [-5, 5], step: [-4, 4], parabola: [-10, 10] };
const fnOf = (s: AccumulationState): ExactIntegrand => { const g = INTEGRANDS[s.fn]; return g && g.kind === 'exact' ? g : INTEGRANDS.cubic as ExactIntegrand; };

export function deriveAccumulation(s: AccumulationState): CalcDerived {
  const g = fnOf(s), A = fromDecimal(s.a, 2)!, X = fromDecimal(s.x, 2)!, DX = fromDecimal(s.dx, 2)!;
  const F = accumulation(g, A), Fx = F.at(X), FxDx = F.at(add(X, DX)), fx = g.f.at(X), dF = F.slope(X);
  const exact = (v: typeof Fx) => (v.kind === 'value' ? v.exact! : null);
  const delta = exact(Fx) && exact(FxDx) ? sub(exact(FxDx)!, exact(Fx)!) : null;
  const ratio = delta && DX.num !== 0n ? div(delta, DX) : null;
  const fdx = fx.kind === 'value' && fx.exact ? { value: toNumber(fx.exact) * s.dx, exact: mulR(fx.exact, DX) } : null;
  // Signed area under f between a and x, drawn as two polygons: the part above the axis and the part below.
  const samples: Point[] = Array.from({ length: 97 }, (_, k) => { const t = s.a + (s.x - s.a) * k / 96, y = g.f.number(t); return { x: t, y: y ?? 0 }; });
  const fill = (pick: (y: number) => number) => [{ x: s.a, y: 0 }, ...samples.map(p => ({ x: p.x, y: pick(p.y) })), { x: s.x, y: 0 }];
  const fPlot = scene('integrand', `f(t) = ${integrandText(g)} with the accumulated area from a to x`, '', FW);
  fPlot.polygons.push({ name: 'area-positive', corners: fill(y => Math.max(0, y)), role: 'y' }, { name: 'area-negative', corners: fill(y => Math.min(0, y)), role: 'caution' });
  const strip: Point[] = Array.from({ length: 17 }, (_, k) => { const t = s.x + s.dx * k / 16; return { x: t, y: g.f.number(t) ?? 0 }; });
  fPlot.polygons.push({ name: 'strip', corners: [{ x: s.x, y: 0 }, ...strip, { x: s.x + s.dx, y: 0 }], role: 'primary' });
  fPlot.curves.push({ name: 'f', lines: cachedCurve(g.id, t => g.f.number(t), FW, g.f.breaks), role: 'ink', width: 2.5 });
  fPlot.handles.push({ id: 'a', label: `lower limit a = ${gtext(s.a)}`, at: { x: s.a, y: 0 }, role: 'x', xField: 'a', step: 0.25 });
  fPlot.handles.push({ id: 'x', label: `upper limit x = ${gtext(s.x)}, f(x) ${fx.kind === 'value' ? '= ' + valueText(fx) : 'undefined'}`, at: { x: s.x, y: fx.kind === 'value' ? fx.value : 0 }, role: 'primary', xField: 'x', step: 0.25 });
  fPlot.description = `f(t) = ${integrandText(g)}. Green: area above the axis between a = ${gtext(s.a)} and x = ${gtext(s.x)}; gold: area below (subtracted). The orange strip from x to x + Δx has signed area ΔF = ${delta ? rtext(delta) : 'undefined'}, close to f(x)·Δx = ${fdx ? rtext(fdx.exact) : 'undefined'}.`;
  const [lo, hi] = FRANGE[s.fn] ?? [-5, 5], GW: WorldWindow = { xMin: -3.25, xMax: 3.25, yMin: lo, yMax: hi };
  const Fplot = scene('accumulated', 'Accumulated quantity F(x) = ∫ₐˣ f(t) dt', '', GW);
  Fplot.curves.push({ name: 'F', lines: cachedCurve(`F-${g.id}-${s.a}`, t => F.number(t), GW, F.breaks), role: 'derived', width: 2.5 });
  const P = { x: s.x, y: Fx.kind === 'value' ? Fx.value : 0 };
  if (dF.kind === 'value') Fplot.segments.push({ name: 'tangent', ...lineThrough(P, dF.value!, GW), role: 'primary', dashed: true, width: 2 });
  if (delta) Fplot.segments.push({ name: 'secant', from: P, to: { x: s.x + s.dx, y: P.y + toNumber(delta) }, role: 'y', width: 3 });
  Fplot.markers.push({ name: 'F-point', at: P, role: 'derived', filled: true }, { name: 'a-point', at: { x: s.a, y: 0 }, role: 'x', filled: false });
  Fplot.description = `F starts at 0 at x = a = ${gtext(s.a)} and accumulates signed area. At x = ${gtext(s.x)}, F = ${Fx.kind === 'value' ? valueText(Fx) : 'undefined'}; `
    + (dF.kind === 'value' ? `its slope there is ${valueText({ value: dF.value!, exact: dF.exact })}, equal to f(x).` : `it has a corner: left slope ${oneSidedText(dF.left)}, right slope ${oneSidedText(dF.right)}.`);
  const formulas = [
    `F(x)=\\int_{${gtex(s.a)}}^{x}f(t)\\,dt`,
    ...(F.pieceFormulas.length === 1 ? [`F(x)=${polyTex(F.pieceFormulas[0]!.poly)}`] : []),
    `F(${gtex(s.x)})=${Fx.kind === 'value' ? rtex(Fx.exact!) : '\\text{undefined}'}`,
    `\\Delta F=\\int_x^{x+\\Delta x}f(t)\\,dt=${delta ? rtex(delta) : '\\text{undefined}'}`,
    `f(x)\\,\\Delta x=${fdx ? rtex(fdx.exact) : '\\text{undefined}'}`,
    dF.kind === 'value' ? `F'(${gtex(s.x)})=\\lim_{\\Delta x\\to0}\\frac{\\Delta F}{\\Delta x}=${rtex(dF.exact!)}=f(${gtex(s.x)})`
      : `F'_-(${gtex(s.x)})=${dF.left.kind === 'finite' ? rtex(dF.left.exact!) : '\\text{none}'}\\ne F'_+(${gtex(s.x)})=${dF.right.kind === 'finite' ? rtex(dF.right.exact!) : '\\text{none}'}`,
  ];
  const rows = [
    row('a', 'a', 'Lower limit (F(a) = 0)', givenDesc(s.a), 'x'), row('x', 'x', 'Upper limit', givenDesc(s.x), 'primary'),
    row('F', 'F(x)', 'Accumulated signed area', pointDesc(Fx), 'derived'), row('f', 'f(x)', 'Integrand at x', pointDesc(fx), 'ink'),
    row('dF', '\\Delta F', 'Change over [x, x + Δx]', delta ? ratDesc(delta) : undefinedDesc('Undefined.'), 'y'),
    row('fdx', 'f(x)\\Delta x', 'Rectangle estimate', fdx ? valueDesc(fdx) : undefinedDesc('Undefined.'), 'primary'),
    row('ratio', '\\Delta F/\\Delta x', 'Average of f over the strip', ratio ? ratDesc(ratio) : undefinedDesc('Δx = 0: no strip.'), 'y', true),
    row('slope', "F'(x)", 'Slope of F (derived from its exact pieces)', dF.kind === 'value' ? valueDesc({ value: dF.value!, exact: dF.exact }) : undefinedDesc(dF.reason!), 'derived'),
  ];
  const status = dF.kind !== 'value' ? 'corner' : fx.kind === 'value' && dF.exact && fx.exact && dF.exact.num * fx.exact.den === fx.exact.num * dF.exact.den ? 'ftc' : 'mismatch';
  const verdict = status === 'corner' ? `f jumps at x = ${gtext(s.x)}, so F has a corner there: its left and right slopes are the one-sided values of f (${oneSidedText(dF.left)} and ${oneSidedText(dF.right)}). F′(x) = f(x) needs f continuous at x.`
    : `The strip from x to x + Δx adds ΔF = ${delta ? rtext(delta) : '?'}, close to f(x)·Δx = ${fdx ? rtext(fdx.exact) : '?'}. As Δx → 0 the ratio ΔF/Δx tends to f(x) = ${fx.kind === 'value' ? valueText(fx) : '?'}: F′(x) = f(x).${s.x < s.a ? ' (x < a: F(x) is minus the area from x to a.)' : ''}`;
  const frames = traceFrom<CalcFrame>([
    { state: { semantic: { a: A, F0: 0 }, title: 'Start the accumulator at a', detail: `F(a) = ∫ from a to a = 0 by definition.`, formula: `F(${gtex(s.a)})=0` } satisfies CalcFrame },
    { state: { semantic: { x: X, F: Fx }, title: 'Accumulate up to x', detail: `F(${gtext(s.x)}) is the signed area from a to x: above-axis parts add, below-axis parts subtract.`, formula: formulas.find(t => t.startsWith(`F(${gtex(s.x)})=`))! } satisfies CalcFrame },
    { state: { semantic: { dx: DX, delta, fdx: fdx?.exact ?? null }, title: 'Add one thin strip', detail: `Over [x, x + Δx] the accumulator grows by ΔF; for small Δx the strip is nearly a rectangle of height f(x).`, formula: formulas.find(t => t.startsWith('\\Delta F'))! } satisfies CalcFrame },
    { state: { semantic: { slope: dF }, title: 'Let the strip shrink', detail: verdict, formula: formulas.at(-1)! } satisfies CalcFrame },
  ]);
  return {
    rows, formulas, verdict, status, caution: status !== 'ftc', scenes: [fPlot, Fplot], frames,
    hint: 'Drag the lower limit marker on the axis or the upper limit point on the graph, or use the left and right arrow keys (steps of 0.25). Numeric fields control the same state.',
    metrics: { a: s.a, x: s.x, dx: s.dx, F: Fx.kind === 'value' ? Fx.value : null, FExact: Fx.kind === 'value' && Fx.exact ? rtext(Fx.exact) : null, f: fx.kind === 'value' ? fx.value : null,
      slope: dF.kind === 'value' ? dF.value! : null, delta: delta ? toNumber(delta) : null, status },
  };
}
