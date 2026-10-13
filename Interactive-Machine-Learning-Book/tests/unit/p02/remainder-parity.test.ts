import { describe, expect, it } from 'vitest';
import fixture from '../../../fixtures/p02/remainder.fixtures.json';
import { closedForm, leastNorm, linear, polynomialFit, regularized } from '../../../src/parts/p02/model/fit';
import { bce, confusion, logistic, multiclass, roc, softmax } from '../../../src/parts/p02/model/classification';

function close(actual: unknown, expected: unknown, tolerance = 2e-9): void {
  if (typeof expected === 'number') {
    expect(typeof actual).toBe('number');
    expect(Number.isFinite(actual)).toBe(true);
    expect(Math.abs((actual as number) - expected)).toBeLessThanOrEqual(tolerance * (1 + Math.abs(expected)));
  } else if (Array.isArray(expected)) {
    expect(Array.isArray(actual)).toBe(true); expect((actual as unknown[]).length).toBe(expected.length);
    expected.forEach((v, i) => close((actual as unknown[])[i], v, tolerance));
  } else if (expected && typeof expected === 'object') {
    for (const [k, v] of Object.entries(expected)) close((actual as Record<string, unknown>)[k], v, tolerance);
  } else expect(actual).toEqual(expected);
}

describe('independently derived committed remainder goldens', () => {
  for (const c of fixture.closed) it(`Fraction pair-difference scalar optimum: ${c.name}`, () => close(closedForm(c.samples), c.expected, 1e-12));
  for (const c of fixture.solves) it(`NumPy lstsq rank, minimum norm and prediction: ${c.name}`, () => {
    const solved = leastNorm(c.X, c.y);
    close(solved.weights, c.expected.weights); expect(solved.rank).toBe(c.expected.rank);
    close(solved.singularValues, c.expected.singularValues);
    const predicted = linear(c.X, c.y, solved.weights);
    close(predicted.predictions, c.expected.predictions); close(predicted.mse, c.expected.mse);
  });
  for (const c of fixture.polynomial) it(`NumPy Vandermonde train/held-out: degree ${c.degree}`, () => {
    const result = polynomialFit(c.samples, c.degree);
    close(result.weights, c.expected.weights); close(result.train.mse, c.expected.mse);
    close(result.held.predictions, c.expected.heldPredictions); close(result.held.mse, c.expected.heldMse);
  });
  for (const c of fixture.penalties) it(`analytic ${c.kind} penalty ${c.lam}, intercept=${c.penalizeIntercept}`, () => {
    close(regularized(c.X, c.y, c.lam, c.kind as 'l1' | 'l2', c.penalizeIntercept), c.expected);
  });
  for (const c of fixture.binary) it(`Decimal binary likelihood and every update: ${c.name}`, () => {
    close(logistic(c.X, c.y, c.weights, c.rate), c.expected, 1e-12);
    let weights = c.weights;
    for (const frame of c.trace) {
      close(weights, frame.weights, 1e-12);
      const current = logistic(c.X, c.y, weights, c.rate); close(current, frame.expected, 1e-12); weights = current.next;
    }
  });
  for (const c of fixture.counts) it(`set-count and pairwise ranking oracle: ${c.name}`, () => {
    const result = confusion(c.scores, c.y, c.threshold);
    for (const k of ['tp', 'fp', 'tn', 'fn'] as const) expect(result[k]).toBe(c.expected[k]);
    for (const k of ['precision', 'recall', 'f1'] as const) close(result[k].value, c.expected[k], 1e-12);
    const sweep = roc(c.scores, c.y); close(sweep.auc.value, c.auc, 1e-12);
    expect(sweep.points.length).toBe(c.sweep.length);
    c.sweep.forEach((p, i) => { const actual = sweep.points[i]!; expect(actual.threshold).toBe(p.threshold); for (const k of ['tp', 'fp', 'tn', 'fn'] as const) expect(actual[k]).toBe(p[k]); });
  });
  for (const c of fixture.multi) it(`Decimal softmax and every gradient update: ${c.name}`, () => {
    close(multiclass(c.X, c.y, c.W, c.rate, c.shift), c.expected, 1e-12);
    let W = c.W;
    for (const frame of c.trace) { close(W, frame.W, 1e-12); const current = multiclass(c.X, c.y, W, c.rate, c.shift); close(current, frame.expected, 1e-12); W = current.next; }
  });
});

