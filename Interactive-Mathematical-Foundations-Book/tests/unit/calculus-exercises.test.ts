import { expect, it } from 'vitest';
import { CALCULUS_EXERCISES } from '../../src/lessons/calculus/exercises';
/** Literal answers worked by hand, independent of the grader's expected strings. */
const answers: Record<string, readonly string[]> = {
  'iii1-hole': ['4'], 'iii1-sides': ['-1', '1'], 'iii2-join': ['2'], 'iii2-repair': ['6'], 'iii3-secant': ['2.5'], 'iii3-limit': ['2'],
  'iii4-model': ['9.6'], 'iii4-error': ['1/100'], 'iii4-rate': ['4', '2'], 'iii5-product': ['6'], 'iii5-quotient': ['-0.5'], 'iii5-increment': ['3/2', '1/2', '1/8'],
  'iii7-partials': ['4', '4'], 'iii7-slice': ['4'], 'iii7-secant': ['2'], 'iii8-gradient': ['1', '2'], 'iii8-directional': ['2.2'], 'iii8-steepest': ['5'],
  'iii9-entries': ['2', '-4', '4', '2'], 'iii9-predict': ['-14/5', '22/5'], 'iii9-shape': ['2', '3'], 'iii10-forward': ['5', '10'], 'iii10-reverse': ['7', '2'], 'iii10-square': ['3', '3', '6'],
  'iii11-hessian': ['6', '0', '2'], 'iii11-det': ['-12'], 'iii11-curvature': ['2', '-2'],
  'iii12-left': ['1'], 'iii12-signed': ['1.5', '2.5'], 'iii12-reverse': ['-5'], 'iii13-value': ['6', '5'], 'iii13-strip': ['3/100'], 'iii13-lower': ['0', '8', '6'],
  'iii14-forward': ['21/10'], 'iii14-centered': ['2'], 'iii14-order': ['2', '4'], 'iii15-trap': ['0.5', '1/6'], 'iii15-mid': ['0.25'], 'iii15-order': ['2'],
  'iii6-chain': ['12'], 'iii6-where': ['3', '6'], 'iii6-change': ['-3/50'],
};
it('every Part III chapter has five exercises with globally unique identifiers', () => {
  const all = Object.values(CALCULUS_EXERCISES).flat();
  expect(Object.keys(CALCULUS_EXERCISES)).toHaveLength(15); expect(all).toHaveLength(75);
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
