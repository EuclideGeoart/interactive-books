/**
 * The hero relationship of I.1: a quantity, its square, and its square root — in both directions.
 *
 *   side → area :  q ↦ q²          (a square of side |q| has area q², and q² = (−q)²)
 *   area → side :  A ↦ √A          (defined for A ≥ 0 only; √A is the NON-NEGATIVE number whose square is A)
 *
 * Squaring and rooting are inverses only on the right domain:
 *     √(q²) = |q|          for every real q   (NOT q: the sign is lost when squaring)
 *     (√A)² = A            for A ≥ 0 only      (for A < 0 there is no real √A)
 * The model computes both directions with exact rational arithmetic; the learner's numbers have at most `DECIMALS` decimal places, a
 * contract the stage enforces by rejecting finer input (`fromDecimal` would return null here).
 */
import { DIMENSIONLESS, LENGTH, scaleDim, type Dim } from './dimension';
import { abs, eq, fromDecimal, mul, type Rational } from './rational';
import { rootOf, rootPower, type ExactRoot, type RootResult } from './root';

export const DECIMALS = 2;
export type SquareMode = 'side' | 'area';
export type SquareUnit = 'none' | 'm';

/** The one canonical, flat state of the hero stage. Both numbers are kept: switching mode never invents or clamps the other. */
export interface SquareState {
  readonly mode: SquareMode;
  readonly side: number;
  readonly area: number;
  readonly unit: SquareUnit;
}

export interface SideDerived {
  readonly mode: 'side';
  readonly q: Rational;
  /** q² — the area of the square on the segment from 0 to q. Exact. */
  readonly square: Rational;
  readonly abs: Rational;
  /** √(q²), computed from the SQUARE (not from q), so it demonstrates what the inverse really returns. */
  readonly rootOfSquare: RootResult;
  /** True when q < 0: the square root of q² is −q, not q, and the sign is gone. */
  readonly signLost: boolean;
  readonly sideDim: Dim;
  readonly areaDim: Dim;
}

export interface AreaDerived {
  readonly mode: 'area';
  readonly area: Rational;
  readonly root: RootResult;
  /** (√A)² computed exactly from the radical form; equals `area` whenever the root exists. */
  readonly squareOfRoot: Rational | null;
  readonly roundTrip: boolean;
  /** How many real numbers x satisfy x² = A: 0 (A < 0), 1 (A = 0), 2 (A > 0, namely ±√A). */
  readonly solutions: 0 | 1 | 2;
  readonly sideDim: Dim;
  readonly areaDim: Dim;
}

export type SquareDerived = SideDerived | AreaDerived;

function exact(value: number): Rational {
  const r = fromDecimal(value, DECIMALS);
  if (!r) throw new RangeError(`${value} has more than ${DECIMALS} decimal places`);
  return r;
}

export function deriveSquare(state: SquareState): SquareDerived {
  const sideDim = state.unit === 'm' ? LENGTH : DIMENSIONLESS;
  const areaDim = scaleDim(sideDim, 2);
  if (state.mode === 'side') {
    const q = exact(state.side);
    const square = mul(q, q);
    return { mode: 'side', q, square, abs: abs(q), rootOfSquare: rootOf(square, 2), signLost: q.num < 0n, sideDim, areaDim };
  }
  const area = exact(state.area);
  const root = rootOf(area, 2);
  const squareOfRoot = root.kind === 'exact' ? rootPower(root.root) : null;
  return {
    mode: 'area', area, root, squareOfRoot, roundTrip: squareOfRoot !== null && eq(squareOfRoot, area),
    solutions: area.num < 0n ? 0 : area.num === 0n ? 1 : 2, sideDim, areaDim,
  };
}

/** The negative twin of an exact square root: −√A also squares to A. */
export const negatedRoot = (r: ExactRoot): ExactRoot => ({ ...r, a: -r.a });

/** Numeric position of the principal root of the area on the number line, or `null` when it does not exist. */
export function rootPosition(d: AreaDerived): number | null {
  return d.root.kind === 'undefined' ? null : d.root.approx;
}
