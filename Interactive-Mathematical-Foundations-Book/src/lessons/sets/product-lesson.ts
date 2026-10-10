/**
 * Lesson views for the Cartesian-product stage: two subsets of {1, …, 6}, the table of ordered pairs A × B, the table B × A, the count
 * |A| · |B|, and why the two tables are the same only when A = B or one factor is empty.
 *
 *   ProductState → deriveProduct → { tables · inspector rows · formulas · verdict · spoken text }
 */
import type { InspectorRowData } from '../../ui/Inspector';
import { CANONICAL_PRODUCT, PRODUCT_VALUES, deriveProduct, productMask, toggleProduct, type Pair, type ProductDerived, type ProductState } from '../../math/sets/product';
import { braces, countDescription, plural } from './view';

export { CANONICAL_PRODUCT, PRODUCT_VALUES, deriveProduct, toggleProduct };
export type { ProductDerived, ProductState };

export interface ProductPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: ProductState }
const preset = (id: string, label: string, aria: string, a: readonly number[], b: readonly number[]): ProductPreset =>
  Object.freeze({ id, label, aria, state: Object.freeze({ a: productMask(a), b: productMask(b) }) });
export const PRODUCT_PRESETS: readonly ProductPreset[] = Object.freeze([
  preset('canonical', '{1,2,3} × {3,4}', 'A is 1, 2, 3 and B is 3, 4', [1, 2, 3], [3, 4]),
  preset('single', '{1} × {2}', 'A is just 1 and B is just 2: one pair, and swapping gives a different pair', [1], [2]),
  preset('same', 'A = B', 'A and B are both 1, 2, 3', [1, 2, 3], [1, 2, 3]),
  preset('empty', 'A empty', 'A is the empty set', [], [1, 2, 3]),
  preset('full', '6 × 6', 'A and B are both 1 to 6: thirty-six pairs', [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6]),
]);
export const productPresetMatches = (s: ProductState, p: ProductPreset): boolean => s.a === p.state.a && s.b === p.state.b;

/** A table of ordered pairs: the first coordinate labels the rows and the second labels the columns. */
export interface PairTable {
  readonly id: 'product' | 'reversed';
  readonly caption: string;
  readonly tex: string;
  /** Row labels (first coordinates) and column labels (second coordinates). */
  readonly rows: readonly number[];
  readonly columns: readonly number[];
  /** Cells that are in this product but not in the other one. */
  readonly extra: ReadonlySet<string>;
  readonly witness: Pair | null;
}
const key = (a: number, b: number): string => `${a},${b}`;

export function productTables(d: ProductDerived): PairTable[] {
  return [
    {
      id: 'product', caption: 'A × B: first coordinate from A', tex: 'A\\times B', rows: d.A, columns: d.B,
      extra: new Set(d.onlyInProduct.map(([x, y]) => key(x, y))), witness: d.witness,
    },
    {
      id: 'reversed', caption: 'B × A: first coordinate from B', tex: 'B\\times A', rows: d.B, columns: d.A,
      extra: new Set(d.onlyInReversed.map(([x, y]) => key(x, y))), witness: null,
    },
  ];
}
export const cellKey = key;

export function productRows(d: ProductDerived): InspectorRowData[] {
  return [
    { id: 'size-a', role: 'x', symbolTex: '\\lvert A\\rvert', name: 'elements in A', description: countDescription(d.A.length) },
    { id: 'size-b', role: 'y', symbolTex: '\\lvert B\\rvert', name: 'elements in B', description: countDescription(d.B.length) },
    { id: 'size-product', role: 'primary', symbolTex: '\\lvert A\\times B\\rvert', name: 'ordered pairs in A × B', description: countDescription(d.pairs.length) },
  ];
}

export function productFormulas(d: ProductDerived): { id: string; label: string; tex: string }[] {
  const a = braces(d.A).tex;
  const b = braces(d.B).tex;
  return [
    { id: 'count', label: 'Counting the pairs, scrollable', tex: `\\lvert A\\times B\\rvert=${d.pairs.length}\\quad\\text{and}\\quad \\lvert A\\rvert\\cdot\\lvert B\\rvert=${d.A.length}\\cdot ${d.B.length}=${d.count.product}` },
    { id: 'sets', label: 'The two sets, scrollable', tex: `A=${a},\\qquad B=${b}` },
  ];
}

export function productVerdict(d: ProductDerived): { text: string; caution: boolean } {
  const count = `|A × B| = ${d.pairs.length} = |A| · |B| = ${d.A.length} · ${d.B.length}.`;
  switch (d.reason) {
    case 'equal-sets': return { text: `${count} Here A = B, so A × B and B × A are the same set of pairs.`, caution: false };
    case 'empty-factor': return { text: `${count} One of the sets is empty, so there are no pairs at all, and A × B = B × A = ∅.`, caution: false };
    default: {
      const w = d.witness!;
      return {
        text: `${count} A × B and B × A are different sets: (${w[0]}, ${w[1]}) is in A × B, but it is not in B × A, because that would need ${w[0]} to be in B and ${w[1]} to be in A. Order matters in a pair.`,
        caution: true,
      };
    }
  }
}

export function productDescription(d: ProductDerived): string {
  return `A is ${braces(d.A).text} and B is ${braces(d.B).text}. A times B has ${plural(d.pairs.length, 'ordered pair')}; B times A has ${plural(d.reversed.length, 'ordered pair')}.`;
}
export const productSpoken = (d: ProductDerived): string => `${plural(d.pairs.length, 'ordered pair')} in A times B. ${d.commutes ? 'A times B equals B times A.' : 'A times B is not the same set as B times A.'}`;
export const productChipLabel = (set: 'A' | 'B', v: number, member: boolean): string => `${v} ${member ? 'is in' : 'is not in'} ${set}. Press to ${member ? 'remove it from' : 'add it to'} ${set}.`;
