import { CANONICAL_REGRESSION, deriveRegression, regressionStep, type RegressionState, type Sample } from './linear-regression';

export type Matrix = readonly (readonly number[])[];
export const RCOND = 1e-10;
export function finite(value: number, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError(`${name} must remain finite. State preserved.`);
  return value;
}
export function matrix(X: Matrix, name = 'X'): { n: number; d: number } {
  if (!Array.isArray(X) || X.length < 1 || X.length > 64 || !Array.isArray(X[0]) || X[0].length < 1 || X[0].length > 7)
    throw new RangeError(`${name} requires 1–64 rows and 1–7 columns.`);
  const d = X[0].length;
  X.forEach(row => { if (!Array.isArray(row) || row.length !== d) throw new RangeError(`${name} must be rectangular.`); row.forEach(x => finite(x, name)); });
  return { n: X.length, d };
}
export function vector(v: readonly number[], size: number, name: string): void {
  if (!Array.isArray(v) || v.length !== size) throw new RangeError(`${name} must have ${size} entries (a column).`);
  v.forEach(x => finite(x, name));
}
export const dot = (a: readonly number[], b: readonly number[]) => finite(a.reduce((s, x, j) => finite(s + finite(x * b[j]!, 'Product'), 'Sum'), 0), 'Dot product');
export function linear(X: Matrix, y: readonly number[], w: readonly number[]) {
  const { n, d } = matrix(X); vector(y, n, 'Targets'); vector(w, d, 'Weights');
  const predictions = X.map(row => dot(row, w));
  const residuals = predictions.map((p, i) => finite(p - y[i]!, 'Residual'));
  const mse = finite(dot(residuals, residuals) / n, 'MSE');
  const gradient = w.map((_, j) => finite(2 / n * dot(X.map(row => row[j]!), residuals), 'Gradient'));
  return { predictions, residuals, mse, gradient, shapes: { X: [n, d], W: [d, 1], y: [n, 1], prediction: [n, 1], gradient: [d, 1] } };
}

/** One-sided Jacobi SVD of a small scaled design; no inverse or squared-condition normal-equation solve. */
export function leastNorm(X: Matrix, y: readonly number[]) {
  const { n } = matrix(X); vector(y, n, 'Targets');
  return leastNormValidated(X, y);
}

// Only validated public designs and locally constructed Ridge penalty rows reach this solver.
function leastNormValidated(X: Matrix, y: readonly number[]) {
  const d = X[0]!.length;
  const scale = Math.max(...X.flat().map(Math.abs));
  if (scale === 0) return { weights: Array<number>(d).fill(0), rank: 0, singularValues: Array<number>(d).fill(0), cutoff: 0, condition: null };
  const B = X.map(row => row.map(x => x / scale));
  const V = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => Number(i === j)));
  let converged = false;
  for (let sweep = 0; sweep < 100; sweep++) {
    let rotated = false;
    for (let p = 0; p < d; p++) for (let q = p + 1; q < d; q++) {
      const a = dot(B.map(r => r[p]!), B.map(r => r[p]!));
      const b = dot(B.map(r => r[q]!), B.map(r => r[q]!));
      const c = dot(B.map(r => r[p]!), B.map(r => r[q]!));
      if (a === 0 || b === 0 || Math.abs(c) <= 1e-14 * Math.sqrt(a) * Math.sqrt(b)) continue;
      const tau = (b - a) / (2 * c);
      const t = tau === 0 ? 1 : Math.sign(tau) / (Math.abs(tau) + Math.hypot(1, tau));
      const cs = 1 / Math.hypot(1, t), sn = cs * t;
      for (const rows of [B, V]) for (const r of rows) {
        const rp = r[p]!, rq = r[q]!; r[p] = cs * rp - sn * rq; r[q] = sn * rp + cs * rq;
      }
      rotated = true;
    }
    if (!rotated) { converged = true; break; }
  }
  if (!converged) throw new RangeError('SVD did not converge in 100 sweeps; no fit returned.');
  const norms = Array.from({ length: d }, (_, j) => Math.hypot(...B.map(r => r[j]!)));
  const cutoffScaled = RCOND * Math.max(...norms);
  const weights = Array<number>(d).fill(0);
  let rank = 0;
  for (let j = 0; j < d; j++) {
    const norm = norms[j]!;
    if (norm <= cutoffScaled) continue;
    rank++;
    const projection = dot(B.map(r => r[j]! / norm), y);
    const coefficient = finite(projection / norm / scale, 'SVD coefficient');
    for (let k = 0; k < d; k++) weights[k] = finite(weights[k]! + V[k]![j]! * coefficient, 'Fitted weight');
  }
  const singularValues = norms.map(s => finite(s * scale, 'Singular value')).sort((a, b) => b - a);
  const retained = singularValues.filter(s => s > singularValues[0]! * RCOND);
  const residuals = X.map((row, i) => finite(dot(row, weights) - y[i]!, 'Fitted residual'));
  finite(dot(residuals, residuals) / X.length, 'Fitted MSE');
  return { weights, rank, singularValues, cutoff: finite(cutoffScaled * scale, 'Rank cutoff'), condition: rank === d ? singularValues[0]! / retained.at(-1)! : null };
}

