/** III.14 — numerical differentiation in binary64: truncation versus rounding, and why ever-smaller h is not better. */
import { fromDecimal, toNumber } from '../../math/quantity/rational';
import { budget, EPS, finiteDifference, optimalStep, type FiniteDifference, type Scheme } from '../../math/calculus/difference';
import { evalPolyNumber, derivative, evalPoly } from '../../math/calculus/polynomial';
import { cubic } from '../../math/calculus/catalog';
import { traceFrom } from '../../platform/trace';
import type { Point, WorldWindow } from '../../platform/geometry/viewport';
import { sciDesc, sciText, exactDesc, gtext, givenDesc, numericDesc, ratDesc, row, scene, spec, type CalcDerived, type CalcFrame } from './calculus-view';

export interface FDState { fn: string; x: number; k: number }
export const FD_CANONICAL: FDState = { fn: 'sin', x: 1, k: 4 };
export const fdPresets = [
  { id: 'sin', label: 'sin x at 1', state: FD_CANONICAL },
  { id: 'optimal', label: 'Near the best forward h', state: { ...FD_CANONICAL, k: 8 } },
  { id: 'tiny', label: 'Tiny h = 10⁻¹⁴', state: { ...FD_CANONICAL, k: 14 } },
  { id: 'exp', label: 'eˣ at 2', state: { fn: 'exp', x: 2, k: 5 } },
  { id: 'cubic', label: 'Polynomial x³/6 − x', state: { fn: 'cubic', x: 1.5, k: 6 } },
] as const satisfies readonly { id: string; label: string; state: FDState }[];
export const fdSpecs = { x: spec('x', 1, 'point x', 'x', -3, 3, 0.25), k: spec('k', 4, 'step exponent k (h = 10⁻ᵏ)', 'k', 1, 16, 1, 0) };
interface FD { f: (x: number) => number; ref: (x: number) => number; m2: (x: number) => number; m3: (x: number) => number; text: string; refText: string }
/** Each reference derivative is an INDEPENDENT analytic formula (not a difference quotient); bounds on f″ and f‴ near x are stated analytically. */
export const FD_FUNCTIONS: Readonly<Record<string, FD>> = {
  sin: { f: Math.sin, ref: Math.cos, m2: () => 1, m3: () => 1, text: 'sin x', refText: 'cos x' },
  exp: { f: Math.exp, ref: Math.exp, m2: x => Math.exp(x + 0.1), m3: x => Math.exp(x + 0.1), text: 'eˣ', refText: 'eˣ' },
  cubic: { f: x => evalPolyNumber(cubic.poly!, x), ref: x => toNumber(evalPoly(derivative(cubic.poly!), fromDecimal(x, 2)!)), m2: x => Math.abs(x) + 0.1, m3: () => 1, text: 'x³/6 − x', refText: 'x²/2 − 1' },
};
const SCHEMES: readonly Scheme[] = ['forward', 'backward', 'centered'];
const W: WorldWindow = { xMin: -17, xMax: 0.5, yMin: -18, yMax: 1.5 };
const lg = (v: number) => (v > 0 ? Math.log10(v) : -17.5); // an exactly zero error is drawn at the floor and labelled as such
const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
/** Scientific notation with superscript exponent, e.g. 1.23×10⁻⁵; an exactly zero error is said in words. */
const pow10 = (k: number) => `10⁻${[...String(k)].map(c => SUP[c]).join('')}`;
const sci = (v: number) => { if (v === 0) return '0 (exactly)'; const [m, e] = v.toExponential(2).split('e'); return `${m}×10${[...String(Number(e))].map(c => SUP[c] ?? c).join('')}`; };

