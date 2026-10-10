/**
 * Helpers shared by the I.6 lesson views: turning model values into the platform's display `Value`s, and writing the exactness policy
 * for the two cases the platform does not know about (a double that overflowed or underflowed).
 *
 * Nothing here computes mathematics; every number was produced by `src/math/families`.
 */
import { formatApprox, MINUS } from '../../platform/numeric/format';
import { describeValue, type ExactForm, type Value, type ValueDescription } from '../../platform/numeric/quantity';
import { rationalForm, toNumber, type Rat } from '../../math/families/rational';
import type { FamilyValue } from '../../math/families/families';
import type { StepValue } from '../../math/families/roundtrip';
import { FORMAT } from '../shared/format';

export { FORMAT };

export const ratValue = (r: Rat): Value => ({ kind: 'exact', exact: rationalForm(r), approx: toNumber(r) });
export const ratForm = (r: Rat): ExactForm => rationalForm(r);
/** LaTeX for a rational that is a base or a factor: negative values are parenthesised. */
export const ratTex = (r: Rat, parenthesiseNegative = false): string => {
  const t = rationalForm(r).tex;
  return parenthesiseNegative && r.num < 0n ? `(${t})` : t;
};
export const ratText = (r: Rat): string => rationalForm(r).text;
export const ratSpoken = (r: Rat): string => rationalForm(r).spoken;

const OVERFLOW_NOTE = 'The true value is finite but larger than the largest double (about 1.8×10³⁰⁸), so the computer stores ∞.';
const UNDERFLOW_NOTE = 'The true value is positive but smaller than the smallest double, so the computer stores 0.';

/**
 * How a double that left the representable range is shown. The row is always labelled as the COMPUTER's value ("as a double"), so the
 * relation "=" states a fact about the stored double (it IS ∞, it IS 0) and never claims the mathematical value is infinite or zero;
 * the note says what the true value is.
 */
export function describeOverflow(): ValueDescription {
  return { status: 'not-finite', lines: [{ relation: '=', text: '∞', tex: '\\infty' }], spoken: 'infinity as a double: the true value is finite but too large', note: OVERFLOW_NOTE };
}
export function describeUnderflow(): ValueDescription {
  return { status: 'not-finite', lines: [{ relation: '=', text: '0', tex: '0' }], spoken: 'zero as a double: the true value is positive but too small', note: UNDERFLOW_NOTE };
}

/** A family value as a platform `Value` (overflow handled separately by `describeFamily`). */
export function familyToValue(v: Exclude<FamilyValue, { kind: 'overflow' }>): Value {
  switch (v.kind) {
    case 'exact': return ratValue(v.value);
    case 'numeric': return { kind: 'numeric', value: v.value };
    case 'undefined': return { kind: 'undefined', reason: v.reason };
  }
}
export function describeFamily(v: FamilyValue, format = FORMAT): ValueDescription {
  return v.kind === 'overflow' ? describeOverflow() : describeValue(familyToValue(v), format);
}

/** A round-trip step value as a description. */
export function describeStep(v: StepValue, format = FORMAT): ValueDescription {
  switch (v.kind) {
    case 'exact': return describeValue(ratValue(v.value), format);
    case 'numeric': return describeValue({ kind: 'numeric', value: v.value }, format);
    case 'undefined': return describeValue({ kind: 'undefined', reason: v.reason }, format);
    case 'overflow': return describeOverflow();
    case 'underflow': return describeUnderflow();
    case 'lost': return { status: 'undefined', lines: [{ relation: '=', text: 'no value', tex: '\\text{no value}' }], spoken: `no value. ${v.reason}`, note: v.reason };
  }
}

/** A double for use inside a formula, trimmed: `2.718282`. */
export const num = (n: number): string => formatApprox(n, { digits: 6, scientificAbove: 1e6, trimZeros: true }).tex;
export const numText = (n: number): string => formatApprox(n, { digits: 6, scientificAbove: 1e6, trimZeros: true }).text;

/** Exact interval written with brackets: `(0, ∞)`, `[−1, 1]`, `ℝ`. */
export function intervalText(lo: Rat | null, hi: Rat | null, loOpen: boolean, hiOpen: boolean): string {
  if (lo === null && hi === null) return 'all real numbers';
  if (lo !== null && hi !== null && lo.num === hi.num && lo.den === hi.den) return `{${ratText(lo)}}`;
  const left = lo === null ? '(−∞' : `${loOpen ? '(' : '['}${ratText(lo)}`;
  const right = hi === null ? '∞)' : `${ratText(hi)}${hiOpen ? ')' : ']'}`;
  return `${left}, ${right}`;
}

/** A computed double in prose: `2.718282`, with the typographic minus. */
export const approxText = (n: number): string => formatApprox(n, FORMAT).text;
export { MINUS };
