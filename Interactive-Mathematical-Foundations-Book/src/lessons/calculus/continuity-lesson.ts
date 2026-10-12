/** III.2 — continuity and local behaviour: the three conditions at a point, one-sided continuity, and local versus global. */
import { fromDecimal, toNumber } from '../../math/quantity/rational';
import { joinFunction, shiftedPole, type JoinValue } from '../../math/calculus/catalog';
import { analyse } from '../../math/calculus/limits';
import { sqrtFn, type Univariate } from '../../math/calculus/univariate';
import { traceFrom } from '../../platform/trace';
import type { WorldWindow } from '../../platform/geometry/viewport';
import {
  cachedCurve, curveOf, eqOneSided, exactDesc, gtex, gtext, givenDesc, graphMarkers, oneSidedDesc, oneSidedText, pointDesc, row, scene, spec, valueTex, valueText,
  type CalcChoice, type CalcDerived, type CalcFrame,
} from './calculus-view';

export interface ContinuityState { kind: 'join' | 'pole' | 'sqrt'; c: number; m: number; mode: JoinValue; v: number; a: number }
export const CONTINUITY_CANONICAL: ContinuityState = { kind: 'join', c: 0, m: 2, mode: 'right', v: 0, a: 1 };
export const continuityPresets = [
  { id: 'jump', label: 'Jump (c = 0)', state: CONTINUITY_CANONICAL },
  { id: 'joined', label: 'Joined (c = 1)', state: { ...CONTINUITY_CANONICAL, c: 1 } },
  { id: 'removable', label: 'Removable: f(1) = 0', state: { ...CONTINUITY_CANONICAL, c: 1, mode: 'custom', v: 0 } },
  { id: 'missing', label: 'f(1) undefined', state: { ...CONTINUITY_CANONICAL, c: 1, mode: 'none' } },
  { id: 'pole', label: 'Infinite: 1/(x − 1)', state: { ...CONTINUITY_CANONICAL, kind: 'pole' } },
  { id: 'endpoint', label: 'Endpoint √x at 0', state: { ...CONTINUITY_CANONICAL, kind: 'sqrt', a: 0 } },
  { id: 'local', label: 'Elsewhere: a = −1', state: { ...CONTINUITY_CANONICAL, a: -1 } },
] as const satisfies readonly { id: string; label: string; state: ContinuityState }[];
export const continuitySpecs = {
  c: spec('c', 0, 'left piece offset c', 'c', -2, 2, 0.25), m: spec('m', 2, 'right piece slope m', 'm', -2, 3, 0.25),
  v: spec('v', 0, 'custom value v = f(1)', 'v', -3, 3, 0.25), a: spec('a', 1, 'point a', 'a', -2.5, 2.5, 0.25),
};
export const continuityChoices = (s: ContinuityState): readonly CalcChoice[] => s.kind === 'join'
  ? [{ field: 'mode', legend: 'Value assigned at x = 1', options: [{ id: 'left', label: 'left piece' }, { id: 'right', label: 'right piece' }, { id: 'custom', label: 'v' }, { id: 'none', label: 'none' }] }] : [];
export const continuityFields = (s: ContinuityState): readonly string[] => s.kind === 'join' ? (s.mode === 'custom' ? ['c', 'm', 'v', 'a'] : ['c', 'm', 'a']) : ['a'];
export const CONTINUITY_WINDOW: WorldWindow = { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };

export function functionOf(s: ContinuityState): Univariate {
  if (s.kind === 'pole') return shiftedPole;
  if (s.kind === 'sqrt') return sqrtFn;
  return joinFunction(fromDecimal(s.c, 2)!, fromDecimal(s.m, 2)!, s.mode, fromDecimal(s.v, 2)!);
}
const yes = (ok: boolean, why: string) => ({ ...exactDesc(ok ? 'yes' : 'no'), note: ok ? undefined : why, status: ok ? 'exact' as const : 'undefined' as const });

