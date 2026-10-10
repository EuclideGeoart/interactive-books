/**
 * The I.9 exercises: each answer is confirmed by a model, not only by the author of the exercise, and each known wrong answer gets the hint that
 * names its misconception.
 */
import { describe, expect, it } from 'vitest';
import { q } from '../../src/math/notation/rational';
import { deriveAlgebra, deriveShape } from '../../src/math/notation/shapes';
import { norms, radicalToNumber } from '../../src/math/notation/norms';
import { deriveArgmin } from '../../src/math/notation/argmin';
import { deriveExpect } from '../../src/math/notation/expectation';
import { decimalToQ } from '../../src/math/notation/gradient';
import { EXERCISES } from '../../src/lessons/notation/exercises';

const byId = (id: string) => EXERCISES.find(e => e.id === id)!;
const choice = (id: string, c: string) => byId(id).grade({ choice: c });
const fields = (id: string, a: Record<string, string>) => byId(id).grade(a);

describe('exercises', () => {
  it('there are at least eight, each with a unique id, a prompt, a worked solution and a way to answer', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(8);
    expect(new Set(EXERCISES.map(e => e.id)).size).toBe(EXERCISES.length);
    for (const e of EXERCISES) {
      expect(e.prompt.length, e.id).toBeGreaterThan(30);
      expect(e.solution.length, e.id).toBeGreaterThan(60);
      expect(Boolean(e.choices) !== Boolean(e.fields), e.id).toBe(true);
      expect(e.prompt + e.solution, e.id).not.toMatch(/\$|\\[a-z]+\{/);
    }
    expect(new Set(EXERCISES.map(e => e.kind)).size).toBeGreaterThanOrEqual(3);
  });
  it('every multiple-choice exercise has exactly one correct choice and a specific hint for each wrong one', () => {
    for (const e of EXERCISES.filter(x => x.choices)) {
      const results = e.choices!.map(c => e.grade({ choice: c.id }));
      expect(results.filter(r => r.correct), e.id).toHaveLength(1);
      expect(new Set(results.map(r => r.message)).size, e.id).toBe(results.length);
      expect(e.grade({}).correct, e.id).toBe(false);
    }
  });
  it('every exercise rejects an empty or non-numeric answer instead of grading it', () => {
    for (const e of EXERCISES.filter(x => x.fields)) {
      const blank = Object.fromEntries(e.fields!.map(f => [f.id, '']));
      const letters = Object.fromEntries(e.fields!.map(f => [f.id, 'x']));
      expect(e.grade(blank).correct, e.id).toBe(false);
      expect(e.grade(letters).correct, e.id).toBe(false);
      expect(e.grade(blank).message, e.id).toMatch(/Enter a number/);
    }
  });
  it('the prompts do not give their answers away', () => {
    expect(byId('entry-index').prompt).not.toMatch(/\b11\b/);
    expect(byId('norms').prompt).not.toMatch(/\b(14|10)\b/);
    expect(byId('argmin-min').prompt).not.toMatch(/\bposition 7\b/);
    expect(byId('expectation').prompt).not.toMatch(/4\/5|8\/10/);
    expect(byId('argmin-tie').prompt).not.toMatch(/position 5|\b5\b/);
  });
  it('no exercise uses the data of a ready-made stage case, so that no preset shows its answer', () => {
    // the payoff preset is counts 3, 1, 1 and the wells presets are centred at 0 and 1; the exercises use counts 2, 3, 5 and centre 2
    expect(deriveExpect({ set: 'payoff', c1: 2, c2: 3, c3: 5, c4: 0, c5: 0, c6: 0 }).total).toBe(10);
    expect(byId('expectation').prompt).toMatch(/2 times, 0 appeared 3 times and 2 appeared 5 times/);
    expect(byId('argmin-tie').prompt).toMatch(/\(θ − 2\)²/);
  });

  it('entry-index: X[2, 3] is the third example, the fourth feature, at position 11', () => {
    const d = deriveShape({ kind: 'matrix', n: 5, d: 4, B: 1, T: 1, i: 3, j: 4, k: 1 });
    expect(d.numpy).toBe('X[2, 3]');
    expect(d.selection!.offset).toBe(11);
    expect(fields('entry-index', { example: '3', feature: '4', position: '11' }).correct).toBe(true);
    expect(fields('entry-index', { example: '2', feature: '3', position: '11' }).message).toMatch(/NumPy numbers/);
    expect(fields('entry-index', { example: '4', feature: '3', position: '11' }).message).toMatch(/swapped/);
    expect(fields('entry-index', { example: '3', feature: '4', position: '12' }).message).toMatch(/start at 0/);
    expect(fields('entry-index', { example: '3', feature: '4', position: '14' }).message).toMatch(/row length is d = 4/);
    expect(fields('entry-index', { example: '3', feature: '4', position: '6' }).message).toMatch(/not by 1/);
  });
  it('last-entry: i = 4, j = 3 at position 11', () => {
    const d = deriveShape({ kind: 'matrix', n: 4, d: 3, B: 1, T: 1, i: 4, j: 3, k: 1 });
    expect(d.selection!.offset).toBe(11);
    expect(d.count - 1).toBe(11);
    expect(d.numpy).toBe('X[3, 2]');
    expect(fields('last-entry', { i: '4', j: '3', position: '11' }).correct).toBe(true);
    expect(fields('last-entry', { i: '3', j: '2', position: '11' }).message).toMatch(/NumPy indices/);
    expect(fields('last-entry', { i: '3', j: '4', position: '11' }).message).toMatch(/swapped/);
    expect(fields('last-entry', { i: '4', j: '3', position: '12' }).message).toMatch(/one less/);
  });
  it('product-shapes: (6,4)(4,3) -> (6,3) and X^T X -> (4,4)', () => {
    const xw = deriveAlgebra({ op: 'matmul', n: 6, d: 4, p: 4, q: 3 });
    expect(xw.result).toEqual([6, 3]);
    expect(deriveAlgebra({ op: 'gram', n: 6, d: 4, p: 1, q: 1 }).result).toEqual([4, 4]);
    expect(fields('product-shapes', { 'xw-rows': '6', 'xw-cols': '3', 'g-rows': '4', 'g-cols': '4' }).correct).toBe(true);
    expect(fields('product-shapes', { 'xw-rows': '4', 'xw-cols': '4', 'g-rows': '4', 'g-cols': '4' }).message).toMatch(/OUTER pair/);
    expect(fields('product-shapes', { 'xw-rows': '6', 'xw-cols': '3', 'g-rows': '6', 'g-cols': '6' }).message).toMatch(/X Xᵀ/);
  });
  it('product-defined: X @ w fails for (5, 3) and 5 entries, and X^T @ w is defined with 3 entries', () => {
    const direct = deriveAlgebra({ op: 'matvec', n: 5, d: 3, p: 5, q: 1 });
    expect(direct.valid).toBe(false);
    const transposed = deriveAlgebra({ op: 'matvec', n: 3, d: 5, p: 5, q: 1 });
    expect(transposed.valid).toBe(true);
    expect(transposed.result).toEqual([3]);
    expect(choice('product-defined', 'transpose').correct).toBe(true);
    expect(choice('product-defined', 'broadcast').message).toMatch(/elementwise/);
  });
  it('norms: (-6, 8) has norms 14, 10, 8', () => {
    const n = norms([decimalToQ(-6), decimalToQ(8)]);
    expect([n.l1, n.linf]).toEqual([q(14), q(8)]);
    expect(radicalToNumber(n.l2)).toBe(10);
    expect(n.l2.radicand).toBe(1n);
    expect(fields('norms', { l1: '14', l2: '10', linf: '8' }).correct).toBe(true);
    expect(fields('norms', { l1: '2', l2: '10', linf: '8' }).message).toMatch(/ABSOLUTE/);
    expect(fields('norms', { l1: '14', l2: '100', linf: '8' }).message).toMatch(/square root/);
    expect(fields('norms', { l1: '14', l2: '10', linf: '-6' }).message).toMatch(/never negative/);
  });
  it('argmin-min: min 2, arg min 3, np.argmin 7', () => {
    const d = deriveArgmin({ kind: 'bowl', c: 3, b: 2 });
    expect(d.minValue).toBe(2);
    expect([...d.argmin]).toEqual([3]);
    expect(d.npIndex).toBe(7);
    expect(fields('argmin-min', { min: '2', argmin: '3', npargmin: '7' }).correct).toBe(true);
    expect(fields('argmin-min', { min: '3', argmin: '2', npargmin: '7' }).message).toMatch(/swapped/);
    expect(fields('argmin-min', { min: '2', argmin: '3', npargmin: '3' }).message).toMatch(/position/);
    expect(fields('argmin-min', { min: '2', argmin: '3', npargmin: '8' }).message).toMatch(/start at 0/);
  });
  it('argmin-tie: ((θ − 2)² − 1)² is smallest at 1 and 3, and np.argmin gives the position 5 of the first', () => {
    const d = deriveArgmin({ kind: 'two-wells', c: 2, b: 0 });
    expect([...d.argmin]).toEqual([1, 3]);
    expect(d.npIndex).toBe(5);
    expect(d.rows[7]!.isMinimiser).toBe(true);
    // worked by hand: (θ − 2)² − 1 is 35, 24, 15, 8, 3, 0, −1, 0, 3 for θ = −4, …, 4, and each is squared
    expect(d.rows.map(r => r.loss)).toEqual([1225, 576, 225, 64, 9, 0, 1, 0, 9]);
    expect(choice('argmin-tie', 'position').correct).toBe(true);
    expect(choice('argmin-tie', 'second').message).toMatch(/FIRST/);
  });
  it('expectation: counts 2, 3, 5 on the values -1, 0, 2 give 4/5 (hand-worked: (-2 + 0 + 10) / 10)', () => {
    const d = deriveExpect({ set: 'payoff', c1: 2, c2: 3, c3: 5, c4: 0, c5: 0, c6: 0 });
    expect(d.expectation).toEqual(q(4, 5));
    expect(d.p).toEqual([q(1, 5), q(3, 10), q(1, 2)]);
    expect(fields('expectation', { value: '4/5' }).correct).toBe(true);
    expect(fields('expectation', { value: '0.8' }).correct).toBe(true);
    expect(fields('expectation', { value: '-4/5' }).message).toMatch(/POSITIVE/);
    expect(fields('expectation', { value: '2' }).message).toMatch(/mode/);
    expect(fields('expectation', { value: '8/3' }).message).toMatch(/different payoffs/);
    expect(fields('expectation', { value: '1/3' }).message).toMatch(/plain average/);
    expect(fields('expectation', { value: '8' }).message).toMatch(/dividing by the total/);
    expect(fields('expectation', { value: 'abc' }).correct).toBe(false);
  });
  it('no-data: every count 0 is undefined', () => {
    const d = deriveExpect({ set: 'die', c1: 0, c2: 0, c3: 0, c4: 0, c5: 0, c6: 0 });
    expect(d.defined).toBe(false);
    expect(d.expectation).toBeNull();
    expect(choice('no-data', 'undefined').correct).toBe(true);
    expect(choice('no-data', 'zero').message).toMatch(/0 \/ 0/);
  });
  it('gradient-shape: the same shape as theta', () => {
    expect(choice('gradient-shape', 'same').correct).toBe(true);
    expect(choice('gradient-shape', 'square').message).toMatch(/Hessian/);
  });
});
