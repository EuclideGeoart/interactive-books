/** III.3 — derivative as secant → tangent. State: a function from the catalog, the point x and a step h (h = 0 is allowed and reported). */
import { abs as absR, add, fromDecimal, neg, sub as subR, toNumber, ZERO } from '../../math/quantity/rational';
import { SECANT_FUNCTIONS } from '../../math/calculus/catalog';
import { halvings, quotientPolynomial, secant } from '../../math/calculus/difference';
import { polyTex } from '../../math/calculus/polynomial';
import type { OneSided, Slope, Univariate } from '../../math/calculus/univariate';
import { traceFrom } from '../../platform/trace';
import type { WorldWindow } from '../../platform/geometry/viewport';
import {
  cachedCurve, gtex, gtext, givenDesc, graphMarkers, lineThrough, oneSidedDesc, oneSidedText, pg, pointDesc, rayFrom, row, rtex, rtext, scene, spec,
  undefinedDesc, valueDesc, valueTex, valueText, type CalcDerived, type CalcFrame,
} from './calculus-view';

export interface SecantState { fn: string; x: number; h: number }
export const SECANT_CANONICAL: SecantState = { fn: 'cubic', x: 1, h: 1 };
export const secantPresets = [
  { id: 'smooth', label: 'Smooth cubic', state: SECANT_CANONICAL },
  { id: 'corner', label: 'Corner |x|', state: { fn: 'abs', x: 0, h: 1 } },
  { id: 'vertical', label: 'Vertical tangent ∛x', state: { fn: 'cbrt', x: 0, h: 1 } },
  { id: 'jump', label: 'Jump', state: { fn: 'jump', x: 0, h: 1 } },
  { id: 'endpoint', label: 'Endpoint √x', state: { fn: 'sqrt', x: 0, h: 1 } },
  { id: 'sine', label: 'sin x (binary64)', state: { fn: 'sin', x: 1, h: 1 } },
  { id: 'zero-h', label: 'h = 0', state: { fn: 'cubic', x: 1, h: 0 } },
] as const satisfies readonly { id: string; label: string; state: SecantState }[];
export const secantSpecs = {
  x: spec('x', 1, 'point x', 'x', -2.5, 2.5, 0.25),
  h: spec('h', 1, 'step h', 'h', -2, 2, 0.25),
};
export const WINDOW: WorldWindow = { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
const fnOf = (s: SecantState): Univariate => SECANT_FUNCTIONS[s.fn] ?? SECANT_FUNCTIONS.cubic!;

export function slopeStatus(d: Slope): string {
  if (d.kind === 'value') return 'differentiable';
  if (d.left.kind === 'finite' && d.right.kind === 'finite') return 'corner';
  if (d.left.kind === 'infinite' || d.right.kind === 'infinite') return 'vertical';
  if (d.left.kind === 'finite' || d.right.kind === 'finite') return 'one-sided';
  return 'undefined';
}
const sideTex = (v: OneSided) => v.kind === 'finite' ? valueTex(v) : v.kind === 'infinite' ? (v.sign > 0 ? '+\\infty' : '-\\infty') : '\\text{none}';

export function deriveSecant(s: SecantState): CalcDerived {
  const f = fnOf(s), X = fromDecimal(s.x, 2)!, H = fromDecimal(s.h, 2)!;
  const sec = secant(f, X, H), d = f.slope(X), fx = f.at(X), fxh = f.at(add(X, H));
  // A side where f is defined but its limit misses f(x) is a break (jump/removable): differentiability is impossible there.
  const broken = fx.kind === 'value' && (['left', 'right'] as const).some(side => {
    const l = f.limit(X, side);
    return l.kind === 'infinite' || (l.kind === 'finite' && !(l.exact && fx.exact ? l.exact.num * fx.exact.den === fx.exact.num * l.exact.den : l.value === fx.value));
  });
  const status = sec.kind === 'undefined' && s.h === 0 ? 'zero-h' : fx.kind === 'undefined' ? 'undefined-point' : d.kind === 'value' ? 'differentiable' : broken ? 'discontinuous' : slopeStatus(d);
  const plot = scene('graph', `Secant and tangent of f(x) = ${f.text}`, '', WINDOW);
  plot.curves.push({ name: 'graph', lines: cachedCurve(f.id, f.number, WINDOW, f.breaks), role: 'ink', width: 2.5 });
  plot.markers.push(...graphMarkers(f, WINDOW, 'ink'));
  const py = fx.kind === 'value' ? fx.value : 0, P = { x: s.x, y: py };
  const qx = toNumber(add(X, H)), qy = fxh.kind === 'value' ? fxh.value : 0, Q = { x: qx, y: qy };
  if (sec.kind === 'value') {
    const line = lineThrough(P, sec.slope, WINDOW);
    plot.segments.push({ name: 'secant', ...line, role: 'primary', width: 3 });
    plot.segments.push({ name: 'run', from: P, to: { x: qx, y: py }, role: 'x', width: 2.5 }, { name: 'rise', from: { x: qx, y: py }, to: Q, role: 'y', width: 2.5 });
    plot.labels.push({ name: 'label-run', at: { x: (s.x + qx) / 2, y: py }, text: 'h', role: 'x', dy: sec.rise >= 0 ? 16 : -16 },
      { name: 'label-rise', at: { x: qx, y: (py + qy) / 2 }, text: 'Δy', role: 'y', dx: s.h >= 0 ? 18 : -18, dy: 0 });
  }
  if (fx.kind === 'value') {
    if (d.kind === 'value') plot.segments.push({ name: 'tangent', ...lineThrough(P, d.value!, WINDOW), role: 'derived', dashed: true, width: 2.5 });
    else for (const side of ['left', 'right'] as const) {
      const one = d[side];
      if (one.kind === 'finite') plot.segments.push({ name: `tangent-${side}`, ...rayFrom(P, one.value, side, 2.5), role: 'derived', dashed: true, width: 2.5 });
      else if (one.kind === 'infinite') plot.segments.push({ name: `tangent-${side}`, from: P, to: { x: s.x, y: P.y + (side === 'left' ? -1 : 1) * one.sign * 2.5 }, role: 'derived', dashed: true, width: 2.5 });
    }
  }
  const valuePhrase = (v: typeof fx) => v.kind === 'value' ? `${v.exact ? '= ' : ''}${valueText(v)}` : 'undefined';
  plot.handles.push({ id: 'p', label: `point P at x = ${gtext(s.x)}, f(x) ${valuePhrase(fx)}`, at: P, role: 'primary', xField: 'x', step: 0.25 });
  const qSpec = { ...secantSpecs.h, id: 'q', name: 'second point x + h', symbolText: 'x + h', domain: { min: s.x - 2, max: s.x + 2 } };
  plot.handles.push({ id: 'q', label: `point Q at x + h = ${gtext(qx)}, f(x + h) ${valuePhrase(fxh)}`,
    at: Q, role: 'x', xField: 'h', step: 0.25, spec: qSpec, write: q => ({ h: Number((q - s.x).toFixed(2)) + 0 }) });
  plot.description = `Graph of f(x) = ${f.text}. P = (${gtext(s.x)}, ${fx.kind === 'value' ? valueText(fx) : 'undefined'}), Q at x + h = ${gtext(qx)}. `
    + (sec.kind === 'value' ? `The secant through P and Q has slope ${valueText({ value: sec.slope, exact: sec.exactSlope })}. ` : `No secant: ${sec.reason} `)
    + (d.kind === 'value' ? `The dashed tangent has slope ${valueText({ value: d.value!, exact: d.exact })}.` : `No tangent slope: ${d.reason}`);

  // h → 0 table, from both sides. Every entry is an actual secant computation with h ≠ 0.
  const base = s.h === 0 ? fromDecimal(1, 0)! : H;
  const steps = halvings(base, 7);
  const tableRows = steps.map((hk, k) => {
    const right = secant(f, X, hk), left = secant(f, X, neg(hk));
    const cell = (q: typeof right) => q.kind === 'value' ? valueText({ value: q.slope, exact: q.exactSlope }) : 'undefined';
    return [`${k}`, rtext(hk), cell(right), cell(left)];
  });
  const table = { caption: 'Secant slopes m(h) = [f(x+h) − f(x)]/h for shrinking nonzero steps, from both sides of x', head: ['k', 'h', 'm(h)', 'm(−h)'], rows: tableRows };

  const formulas: string[] = [];
  if (sec.kind === 'value') formulas.push(`m(h)=\\frac{f(x+h)-f(x)}{h}=\\frac{f(${gtex(toNumber(add(X, H)))})-f(${gtex(s.x)})}{${pg(s.h)}}=\\frac{${valueTex(sec.fxh)}-${sec.fx.value < 0 ? `(${valueTex(sec.fx)})` : valueTex(sec.fx)}}{${pg(s.h)}}${sec.exactSlope ? '=' : '\\approx'}${valueTex({ value: sec.slope, exact: sec.exactSlope })}`);
  else formulas.push(s.h === 0 ? `m(0)=\\frac{f(x+0)-f(x)}{0}\\quad\\text{is undefined: division by zero}` : `m(h)\\ \\text{is undefined: } f\\text{ has no value at an endpoint of the secant}`);
  if (f.poly) { const m = quotientPolynomial(f.poly, X); formulas.push(`m(h)=${polyTex(m, 'h')}\\quad(h\\ne0),\\qquad \\lim_{h\\to0}m(h)=${rtex(m.coefficients[0] ?? ZERO)}`); }
  formulas.push(d.kind === 'value' ? `f'(${gtex(s.x)})=\\lim_{h\\to0}\\frac{f(${gtex(s.x)}+h)-f(${gtex(s.x)})}{h}${d.exact ? '=' : '\\approx'}${valueTex({ value: d.value!, exact: d.exact })}`
    : `\\lim_{h\\to0^-}m(h)=${sideTex(d.left)},\\qquad \\lim_{h\\to0^+}m(h)=${sideTex(d.right)}\\quad\\Rightarrow\\quad f'(${gtex(s.x)})\\ \\text{does not exist}`);

  const gap = sec.kind === 'value' && d.kind === 'value' ? (sec.exactSlope && d.exact ? { value: Math.abs(sec.slope - d.value!), exact: absR(subR(sec.exactSlope, d.exact)) } : { value: Math.abs(sec.slope - d.value!) }) : null;
  const rows = [
    row('x', 'x', 'Point', givenDesc(s.x), 'primary'), row('h', 'h', 'Step (must be nonzero for a secant)', givenDesc(s.h), 'x'),
    row('fx', 'f(x)', 'Value at x', pointDesc(fx), 'primary'), row('fxh', 'f(x+h)', 'Value at x + h', pointDesc(fxh), 'x'),
    row('secant', 'm(h)', 'Secant slope', sec.kind === 'value' ? valueDesc({ value: sec.slope, exact: sec.exactSlope }) : undefinedDesc(sec.reason), 'primary'),
    row('tangent', "f'(x)", 'Tangent slope (derived separately)', d.kind === 'value' ? valueDesc({ value: d.value!, exact: d.exact }) : undefinedDesc(d.reason!), 'derived'),
    row('left', "f'_-(x)", 'Left slope limit', oneSidedDesc(d.left), 'derived', true), row('right', "f'_+(x)", 'Right slope limit', oneSidedDesc(d.right), 'derived', true),
    row('gap', "|m(h)-f'(x)|", 'Secant − tangent gap', gap ? valueDesc(gap) : undefinedDesc('Needs both a secant slope and a derivative.'), 'derived', true),
  ];
  const verdict = status === 'zero-h' ? 'h = 0 gives no secant: two equal points determine no line, and the quotient divides by zero. Shrink h toward 0 instead; the tangent slope is the limit of nonzero secant slopes.'
    : status === 'undefined-point' ? `f(${gtext(s.x)}) is undefined, so there is no point P and no derivative here.`
      : status === 'differentiable' ? `The secant slope ${sec.kind === 'value' ? valueText({ value: sec.slope, exact: sec.exactSlope }) : 'is undefined'} approaches the tangent slope f′(${gtext(s.x)}) ${d.exact ? '=' : '≈'} ${valueText({ value: d.value!, exact: d.exact }).replace(/^≈ /, '')} as h → 0 from either side.`
        : status === 'corner' ? `A corner: secants from the left approach ${oneSidedText(d.left)} and from the right approach ${oneSidedText(d.right)}. The two-sided limit does not exist, so f′(${gtext(s.x)}) does not exist.`
          : status === 'vertical' ? `The secant slopes grow without bound as h → 0: the tangent is vertical and f′(${gtext(s.x)}) does not exist as a real number.`
            : status === 'discontinuous' ? `f jumps at x = ${gtext(s.x)}: its one-sided limits do not both equal f(${gtext(s.x)}), so secants from the broken side have unbounded slopes. A function must be continuous where it is differentiable.`
            : status === 'one-sided' ? `Only one side has a finite slope limit (${oneSidedText(d.left)} from the left, ${oneSidedText(d.right)} from the right). ${d.reason}` : d.reason ?? '';
  const frames = traceFrom<CalcFrame>([
    ...steps.slice(0, 6).map((hk, k) => {
      const q = secant(f, X, hk);
      return { state: { semantic: { k, h: hk, slope: q.kind === 'value' ? (q.exactSlope ?? q.slope) : null }, title: `Secant ${k + 1}: h = ${rtext(hk)}`,
        detail: q.kind === 'value' ? `Two distinct points, x and x + h, give the slope ${valueText({ value: q.slope, exact: q.exactSlope })}. No division by zero occurs.` : `No secant: ${q.reason}`,
        formula: q.kind === 'value' ? `m\\left(${rtex(hk)}\\right)=\\frac{f(${gtex(s.x)}+${rtex(hk)})-f(${gtex(s.x)})}{${rtex(hk)}}${q.exactSlope ? '=' : '\\approx'}${valueTex({ value: q.slope, exact: q.exactSlope })}` : `m(h)\\ \\text{undefined}` } satisfies CalcFrame };
    }),
    { state: { semantic: { derivative: d.kind === 'value' ? (d.exact ?? d.value) : null, left: d.left, right: d.right }, title: 'The limit, derived separately',
      detail: d.kind === 'value' ? `The analytic derivative is f′(${gtext(s.x)}) ${d.exact ? '=' : '≈'} ${valueText({ value: d.value!, exact: d.exact }).replace(/^≈ /, '')}. The table shows the secant slopes approaching it; the table alone is evidence, not proof.` : `No derivative: ${d.reason}`,
      formula: formulas.at(-1)! } satisfies CalcFrame },
  ]);
  return {
    rows, formulas, verdict, status, caution: !['differentiable'].includes(status), scenes: [plot], frames, table,
    hint: 'P and Q slide along the graph: drag horizontally, or use the left and right arrow keys (steps of 0.25; Shift for larger steps). Numeric fields control the same state.',
    metrics: { x: s.x, h: s.h, px: P.x, py: fx.kind === 'value' ? fx.value : null, qx, qy: fxh.kind === 'value' ? fxh.value : null,
      secant: sec.kind === 'value' ? sec.slope : null, secantExact: sec.kind === 'value' && sec.exactSlope ? rtext(sec.exactSlope) : null,
      tangent: d.kind === 'value' ? d.value! : null, status },
  };
}
