import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { CANONICAL_REGRESSION, predictRegression, type RegressionState } from '../../../src/parts/p02/model/linear-regression';
import { deriveRegressionLesson, editRegressionSample, moveRegressionSample, regressionPointer } from '../../../src/parts/p02/linear-regression-lesson';

describe('III-07 pure lesson adapter', () => {
  it('strictly renders symbolic identities and approximate substitutions without rounding state', () => {
    const state = { ...CANONICAL_REGRESSION, weight: 0.1234567, bias: -0.2345678, learningRate: 0.1234567 };
    const d = deriveRegressionLesson(state);
    expect(d.state.weight).toBe(0.1234567);
    expect(d.rows[0]!.prediction).toBe(predictRegression(-2, 0.1234567, -0.2345678));
    expect(d.formulas[0]!.tex).toContain('\\hat y=wx+b');
    expect(d.formulas[0]!.tex).toContain('w\\approx0.1235');
    expect(d.formulas[0]!.tex).not.toContain('w=0.1235');
    expect(d.formulas[2]!.tex).toContain('=w-\\eta\\frac{\\partial L}{\\partial w}');
    expect(d.formulas[2]!.tex).toContain('\\approx(0.1235)-(0.1235)');
    for (const formula of d.formulas) expect(() => katex.renderToString(formula.tex, { throwOnError: true, strict: 'error' })).not.toThrow();
    expect(d.speech).toContain('Weight 0.1234567');
    expect(d.points[0]!.speech).toContain('Sample s1, x -2, target -3');
  });

  it('uses the authoritative predictor and rejects invalid or overflowing endpoint inputs', () => {
    expect(predictRegression(2, 0.5, 0)).toBe(1);
    expect(predictRegression(-2, 1.02, 0.16)).toBeCloseTo(-1.88, 14);
    for (const values of [[NaN, 1, 0], [0, Infinity, 0], [0, 0, -Infinity], [2, Number.MAX_VALUE, 0]]) {
      expect(() => predictRegression(values[0]!, values[1]!, values[2]!)).toThrowError(RangeError);
    }
  });

  it('shows round-trip given coordinates and preserves fine precision during keyboard edits', () => {
    const x = 0.123456789123, y = -1.23456789123;
    const state = editRegressionSample(CANONICAL_REGRESSION, 's3', { x, y });
    const d = deriveRegressionLesson(state);
    expect(d.rows[2]!.text.x).toBe('0.123456789123');
    expect(d.rows[2]!.text.y).toBe('-1.23456789123');
    expect(Number(d.rows[2]!.text.x)).toBe(x);
    expect(Number(d.rows[2]!.text.y)).toBe(y);
    expect(d.points[2]!.name).toContain('x 0.123456789123, target -1.23456789123');
    expect(d.points[2]!.speech).toContain('x 0.123456789123, target -1.23456789123');
    expect(d.rows[2]!.text.prediction).toMatch(/^≈ /);
    expect(d.rows[2]!.text.residual).toMatch(/^≈ /);
    expect(d.scalars.find(value => value.key === 'mse')!.text).toMatch(/^≈ /);
    const right = moveRegressionSample(state, 's3', 'ArrowRight');
    expect(right.samples[2]!.x).toBe(x + 0.1);
    expect(right.samples[2]!.y).toBe(y);
    const up = moveRegressionSample(right, 's3', 'ArrowUp', true);
    expect(up.samples[2]!.x).toBe(x + 0.1);
    expect(up.samples[2]!.y).toBe(y + 0.5);
    expect(state.samples[2]).toEqual({ id: 's3', x, y });
  });

  it('projects observations and predictions with exactly equal axis scales', () => {
    const d = deriveRegressionLesson(CANONICAL_REGRESSION, 342);
    expect(d.plot.viewBox).toBe('0 0 640 640');
    expect(d.plot.scale).toBe(44);
    for (const point of d.points) {
      expect(point.cx).toBe(320 + 44 * point.x);
      expect(point.cy).toBe(320 - 44 * point.y);
      expect(point.py).toBe(320 - 44 * point.prediction);
      expect(point.residual).toEqual({ x1: point.cx, y1: point.cy, x2: point.cx, y2: point.py });
    }
    expect(d.scalars.find(value => value.key === 'mse')!.number).toBe(d.mse);
    expect(d.rows[0]!.prediction).toBe(d.points[0]!.prediction);
    expect(d.inspector.map(row => row.value)).toEqual(['5', '5 × 1', '1 × 1', '5 × 1', 'Scalar']);
  });

  it('keeps hit targets at least 44 CSS pixels over narrow and wide layouts', () => {
    for (const width of [180, 320, 342, 640, 900]) {
      const d = deriveRegressionLesson(CANONICAL_REGRESSION, width);
      expect(d.points.every(point => 2 * point.hitRadius * width / 640 >= 45.999)).toBe(true);
    }
    for (const width of [0, -1, NaN, Infinity]) expect(() => deriveRegressionLesson(CANONICAL_REGRESSION, width)).toThrowError(RangeError);
  });

  it('clips line endpoints geometrically while preserving their affine predictions', () => {
    for (const weight of [-4, -0.5, 0, 1e-300, 0.5, 4]) for (const bias of [-4, 0, 4]) {
      const d = deriveRegressionLesson({ ...CANONICAL_REGRESSION, weight, bias });
      for (const point of [d.plot.line.from, d.plot.line.to]) {
        expect(point.y).toBe(predictRegression(point.x, weight, bias));
        expect(point.x).toBeGreaterThanOrEqual(-6);
        expect(point.x).toBeLessThanOrEqual(6);
        expect(point.y).toBeGreaterThanOrEqual(-6);
        expect(point.y).toBeLessThanOrEqual(6);
      }
    }
  });

  it('converts pointer positions independently of responsive scale and letterboxing', () => {
    expect(regressionPointer(181, 159, { left: 10, top: 10, width: 342, height: 342 })).toEqual({ x: 0, y: 0.9 });
    expect(regressionPointer(220, 248, { left: 10, top: 20, width: 640, height: 640 })).toEqual({ x: -2.5, y: 2.1 });
    expect(regressionPointer(350, 300, { left: 0, top: 0, width: 700, height: 600 })).toEqual({ x: 0, y: 0 });
    expect(regressionPointer(10000, -10000, { left: 0, top: 0, width: 320, height: 320 })).toEqual({ x: 5, y: 5 });
    expect(() => regressionPointer(0, 0, { left: 0, top: 0, width: 0, height: 0 })).toThrowError(RangeError);
    expect(() => regressionPointer(NaN, 0, { left: 0, top: 0, width: 320, height: 320 })).toThrowError(RangeError);
  });

  it('edits immutable selected-frame samples and moves keyboard coordinates in decimal steps', () => {
    const original = structuredClone(CANONICAL_REGRESSION);
    const edited = editRegressionSample(original, 's3', { x: 0.5, y: 1.5 });
    const moved = moveRegressionSample(edited, 's3', 'ArrowRight');
    expect(moved.samples[2]).toEqual({ id: 's3', x: 0.6, y: 1.5 });
    expect(moveRegressionSample(moved, 's3', 'ArrowDown', true).samples[2]!.y).toBe(1);
    expect(original).toEqual(CANONICAL_REGRESSION);
    expect(() => editRegressionSample(original, 'missing', { x: 0 })).toThrowError(RangeError);
  });

  it('rejects unsupported numeric entries and updates without clamping or mutating state', () => {
    const original = structuredClone(CANONICAL_REGRESSION);
    for (const change of [{ weight: 4.1 }, { bias: -4.1 }, { learningRate: 0.0009 }]) {
      expect(() => deriveRegressionLesson({ ...original, ...change })).toThrowError(/supported range/);
    }
    expect(() => deriveRegressionLesson(editRegressionSample(original, 's1', { x: 5.1 }))).toThrowError(/between/);
    const d = deriveRegressionLesson({ ...original, learningRate: 1 });
    expect(d.next.weight).toBeGreaterThan(4);
    expect(() => deriveRegressionLesson({ ...d.state, ...d.next } as RegressionState)).toThrowError(/State preserved/);
    expect(original).toEqual(CANONICAL_REGRESSION);
  });
});
