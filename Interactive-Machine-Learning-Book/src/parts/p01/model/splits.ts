import { seeded } from '../../../platform/seed';
import { traceFrom } from '../../../platform/trace';
import { predictRegression } from '../../p02/model/linear-regression';

export type Partition = 'train' | 'validation' | 'test';
export const PARTITIONS: readonly Partition[] = ['train', 'validation', 'test'];
export interface GroupSample { readonly id: string; readonly group: string; readonly x: number; readonly y: number }
export interface SplitState { readonly samples: readonly GroupSample[]; readonly seed: number; readonly keepGroups: boolean; readonly assignments: Readonly<Record<string, Partition>>; readonly source: 'seeded' | 'manual' | 'distribution-shift' }
export const SPLIT_SAMPLES: readonly GroupSample[] = [0, 1, 2, 3, 4, 10].flatMap((x, i) => ['a', 'b'].map(copy => ({ id: `g${i + 1}-${copy}`, group: `g${i + 1}`, x, y: 2 * x + 1 })));

function samplesValid(samples: readonly GroupSample[]) {
  if (!Array.isArray(samples) || samples.length < 3 || samples.length > 64) throw new RangeError('A split experiment requires 3–64 samples.');
  const ids = new Set<string>();
  for (const row of samples) {
    if (typeof row.id !== 'string' || !row.id.trim() || ids.has(row.id) || typeof row.group !== 'string' || !row.group.trim() || !Number.isFinite(row.x) || !Number.isFinite(row.y) || Math.abs(row.x) > 20 || Math.abs(row.y) > 50) throw new RangeError('Samples need unique nonempty IDs, nonempty groups, finite |x| ≤ 20 and |y| ≤ 50.');
    ids.add(row.id);
  }
}
export function seedSplit(samples: readonly GroupSample[], seed: number, keepGroups: boolean): SplitState {
  samplesValid(samples);
  if (typeof keepGroups !== 'boolean') throw new RangeError('Group preservation must be true or false.');
  const random = seeded(seed);
  const units = [...new Set(samples.map(row => keepGroups ? row.group : row.id))].sort();
  if (units.length < 3) throw new RangeError('A seeded three-way split needs at least three independent groups or sample IDs.');
  for (let i = units.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [units[i], units[j]] = [units[j]!, units[i]!]; }
  const train = Math.max(1, Math.floor(units.length * 0.6)), validation = Math.max(1, Math.floor(units.length * 0.2));
  const memberships = Object.fromEntries(units.map((unit, i) => [unit, i < train ? 'train' : i < train + validation ? 'validation' : 'test'])) as Record<string, Partition>;
  return { samples: [...samples].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0), seed, keepGroups,
    assignments: Object.fromEntries([...samples].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).map(row => [row.id, memberships[keepGroups ? row.group : row.id]!])), source: 'seeded' };
}
export const SPLIT_CANONICAL = seedSplit(SPLIT_SAMPLES, 42, true);

