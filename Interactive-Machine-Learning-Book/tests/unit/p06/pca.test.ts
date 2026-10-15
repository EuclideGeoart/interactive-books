import { describe, expect, it } from 'vitest';
import { CANONICAL, pca, editPoint, componentTrace, type PCAState, type Vec2 } from '../../../src/parts/p06/model/pca';
const state = (X: readonly Vec2[], k = 1, normalization: PCAState['normalization'] = 'sample'): PCAState => ({ points: X.map((x, i) => ({ id: String(i), x })), k, normalization });
function defined(s: PCAState) { const r = pca(s); if (r.status !== 'defined') throw new Error(r.reason); return r; }
const near = (a: number, b: number, epsilon = 2e-12) => expect(Math.abs(a - b)).toBeLessThanOrEqual(epsilon * (1 + Math.abs(b)));

describe('PCA numerical mechanism', () => {
  it('centers the literal cloud and accumulates every covariance product', () => {
    const r = defined(CANONICAL);
    expect(r.mean).toEqual([0, 0]); expect(r.products).toEqual([[4, 2, 1], [1, 2, 4], [1, 2, 4], [4, 2, 1]]);
    expect(r.divisor).toBe(3); near(r.covariance[0][0], 10 / 3); near(r.covariance[0][1], 8 / 3);
    near(r.eigenvalues[0], 6); near(r.eigenvalues[1], 2 / 3); near(r.retained!, .9);
    r.rows.forEach(row => near(row.squaredError, .5)); near(r.sse, 2); near(r.mse, .5); near(r.entryMse, .25);
  });
  it('sample/population changes eigenvalue scale but preserves projectors, fractions and reconstruction', () => {
    const sample = defined(CANONICAL), pop = defined({ ...CANONICAL, normalization: 'population' });
    sample.eigenvalues.forEach((value, i) => near(pop.eigenvalues[i]!, value * 3 / 4));
    near(pop.retained!, sample.retained!); near(pop.sse, sample.sse);
    pop.rows.forEach((row, i) => row.reconstructed.forEach((value, j) => near(value, sample.rows[i]!.reconstructed[j]!)));
  });
  it('translation, uniform scaling and row order have the expected invariants', () => {
    const base = defined(CANONICAL);
    const translated = defined({ ...CANONICAL, points: CANONICAL.points.map(p => ({ ...p, x: [p.x[0] + 3, p.x[1] - 4] })) });
    expect(translated.mean).toEqual([3, -4]); expect(translated.covariance).toEqual(base.covariance); near(translated.sse, base.sse);
    const scaled = defined({ ...CANONICAL, points: CANONICAL.points.map(p => ({ ...p, x: [3 * p.x[0], 3 * p.x[1]] })) });
    near(scaled.sse, 9 * base.sse); scaled.eigenvalues.forEach((v, i) => near(v, 9 * base.eigenvalues[i]!));
    expect(defined({ ...CANONICAL, points: [...CANONICAL.points].reverse() }).covariance).toEqual(base.covariance);
  });
  it('ordered orthogonal eigenpairs, reconstruction and discarded energy agree for asymmetric data at every k', () => {
    for (const k of [0, 1, 2]) {
      const s = state([[-2, -.7], [-.5, 2], [1, -.1], [3, 1]], k);
      const r = defined(s), [v1, v2] = r.axes;
      near(v1[0] * v2[0] + v1[1] * v2[1], 0); near(Math.hypot(...v1), 1); near(Math.hypot(...v2), 1);
      expect(r.eigenvalues[0]).toBeGreaterThanOrEqual(r.eigenvalues[1]); expect(r.eigenvalues[1]).toBeGreaterThanOrEqual(0);
      r.axes.forEach((v, j) => r.covariance.forEach((row, h) => near(row[0] * v[0] + row[1] * v[1], r.eigenvalues[j]! * v[h]!)));
      near(r.eigenvalues[0] + r.eigenvalues[1], r.covariance[0][0] + r.covariance[1][1]);
      near(r.sse, r.divisor * r.eigenvalues.slice(k).reduce((sum, v) => sum + v, 0));
      r.rows.forEach(row => {
        expect(row.scores).toHaveLength(k);
        r.axes.slice(0, k).forEach(v => near(row.residual[0] * v[0] + row.residual[1] * v[1], 0));
        row.x.forEach((v, j) => near(row.reconstructed[j]! + row.residual[j]!, v));
      });
    }
  });
  it('k=0 is the mean baseline and k=2 applies exact source-coordinate identity', () => {
    const source = state([[.1, -.3], [.7, .123456789], [-.9, .4]], 2);
    const full = defined(source); expect(full.rows.map(r => r.reconstructed)).toEqual(source.points.map(p => p.x)); expect(full.sse).toBe(0);
    const none = defined({ ...source, k: 0 }); none.rows.forEach(row => { expect(row.scores).toEqual([]); expect(row.reconstructed).toEqual(none.mean); });
    near(none.sse, none.divisor * none.totalVariance);
  });
  it('rank-one line keeps zero minor energy without a rank tolerance', () => {
    const r = defined(state([[-1, -1], [1, 1]], 1, 'population'));
    expect(r.eigenvalues[1]).toBe(0); near(r.eigenvalues[0], 2); near(r.sse, 0);
  });
  it('repeated eigenvalues declare ambiguity; arbitrary one-line reconstructions have equal total error', () => {
    const X: Vec2[] = [[-1, 0], [1, 0], [0, -1], [0, 1]], r = defined(state(X, 1, 'population'));
    expect(r.repeated).toBe(true); near(r.retained!, .5); near(r.sse, 2);
    for (const theta of [0, .3, 1.2]) {
      const v = [Math.cos(theta), Math.sin(theta)];
      const error = X.reduce((sum, x) => { const z = x[0] * v[0]! + x[1] * v[1]!; return sum + (x[0] - z * v[0]!) ** 2 + (x[1] - z * v[1]!) ** 2; }, 0);
      near(error, r.sse);
    }
  });
  it('zero variance and one-sample conventions are explicit', () => {
    for (const k of [0, 1, 2]) {
      const zero = defined(state([[.1, .2], [.1, .2]], k)); expect(zero.mean).toEqual([.1, .2]); expect(zero.zeroVariance).toBe(true);
      expect(zero.ratios).toBeNull(); expect(zero.retained).toBeNull(); expect(zero.sse).toBe(0);
    }
    const one = pca(state([[1, 2]])); expect(one.status).toBe('undefined'); expect(one).not.toHaveProperty('sse');
    expect(defined(state([[1, 2]], 1, 'population')).sse).toBe(0);
  });
  it('keeps a tiny positive minor eigenvalue instead of cancellation/fake zero', () => {
    const r = defined(state([[-1, 0], [1, 0], [0, -1e-8], [0, 1e-8]], 1, 'population'));
    expect(r.eigenvalues[1]).toBeGreaterThan(0); expect(Math.abs(r.eigenvalues[1] / 5e-17 - 1)).toBeLessThan(2e-12);
    expect(Math.abs(r.sse / 2e-16 - 1)).toBeLessThan(2e-12);
  });
});

