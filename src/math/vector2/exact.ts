/**
 * Exact Euclidean magnitude of an INTEGER 2D vector (master plan §10.3, §15.5).
 *
 *   ‖(x, y)‖ = √(x² + y²) = a·√b,   with b square-free.
 *
 * This is the single exact family supported in M2 — integer components only. It is a small, domain-owned
 * structure, not a symbolic algebra system. Anything else is "numeric only" (the caller gets `null`).
 *
 * The arithmetic is BigInt, so there is no loss for components up to 2⁵³ − 1; trial division is only
 * attempted while the squared magnitude is ≤ `EXACT_RADICAND_LIMIT`, so the cost is bounded.
 */
import type { ExactForm } from '../../platform/numeric/quantity';

/** Beyond this squared magnitude the exact form is not attempted (trial division would be slow). */
export const EXACT_RADICAND_LIMIT = 10n ** 12n;

export interface ExactRadical {
  /** ‖v‖ = coefficient · √radicand, coefficient ≥ 0, radicand square-free (radicand = 1 ⇒ an integer). */
  readonly coefficient: bigint;
  readonly radicand: bigint;
}

/** Split n = a²·b with b square-free by dividing out p² for each p = 2, 3, 4, …  Requires n ≥ 1. */
function squareFreeSplit(n: bigint): ExactRadical {
  let coefficient = 1n;
  let rest = n;
  for (let p = 2n; p * p <= rest; p += 1n) {
    const square = p * p;
    while (rest % square === 0n) {
      coefficient *= p;
      rest /= square;
    }
  }
  return { coefficient, radicand: rest };
}

/** `null` when the components are not both integers, are not safe integers, or the value is too large to factor here. */
export function exactMagnitude(x: number, y: number): ExactRadical | null {
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) return null;
  const bx = BigInt(x);
  const by = BigInt(y);
  const squared = bx * bx + by * by;
  if (squared === 0n) return { coefficient: 0n, radicand: 1n };
  if (squared > EXACT_RADICAND_LIMIT) return null;
  return squareFreeSplit(squared);
}

export function toExactForm(r: ExactRadical): ExactForm {
  if (r.radicand === 1n) {
    const text = r.coefficient.toString();
    return { text, tex: text, spoken: text, integer: true, irrational: false };
  }
  const lead = r.coefficient === 1n ? '' : r.coefficient.toString();
  return {
    text: `${lead}√${r.radicand}`,
    tex: `${lead}\\sqrt{${r.radicand}}`,
    spoken: `${lead ? `${lead} times ` : ''}the square root of ${r.radicand}`,
    integer: false,
    irrational: true, // a square-free radicand > 1 is irrational
  };
}
