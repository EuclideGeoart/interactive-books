import { expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { svm, decision, type SVMState, type Vec2 } from '../../../src/parts/p07/model/svm';
import { deriveLab, tradeoffTrace, editPoint } from '../../../src/parts/p07/lesson';
import { experiment, initial, metrics, fit, evaluate, workflowTrace } from '../../../src/parts/p08/model/evaluation';

const marginState = (coordinates: readonly Vec2[], labels: readonly number[], mode: SVMState['mode'] = 'hard', C = 1): SVMState => ({
  mode, C, kernel: { kind: 'linear', gamma: 1, coef0: 1, degree: 2 },
  points: coordinates.map((x, i) => ({ id: `owner${i}`, x, y: labels[i]! })),
});

test('browser SVM mechanism matches the translated hand optimum and rendered score levels', () => {
  const state = marginState([[1, 0], [3, 0]], [-1, 1]);
  const lab = deriveLab(state, 390);
  expect(lab.numerical.status).toBe('solved');
  expect(lab.numerical.w).toEqual([1, 0]);
  expect(lab.numerical.b).toBe(-2);
  expect(lab.numerical.primal).toBe(.5);
  expect(lab.numerical.rows.map(row => row.signedDistance)).toEqual([-1, 1]);
  for (const line of lab.lines) {
    for (const [x, y] of [[line.x1, line.y1], [line.x2, line.y2]]) {
      expect(decision(state, lab.numerical, [(x! - 240) / 32, (240 - y!) / 32])).toBeCloseTo(line.level, 12);
    }
  }
});

test('soft-margin objective, slack and dual coefficients obey the exact two-point solution', () => {
  const result = svm(marginState([[-1, 0], [1, 0]], [-1, 1], 'soft', .1));
  expect(result.status).toBe('approximate');
  expect(result.alpha).toEqual([.1, .1]);
  expect(result.w).toEqual([.2, 0]);
  expect(result.rows.map(row => row.hinge)).toEqual([.8, .8]);
  expect(result.primal).toBeCloseTo(.18, 12);
  expect(result.dual).toBeCloseTo(.18, 12);
});

test('infeasible hard constraints and zero weights do not produce invented distances or lines', () => {
  const state = marginState([[0, 0], [0, 0]], [-1, 1]);
  const hard = deriveLab(state);
  expect(hard.numerical.status).toBe('infeasible');
  expect(hard.lines).toEqual([]);
  expect(hard.surface).toBeNull();
  const soft = deriveLab({ ...state, mode: 'soft' });
  expect(soft.numerical.halfMargin).toBeNull();
  expect(soft.numerical.rows.every(row => row.signedDistance === null)).toBe(true);
  expect(soft.lines).toEqual([]);
});

test('kernel region fills are evaluated from the fitted model at actual cell centers', () => {
  const base = marginState([[-1, -1], [-1, 1], [1, -1], [1, 1]], [1, -1, -1, 1], 'kernel', 2);
  const state: SVMState = { ...base, kernel: { ...base.kernel, kind: 'rbf', gamma: .5 } };
  const lab = deriveLab(state);
  expect(lab.numerical.status).toBe('approximate');
  expect(lab.numerical.primal).toBeCloseTo(2 / (1 - Math.exp(-2)) ** 2, 4);
  expect(lab.surface).not.toBeNull();
  for (const cell of lab.surface!.cells) {
    const center: Vec2 = [(cell.x + lab.surface!.cellSize / 2 - 240) / 32, (240 - cell.y - lab.surface!.cellSize / 2) / 32];
    expect(cell.sign).toBe(Math.sign(decision(state, lab.numerical, center)));
  }
});

test('SVM replay is detached and editing a selected frame preserves that frame’s context', () => {
  const state = marginState([[-1, 0], [1, 0]], [-1, 1], 'soft');
  const frames = tradeoffTrace(state);
  expect(frames.map(frame => frame.state.C)).toEqual([.05, .25, 1, 4, 20]);
  const edited = editPoint(frames[1]!.state, 'owner0', { y: 1 });
  expect(edited.C).toBe(.25);
  expect(edited.points[0]!.x).toEqual([-1, 1]);
  expect(frames[1]!.state.points[0]!.x).toEqual([-1, 0]);
  expect(Object.isFrozen(frames[1]!.state.points[0]!.x)).toBe(true);
});

test('a real stalled polynomial solve keeps diagnostics and withholds all fitted geometry', () => {
  const base = marginState([[-5, 0], [5, 0], [0, 5]], [-1, 1, 1], 'kernel');
  const state: SVMState = { ...base, kernel: { kind: 'polynomial', gamma: 1, coef0: 1, degree: 4 } };
  const lab = deriveLab(state);
  expect(lab.numerical.gram).toEqual([[456976, 331776, 1], [331776, 456976, 1], [1, 1, 456976]]);
  expect(lab.numerical.status).toBe('failed');
  expect(lab.numerical.kkt).toBeGreaterThan(2e-5);
  expect(lab.lines).toEqual([]);
  expect(lab.surface).toBeNull();
  expect(() => decision(state, lab.numerical, [0, 0])).toThrow();
});

test('a positive exact determinant may be unresolved numerically but is never hard infeasibility', () => {
  const e = 2 ** -52;
  const state = marginState([[0, 0], [1 + e, 1 + 2 * e], [1, 1 + e]], [-1, -1, 1]);
  // The exact determinant is e²>0; a binary64 product difference rounds to zero.
  expect((1 + e) * (1 + e) - (1 + 2 * e)).toBe(0);
  try {
    const result = svm(state);
    expect(result.status).not.toBe('infeasible');
    expect(result.status).toBe('failed');
  } catch (error) {
    expect(error).toBeInstanceOf(RangeError);
    expect((error as Error).message).toMatch(/unresolved|representable|diagnostic/i);
  }
});

test('practical ML selection, fitted transforms and learning curves ignore test values', () => {
  const state = initial(), original = experiment(state);
  const testIds = new Set(original.board.test);
  const changed = experiment({ ...state, rows: state.rows.map(row => testIds.has(row.id) ? { ...row, x: [100] as [number], y: -100 } : row) });
  for (const key of ['board', 'candidates', 'selected', 'final', 'curves', 'leakage'] as const) expect(changed[key]).toEqual(original[key]);
  expect(changed.test).not.toEqual(original.test);
});

test('browser metric counts and probability calibration match hand fractions', () => {
  const result = metrics([.9, .8, .4, .1].map((p, i) => ({ id: String(i), p, y: [1, 0, 1, 0][i]! })), .5);
  expect([result.tp, result.fp, result.tn, result.fn]).toEqual([1, 1, 1, 1]);
  expect(result.brier).toBeCloseTo(51 / 200, 12);
  expect(result.bins.map(bin => bin.count)).toEqual([1, 0, 1, 0, 2]);
  expect(result.bins.map(bin => bin.frequency)).toEqual([0, null, 1, null, .5]);
  const empty = metrics([{ id: 'negative', p: .2, y: 0 }], 1);
  expect([empty.precision, empty.recall, empty.f1, empty.balancedAccuracy]).toEqual([null, null, null, null]);
});

test('browser train-only ridge and leaked scaling reproduce an exact numerical counterexample', () => {
  const rows = [[0, 0], [2, 2], [100, 100]].map(([x, y], i) => ({ id: String(i), group: String(i), x: [x!] as [number], y: y! }));
  const proper = fit(rows, ['0', '1'], 1, 1);
  const leaked = fit(rows, ['0', '1'], 1, 1, ['0', '1', '2']);
  expect(proper.preprocessing.fitIds).toEqual(['0', '1']);
  expect(proper.preprocessing.center).toBe(1);
  expect(proper.preprocessing.scale).toBe(1);
  expect(evaluate(rows, ['2'], proper).rows[0]!.prediction).toBe(50.5);
  expect(evaluate(rows, ['2'], leaked).rows[0]!.prediction).toBeCloseTo(6836 / 6539, 12);
});

test('workflow replay keeps deterministic source data and does not mutate historical phases', () => {
  const state = initial(), frames = workflowTrace(state);
  expect(frames.map(frame => frame.state.phase)).toEqual([0, 1, 2, 3, 4]);
  state.rows[0]!.x[0] = 123;
  expect(frames[0]!.state.rows[0]!.x[0]).toBe(-3);
  expect(Object.isFrozen(frames[0]!.state.rows[0]!.x)).toBe(true);
  expect(experiment(frames[2]!.state).selected).toEqual(experiment(frames[0]!.state).selected);
});

test('owner independent SVM and practical ML challenges execute actual canonical Python', () => {
  const python = process.env.BOOK_PYTHON ?? (existsSync('.venv/bin/python') ? resolve('.venv/bin/python') : 'python3');
  const output = execFileSync(python, ['-B', 'tests/unit/platform/wave-d-owner.py'], { encoding: 'utf8' });
  console.info(output.trim());
  expect(output).toContain('OK');
});
