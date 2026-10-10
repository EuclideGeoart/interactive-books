/**
 * Lesson views for the identities stage: linearity of the sum (Σ(c·aᵢ + bᵢ) = c·Σaᵢ + Σbᵢ), the index shift (and the wrong shift that forgets to change
 * the term), and Gauss's pairing for aᵢ = i. Each side of each identity is added by its own loop in the model; this module only arranges them.
 *
 *   IdentityLessonState (m, n, c, k) → deriveIdentityLesson → { linearity · shift · Gauss pairing · inspector rows · formulas · verdict }
 */
import type { ParamSpec } from '../../platform/params';
import type { InspectorRowData } from '../../ui/Inspector';
import { form, q, type Q } from '../../math/summation/rational';
import { gauss, deriveIdentities, BOUND_MAX, BOUND_MIN, C_MAX, C_MIN, SHIFT_MAX, SHIFT_MIN, type Gauss, type Identities } from '../../math/summation/sum';
import { plural, qDescription } from './view';

export interface IdentityLessonState { readonly m: number; readonly n: number; readonly c: number; readonly k: number }
export const CANONICAL_IDENTITIES: IdentityLessonState = Object.freeze({ m: 1, n: 4, c: 2, k: 2 });

const whole = (id: string, name: string, symbol: string, min: number, max: number, def: number): ParamSpec => ({ id, name, symbolTex: symbol, symbolText: symbol, domain: { min, max }, default: def, step: 1, maxDecimals: 0, onInvalid: 'reject' });
export const ID_M_PARAM = whole('id-m', 'first index (lower bound)', 'm', BOUND_MIN, BOUND_MAX, 1);
export const ID_N_PARAM = whole('id-n', 'last index (upper bound)', 'n', BOUND_MIN, BOUND_MAX, 4);
export const ID_C_PARAM = whole('id-c', 'constant factor', 'c', C_MIN, C_MAX, 2);
export const ID_K_PARAM = whole('id-k', 'index shift', 'k', SHIFT_MIN, SHIFT_MAX, 2);

export interface IdentityPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: IdentityLessonState }
const P = (id: string, label: string, aria: string, s: Partial<IdentityLessonState>): IdentityPreset => Object.freeze({ id, label, aria, state: Object.freeze({ ...CANONICAL_IDENTITIES, ...s }) });
export const IDENTITY_PRESETS: readonly IdentityPreset[] = Object.freeze([
  P('default', 'c = 2, shift 2', 'factor two, shift by two, indices one to four', {}),
  P('no-shift', 'shift 0', 'a shift of zero: forgetting to change the term does no harm', { k: 0 }),
  P('negative', 'c = −3', 'factor minus three', { c: -3 }),
  P('coincidence', 'a coincidence', 'indices minus three to minus one with shift four: the wrong shift happens to give the right number', { m: -3, n: -1, k: 4 }),
  P('ten', '1 … 10', 'indices one to ten, the pairing example', { n: 10 }),
  P('odd-count', '1 … 9', 'indices one to nine: an odd number of terms leaves a middle term', { n: 9 }),
  P('empty', 'n < m', 'upper bound below lower bound: every sum is empty', { m: 5, n: 2 }),
]);
export const identityPresetMatches = (s: IdentityLessonState, p: IdentityPreset): boolean => (Object.keys(CANONICAL_IDENTITIES) as (keyof IdentityLessonState)[]).every(key => Object.is(s[key], p.state[key]));

export interface IdentityLessonDerived {
  readonly state: IdentityLessonState;
  readonly id: Identities;
  readonly gauss: Gauss | null;
}

export function deriveIdentityLesson(state: IdentityLessonState): IdentityLessonDerived {
  return Object.freeze({ state, id: deriveIdentities(state.m, state.n, state.c, state.k), gauss: gauss('identity', { r: q(1), list: [] }, state.m, state.n) });
}

export interface IdentityFormula { readonly id: string; readonly label: string; readonly tex: string }

export function linearityFormulas(d: IdentityLessonDerived): IdentityFormula[] {
  const { state: s, id } = d;
  const cTex = s.c < 0 ? `\\left(${s.c}\\right)` : String(s.c);
  const lin = id.linearity;
  return [
    { id: 'lhs', label: 'Linearity, left side, scrollable', tex: `\\sum_{i=${s.m}}^{${s.n}}\\left(${cTex}\\,i+i^{2}\\right)=${form(lin.lhs).tex}` },
    { id: 'rhs', label: 'Linearity, right side, scrollable', tex: `${cTex}\\sum_{i=${s.m}}^{${s.n}}i+\\sum_{i=${s.m}}^{${s.n}}i^{2}=${cTex}\\cdot${form(lin.sumA).tex}+${form(lin.sumB).tex}=${form(lin.rhs).tex}` },
  ];
}

