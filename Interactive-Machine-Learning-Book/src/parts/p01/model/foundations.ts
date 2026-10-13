import { traceFrom } from '../../../platform/trace';
import { CANONICAL_REGRESSION, deriveRegression, predictRegression, regressionStep, type RegressionState } from '../../p02/model/linear-regression';

export interface PipelineState {
  readonly regression: RegressionState;
  readonly mode: 'training' | 'inference';
  readonly sampleId: string;
  readonly query: number;
}
export const PIPELINE_CANONICAL: PipelineState = { regression: CANONICAL_REGRESSION, mode: 'training', sampleId: 's3', query: 1.5 };

export function derivePipeline(state: PipelineState) {
  if (!['training', 'inference'].includes(state.mode) || !Number.isFinite(state.query) || Math.abs(state.query) > 5) throw new RangeError('Choose a training/inference mode and a finite query between −5 and 5.');
  const numerical = deriveRegression(state.regression);
  if (Math.abs(state.regression.weight) > 4 || Math.abs(state.regression.bias) > 4 || state.regression.learningRate < 0.001 || state.regression.samples.some(row => Math.abs(row.x) > 5 || Math.abs(row.y) > 5)) throw new RangeError('Predictor or observations are outside this sheet’s supported range. Previous state preserved.');
  const row = numerical.rows.find(sample => sample.id === state.sampleId);
  if (!row) throw new RangeError('Select an existing sample ID.');
  const x = state.mode === 'training' ? row.x : state.query;
  const prediction = predictRegression(x, state.regression.weight, state.regression.bias);
  return { state, numerical, x, prediction, target: state.mode === 'training' ? row.y : null,
    residual: state.mode === 'training' ? row.residual : null,
    loss: state.mode === 'training' ? numerical.mse : null,
    reason: state.mode === 'inference' ? 'The query has no observed target. Inference produces a prediction, without an error or parameter update.' : null,
    inputShape: [1, 1] as const, batchShape: numerical.shapes.X, weightShape: numerical.shapes.weights,
  };
}
export function pipelineUpdate(state: PipelineState): PipelineState {
  if (state.mode !== 'training') throw new RangeError('Inference does not update parameters; return to training to use observed targets.');
  const next = { ...state, regression: regressionStep(state.regression) };
  derivePipeline(next);
  return next;
}
export function pipelineTrace(state: PipelineState) {
  derivePipeline(state);
  if (state.mode === 'inference') return traceFrom([
    { state, explanation: '1. Receive a query x; no target is observed.' },
    { state, explanation: '2. Represent x as a 1 × 1 feature column.' },
    { state, explanation: '3. Apply the learned predictor. Parameters remain fixed.' },
  ]);
  return traceFrom([
    { state, explanation: '1. Observe the selected sample’s input and target.' },
    { state, explanation: '2. Represent its input as a feature column; samples occupy rows in the batch.' },
    { state, explanation: '3. Predict with the current shared weight and bias.' },
    { state, explanation: '4. Compare prediction with target; compute the batch loss and gradient.' },
    { state: pipelineUpdate(state), explanation: '5. Subtract one old-state gradient from both parameters simultaneously.' },
  ]);
}

