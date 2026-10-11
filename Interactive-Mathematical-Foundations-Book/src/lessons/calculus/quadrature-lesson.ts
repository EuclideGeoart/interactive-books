/** III.15 — numerical integration: rectangle, midpoint and trapezoid rules under refinement, with observed convergence orders. */
import { fromDecimal, sub, toNumber, type Rational } from '../../math/quantity/rational';
import { INTEGRANDS, integrandText, reference, riemann, type Integrand, type Rule } from '../../math/calculus/integration';
import { traceFrom } from '../../platform/trace';
import type { Point, WorldWindow } from '../../platform/geometry/viewport';
import { cachedCurve, sciDesc, sciTex, sciText, exactDesc, gtext, givenDesc, numericDesc, ratDesc, row, rtex, rtext, scene, spec, undefinedDesc, valueDesc, valueTex, valueText, type CalcChoice, type CalcDerived, type CalcFrame } from './calculus-view';

export interface QuadratureState { fn: string; k: number; rule: Rule }
export const QUADRATURE_CANONICAL: QuadratureState = { fn: 'square', k: 2, rule: 'trapezoid' };
interface Problem { g: Integrand; a: number; b: number; window: WorldWindow; note: string }
export const PROBLEMS: Readonly<Record<string, Problem>> = {
  square: { g: INTEGRANDS.square!, a: 0, b: 1, window: { xMin: -0.25, xMax: 1.25, yMin: -0.25, yMax: 1.25 }, note: 'smooth; exact answer 1/3' },
  signed: { g: INTEGRANDS.signed!, a: -1, b: 2, window: { xMin: -1.25, xMax: 2.25, yMin: -1.5, yMax: 6.5 }, note: 'signed: positive and negative parts cancel partly; exact 9/4' },
  kink: { g: INTEGRANDS.kink!, a: 0, b: 1, window: { xMin: -0.25, xMax: 1.25, yMin: -0.25, yMax: 1 }, note: 'a corner at 1/3, never a grid point; exact 5/18' },
  sin: { g: INTEGRANDS.sin!, a: 0, b: 3, window: { xMin: -0.25, xMax: 3.25, yMin: -0.5, yMax: 1.5 }, note: 'smooth; reference 1 − cos 3 in binary64' },
  sqrt: { g: INTEGRANDS.sqrt!, a: 0, b: 1, window: { xMin: -0.25, xMax: 1.25, yMin: -0.25, yMax: 1.25 }, note: 'infinite slope at 0: lower convergence order; reference 2/3' },
};
export const quadraturePresets = [
  { id: 'square', label: 'x² on [0, 1]', state: QUADRATURE_CANONICAL },
  { id: 'left', label: 'Left rule: order 1', state: { ...QUADRATURE_CANONICAL, rule: 'left' } },
  { id: 'signed', label: 'Signed x³ − x', state: { fn: 'signed', k: 3, rule: 'midpoint' } },
  { id: 'kink', label: 'Corner |x − 1/3|', state: { fn: 'kink', k: 3, rule: 'trapezoid' } },
  { id: 'sine', label: 'sin x on [0, 3]', state: { fn: 'sin', k: 3, rule: 'trapezoid' } },
  { id: 'sqrt', label: '√x: slower', state: { fn: 'sqrt', k: 3, rule: 'trapezoid' } },
] as const satisfies readonly { id: string; label: string; state: QuadratureState }[];
export const quadratureSpecs = { k: spec('k', 2, 'refinement level k (n = 2ᵏ panels)', 'k', 0, 10, 1, 0) };
export const quadratureChoices = (): readonly CalcChoice[] => [{ field: 'rule', legend: 'Rule', options: [{ id: 'left', label: 'left' }, { id: 'right', label: 'right' }, { id: 'midpoint', label: 'midpoint' }, { id: 'trapezoid', label: 'trapezoid' }] }];
const RULES: readonly Rule[] = ['left', 'right', 'midpoint', 'trapezoid'];
const convWindow = (low: number): WorldWindow => ({ xMin: -0.75, xMax: 10.75, yMin: Math.max(-17, Math.floor(low) - 1), yMax: 0.75 });
const lg = (v: number) => (v > 0 ? Math.log10(v) : -16.75);
type Num = { value: number; exact?: Rational };

