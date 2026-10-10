/**
 * Exact forms for display: how a rational or an exact radical is WRITTEN (plain text, LaTeX, and a spoken form) — the counterpart of
 * `vector2/exact.ts#toExactForm` for this chapter's types. Pure strings, no mathematics beyond reading the exact value's own digits.
 *
 * `ExactForm.integer` means "no separate approximation line is needed": true for integers AND for terminating decimals such as `0.01`, which
 * are already their own exact decimal expansion. `ExactForm.irrational` means "the decimal expansion never ends", so the "≈" line carries an
 * ellipsis: true for 100/9 and for √13 alike.
 */
import type { ExactForm } from '../../platform/numeric/quantity';
import { MINUS } from '../../platform/numeric/format';
import { decimalText, rational, type Rational } from './rational';
import { rootName, type ExactRoot } from './root';

const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
const sup = (n: number): string => [...String(n)].map(c => SUP[c] ?? c).join('');
const unsign = (t: string): string => t.replace(/^-/, '');

/** `−3/4`, `0.01`, `7`: the exact value, in the plainest faithful form. */
export function rationalForm(r: Rational): ExactForm {
  const dec = decimalText(r);
  if (dec !== null) {
    const body = unsign(dec);
    const negative = r.num < 0n;
    return { text: `${negative ? MINUS : ''}${body}`, tex: dec, spoken: `${negative ? 'minus ' : ''}${body}`, integer: true, irrational: false };
  }
  const negative = r.num < 0n;
  const n = (negative ? -r.num : r.num).toString();
  const d = r.den.toString();
  return {
    text: `${negative ? MINUS : ''}${n}/${d}`,
    tex: `${negative ? '-' : ''}\\frac{${n}}{${d}}`,
    spoken: `${negative ? 'minus ' : ''}${n} over ${d}`,
    integer: false,
    irrational: true, // the decimal expansion of a non-terminating rational repeats forever
  };
}

/** Exact form of `a·ⁿ√b / c`: `2√3/3`, `√2/2`, `³√24`, or the plain rational when b = 1. */
export function rootForm(r: ExactRoot): ExactForm {
  if (r.b === 1n) return rationalForm(rational(r.a, r.c));
  const negative = r.a < 0n;
  const a = negative ? -r.a : r.a;
  const lead = a === 1n ? '' : a.toString();
  const radical = r.index === 2 ? `√${r.b}` : `${sup(r.index)}√${r.b}`;
  const text = `${negative ? MINUS : ''}${lead}${radical}${r.c === 1n ? '' : `/${r.c}`}`;
  const sqrtTex = r.index === 2 ? `\\sqrt{${r.b}}` : `\\sqrt[${r.index}]{${r.b}}`;
  const top = `${lead}${sqrtTex}`;
  const tex = `${negative ? '-' : ''}${r.c === 1n ? top : `\\frac{${top}}{${r.c}}`}`;
  const name = rootName(r.index);
  const spoken = `${negative ? 'minus ' : ''}${lead ? `${lead} times ` : ''}the ${name} of ${r.b}${r.c === 1n ? '' : `, over ${r.c}`}`;
  return { text, tex, spoken, integer: false, irrational: true };
}

/** `ⁿ√A` written but not simplified — the defining expression, e.g. for "the square root of 13". */
export const radicalOfText = (n: number, radicand: string): string => (n === 2 ? `√${radicand}` : `${sup(n)}√${radicand}`);
export const radicalOfTex = (n: number, radicand: string): string => (n === 2 ? `\\sqrt{${radicand}}` : `\\sqrt[${n}]{${radicand}}`);
