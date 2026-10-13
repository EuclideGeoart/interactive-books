import { describe, expect, it } from 'vitest';
import fixtures from '../../../fixtures/p02/linear-regression.fixtures.json';
import {
  CANONICAL_REGRESSION, deriveRegression, regressionStep, regressionTrace,
  type RegressionState,
} from '../../../src/parts/p02/model/linear-regression';

function close(actual: unknown, expected: unknown): void {
  if (typeof expected === 'number') {
    expect(typeof actual).toBe('number');
    expect(Number.isFinite(actual)).toBe(true);
    const { absolute, relative } = fixtures.policy.tolerance;
    expect(Math.abs((actual as number) - expected)).toBeLessThanOrEqual(absolute + relative * Math.abs(expected));
  } else if (Array.isArray(expected)) {
    expect(Array.isArray(actual)).toBe(true);
    expect((actual as unknown[]).length).toBe(expected.length);
    expected.forEach((value, index) => close((actual as unknown[])[index], value));
  } else if (expected !== null && typeof expected === 'object') {
    expect(Object.keys(actual as object).sort()).toEqual(Object.keys(expected).sort());
    for (const [key, value] of Object.entries(expected)) close((actual as Record<string, unknown>)[key], value);
  } else {
    expect(actual).toBe(expected);
  }
}

const single = (x: number, y: number, weight = 0, bias = 0, learningRate = 0.1): RegressionState => ({
  samples: [{ id: 'only', x, y }], weight, bias, learningRate,
});

