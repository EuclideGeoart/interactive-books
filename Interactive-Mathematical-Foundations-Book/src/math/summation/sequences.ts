/**
 * The catalogue of sequences a_i the chapter sums, with their exact terms, the Python expression that computes each term, and an
 * exact "prefix sum" S(k) = a_1 + … + a_k where one has a closed form (an identity over ALL integers k, so it also covers ranges that start at
 * or below 0: S(k) − S(k − 1) = a_k for every integer k, and a telescoping sum then gives Σ_{i=m}^{n} a_i = S(n) − S(m − 1) whenever n ≥ m − 1).
 *
 * A term that does not exist (1/i at i = 0, a list entry past the end, 0 to a negative power) is reported as UNDEFINED with a reason;
 * it is never skipped, replaced by 0, or clamped.
 */
import { ONE, equals, form, mul, pow, q, sub, type Q } from './rational';

export type SeqId = 'identity' | 'square' | 'odd' | 'reciprocal' | 'alternating' | 'constant' | 'pronic' | 'geometric' | 'list';
export const SEQ_IDS: readonly SeqId[] = Object.freeze(['identity', 'square', 'odd', 'reciprocal', 'alternating', 'constant', 'pronic', 'geometric', 'list']);

/** The constant sequence is 3 for every i. */
export const CONSTANT_VALUE = 3;
/** At most this many entries in a learner's list. */
export const MAX_LIST = 8;

export interface SeqParams {
  /** The ratio of the geometric sequence r^i. */
  readonly r: Q;
  /** The learner's list: a_1, …, a_len (1-based). */
  readonly list: readonly Q[];
}

export const DEFAULT_PARAMS: SeqParams = Object.freeze({ r: q(1, 2), list: Object.freeze([q(3), q(-1), q(1, 2), q(4)]) });

export type Term = { readonly ok: true; readonly value: Q } | { readonly ok: false; readonly reason: string; readonly pythonError: string };

const parityEven = (i: number): boolean => ((i % 2) + 2) % 2 === 0;

/** a_i, exactly, or the reason it has no value. */
export function term(id: SeqId, params: SeqParams, i: number): Term {
  if (!Number.isInteger(i)) throw new RangeError('An index is an integer');
  const I = q(i);
  switch (id) {
    case 'identity': return { ok: true, value: I };
    case 'square': return { ok: true, value: mul(I, I) };
    case 'odd': return { ok: true, value: q(2 * i - 1) };
    case 'reciprocal':
      return i === 0 ? { ok: false, reason: '1/i has no value at i = 0 (division by zero)', pythonError: 'ZeroDivisionError' } : { ok: true, value: q(1, i) };
    case 'alternating': return { ok: true, value: q(parityEven(i) ? 1 : -1) };
    case 'constant': return { ok: true, value: q(CONSTANT_VALUE) };
    case 'pronic': return { ok: true, value: q(i * (i + 1)) };
    case 'geometric':
      return i < 0 && params.r.num === 0n
        ? { ok: false, reason: 'r^i has no value for i < 0 when r = 0 (0 to a negative power)', pythonError: 'ZeroDivisionError' }
        : { ok: true, value: pow(params.r, i) };
    case 'list': {
      const len = params.list.length;
      if (i >= 1 && i <= len) return { ok: true, value: params.list[i - 1]! };
      if (i >= 1) return { ok: false, reason: `a_${i} does not exist: the list has only ${len} ${len === 1 ? 'entry' : 'entries'}`, pythonError: 'IndexError' };
      // a[i - 1] with i < 1 is a negative Python index: it counts from the END of the list when -(i - 1) <= len, and raises IndexError beyond that
      return i - 1 >= -len
        ? { ok: false, reason: `a_${i} does not exist: the list is a_1 … a_${len} (Python's a[i - 1] would silently wrap round to the end of the list instead of failing)`, pythonError: 'no error (a negative index wraps)' }
        : { ok: false, reason: `a_${i} does not exist: the list is a_1 … a_${len}`, pythonError: 'IndexError' };
    }
  }
}

export interface SeqInfo {
  readonly id: SeqId;
  /** Short label for a button. */
  readonly label: string;
  /** a_i = … in plain text and TeX. */
  readonly text: string;
  readonly tex: string;
  /** The Python expression for the term (using `i`, `r`, `a`), and the `acc +=` statement. */
  readonly python: string;
  readonly aria: string;
  /** Does an exact prefix-sum closed form exist? */
  readonly closed: boolean;
}

export const SEQ_INFO: Readonly<Record<SeqId, SeqInfo>> = Object.freeze({
  identity: { id: 'identity', label: 'i', text: 'a_i = i', tex: 'a_i=i', python: 'i', aria: 'the whole numbers a sub i equals i', closed: true },
  square: { id: 'square', label: 'i²', text: 'a_i = i²', tex: 'a_i=i^{2}', python: 'i ** 2', aria: 'the squares, a sub i equals i squared', closed: true },
  odd: { id: 'odd', label: '2i − 1', text: 'a_i = 2i − 1', tex: 'a_i=2i-1', python: '2 * i - 1', aria: 'the odd numbers, a sub i equals 2 i minus 1', closed: true },
  reciprocal: { id: 'reciprocal', label: '1/i', text: 'a_i = 1/i', tex: 'a_i=\\frac{1}{i}', python: 'Fraction(1, i)', aria: 'the reciprocals, a sub i equals 1 over i', closed: false },
  alternating: { id: 'alternating', label: '(−1)^i', text: 'a_i = (−1)^i', tex: 'a_i=(-1)^{i}', python: '(-1) ** i', aria: 'alternating signs, a sub i equals minus one to the i', closed: true },
  constant: { id: 'constant', label: '3', text: `a_i = ${CONSTANT_VALUE}`, tex: `a_i=${CONSTANT_VALUE}`, python: String(CONSTANT_VALUE), aria: 'the constant 3', closed: true },
  pronic: { id: 'pronic', label: 'i(i + 1)', text: 'a_i = i(i + 1)', tex: 'a_i=i(i+1)', python: 'i * (i + 1)', aria: 'a sub i equals i times i plus 1', closed: true },
  geometric: { id: 'geometric', label: 'r^i', text: 'a_i = r^i', tex: 'a_i=r^{i}', python: 'r ** i', aria: 'a geometric sequence, a sub i equals r to the i', closed: true },
  list: { id: 'list', label: 'my list', text: 'a_i = the i-th entry of your list', tex: 'a_i=\\text{the }i\\text{-th entry}', python: 'a[i - 1]', aria: 'your own list of up to eight numbers', closed: false },
});