function finiteDifference(cost: (v: number[]) => number, parameters: number[]) {
  return parameters.map((_, i) => { const plus = [...parameters], minus = [...parameters]; plus[i]! += 1e-5; minus[i]! -= 1e-5; return (cost(plus) - cost(minus)) / 2e-5; });
}
describe('gradient checks against centered differences of independent scalar costs', () => {
  it('checks every multivariate regression coefficient', () => {
    const X = [[1, -.7, 1.2], [1, .4, -.2], [1, 1.1, .3]], y = [.2, -1, .7], w = [.3, -.4, .2];
    const cost = (v: number[]) => X.reduce((sum, row, i) => sum + (row.reduce((s, x, j) => s + x * v[j]!, 0) - y[i]!) ** 2, 0) / 3;
    close(linear(X, y, w).gradient, finiteDifference(cost, w), 2e-7);
  });
  it('checks logistic coefficients via a different small-logit likelihood expression', () => {
    const X = [[1, -.7], [1, .4], [1, 1.1]], y = [1, 0, 1], w = [.3, -.4];
    const cost = (v: number[]) => X.reduce((sum, row, i) => { const z = row.reduce((s, x, j) => s + x * v[j]!, 0); return sum + Math.log(1 + Math.exp(z)) - y[i]! * z; }, 0) / 3;
    close(logistic(X, y, w, .2).gradient, finiteDifference(cost, w), 2e-7);
  });
  it('checks all softmax gradient entries and their row sums', () => {
    const X = [[1, -.7], [1, .4], [1, 1.1]], y = [2, 0, 1], W = [[.3, -.4, .2], [.2, .1, -.3]];
    const cost = (v: number[]) => X.reduce((sum, row, i) => { const logits = [0, 1, 2].map(c => row[0]! * v[c]! + row[1]! * v[3 + c]!); return sum + Math.log(logits.reduce((s, z) => s + Math.exp(z), 0)) - logits[y[i]!]!; }, 0) / 3;
    const result = multiclass(X, y, W, .2);
    close(result.gradient.flat(), finiteDifference(cost, W.flat()), 2e-7);
    result.gradient.forEach(row => expect(Math.abs(row.reduce((s, g) => s + g, 0))).toBeLessThan(1e-14));
  });
});

describe('classification boundaries and numerical stability', () => {
  it('handles extreme BCE, shifted softmax, one-hot shapes and deterministic ties', () => {
    expect(bce(1000, 0)).toBe(1000); expect(bce(-1000, 1)).toBe(1000); expect(bce(1000, 1)).toBe(0);
    expect(softmax([1000, 0, -1000]).probabilities).toEqual([1, 0, 0]);
    const zero = multiclass([[1, 2]], [1], [[0, 0, 0], [0, 0, 0]], .2);
    expect(zero.predicted).toEqual([0]); expect(zero.oneHot).toEqual([[0, 1, 0]]);
    expect(zero.shapes).toEqual({ X: [1, 2], W: [2, 3], logits: [1, 3], Y: [1, 3], gradient: [2, 3], labels: [1, 1] });
  });
  it('does not mutate inputs or silently repair undefined metric values', () => {
    const X = [[1, 2]], W = [[0, 0, 0], [0, 0, 0]], before = JSON.stringify([X, W]);
    const result = multiclass(X, [1], W, .2); result.next[0]![0] = 100;
    expect(JSON.stringify([X, W])).toBe(before);
    const c = confusion([1, 0], [0, 0], null);
    for (const metric of [c.precision, c.recall, c.f1]) { expect(metric.value).toBeNull(); expect(metric.reason).toBeTruthy(); }
    expect(roc([.5, .5], [0, 1]).auc.value).toBe(.5);
  });
  it('rejects nonfinite logits, invalid labels, scores, rates and wrong shapes', () => {
    for (const score of [NaN, Infinity, -1, 1.1]) expect(() => confusion([score], [0], .5)).toThrow();
    for (const label of [-1, .5, 2]) expect(() => logistic([[1]], [label], [0], .1)).toThrow();
    for (const rate of [0, -1, 2, NaN]) expect(() => logistic([[1]], [0], [0], rate)).toThrow();
    expect(() => multiclass([[1, 2]], [0], [[1, 2, 3]], .1)).toThrow();
    expect(() => softmax([1e308, -1e308])).toThrow('Shifted');
    expect(() => logistic([[1e308]], [0], [2], .1)).toThrow();
  });
});