export function deriveFD(s: FDState): CalcDerived {
  const F = FD_FUNCTIONS[s.fn] ?? FD_FUNCTIONS.sin!, x = s.x, ref = F.ref(x), m2 = F.m2(x), m3 = F.m3(x);
  const all = new Map<Scheme, FiniteDifference[]>(SCHEMES.map(sc => [sc, Array.from({ length: 16 }, (_, i) => finiteDifference(F.f, x, 10 ** -(i + 1), sc, ref, m2, m3))]));
  const at = (sc: Scheme) => all.get(sc)![s.k - 1]!;
  const plot = scene('errors', 'log₁₀|error| vs log₁₀ h: forward (blue), backward (dashed green), centered (orange), budgets (dashed purple)', '', W);
  const line = (sc: Scheme) => all.get(sc)!.map((d, i) => ({ x: -(i + 1), y: lg(d.error) })) as Point[];
  plot.curves.push({ name: 'forward', lines: [line('forward')], role: 'x', width: 2.5 }, { name: 'backward', lines: [line('backward')], role: 'y', width: 2, dashed: true },
    { name: 'centered', lines: [line('centered')], role: 'primary', width: 2.5 });
  const model = (sc: 'forward' | 'centered') => all.get(sc)!.map((d, i) => ({ x: -(i + 1), y: lg(d.truncationBudget + d.roundingBudget) })) as Point[];
  plot.curves.push({ name: 'budget-forward', lines: [model('forward')], role: 'derived', dashed: true, width: 1.6 }, { name: 'budget-centered', lines: [model('centered')], role: 'derived', dashed: true, width: 1.6 });
  for (const sc of SCHEMES) plot.markers.push({ name: `now-${sc}`, at: { x: -s.k, y: lg(at(sc).error) }, role: sc === 'forward' ? 'x' : sc === 'backward' ? 'y' : 'primary', filled: sc !== 'backward' });
  plot.handles.push({ id: 'k', label: `step h = ${pow10(s.k)}, centered error ${sci(at('centered').error)}`, at: { x: -s.k, y: lg(at('centered').error) }, role: 'primary', xField: 'k', step: 1,
    spec: { ...fdSpecs.k, id: 'log-h', domain: { min: -16, max: -1 } }, write: v => ({ k: Math.min(16, Math.max(1, Math.round(-v))) }) });
  plot.description = `Observed errors of three binary64 difference quotients of f(x) = ${F.text} at x = ${gtext(x)} for h = 10⁻¹ … 10⁻¹⁶, against the reference derivative ${F.refText}. `
    + `Errors first fall (truncation) then rise (rounding); the dashed curves are the documented error budgets. At h = ${pow10(s.k)}: forward ${sci(at('forward').error)}, centered ${sci(at('centered').error)}.`;
  const hf = optimalStep('forward', Math.abs(F.f(x)), m2, m3), hc = optimalStep('centered', Math.abs(F.f(x)), m2, m3);
  const table = { caption: `Errors of binary64 quotients against the independent reference derivative ${F.refText}${s.fn === 'cubic' ? ' (exact rational)' : ''}`, head: ['k', 'h', 'forward error', 'centered error', 'forward budget'],
    rows: all.get('forward')!.map((d, i) => [`${i + 1}`, pow10(i + 1), sci(d.error), sci(all.get('centered')![i]!.error), sci(budget(d))]) };
  const c = at('centered'), f = at('forward'), b = at('backward');
  const dominated = f.truncationBudget >= f.roundingBudget ? 'truncation' : 'rounding';
  const formulas = [
    `D_+=\\frac{f(x+h)-f(x)}{h},\\quad D_-=\\frac{f(x)-f(x-h)}{h}`,
    `D_0=\\frac{f(x+h)-f(x-h)}{2h}`,
    `|D_+-f'|\\lesssim \\underbrace{\\tfrac{h}{2}\\max|f''|}_{\\text{truncation}}+\\underbrace{\\frac{\\varepsilon\\,(|f(x+h)|+|f(x)|)}{h}}_{\\text{rounding}},\\quad \\varepsilon=2^{-52}`,
    `|D_0-f'|\\lesssim \\tfrac{h^2}{6}\\max|f'''|+\\frac{\\varepsilon\\,(|f(x+h)|+|f(x-h)|)}{2h}`,
    `h^*_{+}\\approx\\sqrt{4\\varepsilon|f|/|f''|}\\approx ${hf.toExponential(2).replace('e', '\\times10^{').replace(/$/, '}')},\\qquad h^*_{0}\\approx\\sqrt[3]{3\\varepsilon|f|/|f'''|}\\approx ${hc.toExponential(2).replace('e', '\\times10^{').replace(/$/, '}')}`,
  ];
  const rows = [
    row('x', 'x', 'Point', givenDesc(x), 'ink'), row('h', 'h', 'Step', exactDesc(pow10(s.k)), 'primary'),
    row('ref', "f'(x)", `Reference derivative (${F.refText})`, s.fn === 'cubic' ? ratDesc(evalPoly(derivative(cubic.poly!), fromDecimal(x, 2)!)) : numericDesc(ref), 'derived'),
    row('forward', 'D_+', 'Forward difference', numericDesc(f.estimate), 'x'), row('backward', 'D_-', 'Backward difference', numericDesc(b.estimate), 'y'),
    row('centered', 'D_0', 'Centered difference', numericDesc(c.estimate), 'primary'),
    row('err-forward', '|D_+-f\'|', 'Forward error', sciDesc(f.error), 'x', true), row('err-centered', '|D_0-f\'|', 'Centered error', sciDesc(c.error), 'primary', true),
    row('trunc', '\\tfrac h2|f\'\'|', 'Forward truncation budget', sciDesc(f.truncationBudget), 'derived', true), row('round', '\\varepsilon|f|/h', 'Forward rounding budget', sciDesc(f.roundingBudget), 'derived', true),
    row('eps', '\\varepsilon', 'Machine epsilon (binary64)', sciDesc(EPS), 'ink', true),
  ];
  const verdict = dominated === 'truncation'
    ? `At h = ${pow10(s.k)} truncation dominates: shrinking h still helps. The centered difference (error ${sci(c.error)}) beats forward (${sci(f.error)}) because its truncation error is O(h²).`
    : `At h = ${pow10(s.k)} rounding dominates: f(x+h) and f(x) agree in most digits, their difference keeps few correct ones, and dividing by a tiny h magnifies the loss. Forward error ${sci(f.error)} — larger than at moderate h. The best forward step is about ${sciText(hf, 2)}, the best centered about ${sciText(hc, 2)}.`;
  const frames = traceFrom<CalcFrame>([1, 4, 8, 12, 16].map(k => {
    const d = all.get('forward')![k - 1]!, e = all.get('centered')![k - 1]!;
    return { state: { semantic: { k, forward: d.error, centered: e.error, truncation: d.truncationBudget, rounding: d.roundingBudget }, title: `h = ${pow10(k)}`,
      detail: `Forward error ${sci(d.error)} (budget: truncation ${sci(d.truncationBudget)}, rounding ${sci(d.roundingBudget)}); centered error ${sci(e.error)}.`,
      formula: `h=10^{-${k}}:\\quad |D_+-f'|\\approx ${d.error === 0 ? '0' : d.error.toExponential(2).replace('e', '\\times10^{') + '}'},\\quad |D_0-f'|\\approx ${e.error === 0 ? '0' : e.error.toExponential(2).replace('e', '\\times10^{') + '}'}` } satisfies CalcFrame };
  }));
  return {
    rows, formulas, verdict, status: dominated, caution: dominated === 'rounding', scenes: [plot], frames, table,
    hint: 'The orange point rides on the centered-error curve: drag horizontally, or use the left and right arrow keys, to change h by factors of ten. Numeric fields control the same state.',
    metrics: { x, k: s.k, ref, forward: f.estimate, centered: c.estimate, errForward: f.error, errCentered: c.error, budgetForward: budget(f), budgetCentered: budget(c), status: dominated, hForward: hf, hCentered: hc },
  };
}
