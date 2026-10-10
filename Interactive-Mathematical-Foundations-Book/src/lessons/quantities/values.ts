/**
 * How this chapter shows its numbers (the exact-versus-approximate policy of master plan §3.8, applied to rationals and radicals).
 *
 *   a rational with a terminating decimal expansion   →  `= 0.01`            (that IS the exact value; no second line)
 *   a rational that does not terminate                →  `= 100/9` then `≈ 11.111111…`
 *   an exact radical                                  →  `= 2√3` then `≈ 3.464102…`
 *   a root outside the factoring guard                →  `≈ 12345.678901` and a note saying the exact form was not attempted
 *   a number the learner typed                        →  `= 2.3`
 *
 * Nothing here computes mathematics: it chooses a presentation for values the model produced.
 */
import { rationalForm, rootForm } from '../../math/quantity/exactform';
import { isDimensionless, unitSpoken, unitTex, unitText, type Dim } from '../../math/quantity/dimension';
import { toNumber, type Rational } from '../../math/quantity/rational';
import type { RootResult } from '../../math/quantity/root';
import { describeValue, type Unit, type Value, type ValueDescription } from '../../platform/numeric/quantity';
import { FORMAT } from '../shared/format';

export const unitOf = (dim: Dim): Unit | undefined => (isDimensionless(dim) ? undefined : { text: unitText(dim), tex: unitTex(dim), spoken: unitSpoken(dim) });

/** An exact rational as an inspector value. */
export const rationalValue = (r: Rational): Value => ({ kind: 'exact', exact: rationalForm(r), approx: toNumber(r) });

/** The result of an n-th root as an inspector value (exact radical, honest numeric outside the guard, or undefined with its reason). */
export function rootValue(result: RootResult): Value {
  if (result.kind === 'exact') return { kind: 'exact', exact: rootForm(result.root), approx: result.approx };
  if (result.kind === 'numeric') return { kind: 'numeric', value: result.approx };
  return { kind: 'undefined', reason: result.reason };
}

/**
 * The shared formatter writes a rounding with a unit as `1.414214 m…`, with the ellipsis after the unit. The "…" belongs to the digits
 * (they do not end), so this moves it back: `1.414214… m`. Only the approximation line is touched.
 */
function ellipsisBeforeUnit(description: ValueDescription, unit?: Unit): ValueDescription {
  if (!unit) return description;
  return {
    ...description,
    lines: description.lines.map(line => {
      if (line.relation !== '≈') return line;
      const head = line.text.endsWith(`${unit.text}…`) ? line.text.slice(0, -(unit.text.length + 1)) : null;
      const gap = head === null ? '' : (/\s*$/.exec(head)?.[0] ?? '');
      const text = head === null ? line.text : `${head.slice(0, head.length - gap.length)}…${gap}${unit.text}`;
      const tex = line.tex.endsWith(`${unit.tex}\\ldots`) ? `${line.tex.slice(0, -(unit.tex.length + 6)).replace(/\\,$/, '')}\\ldots\\,${unit.tex}` : line.tex;
      return { ...line, text, tex };
    }),
  };
}

export const describeRational = (r: Rational, unit?: Unit): ValueDescription => ellipsisBeforeUnit(describeValue(rationalValue(r), FORMAT, unit), unit);

/** As `describeRational` for roots; a numeric (guard) result also carries the explanation as a note. */
export function describeRoot(result: RootResult, unit?: Unit): ValueDescription {
  const description = ellipsisBeforeUnit(describeValue(rootValue(result), FORMAT, unit), unit);
  return result.kind === 'numeric' ? { ...description, note: result.reason } : description;
}

/** A learner-chosen number, shown with "=". */
export const describeGiven = (value: number, unit?: Unit): ValueDescription => describeValue({ kind: 'given', value }, FORMAT, unit);

/** A statement the inspector shows verbatim (for example "two solutions"): the `=` relation with text and LaTeX supplied by the caller. */
export const statement = (text: string, tex: string, spoken: string, status: ValueDescription['status'] = 'exact', note?: string): ValueDescription => ({
  status,
  lines: [{ relation: '=', text, tex }],
  spoken,
  ...(note ? { note } : {}),
});

/** The exact value of a rational, as LaTeX (a decimal when it terminates, a fraction otherwise). */
export const rationalTex = (r: Rational): string => rationalForm(r).tex;
/** Always a fraction (or an integer), however the value would be written as a decimal. */
export const fractionTex = (r: Rational): string => (r.den === 1n ? r.num.toString() : `${r.num < 0n ? '-' : ''}\\frac{${(r.num < 0n ? -r.num : r.num).toString()}}{${r.den.toString()}}`);
/** LaTeX of an exact rational that appears as the base of a power: negative bases are parenthesised. */
export const baseTex = (r: Rational): string => (r.num < 0n ? `(${rationalForm(r).tex})` : r.den === 1n ? rationalForm(r).tex : `\\left(${fractionTex(r)}\\right)`);