/** Errors for n = 1 … 1024 do not depend on the selected k, so they are computed once per (problem, rule). */
const errorCache = new Map<string, Num[]>();
export function errorsFor(p: Problem, rule: Rule): Num[] {
  const key = `${p.g.id}|${p.a}|${p.b}|${rule}`, hit = errorCache.get(key);
  if (hit) return hit;
  const out = computeErrors(p, rule); errorCache.set(key, out); return out;
}
function computeErrors(p: Problem, rule: Rule): Num[] {
  const A = fromDecimal(p.a, 2)!, B = fromDecimal(p.b, 2)!, I = reference(p.g, A, B);
  return Array.from({ length: 11 }, (_, k) => { const s = riemann(p.g, A, B, 2 ** k, rule); if (s.kind !== 'value') return { value: NaN };
    return s.exact && I.exact ? { value: Math.abs(toNumber(sub(s.exact, I.exact))), exact: sub(s.exact, I.exact) } : { value: Math.abs(s.value - I.value) }; });
}
/** Observed order p_k = log₂(E_{k−1}/E_k): halving h divides the error by about 2^p. */
export const observedOrder = (e: readonly Num[], k: number) => (k > 0 && e[k]!.value > 0 && e[k - 1]!.value > 0 ? Math.log2(e[k - 1]!.value / e[k]!.value) : null);

