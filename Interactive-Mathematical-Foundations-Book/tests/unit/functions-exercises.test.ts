import { describe, expect, it } from 'vitest';
import { EXERCISES, exerciseById } from '../../src/lessons/functions/exercises';
import type { Answer } from '../../src/platform/exercise';

const grade = (id: string, answer: Answer) => exerciseById(id)!.grade(answer);
const choice = (id: string, c: string) => grade(id, { choice: c });

describe('I.5 exercise set', () => {
  it('has unique ids, at least eight exercises of all four kinds, and a worked solution and prompt for each', () => {
    const ids = EXERCISES.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(EXERCISES.length).toBeGreaterThanOrEqual(8);
    for (const e of EXERCISES) {
      expect(e.solution.length).toBeGreaterThan(40);
      expect(e.prompt.length).toBeGreaterThan(20);
      expect(Boolean(e.choices) !== Boolean(e.fields), `${e.id}: choices xor fields`).toBe(true);
    }
    expect(new Set(EXERCISES.map(e => e.kind))).toEqual(new Set(['calculation', 'prediction', 'explanation', 'construction']));
  });
  it('every multiple-choice exercise has exactly one correct choice and a distinct, specific message for every wrong one', () => {
    for (const e of EXERCISES.filter(x => x.choices)) {
      const results = e.choices!.map(c => ({ id: c.id, r: e.grade({ choice: c.id }) }));
      expect(results.filter(x => x.r.correct), e.id).toHaveLength(1);
      const messages = results.map(x => x.r.message);
      expect(new Set(messages).size, `${e.id}: distinct feedback`).toBe(messages.length);
      for (const m of messages) expect(m, e.id).not.toBe('Not quite.');
      expect(e.grade({}).correct).toBe(false);
    }
  });
  it('every field exercise refuses empty and junk input without crashing', () => {
    for (const e of EXERCISES.filter(x => x.fields)) {
      for (const junk of ['', 'abc', '1/0', '--2', '   ']) {
        const answer: Record<string, string> = {};
        for (const f of e.fields!) answer[f.id] = junk;
        expect(e.grade(answer).correct, `${e.id} ${junk}`).toBe(false);
      }
      expect(e.grade({}).correct).toBe(false);
    }
  });
});

describe('I.5 grading against the model', () => {
  it('f(−1) for (x − 3)² is 16, and each slip is named', () => {
    expect(grade('evaluate-shift', { y: '16' }).correct).toBe(true);
    expect(grade('evaluate-shift', { y: '16.0' }).correct).toBe(true);
    expect(grade('evaluate-shift', { y: '-4' }).message).toMatch(/second step/);
    expect(grade('evaluate-shift', { y: '-16' }).message).toMatch(/brackets/);
    expect(grade('evaluate-shift', { y: '4' }).message).toMatch(/\(−1 \+ 3\)/);
    expect(grade('evaluate-shift', { y: '-8' }).message).toMatch(/separately/);
  });
  it('increasing a moves (x − a)² to the right', () => {
    expect(choice('shift-direction', 'right').correct).toBe(true);
    expect(choice('shift-direction', 'left').message).toMatch(/RIGHT/);
    expect(choice('shift-direction', 'up').message).toMatch(/sideways/);
  });
  it('the domain of √(x + 3) is x ≥ −3, edge included', () => {
    expect(choice('root-domain', 'ge-3').correct).toBe(true);
    expect(choice('root-domain', 'gt-3').message).toMatch(/edge is included/);
    expect(choice('root-domain', 'ge3').message).toMatch(/sign of the bound/);
    expect(choice('root-domain', 'le-3').message).toMatch(/wrong way/);
  });
  it('1/(x − 2) refuses only x = 2', () => {
    expect(choice('pole-domain', 'not2').correct).toBe(true);
    expect(choice('pole-domain', 'all').message).toMatch(/1\/0/);
    expect(choice('pole-domain', 'not0').message).toMatch(/x − 2, not x/);
  });
  it('the image of −2x² is y ≤ 0', () => {
    expect(choice('stretch-image', 'le0').correct).toBe(true);
    expect(choice('stretch-image', 'ge0').message).toMatch(/reverses/);
    expect(choice('stretch-image', 'all').message).toMatch(/Positive outputs never appear/);
  });
  it('(x − 2)² = 9 has the inputs −1 and 5', () => {
    expect(grade('preimage-nine', { small: '-1', large: '5' }).correct).toBe(true);
    expect(grade('preimage-nine', { small: '5', large: '-1' }).message).toMatch(/wrong boxes/);
    expect(grade('preimage-nine', { small: '-3', large: '3' }).message).toMatch(/x − 2 = ±3/);
    expect(grade('preimage-nine', { small: '5', large: '5' }).message).toMatch(/negative root/);
  });
  it('f(g(3)) = 25 and g(f(3)) = 17', () => {
    expect(grade('composition-order', { y: '25' }).correct).toBe(true);
    expect(grade('composition-order', { y: '17' }).message).toMatch(/INNER/);
    expect(grade('composition-order', { y: '45' }).message).toMatch(/multiplies/);
    expect(grade('composition-order', { y: '5' }).message).toMatch(/second machine/);
  });
  it('the domain of √(2x − 1) is x ≥ 1/2', () => {
    expect(choice('composite-domain', 'ge-half').correct).toBe(true);
    expect(choice('composite-domain', 'ge0').message).toMatch(/domain of f alone/);
    expect(choice('composite-domain', 'all').message).toMatch(/inherits/);
  });
  it('(1 − a)² = 16 holds for a = −3 and a = 5, nothing else in range', () => {
    const ok = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].filter(a => grade('construct-output', { a: String(a) }).correct);
    expect(ok).toEqual([-3, 5]);
    expect(grade('construct-output', { a: '9' }).message).toMatch(/between −5 and 5/);
    expect(grade('construct-output', { a: '3' }).message).toMatch(/f\(1\) is 4/);
    expect(grade('construct-output', { a: '1.5' }).correct).toBe(false);
  });
  it('x² has no inverse on all of R because 3 and −3 share an output', () => {
    expect(choice('square-inverse', 'two').correct).toBe(true);
    expect(choice('square-inverse', 'notfn').message).toMatch(/BACKWARD/);
  });
});
