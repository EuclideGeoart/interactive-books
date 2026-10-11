/**
 * Lesson views for the hero stage: a sum Σ_{i=m}^{n} a_i of a chosen sequence, run as a loop that adds one term at a time.
 *
 *   SumLessonState (primitives) → deriveSumLesson → { exact sum · trace of the accumulator · term table · inspector rows · formulas · verdict · Python }
 *
 * Every number is an exact rational from `src/math/summation`. A term that does not exist is shown as undefined with the reason; the loop
 * stops there and the sum is undefined (nothing is skipped or read as 0). This module only arranges what the model computed.
 */
import type { ParamSpec } from '../../platform/params';
import { traceFrom, type TraceFrame } from '../../platform/trace';
import type { InspectorRowData } from '../../ui/Inspector';
import { form, parseQ, q, type Q } from '../../math/summation/rational';
import { MAX_LIST, SEQ_INFO, SEQ_IDS, type SeqId, type SeqParams } from '../../math/summation/sequences';
import { BOUND_MAX, BOUND_MIN, deriveSum, type SumDerived } from '../../math/summation/sum';
import { missingDescription, plural, qAscii, qDescription, termText, termTex } from './view';

/** Flat and primitive: numbers and strings only (the learner's list is kept as normalised text). */
export interface SumLessonState {
  readonly seq: SeqId;
  readonly m: number;
  readonly n: number;
  /** The ratio of r^i, an exact decimal with at most two places. */
  readonly r: number;
  readonly list: string;
}

export const DEFAULT_LIST_TEXT = '3, -1, 1/2, 4';
export const CANONICAL_SUM: SumLessonState = Object.freeze({ seq: 'identity', m: 1, n: 5, r: 0.5, list: DEFAULT_LIST_TEXT });

const bound = (id: string, name: string, symbol: string, def: number): ParamSpec => ({ id, name, symbolTex: symbol, symbolText: symbol, domain: { min: BOUND_MIN, max: BOUND_MAX }, default: def, step: 1, maxDecimals: 0, onInvalid: 'reject' });
export const M_PARAM = bound('m', 'first index (lower bound)', 'm', 1);
export const N_PARAM = bound('n', 'last index (upper bound)', 'n', 5);
export const R_PARAM: ParamSpec = { id: 'r', name: 'ratio', symbolTex: 'r', symbolText: 'r', domain: { min: -5, max: 5 }, default: 0.5, step: 0.5, maxDecimals: 2, onInvalid: 'reject' };

// ---------------------------------------------------------------------------------------------- the learner's list
export type ListParse = { readonly ok: true; readonly list: readonly Q[]; readonly text: string } | { readonly ok: false; readonly reason: string };

/** "3, -1, 1/2, 4" → exact rationals. Whole numbers, decimals (at most 4 places) and fractions; 1 … 8 entries; anything else is rejected, never repaired. */
export function parseList(raw: string): ListParse {
  const parts = raw.trim().replace(/\s*\/\s*/g, '/').split(/[,;\s]+/).filter(p => p !== '');
  if (parts.length === 0) return { ok: false, reason: `Enter between 1 and ${MAX_LIST} numbers, separated by commas.` };
  if (parts.length > MAX_LIST) return { ok: false, reason: `At most ${MAX_LIST} numbers fit in the list.` };
  const list: Q[] = [];
  for (const p of parts) {
    const value = parseQ(p, 4);
    if (value === null) return { ok: false, reason: `“${p}” is not a number. Use whole numbers, decimals with up to 4 places, or fractions such as 1/2.` };
    list.push(value);
  }
  return { ok: true, list, text: list.map(qAscii).join(', ') };
}

export function paramsOf(s: SumLessonState): SeqParams {
  const parsed = parseList(s.list);
  return { r: parseQ(String(s.r), 4) ?? q(1), list: parsed.ok ? parsed.list : [] };
}

