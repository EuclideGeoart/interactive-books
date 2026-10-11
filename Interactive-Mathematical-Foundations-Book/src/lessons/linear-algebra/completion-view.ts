/** Shared presentation vocabulary for the six concluding chapters; no renderer arithmetic. */
import { rationalForm } from '../../math/quantity/exactform';
import { toNumber, type Rational } from '../../math/quantity/rational';
import type { Matrix, ExactVector } from '../../math/linear-algebra/matrices';
import { describeValue, type ValueDescription } from '../../platform/numeric/quantity';
import { formatApprox } from '../../platform/numeric/format';
import type { ParamSpec } from '../../platform/params';
import type { Point, WorldWindow } from '../../platform/geometry/viewport';
import type { TraceFrame } from '../../platform/trace';
import type { InspectorRowData } from '../../ui/Inspector';
import type { Role } from '../../ui/plane/primitives';
import { FORMAT, FORMULA_FORMAT } from '../shared/format';

export const rtex = (r: Rational) => rationalForm(r).tex;
export const rtext = (r: Rational) => rationalForm(r).text;
export const mtex = (a: Matrix) => `\\begin{bmatrix}${a.values.map(row => row.map(rtex).join('&')).join('\\\\')}\\end{bmatrix}`;
export const mtext = (a: Matrix) => `[${a.values.map(row => row.map(rtext).join(', ')).join('; ')}]`;
export const vtex = (v: ExactVector) => `\\begin{bmatrix}${v.map(rtex).join('\\\\')}\\end{bmatrix}`;
export const vtext = (v: ExactVector) => `(${v.map(rtext).join(', ')})`;
export const ntex = (n: number) => formatApprox(n, FORMULA_FORMAT).tex;
export const ntext = (n: number) => formatApprox(n, FORMAT).text;
export const exactDesc = (text: string, tex = `\\text{${text}}`): ValueDescription => ({ status: 'exact', lines: [{ relation: '=', text, tex }], spoken: text });
export const numericDesc = (value: number) => describeValue({ kind: 'numeric', value }, FORMAT);
export const ratDesc = (r: Rational) => describeValue({ kind: 'exact', exact: rationalForm(r), approx: toNumber(r) }, FORMAT);
export const undefinedDesc = (reason: string) => describeValue({ kind: 'undefined', reason }, FORMAT);
export const row = (id: string, symbolTex: string, name: string, description: ValueDescription, role: Role = 'derived'): InspectorRowData => ({ id, symbolTex, name, description, role });
export const asPoint = (v: ExactVector): Point => ({ x: toNumber(v[0]!), y: toNumber(v[1]!) });
export const ORIGIN = { x: 0, y: 0 };
export interface CompletionHandle { id: string; label: string; at: Point; xField: string; yField: string; role: Role }
export interface CompletionScene {
  title: string; description: string; window: WorldWindow;
  arrows: { name: string; from: Point; to: Point; role: Role; label: string; labelDx?: number }[];
  lines: { name: string; from: Point; to: Point; role: Role; dashed?: boolean; width?: number }[];
  polygons: { name: string; corners: readonly Point[]; role: Role }[];
  handles: CompletionHandle[];
}
export interface CompletionFrame {
  /** Actual mathematical state, retained independently of the presentation strings. */
  semantic: unknown;
  title: string; formula: string; detail: string;
  matrix?: Matrix; coefficientCols?: number; pivots?: readonly number[];
}
export interface CompletionDerived {
  rows: readonly InspectorRowData[]; formulas: readonly string[]; verdict: string; status: string;
  scenes: readonly CompletionScene[]; frames: readonly TraceFrame<CompletionFrame>[];
  rank?: number; result?: Point;
}
export const scene = (title: string, description: string, radius = 6): CompletionScene => ({ title, description,
  window: { xMin: -radius, xMax: radius, yMin: -radius, yMax: radius }, arrows: [], lines: [], polygons: [], handles: [] });
export const arrow = (s: CompletionScene, name: string, to: Point, role: Role, label: string, from = ORIGIN) => s.arrows.push({ name, from, to, role, label });
export const spec = (id: string, value: number, name: string, symbolTex: string, min = -4, max = 4): ParamSpec => ({
  id, name, symbolTex, symbolText: id, domain: { min, max }, default: value, step: 0.5, maxDecimals: 2, onInvalid: 'reject',
});
export const matrixSpecs = (s: { a11: number; a12: number; a21: number; a22: number; x1: number; x2: number }) => Object.fromEntries(Object.entries(s).map(([id, value]) => [id, spec(id, value, id.startsWith('a') ? `A row ${id[1]}, column ${id[2]}` : `input ${id[1]}`, id.startsWith('a') ? `A_{${id.slice(1)}}` : `x_${id[1]}`)]));

export interface PlanarState { a11: number; a12: number; a21: number; a22: number; x1: number; x2: number }
