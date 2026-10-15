import { describe, expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  inspectLloyd, lloydStep, lloydTrace, initialize, samePartition, squaredDistance,
  hierarchical, cutHierarchy, dbscan, type LloydState, type Point, type Vec,
} from '../../../src/parts/p05/model/clustering';
import { pca, componentTrace, type PCAState } from '../../../src/parts/p06/model/pca';

const points = (rows: readonly Vec[]): Point[] => rows.map((x, i) => ({ id: `owner${i}`, x }));
const state = (rows: readonly Vec[], centers: readonly Vec[], scales: Vec = [1, 1]): LloydState => ({
  points: points(rows), centers, scales, labels: null, phase: 'ready', iteration: 0, stopped: false,
});
const cloud = (rows: readonly Vec[], k = 1, normalization: PCAState['normalization'] = 'sample'): PCAState => ({ points: points(rows), k, normalization });
function defined(s: PCAState) {
  const result = pca(s);
  if (result.status !== 'defined') throw new Error(result.reason);
  return result;
}
function close(actual: number, expected: number, tolerance = 2e-12) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance * (1 + Math.abs(expected)));
}
const separated: Vec[] = [[0, 0], [2, 0], [8, 0], [10, 0]];

describe('owner hand-derived clustering challenges', () => {
  test('distances, assignments, sums and exact mean update', () => {
    const ready = state(separated, [[0, 0], [10, 0]]);
    const initial = inspectLloyd(ready);
    expect(initial.distances).toEqual([[0, 100], [4, 64], [64, 4], [100, 0]]);
    expect(initial.labels).toEqual([0, 0, 1, 1]);
    expect(initial.objective).toBe(8);
    expect(initial.clusters.map(c => c.sums)).toEqual([[2, 0], [18, 0]]);
    const update = lloydStep(lloydStep(ready));
    expect(update.centers).toEqual([[1, 0], [9, 0]]);
    expect(inspectLloyd(update).objective).toBe(4);
    expect(lloydTrace(ready).at(-1)!.state.stopped).toBe(true);
  });
  test('one-cluster mean and objective', () => {
    const result = lloydStep(lloydStep(state(separated, [[0, 0]])));
    expect(result.centers).toEqual([[5, 0]]);
    expect(inspectLloyd(result).objective).toBe(68);
  });
  test('label permutation preserves objective and co-membership', () => {
    const first = inspectLloyd(state(separated, [[0, 0], [10, 0]]));
    const second = inspectLloyd(state(separated, [[10, 0], [0, 0]]));
    expect(second.objective).toBe(first.objective);
    expect(samePartition(first.labels, second.labels)).toBe(true);
    expect(samePartition([0, 1, 0], [4, 9, 9])).toBe(false);
  });
  test('stable Lloyd fixed point can lose to another partition', () => {
    const rows: Vec[] = [[0, 0], [4, 0], [5, 0], [9, 0]];
    const local = lloydTrace(state(rows, [[0, 0], [9, 0]])).at(-1)!.state;
    expect(local.centers).toEqual([[2, 0], [7, 0]]);
    expect(local.stopped).toBe(true);
    expect(inspectLloyd(local).objective).toBe(16);
    expect(inspectLloyd(state(rows, [[0, 0], [6, 0]])).objective).toBe(14);
  });
  test('every declared Lloyd half-step is non-increasing', () => {
    const trace = lloydTrace(state(separated, [[0, 0], [10, 0]]));
    for (let i = 1; i < trace.length; i++) {
      expect(inspectLloyd(trace[i]!.state).objective).toBeLessThanOrEqual(inspectLloyd(trace[i - 1]!.state).objective);
      expect(Object.isFrozen(trace[i]!.state.points[0]!.x)).toBe(true);
    }
  });
  test('exact tie chooses the lowest label and empty centroid is retained', () => {
    const initial = state([[0, 0], [2, 0]], [[0, 0], [4, 0]]);
    expect(inspectLloyd(initial).labels).toEqual([0, 0]);
    expect(inspectLloyd(initial).ties).toEqual([false, true]);
    const result = lloydStep(lloydStep(initial));
    expect(result.centers).toEqual([[1, 0], [4, 0]]);
    expect(inspectLloyd(result).clusters[1]!.empty).toBe(true);
  });
  test('coincident observations retain all identities and empty groups', () => {
    const result = inspectLloyd(state([[1, 1], [1, 1], [1, 1]], [[1, 1], [1, 1], [1, 1]]));
    expect(result.labels).toEqual([0, 0, 0]);
    expect(result.clusters.map(c => c.count)).toEqual([3, 0, 0]);
    expect(result.objective).toBe(0);
  });
  test('seed 7 selects the hand-derived first and fourth observations', () => {
    expect(initialize(points(separated), 2, 7)).toEqual([[0, 0], [10, 0]]);
    expect(initialize(points(separated), 2, 0)).toEqual([[0, 0], [2, 0]]);
    expect(() => initialize(points(separated), 2, -1)).toThrow();
  });
  test('reference scales change real assignments', () => {
    const rows: Vec[] = [[0, 0], [0, 2], [3, 0], [3, 2]];
    expect(inspectLloyd(state(rows, [[0, 0], [3, 2]])).labels).toEqual([0, 0, 1, 1]);
    expect(inspectLloyd(state(rows, [[0, 0], [3, 2]], [1, .1])).labels).toEqual([0, 1, 0, 1]);
  });
  test('independent linkage heights and selected merge membership', () => {
    const rows = points([[0, 0], [2, 0], [5, 0]]);
    for (const [linkage, height] of [['single', 3], ['complete', 5], ['average', 4]] as const) {
      const result = hierarchical(rows, linkage);
      expect(result.merges.map(m => m.height)).toEqual([2, height]);
      expect(cutHierarchy(rows, result.merges, 1).map(g => g.members)).toEqual([[2], [0, 1]]);
    }
  });
  test('closed density neighborhoods distinguish core, border and noise', () => {
    const result = dbscan(points([[0, 0], [.5, 0], [1, 0], [5, 0]]), .5, 3);
    expect(result.neighborhoods).toEqual([[0, 1], [0, 1, 2], [1, 2], [3]]);
    expect(result.kinds).toEqual(['border', 'core', 'border', 'noise']);
    expect(result.labels).toEqual([0, 0, 0, -1]);
  });
  test('holes and arithmetic failures cannot become geometry or ties', () => {
    expect(() => inspectLloyd({ ...state(separated, [[0, 0]]), points: new Array<Point>(2) })).toThrow();
    expect(() => squaredDistance(new Array(2) as unknown as Vec, [0, 0])).toThrow();
    expect(() => squaredDistance([1e-200, 0], [0, 0])).toThrow(/underflow/);
    expect(() => squaredDistance([1e308, 0], [-1e308, 0])).toThrow(/finite/);
  });
});

