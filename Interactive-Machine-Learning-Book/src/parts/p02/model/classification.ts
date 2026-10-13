import { dot, finite, matrix, vector, type Matrix } from './fit';

export function sigmoid(z: number): number {
  finite(z, 'Logit');
  return z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
}
export function bce(z: number, y: number): number {
  finite(z, 'Logit');
  if (y !== 0 && y !== 1) throw new RangeError('Binary label must be 0 or 1.');
  return finite(Math.max(z, 0) - z * y + Math.log1p(Math.exp(-Math.abs(z))), 'BCE');
}
function labels(y: readonly number[], n: number, classes = 2) {
  vector(y, n, 'Labels');
  if (y.some(v => !Number.isInteger(v) || v < 0 || v >= classes)) throw new RangeError(`Labels must be integer class indices 0–${classes - 1}.`);
}
export function logistic(X: Matrix, y: readonly number[], w: readonly number[], rate: number) {
  const { n, d } = matrix(X); labels(y, n); vector(w, d, 'Weights'); finite(rate, 'Learning rate');
  if (rate <= 0 || rate > 1) throw new RangeError('Learning rate must be in (0,1].');
  const logits = X.map(row => dot(row, w)), scores = logits.map(sigmoid);
  const losses = logits.map((z, i) => bce(z, y[i]!));
  const loss = finite(losses.reduce((s, v) => finite(s + v, 'BCE sum'), 0) / n, 'Mean BCE');
  const errors = scores.map((p, i) => p - y[i]!);
  const gradient = w.map((_, j) => finite(dot(X.map(row => row[j]!), errors) / n, 'Logistic gradient'));
  const next = w.map((v, j) => finite(v - rate * gradient[j]!, 'Logistic update'));
  return { logits, scores, losses, loss, gradient, next, shapes: { X: [n, d], W: [d, 1], y: [n, 1], gradient: [d, 1] } };
}
export interface Metric { readonly value: number | null; readonly reason: string | null }
const ratio = (numerator: number, denominator: number, reason: string): Metric => denominator === 0 ? { value: null, reason } : { value: numerator / denominator, reason: null };
export function confusion(scores: readonly number[], y: readonly number[], threshold: number | null) {
  if (!Array.isArray(scores) || scores.length < 1 || scores.length > 64) throw new RangeError('Scores require 1–64 examples.');
  labels(y, scores.length); if (threshold !== null) finite(threshold, 'Threshold');
  if (threshold !== null && (threshold < 0 || threshold > 1)) throw new RangeError('Threshold must be between 0 and 1.');
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const rows = scores.map((p, i) => {
    finite(p, 'Score'); if (p < 0 || p > 1) throw new RangeError('Scores must be probabilities in [0,1].');
    const prediction = Number(threshold !== null && p >= threshold), label = y[i]!;
    const cell = prediction ? (label ? 'TP' : 'FP') : (label ? 'FN' : 'TN');
    if (cell === 'TP') tp++; else if (cell === 'FP') fp++; else if (cell === 'TN') tn++; else fn++;
    return { score: p, label, prediction, cell };
  });
  return { rows, tp, fp, tn, fn,
    precision: ratio(tp, tp + fp, 'No predicted positives (TP+FP=0).'),
    recall: ratio(tp, tp + fn, 'No actual positives (TP+FN=0).'),
    f1: ratio(2 * tp, 2 * tp + fp + fn, 'No actual or predicted positives (2TP+FP+FN=0).'),
    accuracy: (tp + tn) / scores.length };
}
export function roc(scores: readonly number[], y: readonly number[]) {
  confusion(scores, y, .5);
  const positives = y.filter(v => v === 1).length, negatives = y.length - positives;
  const thresholds: (number | null)[] = [null, ...[...new Set(scores)].sort((a, b) => b - a)];
  const points = thresholds.map(threshold => {
    const c = confusion(scores, y, threshold);
    return { threshold, tp: c.tp, fp: c.fp, tn: c.tn, fn: c.fn,
      tpr: ratio(c.tp, positives, 'ROC TPR needs at least one positive.'), fpr: ratio(c.fp, negatives, 'ROC FPR needs at least one negative.') };
  });
  const reason = positives === 0 || negatives === 0 ? 'ROC/AUC requires both actual classes.' : null;
  let area = 0;
  if (!reason) for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!;
    area += (b.fpr.value! - a.fpr.value!) * (a.tpr.value! + b.tpr.value!) / 2;
  }
  return { points, auc: { value: reason ? null : area, reason } as Metric, positives, negatives };
}
export function softmax(logits: readonly number[]) {
  if (!Array.isArray(logits) || logits.length < 2 || logits.length > 6) throw new RangeError('Softmax requires 2–6 class logits.');
  logits.forEach(z => finite(z, 'Logit'));
  const maximum = Math.max(...logits), shifted = logits.map(z => finite(z - maximum, 'Shifted logit'));
  const exp = shifted.map(Math.exp), sum = exp.reduce((a, b) => a + b, 0);
  return { maximum, shifted, probabilities: exp.map(v => v / sum), logSumExpShifted: Math.log(sum) };
}
export function multiclass(X: Matrix, y: readonly number[], W: Matrix, rate: number, shift = 0) {
  const { n, d } = matrix(X), { n: wd, d: k } = matrix(W, 'W');
  if (wd !== d || k < 2 || k > 6) throw new RangeError('W must be d × k, with 2–6 classes.');
  labels(y, n, k); finite(rate, 'Learning rate'); finite(shift, 'Common logit shift');
  if (rate <= 0 || rate > 1) throw new RangeError('Learning rate must be in (0,1].');
  const logits = X.map(row => Array.from({ length: k }, (_, j) => finite(dot(row, W.map(r => r[j]!)) + shift, 'Logit')));
  const normalized = logits.map(softmax), probabilities = normalized.map(r => r.probabilities);
  const losses = normalized.map((r, i) => finite(r.logSumExpShifted - r.shifted[y[i]!]!, 'Cross entropy'));
  const loss = finite(losses.reduce((s, v) => finite(s + v, 'CE sum'), 0) / n, 'Mean CE');
  const gradient = Array.from({ length: d }, (_, j) => Array.from({ length: k }, (_, c) => finite(dot(X.map(r => r[j]!), probabilities.map((r, i) => r[c]! - Number(y[i] === c))) / n, 'Softmax gradient')));
  const next = W.map((row, j) => row.map((v, c) => finite(v - rate * gradient[j]![c]!, 'Softmax update')));
  const predicted = probabilities.map(row => row.indexOf(Math.max(...row)));
  return { logits, normalized, probabilities, losses, loss, gradient, next, predicted, oneHot: y.map(label => Array.from({ length: k }, (_, c) => Number(c === label))),
    shapes: { X: [n, d], W: [d, k], logits: [n, k], Y: [n, k], gradient: [d, k], labels: [n, 1] } };
}
export type ClassificationMode = 'logistic' | 'threshold' | 'metrics' | 'softmax';
export interface ClassificationState {
  readonly X: Matrix; readonly labels: readonly number[]; readonly weights: readonly number[];
  readonly scores: readonly number[]; readonly scoreLabels: readonly number[]; readonly threshold: number | null; readonly rate: number;
  readonly multiX: Matrix; readonly multiLabels: readonly number[]; readonly W: Matrix; readonly shift: number;
}
export const SCORE_FIXTURE = { scores: [.9, .8, .8, .4, .1], labels: [1, 0, 1, 0, 1] } as const;
export function initialClassification(): ClassificationState {
  return { X: [[1, -2], [1, -1], [1, 0], [1, 1], [1, 2]], labels: [0, 0, 1, 0, 1], weights: [0, 1],
    scores: SCORE_FIXTURE.scores, scoreLabels: SCORE_FIXTURE.labels, threshold: .5, rate: .2,
    multiX: [[1, -1], [1, 0], [1, 1]], multiLabels: [2, 1, 0], W: [[0, 0, 0], [1, 0, -1]], shift: 0 };
}
export function classificationStep(state: ClassificationState, mode: ClassificationMode): ClassificationState {
  if (mode === 'logistic') { const next = { ...state, weights: logistic(state.X, state.labels, state.weights, state.rate).next }; logistic(next.X, next.labels, next.weights, next.rate); return next; }
  if (mode === 'softmax') { const next = { ...state, W: multiclass(state.multiX, state.multiLabels, state.W, state.rate, state.shift).next }; multiclass(next.multiX, next.multiLabels, next.W, next.rate, next.shift); return next; }
  return state;
}
