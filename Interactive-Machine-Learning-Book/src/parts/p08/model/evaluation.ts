import data from '../../../../data/p08/experiments.json' with { type: 'json' };
import { seeded } from '../../../platform/seed';
import { traceFrom } from '../../../platform/trace';
export interface Row { id: string; group: string; x: [number | null]; y: number }
export interface Probability { id: string; y: number; p: number }
export interface State { rows: Row[]; probabilities: Probability[]; seed: number; threshold: number; folds: number; phase: number; t: number; delta: number }
export const GRID = [1, 2].flatMap(power => [0, 1, 4].map(penalty => ({ power, penalty })));
export const initial = (): State => ({ rows: data.rows.map((r): Row => ({ ...r, x: [r.x[0]!] })), probabilities: data.probabilities.map(r => ({ ...r })), seed: 7, threshold: .5, folds: 3, phase: 0, t: 1e8, delta: 1e-8 });
export function number(v: unknown, name = 'number'): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new RangeError(`${name} must be a finite number, not Boolean.`);
  return v;
}
function finite(v: number) { if (!Number.isFinite(v)) throw new RangeError('Numerical result unavailable: binary64 overflow.'); return v; }
function mul(a: number, b: number) {
  const v = finite(a * b);
  if (a !== 0 && b !== 0 && v === 0) throw new RangeError('Numerical result unavailable: product underflow.');
  return v;
}
function div(a: number, b: number) {
  if (b === 0) throw new RangeError('Numerical result unavailable: zero divisor.');
  const v = finite(a / b);
  if (a !== 0 && v === 0) throw new RangeError('Numerical result unavailable: quotient underflow.');
  return v;
}
function dense(v: unknown, low: number, high: number): asserts v is unknown[] {
  if (!Array.isArray(v) || v.length < low || v.length > high) throw new RangeError('Dense array shape out of bounds.');
  for (let i = 0; i < v.length; i++) if (!Object.hasOwn(v, i)) throw new RangeError('Sparse array holes are rejected.');
}
function identifiers(rows: readonly { id: string }[]) {
  const seen = new Set<string>();
  for (const r of rows) {
    if (!r || typeof r !== 'object' || typeof r.id !== 'string' || !r.id || seen.has(r.id)) throw new RangeError('Unique nonempty row IDs required.');
    seen.add(r.id);
  }
}
function integer(v: unknown, low: number, high: number, name: string) {
  const n = number(v, name);
  if (!Number.isInteger(n) || n < low || n > high) throw new RangeError(`${name} must be an integer in bounds.`);
  return n;
}
const mean = (values: number[]) => {
  if (!values.length) throw new RangeError('Mean needs observations.');
  if (values.every(v => v === values[0])) return values[0]!;
  return values.reduce((sum, v) => finite(sum + div(v, values.length)), 0);
};
export function validate(s: State) {
  if (!s || typeof s !== 'object') throw new RangeError('Experiment must be an object.');
  dense(s.rows, 8, 64); dense(s.probabilities, 1, 64); identifiers(s.rows); identifiers(s.probabilities);
  for (const r of s.rows) {
    if (typeof r.group !== 'string' || !r.group) throw new RangeError('Nonempty group required.');
    dense(r.x, 1, 1); if (r.x[0] !== null) number(r.x[0], 'feature'); number(r.y, 'target');
  }
  for (const r of s.probabilities) {
    if (![0, 1].includes(number(r.y, 'binary label')) || number(r.p, 'probability') < 0 || r.p > 1) throw new RangeError('Binary label and probability in [0,1] required.');
  }
  integer(s.seed, 0, 0xffffffff, 'seed'); integer(s.folds, 2, 4, 'folds'); integer(s.phase, 0, 4, 'phase');
  if (number(s.threshold, 'threshold') < 0 || s.threshold > 1) throw new RangeError('Threshold in [0,1] required.');
  if (number(s.t, 't') < 1 || s.t > 1e12 || number(s.delta, 'delta') < 1e-12 || s.delta > .1) throw new RangeError('Numerical counterexample parameters out of bounds.');
}
export function split(rows: Row[], seed: number, folds: number) {
  dense(rows, 1, 64); identifiers(rows);
  for (const r of rows) if (typeof r.group !== "string" || !r.group) throw new RangeError("Nonempty group required.");
  integer(seed, 0, 0xffffffff, 'seed'); integer(folds, 2, 4, 'folds');
  const groups = [...new Set(rows.map(r => r.group))].sort();
  if (groups.length < folds + 2) throw new RangeError('Need at least folds+2 groups.');
  const draw = seeded(seed), draws: number[] = [];
  for (let i = groups.length - 1; i > 0; i--) {
    const u = draw(); draws.push(u * 4294967296); const j = Math.floor(u * (i + 1));
    [groups[i], groups[j]] = [groups[j]!, groups[i]!];
  }
  const testGroup = groups[0]!, devGroups = groups.slice(1);
  const test = rows.filter(r => r.group === testGroup).map(r => r.id), development = rows.filter(r => r.group !== testGroup).map(r => r.id);
  const boards = Array.from({ length: folds }, (_, k) => {
    const held = devGroups.filter((_, i) => i % folds === k);
    return { train: rows.filter(r => devGroups.includes(r.group) && !held.includes(r.group)).map(r => r.id), validation: rows.filter(r => held.includes(r.group)).map(r => r.id) };
  });
  return { groups, draws, development, test, folds: boards };
}
function take(rows: Row[], ids: string[]) {
  dense(rows, 1, 64); identifiers(rows); dense(ids, 1, 64);
  if (new Set(ids).size !== ids.length) throw new RangeError('Membership requires unique known IDs.');
  return ids.map(id => { const r = rows.find(r => r.id === id); if (!r) throw new RangeError('Unknown ID.'); return r; });
}
export function transformFit(rows: Row[], ids: string[]) {
  const selected = take(rows, ids);
  for (const r of selected) { dense(r.x, 1, 1); if (r.x[0] !== null) number(r.x[0]); }
  const impute = mean(selected.filter(r => r.x[0] !== null).map(r => number(r.x[0])));
  const filled = selected.map(r => r.x[0] === null ? impute : number(r.x[0]));
  const center = mean(filled), variance = mean(filled.map(v => mul(finite(v - center), finite(v - center))));
  return { fitIds: [...ids], impute, center, scale: variance > 0 ? Math.sqrt(variance) : 1, constant: variance === 0 };
}
export type Preprocessing = ReturnType<typeof transformFit>;
export function transform(row: Row, state: Preprocessing, power: number) {
  dense(row.x, 1, 1); integer(power, 1, 2, "power"); number(state.impute); number(state.center);
  if (number(state.scale) <= 0) throw new RangeError("Positive fitted scale required.");
  const filled = row.x[0] === null ? state.impute : number(row.x[0]);
  const z = div(finite(filled - state.center), state.scale), feature = power === 1 ? z : mul(z, z);
  return { id: row.id, filled, z, feature };
}
interface ModelCore { trainIds: string[]; preprocessing: Preprocessing; power: number; penalty: number; featureMean: number; targetMean: number; slope: number; intercept: number; convention: string }
export function evaluate(rows: Row[], ids: string[], model: ModelCore) {
  const evaluated = take(rows, ids).map(r => {
    const transformed = transform(r, model.preprocessing, model.power);
    const prediction = finite(model.intercept + mul(model.slope, transformed.feature)), target = number(r.y);
    const residual = finite(prediction - target);
    return { ...transformed, target, prediction, residual, squaredError: mul(residual, residual) };
  });
  return { ids: [...ids], rows: evaluated, mse: mean(evaluated.map(r => r.squaredError)) };
}
export function fit(rows: Row[], trainIds: string[], power: number, penalty: number, fitIds = trainIds) {
  integer(power, 1, 2, 'power'); if (number(penalty, 'penalty') < 0) throw new RangeError('Nonnegative ridge penalty required.');
  const pre = transformFit(rows, fitIds), selected = take(rows, trainIds);
  const features = selected.map(r => transform(r, pre, power).feature), targets = selected.map(r => number(r.y));
  const fm = mean(features), ym = mean(targets), dx = features.map(v => finite(v - fm)), dy = targets.map(v => finite(v - ym));
  const variance = mean(dx.map(v => mul(v, v))), covariance = mean(dx.map((v, i) => mul(v, dy[i]!)));
  const denominator = finite(variance + penalty), slope = denominator === 0 ? 0 : div(covariance, denominator);
  const intercept = finite(ym - mul(slope, fm));
  const model: ModelCore = { trainIds: [...trainIds], preprocessing: pre, power, penalty, featureMean: fm, targetMean: ym, slope, intercept,
    convention: 'unpenalized intercept; mean squared error + lambda*slope^2; zero slope if unidentifiable' };
  const training = evaluate(rows, trainIds, model);
  return { ...model, trainingMse: training.mse, objective: finite(training.mse + mul(penalty, mul(slope, slope))) };
}
export function metrics(rows: Probability[], threshold: number) {
  dense(rows, 1, 64); identifiers(rows); number(threshold); if (threshold < 0 || threshold > 1) throw new RangeError('Threshold in [0,1] required.');
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const errors: number[] = [], logs: (number | null)[] = [];
  const decisions: { id: string; y: number; p: number; positive: boolean; squaredError: number }[] = [];
  const bins = Array.from({ length: 5 }, (_, i) => ({ low: i / 5, high: (i + 1) / 5, ids: [] as string[], count: 0, meanProbability: null as number | null, frequency: null as number | null }));
  for (const r of rows) {
    const y = number(r.y), p = number(r.p); if (![0, 1].includes(y) || p < 0 || p > 1) throw new RangeError('Binary label and probability required.');
    const positive = p >= threshold;
    if (positive && y === 1) tp++; else if (positive) fp++; else if (y === 0) tn++; else fn++;
    errors.push(mul(p - y, p - y)); const q = y === 1 ? p : 1 - p;
    decisions.push({ id: r.id, y, p, positive, squaredError: errors.at(-1)! });
    logs.push(q === 0 ? null : finite(-Math.log(q)));
    bins.find(b => p >= b.low && (p < b.high || b.high === 1))!.ids.push(r.id);
  }
  for (const b of bins) {
    const selected = rows.filter(r => b.ids.includes(r.id)); b.count = selected.length;
    if (selected.length) { b.meanProbability = mean(selected.map(r => r.p)); b.frequency = mean(selected.map(r => r.y)); }
  }
  const ratio = (a: number, b: number) => b ? a / b : null;
  const recall = ratio(tp, tp + fn), specificity = ratio(tn, tn + fp);
  return { rows: decisions, tp, fp, tn, fn, accuracy: (tp + tn) / rows.length,
    balancedAccuracy: recall !== null && specificity !== null ? (recall + specificity) / 2 : null,
    precision: ratio(tp, tp + fp), recall, f1: ratio(2 * tp, 2 * tp + fp + fn), brier: mean(errors),
    logLoss: logs.includes(null) ? null : mean(logs as number[]), logReason: logs.includes(null) ? 'Unbounded log loss: a true class has probability zero' : null, bins };
}
export function numerics(t: number, delta: number) {
  if (number(t) < 1 || t > 1e12 || number(delta) < 1e-12 || delta > .1) throw new RangeError('Counterexample parameters out of bounds.');
  const root = Math.sqrt(finite(mul(t, t) + 1)), rounded = finite(1 + delta);
  return { left: (1e16 + -1e16) + 1, right: 1e16 + (-1e16 + 1), fragile: finite(root - t), stable: div(1, finite(root + t)),
    difference: finite(rounded - 1), reciprocal: div(1, finite(rounded - 1)), nominalReciprocal: div(1, delta), condition: div(Math.abs(rounded) + 1, Math.abs(rounded - 1)) };
}
export function experiment(s: State) {
  validate(s);
  const rows = s.rows, board = split(rows, s.seed, s.folds);
  const candidates = GRID.map(({ power, penalty }) => {
    const folds = board.folds.map(fold => { const model = fit(rows, fold.train, power, penalty); return { model, validation: evaluate(rows, fold.validation, model) }; });
    return { power, penalty, folds, meanValidation: mean(folds.map(f => f.validation.mse)) };
  });
  const chosen = candidates.reduce((best, c) => c.meanValidation < best.meanValidation ? c : best);
  const final = fit(rows, board.development, chosen.power, chosen.penalty), test = evaluate(rows, board.test, final);
  const fold = board.folds[0]!;
  const trainGroups = board.groups.slice(1).filter(g => rows.some(r => r.group === g && fold.train.includes(r.id)));
  const curves = trainGroups.map((_, k) => {
    const ids = rows.filter(r => trainGroups.slice(0, k + 1).includes(r.group)).map(r => r.id);
    const model = fit(rows, ids, chosen.power, chosen.penalty);
    return { n: ids.length, ids, model, validation: evaluate(rows, fold.validation, model) };
  });
  const proper = fit(rows, fold.train, 1, 1), leaked = fit(rows, fold.train, 1, 1, [...fold.train, ...fold.validation]);
  const properScore = evaluate(rows, fold.validation, proper), leakedScore = evaluate(rows, fold.validation, leaked);
  const m = metrics(s.probabilities, s.threshold);
  const tradeoff = [...new Set([0, 1, ...s.probabilities.map(r => r.p)])].sort((a, b) => a - b).map(threshold => {
    const { precision, recall, tp, fp, tn, fn } = metrics(s.probabilities, threshold); return { threshold, precision, recall, tp, fp, tn, fn };
  });
  return { board, candidates, selected: { power: chosen.power, penalty: chosen.penalty }, final, test, curves,
    leakage: { proper, leaked, properScore, leakedScore, difference: finite(leakedScore.mse - properScore.mse) }, metrics: m, tradeoff, numerics: numerics(s.t, s.delta),
    provenance: { dataVersion: data.version, data: data.provenance, seed: s.seed, folds: s.folds, threshold: s.threshold,
      model: 'scalar engineered-feature ridge with intercept', grid: GRID.map(g => [g.power, g.penalty]),
      split: 'UTF-16 sorted groups; Fisher–Yates descending; u32 LCG; first group test; remaining round-robin CV',
      selection: 'equal-weight mean fold MSE; first grid candidate on exact ties', arithmetic: 'constant-preserving binary64 sequential mean of divided terms' } };
}
export function workflowTrace(s: State) {
  validate(s);
  return traceFrom(['Split groups; lock the test membership.', 'Fit each fold transform and candidate only on training rows.', 'Select the first grid minimum of equal-weight validation MSE.', 'Refit selected parameters on all development rows.', 'Reveal final untouched test evaluation.'].map((explanation, phase) => ({ state: { ...s, phase }, explanation })));
}
