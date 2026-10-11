/** III.12 — integrals as accumulation: Riemann and trapezoid sums, signed versus geometric area. */
import { cmp, fromDecimal, isZero, sub, toNumber } from '../../math/quantity/rational';
import { INTEGRANDS, integrandText, reference, riemann, signedParts, type Integrand, type Rule } from '../../math/calculus/integration';
import { traceFrom } from '../../platform/trace';
import type { WorldWindow } from '../../platform/geometry/viewport';
import {
  cachedCurve, gtex, gtext, givenDesc, ratDesc, row, rtext, scene, spec, undefinedDesc, valueDesc, valueTex, valueText,
  type CalcChoice, type CalcDerived, type CalcFrame,
} from './calculus-view';

export interface RiemannState { fn: string; a: number; b: number; n: number; rule: Rule }
export const RIEMANN_CANONICAL: RiemannState = { fn: 'cubic', a: -2, b: 3, n: 10, rule: 'left' };
export const riemannPresets = [
  { id: 'signed', label: 'Crosses the axis', state: RIEMANN_CANONICAL },
  { id: 'positive', label: 'Positive: 4 − x²', state: { fn: 'parabola', a: -2, b: 2, n: 8, rule: 'midpoint' } },
  { id: 'cancel', label: 'Exact cancellation', state: { fn: 'linear', a: 0, b: 2, n: 4, rule: 'left' } },
  { id: 'reversed', label: 'b < a', state: { ...RIEMANN_CANONICAL, a: 3, b: -2 } },
  { id: 'trapezoid', label: 'Trapezoids', state: { ...RIEMANN_CANONICAL, rule: 'trapezoid' } },
  { id: 'sine', label: 'sin x (binary64)', state: { fn: 'sin', a: 0, b: 3, n: 12, rule: 'midpoint' } },
] as const satisfies readonly { id: string; label: string; state: RiemannState }[];
export const riemannSpecs = {
  a: spec('a', -2, 'lower limit a', 'a', -3, 3, 0.25), b: spec('b', 3, 'upper limit b', 'b', -3, 3, 0.25),
  n: spec('n', 10, 'number of panels n', 'n', 1, 64, 1, 0),
};
export const ruleChoices = (): readonly CalcChoice[] => [{ field: 'rule', legend: 'Height of each panel', options: [{ id: 'left', label: 'left' }, { id: 'right', label: 'right' }, { id: 'midpoint', label: 'midpoint' }, { id: 'trapezoid', label: 'trapezoid' }] }];
const W: WorldWindow = { xMin: -3.5, xMax: 3.5, yMin: -4, yMax: 4.5 };
const fnOf = (s: RiemannState): Integrand => INTEGRANDS[s.fn] ?? INTEGRANDS.cubic!;
const RULE_TEXT: Record<Rule, string> = { left: 'left endpoints', right: 'right endpoints', midpoint: 'midpoints', trapezoid: 'trapezoids' };

