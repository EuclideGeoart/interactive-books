import { formatNumber } from '../../platform/format';
import { CANONICAL_REGRESSION, deriveRegression, predictRegression, type RegressionState } from './model/linear-regression';

export const REGRESSION_UI = {
  weight: { min: -4, max: 4 }, bias: { min: -4, max: 4 },
  learningRate: { min: 0.001, max: 1 }, sample: { min: -5, max: 5 },
  coordinateStep: 0.1,
} as const;

// A square viewBox and one shared scale preserve equal x/y units at every rendered width.
export const REGRESSION_PLANE = { size: 640, min: -6, max: 6, edge: 56, origin: 320, scale: 44 } as const;
const projectX = (x: number) => REGRESSION_PLANE.origin + REGRESSION_PLANE.scale * x;
const projectY = (y: number) => REGRESSION_PLANE.origin - REGRESSION_PLANE.scale * y;

function supported(state: RegressionState): void {
  for (const key of ['weight', 'bias', 'learningRate'] as const) {
    const { min, max } = REGRESSION_UI[key];
    if (!Number.isFinite(state[key]) || state[key] < min || state[key] > max) {
      throw new RangeError(`${key === 'learningRate' ? 'Learning rate' : key === 'weight' ? 'Weight' : 'Bias'} is outside this experiment's supported range ${min} to ${max}. State preserved; change the parameters or use a smaller learning rate.`);
    }
  }
  for (const sample of state.samples) {
    if (sample.x < REGRESSION_UI.sample.min || sample.x > REGRESSION_UI.sample.max ||
        sample.y < REGRESSION_UI.sample.min || sample.y > REGRESSION_UI.sample.max) {
      throw new RangeError(`Sample ${sample.id} coordinates must be between −5 and 5. State preserved.`);
    }
  }
}

export function deriveRegressionLesson(state: RegressionState, renderedWidth = 320) {
  const numerical = deriveRegression(state);
  supported(state);
  if (!Number.isFinite(renderedWidth) || renderedWidth <= 0) throw new RangeError('Plot width must be positive and finite.');
  const { size, min, max, edge, origin, scale } = REGRESSION_PLANE;
  const hitRadius = Math.max(11, 23 * size / renderedWidth);
  const fontSize = Math.max(16, 14 * size / renderedWidth);
  const markRadius = 7;
  const diamondRadius = 8;
  let left: number = min, right: number = max;
  const leftY = predictRegression(left, state.weight, state.bias);
  const rightY = predictRegression(right, state.weight, state.bias);
  if (leftY < min || leftY > max) left = ((leftY < min ? min : max) - state.bias) / state.weight;
  if (rightY < min || rightY > max) right = ((rightY < min ? min : max) - state.bias) / state.weight;
  const lineY1 = predictRegression(left, state.weight, state.bias);
  const lineY2 = predictRegression(right, state.weight, state.bias);
  const points = numerical.rows.map(row => {
    const cx = projectX(row.x), cy = projectY(row.y), py = projectY(row.prediction);
    return {
      ...row, cx, cy, py, markRadius, hitRadius, selectedRadius: markRadius + 5,
      residual: { x1: cx, y1: cy, x2: cx, y2: py },
      diamond: `M ${cx} ${py - diamondRadius} L ${cx + diamondRadius} ${py} L ${cx} ${py + diamondRadius} L ${cx - diamondRadius} ${py} Z`,
      label: { x: cx + markRadius + 5, y: cy - markRadius - 5, text: row.id },
      name: `Sample ${row.id}: x ${row.x}, target ${row.y}. Arrow keys move by 0.1; Shift moves by 0.5.`,
      speech: `Sample ${row.id}, x ${row.x}, target ${row.y}, prediction approximately ${formatNumber(row.prediction)}, residual approximately ${formatNumber(row.residual)}.`,
    };
  });
  const ticks = [-4, -2, 0, 2, 4].flatMap(value => [
    { key: `x${value}`, x1: projectX(value), y1: origin - 4, x2: projectX(value), y2: origin + 4,
      labelX: projectX(value), labelY: origin + fontSize + 8, text: formatNumber(value), anchor: 'middle' as const },
    ...(value === 0 ? [] : [{ key: `y${value}`, x1: origin - 4, y1: projectY(value), x2: origin + 4, y2: projectY(value),
      labelX: origin - 12, labelY: projectY(value) + fontSize / 3, text: formatNumber(value), anchor: 'end' as const }]),
  ]);
  const scalars = [
    { key: 'mse', label: 'Mean squared error', number: numerical.mse },
    { key: 'gradient-weight', label: 'Weight gradient dw', number: numerical.gradients.weight },
    { key: 'gradient-bias', label: 'Bias gradient db', number: numerical.gradients.bias },
    { key: 'next-weight', label: 'Next weight', number: numerical.next.weight },
    { key: 'next-bias', label: 'Next bias', number: numerical.next.bias },
  ].map(value => ({ ...value, text: `≈ ${formatNumber(value.number)}` }));
  const originalSamples = state.samples.length === CANONICAL_REGRESSION.samples.length &&
    state.samples.every((sample, i) => {
      const original = CANONICAL_REGRESSION.samples[i]!;
      return sample.id === original.id && sample.x === original.x && sample.y === original.y;
    });
  const tex = (value: number) => formatNumber(value).replace('−', '-');
  const n = numerical.rows.length;
  return {
    ...numerical, state, points, scalars,
    rows: numerical.rows.map(row => ({ ...row, text: {
      x: String(row.x), y: String(row.y), prediction: `≈ ${formatNumber(row.prediction)}`,
      residual: `≈ ${formatNumber(row.residual)}`, squaredError: `≈ ${formatNumber(row.squaredError)}`,
    } })),
    provenance: `Hand-authored toy data · ${originalSamples ? 'original observations' : 'observations edited in this experiment'}`,
    speech: `Weight ${state.weight}, bias ${state.bias}, learning rate ${state.learningRate}. Mean squared error approximately ${formatNumber(numerical.mse)}.`,
    inspector: [
      { label: 'Samples', value: String(n), detail: 'Each row is one observation; vectors are columns.' },
      { label: 'X · feature batch', value: `${numerical.shapes.X[0]} × ${numerical.shapes.X[1]}` },
      { label: 'w · weight matrix', value: `${numerical.shapes.weights[0]} × ${numerical.shapes.weights[1]}` },
      { label: 'y · target column', value: `${numerical.shapes.targets[0]} × ${numerical.shapes.targets[1]}` },
      { label: 'Bias', value: 'Scalar', detail: 'Broadcast to every prediction; no extra column in X.' },
    ],
    formulas: [
      { label: `Active affine predictor; weight approximately ${formatNumber(state.weight)}, bias approximately ${formatNumber(state.bias)}`,
        tex: `\\hat y=wx+b,\\quad w\\approx${tex(state.weight)},\\quad b\\approx${tex(state.bias)}` },
      { label: `Mean squared error approximately ${formatNumber(numerical.mse)}`,
        tex: `\\operatorname{MSE}=\\frac{1}{${n}}\\sum_{i=1}^{${n}}(\\hat y_i-y_i)^2\\approx ${tex(numerical.mse)}` },
      { label: `Simultaneous update; next weight approximately ${formatNumber(numerical.next.weight)}, next bias approximately ${formatNumber(numerical.next.bias)}`,
        tex: `\\begin{aligned}w_{\\mathrm{next}}&=w-\\eta\\frac{\\partial L}{\\partial w}\\\\&\\approx(${tex(state.weight)})-(${tex(state.learningRate)})(${tex(numerical.gradients.weight)})\\approx ${tex(numerical.next.weight)}\\\\b_{\\mathrm{next}}&=b-\\eta\\frac{\\partial L}{\\partial b}\\\\&\\approx(${tex(state.bias)})-(${tex(state.learningRate)})(${tex(numerical.gradients.bias)})\\approx ${tex(numerical.next.bias)}\\end{aligned}` },
    ],
    plot: {
      viewBox: `0 0 ${size} ${size}`, size, min, max, scale, origin, fontSize,
      clip: { x: edge, y: edge, width: size - 2 * edge, height: size - 2 * edge },
      axes: [
        { x1: edge, y1: origin, x2: size - edge, y2: origin },
        { x1: origin, y1: size - edge, x2: origin, y2: edge },
      ],
      labels: [{ x: size - edge + 20, y: origin + fontSize / 3, text: 'x', anchor: 'start' as const },
        { x: origin, y: edge - 20, text: 'y', anchor: 'middle' as const }],
      ticks,
      line: { x1: projectX(left), y1: projectY(lineY1), x2: projectX(right), y2: projectY(lineY2),
        from: { x: left, y: lineY1 }, to: { x: right, y: lineY2 } },
    },
  };
}

