import { expect, it } from 'vitest';
import { CLASS_ROWS, REG_ROWS, DEFAULT_OPTIONS, bestSplit, candidates, evaluateSplit, finiteMean, nodes, predict, pruneTree, stats, trainTree, validateRows } from '../../../src/parts/p04/model/tree';
import { bagging, boosting, bootstrap } from '../../../src/parts/p04/model/ensemble';

it('literal root split counts and recursively learned decisions agree', () => {
  const best = bestSplit(candidates(CLASS_ROWS, DEFAULT_OPTIONS))!;
  expect(best.feature).toBe(0); expect(best.threshold).toBe(2.5); expect(best.leftIds).toEqual(['s1', 's2']);
  expect(best.parent.impurity).toBe(.5); expect(best.weighted).toBe(.25); expect(best.gain).toBe(.25);
  const tree = trainTree(CLASS_ROWS, DEFAULT_OPTIONS);
  CLASS_ROWS.forEach(r => expect(predict(tree, r.x).value).toBe(r.y));
  expect(nodes(tree).filter(n => !n.split)).toHaveLength(4);
});
it('finite zero-log-zero, pure/constant/empty stopping and min-leaf legality are explicit', () => {
  expect(stats(CLASS_ROWS.slice(0, 2), { ...DEFAULT_OPTIONS, criterion: 'entropy' }).impurity).toBe(0);
  expect(trainTree([], DEFAULT_OPTIONS).stats.value).toBeNull();
  expect(predict(trainTree([], DEFAULT_OPTIONS), [0, 0]).reason).toContain('Empty');
  expect(trainTree(CLASS_ROWS.map(r => ({ ...r, x: [1, 1] })), DEFAULT_OPTIONS).split).toBeNull();
  expect(evaluateSplit(CLASS_ROWS, DEFAULT_OPTIONS, 0, -100).gain).toBeNull();
  expect(candidates(CLASS_ROWS, { ...DEFAULT_OPTIONS, minLeaf: 3 })).toHaveLength(2);
});
it('regression leaves and cost-complexity pruning use actual SSE and fewer-leaf ties', () => {
  const options = { ...DEFAULT_OPTIONS, task: 'regression' as const, criterion: 'sse' as const };
  const tree = trainTree(REG_ROWS, options);
  expect(tree.stats.mean).toBe(1); expect(tree.stats.risk).toBe(6);
  expect(pruneTree(tree, 0).leaves).toBe(4);
  expect(pruneTree(tree, .25).leaves).toBe(2);
  expect(pruneTree(tree, .5).leaves).toBe(1);
  expect(pruneTree(tree, .5).risk).toBe(1);
});
it('bootstrap distinguishes draw multiplicities, unique IDs and OOB, with repeatable seeds', () => {
  const sample = bootstrap(CLASS_ROWS, DEFAULT_OPTIONS, 7);
  expect(sample).toEqual(bootstrap(CLASS_ROWS, DEFAULT_OPTIONS, 7));
  expect(sample.counts.reduce((s, r) => s + r.count, 0)).toBe(6);
  expect(new Set([...sample.uniqueIds, ...sample.oobIds]).size).toBe(6);
  expect(new Set(sample.rows.map(r => r.id)).size).toBe(6);
  expect(sample.rows.map(r => r.sourceId)).toEqual(sample.draws.map(r => r.sourceId));
});
it('bagging uses its actual trees, OOB eligibility and explicit empty metrics', () => {
  const ensemble = bagging(CLASS_ROWS, DEFAULT_OPTIONS, 7, 3);
  ensemble.predictions.forEach((p, i) => {
    const votes = ensemble.trees.map(t => predict(t.tree, CLASS_ROWS[i]!.x).value!);
    expect(p.values).toEqual(votes); expect(p.value).toBe(Number(votes.filter(v => v === 1).length > votes.length / 2));
  });
  expect(bagging(CLASS_ROWS.slice(0, 1), DEFAULT_OPTIONS, 7, 3).oobMetric.value).toBeNull();
  expect(bagging(CLASS_ROWS, DEFAULT_OPTIONS, 7, 0).predictions.every(p => p.value === null)).toBe(true);
});
it('forest selects features separately at eligible nodes', () => {
  const forest = bagging(CLASS_ROWS, { ...DEFAULT_OPTIONS, mtry: 1 }, 7, 3);
  const features = forest.trees.flatMap(t => nodes(t.tree).filter(n => n.features.length).map(n => n.features[0]));
  expect(new Set(features).size).toBe(2);
  forest.trees.forEach(t => nodes(t.tree).filter(n => n.split).forEach(n => expect(n.features).toContain(n.split!.feature)));
});
it('literal squared-error boosting stages fit the residual gradient direction', () => {
  const rows = [0, 0, 2, 2].map((y, i) => ({ id: `a${i}`, x: [i + 1, Number(i > 1)], y }));
  const result = boosting(rows, { ...DEFAULT_OPTIONS, task: 'regression', criterion: 'sse', maxDepth: 1 }, .5, 3);
  expect(result.baseline).toBe(1);
  expect(result.stages.map(s => s.lossAfter)).toEqual([.125, .03125, .0078125]);
  expect(result.predictions).toEqual([.125, .125, 1.875, 1.875]);
});
it('rejects malformed inputs, unsupported labels, seeds and nonfinite arithmetic', () => {
  for (const y of [NaN, Infinity, .5, true, '1']) expect(() => trainTree([{ id: 'a', x: [0, 1], y: y as number }], DEFAULT_OPTIONS)).toThrow();
  expect(() => trainTree([{ id: 'a', x: [0], y: 0 }], DEFAULT_OPTIONS)).toThrow();
  expect(() => trainTree(CLASS_ROWS, { ...DEFAULT_OPTIONS, seed: -1 })).toThrow();
  expect(() => trainTree([{ id: 'a', x: [0, 1], y: 1e308 }, { id: 'b', x: [0, 1], y: 9e307 }], { ...DEFAULT_OPTIONS, task: 'regression', criterion: 'sse' })).toThrow();
});

