import { describe, expect, it } from 'vitest';
import { svm, hinge, kernelValue, decision, MAX_STEPS, type SVMState, type Vec2, type Kernel } from '../../../src/parts/p07/model/svm';
import { initialLab, preset } from '../../../src/parts/p07/lesson';
import review from '../../../fixtures/p07/review-regressions.json';
const near = (a: number, b: number, tolerance = 2e-10) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tolerance * (1 + Math.abs(b)));
const anchor = () => preset(initialLab('hard'), 'anchor');

describe('bounded SVM mathematical contracts', () => {
  it('solves the hand-derived hard anchor and exact distances', () => {
    const s = anchor(), r = svm(s);
    expect(r.status).toBe('solved'); expect(r.w).toEqual([1, 0]); expect(r.b === 0).toBe(true);
    expect(r.alpha).toEqual([.5, .5]); expect(r.halfMargin).toBe(1); expect(r.primal).toBe(.5); expect(r.dual).toBe(.5);
    expect(r.rows.map(row => row.signedDistance)).toEqual([-1, 1]);
    expect(r.rows.every(row => row.support && row.onMargin && row.margin === 1)).toBe(true);
    expect(decision(s, r, [.4, 0])).toBe(.4);
  });
  it('retains on-margin redundant constraints separately from support coefficients', () => {
    const s = anchor(), first = s.points[0]!;
    const r = svm({ ...s, points: [first, { ...first, id: 'duplicate' }, s.points[1]!] });
    expect(r.rows.every(row => row.onMargin)).toBe(true); expect(r.rows.some(row => !row.support)).toBe(true);
    expect(r.primal).toBe(.5); near(r.equality!, 0);
  });
  it('finds vertex to edge projection and translation', () => {
    const s = anchor();
    const r = svm({ ...s, points: [{ id: 'a', x: [-1, -1], y: -1 }, { id: 'b', x: [-1, 1], y: -1 }, { id: 'c', x: [1, 0], y: 1 }] });
    expect(r.alpha).toEqual([.25, .25, .5]); expect(r.w).toEqual([1, 0]); expect(r.primal).toBe(.5);
    const moved = svm({ ...s, points: s.points.map(p => ({ ...p, x: [p.x[0] + .3, p.x[1] - .4] as Vec2 })) });
    near(moved.w![0], 1); near(moved.b!, -.3); near(moved.primal!, .5);
  });
  it('never turns intersection, containment or coincident opposite labels into a hard model', () => {
    for (const name of ['overlap', 'coincident', 'xor'] as const) {
      const s = preset(initialLab('hard'), name), r = svm(s);
      expect(r.status).toBe('infeasible'); expect(r.w).toBeNull(); expect(r.rows).toEqual([]);
      expect(() => decision(s, r, [0, 0])).toThrow();
    }
    const r = svm({ ...anchor(), points: [{ id: 'a', x: [-2, -2], y: -1 }, { id: 'b', x: [2, -2], y: -1 }, { id: 'c', x: [0, 2], y: -1 }, { id: 'd', x: [0, 0], y: 1 }] });
    expect(r.status).toBe('infeasible');
  });
  it.each([.01, .1, .25, .5, 1, 20])('matches the analytic soft regime C=%s', C => {
    const s = { ...anchor(), mode: 'soft' as const, C }, r = svm(s), w = Math.min(2 * C, 1);
    expect(r.status).toBe('approximate'); near(r.w![0], w); near(r.primal!, .5 * w * w + 2 * C * Math.max(0, 1 - w));
    r.alpha.forEach(a => near(a, Math.min(C, .5))); near(r.dual!, r.primal!);
    expect(r.rows.map(row => row.support)).toEqual([true, true]); expect(r.kkt).toBeLessThanOrEqual(2e-5);
  });
  it('never labels the exact separable cancelled-determinant case infeasible', () => {
    const s = review.orientation.input as unknown as SVMState;
    let r: ReturnType<typeof svm>;
    try { r = svm(s); }
    catch (error) { expect(error).toBeInstanceOf(RangeError); expect((error as Error).message).toMatch(/unresolved|representable|underflow|negative/); return; }
    expect(r.status).toBe('failed');
  });
  it('unconditionally rejects the hand-derived polynomial gain-stop diagnostic failure', () => {
    const s = review.diagnosticFailure.input as unknown as SVMState, r = svm(s);
    expect(r.gram).toEqual(review.diagnosticFailure.gram); expect(r.status).toBe('failed');
    expect(r.kkt).toBeGreaterThan(2e-5); expect(r.iterations).toBeLessThan(MAX_STEPS);
    expect(() => decision(s, r, [0, 0])).toThrow(/successful fit/);
  });
  it('takes feasible endpoints for flat curvature and reports zero-norm distances as undefined', () => {
    const r = svm(preset(initialLab('soft'), 'coincident'));
    expect(r.status).toBe('approximate'); expect(r.alpha).toEqual([1, 1]); expect(r.w).toEqual([0, 0]);
    expect(r.primal).toBe(2); expect(r.dual).toBe(2); expect(r.halfMargin).toBeNull(); expect(r.rows.every(row => row.signedDistance === null)).toBe(true);
  });
  it('uses the explicit zero kink subgradient and distinguishes mistakes from violations', () => {
    expect([-1, 0, .5, 1, 2].map(hinge)).toEqual([{ loss: 2, subgradient: -1 }, { loss: 1, subgradient: -1 }, { loss: .5, subgradient: -1 }, { loss: 0, subgradient: 0 }, { loss: 0, subgradient: 0 }]);
    const r = svm({ ...anchor(), mode: 'soft', C: .25 });
    expect(r.rows.every(row => row.margin > 0 && row.hinge > 0)).toBe(true);
  });
  it('changes the outlier separator under C and exposes genuine primal/dual diagnostics', () => {
    const s = initialLab('soft'), low = svm({ ...s, C: .05 }), high = svm({ ...s, C: 4 });
    expect(low.status).toBe('approximate'); expect(high.status).toBe('approximate');
    expect(Math.hypot(low.w![0] - high.w![0], low.w![1] - high.w![1])).toBeGreaterThan(1e-3);
    for (const r of [low, high]) { expect(r.iterations).toBeLessThanOrEqual(MAX_STEPS); expect(r.kkt).toBeLessThanOrEqual(2e-5); expect(Math.abs(r.gap!)).toBeLessThanOrEqual(1e-5 * (1 + r.primal!)); }
    expect(low.rows.reduce((sum, row) => sum + row.hinge, 0) + 2e-5).toBeGreaterThanOrEqual(high.rows.reduce((sum, row) => sum + row.hinge, 0));
  });
  it('reconstructs polynomial XOR from an explicit feature map', () => {
    const s = { ...initialLab('kernel'), kernel: { kind: 'polynomial' as const, gamma: 1, coef0: 0, degree: 2 } }, r = svm(s);
    expect(r.status).toBe('approximate'); near(r.primal!, .25); near(r.norm2!, .5);
    expect(r.gram).toEqual([[4, 4, 0, 0], [4, 4, 0, 0], [0, 0, 4, 4], [0, 0, 4, 4]]);
    for (const x of [[.25, .5], [-.25, .5], [0, 1]] as Vec2[]) near(decision(s, r, x), x[0] * x[1]);
    expect(r.w).toBeNull(); expect(r.rows.every(row => row.signedDistance === null)).toBe(true);
  });
  it('agrees with the analytic RBF XOR objective and off-training decisions', () => {
    const s = initialLab('kernel'), r = svm(s), a = Math.exp(-4);
    expect(r.status).toBe('approximate'); near(r.primal!, 2 / (1 - a) ** 2, 1e-5);
    for (const x of [[.5, .5], [-.5, .5], [0, 0]] as Vec2[]) {
      const expected = s.points.reduce((sum, p) => sum + p.y * Math.exp(-((p.x[0] - x[0]) ** 2 + (p.x[1] - x[1]) ** 2)), 0) / (1 - a) ** 2;
      near(decision(s, r, x), expected, 2e-5);
    }
  });
  it('checks literal kernel entries and PSD quadratic forms', () => {
    const s = initialLab('kernel');
    near(kernelValue([1, 0], [0, 1], s.kernel), Math.exp(-2));
    expect(kernelValue([1, 0], [0, 1], { ...s.kernel, kind: 'polynomial' })).toBe(1);
    for (const kind of ['linear', 'polynomial', 'rbf'] as const) {
      const r = svm({ ...s, kernel: { ...s.kernel, kind } });
      for (const c of [[1, -2, 3, -.5], [1, 1, -1, -1], [1, 0, 0, 0]]) {
        const quadratic = c.reduce((sum, a, i) => sum + c.reduce((v, b, j) => v + a * b * r.gram[i]![j]!, 0), 0);
        expect(quadratic).toBeGreaterThanOrEqual(-2e-10);
      }
    }
  });
  it('rejects malformed/sparse rows, duplicate/blank IDs and Boolean numeric inputs', () => {
    const s = anchor();
    const bad: unknown[] = [null, { ...s, points: [] }, { ...s, points: new Array(2) }, { ...s, points: [s.points[0], s.points[0]] }, { ...s, points: [{ ...s.points[0], id: ' ' }, s.points[1]] }, { ...s, points: [{ ...s.points[0], x: new Array(2) }, s.points[1]] }];
    for (const x of [[1], [1, 2, 3], [null, 0], [true, 0], [NaN, 0], [Infinity, 0], ['1', 0], [6, 0]]) bad.push({ ...s, points: [{ ...s.points[0], x }, s.points[1]] });
    for (const C of [true, null, '1', NaN, Infinity, 0, 21]) bad.push({ ...s, C });
    for (const kernel of [{ ...s.kernel, degree: 1.5 }, { ...s.kernel, degree: true }, { ...s.kernel, gamma: 0 }, { ...s.kernel, coef0: -1 }, { ...s.kernel, kind: 'unknown' }]) bad.push({ ...s, kernel });
    for (const y of [true, 0, '1', Infinity]) bad.push({ ...s, points: [{ ...s.points[0], y }, s.points[1]] });
    bad.push({ ...s, points: s.points.map(p => ({ ...p, y: 1 })) });
    for (const value of bad) expect(() => svm(value as SVMState)).toThrow();
    expect(() => kernelValue(new Array(2) as unknown as Vec2, [0, 0], s.kernel)).toThrow();
  });
  it('validates both public kernel query vectors and complete configuration before dispatch', () => {
    const vectors: unknown[] = [null, [], [0], [0, 0, 0], new Array(2), [true, 0], [null, 0], ["0", 0], [NaN, 0], [Infinity, 0], [-6.0001, 0], [6.0001, 0], [0, -6.0001], [0, 6.0001]];
    for (const kind of ['linear', 'polynomial', 'rbf'] as const) {
      const k: Kernel = { kind, gamma: 1, coef0: 1, degree: 2 };
      for (const vector of vectors) {
        expect(() => kernelValue(vector as Vec2, [0, 0], k)).toThrow();
        expect(() => kernelValue([0, 0], vector as Vec2, k)).toThrow();
      }
      const changes = [{ kind: 'unknown' }, { kind: true }, { gamma: true }, { gamma: null }, { gamma: '1' }, { gamma: 0 }, { gamma: 2.001 }, { gamma: NaN }, { coef0: true }, { coef0: -.001 }, { coef0: 2.001 }, { degree: true }, { degree: 1.5 }, { degree: 0 }, { degree: 5 }, { degree: Infinity }];
      const configs: unknown[] = [null, {}, ...changes.map(change => ({ ...k, ...change }))];
      for (const omitted of ['kind', 'gamma', 'coef0', 'degree']) configs.push(Object.fromEntries(Object.entries(k).filter(([key]) => key !== omitted)));
      for (const config of configs) expect(() => kernelValue([0, 0], [0, 0], config as Kernel)).toThrow();
      const expected = kind === 'linear' ? 0 : kind === 'polynomial' ? 1 : Math.exp(-72);
      expect(kernelValue([-6, 0], [0, 6], k)).toBe(expected);
      expect(kernelValue([6, 0], [0, -6], k)).toBe(expected);
    }
  });
  it('rejects nonrepresentable small arithmetic and preserves input immutability', () => {
    const s = anchor(), before = JSON.stringify(s); svm(s); expect(JSON.stringify(s)).toBe(before);
    const tiny = { ...s, points: [{ id: 'a', x: [-1e-200, 0] as Vec2, y: -1 }, { id: 'b', x: [1e-200, 0] as Vec2, y: 1 }] };
    expect(() => svm(tiny)).toThrow(/underflow/);
  });
});