export function closedForm(samples: readonly Sample[]) {
  // Reuse frozen validation and residual mathematics, including unique IDs and finite arithmetic.
  deriveRegression({ samples, weight: 0, bias: 0, learningRate: .1 });
  const n = samples.length;
  const meanX = finite(samples.reduce((s, r) => finite(s + r.x, 'x sum'), 0) / n, 'Mean x');
  const meanY = finite(samples.reduce((s, r) => finite(s + r.y, 'y sum'), 0) / n, 'Mean y');
  const centeredX = samples.map(r => finite(r.x - meanX, 'Centered x'));
  const centeredY = samples.map(r => finite(r.y - meanY, 'Centered y'));
  const sxx = dot(centeredX, centeredX), sxy = dot(centeredX, centeredY);
  if (sxx === 0 && samples.some(r => r.x !== samples[0]!.x)) throw new RangeError('Input variance underflowed; slope is numerically unresolved.');
  const weight = sxx === 0 ? 0 : finite(sxy / sxx, 'Best slope');
  const bias = finite(meanY - weight * meanX, 'Best bias');
  const result = deriveRegression({ samples, weight, bias, learningRate: .1 });
  return { weight, bias, meanX, meanY, sxx, sxy, mse: result.mse, unique: sxx !== 0,
    reason: sxx === 0 ? 'Zero x-variance: infinitely many (w,b) give the mean target. Showing w=0, b=mean(y).' : 'Unique optimum for this scalar affine design.' };
}
export function descent(state: RegressionState) {
  const current = deriveRegression(state);
  const n = state.samples.length, meanX = state.samples.reduce((s, r) => s + r.x, 0) / n;
  const meanXX = finite(state.samples.reduce((s, r) => finite(s + finite(r.x * r.x, 'x squared'), 'Curvature sum'), 0) / n, 'Mean x squared');
  const a = 2 * meanXX, b = 2 * meanX, c = 2;
  const lambdaMax = finite((a + c + Math.hypot(a - c, 2 * b)) / 2, 'Maximum curvature');
  const lambdaMin = Math.max(0, (a + c - Math.hypot(a - c, 2 * b)) / 2);
  const factor = finite(1 - state.learningRate * lambdaMax, 'Fast-mode error multiplier');
  const behavior = factor <= -1 ? (factor === -1 ? 'undamped oscillation' : 'divergence') : factor < 0 ? 'convergent oscillation' : 'convergence without fast-mode sign flips';
  return { ...current, lambdaMin, lambdaMax, criticalRate: 2 / lambdaMax, factor, behavior, optimum: closedForm(state.samples) };
}
export function polynomialDesign(x: readonly number[], degree: number): number[][] {
  if (!Number.isInteger(degree) || degree < 1 || degree > 5) throw new RangeError('Degree must be an integer from 1 to 5.');
  return x.map(v => { finite(v, 'Polynomial x'); return Array.from({ length: degree + 1 }, (_, j) => finite(v ** j, 'Polynomial feature')); });
}
export const POLYNOMIAL_DATA = {
  trainX: [-1, -.6, -.2, .2, .6, 1], trainY: [1.1, .46, 0, .16, .26, 1.2],
  heldX: [-.8, -.4, 0, .4, .8], heldY: [.64, .16, 0, .16, .64],
} as const;
export function polynomialFit(samples: readonly Sample[], degree: number) {
  closedForm(samples);
  const X = polynomialDesign(samples.map(r => r.x), degree), y = samples.map(r => r.y);
  const solve = leastNorm(X, y);
  const train = linear(X, y, solve.weights);
  const held = linear(polynomialDesign(POLYNOMIAL_DATA.heldX, degree), POLYNOMIAL_DATA.heldY, solve.weights);
  return { ...solve, train, held, X };
}
export type Penalty = 'l2' | 'l1';
export function regularized(X: Matrix, y: readonly number[], lambda: number, kind: Penalty, penalizeIntercept: boolean) {
  const { n, d } = matrix(X); vector(y, n, 'Targets'); finite(lambda, 'Lambda');
  if (lambda < 0 || lambda > 10 || !['l1', 'l2'].includes(kind) || typeof penalizeIntercept !== 'boolean') throw new RangeError('Penalty requires L1/L2, lambda in [0,10] and an explicit intercept policy.');
  if (X.some(row => row[0] !== 1)) throw new RangeError('Regularization design starts with a fixed column of ones.');
  const mask = Array.from({ length: d }, (_, j) => j !== 0 || penalizeIntercept);
  let weights: number[], iterations = 0;
  if (kind === 'l2' || lambda === 0) {
    const extra = mask.flatMap((penalized, j) => penalized && lambda > 0 ? [Array.from({ length: d }, (_, k) => k === j ? Math.sqrt(n * lambda) : 0)] : []);
    weights = leastNormValidated([...X, ...extra], [...y, ...extra.map(() => 0)]).weights;
  } else {
    weights = Array<number>(d).fill(0);
    for (iterations = 1; iterations <= 3000; iterations++) {
      const old = [...weights];
      for (let j = 0; j < d; j++) {
        const x = X.map(r => r[j]!);
        const partial = y.map((v, i) => v - dot(X[i]!, weights) + X[i]![j]! * weights[j]!);
        const rho = dot(x, partial) / n, curvature = dot(x, x) / n;
        const threshold = mask[j] ? lambda / 2 : 0;
        weights[j] = curvature === 0 ? 0 : finite(Math.sign(rho) * Math.max(0, Math.abs(rho) - threshold) / curvature, 'L1 coordinate');
      }
      if (Math.max(...weights.map((v, j) => Math.abs(v - old[j]!))) < 1e-12) break;
    }
  }
  const result = linear(X, y, weights);
  const penalty = finite(lambda * weights.reduce((sum, w, j) => mask[j] ? sum + (kind === 'l2' ? w * w : Math.abs(w)) : sum, 0), 'Penalty');
  const kkt = Math.max(...weights.map((w, j) => {
    const g = result.gradient[j]!;
    if (!mask[j]) return Math.abs(g);
    if (kind === 'l2') return Math.abs(g + 2 * lambda * w);
    return w === 0 ? Math.max(0, Math.abs(g) - lambda) : Math.abs(g + lambda * Math.sign(w));
  }));
  return { ...result, weights, penalty, objective: finite(result.mse + penalty, 'Objective'), kkt, iterations: Math.min(iterations, 3000), converged: kkt <= 1e-8 };
}