export function shiftFormulas(d: IdentityLessonDerived): IdentityFormula[] {
  const { state: s, id } = d;
  const lo = s.m + s.k;
  const hi = s.n + s.k;
  const shiftedBody = s.k === 0 ? 'j^{2}' : `\\left(j${s.k < 0 ? '+' : '-'}${Math.abs(s.k)}\\right)^{2}`;
  return [
    { id: 'original', label: 'The original sum, scrollable', tex: `\\sum_{i=${s.m}}^{${s.n}}i^{2}=${form(id.shift.original).tex}` },
    { id: 'shifted', label: 'The shifted sum with the term changed, scrollable', tex: `\\sum_{j=${lo}}^{${hi}}${shiftedBody}=${form(id.shift.shifted).tex}` },
    { id: 'wrong', label: 'The shifted sum with the term forgotten, scrollable', tex: `\\sum_{j=${lo}}^{${hi}}j^{2}=${form(id.shift.wrong).tex}` },
  ];
}

export function shiftSentence(d: IdentityLessonDerived): { text: string; caution: boolean } {
  const { state: s, id } = d;
  const sh = id.shift;
  const lo = s.m + s.k;
  const hi = s.n + s.k;
  if (s.n < s.m) return { text: 'There are no terms, so every version of the sum is the empty sum, 0, and nothing can disagree.', caution: false };
  if (s.k === 0) return { text: 'With a shift of 0 nothing moves, so even the sloppy version agrees. Try another shift.', caution: false };
  const substitution = s.k > 0 ? `j = i + ${s.k}` : `j = i − ${-s.k}`;
  const body = s.k > 0 ? `(j − ${s.k})²` : `(j + ${-s.k})²`;
  const right = `Substituting ${substitution} changes the bounds to ${lo} and ${hi} AND turns the term i² into ${body}, and the sum stays ${form(sh.original).text}.`;
  if (sh.wrongHolds) return { text: `${right} Moving only the bounds happens to give ${form(sh.wrong).text} as well, but that is a coincidence of these particular numbers, not a rule: change the bounds and it breaks.`, caution: true };
  return { text: `${right} Moving only the bounds, and keeping j², gives ${form(sh.wrong).text}, which is off by ${form(sh.wrongDifference).text}: a different sum.`, caution: true };
}

export function linearitySentence(d: IdentityLessonDerived): string {
  const lin = d.id.linearity;
  return lin.holds ? `Both sides are ${form(lin.lhs).text}: one loop that adds c·i + i² term by term, and two separate loops combined at the end, give the same exact number.` : `The two sides differ: ${form(lin.lhs).text} against ${form(lin.rhs).text}.`;
}

export interface PairLine { readonly text: string; readonly tex: string }
export function gaussLines(d: IdentityLessonDerived): { pairs: PairLine[]; middle: PairLine | null; formulaTex: string; sentence: string } {
  const g = d.gauss;
  const { m, n } = d.state;
  if (g === null) return { pairs: [], middle: null, formulaTex: `\\sum_{i=${m}}^{${n}}i=0\\quad(\\text{no terms})`, sentence: 'There are no terms to pair: the empty sum is 0.' };
  const pairs = g.pairs.map(p => ({ text: `${p.low} + ${p.high} = ${form(p.sum).text}`, tex: `${p.low}+${p.high}=${form(p.sum).tex}` }));
  const middle = g.middle ? { text: `${g.middle.i} is alone`, tex: `${g.middle.i}` } : null;
  const count = g.pairs.length;
  const formulaTex = `\\sum_{i=${m}}^{${n}}i=${count}\\cdot${form(g.pairSum).tex}${g.middle ? `+${termTexOf(g.middle.value)}` : ''}=${form(g.total).tex}`;
  const sentence = count === 0
    ? `One term: ${g.middle!.i}. There is nothing to pair.`
    : `${plural(count, 'pair')}, every one adding to ${form(g.pairSum).text}${g.middle ? `, and the middle term ${g.middle.i} left over` : ''}. Total: ${form(g.total).text}.`;
  return { pairs, middle, formulaTex, sentence };
}
const termTexOf = (a: Q): string => form(a).tex;

export function identityRows(d: IdentityLessonDerived): InspectorRowData[] {
  const { id } = d;
  return [
    { id: 'lhs', role: 'x', symbolTex: '\\textstyle\\sum(c\\,i+i^{2})', name: 'left side of linearity', description: qDescription(id.linearity.lhs) },
    { id: 'rhs', role: 'y', symbolTex: 'c\\textstyle\\sum i+\\sum i^{2}', name: 'right side of linearity', description: qDescription(id.linearity.rhs) },
    { id: 'shifted', role: 'primary', symbolTex: '\\textstyle\\sum(j-k)^{2}', name: 'shifted sum, term changed', description: qDescription(id.shift.shifted) },
    { id: 'wrong', role: 'caution', symbolTex: '\\textstyle\\sum j^{2}', name: 'shifted sum, term forgotten', description: qDescription(id.shift.wrong), secondary: true },
  ];
}

export function identitySpoken(d: IdentityLessonDerived): string {
  const { id, state: s } = d;
  return `Linearity: both sides equal ${form(id.linearity.lhs).spoken}. Shifting the index by ${s.k}: ${id.shift.holds ? 'the shifted sum with the term changed equals' : 'does not equal'} ${form(id.shift.original).spoken}; forgetting to change the term gives ${form(id.shift.wrong).spoken}.`;
}