export function assignSplit(state: SplitState, id: string, partition: Partition): SplitState {
  deriveSplit(state);
  const selected = state.samples.find(row => row.id === id);
  if (!selected || !PARTITIONS.includes(partition)) throw new RangeError('Choose an existing sample and a train/validation/test destination.');
  return { ...state, source: 'manual', assignments: Object.fromEntries(state.samples.map(row => [row.id,
    row.id === id || (state.keepGroups && row.group === selected.group) ? partition : state.assignments[row.id]!,
  ])) };
}
export function shiftSplit(state: SplitState): SplitState {
  deriveSplit(state);
  return { ...state, source: 'distribution-shift', assignments: Object.fromEntries(state.samples.map(row => [row.id, row.x <= 3 ? 'train' : row.x <= 4 ? 'validation' : 'test'])) };
}
export function deriveSplit(state: SplitState) {
  samplesValid(state.samples); seeded(state.seed);
  if (typeof state.keepGroups !== 'boolean' || !['seeded', 'manual', 'distribution-shift'].includes(state.source) ||
      Object.keys(state.assignments).length !== state.samples.length || state.samples.some(row => !PARTITIONS.includes(state.assignments[row.id]!))) throw new RangeError('Every sample ID must have exactly one valid partition, with no extra assignment IDs.');
  const groups = [...new Set(state.samples.map(row => row.group))].sort();
  const groupLeaks = groups.filter(group => new Set(state.samples.filter(row => row.group === group).map(row => state.assignments[row.id])).size > 1);
  if (state.keepGroups && groupLeaks.length) throw new RangeError('Group preservation forbids assigning members of one group to different partitions.');
  const rows = state.samples.map(row => ({ ...row, partition: state.assignments[row.id]! }));
  const train = rows.filter(row => row.partition === 'train');
  const mean = train.length ? train.reduce((sum, row) => sum + row.y, 0) / train.length : null;
  const signatures = [...new Set(rows.map(row => `${row.x}|${row.y}`))];
  const duplicateLeaks = signatures.filter(signature => new Set(rows.filter(row => `${row.x}|${row.y}` === signature).map(row => row.partition)).size > 1);
  const subsets = PARTITIONS.map(partition => {
    const data = rows.filter(row => row.partition === partition);
    const predictions = mean === null ? [] : data.map(row => ({ id: row.id, prediction: predictRegression(row.x, 0, mean), residual: mean - row.y }));
    const mse = mean === null || !data.length ? null : predictions.reduce((sum, row) => sum + row.residual ** 2, 0) / data.length;
    const reason = mean === null ? 'The training set is empty: its baseline mean is undefined.' : !data.length ? `No ${partition} samples: MSE is undefined.` : null;
    const outOfRange = !train.length ? [] : data.filter(row => row.x < Math.min(...train.map(item => item.x)) || row.x > Math.max(...train.map(item => item.x))).map(row => row.id);
    return { partition, rows: data, count: data.length, shape: [data.length, 1] as const, predictions, mse, reason, outOfRange };
  });
  return { state, rows, groups, groupLeaks, duplicateLeaks, baselineMean: mean, subsets,
    partitionCount: rows.length, provenance: 'Hand-authored toy rows; paired IDs represent repeated observations from one group. The seed chooses assignments, not data values.' };
}
export function splitTrace(state: SplitState) {
  deriveSplit(state);
  return traceFrom([0, 1, 2, 3].map(i => ({ state: i === 0 ? state : seedSplit(state.samples, (state.seed + i) >>> 0, state.keepGroups),
    explanation: i === 0 ? 'Starting assignments; no sample data changes.' : `Repartition with unsigned seed ${(state.seed + i) >>> 0}; preserve all sample IDs and data.` })));
}
export function splitDrop(clientX: number, clientY: number, zones: readonly { partition: Partition; left: number; right: number; top: number; bottom: number }[]): Partition | null {
  if (![clientX, clientY].every(Number.isFinite)) throw new RangeError('Pointer position must be finite.');
  return zones.find(zone => clientX >= zone.left && clientX <= zone.right && clientY >= zone.top && clientY <= zone.bottom)?.partition ?? null;
}
export function leakageExample(seed: number, distance = 10) {
  if (!Number.isFinite(distance) || distance < 6 || distance > 20) throw new RangeError('The held-out distance must be finite and between 6 and 20.');
  const offset = Math.floor(seeded(seed)() * 4);
  const trainX = [offset, offset + 2], validationX = offset + distance, validationTarget = distance - 1;
  const trainingMean = (trainX[0]! + trainX[1]!) / 2, wholeMean = (trainX[0]! + trainX[1]! + validationX) / 3;
  const honestPrediction = predictRegression(validationX - trainingMean, 1, 0);
  const leakedPrediction = predictRegression(validationX - wholeMean, 1, 0);
  return { seed, distance, offset, trainX, trainY: [-1, 1], validationX, validationTarget,
    trainingMean, wholeMean, honestPrediction, leakedPrediction,
    honestMSE: (honestPrediction - validationTarget) ** 2, leakedMSE: (leakedPrediction - validationTarget) ** 2,
    targetCentering: { trainingMean: 0, wholeMean: validationTarget / 3, honestMSE: validationTarget ** 2, leakedMSE: (validationTarget / 3 - validationTarget) ** 2 },
    reason: 'Whole-dataset feature centering reads held-out x before evaluation. Here it worsens validation error; leakage is invalid regardless of its direction. Whole-target centering also reads held-out y and makes the constant baseline look better.' };
}
