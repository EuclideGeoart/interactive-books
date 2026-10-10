/**
 * The sum Σ_{i=m}^{n} a_i, exactly, as a trace.
 *
 * Conventions (all tested):
 *  - the bounds are INCLUSIVE: the terms are a_m, a_{m+1}, …, a_n, and there are n − m + 1 of them when n ≥ m;
 *  - when n < m there are no terms: the EMPTY SUM is 0 (a value, not an error), with count 0;
 *  - TRACE: frame 0 is the state before the loop (acc = 0); frame k ≥ 1 is the state after adding the k-th term. So a sum with c terms has
 *    c + 1 frames. If a term does not exist, the loop stops there with an ERROR frame (the sum is undefined; nothing is skipped).
 */
import { ZERO, add, equals, mul, q, sub, type Q } from './rational';
import { closedForm, term, type ClosedForm, type SeqId, type SeqParams } from './sequences';

/** The bounds the stages accept, and the most terms a sum may have (checked by `checkSum`; both are rejections, never clamps). */
export const BOUND_MIN = -5;
export const BOUND_MAX = 20;
export const MAX_TERMS = 40;

export interface SumInput {
  readonly seq: SeqId;
  readonly params: SeqParams;
  readonly m: number;
  readonly n: number;
}

export type Check = { readonly ok: true } | { readonly ok: false; readonly reason: string };

export function checkSum(input: SumInput): Check {
  const { m, n } = input;
  if (!Number.isInteger(m) || !Number.isInteger(n)) return { ok: false, reason: 'The bounds are whole numbers.' };
  if (m < BOUND_MIN || m > BOUND_MAX || n < BOUND_MIN || n > BOUND_MAX) return { ok: false, reason: `The bounds must lie between ${BOUND_MIN} and ${BOUND_MAX}.` };
  if (n - m + 1 > MAX_TERMS) return { ok: false, reason: `A sum here has at most ${MAX_TERMS} terms.` };
  return { ok: true };
}

export const termCount = (m: number, n: number): number => (n >= m ? n - m + 1 : 0);

export interface SumRow {
  readonly i: number;
  /** a_i, or null when it does not exist. */
  readonly term: Q | null;
  readonly error: string | null;
}

export interface SumFrame {
  /** 0 before the loop; k after the k-th term. */
  readonly k: number;
  /** The index the loop is at (null in frame 0). */
  readonly i: number | null;
  /** The term added in this frame (null in frame 0 and in an error frame). */
  readonly term: Q | null;
  readonly before: Q;
  readonly after: Q;
  readonly error: string | null;
  readonly pythonError: string | null;
}

export interface SumDerived {
  readonly input: SumInput;
  readonly count: number;
  readonly empty: boolean;
  readonly rows: readonly SumRow[];
  readonly frames: readonly SumFrame[];
  /** The exact sum, or null when some term does not exist. */
  readonly total: Q | null;
  /** The first index with no term, and why. */
  readonly failure: { readonly i: number; readonly reason: string; readonly pythonError: string } | null;
  readonly closed: ClosedForm | null;
  /** Loop total === closed form (exact). Null if either is missing or the closed form does not apply to these bounds. */
  readonly closedMatches: boolean | null;
}

export function deriveSum(input: SumInput): SumDerived {
  const check = checkSum(input);
  if (!check.ok) throw new RangeError(check.reason);
  const { seq, params, m, n } = input;
  const count = termCount(m, n);
  const rows: SumRow[] = [];
  const frames: SumFrame[] = [{ k: 0, i: null, term: null, before: ZERO, after: ZERO, error: null, pythonError: null }];
  let acc = ZERO;
  let failure: SumDerived['failure'] = null;
  for (let i = m; i <= n; i++) {
    const t = term(seq, params, i);
    if (!t.ok) {
      rows.push({ i, term: null, error: t.reason });
      if (failure === null) {
        failure = { i, reason: t.reason, pythonError: t.pythonError };
        frames.push({ k: frames.length, i, term: null, before: acc, after: acc, error: t.reason, pythonError: t.pythonError });
      }
      continue;
    }
    rows.push({ i, term: t.value, error: null });
    if (failure === null) {
      const before = acc;
      acc = add(acc, t.value);
      frames.push({ k: frames.length, i, term: t.value, before, after: acc, error: null, pythonError: null });
    }
  }
  const total = failure === null ? acc : null;
  const closed = closedForm(seq, params, m, n);
  const closedMatches = total !== null && closed !== null && closed.applies ? equals(total, closed.value) : null;
  return { input, count, empty: count === 0, rows, frames, total, failure, closed, closedMatches };
}

// ---------------------------------------------------------------------------------------------- the Gauss pairing

