/**
 * Display conventions shared by the chapters after I.3 (the same numbers as the Vectors chapter: 6 decimals on screen, trimmed in
 * formulas, 3 for speech). Kept here, rather than imported from the I.3 lesson module, so no chapter depends on another chapter's views.
 */
import { formatGiven, type NumberFormat } from '../../platform/numeric/format';

export const FORMAT: NumberFormat = { digits: 6, scientificAbove: 1e6 };
/** Same precision for formulas, without trailing zeros: `5.29`, not `5.290000`. */
export const FORMULA_FORMAT: NumberFormat = { ...FORMAT, trimZeros: true };
/** Shorter precision for text a screen reader will speak. */
export const SPOKEN_FORMAT: NumberFormat = { digits: 3, scientificAbove: 1e6 };

/** LaTeX of a number the learner CHOSEN; parenthesised when used as the base of a power (a negative base, or scientific notation). */
export const given = (n: number, asPowerBase = false): string => {
  const t = formatGiven(n).tex;
  return asPowerBase && (n < 0 || t.includes('\\times')) ? `(${t})` : t;
};

/** A multi-line aligned display equation. */
export const aligned = (lines: readonly string[]): string => `\\begin{aligned}${lines.join('\\\\')}\\end{aligned}`;
