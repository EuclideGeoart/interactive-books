import { seeded } from '../../../platform/seed';
import { traceFrom } from '../../../platform/trace';
import { predictRegression, type Sample } from '../../p02/model/linear-regression';
import { assignSplit, deriveSplit, PARTITIONS, seedSplit, type Partition, type SplitState } from './splits';

export interface CapacityState {
  readonly seed: number; readonly degree: number; readonly noise: number;
  readonly assignments?: Readonly<Record<string, Partition>>;
  readonly splitSeed?: number;
  readonly source?: 'interleaved' | 'seeded' | 'manual' | 'distribution-shift';
}
export const CAPACITY_CANONICAL: CapacityState = { seed: 42, degree: 2, noise: 0.5, splitSeed: 42, source: 'interleaved' };
export interface CapacitySample extends Sample { readonly partition: Partition; readonly truth: number }
export const CAPACITY_RANK_THRESHOLD = 1e-12;
export const CAPACITY_RANK_REASON = 'The polynomial design is numerically rank deficient: a reorthogonalized QR column norm is ≤ 1e−12 times the design Frobenius norm.';

function observations(state: CapacityState) {
  if (!Number.isInteger(state.degree) || state.degree < 0 || state.degree > 8 || !Number.isFinite(state.noise) || state.noise < 0 || state.noise > 2) throw new RangeError('Choose integer capacity 0–8 and finite noise 0–2.');
  const random = seeded(state.seed);
  return Array.from({ length: 17 }, (_, i) => {
    const x = -1 + i / 8, truth = predictRegression(x, predictRegression(x, -1, 2), 1);
    const noise = state.noise * (Math.floor(random() * 5) - 2) / 2;
    return { id: `p${i + 1}`, group: `p${i + 1}`, x, y: truth + noise, truth };
  });
}
export function capacitySplit(state: CapacityState): SplitState {
  const samples = observations(state);
  const source = state.source ?? 'interleaved';
  if (!['interleaved', 'seeded', 'manual', 'distribution-shift'].includes(source)) throw new RangeError('Unknown capacity assignment provenance.');
  const split = { samples, seed: state.splitSeed ?? 42, keepGroups: false,
    assignments: state.assignments ?? Object.fromEntries(samples.map((row, i) => [row.id, i % 2 === 0 ? 'train' : 'validation'])),
    source: source === 'interleaved' ? 'manual' as const : source };
  deriveSplit(split);
  return split;
}
export function capacityData(state: CapacityState): readonly CapacitySample[] {
  const split = capacitySplit(state);
  return observations(state).map(row => ({ id: row.id, x: row.x, y: row.y, truth: row.truth, partition: split.assignments[row.id]! }));
}
export function assignCapacity(state: CapacityState, id: string, partition: Partition): CapacityState {
  const split = assignSplit(capacitySplit(state), id, partition);
  return { ...state, assignments: split.assignments, source: 'manual' };
}
export function presetCapacitySplit(state: CapacityState, source: 'interleaved' | 'seeded' | 'distribution-shift', splitSeed = state.splitSeed ?? 42): CapacityState {
  const samples = observations(state); seeded(splitSeed);
  const assignments = source === 'seeded' ? seedSplit(samples, splitSeed, false).assignments :
    Object.fromEntries(samples.map((row, i) => [row.id, source === 'interleaved' ? (i % 2 === 0 ? 'train' : 'validation') : row.x <= 0 ? 'train' : row.x <= 0.5 ? 'validation' : 'test']));
  const next = { ...state, assignments, splitSeed, source }; capacitySplit(next); return next;
}
export function polynomialPrediction(x: number, coefficients: readonly number[]): number {
  if (!coefficients.length || coefficients.length > 9 || !Number.isFinite(x)) throw new RangeError('A polynomial requires 1–9 coefficients and a finite input.');
  return coefficients.reduceRight((value, coefficient) => predictRegression(x, value, coefficient), 0);
}
// Both canonical runtimes use this bounded two-pass MGS QR decision; Fraction and SVD are independent checks.
export function fitCapacity(samples: readonly Sample[], degree: number) {
  if (!Number.isInteger(degree) || degree < 0 || degree > 8 || samples.length > 64 || samples.some(row => !Number.isFinite(row.x) || !Number.isFinite(row.y) || Math.abs(row.x) > 1 || Math.abs(row.y) > 10)) throw new RangeError('Capacity fitting uses at most 64 finite samples on |x| ≤ 1, |y| ≤ 10, and degree 0–8.');
  if (new Set(samples.map(row => row.id)).size !== samples.length || samples.some(row => typeof row.id !== 'string' || !row.id.trim())) throw new RangeError('Capacity sample IDs must be unique and nonempty.');
  const d = degree + 1;
  if (!samples.length) return { coefficients: null, reason: 'The training set is empty: coefficients and baseline are undefined.' };
  if (new Set(samples.map(row => row.x)).size < d) return { coefficients: null, reason: 'Too few distinct training inputs for a unique polynomial coefficient vector.' };
  const columns = Array.from({ length: d }, (_, j) => samples.map(row => row.x ** j));
  const cutoff = CAPACITY_RANK_THRESHOLD * Math.hypot(...columns.flat());
  const Q: number[][] = [], R = Array.from({ length: d }, () => Array(d).fill(0) as number[]);
  for (let j = 0; j < d; j++) {
    const v = [...columns[j]!];
    for (let pass = 0; pass < 2; pass++) for (let k = 0; k < j; k++) {
      const projection = Q[k]!.reduce((sum, value, i) => sum + value * v[i]!, 0);
      R[k]![j] = R[k]![j]! + projection;
      for (let i = 0; i < v.length; i++) v[i] = v[i]! - projection * Q[k]![i]!;
    }
    const norm = Math.hypot(...v);
    if (!Number.isFinite(norm) || norm <= cutoff) return { coefficients: null, reason: CAPACITY_RANK_REASON };
    R[j]![j] = norm; Q.push(v.map(value => value / norm));
  }
  const coefficients = Array(d).fill(0) as number[];
  const projected = Q.map(column => column.reduce((sum, value, i) => sum + value * samples[i]!.y, 0));
  for (let j = d - 1; j >= 0; j--) {
    let value = projected[j]!;
    for (let k = j + 1; k < d; k++) value -= R[j]![k]! * coefficients[k]!;
    coefficients[j] = value / R[j]![j]!;
  }
  if (!coefficients.every(Number.isFinite)) throw new RangeError('Polynomial fit arithmetic is non-finite.');
  return { coefficients, reason: null };
}
export function deriveCapacity(state: CapacityState) {
  const samples = capacityData(state), split = deriveSplit(capacitySplit(state)), training = samples.filter(row => row.partition === 'train');
  const fit = fitCapacity(training, state.degree), mean = split.baselineMean;
  const rows = samples.map(row => {
    const prediction = fit.coefficients ? polynomialPrediction(row.x, fit.coefficients) : null;
    const baseline = mean === null ? null : predictRegression(row.x, 0, mean);
    return { ...row, prediction, residual: prediction === null ? null : prediction - row.y,
      squaredError: prediction === null ? null : (prediction - row.y) ** 2,
      baseline, baselineSquaredError: baseline === null ? null : (baseline - row.y) ** 2 };
  });
  const errors = PARTITIONS.map(partition => {
    const data = rows.filter(row => row.partition === partition);
    return { partition, count: data.length,
      mse: fit.coefficients && data.length ? data.reduce((sum, row) => sum + row.squaredError!, 0) / data.length : null,
      baselineMSE: mean !== null && data.length ? data.reduce((sum, row) => sum + row.baselineSquaredError!, 0) / data.length : null,
      reason: !data.length ? `No ${partition} samples: MSE is undefined.` : fit.reason };
  });
  const curve = Array.from({ length: 81 }, (_, i) => { const x = -1 + i / 40;
    return { x, prediction: fit.coefficients ? polynomialPrediction(x, fit.coefficients) : null,
      truth: predictRegression(x, predictRegression(x, -1, 2), 1), baseline: mean };
  });
  return { state, samples, rows, coefficients: fit.coefficients, reason: fit.reason, baselineMean: mean, errors, curve,
    trainingIds: training.map(row => row.id), split,
    shapes: { X: [training.length, state.degree + 1] as const, weights: [state.degree + 1, 1] as const, targets: [training.length, 1] as const },
    provenance: `Hand-authored x grid and quadratic signal; bounded synthetic noise uses seed ${state.seed}. Assignments: ${state.source ?? 'interleaved'}. Interleaved reset trains even grid indices (p1, p3, …); validates odd indices (p2, p4, …). Split seed ${state.splitSeed ?? 42} is used only by seeded repartitioning.` };
}
export function capacityCandidates(state: CapacityState) {
  const candidates = Array.from({ length: 9 }, (_, degree) => { const d = deriveCapacity({ ...state, degree });
    return { degree, trainingMSE: d.errors[0]!.mse, validationMSE: d.errors[1]!.mse };
  });
  const finite = candidates.filter(row => row.validationMSE !== null);
  const selected = finite.length ? finite.reduce((best, row) => row.validationMSE! < best.validationMSE! - 1e-12 ? row : best) : null;
  return { candidates, selectedDegree: selected?.degree ?? null, reason: selected ? null : 'No defined validation losses: capacity selection is undefined.' };
}
export function capacityTrace(state: CapacityState) {
  const active = deriveCapacity(state);
  return traceFrom([0, 2, 8].map(degree => ({ state: { ...state, degree }, explanation: `Degree ${degree}: fit only training IDs ${active.trainingIds.join(', ') || '(empty)'}; preserve the displayed observations and memberships.` })));
}