export function deriveRiemann(s: RiemannState): CalcDerived {
  const g = fnOf(s), A = fromDecimal(s.a, 2)!, B = fromDecimal(s.b, 2)!;
  const sum = riemann(g, A, B, s.n, s.rule), I = reference(g, A, B), parts = g.kind === 'exact' ? signedParts(g, A, B) : null;
  const err = sum.kind === 'value' ? (sum.exact && I.exact ? { value: toNumber(sub(sum.exact, I.exact)), exact: sub(sum.exact, I.exact) } : { value: sum.value - I.value }) : null;
  const plot = scene('graph', `${RULE_TEXT[s.rule]} under f(x) = ${integrandText(g)}`, '', W);
  for (const [k, p] of sum.panels.entries()) plot.polygons.push({ name: `panel-${k}`, corners: [{ x: p.x0, y: 0 }, { x: p.x1, y: 0 }, { x: p.x1, y: p.heights[1] }, { x: p.x0, y: p.heights[0] }], role: p.signed * Math.sign(p.x1 - p.x0) >= 0 ? 'y' : 'caution' });
  plot.curves.push({ name: 'graph', lines: cachedCurve(g.id, x => g.f.number(x), W, g.f.breaks), role: 'ink', width: 2.5 });
  plot.handles.push({ id: 'a', label: `lower limit a = ${gtext(s.a)}`, at: { x: s.a, y: 0 }, role: 'x', xField: 'a', step: 0.25 }, { id: 'b', label: `upper limit b = ${gtext(s.b)}`, at: { x: s.b, y: 0 }, role: 'primary', xField: 'b', step: 0.25 });
  plot.labels.push({ name: 'label-a', at: { x: s.a, y: 0 }, text: 'a', role: 'x', dy: 28 }, { name: 'label-b', at: { x: s.b, y: 0 }, text: 'b', role: 'primary', dy: 28 });
  const reversed = cmp(A, B) > 0, empty = cmp(A, B) === 0;
  plot.description = `Graph of f(x) = ${integrandText(g)} from a = ${gtext(s.a)} to b = ${gtext(s.b)} with ${s.n} panels using ${RULE_TEXT[s.rule]}. Green panels add, gold panels subtract. `
    + (sum.kind === 'value' ? `The sum is ${valueText(sum)}; the integral is ${valueText(I)}.` : sum.reason);
  // Convergence table: n doubling, the same rule.
  const ns = [1, 2, 4, 8, 16, 32, 64];
  const table = { caption: `${RULE_TEXT[s.rule]}: the sum and its error as the partition is refined`, head: ['n', 'Δx', 'sum', 'sum − integral'],
    rows: ns.map(n => { const t = riemann(g, A, B, n, s.rule); const e = t.kind === 'value' ? (t.exact && I.exact ? rtext(sub(t.exact, I.exact)) : `≈ ${(t.value - I.value).toExponential(3)}`) : 'undefined';
      return [`${n}`, rtext(t.dx), t.kind === 'value' ? valueText(t) : 'undefined', e]; }) };
  const formulas = [
    `\\Delta x=\\frac{b-a}{n}=\\frac{${gtex(s.b)}-${s.a < 0 ? `(${gtex(s.a)})` : gtex(s.a)}}{${s.n}}=${valueTex({ value: toNumber(sum.dx), exact: sum.dx })}`,
    s.rule === 'trapezoid' ? `T_n=\\sum_{i=0}^{n-1}\\frac{f(x_i)+f(x_{i+1})}{2}\\,\\Delta x${sum.kind === 'value' ? `${sum.exact ? '=' : '\\approx'}${valueTex(sum)}` : ''}`
      : `S_n=\\sum_{i=0}^{n-1}f(\\xi_i)\\,\\Delta x${sum.kind === 'value' ? `${sum.exact ? '=' : '\\approx'}${valueTex(sum)}` : ''},\\quad \\xi_i=\\text{${s.rule === 'midpoint' ? 'midpoint' : s.rule + ' endpoint'}}`,
    `\\int_{${gtex(s.a)}}^{${gtex(s.b)}} f(x)\\,dx${I.exact ? '=' : '\\approx'}${valueTex(I)}${err ? `,\\qquad S_n-\\int=${valueTex(err)}` : ''}`,
    ...(parts ? [`\\int|f|=${valueTex({ value: toNumber(parts.area), exact: parts.area })}\\ \\text{(positive }${valueTex({ value: toNumber(parts.positive), exact: parts.positive })}\\text{, negative }${valueTex({ value: toNumber(parts.negative), exact: parts.negative })}\\text{)}`] : []),
  ];
  const rows = [
    row('a', 'a', 'Lower limit', givenDesc(s.a), 'x'), row('b', 'b', 'Upper limit', givenDesc(s.b), 'primary'), row('n', 'n', 'Panels', givenDesc(s.n), 'ink'),
    row('dx', '\\Delta x', 'Panel width (signed)', ratDesc(sum.dx), 'ink', true),
    row('sum', 'S_n', `Sum with ${RULE_TEXT[s.rule]}`, sum.kind === 'value' ? valueDesc(sum) : undefinedDesc(sum.reason), 'y'),
    row('integral', '\\int_a^b f', 'Integral (signed accumulation)', valueDesc(I), 'derived'),
    row('error', 'S_n-\\int', 'Error of the sum', err ? valueDesc(err) : undefinedDesc('No sum.'), 'caution'),
    row('area', '\\int|f|', 'Geometric area between graph and axis', parts ? ratDesc(parts.area) : g.kind === 'exact' ? undefinedDesc('A sign change at an irrational root: not split exactly here.') : undefinedDesc('Only computed for exact integrands.'), 'ink', true),
    row('positive', '\\int f^+', 'Area above the axis', parts ? ratDesc(parts.positive) : undefinedDesc('Not split.'), 'y', true),
    row('negative', '\\int f^-', 'Signed area below the axis', parts ? ratDesc(parts.negative) : undefinedDesc('Not split.'), 'caution', true),
  ];
  const crosses = parts !== null && !isZero(parts.negative) && !isZero(parts.positive);
  const status = empty ? 'empty' : reversed ? 'reversed' : sum.kind === 'undefined' ? 'undefined' : crosses ? 'signed' : 'one-sign';
  const verdict = empty ? 'a = b: the interval is empty and the integral is exactly 0.'
    : reversed ? `b < a: Δx is negative, so every panel's contribution changes sign. ∫ from ${gtext(s.a)} to ${gtext(s.b)} = −∫ from ${gtext(s.b)} to ${gtext(s.a)} = ${valueText(I)}.`
      : crosses ? `The graph crosses the axis: the integral ${valueText(I)} is SIGNED accumulation (above minus below), while the geometric area is ${rtext(parts!.area)}. The sum ${sum.kind === 'value' ? valueText(sum) : ''} approximates the signed value.`
        : `The sum ${sum.kind === 'value' ? valueText(sum) : ''} approximates ∫ = ${valueText(I)}; doubling n shrinks the error (see the table).`;
  const frames = traceFrom<CalcFrame>([
    ...sum.panels.slice(0, 5).map((p, k) => ({ state: { semantic: { panel: k, x0: p.x0, x1: p.x1, contribution: p.exact ?? p.signed }, title: `Panel ${k + 1}: [${gtext(p.x0)}, ${gtext(p.x1)}]`,
      detail: `${s.rule === 'trapezoid' ? 'The average of the two end heights' : 'The sampled height'} times the signed width Δx gives the contribution ${p.exact ? rtext(p.exact) : `≈ ${p.signed.toFixed(6)}`}; a negative height or a negative Δx makes it negative.`,
      formula: `\\text{panel } ${k + 1}:\\ ${p.exact ? valueTex({ value: p.signed, exact: p.exact }) : p.signed.toFixed(6)}` } satisfies CalcFrame })),
    { state: { semantic: { sum: sum.kind === 'value' ? (sum.exact ?? sum.value) : null, integral: I.exact ?? I.value }, title: 'Add every panel and compare', detail: verdict, formula: formulas[2]! } satisfies CalcFrame },
  ]);
  return {
    rows, formulas, verdict, status, caution: ['reversed', 'undefined', 'signed'].includes(status), scenes: [plot], frames, table,
    hint: 'Drag the limit markers a and b along the x-axis, or use the left and right arrow keys (steps of 0.25). Numeric fields control the same state.',
    metrics: { a: s.a, b: s.b, n: s.n, rule: s.rule, sum: sum.kind === 'value' ? sum.value : null, sumExact: sum.kind === 'value' && sum.exact ? rtext(sum.exact) : null,
      integral: I.value, integralExact: I.exact ? rtext(I.exact) : null, area: parts ? toNumber(parts.area) : null, panels: sum.panels.length, status },
  };
}
