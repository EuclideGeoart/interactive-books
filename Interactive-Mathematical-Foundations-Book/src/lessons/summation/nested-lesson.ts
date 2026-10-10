/**
 * Lesson views for the nested-sum stage: a grid of entries a_ij added by two loops, rectangular (Σ_{i=1}^{n} Σ_{j=1}^{k}) or triangular
 * (Σ_{i=1}^{n} Σ_{j=1}^{i}), in either order. The model adds the cells in both orders by separate loops and checks that the totals agree.
 *
 *   NestedLessonState → deriveNestedLesson → { grid cell states · trace over cells · inspector · formulas · Python · verdict }
 */
import type { ParamSpec } from '../../platform/params';
import { traceFrom, type TraceFrame } from '../../platform/trace';
import type { InspectorRowData } from '../../ui/Inspector';
import { form, q } from '../../math/summation/rational';
import { NESTED_MAX, deriveNested, type NestedDerived, type NestedKind, type NestedOrder, type NestedRule } from '../../math/summation/nested';
import { plural, qDescription, termText, termTex } from './view';

export interface NestedLessonState { readonly kind: NestedKind; readonly rule: NestedRule; readonly order: NestedOrder; readonly n: number; readonly k: number }
export const CANONICAL_NESTED: NestedLessonState = Object.freeze({ kind: 'rectangular', rule: 'product', order: 'rows-first', n: 3, k: 4 });

const size = (id: string, name: string, symbol: string, def: number): ParamSpec => ({ id, name, symbolTex: symbol, symbolText: symbol, domain: { min: 1, max: NESTED_MAX }, default: def, step: 1, maxDecimals: 0, onInvalid: 'reject' });
export const ROWS_PARAM = size('rows', 'number of rows', 'n', 3);
export const COLS_PARAM = size('cols', 'number of columns', 'k', 4);

export const KIND_OPTIONS = Object.freeze([{ id: 'rectangular', label: 'rectangle' }, { id: 'triangular', label: 'triangle' }] as const);
export const ORDER_OPTIONS = Object.freeze([{ id: 'rows-first', label: 'row by row' }, { id: 'columns-first', label: 'column by column' }] as const);
export const RULE_OPTIONS = Object.freeze([{ id: 'product', label: 'i · j' }, { id: 'sum', label: 'i + j' }, { id: 'table', label: 'data table' }] as const);

export interface NestedPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: NestedLessonState }
const P = (id: string, label: string, aria: string, s: Partial<NestedLessonState>): NestedPreset => Object.freeze({ id, label, aria, state: Object.freeze({ ...CANONICAL_NESTED, ...s }) });
export const NESTED_PRESETS: readonly NestedPreset[] = Object.freeze([
  P('rectangle', '3 × 4, i · j', 'a three by four grid with entries i times j', {}),
  P('factor', '3 × 3, i + j', 'a three by three grid with entries i plus j', { rule: 'sum', k: 3 }),
  P('triangle', 'triangle, n = 4', 'the triangle of cells with j at most i, four rows, entries i times j', { kind: 'triangular', n: 4, k: 4 }),
  P('triangle-table', 'triangle, data', 'a triangle of data-table entries added column by column', { kind: 'triangular', rule: 'table', order: 'columns-first', n: 3, k: 3 }),
  P('table', 'full data table', 'the whole five by five data table', { rule: 'table', n: 5, k: 5 }),
  P('one-row', 'one row', 'a single row of five cells', { n: 1, k: 5 }),
]);
export const nestedPresetMatches = (s: NestedLessonState, p: NestedPreset): boolean => (Object.keys(CANONICAL_NESTED) as (keyof NestedLessonState)[]).every(key => Object.is(s[key], p.state[key]));

export interface NestedFrameView {
  readonly c: number;
  readonly i: number | null;
  readonly j: number | null;
  readonly beforeText: string;
  readonly afterText: string;
  readonly tex: string;
  readonly caption: string;
}

export interface NestedLessonDerived {
  readonly state: NestedLessonState;
  readonly d: NestedDerived;
  readonly frames: readonly TraceFrame<NestedFrameView>[];
  /** Frame index (1-based) at which each cell is added, keyed "i,j". */
  readonly visitedAt: ReadonlyMap<string, number>;
}

export function deriveNestedLesson(state: NestedLessonState): NestedLessonDerived {
  const d = deriveNested(state);
  const views: NestedFrameView[] = d.frames.map(f => {
    const before = form(f.before);
    const after = form(f.after);
    if (f.term === null || f.i === null || f.j === null) {
      return { c: 0, i: null, j: null, beforeText: before.text, afterText: after.text, tex: '\\mathrm{acc}=0', caption: 'Before the loops: acc = 0.' };
    }
    return {
      c: f.c, i: f.i, j: f.j, beforeText: before.text, afterText: after.text,
      tex: `\\mathrm{acc}=${before.tex}+${termTex(f.term)}=${after.tex}`,
      caption: `Cell ${f.c} of ${d.cellCount}: row ${f.i}, column ${f.j}, a_${f.i}${f.j} = ${form(f.term).text}, so acc = ${before.text} + ${termText(f.term)} = ${after.text}.`,
    };
  });
  const visitedAt = new Map<string, number>();
  d.frames.forEach(f => { if (f.i !== null && f.j !== null) visitedAt.set(`${f.i},${f.j}`, f.c); });
  return Object.freeze({ state, d, frames: traceFrom<NestedFrameView>(views.map(v => ({ state: v }))), visitedAt });
}

