import { expect, it } from 'vitest';
import { CALCULUS_EXERCISES } from '../../src/lessons/calculus/exercises';
/** Literal answers worked by hand, independent of the grader's expected strings. */
const answers: Record<string, readonly string[]> = {
  'iii1-hole': ['4'], 'iii1-sides': ['-1', '1'], 'iii2-join': ['2'], 'iii2-repair': ['6'], 'iii3-secant': ['2.5'], 'iii3-limit': ['2'],
  'iii4-model': ['9.6'], 'iii4-error': ['1/100'], 'iii4-rate': ['4', '2'], 'iii5-product': ['6'], 'iii5-quotient': ['-0.5'], 'iii5-increment': ['3/2', '1/2', '1/8'],
  'iii6-chain': ['12'], 'iii6-where': ['3', '6'], 'iii6-change': ['-3/50'],
};
it('every Part III chapter has five exercises with globally unique identifiers', () => {
  const all = Object.values(CALCULUS_EXERCISES).flat();
  expect(new Set(all.map(e => e.id)).size).toBe(all.length);
  for (const list of Object.values(CALCULUS_EXERCISES)) expect(list).toHaveLength(5);
  for (const e of all) expect(e.id).toMatch(/^iii\d+-[a-z-]+$/);
});
for (const e of Object.values(CALCULUS_EXERCISES).flat()) it(`${e.id}: literal answer, rejection and worked feedback`, () => {
  expect(e.solution.length).toBeGreaterThan(30); expect(e.grade({}).correct).toBe(false);
  if (e.choices) {
    expect(e.grade({ choice: e.choices[0]!.id })).toEqual({ correct: true, message: e.solution });
    for (const c of e.choices.slice(1)) { const r = e.grade({ choice: c.id }); expect(r.correct).toBe(false); expect(r.message.length).toBeGreaterThan(25); }
  } else {
    const make = (values: readonly string[]) => Object.fromEntries(e.fields!.map((f, i) => [f.id, values[i]!]));
    expect(answers[e.id], `${e.id} needs a hand-worked literal answer`).toBeDefined();
    expect(e.grade(make(answers[e.id]!))).toEqual({ correct: true, message: e.solution });
    for (const value of ['999', 'NaN', '1/0', '']) expect(e.grade(make(e.fields!.map(() => value))).correct).toBe(false);
  }
});
