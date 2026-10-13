import { describe, expect, it } from 'vitest';
import { closedForm, descent, initialFit, leastNorm, linear, polynomialFit, regularized } from '../../../src/parts/p02/model/fit';
import { CANONICAL_REGRESSION } from '../../../src/parts/p02/model/linear-regression';

describe('Part II fit mechanisms', () => {
  it('keeps the public row bound while solving trusted 64-row Ridge augmentation', () => {
    const X = Array.from({ length: 64 }, (_, i) => [1, i % 2 === 0 ? -1 : 1]);
    const y = X.map(row => 5 + 2 * row[1]!);
    const result = regularized(X, y, 2, 'l2', false);
    expect(result.weights[0]).toBeCloseTo(5, 12);
    expect(result.weights[1]).toBeCloseTo(2 / 3, 12);
    expect(result.converged).toBe(true);
    expect(() => leastNorm([...X, [1, 0]], [...y, 5])).toThrow('64');
  });
  it('finds the independent literal scalar optimum and identifies a nonunique slope', () => {
    const best = closedForm(CANONICAL_REGRESSION.samples);
    expect(best.weight).toBeCloseTo(1.8, 12); expect(best.bias).toBeCloseTo(.8, 12); expect(best.mse).toBeCloseTo(.08, 12);
    expect(closedForm([{ id: 'a', x: 2, y: 1 }, { id: 'b', x: 2, y: 3 }])).toMatchObject({ weight: 0, bias: 2, unique: false, mse: 1 });
  });
  it('uses the reference gradient and reports convergence, oscillation and divergence', () => {
    for (const [rate, behavior] of [[.1, 'convergence without fast-mode sign flips'], [.4, 'convergent oscillation'], [.5, 'undamped oscillation'], [.75, 'divergence']] as const)
      expect(descent({ ...CANONICAL_REGRESSION, learningRate: rate }).behavior).toBe(behavior);
    expect(descent(CANONICAL_REGRESSION).next).toEqual({ weight: 1.02, bias: .16000000000000003 });
  });
  it('returns minimum norm for duplicate columns and wide/zero designs', () => {
    expect(leastNorm([[1, 1], [2, 2]], [2, 4]).rank).toBe(1);
    leastNorm([[1, 1], [2, 2]], [2, 4]).weights.forEach(v => expect(v).toBeCloseTo(1, 10));
    leastNorm([[1, 1, 1]], [3]).weights.forEach(v => expect(v).toBeCloseTo(1, 10));
    expect(leastNorm([[0, 0]], [3]).weights).toEqual([0, 0]);
  });
  it('shows capacity using different training and held-out data', () => {
    const s = initialFit('polynomial').samples;
    expect(polynomialFit(s, 5).train.mse).toBeLessThan(1e-20);
    expect(polynomialFit(s, 5).held.mse).toBeGreaterThan(polynomialFit(s, 2).held.mse);
  });
  it('has explicit L2, L1 and intercept policies for the centered literal fixture', () => {
    const X = [[1, -1], [1, 1]], y = [3, 7];
    expect(regularized(X, y, 2, 'l2', false).weights[1]).toBeCloseTo(2 / 3, 12);
    expect(regularized(X, y, 2, 'l1', false).weights).toEqual([5, 1]);
    expect(regularized(X, y, 2, 'l1', true).weights).toEqual([4, 1]);
    expect(regularized(X, y, 4, 'l1', false).weights).toEqual([5, 0]);
  });
  it('rejects ragged, nonfinite, wrong-shape, unsupported and overflow arithmetic', () => {
    for (const X of [[], [[1], [1, 2]], [[NaN]], [[Infinity]]]) expect(() => leastNorm(X, [0])).toThrow();
    expect(() => linear([[1, 2]], [1], [2])).toThrow();
    expect(() => linear([[1e308]], [0], [2])).toThrow();
    expect(() => regularized([[2]], [1], 1, 'l2', false)).toThrow('ones');
    expect(() => polynomialFit(initialFit('polynomial').samples, 2.5)).toThrow('integer');
  });
});
