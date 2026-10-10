/**
 * Numeric display policy (master plan §8.3, §3.8, §3.9).
 *
 * Default `Number#toString` is never the pedagogical precision policy. Every number that reaches the
 * screen or an accessible name goes through one of the two functions here:
 *
 *  - `formatApprox`  — a *computed* value, rounded to a stated number of digits. Callers pair it with ≈.
 *  - `formatGiven`   — a *chosen* value (a state variable the learner set). Shortest faithful decimal.
 *
 * Invariants (all unit-tested):
 *  - the minus sign is U+2212, never ASCII hyphen-minus;
 *  - negative zero never reaches the screen;
 *  - a non-zero value is never displayed as zero (it switches to scientific notation instead);
 *  - NaN and ±∞ are reported as such, never as a number.
 */

/** U+2212 MINUS SIGN — the only minus used in rendered mathematical text. */
export const MINUS = '−';

export interface NumberFormat {
  /** Digits after the decimal point (fixed notation) — and significant digits in scientific notation. */
  readonly digits: number;
  /** |x| at or above this switches to scientific notation. */
  readonly scientificAbove: number;
  /** Strip trailing zeros after the decimal point (formulas read `5.29`; aligned readouts keep `5.290000`). */
  readonly trimZeros?: boolean;
}

export const DEFAULT_FORMAT: NumberFormat = { digits: 6, scientificAbove: 1e6 };

export interface FormattedNumber {
  /** Visible plain text, e.g. `−3.605551` or `1.5×10⁻⁷`. */
  readonly text: string;
  /** LaTeX for the same quantity. */
  readonly tex: string;
  /** Text that reads well in an `aria-label`. */
  readonly spoken: string;
  /** False for NaN and ±∞. */
  readonly finite: boolean;
}

const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻',
};
const superscript = (exponent: string): string => [...exponent].map(c => SUPERSCRIPT[c] ?? c).join('');

/** Split the output of `toExponential` into sign-free mantissa and integer exponent text. */
function scientificParts(magnitude: number, significantDigits: number): { mantissa: string; exponent: string } {
  const [rawMantissa = '0', rawExponent = '0'] = magnitude.toExponential(Math.max(0, significantDigits - 1)).split('e');
  const mantissa = rawMantissa.includes('.') ? rawMantissa.replace(/0+$/, '').replace(/\.$/, '') : rawMantissa;
  return { mantissa, exponent: String(Number(rawExponent)) };
}

function scientific(negative: boolean, magnitude: number, significantDigits: number): FormattedNumber {
  const { mantissa, exponent } = scientificParts(magnitude, significantDigits);
  const sign = negative ? MINUS : '';
  return {
    text: `${sign}${mantissa}×10${superscript(exponent)}`,
    tex: `${negative ? '-' : ''}${mantissa}\\times 10^{${exponent}}`,
    spoken: `${negative ? 'minus ' : ''}${mantissa} times ten to the ${exponent.replace('-', 'minus ')}`,
    finite: true,
  };
}

function nonFinite(x: number): FormattedNumber {
  if (Number.isNaN(x)) return { text: 'NaN', tex: '\\mathrm{NaN}', spoken: 'not a number', finite: false };
  return x > 0
    ? { text: '∞', tex: '\\infty', spoken: 'infinity', finite: false }
    : { text: `${MINUS}∞`, tex: '-\\infty', spoken: 'negative infinity', finite: false };
}

const ZERO: FormattedNumber = { text: '0', tex: '0', spoken: '0', finite: true };

/**
 * Format a *computed* value. Integers print without a decimal point; other values print with exactly
 * `digits` decimals so a column of readouts keeps its width while the learner drags.
 */
export function formatApprox(x: number, format: NumberFormat = DEFAULT_FORMAT): FormattedNumber {
  if (!Number.isFinite(x)) return nonFinite(x);
  if (x === 0) return ZERO; // also catches −0
  const negative = x < 0;
  const magnitude = Math.abs(x);
  if (magnitude >= format.scientificAbove) return scientific(negative, magnitude, format.digits);
  const fixed = magnitude.toFixed(format.digits);
  // A non-zero value must not be shown as zero: fall back to scientific notation.
  if (Number(fixed) === 0) return scientific(negative, magnitude, format.digits);
  const body = Number.isInteger(magnitude) ? String(magnitude) : format.trimZeros ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed;
  const sign = negative ? MINUS : '';
  return {
    text: `${sign}${body}`,
    tex: `${negative ? '-' : ''}${body}`,
    spoken: `${negative ? 'minus ' : ''}${body}`,
    finite: true,
  };
}

/** Format a value the learner chose (a state variable): the shortest decimal with ≤ 12 significant digits. */
export function formatGiven(x: number): FormattedNumber {
  if (!Number.isFinite(x)) return nonFinite(x);
  if (x === 0) return ZERO;
  const negative = x < 0;
  const magnitude = Math.abs(Number(Math.abs(x).toPrecision(12)));
  if (magnitude >= 1e12 || magnitude < 1e-6) return scientific(negative, magnitude, 12);
  const body = String(magnitude);
  return {
    text: `${negative ? MINUS : ''}${body}`,
    tex: `${negative ? '-' : ''}${body}`,
    spoken: `${negative ? 'minus ' : ''}${body}`,
    finite: true,
  };
}
