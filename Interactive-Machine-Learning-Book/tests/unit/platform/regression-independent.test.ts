import { expect, it } from 'vitest';
import { deriveRegression, regressionStep } from '../../../src/parts/p02/model/linear-regression';

it('matches an independent two-sample arithmetic example', () => {
  const state = { samples: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 2, y: 4 }], weight: 1, bias: 1, learningRate: .1 };
  const result = deriveRegression(state);
  expect(result.rows.map(row => row.prediction)).toEqual([1, 3]);
  expect(result.rows.map(row => row.residual)).toEqual([1, -1]);
  expect(result.mse).toBe(1); expect(result.gradients).toEqual({ weight: -2, bias: 0 });
  expect(result.next).toEqual({ weight: 1.2, bias: 1 });
  expect(deriveRegression(regressionStep(state)).mse).toBeCloseTo(.68, 14);
});

it('checks analytical gradients against a separately evaluated finite-difference loss', () => {
  const samples = [{ id: 'a', x: -2, y: -1 }, { id: 'b', x: 0, y: 1 }, { id: 'c', x: 3, y: 2 }];
  const loss = (w: number, b: number) => samples.reduce((sum, { x, y }) => sum + (w * x + b - y) ** 2, 0) / samples.length;
  for (const weight of [-1.7, .1, 2.4]) for (const bias of [-2, -.2, 3]) {
    const d = deriveRegression({ samples, weight, bias, learningRate: .03 });
    const h = 1e-5;
    expect(Math.abs(d.gradients.weight - (loss(weight + h, bias) - loss(weight - h, bias)) / (2 * h))).toBeLessThan(1e-7);
    expect(Math.abs(d.gradients.bias - (loss(weight, bias + h) - loss(weight, bias - h)) / (2 * h))).toBeLessThan(1e-7);
  }
});

it('does not hide loss growth from a large gradient step', () => {
  const state = { samples: [{ id: 'a', x: -2, y: -2 }, { id: 'b', x: 2, y: 2 }], weight: 0, bias: 0, learningRate: 1 };
  expect(deriveRegression(state).mse).toBe(4);
  expect(deriveRegression(regressionStep(state)).mse).toBe(196);
});
