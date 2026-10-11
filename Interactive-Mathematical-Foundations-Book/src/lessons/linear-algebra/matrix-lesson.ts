import {
  affine2, column, determinant2, exactVector, matrix, multiplyMatrices, multiplyVector, orthogonal2,
  shape, solveSystem2, transpose, type ExactVector, type Matrix,
} from '../../math/linear-algebra/matrices';
import { deriveDot, dot, length, point, times, type Vector } from '../../math/linear-algebra/vectors';
import { rationalForm, rootForm } from '../../math/quantity/exactform';
import { abs, add, div, isZero, mul, rational, sub, toNumber, type Rational } from '../../math/quantity/rational';
import type { RootResult } from '../../math/quantity/root';
import type { Point, WorldWindow } from '../../platform/geometry/viewport';
import { formatApprox } from '../../platform/numeric/format';
import { describeValue, type ValueDescription } from '../../platform/numeric/quantity';
import type { ParamSpec } from '../../platform/params';
import { traceFrom } from '../../platform/trace';
import type { InspectorRowData } from '../../ui/Inspector';
import type { Role } from '../../ui/plane/primitives';
import { aligned, FORMAT, FORMULA_FORMAT } from '../shared/format';

export type MatrixChapter = 'transform' | 'matvec' | 'composition' | 'orthogonality' | 'determinant' | 'systems';
export type MatrixMode = 'square' | 'wide' | 'tall' | 'invalid' | 'affine';
export interface MatrixState {
  readonly mode: MatrixMode;
  readonly a11: number; readonly a12: number; readonly a13: number;
  readonly a21: number; readonly a22: number; readonly a23: number;
  readonly a31: number; readonly a32: number;
  readonly b11: number; readonly b12: number; readonly b13: number;
  readonly b21: number; readonly b22: number; readonly b23: number;
  readonly x1: number; readonly x2: number; readonly x3: number;
  readonly y1: number; readonly y2: number;
  readonly t1: number; readonly t2: number; readonly c1: number; readonly c2: number;
  readonly r1: number; readonly r2: number;
}
export type MatrixField = Exclude<keyof MatrixState, 'mode'>;

const BASE: MatrixState = {
  mode: 'square', a11: 1, a12: 1, a13: 3, a21: 0, a22: 1, a23: 2, a31: -1, a32: 3,
  b11: 1, b12: 0, b13: 0, b21: 1, b22: 1, b23: 1,
  x1: 2, x2: 1, x3: -1, y1: -1, y2: 2,
  t1: 0, t2: 0, c1: 0, c2: 0, r1: 3, r2: 1,
};
export const MATRIX_CANONICAL: Record<MatrixChapter, MatrixState> = {
  transform: BASE,
  matvec: { ...BASE, a11: 2, a12: -1, a21: 1, a22: 3, x1: 4, x2: 2 },
  composition: BASE,
  orthogonality: { ...BASE, a11: 0, a12: -1, a21: 1, a22: 0 },
  determinant: { ...BASE, a11: 2, a12: 1, a21: 0, a22: 1 },
  systems: { ...BASE, a11: 1, a12: 1, a21: 1, a22: -1, r1: 3, r2: 1 },
};
export const MATRIX_TITLES: Record<MatrixChapter, string> = {
  transform: 'Drag the matrix columns; reshape the coordinate paper',
  matvec: 'One product, read by rows and by columns',
  composition: 'Apply A, then B; keep the middle state visible',
  orthogonality: 'Transpose the frame; test what it preserves',
  determinant: 'Watch a unit square become signed area',
  systems: 'Move two exact constraints between one, none, and many solutions',
};

const squareFields = ['a11', 'a21', 'a12', 'a22'] as const;
export function matrixFields(chapter: MatrixChapter, state: MatrixState): readonly MatrixField[] {
  if (chapter === 'transform') return [...squareFields, 'x1', 'x2', 't1', 't2'];
  if (chapter === 'matvec') {
    if (state.mode === 'wide') return ['a11', 'a12', 'a13', 'a21', 'a22', 'a23', 'x1', 'x2', 'x3'];
    if (state.mode === 'tall') return ['a11', 'a12', 'a21', 'a22', 'a31', 'a32', 'x1', 'x2'];
    if (state.mode === 'invalid') return ['a11', 'a12', 'a21', 'a22', 'a31', 'a32', 'x1', 'x2', 'x3'];
    return [...squareFields, 'x1', 'x2'];
  }
  if (chapter === 'composition') {
    const base = ['a11', 'a12', 'a21', 'a22', 'b11', 'b12', 'b21', 'b22', 'x1', 'x2'] as MatrixField[];
    return state.mode === 'affine' ? [...base, 't1', 't2', 'c1', 'c2'] : base;
  }
  if (chapter === 'orthogonality' || chapter === 'determinant') return squareFields;
  return ['a11', 'a12', 'r1', 'a21', 'a22', 'r2'];
}

