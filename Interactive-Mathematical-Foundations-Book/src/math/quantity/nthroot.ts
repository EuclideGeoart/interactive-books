/**
 * The graph picture of an n-th root: where the horizontal line y = A meets the curve y = xⁿ.
 *
 * The real solutions of xⁿ = A are
 *     n odd :   exactly one, ⁿ√A (negative when A is negative);
 *     n even:   two, ±ⁿ√A, when A > 0;  one, 0, when A = 0;  none when A < 0 (an even power is never negative).
 * `ⁿ√A` always means the NON-NEGATIVE root for even n, the principal root, so the second solution of an even equation is −ⁿ√A, written out.
 */
import { fromDecimal, type Rational } from './rational';
import { rootOf, rootPower, type RootResult } from './root';

export const A_DECIMALS = 2;
export const INDEX_MIN = 2;
export const INDEX_MAX = 5;

export interface NthRootState {
  readonly A: number;
  readonly n: number;
}

export interface NthRootDerived {
  readonly A: Rational;
  readonly n: number;
  readonly result: RootResult;
  /** (ⁿ√A)ⁿ from the exact form; `null` unless the root is exact. Equal to A whenever it exists. */
  readonly powerBack: Rational | null;
  readonly roundTrip: boolean;
  /** How many real numbers x satisfy xⁿ = A. */
  readonly solutions: 0 | 1 | 2;
  /** The real solutions as doubles, for drawing (ascending); empty when there are none. */
  readonly solutionPositions: readonly number[];
}

export function deriveNthRoot(state: NthRootState): NthRootDerived {
  const A = fromDecimal(state.A, A_DECIMALS);
  if (!A) throw new RangeError(`${state.A} has more than ${A_DECIMALS} decimal places`);
  if (!Number.isInteger(state.n) || state.n < INDEX_MIN || state.n > INDEX_MAX) throw new RangeError(`the index must be a whole number from ${INDEX_MIN} to ${INDEX_MAX}`);
  const n = state.n;
  const result = rootOf(A, n);
  const powerBack = result.kind === 'exact' ? rootPower(result.root) : null;
  const roundTrip = powerBack !== null && powerBack.num === A.num && powerBack.den === A.den;
  const even = n % 2 === 0;
  const solutions: 0 | 1 | 2 = even ? (A.num < 0n ? 0 : A.num === 0n ? 1 : 2) : 1;
  const r = result.kind === 'undefined' ? null : result.approx;
  const positions = r === null ? [] : even && solutions === 2 ? [-r, r] : [r === 0 ? 0 : r];
  return { A, n, result, powerBack, roundTrip, solutions, solutionPositions: positions };
}
