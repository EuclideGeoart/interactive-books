/**
 * Shared presentation vocabulary for Part III. A lesson's `derive` turns canonical state into this structure; the stage only draws it.
 * Nothing here computes mathematics: it formats values that the models in `src/math/calculus/` already derived.
 */
import { rationalForm } from '../../math/quantity/exactform';
import { toNumber, type Rational } from '../../math/quantity/rational';
import { describeValue, type ValueDescription } from '../../platform/numeric/quantity';
import { formatApprox, formatGiven } from '../../platform/numeric/format';
import { sampleCurve, type Polyline } from '../../platform/geometry/curve';
import type { ParamSpec } from '../../platform/params';
import type { Point, WorldWindow } from '../../platform/geometry/viewport';
import type { TraceFrame } from '../../platform/trace';
import type { InspectorRowData } from '../../ui/Inspector';
import type { Role } from '../../ui/plane/primitives';
import type { OneSided, PointValue, Univariate } from '../../math/calculus/univariate';
import { FORMAT, FORMULA_FORMAT, SPOKEN_FORMAT } from '../shared/format';

export const rtex = (r: Rational) => rationalForm(r).tex;
export const rtext = (r: Rational) => rationalForm(r).text;
export const ntex = (n: number) => formatApprox(n, FORMULA_FORMAT).tex;
export const ntext = (n: number) => formatApprox(n, FORMULA_FORMAT).text;
export const nspoken = (n: number) => formatApprox(n, SPOKEN_FORMAT).text;
export const gtex = (n: number) => formatGiven(n).tex;
export const gtext = (n: number) => formatGiven(n).text;
/** Parenthesise a negative given value inside a formula: `f(-2)` reads better as `f(−2)` but `x+h` with h=−1 needs `(−1)`. */
export const pg = (n: number) => (n < 0 ? `(${gtex(n)})` : gtex(n));

