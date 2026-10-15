import { describe, expect, it } from 'vitest';
import fixture from '../../../fixtures/p08/evaluation.fixtures.json';
import { initial, experiment, fit, evaluate, metrics, split, numerics, workflowTrace, type State, type Row } from '../../../src/parts/p08/model/evaluation';
import { derive, preset } from '../../../src/parts/p08/lesson';
const near = (actual: number, expected: number) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(2e-12 * (1 + Math.abs(expected)));

describe('Part VIII mathematical boundaries and state', () => {
  it('matches exact hand metrics and fixed bin counts', () => {
    const m = metrics(initial().probabilities, .5);
    for (const [k, v] of Object.entries(fixture.metric.expected)) near(m[k as keyof typeof fixture.metric.expected]!, v);
    expect(m.bins.map(b => b.count)).toEqual(fixture.metric.binCounts);
    expect(metrics(initial().probabilities, 1).precision).toBeNull();
    expect(metrics(initial().probabilities, 1).recall).toBe(0);
    for (const cutoff of [0, .2, .4, .5, .6, .8, .9, 1]) near(metrics(initial().probabilities, cutoff).brier, .195);
    const edge = [0, .2, .4, .6, .8, 1].map((p, i) => ({ id: String(i), p, y: i % 2 }));
    expect(metrics(edge, .5).bins.map(b => b.count)).toEqual([1, 1, 1, 1, 2]);
    const negative = metrics([{ id: 'one', y: 0, p: .2 }], .5);
    expect(negative.recall).toBeNull(); expect(negative.f1).toBeNull(); expect(negative.balancedAccuracy).toBeNull();
  });
  it('matches the independent literal leakage calculation', () => {
    const c = fixture.leakage, rows = c.rows as Row[];
    const proper = fit(rows, c.train, 1, 1), leaked = fit(rows, c.train, 1, 1, [...c.train, ...c.validation]);
    near(proper.slope, .5); near(proper.intercept, 1); near(proper.trainingMse, .25); near(proper.objective, .5);
    near(evaluate(rows, c.validation, proper).mse, c.proper.heldOutMse); near(evaluate(rows, c.validation, leaked).mse, c.leaked.heldOutMse);
    near(leaked.preprocessing.scale ** 2, 14); near(leaked.slope ** 2, c.leaked.slopeSquared);
    expect(proper.preprocessing.fitIds).toEqual(c.train); expect(leaked.preprocessing.fitIds).toEqual([...c.train, ...c.validation]);
    expect(leaked.trainIds).toEqual(proper.trainIds);
  });
  it('preserves exact group boundaries, coverage and seed-zero membership', () => {
    const s = initial(), b = split(s.rows, 0, 3);
    expect(b.groups).toEqual(fixture.seedZero.groups); expect(b.draws).toEqual(fixture.seedZero.draws); expect(b.test).toEqual(fixture.seedZero.test);
    expect(b.folds.map(f => f.validation)).toEqual(fixture.seedZero.validation);
    for (const seed of [0, 7, 31, 0xffffffff]) for (const k of [2, 3, 4]) {
      const board = split(s.rows, seed, k), lookup = new Map(s.rows.map(r => [r.id, r.group]));
      const held = board.folds.flatMap(f => f.validation); expect(new Set(held).size).toBe(held.length); expect([...held].sort()).toEqual([...board.development].sort());
      for (const fold of board.folds) {
        expect(fold.train.filter(id => fold.validation.includes(id) || board.test.includes(id))).toEqual([]);
        const groups = new Set(fold.train.map(id => lookup.get(id)));
        expect(fold.validation.some(id => groups.has(lookup.get(id)))).toBe(false);
      }
    }
  });
  it('test value mutations cannot affect selection, preprocessing, curves or model fits', () => {
    const s = initial(), base = experiment(s);
    const changed = { ...s, rows: s.rows.map(r => base.board.test.includes(r.id) ? { ...r, x: [20] as [number], y: -20 } : r) };
    const actual = experiment(changed);
    for (const key of ['board', 'candidates', 'selected', 'curves', 'final', 'leakage'] as const) expect(actual[key]).toEqual(base[key]);
    expect(actual.test).not.toEqual(base.test);
  });
  it('every nested curve refits exact membership and records the declared objective', () => {
    const result = experiment(initial()); let previous: string[] = [];
    for (const point of result.curves) {
      expect(previous.every(id => point.ids.includes(id))).toBe(true); expect(point.n).toBe(point.ids.length);
      expect(point.model.trainIds).toEqual(point.ids); expect(point.model.preprocessing.fitIds).toEqual(point.ids);
      expect(point.validation.ids).toEqual(result.board.folds[0]!.validation);
      near(point.model.objective, point.model.trainingMse + point.model.penalty * point.model.slope ** 2);
      expect(point.ids.some(id => result.board.test.includes(id))).toBe(false); previous = point.ids;
    }
    expect([...previous].sort()).toEqual([...result.board.folds[0]!.train].sort());
  });
  it('constant features and exact ties have explicit conventions', () => {
    const n = experiment(preset('constant'));
    expect(n.selected).toEqual({ power: 1, penalty: 0 }); expect(n.final.preprocessing.constant).toBe(true); expect(n.final.slope).toBe(0); expect(n.test.mse).toBe(0);
    const negative = experiment(preset('all-negative')).metrics;
    expect(negative.recall).toBeNull(); expect(negative.balancedAccuracy).toBeNull();
  });
  it('actual binary64 nonassociativity and stable cancellation match hand expectations', () => {
    const b = fixture.binary64, n = numerics(b.t, b.delta);
    expect(n.left).toBe(b.left); expect(n.right).toBe(b.right); expect(n.fragile).toBe(b.fragile);
    expect(Math.abs(n.stable / b.stable - 1)).toBeLessThan(2e-12); expect(n.condition).toBeGreaterThan(1e8);
    expect(n.reciprocal).not.toBe(n.nominalReciprocal);
  });
  it('trace snapshots detach, freeze and fork from their displayed phase', () => {
    const s = initial(), frames = workflowTrace(s);
    expect(frames.map(f => f.state.phase)).toEqual([0, 1, 2, 3, 4]);
    s.rows[0]!.y = 20; expect(frames[0]!.state.rows[0]!.y).toBe(8);
    expect(Object.isFrozen(frames[0]!.state.rows[0]!.x)).toBe(true);
    const fork = { ...frames[2]!.state, seed: 10 }; expect(fork.phase).toBe(2); expect(frames[2]!.state.seed).toBe(7);
    expect(derive(fork).state).toBe(fork);
  });
  it('rejects malformed shapes, sparse holes, duplicate IDs, booleans and unavailable arithmetic', () => {
    const invalid: State[] = [];
    for (const seed of [true, -1, 2 ** 32, .5, '7', NaN]) invalid.push({ ...initial(), seed } as State);
    for (const threshold of [true, -.1, 1.1, Infinity]) invalid.push({ ...initial(), threshold } as State);
    const sparse = initial(); delete sparse.rows[2]; invalid.push(sparse);
    const holes = initial(); holes.rows[0]!.x = new Array(1) as unknown as Row['x']; invalid.push(holes);
    const duplicate = initial(); duplicate.rows[1]!.id = duplicate.rows[0]!.id; invalid.push(duplicate);
    for (const x of [[], [1, 2], [true], [Infinity], ['1']]) { const s = initial(); s.rows[0]!.x = x as Row['x']; invalid.push(s); }
    const probs = initial(); delete probs.probabilities[0]; invalid.push(probs);
    for (const s of invalid) expect(() => experiment(s)).toThrow();
    const missing = initial(); missing.rows = missing.rows.map((r): Row => ({ ...r, x: [null] })); expect(() => experiment(missing)).toThrow(/Mean/);
    for (const magnitude of [1e200, 1e-200]) expect(() => fit([{ id: 'a', group: 'a', x: [-magnitude], y: 0 }, { id: 'b', group: 'b', x: [magnitude], y: 1 }], ['a', 'b'], 1, 1)).toThrow(/unavailable/);
    expect(() => derive(initial(), 0)).toThrow();
  });
});
