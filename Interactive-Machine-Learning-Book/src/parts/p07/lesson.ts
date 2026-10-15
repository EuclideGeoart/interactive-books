import { traceFrom } from '../../platform/trace';
import { formatNumber } from '../../platform/format';
import presets from '../../../data/p07/presets.json' with { type: 'json' };
import review from '../../../fixtures/p07/review-regressions.json' with { type: 'json' };
import { svm, decision, validate, type SVMState, type Result, type Vec2, type Point } from './model/svm';
export type Mode = SVMState['mode'];
export const PLANE = { size: 480, origin: 240, scale: 32, min: -6, max: 6 } as const;
export const shown = (v: number | null) => v === null ? 'Unavailable' : v !== 0 && Math.abs(v) < .0001 ? v.toExponential(3) : formatNumber(v, 5);
export const PRESETS = Object.keys(presets.presets) as (keyof typeof presets.presets)[];
export function initialLab(mode: Mode): SVMState {
  return { mode, C: mode === 'kernel' ? 4 : 1, kernel: { kind: mode === 'kernel' ? 'rbf' : 'linear', gamma: 1, coef0: 1, degree: 2 }, points: presets.presets[mode === 'kernel' ? 'xor' : mode === 'soft' ? 'outlier' : 'separable'].map((p): Point => ({ ...p, x: [p.x[0]!, p.x[1]!] }))  };
}
export function preset(s: SVMState, name: keyof typeof presets.presets | 'diagnosticFailure'): SVMState {
  if (name === 'diagnosticFailure') {
    if (s.mode !== 'kernel') throw new RangeError('The diagnostic failure preset belongs to the kernel laboratory.');
    const input = review.diagnosticFailure.input;
    return { ...input, mode: 'kernel', kernel: { ...input.kernel, kind: 'polynomial' }, points: input.points.map((p): Point => ({ ...p, x: [p.x[0]!, p.x[1]!] })) };
  }
  const rows = presets.presets[name]; if (!rows) throw new RangeError('Unknown preset.');
  return { ...s, points: rows.map((p): Point => ({ ...p, x: [p.x[0]!, p.x[1]!] }))  };
}
export function editPoint(s: SVMState, id: string, change: Partial<{ x: number; y: number; label: number }>): SVMState {
  validate(s); if (!s.points.some(p => p.id === id)) throw new RangeError('Unknown observation ID.');
  const points = s.points.map((p): Point => p.id !== id ? p : { ...p, x: [change.x ?? p.x[0], change.y ?? p.x[1]], y: change.label ?? p.y });
  const next = { ...s, points }; validate(next); return next;
}
export function movePoint(s: SVMState, id: string, key: string, shift = false): SVMState {
  const p = s.points.find(p => p.id === id); if (!p || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) throw new RangeError('Choose a known point and arrow key.');
  const z = key === 'ArrowLeft' || key === 'ArrowRight' ? 0 : 1, step = shift ? .5 : .1;
  const value = Math.min(5, Math.max(-5, p.x[z] + (key === 'ArrowRight' || key === 'ArrowUp' ? step : -step)));
  return editPoint(s, id, z === 0 ? { x: value } : { y: value });
}
export function pointerPoint(clientX: number, clientY: number, r: { left: number; top: number; width: number; height: number }) {
  if (![clientX, clientY, r.left, r.top, r.width, r.height].every(Number.isFinite) || r.width <= 0 || r.height <= 0) throw new RangeError('Pointer geometry is unavailable.');
  const size = Math.min(r.width, r.height), left = r.left + (r.width - size) / 2, top = r.top + (r.height - size) / 2;
  const snap = (v: number) => Math.max(-5, Math.min(5, Math.round(v * 10) / 10));
  return { x: snap(((clientX - left) * 480 / size - 240) / 32), y: snap((240 - (clientY - top) * 480 / size) / 32) };
}
const px = (x: number) => 240 + 32 * x, py = (y: number) => 240 - 32 * y;
function line(w: Vec2, b: number, level: number) {
  const hits: Vec2[] = [];
  if (w[1] !== 0) for (const x of [-6, 6]) { const y = (level - b - w[0] * x) / w[1]; if (Number.isFinite(y) && Math.abs(y) <= 6) hits.push([x, y]); }
  if (w[0] !== 0) for (const y of [-6, 6]) { const x = (level - b - w[1] * y) / w[0]; if (Number.isFinite(x) && Math.abs(x) <= 6 && !hits.some(p => p[0] === x && p[1] === y)) hits.push([x, y]); }
  return hits.length >= 2 ? { x1: px(hits[0]![0]), y1: py(hits[0]![1]), x2: px(hits[1]![0]), y2: py(hits[1]![1]), level } : null;
}
/** Sampled contours interpolate scores; they never substitute for the solved kernel. */
function mesh(s: SVMState, r: Result) {
  const count = 32, step = 12 / count;
  const values = Array.from({ length: count + 1 }, (_, i) => Array.from({ length: count + 1 }, (_, j) => decision(s, r, [-6 + j * step, -6 + i * step])));
  const segments: { level: number; x1: number; y1: number; x2: number; y2: number }[] = [];
  const cells: { x: number; y: number; sign: number }[] = [];
  for (let i = 0; i < count; i++) for (let j = 0; j < count; j++) {
    const x = -6 + j * step, y = -6 + i * step;
    const corners = [[x, y], [x + step, y], [x + step, y + step], [x, y + step]] as Vec2[];
    const v = [values[i]![j]!, values[i]![j + 1]!, values[i + 1]![j + 1]!, values[i + 1]![j]!];
    cells.push({ x: px(x), y: py(y + step), sign: Math.sign(decision(s, r, [x + step / 2, y + step / 2])) });
    for (const level of [-1, 0, 1]) {
      const hits: Vec2[] = [];
      for (let z = 0; z < 4; z++) {
        const next = (z + 1) % 4, a = v[z]! - level, b = v[next]! - level;
        if ((a < 0 && b >= 0) || (b < 0 && a >= 0)) {
          const t = a / (a - b), p = corners[z]!, q = corners[next]!;
          hits.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
        }
      }
      // shortcut: ambiguous saddle cells use edge-order pairing, refine the mesh for geometric export.
      for (let z = 0; z + 1 < hits.length; z += 2) segments.push({ level, x1: px(hits[z]![0]), y1: py(hits[z]![1]), x2: px(hits[z + 1]![0]), y2: py(hits[z + 1]![1]) });
    }
  } return { cells, segments, values, cellSize: 32 * step };
}
export function deriveLab(s: SVMState, width = 320) {
  if (!Number.isFinite(width) || width <= 0) throw new RangeError('Plot width must be positive and finite.');
  const numerical = svm(s), fitted = numerical.status === 'solved' || numerical.status === 'approximate';
  const points = s.points.map((p, i) => ({ ...p, cx: px(p.x[0]), cy: py(p.x[1]), row: numerical.rows[i] ?? null,
    name: `Point ${p.id}, label ${p.y > 0 ? 'positive' : 'negative'}, x ${shown(p.x[0])}, y ${shown(p.x[1])}. Arrow keys move 0.1; Shift moves 0.5.` }));
  const lines = fitted && numerical.w && numerical.b !== null ? [-1, 0, 1].map(v => line(numerical.w!, numerical.b!, v)).filter(v => v !== null) : [];
  const surface = fitted && !numerical.w ? mesh(s, numerical) : null;
  const speech = `${numerical.status}. ${numerical.reason} Objective ${shown(numerical.primal)}, KKT residual ${shown(numerical.kkt)}, gap ${shown(numerical.gap)}. ${numerical.w ? `Weights ${numerical.w.map(shown).join(', ')}, intercept ${shown(numerical.b)}.` : 'Nonlinear score is not input-space distance.'}`;
  const formulas = [
    { label: 'Active objective and dimensions', tex: s.mode === 'hard' ? '\\min_{w,b}\\frac12\\lVert w\\rVert^2,\\quad y_i(w^Tx_i+b)\\ge1' : `\\min_{w,b}\\frac12\\lVert w\\rVert^2+${s.C}\\sum_i\\max(0,1-y_if_i)` },
    { label: 'Decision reconstruction', tex: 'f(x)=\\sum_i\\alpha_i y_i K(x_i,x)+b,\\quad\\sum_i\\alpha_i y_i=0' },
    { label: 'Active margin convention', tex: numerical.w ? 'd(x)=f(x)/\\lVert w\\rVert,\\quad\\gamma=1/\\lVert w\\rVert' : '\\lVert w\\rVert_{\\mathcal H}^2=(\\alpha\\odot y)^TK(\\alpha\\odot y),\\quad f(x)\\ne\\text{input distance}' },
  ];
  const inspector = [
    { label: 'X / y / α shapes', value: `${s.points.length} × 2 / ${s.points.length} × 1 / ${s.points.length} × 1`, detail: 'Batch rows; individual x and linear w are 2 × 1 columns.' },
    { label: 'Status', value: numerical.status, detail: numerical.reason },
    { label: 'w / b', value: `${numerical.w ? '[' + numerical.w.map(shown).join(', ') + ']' : 'Implicit or unavailable'} / ${shown(numerical.b)}` },
    { label: 'Norm² / half-margin', value: `${shown(numerical.norm2)} / ${shown(numerical.halfMargin)}`, detail: 'Nonlinear norms/margins refer to feature space; zero norm has no distance.' },
    { label: 'Primal / dual / gap', value: `${shown(numerical.primal)} / ${shown(numerical.dual)} / ${shown(numerical.gap)}`, detail: 'Sum hinge convention; no division by n. Training accuracy is a different metric.' },
    { label: 'KKT / equality / bounds residual', value: `${shown(numerical.kkt)} / ${shown(numerical.equality)} / ${shown(numerical.bounds)}` },
    { label: 'Pair steps / cap', value: `${numerical.iterations} / 1200`, detail: 'Hard fit is geometric, not iterative. Soft/kernel solutions are approximate.' },
  ];
  return { state: s, numerical, points, lines, surface, speech, formulas, inspector, fontSize: Math.max(16, 14.1 * 480 / width), hitRadius: Math.max(11, 23 * 480 / width) };
}
export function tradeoffTrace(s: SVMState) {
  validate(s);
  const states = s.mode === 'hard' ? ['anchor', 'separable', 'overlap', 'coincident'].map(name => preset(s, name as keyof typeof presets.presets)) : [.05, .25, 1, 4, 20].map(C => ({ ...s, C }));
  return traceFrom(states.map(state => ({ state, explanation: state.mode === 'hard' ? `Hand preset: ${state.points.map(p => p.id).join(', ')}. Recompute hull feasibility.` : `C=${state.C}; recompute the same sum-hinge objective. Edits branch from this frame.` })));
}
