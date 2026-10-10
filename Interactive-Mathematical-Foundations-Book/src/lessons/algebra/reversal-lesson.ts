/**
 * Lesson views for the reversal stage of I.4: a true inequality between two numbers p and q, multiplied by k.
 * k > 0 keeps the order, k < 0 reverses it (a reflection of the line through 0), k = 0 is rejected.
 *
 *   ReversalDerived  →  { inspector rows, formulas, verdict, world-space scene, spoken text }
 */
import { rationalForm } from '../../math/quantity/exactform';
import { toNumber } from '../../math/quantity/rational';
import type { Order, ReversalDerived, ReversalState } from '../../math/algebra/reversal';
import type { ParamSpec } from '../../platform/params';
import type { InspectorRowData } from '../../ui/Inspector';
import { aligned } from '../shared/format';
import { baseTex, describeGiven, describeRational, rationalTex, statement } from '../quantities/values';

export const REVERSAL_LIMIT = 6;
export const K_LIMIT = 3;
export const CANONICAL_REVERSAL: ReversalState = Object.freeze({ p: 2, q: 5, k: -2 });
/** The top line shows p and q (±6); the bottom line shows kp and kq (up to 6 × 3 = 18). */
export const BEFORE_WINDOW = Object.freeze({ xMin: -8, xMax: 8 });
export const AFTER_WINDOW = Object.freeze({ xMin: -20, xMax: 20 });

const spec = (id: 'p' | 'q', value: number): ParamSpec => ({
  id, name: `number ${id}`, symbolTex: id, symbolText: id, domain: { min: -REVERSAL_LIMIT, max: REVERSAL_LIMIT }, default: value, step: 1, maxDecimals: 2, onInvalid: 'reject',
});
export const P_SPEC: ParamSpec = spec('p', CANONICAL_REVERSAL.p);
export const Q_SPEC: ParamSpec = spec('q', CANONICAL_REVERSAL.q);
export const K_SPEC: ParamSpec = {
  id: 'k', name: 'multiplier', symbolTex: 'k', symbolText: 'k', domain: { min: -K_LIMIT, max: K_LIMIT }, default: CANONICAL_REVERSAL.k, step: 1, maxDecimals: 2, onInvalid: 'reject',
};
export const REVERSAL_Y_SPEC: ParamSpec = { id: 'y', name: 'height', symbolTex: 'y', symbolText: 'y', domain: { min: 0, max: 0 }, default: 0, step: 1, onInvalid: 'reject' };

export interface ReversalPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: ReversalState }
const fmt = (n: number): string => String(n).replace('-', '−');
const preset = (id: string, p: number, q: number, k: number, aria: string): ReversalPreset =>
  Object.freeze({ id, label: `${fmt(p)} ? ${fmt(q)}, ×${fmt(k)}`.replace('?', p < q ? '<' : p > q ? '>' : '='), aria, state: Object.freeze({ p, q, k }) });
export const REVERSAL_PRESETS: readonly ReversalPreset[] = Object.freeze([
  preset('r-pos', 2, 5, 3, '2 is less than 5, multiplied by 3: the order is kept'),
  preset('r-neg', 2, 5, -2, '2 is less than 5, multiplied by minus 2: the order is reversed'),
  preset('r-neg-both', -4, 1, -3, 'minus 4 is less than 1, multiplied by minus 3: the order is reversed'),
  preset('r-half', 2, 6, 0.5, '2 is less than 6, multiplied by one half: a positive factor keeps the order'),
  preset('r-zero', 2, 5, 0, '2 is less than 5, multiplied by 0: rejected'),
  preset('r-equal', 3, 3, -2, '3 equals 3, multiplied by minus 2: an equality has no order to reverse'),
]);

// ---------------------------------------------------------------------------------------------- the order, written
const sym = (o: Order): string => (o === 'less' ? '<' : o === 'greater' ? '>' : '=');
const symTex = sym;
const symSpoken = (o: Order): string => (o === 'less' ? 'is less than' : o === 'greater' ? 'is greater than' : 'equals');
const t = (r: ReversalDerived['p']): string => rationalForm(r).text;

/** "2 < 5" */
export const orderText = (u: ReversalDerived['p'], o: Order, v: ReversalDerived['p']): string => `${t(u)} ${sym(o)} ${t(v)}`;
export const orderTex = (u: ReversalDerived['p'], o: Order, v: ReversalDerived['p']): string => `${rationalTex(u)}${symTex(o)}${rationalTex(v)}`;
const orderSpoken = (u: ReversalDerived['p'], o: Order, v: ReversalDerived['p']): string => `${rationalForm(u).spoken} ${symSpoken(o)} ${rationalForm(v).spoken}`;

const flipOrder = (o: Order): Order => (o === 'less' ? 'greater' : o === 'greater' ? 'less' : 'equal');

