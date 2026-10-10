/**
 * Lesson views for the expectation stage: counts become probabilities by the taught step p_i = c_i / (c_1 + … + c_k), and E[X] = Σ p_i x_i is the
 * probability-weighted average of the values. All counts zero is undefined (a division by zero), never repaired.
 *
 *   ExpectState → deriveExpect → { table rows · inspector · formulas · Python · verdict }
 */
import type { ParamSpec } from '../../platform/params';
import type { InspectorRowData } from '../../ui/Inspector';
import { form, q, type Q } from '../../math/notation/rational';
import { COUNT_MAX, OUTCOMES, deriveExpect, type ExpectDerived, type ExpectState, type OutcomeSet } from '../../math/notation/expectation';
import { missingDescription, plural, qDescription } from './view';

export type ExpectLessonState = ExpectState;
export const CANONICAL_EXPECT: ExpectLessonState = Object.freeze({ set: 'die', c1: 1, c2: 2, c3: 3, c4: 4, c5: 5, c6: 6 });

export const SET_OPTIONS = Object.freeze([
  { id: 'die', label: 'a die' },
  { id: 'rating', label: 'ratings 0 to 4' },
  { id: 'payoff', label: 'payoffs' },
] as const);

export type CountKey = 'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'c6';
export const COUNT_KEYS: readonly CountKey[] = Object.freeze(['c1', 'c2', 'c3', 'c4', 'c5', 'c6'] as const);
export const countSpec = (m: number): ParamSpec => ({ id: `count-${m + 1}`, name: `count c${m + 1}`, symbolTex: `c_{${m + 1}}`, symbolText: `c${m + 1}`, domain: { min: 0, max: COUNT_MAX }, default: m + 1, step: 1, maxDecimals: 0, onInvalid: 'reject' });
export const COUNT_SPECS: readonly ParamSpec[] = Object.freeze(COUNT_KEYS.map((_, m) => countSpec(m)));

export interface ExpectPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: ExpectLessonState }
const mk = (set: OutcomeSet, counts: readonly number[]): ExpectLessonState => {
  const c = [...counts, 0, 0, 0, 0, 0, 0].slice(0, 6);
  return Object.freeze({ set, c1: c[0]!, c2: c[1]!, c3: c[2]!, c4: c[3]!, c5: c[4]!, c6: c[5]! });
};
export const EXPECT_PRESETS: readonly ExpectPreset[] = Object.freeze([
  { id: 'counts', label: 'counts 1 to 6', aria: 'a die seen with counts one to six', state: mk('die', [1, 2, 3, 4, 5, 6]) },
  { id: 'fair', label: 'fair die', aria: 'a die with every count equal', state: mk('die', [1, 1, 1, 1, 1, 1]) },
  { id: 'single', label: 'always a six', aria: 'a die that always showed six', state: mk('die', [0, 0, 0, 0, 0, 12]) },
  { id: 'ratings', label: 'ratings', aria: 'twenty ratings from zero to four', state: mk('rating', [2, 3, 5, 8, 2]) },
  { id: 'payoff', label: 'payoffs −1, 0, 2', aria: 'a game with payoffs minus one, zero and two', state: mk('payoff', [3, 1, 1]) },
  { id: 'empty', label: 'no data', aria: 'all counts zero, so there is no distribution', state: mk('die', [0, 0, 0, 0, 0, 0]) },
]);

/** The counts that are visible for the chosen set. */
export const visibleCounts = (s: ExpectLessonState): readonly number[] => [s.c1, s.c2, s.c3, s.c4, s.c5, s.c6].slice(0, OUTCOMES[s.set].length);
export const expectPresetMatches = (s: ExpectLessonState, p: ExpectPreset): boolean =>
  s.set === p.state.set && visibleCounts(s).every((c, m) => Object.is(c, visibleCounts(p.state)[m]));

export interface ExpectLessonDerived { readonly state: ExpectLessonState; readonly d: ExpectDerived }
export function deriveExpectLesson(state: ExpectLessonState): ExpectLessonDerived {
  return Object.freeze({ state, d: deriveExpect(state) });
}

const signed = (n: number): string => (n < 0 ? `−${-n}` : String(n));