it('declared prediction shape survives empty, pure and feature-zero-only trees', () => {
  for (const rows of [[], CLASS_ROWS.slice(0, 2), CLASS_ROWS]) {
    const tree = trainTree(rows, DEFAULT_OPTIONS);
    expect(tree.dimensions).toBe(2);
    for (const x of [[0], [0, 0, 0], [true, 0], ['0', 0]]) expect(() => predict(tree, x as number[])).toThrow();
    expect(() => predict(tree, [0, 0])).not.toThrow();
  }
});
it('reserves nonoverlapping bootstrap and per-node feature streams at every depth', () => {
  const a = 1664525n, c = 1013904223n, mod = 2n ** 32n;
  const stateAt = (seed: number, k: number) => Number((a ** BigInt(k) * BigInt(seed) + c * ((a ** BigInt(k) - 1n) / (a - 1n))) % mod);
  for (const mtry of [0, 1, 2]) for (const maxDepth of [0, 1, 3, 5]) for (const seed of [0, 7, 4294967295]) {
    const opts = { ...DEFAULT_OPTIONS, mtry, maxDepth }, forest = bagging(CLASS_ROWS, opts, seed, 3);
    const budget = mtry === 1 ? 2 ** maxDepth - 1 : 0;
    forest.trees.forEach((t, i) => {
      const start = i * (6 + budget);
      expect(t.bootstrapStart).toBe(start); expect(t.featureStart).toBe(start + 6); expect(t.featureBudget).toBe(budget);
      expect(t.bootstrapSeed).toBe(stateAt(seed, start)); expect(t.featureSeed).toBe(stateAt(seed, start + 6));
      expect(t.sample.indices).toEqual(Array.from({ length: 6 }, (_, j) => Math.floor(stateAt(seed, start + j + 1) * 6 / 4294967296)));
      expect(nodes(t.tree).filter(n => n.features.length).length * (mtry === 1 ? 1 : 0)).toBeLessThanOrEqual(budget);
    });
  }
});
it('pruning resolves a one-ulp rational breakpoint without merging distinct costs', () => {
  const rows = [1, 1, 5, 5, 5].map((y, i) => ({ id: 'r' + i, x: [i], y }));
  const tree = trainTree(rows, { ...DEFAULT_OPTIONS, dimensions: 1, task: 'regression', criterion: 'sse' });
  expect(tree.stats.risk).toBeCloseTo(96 / 5, 13);
  const tied = pruneTree(tree, 96 / 25);
  expect(tied.leaves).toBe(1); expect(tied.risk).toBe(tree.stats.risk / 5);
  expect(pruneTree(tree, 96 / 25 - 1e-10).leaves).toBe(2);
  expect(pruneTree(tree, 96 / 25 + 1e-10).leaves).toBe(1);
});

