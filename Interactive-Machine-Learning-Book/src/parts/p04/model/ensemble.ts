import { seeded } from '../../../platform/seed';
import { finite, finiteMean, integer, predict, trainTree, validateRows, type Row, type TreeOptions } from './tree';
export interface Metric { readonly value: number | null; readonly reason: string | null }
export function bootstrap(rows: readonly Row[], options: TreeOptions, seed: number, draws = rows.length) {
  validateRows(rows, options); integer(seed, 0, 0xffffffff, 'Bootstrap seed'); integer(draws, 0, 32, 'Bootstrap draws');
  if (!rows.length && draws) throw new RangeError('Cannot draw from an empty source.');
  const draw = seeded(seed), indices = Array.from({ length: draws }, () => Math.floor(draw() * rows.length));
  const counts = rows.map((r, i) => ({ id: r.id, count: indices.filter(j => j === i).length }));
  return { seed, indices, draws: indices.map((i, j) => ({ draw: j + 1, index: i, sourceId: rows[i]!.id })),
    rows: indices.map((i, j) => ({ ...rows[i]!, id: `draw${j + 1}`, sourceId: rows[i]!.id })),
    counts, uniqueIds: counts.filter(r => r.count > 0).map(r => r.id), oobIds: counts.filter(r => r.count === 0).map(r => r.id) };
}
function aggregate(values: readonly number[], task: TreeOptions['task']): Metric {
  if (!values.length) return { value: null, reason: 'No eligible tree predictions.' };
  const mean = finiteMean(values, 'Prediction mean');
  return { value: task === 'classification' ? Number(mean > .5) : mean, reason: null };
}
export function bagging(rows: readonly Row[], options: TreeOptions, seed: number, count: number) {
  validateRows(rows, options); integer(seed, 0, 0xffffffff, 'Ensemble seed'); integer(count, 0, 6, 'Tree count');
  const master = seeded(seed);
  let state = seed, offset = 0;
  // Reserve disjoint LCG output segments, including a worst-case per-node
  // feature budget. A tree can never read the next tree's reserved stream.
  const featureBudget = options.mtry === 0 || options.mtry === options.dimensions ? 0 : (2 ** options.maxDepth - 1) * options.mtry;
  const advance = (length: number) => { for (let j = 0; j < length; j++) state = Math.floor(master() * 4294967296); offset += length; };
  const trees = Array.from({ length: count }, (_, i) => {
    const bootstrapSeed = state, bootstrapStart = offset;
    advance(rows.length);
    const featureSeed = state, featureStart = offset;
    advance(featureBudget);
    const sample = bootstrap(rows, options, bootstrapSeed), tree = trainTree(sample.rows, { ...options, seed: featureSeed });
    return { id: `tree${i + 1}`, bootstrapSeed, featureSeed, bootstrapStart, featureStart, featureBudget, sample, tree };
  });
  const predictions = rows.map(row => {
    const values = trees.map(t => predict(t.tree, row.x).value).filter((v): v is number => v !== null);
    const result = aggregate(values, options.task);
    return { id: row.id, values, ...result, voteFraction: options.task === 'classification' && values.length ? values.filter(v => v === 1).length / values.length : null };
  });
  const oob = rows.map(row => {
    const eligible = trees.filter(t => t.sample.oobIds.includes(row.id));
    const values = eligible.map(t => predict(t.tree, row.x).value).filter((v): v is number => v !== null);
    return { id: row.id, treeIds: eligible.map(t => t.id), values, ...aggregate(values, options.task) };
  });
  const eligibleRows = rows.filter((_, i) => oob[i]!.value !== null);
  const evaluated = oob.flatMap((p, i) => p.value === null ? [] : [{ prediction: p.value, target: rows[i]!.y }]);
  const oobMetric: Metric = evaluated.length ? { value: options.task === 'classification' ? evaluated.filter(p => p.prediction === p.target).length / evaluated.length : finite(evaluated.reduce((s, p) => finite(s + finite((p.prediction - p.target) ** 2, 'OOB squared error'), 'OOB SSE'), 0) / evaluated.length, 'OOB MSE'), reason: null } : { value: null, reason: 'No source row has an eligible OOB prediction.' };
  return { streamPolicy: 'Disjoint reserved LCG segments: n bootstrap draws, then at most (2^depth−1)·mtry feature draws per tree.', trees, predictions, oob, eligible: eligibleRows.length, oobMetric };
}
export function boosting(rows: readonly Row[], options: TreeOptions, rate: number, stages: number) {
  validateRows(rows, options);
  if (options.task !== 'regression' || options.mtry !== 0) throw new RangeError('This boosting experiment uses squared-error regression with all features.');
  finite(rate, 'Learning rate'); if (rate <= 0 || rate > 1) throw new RangeError('Boosting rate must be in (0,1].'); integer(stages, 0, 6, 'Stage count');
  if (!rows.length) return { baseline: null, predictions: [], stages: [], loss: { value: null, reason: 'Empty data: squared-error loss and baseline are undefined.' } as Metric };
  const baseline = finiteMean(rows.map(r => r.y), 'Baseline mean');
  let predictions = rows.map(() => baseline);
  const loss = (values: readonly number[]) => finite(values.reduce((s, v, i) => finite(s + finite((v - rows[i]!.y) ** 2, 'Squared residual'), 'Loss sum'), 0) / (2 * rows.length), 'Half MSE');
  const trace = [];
  for (let stage = 0; stage < stages; stage++) {
    const before = [...predictions], residuals = rows.map((r, i) => finite(r.y - before[i]!, 'Negative per-example gradient'));
    const tree = trainTree(rows.map((r, i) => ({ ...r, y: residuals[i]! })), options), fitted = rows.map(r => predict(tree, r.x).value!);
    predictions = before.map((v, i) => finite(v + rate * fitted[i]!, 'Boosted prediction'));
    trace.push({ stage: stage + 1, before, residuals, tree, fitted, after: [...predictions], lossBefore: loss(before), lossAfter: loss(predictions) });
  }
  return { baseline, predictions, stages: trace, loss: { value: loss(predictions), reason: null } as Metric };
}
