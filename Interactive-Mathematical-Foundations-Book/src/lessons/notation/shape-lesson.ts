/**
 * Lesson views for the shape stage: a scalar, vector, matrix or tensor with chosen dimensions, one chosen entry named with 1-based indices
 * and again as NumPy would, its position in the flattened array, and the slices. Every number comes from `deriveShape`.
 *
 *   ShapeState → deriveShape → { diagram cells · inspector rows · formulas · Python · verdict · spoken text }
 */
import type { ParamSpec } from '../../platform/params';
import type { InspectorRowData } from '../../ui/Inspector';
import { DIM_MAX, DIM_MIN, deriveShape, stridesOf, tupleText, type ObjectKind, type ShapeDerived, type ShapeState } from '../../math/notation/shapes';
import { exactText, missingDescription, plural } from './view';

export type ShapeLessonState = ShapeState;
export const CANONICAL_SHAPE: ShapeLessonState = Object.freeze({ kind: 'matrix', n: 4, d: 3, B: 2, T: 3, i: 2, j: 3, k: 2 });

export const KIND_OPTIONS = Object.freeze([
  { id: 'scalar', label: 'scalar' },
  { id: 'vector', label: 'vector' },
  { id: 'matrix', label: 'matrix' },
  { id: 'tensor', label: 'tensor' },
] as const);

const dim = (id: string, name: string, symbol: string, def: number): ParamSpec => ({ id, name, symbolTex: symbol, symbolText: symbol, domain: { min: DIM_MIN, max: DIM_MAX }, default: def, step: 1, maxDecimals: 0, onInvalid: 'reject' });
export const DIM_PARAMS = Object.freeze({
  n: dim('n', 'number of examples (rows)', 'n', 4),
  d: dim('d', 'number of features (columns)', 'd', 3),
  B: dim('B', 'batch size', 'B', 2),
  T: dim('T', 'sequence length', 'T', 3),
});
/** An index may be typed as 0 on purpose: that is the NumPy habit, and the stage must say why it is not a mathematical index. */
const idx = (letter: 'i' | 'j' | 'k'): ParamSpec => ({ id: `index-${letter}`, name: `index ${letter}`, symbolTex: letter, symbolText: letter, domain: { min: 0, max: DIM_MAX }, default: 1, step: 1, maxDecimals: 0, onInvalid: 'reject' });
export const INDEX_PARAMS = Object.freeze({ i: idx('i'), j: idx('j'), k: idx('k') });

/** The dimension parameters that belong to each kind, in reading order. */
export const DIMS_OF: Readonly<Record<ObjectKind, readonly ('n' | 'd' | 'B' | 'T')[]>> = Object.freeze({ scalar: [], vector: ['d'], matrix: ['n', 'd'], tensor: ['B', 'T', 'd'] });

export interface ShapePreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: ShapeLessonState }
const P = (id: string, label: string, aria: string, s: Partial<ShapeLessonState>): ShapePreset => Object.freeze({ id, label, aria, state: Object.freeze({ ...CANONICAL_SHAPE, ...s }) });
export const SHAPE_PRESETS: readonly ShapePreset[] = Object.freeze([
  P('data-matrix', 'data matrix 4 × 3', 'a data matrix with four examples and three features, entry in row two, column three', {}),
  P('one-example', 'a vector', 'a vector with five entries, entry two', { kind: 'vector', d: 5, j: 2 }),
  P('batch', 'a batch 2 × 3 × 4', 'a tensor of two examples, three positions and four features, the last entry', { kind: 'tensor', B: 2, T: 3, d: 4, i: 2, j: 3, k: 4 }),
  P('wide', 'wide matrix 2 × 6', 'a matrix with two rows and six columns, the last entry of the second row', { n: 2, d: 6, i: 2, j: 6 }),
  P('beyond', 'index too large', 'a four by three matrix with row index five, which does not exist', { i: 5, j: 1 }),
  P('zero', 'index 0', 'a four by three matrix with row index zero, which is not a mathematical index', { i: 0, j: 1 }),
  P('scalar', 'a scalar', 'a single number with no indices', { kind: 'scalar' }),
]);
export const shapePresetMatches = (s: ShapeLessonState, p: ShapePreset): boolean => (Object.keys(CANONICAL_SHAPE) as (keyof ShapeLessonState)[]).every(key => Object.is(s[key], p.state[key]));