it('underflowed regression squares are an explicit numeric limit, not a constant-target claim', () => {
  const tree = trainTree([{ id: 'a', x: [0, 0], y: 1e-200 }, { id: 'b', x: [1, 0], y: -1e-200 }],
    { ...DEFAULT_OPTIONS, task: 'regression', criterion: 'sse' });
  expect(tree.stats.risk).toBe(0); expect(tree.reason).toContain('underflowed');
  expect(tree.stats.mean).toBe(0);
});

it('exact decimal-constant targets preserve means, zero SSE, boost baseline and ensemble/OOB predictions', () => {
  const rows = [0, 1, 2].map(i => ({ id: 'd' + i, x: [i], y: .1 }));
  const o = { ...DEFAULT_OPTIONS, dimensions: 1, task: 'regression' as const, criterion: 'sse' as const };
  const tree = trainTree(rows, o);
  expect(tree.stats.mean).toBe(.1); expect(tree.stats.risk).toBe(0); expect(tree.split).toBeNull();
  const b = boosting(rows, o, .5, 3);
  expect(b.baseline).toBe(.1); expect(b.loss.value).toBe(0); expect(b.predictions).toEqual([.1, .1, .1]);
  b.stages.forEach(s => expect(s.residuals).toEqual([0, 0, 0]));
  const e = bagging(rows, o, 7, 3);
  expect(e.predictions.map(p => p.value)).toEqual([.1, .1, .1]); expect(e.eligible).toBeGreaterThan(0); expect(e.oobMetric.value).toBe(0);
  e.oob.filter(p => p.value !== null).forEach(p => expect(p.value).toBe(.1));
  const close = trainTree([{ ...rows[0]! }, { ...rows[1]!, y: .10000000000000006 }], o);
  expect(close.stats.mean).toBe(.10000000000000003); expect(close.stats.risk).toBe(1.5407439555097887e-33);
  expect(close.split).not.toBeNull(); expect(close.split!.gain).toBeGreaterThan(0);
});

it('rejects missing feature entries before terminal training and all ensemble paths', () => {
  for (const feature of [1, 0]) {
    const rows = CLASS_ROWS.map(r => ({ ...r, x: [...r.x] }));
    Reflect.deleteProperty(rows[0]!.x, feature);
    const options = { ...DEFAULT_OPTIONS, maxDepth: 0 };
    const regression = { ...options, task: 'regression' as const, criterion: 'sse' as const };
    for (const call of [
      () => trainTree(rows, options), () => validateRows(rows, options),
      () => stats(rows, options), () => candidates(rows, options),
      () => evaluateSplit(rows, options, 0, 2.5),
      () => bootstrap(rows, options, 7, 0), () => bagging(rows, options, 7, 0),
      () => bagging(rows, { ...options, mtry: 1 }, 7, 0),
      () => boosting(rows, regression, .5, 0),
    ]) expect(call).toThrow('Feature must remain finite');
    const serialized: typeof rows = JSON.parse(JSON.stringify(rows));
    expect(serialized[0]!.x[feature]).toBeNull();
    expect(() => trainTree(serialized, options)).toThrow('Feature must remain finite');
    expect(Object.hasOwn(rows[0]!.x, feature)).toBe(false);
  }
});
it('rejects missing query entries even at empty, pure and depth-limited leaves', () => {
  const trees = [trainTree([], DEFAULT_OPTIONS), trainTree(CLASS_ROWS.slice(0, 2), DEFAULT_OPTIONS),
    trainTree(CLASS_ROWS, { ...DEFAULT_OPTIONS, maxDepth: 0 }), trainTree(CLASS_ROWS, DEFAULT_OPTIONS)];
  for (const tree of trees) for (const feature of [1, 0]) {
    const query = [1, 0];
    Reflect.deleteProperty(query, feature);
    expect(() => predict(tree, query)).toThrow('Prediction feature must remain finite');
    expect(() => predict(tree, JSON.parse(JSON.stringify(query)))).toThrow('Prediction feature must remain finite');
    expect(Object.hasOwn(query, feature)).toBe(false);
  }
});
it('rejects missing mean observations before constant shortcuts or summation', () => {
  for (const dense of [[1, 1, 1], [.1, .1, .1], [1, 2, 3]]) for (const index of [1, 0, 2]) {
    const values = [...dense];
    Reflect.deleteProperty(values, index);
    expect(() => finiteMean(values, 'mean')).toThrow('mean must remain finite');
    expect(() => finiteMean(JSON.parse(JSON.stringify(values)), 'mean')).toThrow('mean must remain finite');
    expect(Object.hasOwn(values, index)).toBe(false);
  }
});