const fieldName = (field: MatrixField): string => {
  if (/^[ab]\d\d$/.test(field)) return `entry ${field[0]!.toUpperCase()} row ${field[1]}, column ${field[2]}`;
  if (/^[xy]\d$/.test(field)) return `${field[0]} entry ${field[1]}`;
  if (/^[tc]\d$/.test(field)) return `${field[0] === 't' ? 'first translation b' : 'second translation c'} entry ${field[1]}`;
  return `right-hand side ${field[1]}`;
};
const symbol = (field: MatrixField): string => {
  const m = /^([ab])([123])([123])$/.exec(field);
  if (m) return `${m[1]!.toUpperCase()}_{${m[2]}${m[3]}}`;
  const pair = /^([xytcr])(\d)$/.exec(field)!;
  return `${pair[1] === 't' ? 'b' : pair[1]}_${pair[2]}`;
};
export function matrixSpecs(chapter: MatrixChapter): Record<MatrixField, ParamSpec> {
  const canonical = MATRIX_CANONICAL[chapter];
  const entries = (Object.keys(BASE).filter(key => key !== 'mode') as MatrixField[]).map(field => [field, {
    id: field, name: fieldName(field), symbolTex: symbol(field), symbolText: field,
    domain: { min: -4, max: 4 }, default: canonical[field], step: 0.5, maxDecimals: 2, onInvalid: 'reject',
  } satisfies ParamSpec]);
  return Object.fromEntries(entries) as Record<MatrixField, ParamSpec>;
}

const patch = (state: MatrixState, values: Partial<MatrixState>): MatrixState => ({ ...state, ...values });
export function matrixPresets(chapter: MatrixChapter): { id: string; label: string; state: MatrixState }[] {
  const s = MATRIX_CANONICAL[chapter], preset = (id: string, label: string, values: Partial<MatrixState>) => ({ id, label, state: patch(s, values) });
  if (chapter === 'transform') return [
    preset('shear', 'Shear', {}), preset('rotation', 'Quarter-turn', { a11: 0, a12: -1, a21: 1, a22: 0 }),
    preset('reflection', 'Reflection', { a11: -1, a12: 0, a21: 0, a22: 1 }),
    preset('scaling', 'Unequal scaling', { a11: 2, a12: 0, a21: 0, a22: 0.5 }),
    preset('collapse', 'Singular collapse', { a11: 1, a12: 2, a21: 0.5, a22: 1 }),
    preset('affine', 'Affine shift', { mode: 'affine', t1: 2, t2: -1 }),
  ];
  if (chapter === 'matvec') return [
    preset('square', '2×2 geometry', {}),
    preset('wide', '2×3 · 3×1', { mode: 'wide', a11: 1, a12: 2, a13: 3, a21: 0, a22: -1, a23: 2, x1: 2, x2: 1, x3: -1 }),
    preset('tall', '3×2 · 2×1', { mode: 'tall', a11: 1, a12: 0, a21: 2, a22: 1, a31: -1, a32: 3, x1: 2, x2: -1 }),
    preset('invalid', 'Reject 3×2 · 3×1', { mode: 'invalid', a11: 1, a12: 0, a21: 2, a22: 1, a31: -1, a32: 3, x1: 2, x2: -1, x3: 1 }),
  ];
  if (chapter === 'composition') return [
    preset('canonical', 'A then B', {}),
    preset('reverse', 'Swap order', { a11: 1, a12: 0, a21: 1, a22: 1, b11: 1, b12: 1, b21: 0, b22: 1 }),
    preset('affine', 'Affine bridge', { mode: 'affine', t1: 1, t2: -1, c1: 0, c2: 2 }),
    preset('rectangular', '2→3→2', { mode: 'tall', a11: 1, a12: 0, a21: 2, a22: 1, a31: -1, a32: 3, b11: 1, b12: 2, b13: 0, b21: 0, b22: 1, b23: 1 }),
    preset('invalid', 'Reject incompatible', { mode: 'invalid', a11: 1, a12: 0, a21: 2, a22: 1, a31: -1, a32: 3 }),
  ];
  if (chapter === 'orthogonality') return [
    preset('rotation', 'Rotation', {}), preset('reflection', 'Reflection', { a11: 1, a12: 0, a21: 0, a22: -1 }),
    preset('identity', 'Identity', { a11: 1, a12: 0, a21: 0, a22: 1 }),
    preset('shear', 'Shear fails', { a11: 1, a12: 1, a21: 0, a22: 1 }),
    preset('scale', 'Scaling fails', { a11: 2, a12: 0, a21: 0, a22: 1 }),
  ];
  if (chapter === 'determinant') return [
    preset('positive', 'Positive area', {}), preset('reflection', 'Negative reflection', { a11: 0, a12: 1, a21: 1, a22: 0 }),
    preset('shear', 'Area-one shear', { a11: 1, a12: 1, a21: 0, a22: 1 }),
    preset('collapse', 'Zero collapse', { a11: 1, a12: 2, a21: 2, a22: 4 }),
  ];
  return [
    preset('unique', 'Unique', {}), preset('vertical', 'Vertical + horizontal', { a11: 1, a12: 0, a21: 0, a22: 1, r1: 2, r2: -3 }),
    preset('parallel', 'Parallel, none', { a11: 1, a12: 1, a21: 2, a22: 2, r1: 1, r2: 3 }),
    preset('coincident', 'Coincident, many', { a11: 1, a12: 1, a21: 2, a22: 2, r1: 1, r2: 2 }),
    preset('zero-true', 'Zero row 0 = 0', { a11: 0, a12: 0, a21: 1, a22: 0, r1: 0, r2: 2 }),
    preset('zero-false', 'Zero row 0 = 1', { a11: 0, a12: 0, a21: 1, a22: 0, r1: 1, r2: 2 }),
  ];
}

