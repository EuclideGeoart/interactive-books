/**
 * Lesson views for the off-by-one stage: the same sum Σ_{i=m}^{n} a_i written five ways in Python, each one EVALUATED by the model.
 * Only `range(m, n + 1)` visits exactly i = m, …, n. With a zero-based list the term a_i lives at a[i - 1].
 *
 *   LoopLessonState (sequence, m, n) → deriveLoopLesson → five cards {code · indices visited · terms read · total · difference or error}
 */
import type { ParamSpec } from '../../platform/params';
import type { InspectorRowData } from '../../ui/Inspector';
import { form, q, type Q } from '../../math/summation/rational';
import { SEQ_INFO, type SeqId, term } from '../../math/summation/sequences';
import { LOOP_MAX, LOOP_MIN, deriveVariants, type Variant, type VariantId, type Variants } from '../../math/summation/sum';
import { missingDescription, plural, qDescription } from './view';

export type LoopSeq = Exclude<SeqId, 'list' | 'geometric'>;
export const LOOP_SEQS: readonly LoopSeq[] = Object.freeze(['identity', 'square', 'odd', 'reciprocal', 'alternating', 'constant', 'pronic']);

export interface LoopLessonState { readonly seq: LoopSeq; readonly m: number; readonly n: number }
export const CANONICAL_LOOPS: LoopLessonState = Object.freeze({ seq: 'odd', m: 1, n: 5 });

const bound = (id: string, name: string, symbol: string, def: number): ParamSpec => ({ id, name, symbolTex: symbol, symbolText: symbol, domain: { min: LOOP_MIN, max: LOOP_MAX }, default: def, step: 1, maxDecimals: 0, onInvalid: 'reject' });
export const LOOP_M_PARAM = bound('loop-m', 'first index (lower bound)', 'm', 1);
export const LOOP_N_PARAM = bound('loop-n', 'last index (upper bound)', 'n', 5);

export interface LoopPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: LoopLessonState }
const P = (id: string, label: string, aria: string, s: Partial<LoopLessonState>): LoopPreset => Object.freeze({ id, label, aria, state: Object.freeze({ ...CANONICAL_LOOPS, ...s }) });
export const LOOP_PRESETS: readonly LoopPreset[] = Object.freeze([
  P('odd', 'odd numbers, 1 to 5', 'the odd numbers 1 to 5: every mistake changes the total', {}),
  P('identity', 'i, 1 to 5', 'the whole numbers 1 to 5: the extra term at i equals 0 is zero, so two different slips return the same total', { seq: 'identity' }),
  P('reciprocal', '1/i, 1 to 4', 'one over i, 1 to 4: sliding the window reaches i = 0', { seq: 'reciprocal', n: 4 }),
  P('one-term', 'one term, i = 3', 'a sum with the single term at i equals 3', { seq: 'square', m: 3, n: 3 }),
  P('empty', 'n < m', 'upper bound below lower bound: the correct loop has no passes', { seq: 'identity', m: 5, n: 2 }),
]);
export const loopPresetMatches = (s: LoopLessonState, p: LoopPreset): boolean => (Object.keys(CANONICAL_LOOPS) as (keyof LoopLessonState)[]).every(k => Object.is(s[k], p.state[k]));

export interface VariantCard {
  readonly id: VariantId;
  readonly title: string;
  /** Python, over several lines. */
  readonly code: string;
  readonly visited: string;
  readonly read: string;
  /** `correct`: the right total; `wrong`: a total, but not the sum; `error`: Python raises. */
  readonly status: 'correct' | 'wrong' | 'error';
  readonly result: string;
  readonly explanation: string;
}

export interface LoopLessonDerived {
  readonly state: LoopLessonState;
  readonly v: Variants;
  /** The zero-based list a = [a_1, …, a_n] as Python text. */
  readonly listCode: string;
  readonly cards: readonly VariantCard[];
}

const TITLES: Readonly<Record<VariantId, string>> = Object.freeze({
  correct: 'range(m, n + 1)',
  'stop-excluded': 'range(m, n): stops one term short',
  'start-shifted': 'range(m − 1, n): the whole window slid down',
  'list-unshifted': 'a[i] with a 1-based i: reads the next entry',
  'list-shifted': 'a[i − 1]: the right entry of a zero-based list',
});

