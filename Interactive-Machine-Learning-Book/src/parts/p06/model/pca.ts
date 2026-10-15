import { traceFrom } from '../../../platform/trace';

export type Vec2 = readonly [number, number];
export interface Point { readonly id: string; readonly x: Vec2 }
export interface PCAState { readonly points: readonly Point[]; readonly normalization: 'sample' | 'population'; readonly k: number }
export const CLOUD: readonly Point[] = [
  { id: 'a', x: [-2, -1] }, { id: 'b', x: [-1, -2] },
  { id: 'c', x: [1, 2] }, { id: 'd', x: [2, 1] },
];
export const CANONICAL: PCAState = { points: CLOUD, normalization: 'sample', k: 1 };
export function finite(value: number, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError(`${label} must be finite; arithmetic overflow is rejected.`);
  return value + 0;
}
export function validateState(s: PCAState): void {
  if (!s || (s.normalization !== 'sample' && s.normalization !== 'population')) throw new RangeError('Normalization must be sample or population.');
  if (!Number.isInteger(s.k) || s.k < 0 || s.k > 2) throw new RangeError('Component count must be an integer from 0 to 2.');
  if (!Array.isArray(s.points) || s.points.length < 1 || s.points.length > 128) throw new RangeError('Use 1 to 128 dense two-feature observations.');
  const ids = new Set<string>();
  for (let i = 0; i < s.points.length; i++) {
    const p = s.points[i];
    if (!p || typeof p.id !== 'string' || !p.id.trim() || ids.has(p.id)) throw new RangeError('Point IDs must be nonempty unique strings.');
    ids.add(p.id);
    if (!Array.isArray(p.x) || p.x.length !== 2) throw new RangeError('Each observation must have exactly two dense components.');
    for (let j = 0; j < 2; j++) finite(p.x[j]!, 'Observation component');
  }
}
const dot = (x: Vec2, v: Vec2) => finite(finite(x[0] * v[0], 'Dot product') + finite(x[1] * v[1], 'Dot product'), 'Dot product');
const energy = (values: readonly number[]) => values.reduce((s, x) => {
  const square = finite(x * x, 'Squared component');
  if (x !== 0 && square === 0) throw new RangeError('Squared component underflow: rescale the observations.');
  return finite(s + square, 'Sum of squares');
}, 0);

function normalizedEnergy(values: readonly number[], divisor: number): number {
  const total = energy(values), value = finite(total / divisor, 'Normalized energy');
  if (total > 0 && value === 0) throw new RangeError('Variance underflow: rescale the observations.');
  return value;
}