describe('owner PCA geometry and numerical challenges', () => {
  const line: Vec[] = [[-1, -2], [0, 0], [1, 2]];
  test('rank-one covariance and sign-invariant projector', () => {
    const result = defined(cloud(line));
    expect(result.mean).toEqual([0, 0]);
    expect(result.covariance).toEqual([[1, 2], [2, 4]]);
    close(result.eigenvalues[0], 5); close(result.eigenvalues[1], 0);
    const v = result.axes[0];
    close(v[0] ** 2, 1 / 5); close(v[0] * v[1], 2 / 5); close(v[1] ** 2, 4 / 5);
    close(result.sse, 0); close(result.retained!, 1);
  });
  test('normalization and translation preserve declared geometry', () => {
    const sample = defined(cloud(line));
    const population = defined(cloud(line, 1, 'population'));
    const translated = defined(cloud(line.map(x => [x[0] + 4, x[1] + 7])));
    expect(translated.mean).toEqual([4, 7]);
    expect(translated.covariance).toEqual(sample.covariance);
    close(population.eigenvalues[0], sample.eigenvalues[0] * 2 / 3);
    close(translated.sse, sample.sse);
  });
  test('repeated spectrum is checked by subspace and error, without a unique basis', () => {
    const result = defined(cloud([[1, 0], [-1, 0], [0, 1], [0, -1]]));
    expect(result.repeated).toBe(true);
    close(result.eigenvalues[0], 2 / 3); close(result.eigenvalues[1], 2 / 3);
    close(result.axes[0][0] * result.axes[1][0] + result.axes[0][1] * result.axes[1][1], 0);
    close(result.retained!, .5); close(result.sse, 2);
  });
  test('all component counts have actual score/reconstruction shapes and energy identities', () => {
    for (const k of [0, 1, 2]) {
      const result = defined(cloud(line, k));
      expect(result.rows.every(row => row.scores.length === k && row.reconstructed.length === 2)).toBe(true);
      close(result.sse, result.divisor * result.eigenvalues.slice(k).reduce((sum, x) => sum + x, 0));
      close(result.mse, result.sse / 3); close(result.entryMse, result.sse / 6);
    }
    expect(defined(cloud(line, 0)).sse).toBe(10);
    expect(defined(cloud(line, 2)).rows.map(row => row.reconstructed)).toEqual(line);
  });
  test('zero spread and singleton normalization have explicit unavailable values', () => {
    const zero = defined(cloud([[3, -4], [3, -4]]));
    expect(zero.zeroVariance).toBe(true); expect(zero.ratios).toBeNull(); expect(zero.retained).toBeNull();
    expect(zero.sse).toBe(0);
    expect(pca(cloud([[3, -4]])).status).toBe('undefined');
    expect(defined(cloud([[3, -4]], 1, 'population')).sse).toBe(0);
  });
  test('small representable eigenvalue survives a trillion-fold variance ratio', () => {
    const result = defined(cloud([[1e6, 1], [-1e6, 1], [1e6, -1], [-1e6, -1]]));
    close(result.eigenvalues[0], 4e12 / 3);
    expect(Math.abs(result.eigenvalues[1] / (4 / 3) - 1)).toBeLessThanOrEqual(2e-12);
    close(result.sse, 4);
  });
  test('eigenpair residuals and orthogonality for negative covariance', () => {
    const result = defined(cloud([[-2, 1], [-1, 3], [1, -2], [2, -2]]));
    result.axes.forEach((v, i) => {
      close(v[0] ** 2 + v[1] ** 2, 1);
      for (const j of [0, 1]) close(result.covariance[j]![0] * v[0] + result.covariance[j]![1] * v[1], result.eigenvalues[i]! * v[j]!);
    });
    close(result.axes[0][0] * result.axes[1][0] + result.axes[0][1] * result.axes[1][1], 0);
  });
  test('replay is deeply detached from later edits', () => {
    const input = cloud(line.map(x => [...x] as [number, number]));
    const trace = componentTrace(input);
    (input.points[0]!.x as [number, number])[0] = 123;
    expect(trace.map(frame => frame.state.k)).toEqual([0, 1, 2]);
    expect(trace[0]!.state.points[0]!.x[0]).toBe(-1);
    expect(Object.isFrozen(trace[0]!.state.points[0]!.x)).toBe(true);
  });
  test('degenerate states still reject holes and arithmetic underflow', () => {
    expect(() => pca(cloud([new Array(2) as unknown as Vec]))).toThrow();
    expect(() => pca({ ...cloud([[0, 0]]), points: new Array<Point>(1) })).toThrow();
    expect(() => pca(cloud([[1e-200, 0], [-1e-200, 0]]))).toThrow(/underflow/);
  });
});

test('owner independent challenges execute actual canonical Python', () => {
  const python = process.env.BOOK_PYTHON ?? (existsSync('.venv/bin/python') ? resolve('.venv/bin/python') : 'python3');
  const output = execFileSync(python, ['-B', 'tests/unit/platform/wave-c-owner.py'], { encoding: 'utf8' });
  console.info(output.trim());
  expect(output).toContain('OK');
});