/** A TeX-safe twin of plain text for `\\text{}` (the inspector shows `text`; `tex` must still parse in strict KaTeX). */
const TEXT_SAFE: Record<string, string> = { '−': '-', '×': 'x', 'ℝ': 'R', '²': '2', '³': '3', '≠': '!=', '≈': '~', '∞': 'infinity', '—': '--', '‖': '|', '→': '->' };
const TEX_ESCAPE: Record<string, string> = { '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', $: '\\$', '&': '\\&', '#': '\\#', '^': '\\textasciicircum{}', _: '\\_', '%': '\\%', '~': '\\textasciitilde{}' };
const texSafe = (text: string) => text.replace(/[^\x20-\x7e]/g, c => TEXT_SAFE[c] ?? '?').replace(/[\\{}$&#^_%~]/g, c => TEX_ESCAPE[c]!);
export const exactDesc = (text: string): ValueDescription => ({ status: 'exact', lines: [{ relation: '=', text, tex: `\\text{${texSafe(text)}}` }], spoken: text });
export const givenDesc = (value: number): ValueDescription => describeValue({ kind: 'given', value }, FORMAT);
export const numericDesc = (value: number): ValueDescription => describeValue({ kind: 'numeric', value }, FORMAT);
export const ratDesc = (r: Rational): ValueDescription => describeValue({ kind: 'exact', exact: rationalForm(r), approx: toNumber(r) }, FORMAT);
export const undefinedDesc = (reason: string): ValueDescription => describeValue({ kind: 'undefined', reason }, FORMAT);
/** Exact when the model supplied an exact rational, otherwise a labelled binary64 approximation. */
export const valueDesc = (v: { value: number; exact?: Rational }): ValueDescription => (v.exact ? ratDesc(v.exact) : numericDesc(v.value));
export const pointDesc = (v: PointValue): ValueDescription => (v.kind === 'value' ? valueDesc(v) : undefinedDesc(v.reason));
export const oneSidedDesc = (v: OneSided): ValueDescription => v.kind === 'finite' ? valueDesc(v)
  : v.kind === 'infinite' ? { status: 'exact', lines: [{ relation: '=', text: v.sign > 0 ? '+∞ (unbounded)' : '−∞ (unbounded)', tex: v.sign > 0 ? '+\\infty' : '-\\infty' }], spoken: v.sign > 0 ? 'grows without bound' : 'decreases without bound', note: 'No finite limit: the values are unbounded.' }
    : undefinedDesc(v.reason);
export const valueTex = (v: { value: number; exact?: Rational }) => (v.exact ? rtex(v.exact) : `${ntex(v.value)}`);
export const valueText = (v: { value: number; exact?: Rational }) => (v.exact ? rtext(v.exact) : `≈ ${ntext(v.value)}`);
export const oneSidedTex = (v: OneSided) => v.kind === 'finite' ? valueTex(v) : v.kind === 'infinite' ? (v.sign > 0 ? '+\\infty' : '-\\infty') : '\\text{does not exist}';
export const oneSidedText = (v: OneSided) => v.kind === 'finite' ? valueText(v) : v.kind === 'infinite' ? (v.sign > 0 ? '+∞' : '−∞') : 'does not exist';
export const row = (id: string, symbolTex: string, name: string, description: ValueDescription, role: Role = 'derived', secondary = false): InspectorRowData =>
  ({ id, symbolTex, name, description, role, secondary });

export interface CalcHandle {
  id: string; label: string; at: Point; role: Role;
  /** State field written by horizontal motion. */
  xField: string;
  /** State field written by vertical motion; omitted for a handle that rides on a graph (its height is pinned to the model value). */
  yField?: string;
  /** Lattice step for dragging and arrow keys. */
  step: number;
  /** Optional horizontal parameter declaration when the handle's x is not itself a state field (e.g. Q = x + h). */
  spec?: ParamSpec;
  /** Optional vertical parameter declaration for a handle whose y is not a state field. */
  ySpec?: ParamSpec;
  /** Converts the handle's world position into state fields (e.g. h = q − x); defaults to `{ [xField]: x, [yField]: y }`. */
  write?: (x: number, y: number) => Readonly<Record<string, number>>;
}
export interface CalcScene {
  id: string; title: string; description: string; window: WorldWindow;
  curves: { name: string; lines: readonly Polyline[]; role: Role; dashed?: boolean; width?: number }[];
  segments: { name: string; from: Point; to: Point; role: Role; dashed?: boolean; width?: number }[];
  arrows: { name: string; from: Point; to: Point; role: Role }[];
  polygons: { name: string; corners: readonly Point[]; role: Role }[];
  markers: { name: string; at: Point; role: Role; filled: boolean; radius?: number }[];
  labels: { name: string; at: Point; text: string; role?: Role; dx?: number; dy?: number; anchor?: 'start' | 'middle' | 'end' }[];
  handles: CalcHandle[];
}
export interface CalcTable { caption: string; head: readonly string[]; rows: readonly (readonly string[])[] }
export interface CalcFrame {
  /** Actual mathematical state of this step, retained independently of its presentation strings. */
  semantic: unknown;
  title: string; detail: string; formula: string;
  table?: CalcTable;
}
export interface CalcChoice { field: string; legend: string; options: readonly { id: string; label: string }[] }
export interface CalcDerived {
  rows: readonly InspectorRowData[];
  formulas: readonly string[];
  verdict: string;
  /** Short machine-readable classification for tests and styling. */
  status: string;
  /** True when the verdict reports a failure or exceptional state (styled with the caution role and a text cue). */
  caution: boolean;
  scenes: readonly CalcScene[];
  frames: readonly TraceFrame<CalcFrame>[];
  /** Model values exposed for browser tests (the drawing must agree with these). */
  metrics: Readonly<Record<string, number | string | boolean | null>>;
  table?: CalcTable;
  hint: string;
}

export const scene = (id: string, title: string, description: string, window: WorldWindow): CalcScene => ({
  id, title, description, window, curves: [], segments: [], arrows: [], polygons: [], markers: [], labels: [], handles: [],
});
export const spec = (id: string, value: number, name: string, symbolTex: string, min: number, max: number, step: number, maxDecimals = 2): ParamSpec => ({
  id, name, symbolTex, symbolText: id, domain: { min, max }, default: value, step, maxDecimals, onInvalid: 'reject',
});

/** Memoised curve sampling: keyed by the function's identity and the window, so dragging an INPUT never re-samples the graph. */
const curveCache = new Map<string, Polyline[]>();
export function cachedCurve(key: string, f: (x: number) => number | null, window: WorldWindow, breaks: readonly number[] = [], samples = 480): Polyline[] {
  const k = `${key}|${window.xMin},${window.xMax},${window.yMin},${window.yMax}|${samples}`;
  let lines = curveCache.get(k);
  if (!lines) {
    lines = sampleCurve(f, window, { breaks, samples });
    if (curveCache.size > 400) curveCache.clear();
    curveCache.set(k, lines);
  }
  return lines;
}

/** A line through `p` with slope `m`, clipped to the window's x-range (for tangent and secant lines). */
export function lineThrough(p: Point, m: number, window: WorldWindow): { from: Point; to: Point } {
  return { from: { x: window.xMin, y: p.y + m * (window.xMin - p.x) }, to: { x: window.xMax, y: p.y + m * (window.xMax - p.x) } };
}
/** A ray from `p` toward one side with slope `m` (a one-sided tangent at a corner). */
export function rayFrom(p: Point, m: number, side: 'left' | 'right', length: number): { from: Point; to: Point } {
  const dx = (side === 'left' ? -1 : 1) * length / Math.hypot(1, m);
  return { from: p, to: { x: p.x + dx, y: p.y + m * dx } };
}

/**
 * Filled/open markers at a function's special abscissae, read from its ANALYTIC description: a filled dot is the actual value f(b); an open dot
 * is a finite one-sided limit that the function does not attain there (a hole or a jump). Continuous points get no marker.
 */
export function graphMarkers(f: Univariate, window: WorldWindow, role: Role = 'primary', prefix = 'f'): CalcScene['markers'] {
  const out: CalcScene['markers'] = [];
  for (const b of f.special) {
    const x = toNumber(b);
    if (x < window.xMin || x > window.xMax) continue;
    const v = f.at(b), sides = [f.limit(b, 'left'), f.limit(b, 'right')];
    const same = (a: { value: number; exact?: Rational }, c: { value: number; exact?: Rational }) => (a.exact && c.exact ? a.exact.num * c.exact.den === c.exact.num * a.exact.den : a.value === c.value);
    if (v.kind === 'value' && sides.every(l => l.kind === 'finite' && same(l, v))) continue;
    if (v.kind === 'value') out.push({ name: `${prefix}-value-${x}`, at: { x, y: v.value }, role, filled: true });
    const seen: number[] = [];
    for (const l of sides) if (l.kind === 'finite' && !(v.kind === 'value' && same(l, v)) && !seen.includes(l.value)) {
      seen.push(l.value); out.push({ name: `${prefix}-hole-${x}-${seen.length}`, at: { x, y: l.value }, role, filled: false });
    }
  }
  return out;
}

