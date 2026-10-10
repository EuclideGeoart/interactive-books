/**
 * Cartesian products of two small finite sets (chapter I.7).
 *
 * A and B are subsets of V = {1, …, 6}, stored as bit masks. The product A × B is the set of ORDERED pairs (a, b) with a ∈ A and b ∈ B.
 * Two statements are checked by the model on every state, each side computed separately:
 *   |A × B| = |A| · |B|                    (the pairs are counted one by one, and the product of the counts is formed separately)
 *   A × B = B × A  ⇔  A = B, or A = ∅, or B = ∅
 * When A × B ≠ B × A the model returns a witness: a pair in one product and not in the other.
 */
export const PRODUCT_SIZE = 6;
export const PRODUCT_VALUES: readonly number[] = Object.freeze(Array.from({ length: PRODUCT_SIZE }, (_, i) => i + 1));
export const PRODUCT_FULL = (1 << PRODUCT_SIZE) - 1;

export interface ProductState {
  readonly a: number;
  readonly b: number;
}
export const CANONICAL_PRODUCT: ProductState = Object.freeze({ a: 0b000111, b: 0b001100 }); // A = {1, 2, 3}, B = {3, 4}

export const productItems = (mask: number): number[] => PRODUCT_VALUES.filter(v => (mask & (1 << (v - 1))) !== 0);
export const productMask = (items: readonly number[]): number => items.reduce((m, v) => m | (1 << (v - 1)), 0);
export const toggleProduct = (mask: number, v: number): number => mask ^ (1 << (v - 1));

export type Pair = readonly [number, number];
export const pairKey = (p: Pair): string => `${p[0]},${p[1]}`;

export interface ProductDerived {
  readonly state: ProductState;
  readonly A: readonly number[];
  readonly B: readonly number[];
  /** Ordered pairs (a, b), a ∈ A, b ∈ B, listed row by row (b outer, a inner) so a grid reads naturally. */
  readonly pairs: readonly Pair[];
  readonly reversed: readonly Pair[];
  readonly count: { readonly pairs: number; readonly product: number; readonly holds: boolean };
  readonly commutes: boolean;
  /** The theorem's right-hand side: A = B, or one of them is empty. */
  readonly commutesByTheorem: boolean;
  /** When A × B ≠ B × A: a pair in A × B that is not in B × A. */
  readonly witness: Pair | null;
  /** Every pair that is in A × B and not in B × A, and every pair in B × A and not in A × B (both empty exactly when the products are equal). */
  readonly onlyInProduct: readonly Pair[];
  readonly onlyInReversed: readonly Pair[];
  readonly reason: 'equal-sets' | 'empty-factor' | 'different-sets';
}

export function deriveProduct(state: ProductState): ProductDerived {
  for (const m of [state.a, state.b]) if (!Number.isInteger(m) || m < 0 || m > PRODUCT_FULL) throw new RangeError('A and B must be subsets of {1, …, 6}');
  const A = productItems(state.a);
  const B = productItems(state.b);
  const pairs: Pair[] = [];
  for (const b of B) for (const a of A) pairs.push([a, b]);
  const reversed: Pair[] = [];
  for (const a of A) for (const b of B) reversed.push([b, a]); // B × A: first coordinate from B
  const inReversed = new Set(reversed.map(pairKey));
  const inProduct = new Set(pairs.map(pairKey));
  const witness = pairs.find(p => !inReversed.has(pairKey(p))) ?? null;
  const onlyInProduct = pairs.filter(p => !inReversed.has(pairKey(p)));
  const onlyInReversed = reversed.filter(p => !inProduct.has(pairKey(p)));
  const commutes = onlyInProduct.length === 0 && onlyInReversed.length === 0;
  const equalSets = state.a === state.b;
  const emptyFactor = A.length === 0 || B.length === 0;
  return Object.freeze({
    state, A, B, pairs, reversed,
    count: { pairs: pairs.length, product: A.length * B.length, holds: pairs.length === A.length * B.length },
    commutes,
    commutesByTheorem: equalSets || emptyFactor,
    witness, onlyInProduct, onlyInReversed,
    reason: equalSets ? 'equal-sets' : emptyFactor ? 'empty-factor' : 'different-sets',
  });
}