const matrixA = (s: MatrixState): Matrix => s.mode === 'wide'
  ? matrix([[s.a11, s.a12, s.a13], [s.a21, s.a22, s.a23]])
  : s.mode === 'tall' || s.mode === 'invalid'
    ? matrix([[s.a11, s.a12], [s.a21, s.a22], [s.a31, s.a32]])
    : matrix([[s.a11, s.a12], [s.a21, s.a22]]);
const matrixB = (s: MatrixState): Matrix => s.mode === 'tall'
  ? matrix([[s.b11, s.b12, s.b13], [s.b21, s.b22, s.b23]])
  : matrix([[s.b11, s.b12], [s.b21, s.b22]]);
const input = (chapter: MatrixChapter, s: MatrixState): ExactVector => chapter === 'matvec' && (s.mode === 'wide' || s.mode === 'invalid')
  ? exactVector([s.x1, s.x2, s.x3]) : exactVector([s.x1, s.x2]);
const asVector = (values: ExactVector): Vector => ({ x: values[0]!, y: values[1]! });
const asPoint = (values: ExactVector): Point => ({ x: toNumber(values[0]!), y: toNumber(values[1]!) });

const ratForm = (r: Rational) => rationalForm(r);
const rtex = (r: Rational) => ratForm(r).tex;
const rtext = (r: Rational) => ratForm(r).text;
const vtex = (v: ExactVector) => `\\begin{bmatrix}${v.map(rtex).join('\\\\')}\\end{bmatrix}`;
const vtext = (v: ExactVector) => `(${v.map(rtext).join(', ')})`;
const mtex = (a: Matrix) => `\\begin{bmatrix}${a.values.map(row => row.map(rtex).join('&')).join('\\\\')}\\end{bmatrix}`;
const mtext = (a: Matrix) => `[${a.values.map(row => row.map(rtext).join(', ')).join('; ')}]`;
const exact = (textValue: string, tex: string): ValueDescription => ({ status: 'exact', lines: [{ relation: '=', text: textValue, tex }], spoken: textValue });
const ratDesc = (r: Rational): ValueDescription => describeValue({ kind: 'exact', exact: ratForm(r), approx: toNumber(r) }, FORMAT);
const vecDesc = (v: ExactVector): ValueDescription => exact(vtext(v), vtex(v));
const matrixDesc = (a: Matrix): ValueDescription => exact(`${shape(a)} ${mtext(a)}`, mtex(a));
function textDesc(value: string, tex?: string): ValueDescription {
  const safeText = value.replaceAll('×', ' by ').replaceAll('·', ' times ').replaceAll('→', ' gives ').replaceAll('−', 'minus ');
  return exact(value, tex ?? `\\text{${safeText}}`);
}
const undefinedDesc = (reason: string): ValueDescription => describeValue({ kind: 'undefined', reason }, FORMAT);
const numericDesc = (value: number): ValueDescription => describeValue({ kind: 'numeric', value }, FORMAT);
const rootDesc = (root: RootResult): ValueDescription => root.kind === 'exact'
  ? describeValue({ kind: 'exact', exact: rootForm(root.root), approx: root.approx }, FORMAT)
  : root.kind === 'numeric' ? numericDesc(root.approx) : undefinedDesc(root.reason);
const rootTex = (root: RootResult): string => root.kind === 'exact' ? rootForm(root.root).tex : root.kind === 'numeric' ? formatApprox(root.approx, FORMULA_FORMAT).tex : '\\text{undefined}';
const row = (id: string, symbolTex: string, name: string, description: ValueDescription, role: Role = 'derived'): InspectorRowData => ({ id, symbolTex, name, description, role });

export interface MatrixSceneLine { readonly name: string; readonly from: Point; readonly to: Point; readonly role: Role; readonly dashed: boolean; readonly width?: number }
export interface MatrixSceneArrow { readonly name: string; readonly from: Point; readonly to: Point; readonly role: Role; readonly label: string }
export interface MatrixHandle { readonly id: string; readonly xField: MatrixField; readonly yField: MatrixField; readonly at: Point; readonly role: Role; readonly label: string }
export interface MatrixScene {
  readonly lines: MatrixSceneLine[]; readonly arrows: MatrixSceneArrow[];
  readonly polygons: { readonly name: string; readonly corners: readonly Point[]; readonly role: Role }[];
  readonly points: { readonly name: string; readonly at: Point; readonly role: Role; readonly radius?: number }[];
  readonly labels: { readonly name: string; readonly at: Point; readonly role: Role; readonly label: string; readonly dx?: number; readonly dy?: number }[];
  readonly handles: MatrixHandle[]; readonly window: WorldWindow;
}
export interface MatrixBoardItem { readonly label: string; readonly shape: string; readonly value: string; readonly role: Role }
export interface MatrixBoard { readonly items: readonly MatrixBoardItem[]; readonly relation: string; readonly invalid: boolean }
export interface MatrixDerived {
  readonly rows: readonly InspectorRowData[]; readonly formulas: readonly string[]; readonly verdict: string;
  readonly scene: MatrixScene | null; readonly board: MatrixBoard | null; readonly result: Point | null; readonly status: string;
}