export interface Gauss {
  readonly pairs: readonly { readonly low: number; readonly high: number; readonly sum: Q }[];
  readonly pairSum: Q;
  /** The unpaired middle term when the count is odd. */
  readonly middle: { readonly i: number; readonly value: Q } | null;
  readonly total: Q;
}

/**
 * Gauss's pairing of Σ_{i=m}^{n} a_i for an ARITHMETIC sequence (identity, odd numbers, a constant): the first and last terms, the second and
 * the second last, … all have the same sum, so total = (number of pairs) · (pair sum) + the unpaired middle term. Null for other sequences or empty sums.
 */
export function gauss(seq: SeqId, params: SeqParams, m: number, n: number): Gauss | null {
  if (seq !== 'identity' && seq !== 'odd' && seq !== 'constant') return null;
  if (n < m) return null;
  const value = (i: number): Q => {
    const t = term(seq, params, i);
    if (!t.ok) throw new RangeError('an arithmetic sequence has every term');
    return t.value;
  };
  const pairs: { low: number; high: number; sum: Q }[] = [];
  let lo = m;
  let hi = n;
  while (lo < hi) {
    pairs.push({ low: lo, high: hi, sum: add(value(lo), value(hi)) });
    lo++;
    hi--;
  }
  const middle = lo === hi ? { i: lo, value: value(lo) } : null;
  const pairSum = pairs.length > 0 ? pairs[0]!.sum : ZERO;
  const total = add(mul(q(pairs.length), pairSum), middle ? middle.value : ZERO);
  return { pairs, pairSum, middle, total };
}

// ---------------------------------------------------------------------------------------------- linearity and index shift

export const C_MIN = -5;
export const C_MAX = 5;
export const SHIFT_MIN = -5;
export const SHIFT_MAX = 5;

export interface Identities {
  readonly m: number;
  readonly n: number;
  readonly c: number;
  readonly k: number;
  /** Linearity with a_i = i and b_i = i². */
  readonly linearity: { readonly lhs: Q; readonly rhs: Q; readonly sumA: Q; readonly sumB: Q; readonly holds: boolean };
  /** Index shift: Σ_{i=m}^{n} i² against Σ_{j=m+k}^{n+k} (j − k)², and the WRONG shift that forgets to change the term. */
  readonly shift: { readonly original: Q; readonly shifted: Q; readonly holds: boolean; readonly wrong: Q; readonly wrongDifference: Q; readonly wrongHolds: boolean };
}

export function checkIdentities(m: number, n: number, c: number, k: number): Check {
  const bounds = checkSum({ seq: 'identity', params: { r: q(1), list: [] }, m, n });
  if (!bounds.ok) return bounds;
  if (!Number.isInteger(c) || c < C_MIN || c > C_MAX) return { ok: false, reason: `The factor c is a whole number from ${C_MIN} to ${C_MAX}.` };
  if (!Number.isInteger(k) || k < SHIFT_MIN || k > SHIFT_MAX) return { ok: false, reason: `The shift k is a whole number from ${SHIFT_MIN} to ${SHIFT_MAX}.` };
  return { ok: true };
}

export function deriveIdentities(m: number, n: number, c: number, k: number): Identities {
  const check = checkIdentities(m, n, c, k);
  if (!check.ok) throw new RangeError(check.reason);
  const C = q(c);
  const loop = (lo: number, hi: number, f: (i: number) => Q): Q => {
    let acc = ZERO;
    for (let i = lo; i <= hi; i++) acc = add(acc, f(i));
    return acc;
  };
  const a = (i: number): Q => q(i);
  const b = (i: number): Q => q(i * i);
  const lhs = loop(m, n, i => add(mul(C, a(i)), b(i)));
  const sumA = loop(m, n, a);
  const sumB = loop(m, n, b);
  const rhs = add(mul(C, sumA), sumB);
  const original = sumB;
  const shifted = loop(m + k, n + k, j => b(j - k));
  const wrong = loop(m + k, n + k, b);
  return {
    m, n, c, k,
    linearity: { lhs, rhs, sumA, sumB, holds: equals(lhs, rhs) },
    shift: { original, shifted, holds: equals(original, shifted), wrong, wrongDifference: sub(wrong, original), wrongHolds: equals(wrong, original) },
  };
}

// ---------------------------------------------------------------------------------------------- loop bounds in code (off by one)

export const LOOP_MIN = 1;
export const LOOP_MAX = 12;

export type VariantId = 'correct' | 'stop-excluded' | 'start-shifted' | 'list-unshifted' | 'list-shifted';

export interface Variant {
  readonly id: VariantId;
  /** The Python, as text. */
  readonly code: string;
  /** The loop indices (the values `i` takes). */
  readonly loop: readonly number[];
  /** The mathematical indices of the terms that were read, in order. */
  readonly read: readonly number[];
  /** The total, or null when the loop failed. */
  readonly total: Q | null;
  readonly error: string | null;
  /** total − correct, or null when there is no total. */
  readonly difference: Q | null;
  readonly explanation: string;
}

