/**
 * Nested sums over a grid of entries a_ij (i = row, j = column, both 1-based):
 *   rectangular   Σ_{i=1}^{n} Σ_{j=1}^{k} a_ij          (the inner bound does not depend on i)
 *   triangular    Σ_{i=1}^{n} Σ_{j=1}^{i}  a_ij          (the inner bound IS the outer index: the cells with j ≤ i)
 *
 * The same cells can be added in two orders. For the rectangular sum "columns first" is Σ_{j=1}^{k} Σ_{i=1}^{n}; for the triangular sum
 * the swapped bounds are Σ_{j=1}^{n} Σ_{i=j}^{n}. Both loops visit the SAME set of cells, so the totals are equal; the model computes the
 * two totals by two separate loops and checks it (it does not assume it).
 *
 * TRACE: frame 0 is acc = 0 before the loops; frame c ≥ 1 is the state after adding the c-th cell in the chosen order.
 */
import { ZERO, add, equals, form, mul, q, type Q } from './rational';

export type NestedKind = 'rectangular' | 'triangular';
export type NestedOrder = 'rows-first' | 'columns-first';
export type NestedRule = 'product' | 'sum' | 'table';

export const NESTED_MAX = 5;

/** The fixed 5 × 5 table of "data" entries (several negative, one zero row-pattern) used by the `table` rule. */
export const TABLE: readonly (readonly number[])[] = Object.freeze([
  Object.freeze([2, -1, 0, 3, 1]),
  Object.freeze([1, 4, -2, 1, 0]),
  Object.freeze([0, 5, 1, -3, 2]),
  Object.freeze([3, 2, 2, 1, -1]),
  Object.freeze([-2, 0, 4, 1, 1]),
]);

export interface NestedInput {
  readonly kind: NestedKind;
  /** Rows (and, for the triangular sum, also columns). 1 … 5. */
  readonly n: number;
  /** Columns of a rectangular sum. 1 … 5 (ignored, equal to n, for the triangular sum). */
  readonly k: number;
  readonly rule: NestedRule;
  readonly order: NestedOrder;
}

export type Check = { readonly ok: true } | { readonly ok: false; readonly reason: string };

export function checkNested(input: NestedInput): Check {
  const ok = (v: number): boolean => Number.isInteger(v) && v >= 1 && v <= NESTED_MAX;
  if (!ok(input.n) || !ok(input.k)) return { ok: false, reason: `The numbers of rows and columns are whole numbers from 1 to ${NESTED_MAX}.` };
  return { ok: true };
}

export function entry(rule: NestedRule, i: number, j: number): Q {
  switch (rule) {
    case 'product': return q(i * j);
    case 'sum': return q(i + j);
    case 'table': return q(TABLE[i - 1]![j - 1]!);
  }
}

export interface Cell {
  readonly i: number;
  readonly j: number;
}

/** The columns a row i covers. */
export const columnsOf = (kind: NestedKind, i: number, k: number): number => (kind === 'triangular' ? i : k);

/** The cells in the order the loops visit them. */
export function cellsInOrder(kind: NestedKind, n: number, k: number, order: NestedOrder): Cell[] {
  const out: Cell[] = [];
  if (order === 'rows-first') {
    for (let i = 1; i <= n; i++) for (let j = 1; j <= columnsOf(kind, i, k); j++) out.push({ i, j });
  } else if (kind === 'rectangular') {
    for (let j = 1; j <= k; j++) for (let i = 1; i <= n; i++) out.push({ i, j });
  } else {
    for (let j = 1; j <= n; j++) for (let i = j; i <= n; i++) out.push({ i, j }); // swapped bounds: Σ_{j=1}^{n} Σ_{i=j}^{n}
  }
  return out;
}

export interface NestedFrame {
  readonly c: number;
  readonly i: number | null;
  readonly j: number | null;
  readonly term: Q | null;
  readonly before: Q;
  readonly after: Q;
}

