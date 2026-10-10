/**
 * Expectation of a finite distribution (I.9): counts -> probabilities -> E[X]. The probabilities come from the TAUGHT transformation
 * p_i = c_i / (c_1 + … + c_k), so they are non-negative and add to exactly 1 by construction; if every count is 0 the transformation divides
 * by zero and the result is undefined, never repaired into a made-up distribution. Everything is an exact rational.
 */
import { ZERO, add, equals, mul, q, type Q } from './rational';

export type OutcomeSet = 'die' | 'rating' | 'payoff';
export const OUTCOME_SETS: readonly OutcomeSet[] = Object.freeze(['die', 'rating', 'payoff'] as const);

export const OUTCOMES: Readonly<Record<OutcomeSet, readonly number[]>> = Object.freeze({
  die: Object.freeze([1, 2, 3, 4, 5, 6]),
  rating: Object.freeze([0, 1, 2, 3, 4]),
  payoff: Object.freeze([-1, 0, 2]),
});
export const COUNT_MAX = 99;

export interface ExpectState {
  readonly set: OutcomeSet;
  readonly c1: number;
  readonly c2: number;
  readonly c3: number;
  readonly c4: number;
  readonly c5: number;
  readonly c6: number;
}

export interface ExpectDerived {
  readonly set: OutcomeSet;
  readonly values: readonly number[];
  readonly counts: readonly number[];
  readonly total: number;
  readonly defined: boolean;
  /** `p_i = c_i / total`, in lowest terms; empty when undefined. */
  readonly p: readonly Q[];
  readonly sumP: Q | null;
  /** E[X] = sum of p_i x_i. */
  readonly expectation: Q | null;
  /** (sum of c_i x_i) / total: the same number computed without the probabilities (it must be equal). */
  readonly weightedMean: Q | null;
  readonly consistent: boolean | null;
  /** The outcomes with the largest count (the mode; several when tied); empty when undefined. */
  readonly modes: readonly number[];
  /** Is E[X] one of the possible values? Often not (a die never shows 3.5). */
  readonly isOutcome: boolean | null;
  readonly reason: string | null;
}

export function deriveExpect(s: ExpectState): ExpectDerived {
  const values = OUTCOMES[s.set];
  const all = [s.c1, s.c2, s.c3, s.c4, s.c5, s.c6];
  const counts = all.slice(0, values.length);
  for (const c of counts) if (!Number.isInteger(c) || c < 0 || c > COUNT_MAX) throw new RangeError(`A count is a whole number from 0 to ${COUNT_MAX}`);
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) {
    return {
      set: s.set, values, counts, total, defined: false, p: [], sumP: null, expectation: null, weightedMean: null, consistent: null, modes: [], isOutcome: null,
      reason: 'Every count is 0, so p_i = c_i / (c_1 + … + c_k) would divide by 0. There is no distribution to take an expectation of; nothing is substituted.',
    };
  }
  const p = counts.map(c => q(c, total));
  const sumP = p.reduce(add, ZERO);
  const expectation = p.reduce((acc, pi, i) => add(acc, mul(pi, q(values[i]!))), ZERO);
  const weighted = counts.reduce((acc, c, i) => acc + c * values[i]!, 0);
  const weightedMean = q(weighted, total);
  const top = Math.max(...counts);
  const modes = values.filter((_, i) => counts[i] === top);
  const isOutcome = expectation.den === 1n && values.includes(Number(expectation.num));
  return { set: s.set, values, counts, total, defined: true, p, sumP, expectation, weightedMean, consistent: equals(expectation, weightedMean) && equals(sumP, q(1)), modes, isOutcome, reason: null };
}