describe('complete input boundary before shortcuts', () => {
  it('rejects empty/ragged/duplicate/missing/nonfinite and invalid configuration even at k=0', () => {
    const invalid: unknown[] = [null, { ...CANONICAL, points: [] }, { ...CANONICAL, points: [null] },
      { ...CANONICAL, points: [{ id: 'a', x: [1] }] }, { ...CANONICAL, points: [{ id: 'a', x: [1, 2, 3] }] },
      { ...CANONICAL, points: [{ id: 'a', x: [null, 0] }] }, { ...CANONICAL, points: [{ id: 'a', x: [true, 0] }] },
      { ...CANONICAL, points: [{ id: '', x: [1, 2] }] }, { ...CANONICAL, points: [{ id: 'a', x: [1, 2] }, { id: 'a', x: [1, 2] }] },
      { ...CANONICAL, k: true }, { ...CANONICAL, k: 1.5 }, { ...CANONICAL, k: 3 }, { ...CANONICAL, k: Infinity },
      { ...CANONICAL, normalization: 'invalid' }, state([[NaN, 0]], 0), state([[Infinity, 0]], 0),
      state(Array.from({ length: 129 }, () => [0, 0] as Vec2), 0)];
    for (const input of invalid) expect(() => pca(input as PCAState)).toThrow(RangeError);
    expect(defined({ ...CANONICAL, k: 1.0 }).sse).toBe(defined(CANONICAL).sse);
  });
  it('rejects sparse outer and inner arrays before singleton/sample and constant/population returns', () => {
    const outer = new Array(1) as PCAState['points'];
    for (const normalization of ['sample', 'population'] as const) for (const k of [0, 2]) {
      expect(() => pca({ points: outer, normalization, k })).toThrow(RangeError);
      for (const j of [0, 1]) {
        const x: [number, number] = [0, 0]; Reflect.deleteProperty(x, j);
        const s = { points: [{ id: 'a', x }], normalization, k };
        expect(() => pca(s)).toThrow(RangeError); expect(() => pca(JSON.parse(JSON.stringify(s)))).toThrow(RangeError);
        expect(j in x).toBe(false);
      }
    }
  });
  it('rejects computed overflow and squared-component underflow', () => {
    for (const X of [[[1e308, 0], [-1e308, 0]], [[1e200, 0], [0, 0]], [[1e-200, 0], [-1e-200, 0]]] as Vec2[][])
      expect(() => pca(state(X))).toThrow(RangeError);
  });
  it('validates edit identity and preserves inputs on invalid edits', () => {
    const before = JSON.stringify(CANONICAL);
    expect(() => editPoint(CANONICAL, 'unknown', { x: 1 })).toThrow(); expect(() => editPoint(CANONICAL, 'a', { x: Infinity })).toThrow();
    const next = editPoint(CANONICAL, 'a', { x: -.123456789 }); expect(next.points[0]!.x[0]).toBe(-.123456789);
    expect(JSON.stringify(CANONICAL)).toBe(before);
  });
  it('immutable replay snapshots detach and edits fork from the displayed frame', () => {
    const input = structuredClone(CANONICAL), trace = componentTrace(input);
    expect(trace.map(f => f.state.k)).toEqual([0, 1, 2]); expect(Object.isFrozen(trace[1]!.state.points[0]!.x)).toBe(true);
    Reflect.set(input.points[0]!, 'x', [5, 5]); expect(trace[1]!.state.points[0]!.x).toEqual([-2, -1]);
    const fork = editPoint(trace[0]!.state, 'a', { y: 0 }); expect(fork.k).toBe(0); expect(trace[0]!.state.points[0]!.x).toEqual([-2, -1]);
  });
});

it('rejects energy normalization underflow rather than declaring a nonconstant batch zero variance', () => {
  const X = Array.from({ length: 128 }, (_, i) => [i === 0 ? -2e-162 : i === 1 ? 2e-162 : 0, 0] as Vec2);
  expect(() => pca(state(X, 0, 'population'))).toThrow(RangeError);
});

it('rejects an eigenvector whose scaled off-diagonal underflows rather than returning NaN', () => {
  const X: Vec2[] = [[0, 0], [1e100, 0], [-1e100, 0], [0, 1e100], [0, -1e100], [1e-100, 1e-100], [-1e-100, -1e-100]];
  expect(() => pca(state(X, 1, 'population'))).toThrow(RangeError);
});