export interface ShapeLessonDerived {
  readonly state: ShapeLessonState;
  readonly d: ShapeDerived;
}

export function deriveShapeLesson(state: ShapeLessonState): ShapeLessonDerived {
  return Object.freeze({ state, d: deriveShape(state) });
}

// ---------------------------------------------------------------------------------------------- the diagram
export type CellMark = 'selected' | 'related' | 'plain';
export interface DiagramCell { readonly offset: number; readonly mark: CellMark }
export interface Slab {
  readonly key: string;
  /** Printed above the grid when there is more than one slab. */
  readonly title: string | null;
  readonly rows: number;
  readonly cols: number;
  readonly cells: readonly DiagramCell[];
}

/**
 * The picture of the object: a vector as ONE COLUMN (the convention of the book), a matrix as rows by columns, a tensor as B slabs of T × d.
 * Each cell shows its position in the flattened (row-major) array, counting from 0. An invalid selection marks nothing.
 */
export function diagramOf(derived: ShapeLessonDerived): readonly Slab[] {
  const { d, state: s } = derived;
  const sel = d.selection;
  const valid = sel?.valid === true;
  const mark = (hit: boolean, related: boolean): CellMark => (valid && hit ? 'selected' : valid && related ? 'related' : 'plain');
  switch (s.kind) {
    case 'scalar': return [{ key: 'scalar', title: null, rows: 1, cols: 1, cells: [{ offset: 0, mark: 'plain' }] }];
    case 'vector': return [{
      key: 'vector', title: null, rows: s.d, cols: 1,
      cells: Array.from({ length: s.d }, (_, r) => ({ offset: r, mark: mark(r + 1 === s.j, false) })),
    }];
    case 'matrix': return [{
      key: 'matrix', title: null, rows: s.n, cols: s.d,
      cells: Array.from({ length: s.n * s.d }, (_, p) => {
        const r = Math.floor(p / s.d) + 1;
        const c = (p % s.d) + 1;
        return { offset: p, mark: mark(r === s.i && c === s.j, r === s.i || c === s.j) };
      }),
    }];
    case 'tensor': return Array.from({ length: s.B }, (_, b) => ({
      key: `slab-${b + 1}`, title: `example ${b + 1}`, rows: s.T, cols: s.d,
      cells: Array.from({ length: s.T * s.d }, (_, p) => {
        const r = Math.floor(p / s.d) + 1;
        const c = (p % s.d) + 1;
        const inSlab = b + 1 === s.i;
        return { offset: b * s.T * s.d + p, mark: mark(inSlab && r === s.j && c === s.k, inSlab && (r === s.j || c === s.k)) };
      }),
    }));
  }
}

export function diagramDescription(derived: ShapeLessonDerived): string {
  const { d, state: s } = derived;
  const sel = d.selection;
  const cell = s.kind === 'vector' ? `entry ${s.j}` : s.kind === 'matrix' ? `row ${s.i}, column ${s.j}` : `example ${s.i}, position ${s.j}, feature ${s.k}`;
  const where = sel?.valid ? ` The highlighted cell is ${cell}, at flattened position ${sel.offset}.` : sel ? ' No cell is highlighted because an index is outside its axis.' : '';
  switch (s.kind) {
    case 'scalar': return 'A single number. It has no axes and no indices; its shape is the empty tuple.';
    case 'vector': return `A column of ${s.d} cells, drawn vertically because a vector is a column. Each cell shows its position in the array, counting from 0.${where}`;
    case 'matrix': return `A grid of ${plural(s.n, 'row')} (examples) and ${plural(s.d, 'column')} (features). Each cell shows its position in the flattened array, counting from 0 and reading row by row.${where}`;
    case 'tensor': return `${plural(s.B, 'grid')}, one for each example in the batch; each grid has ${plural(s.T, 'row')} (positions) and ${plural(s.d, 'column')} (features). Each cell shows its position in the flattened array, counting from 0.${where}`;
  }
}