const newScene = (): MatrixScene => ({ lines: [], arrows: [], polygons: [], points: [], labels: [], handles: [], window: { xMin: -6, xMax: 6, yMin: -6, yMax: 6 } });
const apply2 = (a: Matrix, p: readonly [number, number], translation: ExactVector = exactVector([0, 0])): Point => {
  const result = affine2(a, exactVector(p), translation);
  if (!result.ok) throw new Error(result.reason);
  return asPoint(result.value);
};
function transformedGrid(scene: MatrixScene, a: Matrix, translation: readonly [number, number] = [0, 0]) {
  const shift = exactVector(translation);
  for (let i = -4; i <= 4; i++) {
    scene.lines.push({ name: `grid-column-${i}`, from: apply2(a, [i, -4], shift), to: apply2(a, [i, 4], shift), role: 'x', dashed: i !== 0, width: i === 0 ? 2.5 : 1 });
    scene.lines.push({ name: `grid-row-${i}`, from: apply2(a, [-4, i], shift), to: apply2(a, [4, i], shift), role: 'y', dashed: i !== 0, width: i === 0 ? 2.5 : 1 });
  }
}
const unitSquare = (a: Matrix, translation: ExactVector = exactVector([0, 0])): Point[] => [[0, 0], [1, 0], [1, 1], [0, 1]].map(p => apply2(a, p as [number, number], translation));
const fitScene = (scene: MatrixScene): MatrixScene => {
  const points = [...scene.lines.flatMap(line => [line.from, line.to]), ...scene.arrows.flatMap(arrow => [arrow.from, arrow.to]), ...scene.polygons.flatMap(poly => poly.corners), ...scene.points.map(p => p.at)];
  const radius = Math.max(5.5, ...points.flatMap(p => [Math.abs(p.x) + 2, Math.abs(p.y) + 2]));
  return { ...scene, window: { xMin: -radius, xMax: radius, yMin: -radius, yMax: radius } };
};

const boardItem = (label: string, value: Matrix | ExactVector | null, role: Role): MatrixBoardItem => value && 'rows' in value
  ? { label, shape: shape(value), value: mtext(value), role }
  : value ? { label, shape: `${value.length}×1`, value: vtext(value), role }
    : { label, shape: 'undefined', value: 'incompatible', role };

function lineSegment(a: Rational, b: Rational, c: Rational, limit = rational(11n, 2n)): readonly [Point, Point] | null {
  if (isZero(a) && isZero(b)) return null;
  const candidates: Point[] = [];
  for (const sign of [-1n, 1n]) {
    const bound = mul(rational(sign), limit);
    if (!isZero(b)) candidates.push({ x: toNumber(bound), y: toNumber(div(sub(c, mul(a, bound)), b)) });
    if (!isZero(a)) candidates.push({ x: toNumber(div(sub(c, mul(b, bound)), a)), y: toNumber(bound) });
  }
  const n = toNumber(limit) + 1e-9;
  const inside = candidates.filter(p => Math.abs(p.x) <= n && Math.abs(p.y) <= n)
    .filter((p, i, all) => all.findIndex(q => Math.abs(p.x - q.x) < 1e-9 && Math.abs(p.y - q.y) < 1e-9) === i);
  return inside.length >= 2 ? [inside[0]!, inside[1]!] : null;
}