export type CellState = 'outside' | 'todo' | 'done' | 'current';
export function cellState(derived: NestedLessonDerived, cursorIndex: number, i: number, j: number): CellState {
  if (!derived.d.inSum(i, j)) return 'outside';
  const at = derived.visitedAt.get(`${i},${j}`)!;
  return at < cursorIndex ? 'done' : at === cursorIndex ? 'current' : 'todo';
}

// ---------------------------------------------------------------------------------------------- text
const ENTRY_SPOKEN: Readonly<Record<NestedRule, string>> = Object.freeze({ product: 'Each entry is i times j', sum: 'Each entry is i plus j', table: 'The entries are the numbers of the data table' });

/** The two loops as a double sum for the chosen shape and order. */
export function doubleSumTex(kind: NestedKind, order: NestedOrder, n: number, cols: number): string {
  if (kind === 'rectangular') return order === 'rows-first' ? `\\sum_{i=1}^{${n}}\\sum_{j=1}^{${cols}}a_{ij}` : `\\sum_{j=1}^{${cols}}\\sum_{i=1}^{${n}}a_{ij}`;
  return order === 'rows-first' ? `\\sum_{i=1}^{${n}}\\sum_{j=1}^{i}a_{ij}` : `\\sum_{j=1}^{${n}}\\sum_{i=j}^{${n}}a_{ij}`;
}

export interface NestedFormula { readonly id: string; readonly label: string; readonly tex: string }
export function nestedFormulas(derived: NestedLessonDerived): NestedFormula[] {
  const { state: s, d } = derived;
  const other: NestedOrder = s.order === 'rows-first' ? 'columns-first' : 'rows-first';
  const total = form(d.total).tex;
  const out: NestedFormula[] = [
    { id: 'chosen', label: 'The double sum in the chosen order, scrollable', tex: `${doubleSumTex(s.kind, s.order, s.n, d.cols)}=${total}` },
    { id: 'other', label: 'The same cells in the other order, scrollable', tex: `${doubleSumTex(s.kind, other, s.n, d.cols)}=${form(d.otherTotal).tex}` },
  ];
  if (d.closed) out.push({ id: 'closed', label: 'The closed form, scrollable', tex: d.closed.tex });
  return out;
}

export function nestedCode(s: NestedLessonState, cols: number): string {
  const expr = { product: 'i * j', sum: 'i + j', table: 'table[i - 1][j - 1]' }[s.rule];
  const lines = ['acc = 0'];
  if (s.order === 'rows-first') {
    lines.push(`for i in range(1, ${s.n} + 1):`, s.kind === 'rectangular' ? `    for j in range(1, ${cols} + 1):` : '    for j in range(1, i + 1):');
  } else {
    lines.push(`for j in range(1, ${cols} + 1):`, s.kind === 'rectangular' ? `    for i in range(1, ${s.n} + 1):` : `    for i in range(j, ${s.n} + 1):`);
  }
  lines.push(`        acc += ${expr}`);
  return lines.join('\n');
}

export function nestedRows(derived: NestedLessonDerived): InspectorRowData[] {
  const { d } = derived;
  return [
    { id: 'cells', role: 'x', symbolTex: '\\#', name: derived.state.kind === 'triangular' ? 'cells in the sum, n(n+1)/2' : 'cells in the sum, n·k', description: qDescription(q(d.cellCount)) },
    { id: 'total', role: 'primary', symbolTex: '\\textstyle\\sum\\sum', name: 'the double sum, in the chosen order', description: qDescription(d.total) },
    { id: 'other', role: 'y', symbolTex: '\\textstyle\\sum\\sum', name: 'the double sum, in the other order', description: qDescription(d.otherTotal), secondary: true },
  ];
}

export function nestedVerdict(derived: NestedLessonDerived): { text: string; caution: boolean } {
  const { d, state: s } = derived;
  const cells = plural(d.cellCount, 'cell');
  let text = d.sameCells && d.sameTotal
    ? `Row by row and column by column visit the same ${cells}, so both orders give ${form(d.total).text}. Adding finitely many numbers in a different order does not change the total.`
    : `The two orders disagree (${form(d.total).text} against ${form(d.otherTotal).text}).`;
  if (s.kind === 'triangular' && d.swapMistake) {
    const m = d.swapMistake;
    text += m.differs
      ? ` Swapping the loops must swap the bounds: keeping j from 1 to i for the inner loop would visit the OTHER triangle (${plural(m.cells, 'cell')}) and return ${form(m.total).text}, a different number.`
      : ` Swapping the loops must swap the bounds: keeping the old bounds would visit the other triangle, and here it happens to return the same ${form(m.total).text} only because these entries are symmetric (a_ij = a_ji). Try the data table.`;
  }
  return { text, caution: !(d.sameCells && d.sameTotal) };
}

export function nestedSpoken(derived: NestedLessonDerived): string {
  const { d, state: s } = derived;
  return `A ${s.kind === 'rectangular' ? `${s.n} by ${d.cols} grid` : `triangle of ${s.n} rows`} with ${plural(d.cellCount, 'cell')}, added ${s.order === 'rows-first' ? 'row by row' : 'column by column'}: the total is ${form(d.total).spoken}.`;
}

export function nestedGridDescription(derived: NestedLessonDerived): string {
  const { d, state: s } = derived;
  return `A grid of ${s.n} ${s.n === 1 ? 'row' : 'rows'} and ${d.cols} ${d.cols === 1 ? 'column' : 'columns'}${s.kind === 'triangular' ? ', of which only the cells on or below the diagonal belong to the sum' : ''}. ${ENTRY_SPOKEN[s.rule]}. Row totals are shown at the right and column totals underneath.`;
}