/** Row-batch X is n×2; each mathematical observation/direction is a 2×1 column. */
export function pca(s: PCAState) {
  validateState(s); // shapes, holes and options are rejected before singleton/constant cases
  const n = s.points.length;
  const mean = [0, 1].map(j => {
    const first = s.points[0]!.x[j]!;
    if (s.points.every(p => p.x[j] === first)) return first;
    const averageDelta = s.points.reduce((sum, p) => finite(sum + finite(p.x[j]! - first, 'Mean difference') / n, 'Mean accumulation'), 0);
    return finite(first + averageDelta, 'Mean');
  }) as [number, number];
  const centered = s.points.map(p => [finite(p.x[0] - mean[0], 'Centering'), finite(p.x[1] - mean[1], 'Centering')] as Vec2);
  const products = centered.map(x => [finite(x[0] * x[0], 'Squared x'), finite(x[0] * x[1], 'Cross product'), finite(x[1] * x[1], 'Squared y')] as const);
  const divisor = s.normalization === 'sample' ? n - 1 : n;
  if (divisor === 0) return { status: 'undefined' as const, reason: 'Sample covariance needs n ≥ 2; n−1 is zero.', n, mean, centered, products, divisor };
  const a = normalizedEnergy(centered.map(x => x[0]), divisor);
  const c = normalizedEnergy(centered.map(x => x[1]), divisor);
  const b = finite(centered.reduce((sum, x) => finite(sum + finite(x[0] * x[1], 'Cross product'), 'Covariance sum'), 0) / divisor, 'Covariance');
  const repeated = a === c && b === 0;
  const scale = Math.max(a, c, Math.abs(b));
  let v1: Vec2 = [1, 0];
  let large = 0;
  if (scale > 0) {
    const A = a / scale, B = b / scale, C = c / scale;
    const L = (A + C) / 2 + Math.hypot((A - C) / 2, B);
    large = finite(scale * L, 'Largest eigenvalue');
    if (b === 0) v1 = a >= c ? [1, 0] : [0, 1];
    else {
      // Choose the longer eigenvector formula, avoiding cancellation in L−A or L−C.
      const raw: Vec2 = A >= C ? [L - C, B] : [B, L - A];
      const norm = Math.hypot(...raw);
      if (norm === 0) throw new RangeError('Eigenvector scaling underflow: direction is unresolved in binary64.');
      const sign = raw[0] < 0 || (raw[0] === 0 && raw[1] < 0) ? -1 : 1;
      v1 = [sign * raw[0] / norm, sign * raw[1] / norm];
    }
  }
  const v2: Vec2 = [-v1[1], v1[0]];
  let axes: readonly [Vec2, Vec2] = [v1, v2];
  let scores = centered.map(x => axes.map(v => dot(x, v)) as [number, number]);
  // Direct discarded-direction energy keeps small positive spread; no tolerance-based zeroing.
  let small = normalizedEnergy(scores.map(z => z[1]), divisor);
  if (small > large) {
    [large, small] = [small, large]; axes = [v2, v1];
    scores = scores.map(z => [z[1], z[0]]); v1 = axes[0];
  }
  const eigenvalues = [large, small] as const;
  const totalVariance = finite(large + small, 'Total variance');
  const ratios = totalVariance === 0 ? null : eigenvalues.map(v => v / totalVariance);
  const retained = ratios === null ? null : ratios.slice(0, s.k).reduce((sum, v) => sum + v, 0);
  const rows = s.points.map((p, i) => {
    const z = scores[i]!;
    const reconstructed: Vec2 = s.k === 2 ? [p.x[0], p.x[1]] : [0, 1].map(j =>
      finite(mean[j]! + (s.k === 1 ? finite(z[0] * v1[j]!, 'Reconstruction product') : 0), 'Reconstruction')) as [number, number];
    const residual: Vec2 = [finite(p.x[0] - reconstructed[0], 'Residual'), finite(p.x[1] - reconstructed[1], 'Residual')];
    return { id: p.id, x: p.x, centered: centered[i]!, scores: z.slice(0, s.k), fullScores: z, reconstructed, residual, squaredError: energy(residual) };
  });
  const sse = finite(rows.reduce((sum, r) => finite(sum + r.squaredError, 'Reconstruction SSE'), 0), 'SSE');
  return { status: 'defined' as const, n, divisor, mean, centered, products, covariance: [[a, b], [b, c]] as const,
    axes, eigenvalues, totalVariance, ratios, retained, repeated, zeroVariance: totalVariance === 0,
    rows, sse, mse: sse / n, entryMse: sse / (2 * n),
    // A conditioning warning does not change values, classify rank or manufacture a zero.
    nearRepeated: !repeated && Math.abs(large - small) <= 64 * Number.EPSILON * totalVariance,
  };
}
export function editPoint(s: PCAState, id: string, coordinate: Partial<{ x: number; y: number }>): PCAState {
  validateState(s);
  if (!s.points.some(p => p.id === id)) throw new RangeError('Unknown point ID.');
  for (const value of Object.values(coordinate)) finite(value, 'Edited coordinate');
  const next = { ...s, points: s.points.map(p => p.id === id ? { ...p, x: [coordinate.x ?? p.x[0], coordinate.y ?? p.x[1]] as Vec2 } : p) };
  pca(next); return next;
}
export function componentTrace(s: PCAState) {
  pca(s);
  return traceFrom([0, 1, 2].map(k => ({ state: { ...s, k }, explanation: `Retain ${k} components of the displayed cloud; refit the same centered data. Frame changes k, not a solver iteration.` })));
}