export interface ExpectRow {
  readonly index: number;
  readonly value: number;
  readonly count: number;
  readonly p: Q | null;
  readonly pText: string;
  readonly weighted: string;
  readonly mode: boolean;
}
export function expectTable(derived: ExpectLessonDerived): readonly ExpectRow[] {
  const { d } = derived;
  return d.values.map((value, index) => {
    const p = d.defined ? d.p[index]! : null;
    return {
      index, value, count: d.counts[index]!, p,
      pText: p ? form(p).text : 'undefined',
      weighted: p ? form({ num: p.num * BigInt(value), den: p.den }).text : 'undefined',
      mode: d.modes.includes(value),
    };
  });
}

export function expectRows(derived: ExpectLessonDerived): InspectorRowData[] {
  const { d } = derived;
  const rows: InspectorRowData[] = [{ id: 'total', role: 'x', symbolTex: 'c_1+\\dots+c_k', name: 'the total count', description: qDescription(q(d.total)) }];
  if (!d.defined) {
    rows.push(
      { id: 'sum-p', role: 'caution', symbolTex: '\\textstyle\\sum_i p_i', name: 'the probabilities added', description: missingDescription(d.reason!) },
      { id: 'expectation', role: 'caution', symbolTex: '\\mathbb{E}[X]', name: 'the expectation', description: missingDescription(d.reason!) },
    );
    return rows;
  }
  rows.push(
    { id: 'sum-p', role: 'y', symbolTex: '\\textstyle\\sum_i p_i', name: 'the probabilities added (must be exactly 1)', description: qDescription(d.sumP!) },
    { id: 'expectation', role: 'primary', symbolTex: '\\mathbb{E}[X]', name: 'the expectation', description: qDescription(d.expectation!) },
    { id: 'mode', role: 'derived', symbolTex: '\\text{mode}', name: d.modes.length > 1 ? 'the most frequent values (a tie)' : 'the most frequent value', description: { status: 'exact', lines: [{ relation: '=', text: d.modes.map(signed).join(', '), tex: d.modes.join(',\\ ') }], spoken: d.modes.map(signed).join(' and ') }, secondary: true },
  );
  return rows;
}

export function expectFormulas(derived: ExpectLessonDerived): { id: string; label: string; tex: string }[] {
  const { d } = derived;
  if (!d.defined) return [{ id: 'p', label: 'The probabilities, scrollable', tex: 'p_i=\\dfrac{c_i}{c_1+\\dots+c_k}=\\dfrac{c_i}{0}\\ \\text{(undefined)}' }];
  const p = d.p.map(x => form(x).tex);
  const terms = d.values.map((v, i) => `${p[i]}\\cdot ${v < 0 ? `(${v})` : v}`).join('+');
  return [
    { id: 'p', label: 'The probabilities, scrollable', tex: `p_i=\\dfrac{c_i}{${d.total}}` },
    { id: 'expect', label: 'The expectation, scrollable', tex: `\\mathbb{E}[X]=\\sum_i p_i x_i=${terms}=${form(d.expectation!).tex}` },
  ];
}

export function expectCode(derived: ExpectLessonDerived): string {
  const { d, state: s } = derived;
  const values = `[${d.values.join(', ')}]`;
  const lines = ['import numpy as np', '', `values = np.array(${values})`, `counts = np.array([${d.counts.join(', ')}])`];
  if (!d.defined) {
    lines.push('p = counts / counts.sum()      # 0 / 0: nan and a RuntimeWarning, not a distribution');
  } else {
    lines.push('p = counts / counts.sum()      # p_i = c_i / total', `np.average(values, weights=p)  # about ${form(d.expectation!).text}`);
  }
  void s;
  return lines.join('\n');
}

export function expectVerdict(derived: ExpectLessonDerived): { text: string; caution: boolean } {
  const { d } = derived;
  if (!d.defined) return { text: d.reason!, caution: true };
  const e = form(d.expectation!).text;
  const outcome = d.isOutcome ? `E[X] = ${e} happens to be one of the possible values.` : `E[X] = ${e} is not a value X can take: an expectation is an average, not a likely outcome.`;
  const mode = `The most frequent value (the mode) is ${d.modes.map(signed).join(' and ')}${d.modes.length > 1 ? ' (a tie)' : ''}; the expectation is a different summary.`;
  return { text: `The probabilities are the counts divided by the total ${d.total}, so they add to exactly 1. ${outcome} ${mode}`, caution: false };
}

export function expectSpoken(derived: ExpectLessonDerived): string {
  const { d } = derived;
  return d.defined ? `${plural(d.total, 'observation')}. The expectation is ${form(d.expectation!).spoken}.` : `Every count is zero. The expectation is undefined.`;
}
