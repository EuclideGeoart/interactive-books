import { describe, expect, it } from 'vitest';
import { EXERCISES, exerciseById } from '../../src/lessons/algebra/exercises';
import { deriveExtraneous } from '../../src/math/algebra/extraneous';
import type { Answer } from '../../src/platform/exercise';

const grade = (id: string, answer: Answer) => exerciseById(id)!.grade(answer);
const choice = (id: string, c: string) => grade(id, { choice: c });

describe('I.4 exercise set', () => {
  it('has unique ids, at least eight exercises of at least three kinds, and a worked solution and prompt for each', () => {
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

describe('I.4 grading against the model', () => {
  it('3x + 2 = x + 10: x = 4, and each slip is named', () => {
    expect(grade('solve-linear', { x: '4' }).correct).toBe(true);
    expect(grade('solve-linear', { x: '8/3' }).message).toMatch(/forgetting the x on the right/);
    expect(grade('solve-linear', { x: '6' }).message).toMatch(/adds the 2/);
    expect(grade('solve-linear', { x: '-4' }).message).toMatch(/wrong sign/);
    expect(grade('solve-linear', { x: '2' }).message).toMatch(/adds the x terms/);
    expect(grade('solve-linear', { x: '4.0' }).correct).toBe(true);
    expect(grade('solve-linear', { x: '12/3' }).correct).toBe(true);
  });
  it('2x + 3 = 2x + 7 has no solution', () => {
    expect(choice('no-solution', 'none').correct).toBe(true);
    expect(choice('no-solution', 'all').message).toMatch(/3 = 7/);
  });
  it('−3x < 6 divided by −3 is x > −2', () => {
    expect(choice('reverse-predict', 'gt-2').correct).toBe(true);
    expect(choice('reverse-predict', 'lt-2').message).toMatch(/not reversed/);
    expect(choice('reverse-predict', 'gt2').message).toMatch(/wrong sign/);
  });
  it('multiplying by zero loses the solution set', () => {
    expect(choice('multiply-zero', 'lost').correct).toBe(true);
    expect(choice('multiply-zero', 'false').message).toMatch(/TRUE for every x/);
  });
  it('√(x + 6) = x − 6: 10 is valid and 3 is extraneous', () => {
    const d = deriveExtraneous({ p: 6, q: -6 });
    expect(d.roots.map(r => r.status)).toEqual(['extraneous', 'valid']);
    expect(grade('valid-root', { x: '10' }).correct).toBe(true);
    expect(grade('valid-root', { x: '3' }).message).toMatch(/extraneous/);
    expect(grade('valid-root', { x: '7' }).correct).toBe(false);
  });
  it('the construction accepts exactly the (p, q) with one extraneous root, with a hint for each failure', () => {
    for (let p = -6; p <= 6; p++) for (let q = -6; q <= 6; q++) {
      const d = deriveExtraneous({ p, q });
      const r = grade('construct-extraneous', { p: String(p), q: String(q) });
      expect(r.correct, `${p},${q}`).toBe(d.roots.length === 2 && d.extraneousCount === 1);
      if (!r.correct) expect(r.message.length).toBeGreaterThan(40);
    }
    expect(grade('construct-extraneous', { p: '7', q: '0' }).message).toMatch(/between −6 and 6/);
    expect(grade('construct-extraneous', { p: '1.5', q: '0' }).correct).toBe(false);
    expect(grade('construct-extraneous', { p: '2', q: '0' }).correct).toBe(true);
    expect(grade('construct-extraneous', { p: '0', q: '1' }).message).toMatch(/negative/);
    expect(grade('construct-extraneous', { p: '3', q: '3' }).message).toMatch(/Both candidates/);
  });
  it('x(x − 2) = 3(x − 2) has the solutions 2 and 3', () => {
    expect(grade('lost-root', { small: '2', large: '3' }).correct).toBe(true);
    expect(grade('lost-root', { small: '3', large: '3' }).message).toMatch(/divid/);
    expect(grade('lost-root', { small: '3', large: '2' }).message).toMatch(/wrong boxes/);
  });
  it('4(x − 3) = 4x − 12', () => {
    expect(choice('distribute-expand', 'c-12').correct).toBe(true);
    expect(choice('distribute-expand', 'c-3').message).toMatch(/Only the first term/);
  });
  it('3(x + 1) = 3x + 3 is the identity', () => {
    expect(choice('pick-identity', 'a').correct).toBe(true);
    expect(choice('pick-identity', 'b').message).toMatch(/contradiction/);
    expect(choice('pick-identity', 'c').message).toMatch(/only at x = 0/);
  });
  it('0 < η < 1 is the contraction range', () => {
    expect(choice('learning-rate', 'unit').correct).toBe(true);
    expect(choice('learning-rate', 'pos').message).toMatch(/η = 2 gives the factor \|1 − 4\| = 3/);
    expect(choice('learning-rate', 'below').message).toMatch(/η = −1/);
  });
  it('5x − 1 ≥ 2x + 8 has boundary 3', () => {
    expect(grade('inequality-boundary', { b: '3' }).correct).toBe(true);
    expect(grade('inequality-boundary', { b: '7/3' }).message).toMatch(/ADD 1/);
    expect(grade('inequality-boundary', { b: '9/7' }).message).toMatch(/subtract 2x/);
    expect(grade('inequality-boundary', { b: '-3' }).message).toMatch(/wrong sign/);
  });
});