// ---------------------------------------------------------------------------------------------- inspector
export function reversalRows(d: ReversalDerived, state: ReversalState): InspectorRowData[] {
  const sameHolds = d.rule === 'rejected' ? false : d.sameRelationHolds;
  return [
    { id: 'p', role: 'ink', symbolTex: 'p', name: 'first number', description: describeGiven(state.p) },
    { id: 'q', role: 'primary', symbolTex: 'q', name: 'second number', description: describeGiven(state.q) },
    { id: 'k', role: 'derived', symbolTex: 'k', name: 'multiplier', description: describeGiven(state.k) },
    { id: 'kp', role: 'ink', symbolTex: 'kp', name: 'first number times k', description: describeRational(d.kp) },
    { id: 'kq', role: 'primary', symbolTex: 'kq', name: 'second number times k', description: describeRational(d.kq) },
    { id: 'before', role: 'x', symbolTex: 'p\\ ?\\ q', name: 'the order before', description: statement(orderText(d.p, d.before, d.q), orderTex(d.p, d.before, d.q), orderSpoken(d.p, d.before, d.q)) },
    { id: 'after', role: 'y', symbolTex: 'kp\\ ?\\ kq', name: 'the true order after', description: statement(orderText(d.kp, d.after, d.kq), orderTex(d.kp, d.after, d.kq), orderSpoken(d.kp, d.after, d.kq)) },
    {
      id: 'unchanged', role: sameHolds || d.degenerate ? 'ink' : 'caution', symbolTex: '\\text{same sign}', name: 'does the old relation still hold?',
      description: statement(d.degenerate ? 'not applicable' : sameHolds ? 'yes' : 'no', d.degenerate ? '\\text{n/a}' : sameHolds ? '\\text{yes}' : '\\text{no}', d.degenerate ? 'not applicable, the numbers are equal' : sameHolds ? 'yes' : 'no'),
    },
  ];
}

// ---------------------------------------------------------------------------------------------- formulas
export function reversalFormulas(d: ReversalDerived): string[] {
  const kp = `${baseTex(d.k)}\\cdot ${baseTex(d.p)}`;
  const kq = `${baseTex(d.k)}\\cdot ${baseTex(d.q)}`;
  return [
    aligned([`kp&=${kp}=${rationalTex(d.kp)}`, `kq&=${kq}=${rationalTex(d.kq)}`]),
    d.rule === 'rejected'
      ? aligned([`${rationalTex(d.p)}${symTex(d.before)}${rationalTex(d.q)}&\\ \\Longrightarrow\\ 0\\cdot p\\ \\text{and}\\ 0\\cdot q\\ \\text{are both}\\ 0`, `&\\text{the strict order is lost}`])
      : aligned([`${orderTex(d.p, d.before, d.q)}&\\ \\Longrightarrow\\ ${orderTex(d.kp, d.after, d.kq)}`, `&\\text{${d.rule === 'keeps' ? 'k is positive: the order is kept' : d.degenerate ? 'equal numbers stay equal' : 'k is negative: the order is reversed'}}`]),
  ];
}
export const REVERSAL_FORMULA_LABELS = Object.freeze(['The products', 'The order before and after']);

// ---------------------------------------------------------------------------------------------- verdict and counterexample
export function reversalVerdict(d: ReversalDerived): string {
  const before = orderText(d.p, d.before, d.q);
  if (d.rule === 'rejected') {
    return `Multiplying by 0 sends both numbers to 0, so "${before}" becomes "0 = 0": the strict order is destroyed and nothing can be divided back out of 0. A balanced operation must be reversible, so ×0 is rejected.`;
  }
  const after = orderText(d.kp, d.after, d.kq);
  if (d.degenerate) return `p and q are equal, so there is no order to keep or reverse: ${t(d.p)} = ${t(d.q)} gives ${after}. Choose p and q apart to see the rule.`;
  if (d.rule === 'keeps') return `k = ${t(d.k)} is positive, so the order is kept: "${before}" becomes "${after}". Multiplying by a positive number stretches the line and moves nothing across 0.`;
  const wrong = orderText(d.kp, d.before, d.kq);
  return `k = ${t(d.k)} is negative, so the order is REVERSED: "${before}" becomes "${after}". Counterexample: if you kept the old sign you would write "${wrong}", and that is false for these numbers. Multiplying by a negative number reflects the line through 0 (and stretches it by |k|), which swaps left and right.`;
}

/** The verdict is a caution when the naive "keep the sign" rule would be wrong, or the operation is rejected. */
export const reversalIsCaution = (d: ReversalDerived): boolean => d.rule === 'rejected' || (d.rule === 'reverses' && !d.degenerate);

export function reversalSpoken(d: ReversalDerived): string {
  if (d.rule === 'rejected') return `Multiplying by zero is rejected: ${orderSpoken(d.p, d.before, d.q)} would become zero equals zero.`;
  return `${orderSpoken(d.p, d.before, d.q)}. Multiplied by ${rationalForm(d.k).spoken}: ${orderSpoken(d.kp, d.after, d.kq)}. ${d.degenerate ? 'No order to reverse.' : d.rule === 'keeps' ? 'The order is kept.' : 'The order is reversed.'}`;
}

// ---------------------------------------------------------------------------------------------- scene
export interface ReversalScene {
  readonly p: number;
  readonly q: number;
  readonly kp: number;
  readonly kq: number;
}
export const reversalScene = (d: ReversalDerived): ReversalScene => ({ p: toNumber(d.p), q: toNumber(d.q), kp: toNumber(d.kp), kq: toNumber(d.kq) });

export const flipped = flipOrder;

export function reversalDescription(d: ReversalDerived): string {
  return `Two number lines. On the upper line p is at ${rationalForm(d.p).spoken} and q is at ${rationalForm(d.q).spoken}, so ${orderSpoken(d.p, d.before, d.q)}. `
    + `On the lower line, after multiplying by ${rationalForm(d.k).spoken}, kp is at ${rationalForm(d.kp).spoken} and kq is at ${rationalForm(d.kq).spoken}, so ${orderSpoken(d.kp, d.after, d.kq)}.`;
}