export interface FeatureSample { readonly id: string; readonly values: readonly number[]; readonly target: number | string | null }
export interface FeatureState { readonly samples: readonly FeatureSample[]; readonly sampleCount: number; readonly featureCount: number; readonly targetKind: 'quantity' | 'category' | 'none' }
export const FEATURE_COLUMNS = [
  { name: 'Study time', unit: 'hours', integer: false, max: 12 },
  { name: 'Practice tasks', unit: 'count', integer: true, max: 20 },
  { name: 'Sleep time', unit: 'hours', integer: false, max: 12 },
] as const;
export const FEATURE_CANONICAL: FeatureState = { samples: [
  { id: 'r1', values: [0, 0, 6], target: 1 }, { id: 'r2', values: [1, 2, 8], target: 3 },
  { id: 'r3', values: [2, 3, 7], target: 5 }, { id: 'r4', values: [3, 4, 8], target: 7 },
  { id: 'r5', values: [4, 5, 6], target: 9 }, { id: 'r6', values: [5, 8, 7], target: 11 },
], sampleCount: 4, featureCount: 2, targetKind: 'quantity' };
export function deriveFeatures(state: FeatureState) {
  if (!Array.isArray(state.samples) || state.samples.length !== 6 || !Number.isInteger(state.sampleCount) || state.sampleCount < 1 || state.sampleCount > 6 || !Number.isInteger(state.featureCount) || state.featureCount < 1 || state.featureCount > 3 || !['quantity', 'category', 'none'].includes(state.targetKind)) throw new RangeError('This schema requires 1–6 active samples, 1–3 features, and a supported target kind.');
  const samples: readonly FeatureSample[] = state.samples;
  const ids = new Set<string>();
  for (const row of samples) {
    if (typeof row.id !== 'string' || !row.id.trim() || ids.has(row.id) || row.values.length !== 3) throw new RangeError('Sample IDs must be unique and nonempty; every stored row has three feature values.');
    ids.add(row.id);
    row.values.forEach((value, j) => { const column = FEATURE_COLUMNS[j]!;
      if (!Number.isFinite(value) || value < 0 || value > column.max || (column.integer && !Number.isInteger(value))) throw new RangeError(`${column.name} must be a finite ${column.integer ? 'integer ' : ''}value between 0 and ${column.max}.`);
    });
    if (state.targetKind === 'quantity' && (typeof row.target !== 'number' || !Number.isFinite(row.target) || row.target < 0 || row.target > 20)) throw new RangeError('Quantity targets must be finite scores between 0 and 20.');
    if (state.targetKind === 'category' && !['ready', 'practice'].includes(String(row.target))) throw new RangeError('Choose ready or practice as the category label.');
    if (state.targetKind === 'none' && row.target !== null) throw new RangeError('An unlabelled schema has no target values.');
  }
  const rows = samples.slice(0, state.sampleCount);
  return { state, rows, columns: FEATURE_COLUMNS.slice(0, state.featureCount),
    X: rows.map(row => row.values.slice(0, state.featureCount)), y: state.targetKind === 'none' ? null : rows.map(row => [row.target]),
    shapes: { X: [rows.length, state.featureCount] as const, weights: [state.featureCount, 1] as const,
      targets: state.targetKind === 'none' ? null : [rows.length, 1] as const },
    targetReason: state.targetKind === 'none' ? 'No observed target column; an unsupervised goal must be specified separately.' : null,
  };
}
export function featureTargetKind(state: FeatureState, targetKind: FeatureState['targetKind']): FeatureState {
  return { ...state, targetKind, samples: state.samples.map((row, i) => ({ ...row,
    target: targetKind === 'none' ? null : targetKind === 'category' ? (Number(FEATURE_CANONICAL.samples[i]!.target) >= 7 ? 'ready' : 'practice') : FEATURE_CANONICAL.samples[i]!.target,
  })) };
}

export type LearningTask = 'regression' | 'classification' | 'unsupervised';
export const TASKS = [
  { id: 'price', name: 'Predict a price', goal: 'Predict sale price in euros from area and age.', features: [[40, 10], [70, 5], [100, 1]], targets: [100000, 180000, 260000], kind: 'quantity', expected: 'regression' },
  { id: 'spam', name: 'Predict an email category', goal: 'Predict spam or ordinary mail from two counts.', features: [[0, 2], [6, 0], [1, 4]], targets: ['ordinary', 'spam', 'ordinary'], kind: 'category', expected: 'classification' },
  { id: 'binary-code', name: 'Predict a category coded 0/1', goal: 'Predict an observed category; 0 and 1 are identifiers, not amounts.', features: [[1, 2], [3, 0], [2, 1]], targets: [0, 1, 0], kind: 'category', expected: 'classification' },
  { id: 'proportion', name: 'Predict a measured proportion', goal: 'Predict a measured fraction of time in sunlight, including intermediate values.', features: [[1, 2], [3, 0], [2, 1]], targets: [0, 0.4, 1], kind: 'quantity', expected: 'regression' },
  { id: 'customers', name: 'Group customers', goal: 'Find groups using spending and visit counts; no target is supplied.', features: [[2, 1], [3, 2], [12, 9]], targets: null, kind: 'none', expected: 'unsupervised' },
  { id: 'ignore-label', name: 'Explore features without using labels', goal: 'Group observations by features; recorded labels are deliberately excluded from this goal.', features: [[1, 1], [2, 2], [9, 8]], targets: ['a', 'a', 'b'], kind: 'ignored', expected: 'unsupervised' },
] as const;
export interface TaskState { readonly scenario: string; readonly choice: LearningTask }
export const TASK_CANONICAL: TaskState = { scenario: 'price', choice: 'unsupervised' };
export function deriveTask(state: TaskState) {
  const scenario = TASKS.find(task => task.id === state.scenario);
  if (!scenario || !['regression', 'classification', 'unsupervised'].includes(state.choice)) throw new RangeError('Choose an available problem and learning task.');
  const usesTarget = scenario.kind === 'quantity' || scenario.kind === 'category';
  return { state, scenario, usesTarget, correct: state.choice === (!usesTarget ? 'unsupervised' : scenario.kind === 'category' ? 'classification' : 'regression'),
    supervision: usesTarget ? 'Supervised' : 'Unsupervised',
    shapes: { X: [scenario.features.length, scenario.features[0]!.length] as const,
      targets: usesTarget ? [scenario.features.length, 1] as const : null },
    reason: scenario.kind === 'ignored' ? 'Labels exist, but this grouping goal does not use them.' : !usesTarget ? 'No target is observed; this goal explores feature structure.' : scenario.kind === 'category' ? 'The target denotes a category, including when its code is numeric.' : 'The target is a numerical amount or measured proportion.',
  };
}
