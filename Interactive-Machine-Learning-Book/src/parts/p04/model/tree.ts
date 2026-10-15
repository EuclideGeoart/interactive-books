import { seeded } from '../../../platform/seed';

export type Task = 'classification' | 'regression';
export type Criterion = 'gini' | 'entropy' | 'sse';
export interface Row { readonly id: string; readonly x: readonly number[]; readonly y: number; readonly sourceId?: string }
export interface TreeOptions { readonly task: Task; readonly criterion: Criterion; readonly dimensions: number; readonly maxDepth: number; readonly minLeaf: number; readonly mtry: number; readonly seed: number }
export interface Stats { readonly n: number; readonly counts: readonly [number, number] | null; readonly mean: number | null; readonly value: number | null; readonly probability: number | null; readonly impurity: number; readonly risk: number }
export interface Split { readonly feature: number; readonly threshold: number; readonly lower: number | null; readonly upper: number | null; readonly leftIds: readonly string[]; readonly rightIds: readonly string[]; readonly left: Stats; readonly right: Stats; readonly parent: Stats; readonly weighted: number | null; readonly gain: number | null; readonly legal: boolean; readonly reason: string | null }
export interface Tree { readonly id: string; readonly dimensions: number; readonly depth: number; readonly rowIds: readonly string[]; readonly sourceIds: readonly string[]; readonly stats: Stats; readonly features: readonly number[]; readonly candidates: readonly Split[]; readonly split: Split | null; readonly left: Tree | null; readonly right: Tree | null; readonly reason: string }
export const CLASS_ROWS: readonly Row[] = Object.freeze([
  { id: 's1', x: [1, 1], y: 0 }, { id: 's2', x: [2, 0], y: 0 }, { id: 's3', x: [3, 1], y: 1 },
  { id: 's4', x: [4, 0], y: 1 }, { id: 's5', x: [5, 1], y: 0 }, { id: 's6', x: [6, 0], y: 1 },
].map(r => Object.freeze({ ...r, x: Object.freeze(r.x) })));
export const REG_ROWS: readonly Row[] = Object.freeze(CLASS_ROWS.map(r => Object.freeze({ ...r, y: 2 * r.y })));
export const DEFAULT_OPTIONS: TreeOptions = Object.freeze({ task: 'classification', criterion: 'gini', dimensions: 2, maxDepth: 3, minLeaf: 1, mtry: 0, seed: 7 });
export function finite(value: number, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError(`${name} must remain finite. State preserved.`);
  return value;
}
export function integer(value: number, min: number, max: number, name: string): void {
  finite(value, name); if (!Number.isInteger(value) || value < min || value > max) throw new RangeError(`${name} must be an integer in ${min}…${max}.`);
}
export function validateRows(rows: readonly Row[], options: TreeOptions): void {
  if (!options || !['classification', 'regression'].includes(options.task) || !['gini', 'entropy', 'sse'].includes(options.criterion) || (options.task === 'regression') !== (options.criterion === 'sse')) throw new RangeError('Classification requires Gini/entropy; regression requires SSE.');
  integer(options.dimensions, 1, 4, 'Feature count'); integer(options.maxDepth, 0, 5, 'Depth'); integer(options.minLeaf, 1, 32, 'Minimum leaf'); integer(options.mtry, 0, options.dimensions, 'Per-split feature count'); integer(options.seed, 0, 0xffffffff, 'Seed');
  if (!Array.isArray(rows) || rows.length > 32) throw new RangeError('Trees support 0–32 observation rows.');
  const ids = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row.id !== 'string' || !row.id.trim() || ids.has(row.id)) throw new RangeError('Row IDs must be unique nonempty strings.');
    ids.add(row.id);
    if (row.sourceId !== undefined && (typeof row.sourceId !== 'string' || !row.sourceId.trim())) throw new RangeError('Source IDs must be nonempty strings.');
    if (!Array.isArray(row.x) || row.x.length !== options.dimensions) throw new RangeError('Each row needs the declared number of feature entries.');
    for (let j = 0; j < options.dimensions; j++) finite(row.x[j]!, 'Feature');
    finite(row.y, 'Target');
    if (options.task === 'classification' && row.y !== 0 && row.y !== 1) throw new RangeError('Binary labels must be 0 or 1.');
  }
}
export function finiteMean(values: readonly number[], name: string): number {
  if (!Array.isArray(values) || !values.length) throw new RangeError('A mean needs at least one value.');
  for (let i = 0; i < values.length; i++) finite(values[i]!, name);
  const first = values[0]!;
  // Identical binary64 inputs have this exact mean: do not introduce sum roundoff.
  if (values.every(v => v === first)) return first;
  return finite(values.reduce((sum, v) => finite(sum + v, name + ' sum'), 0) / values.length, name);
}
export function stats(rows: readonly Row[], options: TreeOptions): Stats {
  validateRows(rows, options);
  const n = rows.length;
  if (n === 0) return { n, counts: options.task === 'classification' ? [0, 0] : null, mean: null, value: null, probability: null, impurity: 0, risk: 0 };
  if (options.task === 'classification') {
    const positive = rows.filter(r => r.y === 1).length, counts = [n - positive, positive] as const;
    const probability = positive / n;
    const impurity = options.criterion === 'gini' ? 2 * probability * (1 - probability) : counts.reduce((sum, count) => count === 0 ? sum : sum - count / n * Math.log2(count / n), 0);
    return { n, counts, mean: null, value: positive > n - positive ? 1 : 0, probability, impurity, risk: finite(n * impurity, 'Node risk') };
  }
  const mean = finiteMean(rows.map(r => r.y), 'Leaf mean');
  const risk = rows.reduce((sum, r) => { const residual = finite(r.y - mean, 'Leaf residual'); return finite(sum + finite(residual * residual, 'Leaf square'), 'Leaf SSE'); }, 0);
  return { n, counts: null, mean, value: mean, probability: null, impurity: finite(risk / n, 'Node MSE'), risk };
}
export function evaluateSplit(rows: readonly Row[], options: TreeOptions, feature: number, threshold: number): Split {
  validateRows(rows, options); integer(feature, 0, options.dimensions - 1, 'Feature'); finite(threshold, 'Threshold');
  const leftRows = rows.filter(r => r.x[feature]! <= threshold), rightRows = rows.filter(r => r.x[feature]! > threshold);
  const parent = stats(rows, options), left = stats(leftRows, options), right = stats(rightRows, options);
  const legal = left.n >= options.minLeaf && right.n >= options.minLeaf;
  const reason = legal ? null : 'Both children must meet the minimum leaf count; empty children are illegal.';
  const weighted = parent.n === 0 ? null : finite((left.risk + right.risk) / parent.n, 'Weighted child impurity');
  const gain = legal ? finite(parent.impurity - weighted!, 'Gain') : null;
  return { feature, threshold, lower: null, upper: null, parent, left, right, leftIds: leftRows.map(r => r.id), rightIds: rightRows.map(r => r.id), weighted, gain, legal, reason };
}
export function candidates(rows: readonly Row[], options: TreeOptions, features: readonly number[] = Array.from({ length: options.dimensions }, (_, j) => j)): Split[] {
  validateRows(rows, options);
  if (!Array.isArray(features) || new Set(features).size !== features.length) throw new RangeError('Candidate features must be a unique index list.');
  const result: Split[] = [];
  for (const feature of [...features].sort((a, b) => a - b)) {
    integer(feature, 0, options.dimensions - 1, 'Candidate feature');
    const values = [...new Set(rows.map(r => r.x[feature]!))].sort((a, b) => a - b);
    for (let i = 1; i < values.length; i++) {
      const lower = values[i - 1]!, upper = values[i]!;
      let threshold = lower / 2 + upper / 2;
      // Adjacent representable inputs may have no interior midpoint; lower preserves the <= partition.
      if (threshold < lower || threshold >= upper) threshold = lower;
      const split = evaluateSplit(rows, options, feature, threshold);
      if (split.legal) result.push({ ...split, lower, upper });
    }
  }
  return result;
}
export function bestSplit(splits: readonly Split[]): Split | null {
  let best: Split | null = null;
  for (const split of [...splits].sort((a, b) => a.feature - b.feature || a.threshold - b.threshold)) {
    if (split.legal && split.gain !== null && (!best || split.gain > best.gain!)) best = split;
  }
  return best;
}
function featureSubset(dimensions: number, mtry: number, draw: () => number): number[] {
  const available = Array.from({ length: dimensions }, (_, j) => j);
  if (mtry === 0 || mtry === dimensions) return available;
  for (let i = 0; i < mtry; i++) { const j = i + Math.floor(draw() * (dimensions - i)); [available[i], available[j]] = [available[j]!, available[i]!]; }
  return available.slice(0, mtry).sort((a, b) => a - b);
}
export function trainTree(rows: readonly Row[], options: TreeOptions): Tree {
  validateRows(rows, options);
  const draw = seeded(options.seed);
  function grow(data: readonly Row[], depth: number, id: string): Tree {
    const nodeStats = stats(data, options);
    const leaf: Tree = { id, dimensions: options.dimensions, depth, rowIds: data.map(r => r.id), sourceIds: data.map(r => r.sourceId ?? r.id), stats: nodeStats, features: [], candidates: [], split: null, left: null, right: null, reason: '' };
    if (!data.length) return { ...leaf, reason: 'Empty node: no prediction.' };
    if (nodeStats.risk === 0) return { ...leaf, reason: options.task === 'classification' ? 'Pure labels: zero impurity.' : data.every(r => r.y === data[0]!.y) ? 'Constant regression targets: zero SSE.' : 'Computed SSE underflowed to zero; finer target variation is numerically unresolved.' };
    if (depth >= options.maxDepth) return { ...leaf, reason: 'Maximum depth reached.' };
    if (data.length < 2 * options.minLeaf) return { ...leaf, reason: 'Too few rows for two legal leaves.' };
    const features = featureSubset(options.dimensions, options.mtry, draw), splits = candidates(data, options, features), split = bestSplit(splits);
    if (!split || split.gain! <= 0) return { ...leaf, features, candidates: splits, reason: 'No legal positive-gain split in the considered features.' };
    return { ...leaf, features, candidates: splits, split, reason: 'Split accepted.',
      left: grow(data.filter(r => r.x[split.feature]! <= split.threshold), depth + 1, `${id}L`),
      right: grow(data.filter(r => r.x[split.feature]! > split.threshold), depth + 1, `${id}R`) };
  }
  return grow(rows, 0, 'root');
}
export function predict(tree: Tree, x: readonly number[]): { value: number | null; probability: number | null; leaf: string; reason: string | null } {
  if (!Array.isArray(x) || x.length !== tree.dimensions) throw new RangeError('Prediction needs exactly the declared number of features.');
  for (let j = 0; j < tree.dimensions; j++) finite(x[j]!, 'Prediction feature');
  let node = tree;
  while (node.split) {
    if (node.split.feature >= x.length) throw new RangeError('Prediction is missing a required feature.');
    node = x[node.split.feature]! <= node.split.threshold ? node.left! : node.right!;
  }
  return { value: node.stats.value, probability: node.stats.probability, leaf: node.id, reason: node.stats.value === null ? 'Empty training node has no prediction.' : null };
}
export function nodes(tree: Tree): Tree[] { return [tree, ...(tree.left ? nodes(tree.left) : []), ...(tree.right ? nodes(tree.right) : [])]; }
export function pruneTree(tree: Tree, alpha: number) {
  finite(alpha, 'Pruning alpha'); if (alpha < 0 || alpha > 10) throw new RangeError('Pruning alpha must be in [0,10].');
  if (!tree.stats.n) return { tree, leaves: 1, risk: null, objective: null, reason: 'Empty training data: normalized pruning objective is undefined.' };
  const n = tree.stats.n;
  function solve(node: Tree): { tree: Tree; leaves: number; risk: number; objective: number } {
    const leafRisk = finite(node.stats.risk / n, 'Normalized leaf risk'), leafCost = finite(leafRisk + alpha, 'Pruning cost');
    if (!node.split) return { tree: node, leaves: 1, risk: leafRisk, objective: leafCost };
    const left = solve(node.left!), right = solve(node.right!), splitCost = finite(left.objective + right.objective, 'Subtree cost');
    // Eight binary64 epsilons at the cost scale resolve roundoff in sums of
    // nonnegative leaf risks; this affects selection only, never reported costs.
    const costTie = 8 * Number.EPSILON * Math.max(Math.abs(leafCost), Math.abs(splitCost));
    if (leafCost <= splitCost || leafCost - splitCost <= costTie) return { tree: { ...node, split: null, left: null, right: null, reason: 'Collapsed by cost complexity (ties prefer fewer leaves).' }, leaves: 1, risk: leafRisk, objective: leafCost };
    return { tree: { ...node, left: left.tree, right: right.tree }, leaves: left.leaves + right.leaves, risk: finite(left.risk + right.risk, 'Subtree risk'), objective: splitCost };
  }
  return { ...solve(tree), reason: null };
}