describe('III-07 affine regression', () => {
  it('matches hand-worked literals, signed residuals and column shapes', () => {
    const before = deriveRegression(CANONICAL_REGRESSION);
    expect(before.rows.map(row => row.prediction)).toEqual([-1, -0.5, 0, 0.5, 1]);
    expect(before.rows.map(row => row.residual)).toEqual([2, 0.5, -1, -2.5, -3]);
    expect(before.rows.map(row => row.squaredError)).toEqual([4, 0.25, 1, 6.25, 9]);
    close(before.mse, 4.1);
    close(before.gradients, { weight: -5.2, bias: -1.6 });
    close(before.next, { weight: 1.02, bias: 0.16 });
    expect(before.shapes).toEqual({ X: [5, 1], weights: [1, 1], targets: [5, 1] });
    const after = deriveRegression(regressionStep(CANONICAL_REGRESSION));
    close(after.mse, 1.7064);
    close(after.gradients, { weight: -3.12, bias: -1.28 });
    expect(after.mse).toBeLessThan(before.mse);
  });

  it.each(fixtures.cases)('$id agrees with independently checked NumPy before/after/trace goldens', fixture => {
    const state = structuredClone(fixture.state);
    close(deriveRegression(state), fixture.before);
    close(deriveRegression(regressionStep(state)), fixture.after);
    const trace = regressionTrace(state, fixture.steps);
    close(trace, fixture.trace);
    close(deriveRegression(trace[1]!.state), fixture.after);
    expect(state).toEqual(fixture.state);
  });

  it.each([
    { name: 'canonical', state: CANONICAL_REGRESSION, gradient: { weight: -5.2, bias: -1.6 } },
    {
      name: 'asymmetric',
      state: { samples: [{ id: 'a', x: -2, y: 1 }, { id: 'b', x: 1, y: 4 }], weight: 0.5, bias: -1, learningRate: 0.2 },
      gradient: { weight: 1.5, bias: -7.5 },
    },
  ])('$name literal gradients agree with central finite differences of MSE', ({ state, gradient }) => {
    close(deriveRegression(state).gradients, gradient);
    const h = 1e-5;
    for (const parameter of ['weight', 'bias'] as const) {
      const plus = deriveRegression({ ...state, [parameter]: state[parameter] + h }).mse;
      const minus = deriveRegression({ ...state, [parameter]: state[parameter] - h }).mse;
      expect(Math.abs((plus - minus) / (2 * h) - gradient[parameter])).toBeLessThan(1e-8);
    }
  });

  it('handles one sample without inventing a unique optimum', () => {
    const state = single(2, 3);
    const result = deriveRegression(state);
    close(result.mse, 9);
    close(result.gradients, { weight: -12, bias: -6 });
    close(result.next, { weight: 1.2, bias: 0.6 });
    expect(result.shapes).toEqual({ X: [1, 1], weights: [1, 1], targets: [1, 1] });
    close(deriveRegression(regressionStep(state)).mse, 0);
  });

  it('keeps constant-x data valid and equivalent predictors equivalent', () => {
    const state = { ...single(2, 1), samples: [{ id: 'a', x: 2, y: 1 }, { id: 'b', x: 2, y: 3 }] };
    close(deriveRegression(state).gradients, { weight: -8, bias: -4 });
    const updated = regressionStep(state);
    close({ weight: updated.weight, bias: updated.bias }, { weight: 0.8, bias: 0.4 });
    const alternate = { ...state, weight: 0, bias: 2 };
    expect(deriveRegression(updated).rows).toEqual(deriveRegression(alternate).rows);
    close(deriveRegression(updated).mse, 1);
    close(deriveRegression(updated).gradients, { weight: 0, bias: 0 });
  });

  it('preserves an exact perfect fit through all 20 updates', () => {
    const state = { ...CANONICAL_REGRESSION, samples: [{ id: 'a', x: -1, y: -1 }, { id: 'b', x: 1, y: 3 }], weight: 2, bias: 1 };
    expect(deriveRegression(state)).toMatchObject({ mse: 0, gradients: { weight: 0, bias: 0 }, next: { weight: 2, bias: 1 } });
    expect(regressionTrace(state, 20).every(frame => frame.state.weight === 2 && frame.state.bias === 1)).toBe(true);
  });

  it('does not assume a valid learning rate guarantees decreasing loss', () => {
    const state = single(2, 1, 0, 0, 1);
    expect(deriveRegression(state).mse).toBe(1);
    expect(deriveRegression(regressionStep(state)).mse).toBe(81);
  });

  it('accepts 64 samples and preserves their identity and order', () => {
    const samples = Array.from({ length: 64 }, (_, i) => ({ id: `sample-${i}`, x: i, y: 0 }));
    const result = deriveRegression({ ...single(0, 0), samples });
    expect(result.rows.map(row => row.id)).toEqual(samples.map(sample => sample.id));
    expect(result.shapes.X).toEqual([64, 1]);
    expect(result.mse).toBe(0);
    const reversed = { ...CANONICAL_REGRESSION, samples: [...CANONICAL_REGRESSION.samples].reverse() };
    close(deriveRegression(reversed).gradients, { weight: -5.2, bias: -1.6 });
  });

  it('rejects empty, oversized and malformed sample collections', () => {
    for (const samples of [[], Array.from({ length: 65 }, (_, i) => ({ id: `${i}`, x: 0, y: 0 })), null]) {
      expect(() => deriveRegression({ ...single(0, 0), samples } as unknown as RegressionState)).toThrowError(/1 to 64 samples/);
    }
    expect(() => deriveRegression({ ...single(0, 0), samples: Array(1) } as RegressionState)).toThrowError(RangeError);
    expect(() => deriveRegression(null as unknown as RegressionState)).toThrowError(RangeError);
  });

  it('rejects duplicate, missing and whitespace-only IDs', () => {
    for (const id of ['', ' \t', null, undefined, 3]) {
      expect(() => deriveRegression({ ...single(0, 0), samples: [{ id, x: 0, y: 0 }] } as unknown as RegressionState)).toThrowError(/IDs/);
    }
    expect(() => deriveRegression({ ...single(0, 0), samples: [{ id: 'same', x: 0, y: 0 }, { id: 'same', x: 1, y: 1 }] })).toThrowError(RangeError);
  });

  it('rejects every non-finite numerical input', () => {
    for (const value of [NaN, Infinity, -Infinity]) {
      for (const key of ['weight', 'bias', 'learningRate'] as const) {
        expect(() => deriveRegression({ ...single(0, 0), [key]: value })).toThrowError(RangeError);
      }
      for (const key of ['x', 'y'] as const) {
        expect(() => deriveRegression({ ...single(0, 0), samples: [{ id: 'a', x: 0, y: 0, [key]: value }] })).toThrowError(/finite/);
      }
    }
    expect(() => deriveRegression({ ...single(0, 0), weight: '1' } as unknown as RegressionState)).toThrowError(RangeError);
  });

  it('enforces the learning-rate bounds without discarding positive subnormal rates', () => {
    for (const learningRate of [0, -0.1, 1 + Number.EPSILON, 2]) {
      expect(() => deriveRegression({ ...single(0, 0), learningRate })).toThrowError(/Learning rate/);
    }
    for (const learningRate of [Number.MIN_VALUE, 1]) {
      expect(deriveRegression({ ...single(0, 1), learningRate }).mse).toBe(1);
    }
  });

  it.each([
    { name: 'prediction product', state: single(2, 0, Number.MAX_VALUE), message: /weight × x/ },
    { name: 'prediction sum', state: single(1, 0, Number.MAX_VALUE, Number.MAX_VALUE), message: /prediction/ },
    { name: 'signed residual', state: single(0, -Number.MAX_VALUE, 0, Number.MAX_VALUE), message: /residual/ },
    { name: 'residual square', state: single(0, 1e200), message: /squared error/ },
    { name: 'weighted residual', state: single(1e308, 0, 0, 2), message: /residual × x/ },
    { name: 'weight gradient', state: single(1e308, 0, 0, 1), message: /Weight gradient/ },
    {
      name: 'squared-error accumulation',
      state: { ...single(0, 0), samples: [{ id: 'a', x: 0, y: 1e154 }, { id: 'b', x: 0, y: -1e154 }] },
      message: /Squared-error sum/,
    },
    {
      name: 'weighted-residual accumulation',
      state: { ...single(0, 0), samples: [{ id: 'a', x: 1e308, y: -1 }, { id: 'b', x: 1e308, y: -1 }] },
      message: /Weighted-residual sum/,
    },
  ])('rejects finite inputs that overflow $name', ({ state, message }) => {
    expect(() => deriveRegression(state)).toThrowError(RangeError);
    expect(() => deriveRegression(state)).toThrowError(message);
  });

  it('accepts a large zero-residual predictor and retains a representable subnormal loss', () => {
    expect(deriveRegression(single(Number.MAX_VALUE, 0)).mse).toBe(0);
    const result = deriveRegression(single(1, 1e-160));
    expect(result.mse).toBeGreaterThan(0);
    expect(result.mse / 1e-320).toBeCloseTo(1, 5);
    expect(result.gradients.weight / -2e-160).toBeCloseTo(1, 14);
  });

  it('rejects an overflowing proposed state without mutating input or emitting partial history', () => {
    const state = single(1e308, 0, 0, 0.5, 1);
    const original = structuredClone(state);
    expect(deriveRegression(state).next.weight).toBe(-1e308);
    expect(() => regressionStep(state)).toThrowError(/weight × x/);
    expect(() => regressionTrace(state, 1)).toThrowError(RangeError);
    expect(state).toEqual(original);
    const later = single(1e100, 1e-100);
    expect(regressionTrace(later, 1)).toHaveLength(2);
    expect(() => regressionTrace(later, 2)).toThrowError(/squared error/);
  });

  it('validates trace bounds and includes the initial state for zero updates', () => {
    for (const steps of [-1, 21, 1.5, NaN, Infinity]) {
      expect(() => regressionTrace(CANONICAL_REGRESSION, steps)).toThrowError(/integer from 0 to 20/);
    }
    const initial = regressionTrace(CANONICAL_REGRESSION, 0);
    expect(initial).toHaveLength(1);
    expect(initial[0]).toEqual({ index: 0, state: CANONICAL_REGRESSION });
    expect(() => regressionTrace(single(0, NaN), 0)).toThrowError(RangeError);
    const full = regressionTrace(CANONICAL_REGRESSION, 20);
    expect(full).toHaveLength(21);
    expect(full.map(frame => frame.index)).toEqual(Array.from({ length: 21 }, (_, i) => i));
  });

  it('returns pure steps and detached, deeply frozen history', () => {
    const state = { ...CANONICAL_REGRESSION, samples: CANONICAL_REGRESSION.samples.map(sample => ({ ...sample })) };
    const original = structuredClone(state);
    deriveRegression(state);
    const next = regressionStep(state);
    const history = regressionTrace(state, 3);
    expect(state).toEqual(original);
    expect(next).not.toBe(state);
    expect(next.learningRate).toBe(state.learningRate);
    expect(next.samples).toEqual(state.samples);
    expect(history[0]!.state).not.toBe(state);
    expect(history[0]!.state.samples).not.toBe(history[1]!.state.samples);
    state.weight = 99;
    state.samples[0]!.x = 99;
    expect(history[0]!.state).toEqual(original);
    for (const frame of history) {
      expect(Object.isFrozen(frame)).toBe(true);
      expect(Object.isFrozen(frame.state)).toBe(true);
      expect(Object.isFrozen(frame.state.samples)).toBe(true);
      expect(frame.state.samples.every(Object.isFrozen)).toBe(true);
    }
    expect(Object.isFrozen(history)).toBe(true);
    expect(Reflect.set(history[0]!.state, 'weight', 99)).toBe(false);
    expect(Reflect.set(history[0]!.state.samples[0]!, 'y', 99)).toBe(false);
    expect(Object.isFrozen(CANONICAL_REGRESSION)).toBe(true);
    expect(CANONICAL_REGRESSION.samples.every(Object.isFrozen)).toBe(true);
    expect(history).toEqual(regressionTrace(original, 3));
  });
});