export function editRegressionSample(state: RegressionState, id: string, change: { x?: number; y?: number }): RegressionState {
  if (!state.samples.some(sample => sample.id === id)) throw new RangeError(`Unknown sample ${id}.`);
  return { ...state, samples: state.samples.map(sample => sample.id === id ? { ...sample, ...change } : sample) };
}

export function moveRegressionSample(state: RegressionState, id: string, key: string, accelerated = false): RegressionState {
  const sample = state.samples.find(row => row.id === id);
  if (!sample) throw new RangeError(`Unknown sample ${id}.`);
  const step = REGRESSION_UI.coordinateStep * (accelerated ? 5 : 1);
  const dx = key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0;
  const dy = key === 'ArrowDown' ? -step : key === 'ArrowUp' ? step : 0;
  return editRegressionSample(state, id, { x: sample.x + dx, y: sample.y + dy });
}

export function regressionPointer(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }) {
  const size = Math.min(rect.width, rect.height);
  if (![clientX, clientY, rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) || size <= 0) {
    throw new RangeError('Pointer coordinates and plot bounds must be finite with a positive size.');
  }
  const u = (clientX - rect.left - (rect.width - size) / 2) * REGRESSION_PLANE.size / size;
  const v = (clientY - rect.top - (rect.height - size) / 2) * REGRESSION_PLANE.size / size;
  const coordinate = (value: number) => Math.max(REGRESSION_UI.sample.min, Math.min(REGRESSION_UI.sample.max,
    Number((Math.round(value / REGRESSION_UI.coordinateStep) * REGRESSION_UI.coordinateStep).toFixed(8))));
  return { x: coordinate((u - REGRESSION_PLANE.origin) / REGRESSION_PLANE.scale),
    y: coordinate((REGRESSION_PLANE.origin - v) / REGRESSION_PLANE.scale) };
}
