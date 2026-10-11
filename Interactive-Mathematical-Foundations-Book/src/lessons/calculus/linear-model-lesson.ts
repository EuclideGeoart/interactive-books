/** III.4 — the derivative as a rate and the tangent line as a local linear model f(x₀+Δx) ≈ f(x₀) + f′(x₀)Δx. */
import { abs, add, div, fromDecimal, isZero, mul, sub, toNumber, type Rational } from '../../math/quantity/rational';
import { cubic, absolute } from '../../math/calculus/catalog';
import { secant, halvings } from '../../math/calculus/difference';
import { expFn, sinFn, type Univariate } from '../../math/calculus/univariate';
import { traceFrom } from '../../platform/trace';
import type { WorldWindow } from '../../platform/geometry/viewport';
import {
  cachedCurve, gtex, gtext, givenDesc, lineThrough, numericDesc, oneSidedText, pg, pointDesc, row, rtext, scene, spec, undefinedDesc, valueDesc, valueTex, valueText,
  type CalcDerived, type CalcFrame,
} from './calculus-view';

export interface LinearState { fn: string; x0: number; dx: number }
export const LINEAR_CANONICAL: LinearState = { fn: 'cubic', x0: 1, dx: 1 };
export const LINEAR_FUNCTIONS: Readonly<Record<string, Univariate>> = { cubic, sin: sinFn, exp: expFn, abs: absolute };
export const linearPresets = [
  { id: 'cubic', label: 'Position x³/6 − x', state: LINEAR_CANONICAL },
  { id: 'far', label: 'Far away: Δx = 2.5', state: { fn: 'cubic', x0: 1, dx: 2.5 } },
  { id: 'inflection', label: 'At x₀ = 0 (f″ = 0)', state: { fn: 'cubic', x0: 0, dx: 1 } },
  { id: 'sine', label: 'sin x (binary64)', state: { fn: 'sin', x0: 0.5, dx: 1 } },
  { id: 'exp', label: 'eˣ (binary64)', state: { fn: 'exp', x0: 0, dx: 1 } },
  { id: 'corner', label: 'Corner |x| at 0', state: { fn: 'abs', x0: 0, dx: 1 } },
] as const satisfies readonly { id: string; label: string; state: LinearState }[];
export const linearSpecs = {
  x0: spec('x0', 1, 'expansion point x₀', 'x_0', -2.5, 2.5, 0.25),
  dx: spec('dx', 1, 'displacement Δx', '\\Delta x', -3, 3, 0.25),
};
export const LINEAR_WINDOW: WorldWindow = { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
export const ERROR_WINDOW: WorldWindow = { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
const fnOf = (s: LinearState) => LINEAR_FUNCTIONS[s.fn] ?? cubic;
type Num = { value: number; exact?: Rational };
const exactOr = (e: Rational | undefined, v: number): Num => (e ? { value: toNumber(e), exact: e } : { value: v });

export interface LocalModel { fx: Num; slope: Num; linear: Num; actual: Num; error: Num; relative: Num | null; curvatureRatio: Num | null }
/** The local linear model at x₀ evaluated at Δx, with its exact error when f is exact. Null when f′(x₀) does not exist. */
export function localModel(f: Univariate, X0: Rational, D: Rational): LocalModel | null {
  const v = f.at(X0), d = f.slope(X0), w = f.at(add(X0, D));
  if (v.kind !== 'value' || d.kind !== 'value' || w.kind !== 'value') return null;
  const ex = v.exact && d.exact && w.exact;
  const linE = ex ? add(v.exact!, mul(d.exact!, D)) : undefined, linear = exactOr(linE, v.value + d.value! * toNumber(D));
  const errE = ex ? sub(w.exact!, linE!) : undefined, error = exactOr(errE, w.value - linear.value);
  const relative = isZero(D) ? null : exactOr(errE ? div(errE, D) : undefined, error.value / toNumber(D));
  const curvatureRatio = isZero(D) ? null : exactOr(errE ? div(errE, mul(D, D)) : undefined, error.value / toNumber(D) ** 2);
  return { fx: v, slope: { value: d.value!, exact: d.exact }, linear, actual: w, error, relative, curvatureRatio };
}

export function deriveLinear(s: LinearState): CalcDerived {
  const f = fnOf(s), X0 = fromDecimal(s.x0, 2)!, D = fromDecimal(s.dx, 2)!;
  const model = localModel(f, X0, D), d = f.slope(X0), fx = f.at(X0), fq = f.at(add(X0, D)), f2 = f.second(X0);
  const avg = secant(f, X0, D);
  const status = !model ? 'no-derivative' : Math.abs(s.dx) >= 2 ? 'far' : 'local';
  const P = { x: s.x0, y: fx.kind === 'value' ? fx.value : 0 }, qx = s.x0 + s.dx, Q = { x: qx, y: fq.kind === 'value' ? fq.value : 0 };
  const plot = scene('graph', `Tangent model of f(x) = ${f.text} at x₀ = ${gtext(s.x0)}`, '', LINEAR_WINDOW);
  plot.curves.push({ name: 'graph', lines: cachedCurve(f.id, f.number, LINEAR_WINDOW, f.breaks), role: 'ink', width: 2.5 });
  if (model) {
    plot.segments.push({ name: 'tangent', ...lineThrough(P, model.slope.value, LINEAR_WINDOW), role: 'derived', width: 2.5 });
    plot.markers.push({ name: 'model-point', at: { x: qx, y: model.linear.value }, role: 'derived', filled: false });
    plot.segments.push({ name: 'error', from: { x: qx, y: model.linear.value }, to: Q, role: 'caution', width: 3.5 });
    plot.labels.push({ name: 'label-model', at: { x: qx, y: model.linear.value }, text: 'L', role: 'derived', dx: s.dx >= 0 ? 14 : -14, dy: 0 });
  }
  plot.segments.push({ name: 'run', from: P, to: { x: qx, y: P.y }, role: 'x', dashed: true, width: 1.5 });
  plot.handles.push({ id: 'x0', label: `expansion point x₀ = ${gtext(s.x0)}, f(x₀) ${fx.kind === 'value' ? (fx.exact ? '= ' : '') + valueText(fx) : 'undefined'}`, at: P, role: 'primary', xField: 'x0', step: 0.25 });
  plot.handles.push({ id: 'q', label: `displaced point x₀ + Δx = ${gtext(qx)}, f ${fq.kind === 'value' ? (fq.exact ? '= ' : '') + valueText(fq) : 'undefined'}`, at: Q, role: 'x', xField: 'dx', step: 0.25,
    spec: { ...linearSpecs.dx, id: 'q', name: 'displaced point x₀ + Δx', domain: { min: s.x0 - 3, max: s.x0 + 3 } }, write: q => ({ dx: Number((q - s.x0).toFixed(2)) + 0 }) });
  plot.description = `Graph of f(x) = ${f.text}, tangent line at x₀ = ${gtext(s.x0)}${model ? ` with slope ${valueText(model.slope)}` : ' (none: no derivative)'}. `
    + (model ? `At x₀ + Δx = ${gtext(qx)} the model gives ${valueText(model.linear)} and the function gives ${valueText(model.actual)}; the caution segment is the error ${valueText(model.error)}.` : '');
  // Error as a function of Δx, drawn from the same model description (cached on the function and x₀, not on Δx).
  const errPlot = scene('error', 'Model error e(Δx) = f(x₀ + Δx) − L(Δx)', '', ERROR_WINDOW);
  if (model) {
    const m = model.slope.value, f0 = model.fx.value;
    errPlot.curves.push({ name: 'error-curve', lines: cachedCurve(`err-${f.id}-${s.x0}`, t => { const y = f.number(s.x0 + t); return y === null ? null : y - f0 - m * t; }, ERROR_WINDOW), role: 'caution', width: 2.5 });
    if (f2.kind === 'value') errPlot.curves.push({ name: 'quadratic', lines: cachedCurve(`quad-${f.id}-${s.x0}`, t => f2.value / 2 * t * t, ERROR_WINDOW), role: 'derived', dashed: true, width: 2 });
    errPlot.markers.push({ name: 'error-now', at: { x: s.dx, y: model.error.value }, role: 'caution', filled: true });
  }
  errPlot.description = model ? `The error curve touches zero at Δx = 0 and is flat there: it shrinks faster than Δx. ${f2.kind === 'value' ? `The dashed parabola (f″(x₀)/2)Δx² with f″(x₀) ${valueText(f2)} matches it near 0.` : ''} Current error ${valueText(model.error)} at Δx = ${gtext(s.dx)}.`
    : 'No linear model exists here, so no error curve is drawn.';
  const steps = halvings(isZero(D) ? fromDecimal(1, 0)! : abs(D), 7).map(h => (s.dx < 0 ? sub(fromDecimal(0, 0)!, h) : h));
  const table = model ? { caption: 'Shrinking Δx: the error shrinks faster than Δx itself (error/Δx → 0)', head: ['Δx', 'error e', 'e / Δx', 'e / Δx²'],
    rows: steps.map(h => { const lm = localModel(f, X0, h)!; return [rtext(h), valueText(lm.error), valueText(lm.relative!), valueText(lm.curvatureRatio!)]; }) } : undefined;
  const x0t = gtex(s.x0);
  const formulas = model ? [
    `L(\\Delta x)=f(${x0t})+f'(${x0t})\\,\\Delta x=${valueTex(model.fx)}+${pg(model.slope.value)}\\cdot${pg(s.dx)}${model.linear.exact ? '=' : '\\approx'}${valueTex(model.linear)}`,
    `f(${x0t}+${pg(s.dx)})${model.actual.exact ? '=' : '\\approx'}${valueTex(model.actual)},\\qquad e=f-L${model.error.exact ? '=' : '\\approx'}${valueTex(model.error)}`,
    `\\frac{f(x_0+\\Delta x)-f(x_0)}{\\Delta x}${avg.kind === 'value' ? `${avg.exactSlope ? '=' : '\\approx'}${valueTex({ value: avg.slope, exact: avg.exactSlope })}` : '\\ \\text{undefined}'}\\ \\text{(average rate)},\\quad f'(${x0t})${model.slope.exact ? '=' : '\\approx'}${valueTex(model.slope)}\\ \\text{(instantaneous)}`,
  ] : [`f'(${x0t})\\ \\text{does not exist: left slope } ${d.left.kind === 'finite' ? valueTex(d.left) : '\\text{none}'},\\ \\text{right slope } ${d.right.kind === 'finite' ? valueTex(d.right) : '\\text{none}'}`];
  const rows = [
    row('x0', 'x_0', 'Expansion point', givenDesc(s.x0), 'primary'), row('dx', '\\Delta x', 'Displacement', givenDesc(s.dx), 'x'),
    row('fx0', 'f(x_0)', 'Value', pointDesc(fx), 'primary'),
    row('slope', "f'(x_0)", 'Instantaneous rate', d.kind === 'value' ? valueDesc({ value: d.value!, exact: d.exact }) : undefinedDesc(d.reason!), 'derived'),
    row('average', '\\bar m', 'Average rate over [x₀, x₀ + Δx]', avg.kind === 'value' ? valueDesc({ value: avg.slope, exact: avg.exactSlope }) : undefinedDesc(avg.reason), 'x'),
    row('linear', 'L', 'Linear model at x₀ + Δx', model ? valueDesc(model.linear) : undefinedDesc('No derivative, so no tangent model.'), 'derived'),
    row('actual', 'f(x_0+\\Delta x)', 'True value', pointDesc(fq), 'x'),
    row('error', 'e', 'Model error f − L', model ? valueDesc(model.error) : undefinedDesc('No model.'), 'caution'),
    row('relative', 'e/\\Delta x', 'Error per unit displacement', model?.relative ? valueDesc(model.relative) : undefinedDesc(model ? 'Δx = 0: no displacement, zero error.' : 'No model.'), 'caution', true),
    row('second', "f''(x_0)/2", 'Curvature coefficient', f2.kind === 'value' ? (f2.exact ? valueDesc({ value: f2.value / 2, exact: div(f2.exact, fromDecimal(2, 0)!) }) : numericDesc(f2.value / 2)) : undefinedDesc(f2.reason), 'derived', true),
  ];
  const verdict = !model ? `At this corner no single tangent exists (left slope ${oneSidedText(d.left)}, right slope ${oneSidedText(d.right)}), so there is no linear model that is accurate on both sides.`
    : status === 'far' ? `Δx = ${gtext(s.dx)} is far from x₀: the model's error ${valueText(model.error)} is large. A tangent line is a LOCAL description; nothing guarantees accuracy far away.`
      : f2.kind === 'value' && f2.exact && f2.exact.num === 0n ? `Near x₀ the model is close: error ${valueText(model.error)} at Δx = ${gtext(s.dx)}. Here f″(x₀) = 0 (an inflection), so the error shrinks even faster than Δx², like Δx³.`
        : `Near x₀ the model is close: error ${valueText(model.error)} at Δx = ${gtext(s.dx)}. Halving Δx roughly quarters the error when f″(x₀) ≠ 0 — it shrinks faster than Δx.`;
  const frames = traceFrom<CalcFrame>(model ? steps.slice(0, 6).map((h, k) => {
    const lm = localModel(f, X0, h)!;
    return { state: { semantic: { k, dx: h, linear: lm.linear, actual: lm.actual, error: lm.error }, title: `Δx = ${rtext(h)}`,
      detail: `Model ${valueText(lm.linear)}, true value ${valueText(lm.actual)}, error ${valueText(lm.error)}, error/Δx ${valueText(lm.relative!)}.`,
      formula: `e(${rtext(h)})=f(x_0+${rtext(h)})-L(${rtext(h)})${lm.error.exact ? '=' : '\\approx'}${valueTex(lm.error)}` } satisfies CalcFrame };
  }) : [{ state: { semantic: { slope: d }, title: 'No tangent model', detail: verdict, formula: formulas[0]! } satisfies CalcFrame }]);
  return {
    rows, formulas, verdict, status, caution: status !== 'local', scenes: [plot, errPlot], frames, table,
    hint: 'Both points ride on the graph: drag horizontally, or use the left and right arrow keys (steps of 0.25). Numeric fields control the same state.',
    metrics: { x0: s.x0, dx: s.dx, slope: model?.slope.value ?? null, linear: model?.linear.value ?? null, actual: fq.kind === 'value' ? fq.value : null,
      error: model?.error.value ?? null, errorExact: model?.error.exact ? rtext(model.error.exact) : null, status },
  };
}
