/**
 * Relations as subsets of a product (chapter I.7).
 *
 * A relation R ⊆ A × B, with A = {1, …, n} and B = {1, …, k} (n, k ∈ 1…6), is stored as a string of '0'/'1' characters of length n·k:
 * the character at index (b − 1)·n + (a − 1) says whether (a, b) ∈ R. A string keeps the lesson state flat and comparable.
 *
 * Properties are defined for a relation ON ONE SET, R ⊆ A × A, so they are reported only when k = n; otherwise they carry a reason.
 * Every property comes with a witness when it fails (the element, pair or triple that breaks it), and an equivalence relation comes with
 * its equivalence classes. "Is R a function A → B?" asks that every a ∈ A be related to exactly one b ∈ B, and names the first failing a.
 *
 * Presets use plain integer comparisons on positive integers only: "divides" is a ∣ b ⇔ b is a multiple of a (a ≥ 1, so there is no
 * 0 convention to fix), and "same parity" is (a − b) mod 2 = 0.
 */
import type { Pair } from './product';

export const RELATION_MAX = 6;
export type PresetId = 'less' | 'at-most' | 'equal' | 'divides' | 'same-parity' | 'empty' | 'all';

export interface RelationState {
  /** |A|: A = {1, …, n}. */
  readonly n: number;
  /** |B|: B = {1, …, k}. */
  readonly k: number;
  readonly cells: string;
}

export const cellIndex = (n: number, a: number, b: number): number => (b - 1) * n + (a - 1);

export const PRESET_TESTS: Readonly<Record<PresetId, (a: number, b: number) => boolean>> = Object.freeze({
  less: (a, b) => a < b,
  'at-most': (a, b) => a <= b,
  equal: (a, b) => a === b,
  divides: (a, b) => b % a === 0,
  'same-parity': (a, b) => (a - b) % 2 === 0,
  empty: () => false,
  all: () => true,
});

export function presetCells(id: PresetId, n: number, k: number): string {
  let out = '';
  for (let b = 1; b <= k; b++) for (let a = 1; a <= n; a++) out += PRESET_TESTS[id](a, b) ? '1' : '0';
  return out;
}
export const presetState = (id: PresetId, n: number, k: number): RelationState => Object.freeze({ n, k, cells: presetCells(id, n, k) });
export const CANONICAL_RELATION: RelationState = presetState('less', 4, 4);

/** Resize a relation to new sizes: pairs that survive keep their state; new pairs are not related. */
export function resize(state: RelationState, n: number, k: number): RelationState {
  let cells = '';
  for (let b = 1; b <= k; b++) for (let a = 1; a <= n; a++) cells += a <= state.n && b <= state.k && state.cells[cellIndex(state.n, a, b)] === '1' ? '1' : '0';
  return Object.freeze({ n, k, cells });
}
export function toggleCell(state: RelationState, a: number, b: number): RelationState {
  const i = cellIndex(state.n, a, b);
  return Object.freeze({ ...state, cells: `${state.cells.slice(0, i)}${state.cells[i] === '1' ? '0' : '1'}${state.cells.slice(i + 1)}` });
}

export function checkRelation(state: RelationState): void {
  const ok = (v: number) => Number.isInteger(v) && v >= 1 && v <= RELATION_MAX;
  if (!ok(state.n) || !ok(state.k)) throw new RangeError('The sizes of A and B must be whole numbers from 1 to 6');
  if (state.cells.length !== state.n * state.k || /[^01]/.test(state.cells)) throw new RangeError('The relation must have one 0 or 1 for each pair in A × B');
}

export type Property<W> = { readonly holds: true; readonly witness: null } | { readonly holds: false; readonly witness: W };
export interface FunctionFact {
  readonly isFunction: boolean;
  /** The first a with no related b (`none`) or with several (`many`), when it fails. */
  readonly failure: { readonly a: number; readonly kind: 'none' | 'many'; readonly images: readonly number[] } | null;
  /** For each a ∈ A, the elements of B it is related to. */
  readonly images: readonly (readonly number[])[];
}

export interface RelationDerived {
  readonly state: RelationState;
  readonly pairs: readonly Pair[];
  readonly size: number;
  readonly total: number;
  readonly onOneSet: boolean;
  readonly reflexive: Property<number> | null;
  readonly symmetric: Property<Pair> | null;
  readonly antisymmetric: Property<Pair> | null;
  readonly transitive: Property<readonly [number, number, number]> | null;
  readonly equivalence: boolean | null;
  /** The equivalence classes, each listed in increasing order and ordered by smallest element (only for an equivalence relation). */
  readonly classes: readonly (readonly number[])[] | null;
  readonly function: FunctionFact;
  /** The preset whose pairs are exactly R, if any. */
  readonly preset: PresetId | null;
}

const PRESET_ORDER: readonly PresetId[] = ['less', 'at-most', 'equal', 'divides', 'same-parity', 'empty', 'all'];

export function deriveRelation(state: RelationState): RelationDerived {
  checkRelation(state);
  const { n, k } = state;
  const related = (a: number, b: number): boolean => state.cells[cellIndex(n, a, b)] === '1';
  const pairs: Pair[] = [];
  for (let b = 1; b <= k; b++) for (let a = 1; a <= n; a++) if (related(a, b)) pairs.push([a, b]);
  const A = Array.from({ length: n }, (_, i) => i + 1);
  const onOneSet = n === k;

  const images = A.map(a => Array.from({ length: k }, (_, i) => i + 1).filter(b => related(a, b)));
  const bad = A.find(a => images[a - 1]!.length !== 1);
  const fn: FunctionFact = {
    isFunction: bad === undefined,
    failure: bad === undefined ? null : { a: bad, kind: images[bad - 1]!.length === 0 ? 'none' : 'many', images: images[bad - 1]! },
    images,
  };

  let reflexive: Property<number> | null = null;
  let symmetric: Property<Pair> | null = null;
  let antisymmetric: Property<Pair> | null = null;
  let transitive: Property<readonly [number, number, number]> | null = null;
  let equivalence: boolean | null = null;
  let classes: (readonly number[])[] | null = null;
  if (onOneSet) {
    const missing = A.find(a => !related(a, a));
    reflexive = missing === undefined ? { holds: true, witness: null } : { holds: false, witness: missing };
    const asym = pairs.find(([a, b]) => !related(b, a));
    symmetric = asym === undefined ? { holds: true, witness: null } : { holds: false, witness: asym };
    const anti = pairs.find(([a, b]) => a !== b && related(b, a));
    antisymmetric = anti === undefined ? { holds: true, witness: null } : { holds: false, witness: anti };
    let broken: readonly [number, number, number] | undefined;
    for (const [a, b] of pairs) {
      for (let c = 1; c <= n && broken === undefined; c++) if (related(b, c) && !related(a, c)) broken = [a, b, c];
      if (broken) break;
    }
    transitive = broken === undefined ? { holds: true, witness: null } : { holds: false, witness: broken };
    equivalence = reflexive.holds && symmetric.holds && transitive.holds;
    if (equivalence) {
      const seen = new Set<number>();
      classes = [];
      for (const a of A) {
        if (seen.has(a)) continue;
        const cls = A.filter(b => related(a, b));
        cls.forEach(b => seen.add(b));
        classes.push(cls);
      }
    }
  }
  const preset = PRESET_ORDER.find(id => presetCells(id, n, k) === state.cells) ?? null;
  return Object.freeze({
    state, pairs, size: pairs.length, total: n * k, onOneSet, reflexive, symmetric, antisymmetric, transitive, equivalence, classes, function: fn, preset,
  });
}
