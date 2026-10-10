import { describe, expect, it } from 'vitest';
import { CALCULUS, EMBLEM_SIZE, SCATTER, SHEAR, applyShear, binaryEntropy, bowl, descentPath, emblemFor, gaussianPdf, leastSquares, secantSlope, tangentSlope, toyFloats } from '../../src/shell/emblems';

describe('emblems are COMPUTED from real mathematics (and stay inside their plate)', () => {
  it('every Part has an emblem; all meaningful shapes lie inside the 96 × 72 plate (only faint grid backdrops may bleed off it)', () => {
    for (let part = 1; part <= 8; part++) {
      const shapes = emblemFor(part);
      expect(shapes.length, `Part ${part}`).toBeGreaterThan(1);
      for (const shape of shapes.filter(shape => !shape.faint)) {
        const numbers = shape.kind === 'dot' ? [shape.at!.x, shape.at!.y] : (shape.d!.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
        const xs = numbers.filter((_, i) => i % 2 === 0);
        const ys = numbers.filter((_, i) => i % 2 === 1);
        for (const x of xs) { expect(x).toBeGreaterThanOrEqual(-0.5); expect(x).toBeLessThanOrEqual(EMBLEM_SIZE.width + 0.5); }
        for (const y of ys) { expect(y).toBeGreaterThanOrEqual(-0.5); expect(y).toBeLessThanOrEqual(EMBLEM_SIZE.height + 0.5); }
      }
    }
  });
  it('rejects a Part that does not exist', () => {
    expect(() => emblemFor(0)).toThrow(RangeError);
    expect(() => emblemFor(9)).toThrow(RangeError);
  });

  it('II — columns of the matrix are the images of the basis vectors (v′ = Av): e₁ ↦ (a, c), e₂ ↦ (b, d)', () => {
    expect(applyShear(SHEAR, { x: 1, y: 0 })).toEqual({ x: SHEAR.a, y: SHEAR.c });
    expect(applyShear(SHEAR, { x: 0, y: 1 })).toEqual({ x: SHEAR.b, y: SHEAR.d });
  });
  it('III — the tangent slope is the derivative, and the secant slope tends to it as b → a', () => {
    expect(tangentSlope()).toBeCloseTo(0.16, 12); // f(x) = 0.2x² + 0.35, f′(0.4) = 0.16
    expect(secantSlope()).toBeCloseTo(0.52, 12); // (f(2.2) − f(0.4)) / 1.8, worked by hand
    const { a, f } = CALCULUS;
    for (const h of [1e-3, 1e-5, 1e-7]) expect(Math.abs((f(a + h) - f(a)) / h - tangentSlope())).toBeLessThan(h);
  });
  it('IV — the Gaussian density peaks at 1/√(2π) and has ≈ 68.27 % of its mass within ±1', () => {
    expect(gaussianPdf(0)).toBeCloseTo(0.3989422804014327, 15);
    const n = 2000; // Simpson's rule on [−1, 1]
    const h = 2 / n;
    let sum = gaussianPdf(-1) + gaussianPdf(1);
    for (let i = 1; i < n; i++) sum += gaussianPdf(-1 + i * h) * (i % 2 === 1 ? 4 : 2);
    expect((sum * h) / 3).toBeCloseTo(0.6826894921370859, 9);
  });
  it('V — least squares passes through the centroid, has zero residual sum, and solves the normal equations', () => {
    const { slope, intercept, meanX, meanY } = leastSquares(SCATTER);
    expect(intercept + slope * meanX).toBeCloseTo(meanY, 12);
    expect(SCATTER.reduce((s, p) => s + (p.y - (intercept + slope * p.x)), 0)).toBeCloseTo(0, 12);
    // Independent check: solve Σy = n·b + m·Σx and Σxy = b·Σx + m·Σx² by Cramer's rule.
    const n = SCATTER.length;
    const sx = SCATTER.reduce((s, p) => s + p.x, 0), sy = SCATTER.reduce((s, p) => s + p.y, 0);
    const sxy = SCATTER.reduce((s, p) => s + p.x * p.y, 0), sxx = SCATTER.reduce((s, p) => s + p.x * p.x, 0);
    const det = n * sxx - sx * sx;
    expect(slope).toBeCloseTo((n * sxy - sx * sy) / det, 12);
    expect(intercept).toBeCloseTo((sy * sxx - sx * sxy) / det, 12);
  });
  it('VI — gradient descent on f = x² + 3y² strictly decreases f and ends near the minimum', () => {
    const path = descentPath({ x: -2.4, y: 1.35 }, 0.28, 9);
    expect(path).toHaveLength(10);
    for (let i = 1; i < path.length; i++) expect(bowl(path[i]!)).toBeLessThan(bowl(path[i - 1]!));
    expect(bowl(path[9]!)).toBeLessThan(0.01 * bowl(path[0]!));
    // one step by hand: x ← x − η·2x = −2.4·(1 − 0.56), y ← y − η·6y = 1.35·(1 − 1.68)
    expect(path[1]!.x).toBeCloseTo(-2.4 * 0.44, 12);
    expect(path[1]!.y).toBeCloseTo(1.35 * -0.68, 12);
  });
  it('VII — binary entropy is symmetric, zero at the ends, and maximal at p = ½ with value ln 2', () => {
    expect(binaryEntropy(0.5)).toBeCloseTo(Math.LN2, 15);
    expect(binaryEntropy(0)).toBe(0);
    expect(binaryEntropy(1)).toBe(0);
    for (let p = 0.05; p < 1; p += 0.05) {
      expect(binaryEntropy(p)).toBeCloseTo(binaryEntropy(1 - p), 14);
      expect(binaryEntropy(p)).toBeLessThanOrEqual(Math.LN2 + 1e-15);
    }
  });
  it('VIII — a toy float with a 2-bit fraction has 16 values in [1, 16) whose gaps double each binade', () => {
    const v = toyFloats();
    expect(v).toHaveLength(16);
    expect(v[0]).toBe(1);
    expect(v[15]).toBe(14);
    const gaps = v.slice(1).map((x, i) => x - v[i]!);
    // worked by hand: 1, 1.25, 1.5, 1.75 | 2, 2.5, 3, 3.5 | 4, 5, 6, 7 | 8, 10, 12, 14
    expect(gaps).toEqual([0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1, 2, 2, 2]);
  });
});