// ---------------------------------------------------------------------------------------------- presets
export interface SumPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: SumLessonState }
const P = (id: string, label: string, aria: string, s: Partial<SumLessonState>): SumPreset => Object.freeze({ id, label, aria, state: Object.freeze({ ...CANONICAL_SUM, ...s }) });
export const SUM_PRESETS: readonly SumPreset[] = Object.freeze([
  P('first-five', '1 + … + 5', 'the whole numbers 1 to 5: fifteen', {}),
  P('squares', 'Σ i², 1 to 5', 'the squares 1 to 5: fifty-five', { seq: 'square' }),
  P('through-zero', 'i from −3 to 3', 'the whole numbers from minus 3 to 3: the terms cancel', { m: -3, n: 3 }),
  P('alternating', '(−1)^i', 'alternating signs, 1 to 5', { seq: 'alternating' }),
  P('geometric', 'r^i, r = ½', 'powers of one half from 0 to 4', { seq: 'geometric', m: 0, n: 4 }),
  P('ratio-one', 'r = 1', 'powers of 1, the special case', { seq: 'geometric', m: 0, n: 4, r: 1 }),
  P('empty', 'n < m: empty', 'upper bound below lower bound: the empty sum', { m: 5, n: 2 }),
  P('single', 'one term', 'a sum whose bounds are equal has exactly one term', { m: 4, n: 4 }),
  P('undefined', '1/i through 0', 'one over i from minus 2 to 3: the term at 0 does not exist', { seq: 'reciprocal', m: -2, n: 3 }),
  P('list', 'my list', 'the entries of your own list, 1 to 4', { seq: 'list', m: 1, n: 4 }),
  P('list-past-end', 'list, too far', 'your list read past its last entry', { seq: 'list', m: 1, n: 6 }),
]);
export const sumPresetMatches = (s: SumLessonState, p: SumPreset): boolean => (Object.keys(CANONICAL_SUM) as (keyof SumLessonState)[]).every(k => Object.is(s[k], p.state[k]));

// ---------------------------------------------------------------------------------------------- the trace
/** One frame of the accumulator as plain, serialisable text. */
export interface FrameView {
  readonly k: number;
  readonly i: number | null;
  readonly termText: string | null;
  readonly termTex: string | null;
  readonly beforeText: string;
  readonly afterText: string;
  readonly beforeTex: string;
  readonly afterTex: string;
  readonly error: string | null;
  readonly python: string | null;
  /** The update as TeX, e.g. `\mathrm{acc}=3+4=7`. */
  readonly tex: string;
  /** The same update as a sentence (for the caption and the live region). */
  readonly caption: string;
}

/** What Python itself does at a missing term, in a sentence. */
export function pythonSentence(pythonError: string): string {
  return pythonError.startsWith('no error')
    ? 'Python does not stop here: a negative index counts from the END of the list, so the loop would silently read a different entry and report a wrong total.'
    : `Python raises ${pythonError} here, so the loop stops.`;
}

export interface SumLessonDerived {
  readonly state: SumLessonState;
  readonly params: SeqParams;
  readonly d: SumDerived;
  readonly frames: readonly TraceFrame<FrameView>[];
}

function frameViews(d: SumDerived): FrameView[] {
  return d.frames.map(f => {
    const before = form(f.before);
    const after = form(f.after);
    const base = { k: f.k, i: f.i, beforeText: before.text, afterText: after.text, beforeTex: before.tex, afterTex: after.tex };
    if (f.error !== null) {
      return { ...base, termText: null, termTex: null, error: f.error, python: f.pythonError, tex: `a_{${f.i}}\\ \\text{does not exist}`, caption: `i = ${f.i}: ${f.error}. ${pythonSentence(f.pythonError ?? '')} The sum is undefined; acc stays ${after.text} and nothing is skipped.` };
    }
    if (f.term === null) {
      return { ...base, termText: null, termTex: null, error: null, python: null, tex: '\\mathrm{acc}=0', caption: d.empty ? 'Before the loop: acc = 0. The loop has no values of i (n < m), so the sum stays 0: the empty sum.' : 'Before the loop: acc = 0, the sum of no terms yet.' };
    }
    return {
      ...base, termText: termText(f.term), termTex: termTex(f.term), error: null, python: null,
      tex: `\\mathrm{acc}=${before.tex}+${termTex(f.term)}=${after.tex}`,
      caption: `Step ${f.k} of ${d.count}: i = ${f.i}, a_${f.i} = ${form(f.term).text}, so acc = ${before.text} + ${termText(f.term)} = ${after.text}.`,
    };
  });
}

