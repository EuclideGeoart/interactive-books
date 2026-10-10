/**
 * Helpers shared by the I.8 lesson views: how an exact rational becomes a platform `ValueDescription`, and small text writers.
 * Nothing here decides a mathematical fact; every value was produced by `src/math/summation`.
 */
import { formatApprox } from '../../platform/numeric/format';
import type { ValueDescription } from '../../platform/numeric/quantity';
import { form, formParen, toNumber, type Q } from '../../math/summation/rational';
import { FORMAT } from '../shared/format';

export { FORMAT };

export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

/** An exact rational as a read-only value: `=` the integer or lowest-terms fraction and, for a fraction, `≈` its decimal (never the other way round). */
export function qDescription(a: Q): ValueDescription {
  const f = form(a);
  if (f.integer) return { status: 'exact', lines: [{ relation: '=', text: f.text, tex: f.tex }], spoken: f.spoken };
  const approx = formatApprox(toNumber(a), FORMAT);
  return {
    status: 'exact',
    lines: [{ relation: '=', text: f.text, tex: f.tex }, { relation: '≈', text: approx.text, tex: approx.tex }],
    spoken: `${f.spoken}, about ${approx.spoken}`,
  };
}

/** A value that does not exist, with the reason. */
export function missingDescription(reason: string): ValueDescription {
  return { status: 'undefined', lines: [{ relation: '=', text: 'undefined', tex: '\\text{undefined}' }], spoken: `undefined. ${reason}`, note: reason };
}

/** The ASCII form `p` or `p/q` that a text box accepts back (a round trip through `parseQ`). */
export const qAscii = (a: Q): string => (a.den === 1n ? a.num.toString() : `${a.num}/${a.den}`);

/** A term inside a sum: negative values and fractions in parentheses. */
export const termTex = (a: Q): string => formParen(a).tex;
export const termText = (a: Q): string => formParen(a).text;
