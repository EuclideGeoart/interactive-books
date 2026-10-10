/**
 * Exact-versus-approximate presentation (master plan §3.8, §3.9, §6.6, §10.2).
 *
 * This module is *generic*: it knows nothing about vectors or square roots. Domain code decides whether a
 * value has an exact form (and produces it); this module decides how exact and approximate are *shown*
 * so that a rounded number is never presented as an equality.
 *
 *   exact integer        →  =  5
 *   exact, not integer   →  =  √13          (exact line)
 *                           ≈  3.605551…    (approximation line; "…" only if the exact value is irrational)
 *   chosen by the learner→  =  2.3
 *   computed, no exact   →  ≈  0.588003
 *   undefined            →  undefined, with the reason
 */
import { formatApprox, formatGiven, type FormattedNumber, type NumberFormat } from './format';

export interface ExactForm {
  readonly text: string;
  readonly tex: string;
  readonly spoken: string;
  /** The exact value is an integer: no approximation line is needed. */
  readonly integer: boolean;
  /** The exact value has a non-terminating decimal expansion (e.g. √13), so its decimal line ends in "…". */
  readonly irrational: boolean;
}

export type Value =
  /** A state variable the learner chose. Shown with "=". */
  | { readonly kind: 'given'; readonly value: number }
  /** A computed value with a known exact form and its IEEE-754 approximation. */
  | { readonly kind: 'exact'; readonly exact: ExactForm; readonly approx: number }
  /** A computed IEEE-754 value; no exact form is claimed. Shown with "≈". */
  | { readonly kind: 'numeric'; readonly value: number }
  /** Mathematically undefined (not merely unknown). */
  | { readonly kind: 'undefined'; readonly reason: string };

export type Relation = '=' | '≈';

export interface Line {
  readonly relation: Relation;
  readonly text: string;
  readonly tex: string;
}

export interface Unit {
  readonly text: string;
  readonly tex: string;
  readonly spoken: string;
  /** Written directly after the number with no space (°, %), instead of "0.588 rad". */
  readonly attached?: boolean;
}

export interface ValueDescription {
  readonly status: 'exact' | 'approximate' | 'given' | 'undefined' | 'not-finite';
  /** One line, or two (exact, then approximation). */
  readonly lines: readonly Line[];
  readonly spoken: string;
  /** Why a value is undefined / not finite. */
  readonly note?: string;
}

const withUnit = (n: FormattedNumber, unit?: Unit): { text: string; tex: string; spoken: string } =>
  unit
    ? { text: `${n.text}${unit.attached ? '' : ' '}${unit.text}`, tex: `${n.tex}${unit.attached ? '' : '\\,'}${unit.tex}`, spoken: `${n.spoken} ${unit.spoken}` }
    : { text: n.text, tex: n.tex, spoken: n.spoken };

export function describeValue(value: Value, format: NumberFormat, unit?: Unit): ValueDescription {
  switch (value.kind) {
    case 'undefined':
      return {
        status: 'undefined',
        lines: [{ relation: '=', text: 'undefined', tex: '\\text{undefined}' }],
        spoken: `undefined. ${value.reason}`,
        note: value.reason,
      };
    case 'given': {
      const n = withUnit(formatGiven(value.value), unit);
      return { status: 'given', lines: [{ relation: '=', text: n.text, tex: n.tex }], spoken: n.spoken };
    }
    case 'numeric': {
      const f = formatApprox(value.value, format);
      if (!f.finite) {
        return {
          status: 'not-finite',
          lines: [{ relation: '=', text: f.text, tex: f.tex }],
          spoken: f.spoken,
          note: 'Not a finite number: the computation overflowed or is undefined.',
        };
      }
      const n = withUnit(f, unit);
      return { status: 'approximate', lines: [{ relation: '≈', text: n.text, tex: n.tex }], spoken: `approximately ${n.spoken}` };
    }
    case 'exact': {
      const exactLine: Line = {
        relation: '=',
        text: unit ? `${value.exact.text}${unit.attached ? '' : ' '}${unit.text}` : value.exact.text,
        tex: unit ? `${value.exact.tex}${unit.attached ? '' : '\\,'}${unit.tex}` : value.exact.tex,
      };
      if (value.exact.integer) {
        return { status: 'exact', lines: [exactLine], spoken: `exactly ${value.exact.spoken}${unit ? ` ${unit.spoken}` : ''}` };
      }
      const f = formatApprox(value.approx, format);
      const n = withUnit(f, unit);
      const ellipsis = value.exact.irrational && f.finite;
      return {
        status: 'exact',
        lines: [exactLine, { relation: '≈', text: `${n.text}${ellipsis ? '…' : ''}`, tex: `${n.tex}${ellipsis ? '\\ldots' : ''}` }],
        spoken: `exactly ${value.exact.spoken}${unit ? ` ${unit.spoken}` : ''}, approximately ${n.spoken}`,
      };
    }
  }
}