export type FitMode = 'least-squares' | 'descent' | 'multiple' | 'polynomial' | 'regularization';
export interface FitState extends RegressionState {
  readonly X: Matrix; readonly targets: readonly number[]; readonly weights: readonly number[];
  readonly degree: number; readonly lambda: number; readonly penalty: Penalty; readonly penalizeIntercept: boolean;
}
export function initialFit(mode: FitMode): FitState {
  return { ...CANONICAL_REGRESSION,
    samples: mode === 'polynomial' ? POLYNOMIAL_DATA.trainX.map((x, i) => ({ id: `s${i + 1}`, x, y: POLYNOMIAL_DATA.trainY[i]! })) : CANONICAL_REGRESSION.samples,
    X: [[1, -1, 0], [1, 0, 1], [1, 1, 0], [1, 2, 1]], targets: [-1, 0, 3, 4], weights: [0, 0, 0],
    degree: 2, lambda: .5, penalty: 'l2', penalizeIntercept: false };
}
export function fitStep(state: FitState, mode: FitMode): FitState {
  if (mode === 'descent') return { ...state, ...regressionStep(state) };
  if (mode === 'least-squares') { const best = closedForm(state.samples); return { ...state, weight: best.weight, bias: best.bias }; }
  if (mode === 'multiple') return { ...state, weights: leastNorm(state.X, state.targets).weights };
  return state;
}