// ---------------------------------------------------------------------------------------------- inspector
/** A fragment of code inside a formula: monospaced, with the spaces kept. */
const tt = (code: string): string => `\\texttt{${code.replace(/ /g, '\\ ')}}`;
const KIND_NAME:Readonly<Record<ObjectKind, string>> = Object.freeze({ scalar: 'a scalar', vector: 'a vector', matrix: 'a matrix', tensor: 'a tensor' });

export function shapeRows(derived: ShapeLessonDerived): InspectorRowData[] {
  const { d, state: s } = derived;
  const sel = d.selection;
  const rows: InspectorRowData[] = [
    { id: 'shape', role: 'primary', symbolTex: d.setTex, name: `the shape of ${KIND_NAME[s.kind]}, as NumPy's .shape`, description: exactText(d.shapeTuple, tt(d.shapeTuple),`the tuple ${d.shape.length === 0 ? 'with nothing in it' : d.shape.join(', ')}`) },
    { id: 'count', role: 'x', symbolTex: '\\#', name: d.shape.length > 1 ? `number of entries, ${d.shape.join(' · ')}` : 'number of entries', description: exactText(String(d.count), String(d.count)) },
  ];
  if (!sel) return rows;
  if (!sel.valid) {
    rows.push({ id: 'element', role: 'caution', symbolTex: d.elementSymbolTex ?? 'x', name: 'the chosen entry', description: missingDescription(sel.problems.join('. ')) });
    return rows;
  }
  rows.push(
    { id: 'element', role: 'y', symbolTex: d.elementSymbolTex!, name: 'the chosen entry, indices from 1', description: exactText(d.elementText!, d.elementTex!,`${d.kind} entry ${sel.values1.join(', ')}`) },
    { id: 'numpy', role: 'derived', symbolTex: '\\texttt{[\\ ]}', name: 'the same entry in NumPy, each index minus 1', description: exactText(d.numpy!, tt(d.numpy!),`index ${sel.values0.join(', ')}`) },
    { id: 'offset', role: 'derived', symbolTex: '\\text{pos}', name: 'its position in the flattened array', description: exactText(d.offsetWork!, d.offsetTex!, `position ${sel.offset}`) },
  );
  for (const sl of d.slices) {
    rows.push({ id: `slice-${sl.id}`, role: 'x', symbolTex: sl.tex, name: `${sl.id === 'row' ? 'the whole row' : sl.id === 'column' ? 'the whole column' : sl.id === 'example' ? 'the whole example' : 'one position'}, shape ${sl.shapeTuple}`, description: exactText(sl.numpy, tt(sl.numpy),`${sl.numpy}, shape ${sl.shapeTuple}`), secondary: true });
  }
  return rows;
}

// ---------------------------------------------------------------------------------------------- formulas, code, verdict
export interface ShapeFormula { readonly id: string; readonly label: string; readonly tex: string }
export function shapeFormulas(derived: ShapeLessonDerived): ShapeFormula[] {
  const { d } = derived;
  const out: ShapeFormula[] = [{ id: 'membership', label: 'Where the object lives, scrollable', tex: `${d.nameTex}\\in ${d.setNumbersTex}` }];
  if (d.selection?.valid && d.offsetTex) {
    out.push({ id: 'element', label: 'The chosen entry, scrollable', tex: `${d.elementTex}\\ \\text{is stored at position}\\ ${d.offsetTex}` });
  }
  return out;
}

