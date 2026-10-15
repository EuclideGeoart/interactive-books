import { execFileSync } from 'node:child_process';
import { expect, it } from 'vitest';
import fixture from '../../../fixtures/p04/trees.fixtures.json';
import { DEFAULT_OPTIONS, candidates, nodes, predict, pruneTree, trainTree, type Tree, type Row, type TreeOptions } from '../../../src/parts/p04/model/tree';
import { bagging, boosting, bootstrap } from '../../../src/parts/p04/model/ensemble';
import { deriveLab, initialLab, lessonTrace, type Mode } from '../../../src/parts/p04/lesson';
const summary = (tree: Tree) => nodes(tree).map(t => ({ id: t.id, dimensions: t.dimensions, depth: t.depth, rowIds: t.rowIds, sourceIds: t.sourceIds, stats: t.stats, features: t.features,
  split: t.split ? { feature: t.split.feature, threshold: t.split.threshold, leftIds: t.split.leftIds, rightIds: t.split.rightIds, weighted: t.split.weighted, gain: t.split.gain } : null }));
function compare(expected: unknown, actual: unknown, path = 'root') {
  if (typeof expected === 'number') {
    expect(typeof actual, path).toBe('number');
    if (/(dimensions|depth|feature|threshold|count|[Ss]eed|[Ss]tart|[Bb]udget|indices|counts|eligible|stage)($|\[|\.)/.test(path) && !/(stages\[.*\.(before|after|residuals|fitted|loss))/.test(path)) expect(actual, path).toBe(expected);
    else expect(Math.abs((actual as number) - expected), path).toBeLessThanOrEqual(2e-12 * (1 + Math.abs(expected)));
  } else if (Array.isArray(expected)) {
    expect(Array.isArray(actual), path).toBe(true); expect((actual as unknown[]).length, path).toBe(expected.length);
    expected.forEach((v, i) => compare(v, (actual as unknown[])[i], `${path}[${i}]`));
  } else if (expected && typeof expected === 'object') {
    expect(Object.keys(actual as object).sort(), path).toEqual(Object.keys(expected).sort());
    Object.entries(expected).forEach(([key, v]) => compare(v, (actual as Record<string, unknown>)[key], `${path}.${key}`));
  } else expect(actual, path).toBe(expected);
}
for (const { input, expected } of fixture.cases) it(`independent golden → TypeScript: ${input.name}`, () => {
  const rows = input.rows as Row[], opts = input.options as TreeOptions;
  let actual: unknown;
  if (input.operation === 'tree') {
    const tree = trainTree(rows, opts);
    const result: Record<string, unknown> = { tree: summary(tree), candidates: candidates(rows, opts).map(s => ({ feature: s.feature, threshold: s.threshold, leftIds: s.leftIds, rightIds: s.rightIds, weighted: s.weighted, gain: s.gain })),
      predictions: rows.map(r => predict(tree, r.x).value) };
    if (input.probe) result.probe = predict(tree, input.probe).value;
    if (input.alpha !== undefined) { const p = pruneTree(tree, input.alpha); result.pruned = { leaves: p.leaves, risk: p.risk, objective: p.objective }; }
    actual = result;
  } else if (input.operation === 'bootstrap') {
    const b = bootstrap(rows, opts, input.seed!); actual = { indices: b.indices, counts: b.counts, uniqueIds: b.uniqueIds, oobIds: b.oobIds };
  } else if (input.operation === 'bagging') {
    const b = bagging(rows, opts, input.seed!, input.count!);
    actual = { trees: b.trees.map(t => ({ bootstrapStart: t.bootstrapStart, featureStart: t.featureStart, featureBudget: t.featureBudget, bootstrapSeed: t.bootstrapSeed, featureSeed: t.featureSeed,
      sample: { indices: t.sample.indices, counts: t.sample.counts, uniqueIds: t.sample.uniqueIds, oobIds: t.sample.oobIds }, tree: summary(t.tree) })),
      predictions: b.predictions.map(p => ({ id: p.id, values: p.values, value: p.value, voteFraction: p.voteFraction })),
      oob: b.oob.map(p => ({ id: p.id, treeIds: p.treeIds, values: p.values, value: p.value })), eligible: b.eligible, oobMetric: b.oobMetric.value };
  } else {
    const b = boosting(rows, opts, input.rate!, input.stages!);
    actual = { baseline: b.baseline, predictions: b.predictions, stages: b.stages.map(s => ({ stage: s.stage, before: s.before, residuals: s.residuals, fitted: s.fitted, after: s.after, lossBefore: s.lossBefore, lossAfter: s.lossAfter, tree: summary(s.tree) })), loss: b.loss.value };
  }
  compare(expected, actual, input.name);
});
it('canonical Python normalizes arbitrary-int boundary and integer-valued options without mutating inputs', () => {
  const script = `import sys,json,copy
sys.path.insert(0,"code/python/p04")
import trees_ensembles as c
rows=[dict(id="r"+str(i),x=[2**53+i],y=y) for i,y in enumerate([0,1,1])]
saved=copy.deepcopy(rows)
o=dict(c.DEFAULT_OPTIONS,dimensions=1.0,maxDepth=3.0,minLeaf=1.0,mtry=0.0,seed=7.0)
t=c.train_tree(rows,o)
b=c.bootstrap(rows,o,7.0,3.0)
e=c.bagging(rows,o,7.0,2.0)
assert rows==saved
assert t["split"]["leftIds"]==t["left"]["rowIds"]
assert t["split"]["rightIds"]==t["right"]["rowIds"]
print(json.dumps(dict(threshold=t["split"]["threshold"],left=t["left"]["rowIds"],right=t["right"]["rowIds"],indices=b["indices"],seeds=[v["bootstrapSeed"] for v in e["trees"]])))`;
  const actual = JSON.parse(execFileSync('.venv/bin/python', ['-B', '-c', script], { encoding: 'utf8' }));
  const rows = [0, 1, 1].map((y, i) => ({ id: 'r' + i, x: [2 ** 53 + i], y })), opts = { ...DEFAULT_OPTIONS, dimensions: 1 };
  const tree = trainTree(rows, opts), b = bootstrap(rows, opts, 7, 3), e = bagging(rows, opts, 7, 2);
  expect(actual).toEqual({ threshold: tree.split!.threshold, left: tree.left!.rowIds, right: tree.right!.rowIds, indices: b.indices, seeds: e.trees.map(t => t.bootstrapSeed) });
});
it('empty bagging/forest query uses eligible predictions, never a fabricated class zero', () => {
  for (const mode of ['bagging', 'forest'] as const) {
    const a = deriveLab({ ...initialLab(mode), rows: [] }, mode);
    expect(a.query).toBeNull(); expect(a.queryReason).toContain('No eligible');
    expect(a.ensemble!.oobMetric.value).toBeNull(); expect(a.treeVotes.every(v => v.value === null)).toBe(true);
    expect(a.formulas[1]!.tex).toContain('undefined');
  }
});
it('replay snapshots expose actual mathematical frames and detach history from edits', () => {
  for (const mode of ['splits', 'impurity', 'regression', 'bagging', 'forest', 'boosting'] as Mode[]) {
    const original = initialLab(mode), frames = lessonTrace(original, mode);
    expect(frames).toHaveLength(4); expect(Object.isFrozen(frames[0]!.state.rows[0]!.x)).toBe(true);
    const selected = frames[1]!.state, edited = { ...selected, probe: [1.25, selected.probe[1]] as const };
    expect(deriveLab(edited, mode).inspector[2]!.detail).toContain('1.25');
    expect(frames[1]!.state.probe[0]).toBe(2.5);
    expect(frames[0]!.state.rows).not.toBe(original.rows);
    if (mode === 'boosting') expect(deriveLab(frames[0]!.state, mode).query).toBe(1);
    if (mode === 'bagging') expect(deriveLab(frames[0]!.state, mode).query).toBeNull();
  }
});