export function deriveMatrixLesson(chapter: MatrixChapter, state: MatrixState): MatrixDerived {
  const a = matrixA(state), x = input(chapter, state), origin = { x: 0, y: 0 };
  let rows: InspectorRowData[] = [row('A', 'A', 'matrix A', matrixDesc(a), 'x')];
  let formulas: string[] = [], verdict = '', scene: MatrixScene | null = null, board: MatrixBoard | null = null, result: Point | null = null, status = 'defined';

  if (chapter === 'transform') {
    const translation = exactVector([state.t1, state.t2]), linear = multiplyVector(a, x), affine = affine2(a, x, translation);
    if (!linear.ok || !affine.ok) throw new Error('2D transform shapes are fixed');
    const c1 = column(a, 0), c2 = column(a, 1), det = determinant2(a), shifted = state.t1 !== 0 || state.t2 !== 0;
    scene = newScene(); transformedGrid(scene, a, [state.t1, state.t2]);
    scene.polygons.push({ name: 'transformed-square', corners: unitSquare(a, translation), role: 'derived' });
    scene.arrows.push({ name: 'column-1', from: origin, to: asPoint(c1), role: 'x', label: 'Ae₁' }, { name: 'column-2', from: origin, to: asPoint(c2), role: 'y', label: 'Ae₂' }, { name: 'input', from: origin, to: asPoint(x), role: 'ink', label: 'x' }, { name: 'output', from: origin, to: asPoint(shifted ? affine.value : linear.value), role: 'primary', label: shifted ? 'Ax+b' : 'Ax' });
    scene.points.push({ name: 'origin-image', at: asPoint(translation), role: shifted ? 'caution' : 'ink', radius: 5 });
    scene.labels.push({ name: 'origin-image-label', at: asPoint(translation), role: shifted ? 'caution' : 'ink', label: shifted ? 'b' : '0', dx: 14, dy: -14 });
    scene.handles.push({ id: 'column-1', xField: 'a11', yField: 'a21', at: asPoint(c1), role: 'x', label: 'image of e1' }, { id: 'column-2', xField: 'a12', yField: 'a22', at: asPoint(c2), role: 'y', label: 'image of e2' }, { id: 'input', xField: 'x1', yField: 'x2', at: asPoint(x), role: 'ink', label: 'input x' });
    result = asPoint(shifted ? affine.value : linear.value);
    rows.push(row('column-1', 'A\\mathbf e_1', 'first column / image of e₁', vecDesc(c1), 'x'), row('column-2', 'A\\mathbf e_2', 'second column / image of e₂', vecDesc(c2), 'y'), row('x', '\\mathbf x', 'input vector', vecDesc(x), 'ink'), row('output', shifted ? 'A\\mathbf x+\\mathbf b' : 'A\\mathbf x', 'output vector', vecDesc(shifted ? affine.value : linear.value), 'primary'), row('origin-image', shifted ? '\\mathbf b' : 'A\\mathbf0', 'image of the origin', vecDesc(shifted ? translation : exactVector([0, 0])), shifted ? 'caution' : 'ink'), row('det', '\\det A', 'orientation and area scale', ratDesc(det)));
    formulas = [`A=[A\\mathbf e_1\;A\\mathbf e_2]=${mtex(a)}`, `${shifted ? 'A\\mathbf x+\\mathbf b' : 'A\\mathbf x'}=${vtex(shifted ? affine.value : linear.value)}`, shifted ? `A\\mathbf0+\\mathbf b=${vtex(translation)}\\ne\\mathbf0` : 'A\\mathbf0=\\mathbf0'];
    verdict = shifted ? `This is affine: the grid keeps A's deformation but moves the origin to ${vtext(translation)}.` : isZero(det) ? 'This is linear and fixes the origin, but it is singular: the grid collapses to fewer dimensions.' : `This is linear and fixes the origin. Its columns are the two basis images; det A is ${rtext(det)}, so orientation is ${det.num < 0n ? 'reversed' : 'preserved'}.`;
  }

  if (chapter === 'matvec') {
    const product = multiplyVector(a, x);
    rows.push(row('x', '\\mathbf x', 'input column', vecDesc(x), 'ink'), row('shape', '\\text{shape}', 'input → output shape', textDesc(product.ok ? `${shape(a)} · ${x.length}×1 → ${a.rows}×1` : product.reason), product.ok ? 'derived' : 'caution'));
    if (product.ok) {
      rows.push(row('output', 'A\\mathbf x', 'matrix-vector product', vecDesc(product.value), 'primary'));
      formulas = [aligned(a.values.map((values, i) => `(A\\mathbf x)_${i + 1}&=${values.map((value, j) => `${rtex(value)}(${rtex(x[j]!)})`).join('+')}=${rtex(product.value[i]!)}`)), `A\\mathbf x=${x.map((value, j) => `${rtex(value)}\\mathbf a_${j + 1}`).join('+')}=${vtex(product.value)}`];
      verdict = `The ${a.rows} outputs are row dot-products. The same result is a weighted sum of A's ${a.cols} columns.`;
      if (a.rows === 2 && a.cols === 2) {
        const c1 = column(a, 0), c2 = column(a, 1), first = times(x[0]!, asVector(c1));
        scene = newScene();
        scene.arrows.push({ name: 'column-1', from: origin, to: asPoint(c1), role: 'x', label: 'a₁' }, { name: 'column-2', from: origin, to: asPoint(c2), role: 'y', label: 'a₂' }, { name: 'weighted-1', from: origin, to: point(first), role: 'x', label: 'x₁a₁' }, { name: 'weighted-2', from: point(first), to: asPoint(product.value), role: 'y', label: 'x₂a₂' }, { name: 'output', from: origin, to: asPoint(product.value), role: 'primary', label: 'Ax' });
        scene.handles.push({ id: 'column-1', xField: 'a11', yField: 'a21', at: asPoint(c1), role: 'x', label: 'first matrix column' }, { id: 'column-2', xField: 'a12', yField: 'a22', at: asPoint(c2), role: 'y', label: 'second matrix column' }, { id: 'input', xField: 'x1', yField: 'x2', at: asPoint(x), role: 'ink', label: 'input x' });
        result = asPoint(product.value);
      } else board = { items: [boardItem('A', a, 'x'), boardItem('x', x, 'ink'), boardItem('Ax', product.value, 'primary')], relation: 'compatible inner dimensions', invalid: false };
    } else {
      status = 'incompatible'; rows.push(row('output', 'A\\mathbf x', 'matrix-vector product', undefinedDesc(product.reason), 'caution'));
      formulas = [`${shape(a)}\\cdot ${x.length}\\times1\\quad\\text{is undefined}`]; verdict = product.reason;
      board = { items: [boardItem('A', a, 'x'), boardItem('x', x, 'ink'), boardItem('Ax', null, 'caution')], relation: product.reason, invalid: true };
    }
  }

  if (chapter === 'composition') {
    const b = matrixB(state), ax = multiplyVector(a, x), ba = multiplyMatrices(b, a), ab = multiplyMatrices(a, b);
    const affine = state.mode === 'affine', firstTranslation = exactVector(affine ? [state.t1, state.t2] : [0, 0]);
    const intermediateSymbol = affine ? 'A\\mathbf x+\\mathbf b' : 'A\\mathbf x';
    const outputSymbol = affine ? 'B(A\\mathbf x+\\mathbf b)+\\mathbf c' : 'B(A\\mathbf x)';
    const intermediateLabel = affine ? 'Ax+b' : 'Ax', outputLabel = affine ? 'B(Ax+b)+c' : 'B(Ax)';
    rows.push(row('B', 'B', 'matrix B (applied second)', matrixDesc(b), 'y'), row('x', '\\mathbf x', 'input vector', vecDesc(x), 'ink'));
    if (ax.ok && ba.ok) {
      const sequential = multiplyVector(b, ax.value), combined = multiplyVector(ba.value, x);
      if (!sequential.ok || !combined.ok) throw new Error('Compatible composition produced an incompatible vector');
      let output = sequential.value, intermediate = ax.value, combinedTranslation: ExactVector | null = null;
      if (affine) {
        const first = affine2(a, x, firstTranslation);
        if (!first.ok) throw new Error(first.reason);
        const second = affine2(b, first.value, exactVector([state.c1, state.c2]));
        const bb = multiplyVector(b, exactVector([state.t1, state.t2]));
        if (!second.ok || !bb.ok) throw new Error('Affine composition shape failure');
        intermediate = first.value; output = second.value; combinedTranslation = bb.value.map((value, i) => add(value, exactVector([state.c1, state.c2])[i]!));
      }
      rows.push(row('intermediate', intermediateSymbol, affine ? 'intermediate affine state after A and b' : 'intermediate state after A', vecDesc(intermediate), 'x'), row('BA', 'BA', 'combined linear transformation', matrixDesc(ba.value), 'primary'), row('output', outputSymbol, affine ? 'final affine state after B and c' : 'final state after B', vecDesc(output), 'primary'));
      if (ab.ok) rows.push(row('AB', 'AB', 'opposite order for comparison', matrixDesc(ab.value), 'derived'));
      formulas = [affine ? aligned([`${outputSymbol}&`, '&=(BA)\\mathbf x+(B\\mathbf b+\\mathbf c)', `&=${vtex(output)}`]) : `${outputSymbol}=(BA)\\mathbf x=${vtex(output)}`, ab.ok ? `BA=${mtex(ba.value)}${mtext(ba.value) === mtext(ab.value) ? '=' : '\\ne '}AB=${mtex(ab.value)}` : `AB\\text{ is undefined by shape}`];
      if (combinedTranslation) {
        rows.push(row('combined-translation', 'B\\mathbf b+\\mathbf c', 'combined translation', vecDesc(combinedTranslation), 'caution'));
        formulas.push(`B\\mathbf b+\\mathbf c=${vtex(combinedTranslation)}`);
      }
      verdict = affine ? `The affine intermediate Ax + b is ${vtext(intermediate)}; the final B(Ax + b) + c is ${vtext(output)}. The linear parts compose as BA; translations compose separately as Bb + c = ${vtext(combinedTranslation!)}.` : `A acts first and B second, so the combined matrix is BA${ab.ok && mtext(ba.value) !== mtext(ab.value) ? ', not AB' : ''}.`;
      if (a.rows === 2 && b.rows === 2 && b.cols === 2) {
        scene = newScene(); const aSquare = unitSquare(a, firstTranslation), baSquare = unitSquare(ba.value, combinedTranslation ?? exactVector([0, 0]));
        scene.polygons.push({ name: 'after-A-square', corners: aSquare, role: 'x' }, { name: 'after-BA-square', corners: baSquare, role: 'primary' });
        scene.arrows.push({ name: 'input', from: origin, to: asPoint(x), role: 'ink', label: 'x' }, { name: 'intermediate', from: origin, to: asPoint(intermediate), role: 'x', label: intermediateLabel }, { name: 'output', from: origin, to: asPoint(output), role: 'primary', label: outputLabel });
        scene.handles.push({ id: 'input', xField: 'x1', yField: 'x2', at: asPoint(x), role: 'ink', label: 'input x' }); result = asPoint(output);
      } else board = { items: [boardItem('x', x, 'ink'), boardItem('A', a, 'x'), boardItem(intermediateLabel, intermediate, 'x'), boardItem('B', b, 'y'), boardItem(outputLabel, output, 'primary')], relation: `${shape(a)} then ${shape(b)} gives ${shape(ba.value)}`, invalid: false };
    } else {
      const reason = !ax.ok ? ax.reason : !ba.ok ? ba.reason : 'Composition is undefined.';
      status = 'incompatible'; rows.push(row('BA', 'BA', 'combined transformation', undefinedDesc(reason), 'caution'));
      formulas = [`BA\\text{ undefined: }${b.cols}\\ne${a.rows}`]; verdict = reason;
      board = { items: [boardItem('A', a, 'x'), boardItem('B', b, 'y'), boardItem('BA', null, 'caution')], relation: reason, invalid: true };
    }
  }

  if (chapter === 'orthogonality') {
    const q = a, qt = transpose(q), qtq = multiplyMatrices(qt, q), isOrthogonal = orthogonal2(q);
    const xv = exactVector([state.x1, state.x2]), yv = exactVector([state.y1, state.y2]), qx = multiplyVector(q, xv), qy = multiplyVector(q, yv);
    if (!qtq.ok || !qx.ok || !qy.ok) throw new Error('2D orthogonality shapes are fixed');
    const before = deriveDot(asVector(xv), asVector(yv)), after = deriveDot(asVector(qx.value), asVector(qy.value));
    const c1 = column(q, 0), c2 = column(q, 1);
    scene = newScene(); transformedGrid(scene, q);
    scene.arrows.push({ name: 'column-1', from: origin, to: asPoint(c1), role: 'x', label: 'q₁' }, { name: 'column-2', from: origin, to: asPoint(c2), role: 'y', label: 'q₂' }, { name: 'input-x', from: origin, to: asPoint(xv), role: 'ink', label: 'x' }, { name: 'output-x', from: origin, to: asPoint(qx.value), role: 'primary', label: 'Qx' }, { name: 'output-y', from: origin, to: asPoint(qy.value), role: 'derived', label: 'Qy' });
    scene.handles.push({ id: 'column-1', xField: 'a11', yField: 'a21', at: asPoint(c1), role: 'x', label: 'first column q1' }, { id: 'column-2', xField: 'a12', yField: 'a22', at: asPoint(c2), role: 'y', label: 'second column q2' });
    rows.push(row('transpose', 'Q^\\mathsf T', 'transpose', matrixDesc(qt)), row('qtq', 'Q^\\mathsf TQ', 'orthogonality test', matrixDesc(qtq.value), isOrthogonal ? 'primary' : 'caution'), row('column-dot', '\\mathbf q_1\\cdot\\mathbf q_2', 'column dot product', ratDesc(dot(asVector(c1), asVector(c2)))), row('x-length', '\\norm{\\mathbf x}', 'input length', rootDesc(length(asVector(xv))), 'ink'), row('qx-length', '\\norm{Q\\mathbf x}', 'output length', rootDesc(length(asVector(qx.value))), 'primary'), row('angle-before', '\\theta', 'angle between x and y', before.angle ? numericDesc(before.angle.radians) : undefinedDesc('An angle needs nonzero vectors.')), row('angle-after', '\\theta\\prime', 'angle between Qx and Qy', after.angle ? numericDesc(after.angle.radians) : undefinedDesc('An angle needs nonzero outputs.')), row('inverse', 'Q^{-1}', 'inverse-by-transpose test', isOrthogonal ? matrixDesc(qt) : undefinedDesc('Qᵀ is the inverse only when QᵀQ = I.')));
    formulas = [`Q^\\mathsf TQ=${mtex(qtq.value)}${isOrthogonal ? '=I' : '\\ne I'}`, `\\norm{Q\\mathbf x}=${rootTex(length(asVector(qx.value)))},\\quad (Q\\mathbf x)\\cdot(Q\\mathbf y)=${rtex(after.product)}`, isOrthogonal ? 'Q^{-1}=Q^\\mathsf T' : '\\text{no transpose shortcut}'];
    verdict = isOrthogonal ? 'The columns are an orthonormal frame. Q preserves dot products, so lengths and angles survive; a reflection may still reverse orientation.' : 'QᵀQ is not I. This map is not orthogonal, so transpose is not an inverse shortcut and preservation is not guaranteed.';
    status = isOrthogonal ? 'orthogonal' : 'not-orthogonal'; result = asPoint(qx.value);
  }

  if (chapter === 'determinant') {
    const det = determinant2(a), area = abs(det), c1 = column(a, 0), c2 = column(a, 1);
    scene = newScene(); transformedGrid(scene, a); scene.polygons.push({ name: 'transformed-square', corners: unitSquare(a), role: det.num < 0n ? 'caution' : 'primary' });
    scene.arrows.push({ name: 'column-1', from: origin, to: asPoint(c1), role: 'x', label: 'Ae₁' }, { name: 'column-2', from: origin, to: asPoint(c2), role: 'y', label: 'Ae₂' });
    scene.handles.push({ id: 'column-1', xField: 'a11', yField: 'a21', at: asPoint(c1), role: 'x', label: 'first matrix column' }, { id: 'column-2', xField: 'a12', yField: 'a22', at: asPoint(c2), role: 'y', label: 'second matrix column' });
    rows.push(row('det', '\\det A', 'signed area scale', ratDesc(det), det.num < 0n ? 'caution' : 'primary'), row('area', '|\\det A|', 'ordinary area scale', ratDesc(area)), row('orientation', '\\operatorname{orientation}', 'orientation', textDesc(isZero(det) ? 'collapsed' : det.num > 0n ? 'preserved' : 'reversed')), row('independence', '\\text{columns}', 'basis independence test', textDesc(isZero(det) ? 'dependent' : 'independent')));
    formulas = ['\\det A=a_{11}a_{22}-a_{12}a_{21}', `\\det A=${rtex(a.values[0]![0]!)}(${rtex(a.values[1]![1]!)})-${rtex(a.values[0]![1]!)}(${rtex(a.values[1]![0]!)})=${rtex(det)}`, `\\text{area}=|\\det A|=${rtex(area)}`];
    verdict = isZero(det) ? 'The two column directions are dependent. The square collapses to zero area, exactly matching II.7’s failed basis test.' : `The unit square becomes a parallelogram of area ${rtext(area)}. The ${det.num < 0n ? 'negative sign records an orientation reversal' : 'positive sign records preserved orientation'}.`;
    status = isZero(det) ? 'singular' : det.num < 0n ? 'negative' : 'positive';
  }

  if (chapter === 'systems') {
    const rhs = exactVector([state.r1, state.r2]), solved = solveSystem2(a, rhs), [first, second] = a.values;
    scene = newScene();
    const firstLine = lineSegment(first![0]!, first![1]!, rhs[0]!), secondLine = lineSegment(second![0]!, second![1]!, rhs[1]!);
    if (firstLine) { const at = firstLine[1]; scene.lines.push({ name: 'constraint-1', from: firstLine[0], to: at, role: 'x', dashed: false, width: 3 }); scene.labels.push({ name: 'constraint-1-label', at, role: 'x', label: 'row 1', dx: at.x < 0 ? 30 : -30, dy: at.y < 0 ? -16 : 16 }); }
    if (secondLine) { const at = secondLine[0]; scene.lines.push({ name: 'constraint-2', from: at, to: secondLine[1], role: 'y', dashed: true, width: 3 }); scene.labels.push({ name: 'constraint-2-label', at, role: 'y', label: 'row 2', dx: at.x < 0 ? 30 : -30, dy: at.y < 0 ? -16 : 16 }); }
    rows.push(row('rhs', '\\mathbf b', 'right-hand side', vecDesc(rhs), 'y'), row('det', '\\det A', 'exact coefficient determinant', ratDesc(solved.determinant)));
    formulas = [`${mtex(a)}\\begin{bmatrix}x\\\\y\\end{bmatrix}=${vtex(rhs)}`, aligned([`${rtex(first![0]!)}x+${rtex(first![1]!)}y&=${rtex(rhs[0]!)}`, `${rtex(second![0]!)}x+${rtex(second![1]!)}y&=${rtex(rhs[1]!)}`])];
    status = solved.kind;
    if (solved.kind === 'unique') {
      result = asPoint(solved.solution); scene.points.push({ name: 'solution', at: result, role: 'primary', radius: 6 }); scene.labels.push({ name: 'solution-label', at: result, role: 'primary', label: 'solution', dx: 28, dy: -20 });
      rows.push(row('classification', '\\text{solutions}', 'system classification', textDesc('one exact solution'), 'primary'), row('solution', '(x,y)', 'intersection / solution', vecDesc(solved.solution), 'primary'));
      formulas.push(`(x,y)=${vtext(solved.solution)},\\quad A\\begin{bmatrix}x\\\\y\\end{bmatrix}=\\mathbf b`);
      verdict = `The two exact constraints meet once at ${vtext(solved.solution)}. Vertical lines require no special mathematical guess; they are ordinary coefficient rows.`;
    } else {
      rows.push(row('classification', '\\text{solutions}', 'system classification', textDesc(solved.kind === 'none' ? 'no solutions' : 'infinitely many solutions'), solved.kind === 'none' ? 'caution' : 'primary'), row('solution', '(x,y)', 'intersection / solution', undefinedDesc(solved.reason), 'caution'));
      formulas.push(solved.kind === 'none' ? '\\det A=0,\\quad\\text{no solutions}' : '\\det A=0,\\quad\\text{infinitely many solutions}');
      verdict = solved.reason;
    }
  }

  return { rows, formulas, verdict, scene: scene ? fitScene(scene) : null, board, result, status };
}

