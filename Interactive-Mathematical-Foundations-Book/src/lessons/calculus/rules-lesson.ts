/** III.5 — derivative rules with manipulable factors u(x) = a·x + b and v(x) = x² + c. */
import { fromDecimal } from '../../math/quantity/rational';
import { applyRule, uPoly, vPoly, type RuleMode } from '../../math/calculus/rules';
import { addPoly, derivative, evalPolyNumber, mulPoly, polyTex, polyText } from '../../math/calculus/polynomial';
import { traceFrom } from '../../platform/trace';
import type { WorldWindow } from '../../platform/geometry/viewport';
import {
  cachedCurve, exactDesc, gtex, gtext, givenDesc, lineThrough, row, scene, spec, undefinedDesc, valueDesc, valueTex, valueText,
  type CalcChoice, type CalcDerived, type CalcFrame,
} from './calculus-view';

export interface RulesState { mode: RuleMode; a: number; b: number; c: number; x: number; dx: number }
export const RULES_CANONICAL: RulesState = { mode: 'product', a: 1, b: 1, c: 1, x: 1, dx: 0.5 };
export const rulesPresets = [
  { id: 'product', label: 'Product (x + 1)(x² + 1)', state: RULES_CANONICAL },
  { id: 'sum', label: 'Sum', state: { ...RULES_CANONICAL, mode: 'sum' } },
  { id: 'quotient', label: 'Quotient', state: { ...RULES_CANONICAL, mode: 'quotient' } },
  { id: 'pole', label: 'Quotient with v(x) = 0', state: { mode: 'quotient', a: 1, b: 1, c: -1, x: 1, dx: 0.5 } },
  { id: 'negative', label: 'Negative factor', state: { ...RULES_CANONICAL, a: -1, b: 0.5, x: 1.5 } },
] as const satisfies readonly { id: string; label: string; state: RulesState }[];
export const rulesSpecs = {
  a: spec('a', 1, 'slope a of u', 'a', -3, 3, 0.25), b: spec('b', 1, 'intercept b of u', 'b', -3, 3, 0.25), c: spec('c', 1, 'offset c of v', 'c', -3, 3, 0.25),
  x: spec('x', 1, 'point x', 'x', -2.5, 2.5, 0.25), dx: spec('dx', 0.5, 'displacement Δx', '\\Delta x', -1, 1, 0.25),
};
export const rulesChoices = (): readonly CalcChoice[] => [{ field: 'mode', legend: 'Combine u and v by', options: [{ id: 'sum', label: 'u + v' }, { id: 'product', label: 'u · v' }, { id: 'quotient', label: 'u / v' }] }];
export const rulesFields = (s: RulesState) => (s.mode === 'product' ? ['a', 'b', 'c', 'x', 'dx'] : ['a', 'b', 'c', 'x']);
const GRAPH: WorldWindow = { xMin: -3, xMax: 3, yMin: -4, yMax: 6 };