export interface Variants {
  readonly seq: SeqId;
  readonly m: number;
  readonly n: number;
  readonly correct: Q | null;
  readonly variants: readonly Variant[];
}

export function checkLoops(seq: SeqId, m: number, n: number): Check {
  if (seq === 'list' || seq === 'geometric') return { ok: false, reason: 'Choose one of the fixed sequences for this comparison.' };
  if (!Number.isInteger(m) || !Number.isInteger(n) || m < LOOP_MIN || n < LOOP_MIN || m > LOOP_MAX || n > LOOP_MAX) return { ok: false, reason: `The bounds are whole numbers from ${LOOP_MIN} to ${LOOP_MAX}.` };
  return { ok: true };
}

const range = (lo: number, hiExclusive: number): number[] => {
  const out: number[] = [];
  for (let i = lo; i < hiExclusive; i++) out.push(i);
  return out;
};

/**
 * The same sum written five ways in Python, each EVALUATED. With a 1-based mathematical a_i and a zero-based Python list
 * a = [a_1, …, a_n] (so a[i - 1] is a_i): only `range(m, n + 1)` visits exactly i = m, …, n.
 */
export function deriveVariants(seq: SeqId, m: number, n: number): Variants {
  const check = checkLoops(seq, m, n);
  if (!check.ok) throw new RangeError(check.reason);
  const params: SeqParams = { r: q(1), list: [] };
  const at = (i: number): { value: Q } | { error: string; python: string } => {
    const t = term(seq, params, i);
    return t.ok ? { value: t.value } : { error: t.reason, python: t.pythonError };
  };
  const sumReads = (read: readonly number[]): { total: Q | null; error: string | null } => {
    let acc = ZERO;
    for (const i of read) {
      const t = at(i);
      if ('error' in t) return { total: null, error: `${t.python}: a_${i} does not exist (${t.error})` };
      acc = add(acc, t.value);
    }
    return { total: acc, error: null };
  };
  const make = (id: VariantId, code: string, loop: number[], read: number[], explanation: string): Variant => {
    const r = sumReads(read);
    return { id, code, loop, read, total: r.total, error: r.error, difference: null, explanation };
  };
  const correctLoop = range(m, n + 1);
  const correct = make('correct', `for i in range(${m}, ${n} + 1):`, correctLoop, correctLoop, 'range stops BEFORE its second argument, so range(m, n + 1) visits i = m, …, n. This is the sum Σ from i = m to n.');
  const stop = make('stop-excluded', `for i in range(${m}, ${n}):`, range(m, n), range(m, n), 'range(m, n) stops before n, so the last term a_n is never added: the loop computes the sum up to n − 1.');
  const start = make('start-shifted', `for i in range(${m} - 1, ${n}):`, range(m - 1, n), range(m - 1, n), 'range(m - 1, n) starts one too early and stops one too early: it adds a_(m−1), …, a_(n−1), so the whole window slid down by one.');
  // the list a = [a_1, …, a_n]: a[i] is a_(i+1), and a[n] does not exist
  const listLoop = correctLoop;
  const unshiftedRead: number[] = [];
  let unshiftedError: string | null = null;
  for (const i of listLoop) {
    if (i > n - 1) { unshiftedError = `IndexError: a[${i}] does not exist: the list a = [a_1, …, a_${n}] has indices 0 to ${n - 1}.`; break; }
    unshiftedRead.push(i + 1);
  }
  const unshiftedSum = sumReads(unshiftedRead);
  const unshifted: Variant = {
    id: 'list-unshifted',
    code: `for i in range(${m}, ${n} + 1):  acc += a[i]`,
    loop: listLoop, read: unshiftedRead,
    total: unshiftedError === null ? unshiftedSum.total : null,
    error: unshiftedError ?? unshiftedSum.error,
    difference: null,
    explanation: 'The list is zero-based: a[i] holds a_(i+1), not a_i. Using the mathematical index i directly reads the NEXT term each time, and the last access runs off the end of the list.',
  };
  const shifted = make('list-shifted', `for i in range(${m}, ${n} + 1):  acc += a[i - 1]`, correctLoop, correctLoop, 'Keep the mathematical index i in the loop and subtract 1 only when you index the zero-based list: a[i - 1] is a_i. This computes the correct sum.');
  const all = [correct, stop, start, unshifted, shifted];
  const base = correct.total;
  const variants = all.map(v => ({ ...v, difference: v.total !== null && base !== null ? sub(v.total, base) : null }));
  return { seq, m, n, correct: base, variants };
}
