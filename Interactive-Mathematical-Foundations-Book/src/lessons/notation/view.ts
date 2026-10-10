/**
 * Helpers shared by the I.9 lesson views: how an exact rational, an exact radical, an integer or text becomes a platform `ValueDescription`,
 * and small text writers. Nothing here decides a mathematical fact; every value was produced by `src/math/notation`.
 */
import { formatApprox } from '../../platform/numeric/format';
import type { ValueDescription } from '../../platform/numeric/quantity';
import { form, toNumber, type Q } from '../../math/notation/rational';
import { radicalForm, radicalToNumber, type Radical } from '../../math/notation/norms';
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

/** An exact radical `c√r`: `=` its exact form and, when it is irrational, `≈` the nearest double. A rational one has no approximation line. */
export function radicalDescription(x: Radical): ValueDescription {
  const f = radicalForm(x);
  if (f.exactRational) {
    const plain = x.coef.den === 1n ? f.text : f.text;
    const approx = x.coef.den === 1n ? null : formatApprox(toNumber(x.coef), FORMAT);
    return {
      status: 'exact',
      lines: approx ? [{ relation: '=', text: plain, tex: f.tex }, { relation: '≈', text: approx.text, tex: approx.tex }] : [{ relation: '=', text: plain, tex: f.tex }],
      spoken: approx ? `${f.spoken}, about ${approx.spoken}` : f.spoken,
    };
  }
  const approx = formatApprox(radicalToNumber(x), FORMAT);
  return {
    status: 'exact',
    lines: [{ relation: '=', text: f.text, tex: f.tex }, { relation: '≈', text: `${approx.text}…`, tex: `${approx.tex}\\ldots` }],
    spoken: `${f.spoken}, about ${approx.spoken}`,
  };
}

/** A text value that is exact (an index, a shape, a code fragment): one `=` line. */
export function exactText(text: string, tex: string = `\\text{${text}}`, spoken: string = text): ValueDescription {
  return { status: 'exact', lines: [{ relation: '=', text, tex }], spoken };
}

/** A computed double: only ever `≈`. */
export function approxDescription(value: number): ValueDescription {
  const a = formatApprox(value, FORMAT);
  return { status: 'approximate', lines: [{ relation: '≈', text: a.text, tex: a.tex }], spoken: `about ${a.spoken}` };
}

/** A value that does not exist, with the reason. */
export function missingDescription(reason: string): ValueDescription {
  return { status: 'undefined', lines: [{ relation: '=', text: 'undefined', tex: '\\text{undefined}' }], spoken: `undefined. ${reason}`, note: reason };
}

/** The ASCII form `p` or `p/q` that a text box accepts back (a round trip through `parseQ`). */
export const qAscii = (a: Q): string => (a.den === 1n ? a.num.toString() : `${a.num}/${a.den}`);

/** A number as the text of a TeX/plain `Q`-like thing: whole numbers only. */
export const intText = (n: number): string => (n < 0 ? `−${-n}` : String(n));