export function deriveQuadrature(s: QuadratureState): CalcDerived {
  const P = PROBLEMS[s.fn] ?? PROBLEMS.square!, A = fromDecimal(P.a, 2)!, B = fromDecimal(P.b, 2)!, n = 2 ** s.k;
  const sum = riemann(P.g, A, B, n, s.rule), I = reference(P.g, A, B), table = new Map(RULES.map(r => [r, errorsFor(P, r)]));
  const errs = table.get(s.rule)!, e = errs[s.k]!, order = observedOrder(errs, s.k);
  const plot = scene('integrand', `${s.rule} rule, n = ${n}, for f(x) = ${integrandText(P.g)} on [${gtext(P.a)}, ${gtext(P.b)}]`, '', P.window);
  if (n <= 64) for (const [k, p] of sum.panels.entries()) plot.polygons.push({ name: `panel-${k}`, corners: [{ x: p.x0, y: 0 }, { x: p.x1, y: 0 }, { x: p.x1, y: p.heights[1] }, { x: p.x0, y: p.heights[0] }], role: p.signed >= 0 ? 'y' : 'caution' });
  plot.curves.push({ name: 'graph', lines: cachedCurve(`${P.g.id}-q`, x => P.g.f.number(x), P.window, P.g.f.breaks, 600), role: 'ink', width: 2.5 });
  plot.description = `f(x) = ${integrandText(P.g)} (${P.note}). ${n <= 64 ? `${n} ${s.rule} panels are drawn.` : `With n = ${n} the panels are narrower than a pixel and are not drawn.`} Approximation ${sum.kind === 'value' ? valueText(sum) : 'undefined'}, reference ${valueText(I)}.`;
  const low = Math.min(...RULES.flatMap(r => table.get(r)!.map(v => lg(v.value)))), CONV = convWindow(low);
  const conv = scene('convergence', 'log₁₀ |error| versus k (n = 2ᵏ)', '', CONV);
  const roles = { left: 'x', right: 'y', midpoint: 'derived', trapezoid: 'primary' } as const;
  for (const r of RULES) conv.curves.push({ name: `conv-${r}`, lines: [table.get(r)!.map((v, k) => ({ x: k, y: lg(v.value) })) as Point[]], role: roles[r], width: r === s.rule ? 3 : 1.6, dashed: r !== s.rule });
  conv.markers.push({ name: 'now', at: { x: s.k, y: lg(e.value) }, role: roles[s.rule], filled: true });
  conv.handles.push({ id: 'k', label: `refinement level k = ${s.k}, n = ${n}, error ${sciText(e.value)}`, at: { x: s.k, y: lg(e.value) }, role: 'primary', xField: 'k', step: 1 });
  conv.description = `Errors of all four rules for n = 1 … 1024 on a log scale. The selected ${s.rule} rule has error ${sciText(e.value)} at n = ${n}${order !== null ? `; halving h divided it by about ${(2 ** order).toFixed(2)}` : ''}.`;
  const tbl = { caption: `${s.rule} rule: error and observed order as n doubles`, head: ['k', 'n', 'error', 'observed order'],
    rows: errs.map((v, k) => [`${k}`, `${2 ** k}`, v.exact ? rtext(v.exact) : sciText(v.value), observedOrder(errs, k)?.toFixed(3) ?? '—']) };
  const theory = s.rule === 'left' || s.rule === 'right' ? 1 : 2;
  const formulas = [
    `h=\\frac{b-a}{n}=\\frac{${gtext(P.b)}-${P.a < 0 ? `(${gtext(P.a)})` : gtext(P.a)}}{${n}}`,
    `Q_n${sum.kind === 'value' && sum.exact ? '=' : '\\approx'}${sum.kind === 'value' ? valueTex(sum) : '\\text{undefined}'}`,
    `\\int_{${gtext(P.a)}}^{${gtext(P.b)}}f\\,dx${I.exact ? '=' : '\\approx'}${valueTex(I)}`,
    `|Q_n-I|${e.exact ? '=' : '\\approx'}${e.exact ? rtex(e.exact.num < 0n ? { num: -e.exact.num, den: e.exact.den } : e.exact) : sciTex(e.value)}`,
    `|T_n-I|\\le\\frac{(b-a)\\,h^2}{12}\\max|f''|\\ \\ (f''\\text{ bounded})`,
    `|L_n-I|\\le\\frac{(b-a)\\,h}{2}\\max|f'|`,
  ];
  const rows = [
    row('n', 'n', 'Panels (n = 2ᵏ)', givenDesc(n), 'ink'), row('rule', '\\text{rule}', 'Rule', exactDesc(s.rule), 'ink'),
    row('approx', 'Q_n', 'Approximation', sum.kind === 'value' ? valueDesc(sum) : undefinedDesc(sum.reason), 'primary'),
    row('reference', 'I', 'Reference integral', valueDesc(I), 'derived'),
    row('error', '|Q_n-I|', 'Error', e.exact ? ratDesc(e.exact.num < 0n ? { num: -e.exact.num, den: e.exact.den } : e.exact) : sciDesc(e.value), 'caution'),
    row('order', 'p', 'Observed order (log₂ of the error ratio for n/2 and n)', order === null ? undefinedDesc(s.k === 0 ? 'Needs the previous refinement level.' : 'An error is exactly zero.') : numericDesc(order), 'derived'),
    row('theory', 'p_{\\text{smooth}}', 'Expected order for smooth f', givenDesc(theory), 'ink', true),
  ];
  const status = s.fn === 'sqrt' || s.fn === 'kink' ? 'nonsmooth' : order !== null && Math.abs(order - theory) < 0.2 ? 'expected-order' : 'converging';
  const verdict = s.fn === 'sqrt' ? `√x has an infinite slope at 0, so the trapezoid error shrinks like h to the power 1.5, not h²: the smooth-case bound does not apply.`
    : s.fn === 'kink' ? `The corner of |x − 1/3| falls inside a panel for every n = 2ᵏ, so convergence is erratic in the first refinements; the guaranteed rate needs a bounded second derivative on every panel.`
      : `Halving h divides the ${s.rule} error by about ${order !== null ? (2 ** order).toFixed(2) : '?'}: observed order ${order?.toFixed(2) ?? '?'}, expected ${theory} for smooth f. ${s.fn === 'signed' ? 'Positive and negative areas cancel in the integral; the rule must approximate both parts.' : ''}`;
  const frames = traceFrom<CalcFrame>([0, 2, 4, 6, 8, 10].map(k => ({ state: { semantic: { k, n: 2 ** k, error: errs[k]!.exact ?? errs[k]!.value, order: observedOrder(errs, k) }, title: `n = ${2 ** k}`,
    detail: `Error ${errs[k]!.exact ? rtext(errs[k]!.exact!) : sciText(errs[k]!.value)}${observedOrder(errs, k) !== null ? `; observed order ${observedOrder(errs, k)!.toFixed(3)}` : ''}.`,
    formula: `n=${2 ** k}:\\ |Q_n-I|${errs[k]!.exact ? '=' : '\\approx'}${errs[k]!.exact ? rtex(errs[k]!.exact!.num < 0n ? { num: -errs[k]!.exact!.num, den: errs[k]!.exact!.den } : errs[k]!.exact!) : sciTex(errs[k]!.value)}` } satisfies CalcFrame })));
  return {
    rows, formulas, verdict, status, caution: status === 'nonsmooth', scenes: [plot, conv], frames, table: tbl,
    hint: 'The point on the convergence plot moves along k: drag horizontally or use the left and right arrow keys (n doubles per step). Numeric fields control the same state.',
    metrics: { fn: s.fn, k: s.k, n, rule: s.rule, approx: sum.kind === 'value' ? sum.value : null, reference: I.value, error: e.value, order, status },
  };
}
