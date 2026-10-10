/**
 * Finite sets over an explicitly displayed universe (chapter I.7).
 *
 * The universe is the fixed list U = {1, 2, …, 12}. A set A ⊆ U is stored as a bit mask (bit i − 1 set ⇔ i ∈ A), which keeps the lesson
 * state flat and comparable; everything the chapter shows (union, intersection, differences, complements, subset tests, the inclusion–
 * exclusion count and both De Morgan laws) is derived from the two masks. A complement is ALWAYS relative to U: it is meaningless otherwise.
 *
 * Nothing here is approximate: every statement is exact, so the views write "=" everywhere.
 */
export const UNIVERSE_SIZE = 12;
export const UNIVERSE: readonly number[] = Object.freeze(Array.from({ length: UNIVERSE_SIZE }, (_, i) => i + 1));
export const FULL_MASK = (1 << UNIVERSE_SIZE) - 1;

export type SetOp = 'union' | 'intersection' | 'a-minus-b' | 'b-minus-a' | 'symmetric' | 'complement-a' | 'complement-b';
export const SET_OPS: readonly SetOp[] = Object.freeze(['union', 'intersection', 'a-minus-b', 'b-minus-a', 'symmetric', 'complement-a', 'complement-b']);

export interface SetsState {
  /** Bit i − 1 set ⇔ i ∈ A. */
  readonly a: number;
  readonly b: number;
  /** The operation whose result is highlighted. */
  readonly op: SetOp;
}

export const maskOf = (items: readonly number[]): number => {
  let m = 0;
  for (const i of items) {
    if (!Number.isInteger(i) || i < 1 || i > UNIVERSE_SIZE) throw new RangeError(`${i} is not an element of the universe {1, …, ${UNIVERSE_SIZE}}`);
    m |= 1 << (i - 1);
  }
  return m;
};
export const itemsOf = (mask: number): number[] => UNIVERSE.filter(i => (mask & (1 << (i - 1))) !== 0);
export const hasItem = (mask: number, i: number): boolean => (mask & (1 << (i - 1))) !== 0;
export const toggleItem = (mask: number, i: number): number => mask ^ (1 << (i - 1));
const count = (mask: number): number => itemsOf(mask).length;

export const CANONICAL_SETS: SetsState = Object.freeze({ a: maskOf([1, 2, 3, 4, 5]), b: maskOf([4, 5, 6, 7]), op: 'union' as SetOp });

export function checkSets(state: SetsState): void {
  for (const m of [state.a, state.b]) if (!Number.isInteger(m) || m < 0 || m > FULL_MASK) throw new RangeError('A and B must be subsets of the universe');
  if (!SET_OPS.includes(state.op)) throw new RangeError(`Unknown operation ${String(state.op)}`);
}

/** The four regions of the Venn picture: every element of U is in exactly one. */
export interface Regions { readonly onlyA: readonly number[]; readonly both: readonly number[]; readonly onlyB: readonly number[]; readonly neither: readonly number[] }

/** A statement "X ⊆ Y" with the reason: the first element of X missing from Y, when it fails. */
export interface SubsetFact { readonly holds: boolean; readonly witness: number | null }

export interface SetsDerived {
  readonly state: SetsState;
  readonly A: readonly number[];
  readonly B: readonly number[];
  readonly union: readonly number[];
  readonly intersection: readonly number[];
  readonly aMinusB: readonly number[];
  readonly bMinusA: readonly number[];
  readonly symmetric: readonly number[];
  readonly complementA: readonly number[];
  readonly complementB: readonly number[];
  readonly regions: Regions;
  /** The result of the selected operation. */
  readonly selected: readonly number[];
  readonly subsetAB: SubsetFact;
  readonly subsetBA: SubsetFact;
  readonly equal: boolean;
  readonly properSubsetAB: boolean;
  readonly properSubsetBA: boolean;
  readonly disjoint: boolean;
  /** |A ∪ B| counted directly, against |A| + |B| − |A ∩ B|. */
  readonly inclusionExclusion: { readonly direct: number; readonly formula: number; readonly holds: boolean };
  /** (A ∪ B)ᶜ against Aᶜ ∩ Bᶜ, and (A ∩ B)ᶜ against Aᶜ ∪ Bᶜ: each side computed separately from U, A and B. */
  readonly deMorgan: {
    readonly unionComplement: readonly number[]; readonly complementsIntersection: readonly number[]; readonly firstHolds: boolean;
    readonly intersectionComplement: readonly number[]; readonly complementsUnion: readonly number[]; readonly secondHolds: boolean;
  };
}

const same = (x: readonly number[], y: readonly number[]): boolean => x.length === y.length && x.every((v, i) => v === y[i]);

function subsetFact(x: readonly number[], inY: (i: number) => boolean): SubsetFact {
  const witness = x.find(i => !inY(i));
  return { holds: witness === undefined, witness: witness ?? null };
}

export function deriveSets(state: SetsState): SetsDerived {
  checkSets(state);
  const A = itemsOf(state.a);
  const B = itemsOf(state.b);
  const inA = (i: number) => hasItem(state.a, i);
  const inB = (i: number) => hasItem(state.b, i);
  // Each set below is built by testing membership element by element, never by a bit trick, so the masks are only storage.
  const union = UNIVERSE.filter(i => inA(i) || inB(i));
  const intersection = UNIVERSE.filter(i => inA(i) && inB(i));
  const aMinusB = UNIVERSE.filter(i => inA(i) && !inB(i));
  const bMinusA = UNIVERSE.filter(i => inB(i) && !inA(i));
  const symmetric = UNIVERSE.filter(i => inA(i) !== inB(i));
  const complementA = UNIVERSE.filter(i => !inA(i));
  const complementB = UNIVERSE.filter(i => !inB(i));
  const regions: Regions = { onlyA: aMinusB, both: intersection, onlyB: bMinusA, neither: UNIVERSE.filter(i => !inA(i) && !inB(i)) };
  const selected = { union, intersection, 'a-minus-b': aMinusB, 'b-minus-a': bMinusA, symmetric, 'complement-a': complementA, 'complement-b': complementB }[state.op];
  const subsetAB = subsetFact(A, inB);
  const subsetBA = subsetFact(B, inA);
  const equal = subsetAB.holds && subsetBA.holds;
  const unionComplement = UNIVERSE.filter(i => !union.includes(i));
  const complementsIntersection = UNIVERSE.filter(i => complementA.includes(i) && complementB.includes(i));
  const intersectionComplement = UNIVERSE.filter(i => !intersection.includes(i));
  const complementsUnion = UNIVERSE.filter(i => complementA.includes(i) || complementB.includes(i));
  const formula = A.length + B.length - intersection.length;
  return Object.freeze({
    state, A, B, union, intersection, aMinusB, bMinusA, symmetric, complementA, complementB, regions, selected,
    subsetAB, subsetBA, equal, properSubsetAB: subsetAB.holds && !equal, properSubsetBA: subsetBA.holds && !equal,
    disjoint: intersection.length === 0,
    inclusionExclusion: { direct: union.length, formula, holds: union.length === formula },
    deMorgan: { unionComplement, complementsIntersection, firstHolds: same(unionComplement, complementsIntersection), intersectionComplement, complementsUnion, secondHolds: same(intersectionComplement, complementsUnion) },
  });
}

export { count as cardinality };