export function deriveContinuity(s: ContinuityState): CalcDerived {
  const f = functionOf(s), A = fromDecimal(s.a, 2)!, d = analyse(f, A), a = gtext(s.a);
  const exists = d.value.kind === 'value', hasLimit = d.limit !== null, equal = d.kind === 'continuous';
  const oneSidedOk = !hasLimit && (d.continuousLeft || d.continuousRight) && (d.left.kind === 'none' || d.right.kind === 'none') && (d.left.kind !== 'none' || d.right.kind !== 'none');
  const status = equal ? 'continuous' : oneSidedOk ? (d.continuousRight ? 'right-continuous' : 'left-continuous') : !exists && hasLimit ? 'removable-missing' : d.kind;
  // Global reading: every special abscissa in view, classified by the same analysis.
  const breaks = f.special.filter(b => toNumber(b) >= CONTINUITY_WINDOW.xMin && toNumber(b) <= CONTINUITY_WINDOW.xMax)
    .map(b => ({ x: toNumber(b), kind: analyse(f, b).kind })).filter(b => b.kind !== 'continuous' && !(s.kind === 'sqrt' && b.x === 0));
  const plot = scene('graph', `Continuity of f(x) = ${f.text} at a = ${a}`, '', CONTINUITY_WINDOW);
  plot.curves.push({ name: 'graph', lines: cachedCurve(f.id, curveOf(f), CONTINUITY_WINDOW, f.breaks), role: 'ink', width: 2.5 });
  plot.markers.push(...graphMarkers(f, CONTINUITY_WINDOW, 'ink'));
  plot.segments.push({ name: 'line-a', from: { x: s.a, y: CONTINUITY_WINDOW.yMin }, to: { x: s.a, y: CONTINUITY_WINDOW.yMax }, role: equal ? 'derived' : 'caution', dashed: true, width: 1.5 });
  if (s.kind === 'join' && s.mode === 'custom') plot.handles.push({ id: 'v', label: `assigned value f(1) = ${gtext(s.v)}`, at: { x: 1, y: s.v }, role: 'primary', xField: 'a', yField: 'v', step: 0.25,
    spec: { ...continuitySpecs.a, domain: { min: 1, max: 1 } }, write: (_x, y) => ({ v: y }) });
  plot.handles.push({ id: 'a', label: `point a = ${a}`, at: { x: s.a, y: CONTINUITY_WINDOW.yMin + 0.4 }, role: 'x', xField: 'a', step: 0.25 });
  plot.description = `Graph of f(x) = ${f.text}${s.kind === 'join' ? ` with c = ${gtext(s.c)}, m = ${gtext(s.m)}` : ''}. At a = ${a}: f(a) ${exists ? valueText(d.value as { value: number }) : 'undefined'}, left limit ${oneSidedText(d.left)}, right limit ${oneSidedText(d.right)}. `
    + (breaks.length ? `Discontinuities in view at x = ${breaks.map(b => gtext(b.x)).join(', ')}.` : 'No discontinuity in view.');
  const aTex = gtex(s.a);
  const formulas = [
    `\\text{(i) } f(${aTex})${exists ? `=${valueTex(d.value as { value: number })}` : '\\ \\text{undefined}'}`,
    `\\text{(ii) } \\lim_{x\\to ${aTex}^-}f${eqOneSided(d.left)},\\quad \\lim_{x\\to ${aTex}^+}f${eqOneSided(d.right)}`,
    `\\text{(iii) }\\lim_{x\\to ${aTex}}f(x)${hasLimit && exists ? (equal ? '=' : '\\ne ') + `f(${aTex})` : '\\ \\text{cannot be compared}'}`,
    ...(s.kind === 'join' ? [`x^2+c\\big|_{x=1}=1+${s.c < 0 ? `(${gtex(s.c)})` : gtex(s.c)}=${gtex(1 + s.c)}`, `m\\,x\\big|_{x=1}=${gtex(s.m)}`] : []),
  ];
  const rows = [
    row('a', 'a', 'Point', givenDesc(s.a), 'x'),
    row('fa', 'f(a)', 'Value at a', pointDesc(d.value), 'primary'),
    row('left', '\\lim_{x\\to a^-}', 'Left limit', oneSidedDesc(d.left), 'derived'), row('right', '\\lim_{x\\to a^+}', 'Right limit', oneSidedDesc(d.right), 'derived'),
    row('c1', '\\text{(i)}', 'f(a) exists', yes(exists, 'a is not in the domain.'), 'ink'),
    row('c2', '\\text{(ii)}', 'The two-sided limit exists', yes(hasLimit, 'The one-sided limits are not one finite number.'), 'ink'),
    row('c3', '\\text{(iii)}', 'The limit equals f(a)', yes(equal, exists && hasLimit ? 'The limit and the value differ.' : 'Needs (i) and (ii).'), 'ink'),
    row('global', '\\mathcal D', 'Discontinuities in view', exactDesc(breaks.length ? breaks.map(b => `at ${gtext(b.x)} (${b.kind})`).join('; ') : 'none'), 'ink', true),
  ];
  const verdict = ({
    continuous: `Continuous at ${a}: f(${a}) exists, the limit exists, and they agree.${breaks.length ? ` (The function still breaks elsewhere: continuity is a LOCAL property.)` : ''}`,
    'right-continuous': `At the endpoint ${a} only the right side exists, and f(${a}) equals the right limit: continuous from the right, which is what continuity means at the edge of the domain.`,
    'left-continuous': `Only the left side exists, and it matches f(${a}): continuous from the left.`,
    'removable-missing': `The limit exists but f(${a}) is undefined: condition (i) fails. Defining f(${a}) as the limit would remove the discontinuity.`,
    removable: `A removable discontinuity: the limit exists but differs from f(${a}).`,
    jump: `A jump: the one-sided limits ${oneSidedText(d.left)} and ${oneSidedText(d.right)} differ, so condition (ii) fails.${s.kind === 'join' ? ' Make 1 + c equal m to join the pieces.' : ''}`,
    infinite: `An infinite discontinuity: the values are unbounded near ${a}.`,
    oscillation: 'An oscillating discontinuity: no limit exists.', 'one-sided': 'Only one side exists, and it does not match the value.', outside: `${a} is outside the domain.`,
  } as Record<string, string>)[status] ?? '';
  const frames = traceFrom<CalcFrame>([
    { state: { semantic: { condition: 1, value: d.value }, title: '(i) Is f(a) defined?', detail: exists ? `Yes: f(${a}) = ${valueText(d.value as { value: number })}.` : `No: ${(d.value as { reason: string }).reason}`, formula: formulas[0]! } satisfies CalcFrame },
    { state: { semantic: { condition: 2, left: d.left, right: d.right, limit: d.limit }, title: '(ii) Does the limit exist?', detail: hasLimit ? `Yes: both sides approach ${valueText(d.limit!)}.` : `No: left ${oneSidedText(d.left)}, right ${oneSidedText(d.right)}.`, formula: formulas[1]! } satisfies CalcFrame },
    { state: { semantic: { condition: 3, continuous: equal, status }, title: '(iii) Do they agree?', detail: verdict, formula: formulas[2]! } satisfies CalcFrame },
  ]);
  return {
    rows, formulas, verdict, status, caution: !['continuous', 'right-continuous', 'left-continuous'].includes(status), scenes: [plot], frames,
    hint: 'Drag the marker on the x-axis, or use the left and right arrow keys, to move the point a. In custom mode the open value at x = 1 moves vertically. Numeric fields control the same state.',
    metrics: { a: s.a, fa: exists ? (d.value as { value: number }).value : null, limit: d.limit?.value ?? null, status, breaks: breaks.map(b => b.x).join(',') },
  };
}