// ---------------------------------------------------------------------------------------------- prefix sums (closed forms)

export interface Prefix {
  /** S(k) exactly. */
  readonly value: Q;
  /** The formula with the number k substituted, as TeX (a negative k is parenthesised). */
  readonly tex: string;
}

const kTex = (k: number): string => (k < 0 ? `(${k})` : String(k));

/** S(k) for k an integer (any sign), or `null` when the sequence has no closed form. For the geometric sequence S is not used (see `geometricSum`). */
export function prefix(id: SeqId, k: number): Prefix | null {
  const K = q(k);
  const kk = kTex(k);
  switch (id) {
    case 'identity': return { value: q(k * (k + 1), 2), tex: `\\frac{${kk}(${k}+1)}{2}` };
    case 'square': return { value: q(k * (k + 1) * (2 * k + 1), 6), tex: `\\frac{${kk}(${k}+1)(2\\cdot${kk}+1)}{6}` };
    case 'odd': return { value: mul(K, K), tex: `${kk}^{2}` };
    case 'alternating': return { value: q(parityEven(k) ? 0 : -1), tex: `\\frac{(-1)^{${k}}-1}{2}` };
    case 'constant': return { value: q(CONSTANT_VALUE * k), tex: `${CONSTANT_VALUE}\\cdot${kk}` };
    case 'pronic': return { value: q(k * (k + 1) * (k + 2), 3), tex: `\\frac{${kk}(${k}+1)(${k}+2)}{3}` };
    default: return null;
  }
}

/** The symbolic formula for S(n), as TeX. */
export const PREFIX_FORMULA: Readonly<Partial<Record<SeqId, string>>> = Object.freeze({
  identity: '\\frac{n(n+1)}{2}',
  square: '\\frac{n(n+1)(2n+1)}{6}',
  odd: 'n^{2}',
  alternating: '\\frac{(-1)^{n}-1}{2}',
  constant: `${CONSTANT_VALUE}n`,
  pronic: '\\frac{n(n+1)(n+2)}{3}',
});

export interface ClosedForm {
  /** The general statement of the closed form, as TeX. */
  readonly formulaTex: string;
  /** The same with the chapter's numbers put in, as TeX (it ends in the value). */
  readonly workTex: string;
  readonly value: Q;
  /** False when the closed form is not valid for these bounds (n < m − 1): the empty-sum convention then decides, and the formula is not claimed. */
  readonly applies: boolean;
  /** For r = 1 the geometric formula needs its special case. */
  readonly special: string | null;
}

/**
 * The closed form of Σ_{i=m}^{n} a_i, or `null` when there is none (1/i, a learner's list).
 * For n ≥ m − 1 it equals S(n) − S(m − 1); for the geometric sequence it is (r^m − r^{n+1})/(1 − r), and n − m + 1 when r = 1.
 */
export function closedForm(id: SeqId, params: SeqParams, m: number, n: number): ClosedForm | null {
  const applies = n >= m - 1;
  if (id === 'geometric') {
    const r = params.r;
    const rf = form(r);
    const rt = rf.integer && r.num >= 0n ? rf.tex : `\\left(${rf.tex}\\right)`;
    if (equals(r, ONE)) {
      return { formulaTex: `\\sum_{i=m}^{n}1^{i}=n-m+1\\quad(r=1)`, workTex: `${n}-${kTex(m)}+1=${n - m + 1}`, value: q(n - m + 1), applies, special: 'r = 1 is the special case: every term is 1, so the sum is the number of terms' };
    }
    if (r.num === 0n && m < 0) return null; // not defined: 0^m for m < 0
    const value = (() => {
      const num = sub(pow(r, m), pow(r, n + 1));
      return mul(num, q(r.den, r.den - r.num)); // 1/(1 − r) = den/(den − num)
    })();
    return {
      formulaTex: '\\sum_{i=m}^{n}r^{i}=\\frac{r^{m}-r^{n+1}}{1-r}\\quad(r\\ne1)',
      workTex: `\\frac{${rt}^{${m}}-${rt}^{${n + 1}}}{1-${rt}}=${form(value).tex}`,
      value, applies, special: null,
    };
  }
  const hi = prefix(id, n);
  const lo = prefix(id, m - 1);
  if (hi === null || lo === null) return null;
  const value = sub(hi.value, lo.value);
  const formulaTex = `\\sum_{i=m}^{n}a_i=S(n)-S(m-1),\\quad S(n)=${PREFIX_FORMULA[id]}`;
  const workTex = m === 1 ? `${hi.tex}=${form(value).tex}` : `${hi.tex}-${lo.value.num < 0n ? `\\left(${lo.tex}\\right)` : lo.tex}=${form(value).tex}`;
  return { formulaTex, workTex, value, applies, special: null };
}