export interface NestedDerived {
  readonly input: NestedInput;
  /** Columns actually used (k for rectangular, n for triangular). */
  readonly cols: number;
  readonly entries: readonly (readonly Q[])[];
  /** Is cell (i, j) part of the sum? */
  readonly inSum: (i: number, j: number) => boolean;
  readonly cellCount: number;
  readonly frames: readonly NestedFrame[];
  readonly total: Q;
  /** The total added in the OTHER order, by its own loops. */
  readonly otherTotal: Q;
  readonly sameCells: boolean;
  readonly sameTotal: boolean;
  /** Row sums (the inner sums of the rows-first loop), indexed by i − 1. */
  readonly rowSums: readonly Q[];
  /** Column sums, indexed by j − 1. */
  readonly colSums: readonly Q[];
  /**
   * The classic slip for a triangular sum: swap the loops but keep the old bounds (j from 1 to n, then i from 1 to j). That visits the OTHER
   * triangle (the cells with i ≤ j), not the cells of the sum. `null` for a rectangular sum, where swapping is harmless.
   */
  readonly swapMistake: { readonly cells: number; readonly total: Q; readonly differs: boolean } | null;
  /** The closed form where one exists (rectangular product and sum), and whether it matches. */
  readonly closed: { readonly tex: string; readonly value: Q; readonly holds: boolean } | null;
}

const sumCells = (cells: readonly Cell[], rule: NestedRule): Q => cells.reduce((acc, c) => add(acc, entry(rule, c.i, c.j)), ZERO);
const key = (c: Cell): string => `${c.i},${c.j}`;

export function deriveNested(input: NestedInput): NestedDerived {
  const check = checkNested(input);
  if (!check.ok) throw new RangeError(check.reason);
  const { kind, n, rule, order } = input;
  const cols = kind === 'triangular' ? n : input.k;
  const own = cellsInOrder(kind, n, cols, order);
  const other = cellsInOrder(kind, n, cols, order === 'rows-first' ? 'columns-first' : 'rows-first');
  const entries = Array.from({ length: n }, (_, a) => Array.from({ length: cols }, (_, b) => entry(rule, a + 1, b + 1)));
  const inSum = (i: number, j: number): boolean => i >= 1 && i <= n && j >= 1 && j <= columnsOf(kind, i, cols);

  const frames: NestedFrame[] = [{ c: 0, i: null, j: null, term: null, before: ZERO, after: ZERO }];
  let acc = ZERO;
  for (const cell of own) {
    const t = entry(rule, cell.i, cell.j);
    const before = acc;
    acc = add(acc, t);
    frames.push({ c: frames.length, i: cell.i, j: cell.j, term: t, before, after: acc });
  }
  const total = acc;
  const otherTotal = sumCells(other, rule);
  const sameCells = own.length === other.length && new Set(own.map(key)).size === own.length && own.every(c => new Set(other.map(key)).has(key(c)));

  const rowSums = Array.from({ length: n }, (_, a) => sumCells(cellsInOrder(kind, n, cols, 'rows-first').filter(c => c.i === a + 1), rule));
  const colSums = Array.from({ length: cols }, (_, b) => sumCells(cellsInOrder(kind, n, cols, 'rows-first').filter(c => c.j === b + 1), rule));

  let swapMistake: NestedDerived['swapMistake'] = null;
  if (kind === 'triangular') {
    const upper: Cell[] = [];
    for (let j = 1; j <= n; j++) for (let i = 1; i <= j; i++) upper.push({ i, j });
    const wrong = sumCells(upper, rule);
    swapMistake = { cells: upper.length, total: wrong, differs: !equals(wrong, total) };
  }
  let closed: NestedDerived['closed'] = null;
  if (kind === 'rectangular' && rule === 'product') {
    const value = mul(q(n * (n + 1), 2), q(cols * (cols + 1), 2));
    closed = { tex: `\\left(\\sum_{i=1}^{${n}}i\\right)\\left(\\sum_{j=1}^{${cols}}j\\right)=${n * (n + 1) / 2}\\cdot${cols * (cols + 1) / 2}=${form(value).tex}`, value, holds: equals(value, total) };
  } else if (kind === 'rectangular' && rule === 'sum') {
    const value = add(mul(q(cols), q(n * (n + 1), 2)), mul(q(n), q(cols * (cols + 1), 2)));
    closed = { tex: `${cols}\\sum_{i=1}^{${n}}i+${n}\\sum_{j=1}^{${cols}}j=${cols}\\cdot${n * (n + 1) / 2}+${n}\\cdot${cols * (cols + 1) / 2}=${form(value).tex}`, value, holds: equals(value, total) };
  }
  return { input, cols, entries, inSum, cellCount: own.length, frames, total, otherTotal, sameCells, sameTotal: equals(total, otherTotal), rowSums, colSums, swapMistake, closed };
}
