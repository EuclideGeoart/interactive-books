import { traceFrom } from '../../platform/trace';
import { CLASS_ROWS, REG_ROWS, DEFAULT_OPTIONS, evaluateSplit, nodes, predict, pruneTree, trainTree, finite, integer, type Row, type TreeOptions } from './model/tree';
import { bagging, boosting } from './model/ensemble';
export type Mode = 'splits' | 'impurity' | 'regression' | 'bagging' | 'forest' | 'boosting';
export interface LabState {
  readonly rows: readonly Row[]; readonly criterion: 'gini' | 'entropy'; readonly depth: number; readonly minLeaf: number;
  readonly feature: number; readonly threshold: number; readonly alpha: number; readonly seed: number;
  readonly mtry: number; readonly treeCount: number; readonly treeIndex: number; readonly nodeId: string;
  readonly rate: number; readonly stages: number; readonly probe: readonly [number, number];
}
export const isRegression = (mode: Mode) => mode === 'regression' || mode === 'boosting';
export const isEnsemble = (mode: Mode) => mode === 'bagging' || mode === 'forest';
export function initialLab(mode: Mode): LabState {
  const rows = mode === 'boosting' ? [0, 0, 2, 2].map((y, i) => ({ id: `a${i + 1}`, x: [i + 1, Number(i > 1)], y })) : isRegression(mode) ? REG_ROWS : CLASS_ROWS;
  return { rows, criterion: 'gini', depth: mode === 'boosting' ? 1 : 3, minLeaf: 1, feature: 0, threshold: 2.5, alpha: 0,
    seed: 7, mtry: 1, treeCount: 3, treeIndex: 0, nodeId: 'root', rate: .5, stages: 1, probe: [2.5, 0] };
}
export function optionsFor(s: LabState, mode: Mode): TreeOptions {
  return { ...DEFAULT_OPTIONS, task: isRegression(mode) ? 'regression' : 'classification', criterion: isRegression(mode) ? 'sse' : s.criterion,
    maxDepth: s.depth, minLeaf: s.minLeaf, seed: s.seed, mtry: mode === 'forest' ? s.mtry : 0 };
}
export function validateLab(s: LabState, mode: Mode): void {
  if (s.criterion !== 'gini' && s.criterion !== 'entropy') throw new RangeError('Criterion must be Gini or entropy.');
  integer(s.feature, 0, 1, 'Inspection feature'); integer(s.treeIndex, 0, 5, 'Tree index');
  integer(s.treeCount, 0, 6, 'Tree count'); integer(s.stages, 0, 6, 'Stage count'); integer(s.mtry, 1, 2, 'Feature subset');
  finite(s.threshold, 'Threshold'); finite(s.alpha, 'Alpha'); finite(s.rate, 'Rate');
  if (s.alpha < 0 || s.alpha > 10 || s.rate <= 0 || s.rate > 1) throw new RangeError('Alpha must be in [0,10] and rate in (0,1].');
  if (!Array.isArray(s.probe) || s.probe.length !== 2) throw new RangeError('Query needs two features.');
  for (let j = 0; j < s.probe.length; j++) finite(s.probe[j]!, 'Query');
  const bounded = (v: number) => { finite(v, 'Experiment input'); if (v < -10 || v > 10) throw new RangeError('Editable experiment values must be in [−10,10].'); };
  s.probe.forEach(bounded); bounded(s.threshold); s.rows.forEach(r => { r.x.forEach(bounded); bounded(r.y); });
  if (typeof s.nodeId !== 'string') throw new RangeError('Node ID must be a string.');
  trainTree(s.rows, optionsFor(s, mode)); // same public input boundary as the actual fitted model
}
export const texNumber = (value: number): string => { const [mantissa, exponent] = String(value).split('e'); return exponent === undefined ? mantissa! : `${mantissa}\\times10^{${Number(exponent)}}`; };
export const shown = (value: number | null) => value === null ? 'Undefined' : Number(value.toPrecision(6)).toString();
export function deriveLab(s: LabState, mode: Mode, renderedWidth = 560) {
  validateLab(s, mode);
  const options = optionsFor(s, mode);
  const ensemble = isEnsemble(mode) ? bagging(s.rows, options, s.seed, s.treeCount) : null;
  const boosted = mode === 'boosting' ? boosting(s.rows, options, s.rate, s.stages) : null;
  const grown = !ensemble && !boosted ? trainTree(s.rows, options) : null;
  const pruning = mode === 'regression' ? pruneTree(grown!, s.alpha) : null;
  const selectedTreeIndex = ensemble ? Math.min(s.treeIndex, Math.max(0, ensemble.trees.length - 1)) : 0;
  const activeTree = ensemble ? ensemble.trees[selectedTreeIndex]?.tree ?? null : boosted ? boosted.stages.at(-1)?.tree ?? null : pruning?.tree ?? grown;
  const trainingRows = ensemble ? ensemble.trees[selectedTreeIndex]?.sample.rows ?? [] : boosted ? s.rows.map((r, i) => ({ ...r, y: boosted.stages.at(-1)?.residuals[i] ?? r.y })) : s.rows;
  const allNodes = activeTree ? nodes(activeTree) : [];
  const selectedNode = allNodes.find(n => n.id === s.nodeId) ?? allNodes[0] ?? null;
  const inspectedRows = selectedNode ? trainingRows.filter(r => selectedNode.rowIds.includes(r.id)) : [];
  const inspected = evaluateSplit(inspectedRows, options, s.feature, s.threshold);
  const best = selectedNode?.split ?? null;
  const sample = ensemble?.trees[selectedTreeIndex]?.sample ?? null;
  const predictionRows = s.rows.map((r, i) => {
    const value = ensemble ? ensemble.predictions[i]!.value : boosted ? boosted.predictions[i] ?? null : activeTree ? predict(activeTree, r.x).value : null;
    return { ...r, prediction: value, residual: value === null ? null : finite(value - r.y, 'Displayed residual'), leaf: activeTree ? predict(activeTree, r.x).leaf : null };
  });
  const treeVotes = ensemble?.trees.map(t => ({ id: t.id, ...predict(t.tree, s.probe) })) ?? [];
  const eligibleVotes = treeVotes.filter(v => v.value !== null);
  const query = ensemble ? eligibleVotes.length ? Number(eligibleVotes.filter(v => v.value === 1).length > eligibleVotes.length / 2) : null
    : boosted ? boosted.baseline === null ? null : finite(boosted.baseline + s.rate * boosted.stages.reduce((sum, stage) => sum + predict(stage.tree, s.probe).value!, 0), 'Boosted query')
    : activeTree ? predict(activeTree, s.probe).value : null;
  const queryLeaf = query !== null && activeTree && !ensemble && !boosted ? predict(activeTree, s.probe).leaf : null;
  const queryReason = query === null ? 'No eligible nonempty tree predictions; the query is undefined.' : null;
  const metric = ensemble ? ensemble.oobMetric : boosted ? boosted.loss : s.rows.length ? { value: finite(predictionRows.reduce((sum, r) => sum + (isRegression(mode) ? r.residual! ** 2 : Number(r.prediction !== r.y)), 0) / s.rows.length, 'Training metric'), reason: null } : { value: null, reason: 'Empty data: training metric is undefined.' };
  const formulas = isEnsemble(mode) ? [
    { label: 'Hard tree vote aggregation; exact ties choose class zero', tex: query === null ? '\\hat y(x)=\\text{undefined},\\quad B_{\\mathrm{eligible}}=0' : `\\hat y(x)=\\mathbf1\\!\\left[\\sum_{b=1}^{B}h_b(x)>B/2\\right],\\quad B=${s.treeCount}` },
    { label: 'OOB accuracy over eligible source rows only', tex: ensemble!.eligible === 0 ? '\\mathrm{Acc}_{\\mathrm{OOB}}=\\text{undefined},\\quad |E|=0' : `\\mathrm{Acc}_{\\mathrm{OOB}}=\\frac{1}{|E|}\\sum_{i\\in E}\\mathbf1[\\hat y_i^{\\mathrm{OOB}}=y_i],\\quad |E|=${ensemble!.eligible}` }
  ] : mode === 'boosting' ? [
    { label: `Squared-error negative per-example gradient and learning rate ${shown(s.rate)}`, tex: `\\ell_i=\\tfrac12(y_i-F_i)^2,\\quad -\\partial_{F_i}\\ell_i=y_i-F_i=r_i,\\quad F_m=F_{m-1}+${texNumber(s.rate)}h_m` },
    { label: 'Active stage half mean squared error', tex: `L_m=\\frac{1}{2n}\\sum_i(y_i-F_m(x_i))^2,\\quad m=${s.stages},\\quad L_m\\approx${metric.value === null ? '\\text{undefined}' : texNumber(Number(shown(metric.value)))}` }
  ] : [
    { label: `Inspection on ${selectedNode?.id ?? 'no node'}: feature ${s.feature + 1} at threshold ${shown(s.threshold)}`, tex: `S_L=\\{i:x_{i,${s.feature + 1}}\\le${texNumber(s.threshold)}\\},\\quad S_R=S\\setminus S_L` },
    { label: 'Weighted child impurity and legal inspection gain', tex: `I_{\\mathrm{child}}=\\frac{n_L I_L+n_R I_R}{n},\\quad \\Delta=I_P-I_{\\mathrm{child}},\\quad \\Delta\\approx${inspected.gain === null ? '\\text{undefined}' : texNumber(Number(shown(inspected.gain)))}` },
    ...(mode === 'regression' ? [{ label: `Cost complexity at alpha ${shown(s.alpha)}; normalized by original root count`, tex: `C_\\alpha(T)=\\frac1n\\sum_{\\ell\\in\\mathrm{leaves}(T)}\\mathrm{SSE}_\\ell+${texNumber(s.alpha)}|T|,\\quad C_\\alpha\\approx${pruning!.objective === null ? '\\text{undefined}' : texNumber(Number(shown(pruning!.objective)))}` }]
      : [{ label: 'Gini or entropy; zero probability contributes zero', tex: s.criterion === 'gini' ? `I_G=1-p_0^2-p_1^2,\\quad I_P\\approx${texNumber(Number(shown(inspected.parent.impurity)))}` : `H=-\\sum_{k:p_k>0}p_k\\log_2p_k,\\quad H_P\\approx${texNumber(Number(shown(inspected.parent.impurity)))}` }])
  ];
  const width = Math.max(1, renderedWidth);
  const fontSize = Math.max(16, 14.1 * 560 / width);
  const plotRegression = isRegression(mode);
  // Separate axis scales, both explicit: the plot is a feature plane or an ID-indexed prediction plot.
  const xs = plotRegression ? s.rows.map((_, i) => i + 1) : s.rows.map(r => r.x[0]!);
  const ys = plotRegression ? predictionRows.flatMap(r => r.prediction === null ? [r.y] : [r.y, r.prediction]) : s.rows.map(r => r.x[1]!);
  const xValues = [...xs, ...(plotRegression ? [] : [s.probe[0], s.feature === 0 ? s.threshold : s.probe[0]])];
  const yValues = [...ys, ...(plotRegression ? [] : [s.probe[1], s.feature === 1 ? s.threshold : s.probe[1]])];
  const bounds = (values: number[]) => {
    if (!values.length) return [-1, 1] as const;
    const lo = Math.min(...values), hi = Math.max(...values), pad = Math.max(.5, (hi - lo) * .15);
    return [lo - pad, hi + pad] as const;
  };
  const [xmin, xmax] = bounds(xValues), [ymin, ymax] = bounds(yValues);
  const sx = 440 / (xmax - xmin), sy = 380 / (ymax - ymin);
  const px = (x: number) => 65 + (x - xmin) * sx, py = (y: number) => 440 - (y - ymin) * sy;
  const points = predictionRows.map((r, i) => ({ ...r, cx: px(plotRegression ? i + 1 : r.x[0]!), cy: py(plotRegression ? r.y : r.x[1]!), predictionY: r.prediction === null ? null : py(r.prediction) }));
  return { options, ensemble, boosted, grown, pruning, activeTree, selectedTreeIndex, trainingRows, allNodes, selectedNode, inspected, best, sample,
    predictionRows, treeVotes, query, queryLeaf, queryReason, metric, formulas, fontSize,
    plot: { points, xmin, xmax, ymin, ymax, sx, sy, queryX: px(s.probe[0]), queryY: py(s.probe[1]), thresholdPixel: s.feature === 0 ? px(s.threshold) : py(s.threshold), regression: plotRegression },
    inspector: [
      { label: 'X · observations by features', value: `${s.rows.length} × 2`, detail: 'Rows are samples; no intercept column.' },
      { label: 'y · targets', value: `${s.rows.length} × 1`, detail: isRegression(mode) ? 'Finite scalar targets.' : 'Binary labels 0 or 1.' },
      { label: 'Prediction · query', value: shown(query), detail: query === null ? queryReason! : `x = [${s.probe.map(shown).join(', ')}]` },
      { label: ensemble ? 'OOB accuracy' : boosted ? 'Half MSE objective' : isRegression(mode) ? 'Training MSE' : 'Training error rate',
        value: metric.value === null ? `Undefined: ${metric.reason}` : `≈ ${shown(metric.value)}`, detail: ensemble ? `Eligible source rows: ${ensemble.eligible}/${s.rows.length}; each uses only excluding trees.` : 'These hand-authored rows are not a population estimate.' },
      ...(queryLeaf ? [{ label: 'Query terminal leaf', value: queryLeaf, detail: 'Follow the highlighted terminal node in the recursive tree.' }] : []),
      { label: 'Input provenance', value: `Hand-authored; seed ${s.seed}`, detail: ensemble ? ensemble.streamPolicy : 'Seed used only for randomized feature subsets; greedy all-feature trees use no draws.' }
    ] };
}
export function lessonTrace(s: LabState, mode: Mode) {
  const states = isEnsemble(mode) ? [0, 1, 2, 3].map(treeCount => ({ ...s, treeCount, treeIndex: 0, nodeId: 'root' }))
    : mode === 'boosting' ? [0, 1, 2, 3].map(stages => ({ ...s, stages, nodeId: 'root' }))
    : mode === 'regression' ? [0, .25, .5, 1].map(alpha => ({ ...s, alpha, nodeId: 'root' }))
    : [0, 1, 2, 3].map(depth => ({ ...s, depth, nodeId: 'root' }));
  return traceFrom(states.map(state => ({ state, explanation: isEnsemble(mode) ? `${state.treeCount} trees: freshly recompute the same disjoint seeded prefixes and their actual votes.`
    : mode === 'boosting' ? `${state.stages} residual stages at rate ${state.rate}; frame 0 is the mean-only baseline.`
    : mode === 'regression' ? `Prune the same grown tree at alpha ${state.alpha}; root count stays ${state.rows.length}.`
    : `Refit recursively with maximum depth ${state.depth}; this frame changes a depth bound, not an in-place tree.` })));
}