export function deriveSumLesson(state: SumLessonState): SumLessonDerived {
  const params = paramsOf(state);
  const d = deriveSum({ seq: state.seq, params, m: state.m, n: state.n });
  const frames = traceFrom<FrameView>(frameViews(d).map(view => ({ state: view })));
  return Object.freeze({ state, params, d, frames });
}

// ---------------------------------------------------------------------------------------------- text
const ratioTex = (r: Q): string => { const f = form(r); return f.integer && r.num >= 0n ? f.tex : `\\left(${f.tex}\\right)`; };

/** The body of the sum as TeX with the chosen ratio filled in. */
export function bodyTex(s: SumLessonState, params: SeqParams): string {
  switch (s.seq) {
    case 'identity': return 'i';
    case 'square': return 'i^{2}';
    case 'odd': return '(2i-1)';
    case 'reciprocal': return '\\frac{1}{i}';
    case 'alternating': return '(-1)^{i}';
    case 'constant': return '3';
    case 'pronic': return 'i(i+1)';
    case 'geometric': return `${ratioTex(params.r)}^{i}`;
    case 'list': return 'a_{i}';
  }
}

/** Σ with its bounds and body: `\sum_{i=1}^{5} i`. */
export const sigmaTex = (s: SumLessonState, params: SeqParams): string => `\\sum_{i=${s.m}}^{${s.n}}${bodyTex(s, params)}`;

/** The terms written out: all of them up to 7, otherwise the first three, a gap, and the last. */
export function expansionTex(d: SumDerived): string {
  const terms = d.rows.map(r => (r.term === null ? '\\text{?}' : termTex(r.term)));
  if (terms.length === 0) return '0';
  const shown = terms.length <= 7 ? terms.join('+') : `${terms.slice(0, 3).join('+')}+\\cdots+${terms[terms.length - 1]}`;
  return shown;
}

export interface FormulaItem { readonly id: string; readonly label: string; readonly tex: string }

export function sumFormulas(derived: SumLessonDerived): FormulaItem[] {
  const { state: s, params, d } = derived;
  const head = sigmaTex(s, params);
  const out: FormulaItem[] = [];
  if (d.failure) out.push({ id: 'expansion', label: 'The sum written out, scrollable', tex: `${head}\\ \\text{is undefined: }a_{${d.failure.i}}\\text{ does not exist}` });
  else if (d.empty) out.push({ id: 'expansion', label: 'The sum written out, scrollable', tex: `${head}=0\\qquad(\\text{no terms: the empty sum})` });
  else out.push({ id: 'expansion', label: 'The sum written out, scrollable', tex: `${head}=${expansionTex(d)}=${form(d.total!).tex}` });
  if (d.closed && d.closed.applies && !d.failure && !d.empty) {
    out.push({ id: 'closed', label: 'The closed form, scrollable', tex: d.closed.formulaTex });
    out.push({ id: 'closed-work', label: 'The closed form with the numbers put in, scrollable', tex: d.closed.workTex });
  }
  return out;
}