const indicesText = (xs: readonly number[]): string => {
  if (xs.length === 0) return 'none (the loop body never runs)';
  if (xs.length <= 8) return xs.join(', ');
  return `${xs.slice(0, 3).join(', ')}, …, ${xs[xs.length - 1]}`;
};

function cardCode(v: Variant, seq: SeqId): string {
  const split = v.code.split('  acc += ');
  if (split.length === 2) return `acc = 0\n${split[0]}\n    acc += ${split[1]}`;
  return `acc = 0\n${v.code}\n    acc += ${SEQ_INFO[seq].python}`;
}

export function deriveLoopLesson(state: LoopLessonState): LoopLessonDerived {
  const v = deriveVariants(state.seq, state.m, state.n);
  const params = { r: q(1), list: [] as Q[] };
  const entries: string[] = [];
  for (let i = 1; i <= state.n; i++) {
    const t = term(state.seq, params, i);
    entries.push(t.ok ? form(t.value).text.replace('−', '-') : '?');
  }
  const listCode = `a = [${entries.join(', ')}]  # a[0] is a_1`;
  const cards = v.variants.map((variant): VariantCard => {
    const correct = v.correct;
    const matches = variant.total !== null && correct !== null && variant.difference !== null && variant.difference.num === 0n;
    const status: VariantCard['status'] = variant.total === null ? 'error' : matches ? 'correct' : 'wrong';
    const diff = variant.difference;
    const result = variant.total === null
      ? variant.error ?? 'error'
      : matches
        ? `total ${form(variant.total).text}: correct`
        : `total ${form(variant.total).text}, but the sum is ${form(correct!).text} (off by ${diff && diff.num > 0n ? '+' : ''}${form(diff!).text})`;
    return {
      id: variant.id, title: TITLES[variant.id], code: cardCode(variant, state.seq), visited: indicesText(variant.loop),
      read: variant.read.length === 0 ? 'no terms' : `${plural(variant.read.length, 'term')}: a_${variant.read[0]}${variant.read.length > 1 ? ` … a_${variant.read[variant.read.length - 1]}` : ''}`,
      status, result, explanation: variant.explanation,
    };
  });
  return Object.freeze({ state, v, listCode, cards });
}

export function loopRows(d: LoopLessonDerived): InspectorRowData[] {
  const right = d.cards.filter(c => c.status === 'correct').length;
  return [
    { id: 'sum', role: 'primary', symbolTex: '\\textstyle\\sum', name: 'the sum Σ from i = m to n', description: d.v.correct === null ? missingDescription('a term does not exist') : qDescription(d.v.correct) },
    { id: 'right', role: 'x', symbolTex: '\\checkmark', name: 'of the five loops give this total', description: qDescription(q(right)) },
  ];
}

export function loopVerdict(d: LoopLessonDerived): { text: string; caution: boolean } {
  const wrong = d.cards.filter(c => c.status === 'wrong').length;
  const errors = d.cards.filter(c => c.status === 'error').length;
  const right = d.cards.filter(c => c.status === 'correct');
  const names = right.map(c => c.title.split(':')[0]).join(' and ');
  const empty = d.state.n < d.state.m;
  const text = empty
    ? 'With n below m there are no terms, so every one of these loops passes zero times and returns 0: the empty sum is the right answer and no off-by-one shows. The mistakes appear as soon as the sum has a term.'
    : `${names || 'No loop'} ${right.length === 1 ? 'gives' : 'give'} the sum ${d.v.correct === null ? '' : form(d.v.correct).text}. ${wrong > 0 ? `${plural(wrong, 'loop')} return${wrong === 1 ? 's' : ''} a wrong total without any warning. ` : ''}${errors > 0 ? `${plural(errors, 'loop')} stop${errors === 1 ? 's' : ''} with an error.` : ''}`.trim();
  return { text, caution: wrong + errors > 0 && !empty };
}

export function loopSpoken(d: LoopLessonDerived): string {
  const right = d.cards.filter(c => c.status === 'correct').length;
  return `${right} of the five loops give the correct sum${d.v.correct === null ? '' : `, ${form(d.v.correct).spoken}`}.`;
}