export function deriveRules(s: RulesState): CalcDerived {
  const A = fromDecimal(s.a, 2)!, B = fromDecimal(s.b, 2)!, C = fromDecimal(s.c, 2)!, X = fromDecimal(s.x, 2)!, DX = fromDecimal(s.dx, 2)!;
  const R = applyRule(s.mode, A, B, C, X, DX), U = uPoly(A, B), V = vPoly(C);
  const op = s.mode === 'sum' ? '+' : s.mode === 'product' ? '·' : '/';
  const w = (t: number) => { const u = evalPolyNumber(U, t), v = evalPolyNumber(V, t); return s.mode === 'sum' ? u + v : s.mode === 'product' ? u * v : v === 0 ? null : u / v; };
  const poles = s.c < 0 ? [-Math.sqrt(-s.c), Math.sqrt(-s.c)] : s.c === 0 ? [0] : [];
  const key = `${s.mode}-${s.a}-${s.b}-${s.c}`;
  const graph = scene('graph', `w(x) = u(x) ${op} v(x) and its tangent at x = ${gtext(s.x)}`, '', GRAPH);
  graph.curves.push({ name: 'u', lines: cachedCurve(`u-${s.a}-${s.b}`, t => evalPolyNumber(U, t), GRAPH), role: 'x', dashed: true, width: 1.8 },
    { name: 'v', lines: cachedCurve(`v-${s.c}`, t => evalPolyNumber(V, t), GRAPH), role: 'y', dashed: true, width: 1.8 },
    { name: 'w', lines: cachedCurve(key, w, GRAPH, poles), role: 'ink', width: 2.8 });
  const P = { x: s.x, y: R.value?.value ?? 0 };
  if (R.value && R.rule) graph.segments.push({ name: 'tangent', ...lineThrough(P, R.rule.value, GRAPH), role: 'primary', width: 2.5 });
  for (const p of poles) graph.segments.push({ name: `pole-${p}`, from: { x: p, y: GRAPH.yMin }, to: { x: p, y: GRAPH.yMax }, role: 'caution', dashed: true, width: 1.5 });
  graph.handles.push({ id: 'x', label: `point x = ${gtext(s.x)}, w(x) ${R.value ? '= ' + valueText(R.value) : 'undefined'}`, at: P, role: 'primary', xField: 'x', step: 0.25 });
  graph.labels.push({ name: 'label-u', at: { x: 2.4, y: evalPolyNumber(U, 2.4) }, text: 'u', role: 'x', dx: 12, dy: 0 }, { name: 'label-v', at: { x: -2.2, y: evalPolyNumber(V, -2.2) }, text: 'v', role: 'y', dx: -12, dy: 0 });
  graph.description = `u(x) = ${polyText(U)} (dashed blue), v(x) = ${polyText(V)} (dashed green) and w = u ${op} v (solid). At x = ${gtext(s.x)}: `
    + (R.value ? `w = ${valueText(R.value)}, tangent slope by the rule ${valueText(R.rule!)}.` : R.reason!) + (poles.length ? ` v vanishes at x = ${poles.map(p => p.toFixed(3)).join(', ')}.` : '');
  const scenes = [graph];
  if (R.increment) {
    const I = R.increment, u = R.u.value, v = R.v.value, u2 = I.u2.value, v2 = I.v2.value;
    const rad = Math.max(2, Math.ceil(Math.max(Math.abs(u), Math.abs(v), Math.abs(u2), Math.abs(v2)) + 0.5));
    const box = scene('area', 'Product as an area: u·v and its increment', '', { xMin: -rad, xMax: rad, yMin: -rad, yMax: rad });
    box.polygons.push({ name: 'rect-uv', corners: [{ x: 0, y: 0 }, { x: u, y: 0 }, { x: u, y: v }, { x: 0, y: v }], role: 'ink' },
      { name: 'strip-vdu', corners: [{ x: u, y: 0 }, { x: u2, y: 0 }, { x: u2, y: v }, { x: u, y: v }], role: 'x' },
      { name: 'strip-udv', corners: [{ x: 0, y: v }, { x: u, y: v }, { x: u, y: v2 }, { x: 0, y: v2 }], role: 'y' },
      { name: 'strip-corner', corners: [{ x: u, y: v }, { x: u2, y: v }, { x: u2, y: v2 }, { x: u, y: v2 }], role: 'caution' });
    box.labels.push({ name: 'label-vdu', at: { x: (u + u2) / 2, y: v / 2 }, text: 'vΔu', role: 'x', dy: 0 }, { name: 'label-udv', at: { x: u / 2, y: (v + v2) / 2 }, text: 'uΔv', role: 'y', dy: 0 });
    box.description = `Rectangle with sides u = ${valueText(R.u)} and v = ${valueText(R.v)}. After Δx = ${gtext(s.dx)} the sides become ${valueText(I.u2)} and ${valueText(I.v2)}. `
      + `The added area ${valueText(I.total)} is vΔu = ${valueText(I.vDu)} (blue strip) + uΔv = ${valueText(I.uDv)} (green strip) + ΔuΔv = ${valueText(I.corner)} (corner).`;
    scenes.push(box);
  }
  const x = gtex(s.x);
  const formulas: string[] = [];
  if (s.mode === 'sum') formulas.push(`(u+v)'(${x})=u'(${x})+v'(${x})=${valueTex(R.du)}+${valueTex(R.dv)}=${valueTex(R.rule!)}`);
  if (s.mode === 'product') formulas.push(
    `\\Delta(uv)=v\\,\\Delta u+u\\,\\Delta v+\\Delta u\\,\\Delta v`,
    `(uv)'(${x})=u'v+uv'=${valueTex(R.du)}\\cdot${valueTex(R.v)}+${valueTex(R.u)}\\cdot${valueTex(R.dv)}=${valueTex(R.rule!)}`,
    `${valueTex(R.increment!.total)}=${valueTex(R.increment!.vDu)}+${valueTex(R.increment!.uDv)}+${valueTex(R.increment!.corner)}\\quad(\\Delta x=${gtex(s.dx)})`);
  if (s.mode === 'quotient') formulas.push(R.rule
    ? `\\left(\\frac{u}{v}\\right)'(${x})=\\frac{u'v-uv'}{v^2}=\\frac{${valueTex(R.terms[0]!)}-${R.terms[1]!.value < 0 ? `(${valueTex(R.terms[1]!)})` : valueTex(R.terms[1]!)}}{${valueTex(R.terms[2]!)}}=${valueTex(R.rule)}`
    : `v(${x})=0\\ \\Rightarrow\\ \\frac{u}{v}\\ \\text{and}\\ \\left(\\frac{u}{v}\\right)'\\ \\text{are undefined at } x=${x}`,
    `u=q\\,v\\ \\Rightarrow\\ u'=q'v+qv'`, `q'=\\frac{u'-q\\,v'}{v}${R.independent ? `=${valueTex(R.independent)}` : ''}`);
  if (s.mode !== 'quotient') { const W = s.mode === 'sum' ? addPoly(U, V) : mulPoly(U, V); formulas.push(`\\frac{d}{dx}\\left(${polyTex(W)}\\right)=${polyTex(derivative(W))}\\ \\Big|_{x=${x}}=${valueTex(R.independent!)}\\quad\\text{(expand first)}`); }
  const rows = [
    row('x', 'x', 'Point', givenDesc(s.x), 'primary'),
    row('u', 'u(x)', 'First factor', valueDesc(R.u), 'x'), row('v', 'v(x)', 'Second factor', valueDesc(R.v), 'y'),
    row('du', "u'(x)", 'Rate of u', valueDesc(R.du), 'x', true), row('dv', "v'(x)", 'Rate of v', valueDesc(R.dv), 'y', true),
    row('w', 'w(x)', `Combined value u ${op} v`, R.value ? valueDesc(R.value) : undefinedDesc(R.reason!), 'ink'),
    row('rule', "w'(x)", 'Derivative by the rule', R.rule ? valueDesc(R.rule) : undefinedDesc(R.reason!), 'primary'),
    row('independent', "w'(x)", s.mode === 'quotient' ? 'Check through u = q·v' : 'Check: expand, then differentiate', R.independent ? valueDesc(R.independent) : undefinedDesc(R.reason!), 'derived'),
    row('agree', '=', 'Exact agreement', R.agree === null ? undefinedDesc('Nothing to compare.') : exactDesc(R.agree ? 'yes, exactly equal' : 'NO — a defect'), 'derived', true),
  ];
  const verdict = !R.rule ? `v(${gtext(s.x)}) = 0, so u/v is undefined at this x and the quotient rule does not apply. The graph has a vertical asymptote or a hole here; move x away from it.`
    : s.mode === 'product' ? `Product rule: each factor's rate is weighted by the OTHER factor's value. Exact result ${valueText(R.rule)}, equal to differentiating the expanded product. The corner ΔuΔv is second-order: it vanishes from the rate as Δx → 0.`
      : s.mode === 'quotient' ? `Quotient rule: (u′v − uv′)/v² = ${valueText(R.rule)}, confirmed independently by differentiating u = q·v. It is valid only where v(x) is nonzero.`
        : `Linearity: the derivative of a sum is the sum of derivatives, ${valueText(R.rule)}.`;
  const frames = traceFrom<CalcFrame>([
    { state: { semantic: { u: R.u, v: R.v }, title: 'Evaluate the factors', detail: `u(${gtext(s.x)}) = ${valueText(R.u)}, v(${gtext(s.x)}) = ${valueText(R.v)}.`, formula: `u(${x})=${valueTex(R.u)},\\quad v(${x})=${valueTex(R.v)}` } satisfies CalcFrame },
    { state: { semantic: { du: R.du, dv: R.dv }, title: 'Differentiate each factor', detail: `u′ = a = ${valueText(R.du)}; v′ = 2x = ${valueText(R.dv)}.`, formula: `u'(${x})=${valueTex(R.du)},\\quad v'(${x})=${valueTex(R.dv)}` } satisfies CalcFrame },
    { state: { semantic: { mode: s.mode, rule: R.rule, independent: R.independent, agree: R.agree }, title: 'Combine with the rule and check', detail: verdict, formula: formulas[s.mode === 'product' ? 1 : 0]! } satisfies CalcFrame },
  ]);
  return {
    rows, formulas, verdict, status: R.rule ? s.mode : 'undefined', caution: !R.rule, scenes, frames,
    hint: 'The point rides on the graph of w: drag horizontally, or use the left and right arrow keys (steps of 0.25). Numeric fields control the same state.',
    metrics: { mode: s.mode, u: R.u.value, v: R.v.value, w: R.value?.value ?? null, rule: R.rule?.value ?? null, independent: R.independent?.value ?? null, agree: R.agree },
  };
}