/** The Python loop that the model ran, as text. */
export function loopCode(derived: SumLessonDerived): string {
  const { state: s, params } = derived;
  const lines: string[] = [];
  const frac = (a: Q): string => (a.den === 1n ? String(a.num) : `Fraction(${a.num}, ${a.den})`);
  if (s.seq === 'geometric') lines.push(`r = ${frac(params.r)}`);
  if (s.seq === 'list') lines.push(`a = [${params.list.map(frac).join(', ')}]  # a[0] is a_1`);
  lines.push('acc = 0');
  lines.push(`for i in range(${s.m}, ${s.n} + 1):`);
  lines.push(`    acc += ${SEQ_INFO[s.seq].python}`);
  return lines.join('\n');
}

export function sumRows(derived: SumLessonDerived): InspectorRowData[] {
  const { d } = derived;
  const total = d.total === null ? missingDescription(`a_${d.failure!.i} does not exist: ${d.failure!.reason}.`) : qDescription(d.total);
  const closed = d.closed === null
    ? missingDescription(derived.state.seq === 'list' ? 'a list you typed has no formula' : derived.state.seq === 'geometric' ? '0 to a negative power is undefined, so there is no formula for these bounds' : 'no simple closed form exists for this sequence')
    : !d.closed.applies
      ? missingDescription('no formula is claimed for these bounds: with no terms, the empty-sum convention alone gives 0')
      : qDescription(d.closed.value);
  return [
    { id: 'count', role: 'x', symbolTex: 'n-m+1', name: 'number of terms (0 when n < m)', description: qDescription(q(d.count)) },
    { id: 'sum', role: 'primary', symbolTex: '\\textstyle\\sum', name: 'the sum, by the loop', description: total },
    { id: 'closed', role: 'y', symbolTex: 'F', name: 'the closed form, evaluated', description: closed, secondary: true },
  ];
}

export function sumVerdict(derived: SumLessonDerived): { text: string; caution: boolean } {
  const { d } = derived;
  const seq = derived.state.seq;
  if (d.failure) {
    return { text: `The sum is undefined: ${d.failure.reason}. ${pythonSentence(d.failure.pythonError)} A missing term is never read as 0 and never skipped.`, caution: true };
  }
  if (d.empty) return { text: `The upper bound ${d.input.n} is below the lower bound ${d.input.m}, so the loop has no values of i. The sum of no terms is 0: the empty sum is a value, not an error.`, caution: false };
  const total = form(d.total!).text;
  if (seq === 'geometric' && d.closed?.special) return { text: `Every term is 1, so the sum is ${total}, the number of terms. The usual formula divides by 1 − r = 0, which is why r = 1 needs its own case.`, caution: false };
  if (d.closed === null) return { text: `The loop gives ${total}. ${seq === 'list' ? 'A list you typed has no formula, so the loop is the definition.' : 'This sequence has no simple closed form, so the loop is the definition.'}`, caution: false };
  return d.closedMatches
    ? { text: `The loop gives ${total} and the closed form gives ${form(d.closed.value).text}: they agree exactly.`, caution: false }
    : { text: `The loop gives ${total} but the closed form gives ${form(d.closed.value).text}: they disagree.`, caution: true };
}

export function sumSpoken(derived: SumLessonDerived): string {
  const { state: s, d } = derived;
  const head = `The sum of ${SEQ_INFO[s.seq].aria} for i from ${s.m} to ${s.n}`;
  if (d.failure) return `${head} is undefined: ${d.failure.reason}.`;
  if (d.empty) return `${head} has no terms, so it is the empty sum, 0.`;
  return `${head} has ${plural(d.count, 'term')} and equals ${form(d.total!).spoken}.`;
}

export function sumDescription(derived: SumLessonDerived): string {
  const { d } = derived;
  return d.failure ? 'undefined' : form(d.total!).text;
}

export const SEQ_OPTIONS: readonly { readonly id: SeqId; readonly label: string; readonly aria: string }[] = Object.freeze(SEQ_IDS.map(id => Object.freeze({ id, label: SEQ_INFO[id].label, aria: SEQ_INFO[id].aria })));
