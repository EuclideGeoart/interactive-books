import { traceFrom, type TraceFrame } from '../../../platform/trace';

export interface Sample {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface RegressionState {
  readonly samples: readonly Sample[];
  readonly weight: number;
  readonly bias: number;
  readonly learningRate: number;
}

export const CANONICAL_REGRESSION: RegressionState = Object.freeze({
  samples: Object.freeze([
    { id: 's1', x: -2, y: -3 },
    { id: 's2', x: -1, y: -1 },
    { id: 's3', x: 0, y: 1 },
    { id: 's4', x: 1, y: 3 },
    { id: 's5', x: 2, y: 4 },
  ].map(sample => Object.freeze(sample))),
  weight: 0.5,
  bias: 0,
  learningRate: 0.1,
});

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${label} must be finite; input or arithmetic overflow is invalid.`);
  return value;
}

export function predictRegression(x: number, weight: number, bias: number): number {
  finite(x, 'Prediction x');
  finite(weight, 'Weight');
  finite(bias, 'Bias');
  return finite(finite(weight * x, 'prediction weight × x') + bias, 'prediction');
}

export function deriveRegression(state: RegressionState) {
  if (!state || !Array.isArray(state.samples) || state.samples.length < 1 || state.samples.length > 64) {
    throw new RangeError('Regression requires 1 to 64 samples.');
  }
  const weight = finite(state.weight, 'Weight');
  const bias = finite(state.bias, 'Bias');
  const learningRate = finite(state.learningRate, 'Learning rate');
  if (learningRate <= 0 || learningRate > 1) throw new RangeError('Learning rate must be greater than 0 and at most 1.');
  const ids = new Set<string>();
  const rows: (Sample & { readonly prediction: number; readonly residual: number; readonly squaredError: number })[] = [];
  let squaredSum = 0, residualSum = 0, residualXSum = 0;
  for (const sample of state.samples) {
    if (!sample || typeof sample.id !== 'string' || !sample.id.trim() || ids.has(sample.id)) {
      throw new RangeError('Sample IDs must be nonempty strings and unique.');
    }
    ids.add(sample.id);
    const x = finite(sample.x, `Sample ${sample.id} x`);
    const y = finite(sample.y, `Sample ${sample.id} y`);
    const prediction = predictRegression(x, weight, bias);
    const residual = finite(prediction - y, `Sample ${sample.id} residual`);
    const squaredError = finite(residual * residual, `Sample ${sample.id} squared error`);
    squaredSum = finite(squaredSum + squaredError, 'Squared-error sum');
    residualSum = finite(residualSum + residual, 'Residual sum');
    residualXSum = finite(residualXSum + finite(residual * x, `Sample ${sample.id} residual × x`), 'Weighted-residual sum');
    rows.push({ id: sample.id, x, y, prediction, residual, squaredError });
  }
  const n = rows.length;
  const gradients = {
    weight: finite((2 / n) * residualXSum, 'Weight gradient'),
    bias: finite((2 / n) * residualSum, 'Bias gradient'),
  };
  return {
    rows,
    mse: finite(squaredSum / n, 'MSE'),
    gradients,
    next: {
      weight: finite(weight - learningRate * gradients.weight, 'Updated weight'),
      bias: finite(bias - learningRate * gradients.bias, 'Updated bias'),
    },
    shapes: { X: [n, 1] as const, weights: [1, 1] as const, targets: [n, 1] as const },
  };
}

export function regressionStep(state: RegressionState): RegressionState {
  const next = { ...state, ...deriveRegression(state).next };
  deriveRegression(next);
  return next;
}

export function regressionTrace(state: RegressionState, steps: number): readonly TraceFrame<RegressionState>[] {
  if (!Number.isInteger(steps) || steps < 0 || steps > 20) throw new RangeError('Trace steps must be an integer from 0 to 20.');
  deriveRegression(state);
  const frames = [{ state }];
  for (let i = 0; i < steps; i++) {
    state = regressionStep(state);
    frames.push({ state });
  }
  return traceFrom(frames);
}