/** The Python that builds the same object and reads the same entry, with the value of each entry equal to its position. */
export function shapeCode(derived: ShapeLessonDerived): string {
  const { d, state: s } = derived;
  const sel = d.selection;
  const lines = ['import numpy as np', ''];
  switch (s.kind) {
    case 'scalar': lines.push('x = np.float64(2.5)', `x.shape        # ${d.shapeTuple}: no axes`); break;
    case 'vector': lines.push(`x = np.arange(${d.count})`, `x.shape        # ${d.shapeTuple}`); break;
    case 'matrix': lines.push(`X = np.arange(${d.count}).reshape(${s.n}, ${s.d})`, `X.shape        # ${d.shapeTuple}`); break;
    case 'tensor': lines.push(`X = np.arange(${d.count}).reshape(${s.B}, ${s.T}, ${s.d})`, `X.shape        # ${d.shapeTuple}`); break;
  }
  if (sel?.valid && d.numpy) lines.push(`${d.numpy}${' '.repeat(Math.max(1, 15 - d.numpy.length))}# ${d.elementText} is ${sel.offset}`);
  else if (sel && !sel.valid) {
    const over = sel.values0.findIndex((v, m) => v >= d.shape[m]!);
    const under = sel.values0.findIndex(v => v < 0);
    const access = `${d.nameText}[${sel.values0.join(', ')}]`;
    lines.push(over >= 0
      ? `${access}   # IndexError: index ${sel.values0[over]} is out of bounds for axis ${over} with size ${d.shape[over]}`
      : `${access}   # does NOT fail: -1 counts from the end of axis ${under}`);
  }
  return lines.join('\n');
}

export function shapeVerdict(derived: ShapeLessonDerived): { text: string; caution: boolean } {
  const { d, state: s } = derived;
  const sel = d.selection;
  if (!sel) return { text: 'A scalar is a single number with no axes: nothing to index and nothing to slice. Its NumPy shape is the empty tuple ().', caution: false };
  if (!sel.valid) {
    const zero = sel.values1.some(v => v === 0);
    const raises = sel.values0.some((v, m) => v >= d.shape[m]!);
    const text = `${sel.problems.join('. ')}. The mathematical entry does not exist, so nothing is highlighted and nothing is clamped to the nearest index.${zero ? ' Mathematical indices start at 1; the index 0 belongs to NumPy.' : ''}${raises ? ' NumPy would raise an IndexError here.' : ' NumPy would not raise an error for the index -1 that results: it would silently return the LAST entry along that axis.'}`;
    return { text, caution: true };
  }
  let text = `${d.elementText} is ${d.numpy}: subtract 1 from every index, because mathematics counts from 1 and NumPy from 0. The entry sits at position ${sel.offset} when the array is read row by row (the last index changes fastest).`;
  if (s.kind === 'vector') text += ' In the notation x is a column; its NumPy shape (d,) is a flat array that is neither a row nor a column.';
  if (s.kind === 'matrix') text += ' A row is one example, a column is one feature.';
  if (s.kind === 'tensor') text += ' The three axes are the example in the batch, the position in the sequence and the feature.';
  return { text, caution: false };
}

export function shapeSpoken(derived: ShapeLessonDerived): string {
  const { d, state: s } = derived;
  const sel = d.selection;
  const head = s.kind === 'scalar' ? 'A scalar with the empty shape.' : `${KIND_NAME[s.kind][0]!.toUpperCase()}${KIND_NAME[s.kind].slice(1)} of shape ${d.shape.join(' by ')}, ${plural(d.count, 'entry', 'entries')}.`;
  if (!sel) return head;
  if (!sel.valid) return `${head} ${sel.problems.join('. ')}.`;
  return `${head} The entry with indices ${sel.values1.join(', ')} is NumPy index ${sel.values0.join(', ')}, at flattened position ${sel.offset}.`;
}

/** The order in which a reader would see the strides: used only for the axis legend below the diagram. */
export function axisLegend(derived: ShapeLessonDerived): { symbol: string; size: number; index: string; role: string; stride: number }[] {
  const { d } = derived;
  const strides = stridesOf(d.shape);
  return d.axes.map((a, m) => ({ symbol: a.symbol, size: a.size, index: a.index, role: a.role, stride: strides[m]! }));
}

export { tupleText };
