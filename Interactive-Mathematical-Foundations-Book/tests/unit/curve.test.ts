import { describe, expect, it } from 'vitest';
import { definedFraction, sampleCurve } from '../../src/platform/geometry/curve';

const W = { xMin: -4, xMax: 4, yMin: -4, yMax: 4 };

describe('sampleCurve', () => {
  it('samples a continuous function as one polyline whose points lie on the function', () => {
    const lines = sampleCurve(x => x * x, W, { samples: 80 });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveLength(81);
    for (const p of lines[0]!) expect(p.y).toBeCloseTo(p.x * p.x, 12);
    expect(lines[0]![0]!.x).toBe(-4);
    expect(lines[0]!.at(-1)!.x).toBe(4);
  });
  it('breaks where the function is undefined: ln x draws nothing for x ≤ 0 and never connects across the gap', () => {
    const lines = sampleCurve(x => (x > 0 ? Math.log(x) : null), W, { samples: 80 });
    expect(lines).toHaveLength(1);
    expect(Math.min(...lines[0]!.map(p => p.x))).toBeGreaterThan(0);
  });
  it('splits at named poles: tan has one polyline per branch and no segment crosses a pole', () => {
    const poles = [-3 * Math.PI / 2, -Math.PI / 2, Math.PI / 2, 3 * Math.PI / 2].filter(p => p > -4 && p < 4);
    const lines = sampleCurve(Math.tan, W, { samples: 400, breaks: poles });
    expect(lines).toHaveLength(poles.length + 1);
    for (const line of lines) for (let i = 1; i < line.length; i++) {
      for (const pole of poles) expect(line[i - 1]!.x < pole && line[i]!.x > pole, `crosses pole ${pole}`).toBe(false);
    }
  });
  it('without named poles the heuristic still separates 1/x across x = 0', () => {
    const lines = sampleCurve(x => (x === 0 ? null : 1 / x), W, { samples: 401 });
    for (const line of lines) expect(line.every(p => p.x < 0) || line.every(p => p.x > 0)).toBe(true);
  });
  it('keeps a steep continuous branch connected and finite (clamped, not dropped)', () => {
    const lines = sampleCurve(Math.exp, { xMin: -2, xMax: 12, yMin: -4, yMax: 4 }, { samples: 140 });
    expect(lines).toHaveLength(1);
    for (const p of lines[0]!) expect(Number.isFinite(p.y)).toBe(true);
    expect(Math.max(...lines[0]!.map(p => p.y))).toBeLessThanOrEqual(20 * 8);
  });
  it('treats ±Infinity and NaN as undefined', () => {
    expect(sampleCurve(() => NaN, W)).toEqual([]);
    expect(sampleCurve(x => (x < 0 ? Infinity : x), W, { samples: 80 })[0]![0]!.x).toBeGreaterThanOrEqual(0);
  });
  it('rejects a degenerate request', () => {
    expect(() => sampleCurve(x => x, W, { samples: 1 })).toThrow(RangeError);
    expect(() => sampleCurve(x => x, { xMin: 1, xMax: 1, yMin: 0, yMax: 1 })).toThrow(RangeError);
  });
  it('definedFraction reports the share of the interval where a function is defined', () => {
    expect(definedFraction(x => (x > 0 ? x : null), -1, 1, 200)).toBeCloseTo(0.5, 1);
  });
});
