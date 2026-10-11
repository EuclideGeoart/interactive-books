/** III.1 — limits through approach. State: a catalogued function, the point a and a draggable approach value x. */
import { fromDecimal, int, toNumber } from '../../math/quantity/rational';
import { LIMIT_FUNCTIONS } from '../../math/calculus/catalog';
import { analyse, approach, gapTo, type LimitKind } from '../../math/calculus/limits';
import type { PointValue } from '../../math/calculus/univariate';
import { traceFrom } from '../../platform/trace';
import type { WorldWindow } from '../../platform/geometry/viewport';
import {
  cachedCurve, curveOf, eqOneSided, gtex, gtext, givenDesc, graphMarkers, oneSidedDesc, oneSidedText, pointDesc, row, rtext, scene, spec, undefinedDesc,
  valueDesc, valueTex, valueText, type CalcDerived, type CalcFrame,
} from './calculus-view';

export interface LimitState { fn: string; a: number; x: number }
export const LIMIT_CANONICAL: LimitState = { fn: 'hole', a: 1, x: 1.5 };
export const limitPresets = [
  { id: 'hole', label: 'Hole (0/0)', state: LIMIT_CANONICAL },
  { id: 'moved', label: 'Value ≠ limit', state: { fn: 'moved', a: 1, x: 1.5 } },
  { id: 'jump', label: 'Jump', state: { fn: 'jump', a: 0, x: 0.5 } },
  { id: 'recip-square', label: '1/x²', state: { fn: 'recip-square', a: 0, x: 0.5 } },
  { id: 'recip', label: '1/x', state: { fn: 'recip', a: 0, x: 0.5 } },
  { id: 'oscillation', label: 'sin(1/x)', state: { fn: 'oscillation', a: 0, x: 0.5 } },
  { id: 'squeeze', label: 'x·sin(1/x)', state: { fn: 'squeeze', a: 0, x: 0.5 } },
  { id: 'smooth', label: 'Continuous x²/2', state: { fn: 'smooth', a: 1, x: 1.5 } },
] as const satisfies readonly { id: string; label: string; state: LimitState }[];
export const limitSpecs = {
  a: spec('a', 1, 'approach point a', 'a', -2.5, 2.5, 0.25),
  x: spec('x', 1.5, 'sample point x', 'x', -3, 3, 0.05),
};
export const LIMIT_WINDOW: WorldWindow = { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
const entryOf = (s: LimitState) => LIMIT_FUNCTIONS[s.fn] ?? LIMIT_FUNCTIONS.hole!;
const show = (v: PointValue) => (v.kind === 'value' ? valueText(v) : 'undefined');
const relTex = (v: PointValue) => (v.kind === 'value' ? `${v.exact ? '=' : '\\approx'}${valueTex(v)}` : '\\ \\text{undefined}');
const eqShow = (v: PointValue) => (v.kind === 'value' ? `${v.exact ? '= ' : ''}${valueText(v)}` : 'is undefined');

export const limitVerdict = (kind: LimitKind, a: string, d: ReturnType<typeof analyse>): string => ({
  continuous: `Both one-sided limits equal f(${a}) ${d.value.kind === 'value' ? (d.value.exact ? '= ' : '') + valueText(d.value) : ''}: the limit exists and the function is continuous here.`,
  removable: `The limit exists (${d.limit ? valueText(d.limit) : ''}) but ${d.value.kind === 'value' ? `f(${a}) = ${valueText(d.value)} is a different number` : `f(${a}) is undefined`}. A limit describes nearby values, not the value at the point.`,
  jump: `The left limit ${oneSidedText(d.left)} and the right limit ${oneSidedText(d.right)} differ, so the two-sided limit does not exist.`,
  infinite: `The values grow without bound (left ${oneSidedText(d.left)}, right ${oneSidedText(d.right)}). "Limit = ∞" describes HOW it fails; there is no finite limit.`,
  oscillation: `The values keep swinging between −1 and 1 on every interval around ${a}; no single number is approached. The sampled curve aliases near ${a} and is not evidence either way.`,
  'one-sided': `Only one side is available (${oneSidedText(d.left)} from the left, ${oneSidedText(d.right)} from the right); a two-sided limit needs both.`,
  outside: `The function is not defined on either side of ${a}.`,
})[kind];

export function deriveLimit(s: LimitState): CalcDerived {
  const e = entryOf(s), f = e.f, A = fromDecimal(s.a, 2)!, X = fromDecimal(s.x, 2)!;
  const d = analyse(f, A), fx = f.at(X), rows8 = approach(f, A, int(1), 8);
  const at = (v: PointValue, fallback: number) => (v.kind === 'value' ? v.value : fallback);
  const plot = scene('graph', `Approach a = ${gtext(s.a)} on f(x) = ${f.text}`, '', LIMIT_WINDOW);
  plot.curves.push({ name: 'graph', lines: cachedCurve(f.id, curveOf(f), LIMIT_WINDOW, f.breaks, f.exact ? 480 : 1600), role: 'ink', width: 2.5 });
  plot.segments.push({ name: 'line-a', from: { x: s.a, y: LIMIT_WINDOW.yMin }, to: { x: s.a, y: LIMIT_WINDOW.yMax }, role: 'ink', dashed: true, width: 1.5 });
  if (d.limit) plot.segments.push({ name: 'line-limit', from: { x: LIMIT_WINDOW.xMin, y: d.limit.value }, to: { x: LIMIT_WINDOW.xMax, y: d.limit.value }, role: 'derived', dashed: true, width: 2 });
  for (const r of rows8.slice(0, 5)) {
    const dl = toNumber(r.delta);
    if (r.left.kind === 'value') plot.markers.push({ name: `trace-left-${r.k}`, at: { x: s.a - dl, y: r.left.value }, role: 'x', filled: true, radius: 3.5 });
    if (r.right.kind === 'value') plot.markers.push({ name: `trace-right-${r.k}`, at: { x: s.a + dl, y: r.right.value }, role: 'y', filled: true, radius: 3.5 });
  }
  // The analytic hole/value markers are drawn last, so the nearest samples never hide them.
  plot.markers.push(...graphMarkers(f, LIMIT_WINDOW, 'ink'));
  const hy = at(fx, d.limit?.value ?? 0);
  plot.handles.push({ id: 'x', label: `sample point x = ${gtext(s.x)}, f(x) ${fx.kind === 'value' ? (fx.exact ? '= ' : '') + valueText(fx) : 'undefined'}`, at: { x: s.x, y: hy }, role: 'primary', xField: 'x', step: 0.05 });
  plot.description = `Graph of f(x) = ${f.text} near a = ${gtext(s.a)}. Left samples (blue) and right samples (green) at a ∓ 1, ½, ¼, ⅛, 1/16. `
    + `Left limit ${oneSidedText(d.left)}, right limit ${oneSidedText(d.right)}, f(a) ${eqShow(d.value)}. The sample point x = ${gtext(s.x)} has f(x) ${eqShow(fx)}.`;
  const table = { caption: `Genuine evaluations at x = a ∓ δ (never at x = a itself), a = ${gtext(s.a)}`, head: ['k', 'δ', 'f(a − δ)', 'f(a + δ)'],
    rows: rows8.map(r => [`${r.k}`, rtext(r.delta), show(r.left), show(r.right)]) };
  const aTex = gtex(s.a);
  const formulas = [
    `\\lim_{x\\to ${aTex}^-}f(x)${eqOneSided(d.left)}`,
    `\\lim_{x\\to ${aTex}^+}f(x)${eqOneSided(d.right)}`,
    d.limit ? `\\lim_{x\\to ${aTex}}f(x)=${valueTex(d.limit)}` : `\\lim_{x\\to ${aTex}}f(x)\\ \\text{does not exist}`,
    d.value.kind === 'value' ? `f(${aTex})${d.value.exact ? '=' : '\\approx'}${valueTex(d.value)}` : `f(${aTex})\\ \\text{is undefined}`,
    ...(e.derivation ? [e.derivation] : []),
  ];
  const gap = gapTo(fx, d.limit);
  const rows = [
    row('a', 'a', 'Approach point', givenDesc(s.a), 'ink'), row('x', 'x', 'Sample point', givenDesc(s.x), 'primary'),
    row('fx', 'f(x)', 'Value at the sample', pointDesc(fx), 'primary'), row('fa', 'f(a)', 'Actual value at a', pointDesc(d.value), 'ink'),
    row('left', '\\lim_{x\\to a^-}', 'Left limit', oneSidedDesc(d.left), 'x'), row('right', '\\lim_{x\\to a^+}', 'Right limit', oneSidedDesc(d.right), 'y'),
    row('limit', '\\lim_{x\\to a}', 'Two-sided limit', d.limit ? valueDesc(d.limit) : undefinedDesc(limitVerdict(d.kind, gtext(s.a), d).split('.')[0] + '.'), 'derived'),
    row('gap', '|f(x)-L|', 'Distance from the limit', gap ? valueDesc(gap) : undefinedDesc('Needs a finite limit L and a defined f(x).'), 'derived', true),
  ];
  const verdict = limitVerdict(d.kind, gtext(s.a), d);
  const frames = traceFrom<CalcFrame>([
    ...rows8.slice(0, 6).map(r => ({ state: { semantic: { k: r.k, delta: r.delta, left: r.left, right: r.right }, title: `Approach step ${r.k + 1}: δ = ${rtext(r.delta)}`,
      detail: `Evaluate at a − δ and a + δ, both different from a: f(a − δ) ${eqShow(r.left)}, f(a + δ) ${eqShow(r.right)}.`,
      formula: `f(${gtex(s.a)}-${rtext(r.delta)})${relTex(r.left)},\\quad f(${gtex(s.a)}+${rtext(r.delta)})${relTex(r.right)}` } satisfies CalcFrame })),
    { state: { semantic: { left: d.left, right: d.right, limit: d.limit, value: d.value, kind: d.kind }, title: 'Decide the limit analytically', detail: `${verdict} The table supports this reading; the decision comes from the function's exact description.`, formula: formulas[2]! } satisfies CalcFrame },
  ]);
  return {
    rows, formulas, verdict, status: d.kind, caution: d.kind !== 'continuous', scenes: [plot], frames, table,
    hint: 'The sample point rides on the graph: drag horizontally, or use the left and right arrow keys (steps of 0.05; Shift for larger steps). Numeric fields control the same state.',
    metrics: { a: s.a, x: s.x, fx: fx.kind === 'value' ? fx.value : null, fa: d.value.kind === 'value' ? d.value.value : null, limit: d.limit?.value ?? null,
      left: oneSidedText(d.left), right: oneSidedText(d.right), kind: d.kind },
  };
}