const WORK: Record<MatrixChapter, readonly string[]> = {
  transform: ['Read the columns as Ae₁ and Ae₂.', 'Write x as a weighted sum of the standard basis.', 'Apply the same weights to the two image columns.'],
  matvec: ['Check that A has one column for every input entry.', 'Each output component is one row dot-product.', 'Regroup the same products as a linear combination of columns.'],
  composition: ['Apply A to x and keep Ax visible.', 'Apply B to that intermediate vector.', 'Multiply B by A to obtain the single combined map BA.'],
  orthogonality: ['Transpose Q by exchanging rows and columns.', 'Multiply QᵀQ exactly.', 'When the product is I, dot products—and therefore lengths and angles—are preserved.'],
  determinant: ['Transform the two sides of the unit square.', 'Compute the signed parallelogram area.', 'Read magnitude as area scale and sign as orientation.'],
  systems: ['Write both constraints as A[x,y]ᵀ = b.', 'Use exact coefficient relations to classify the intersection.', 'When unique, verify the intersection in both equations.'],
};
export function matrixWorkedFrames(chapter: MatrixChapter) {
  const derived = deriveMatrixLesson(chapter, MATRIX_CANONICAL[chapter]);
  return traceFrom(WORK[chapter].map((explanation, index) => ({
    state: { inputs: MATRIX_CANONICAL[chapter], rows: derived.rows, formula: derived.formulas[Math.min(index, derived.formulas.length - 1)]!, step: index }, explanation,
  })));
}
