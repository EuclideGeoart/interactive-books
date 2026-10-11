import { expect, it } from 'vitest';
import { BLOCK_C_EXERCISES } from '../../src/lessons/probability/block-c-exercises';
const answers: Record<string, readonly string[]> = {
  'probability-joint-marginals': ['8', '1/2', '1/8'], 'probability-joint-conditional': ['1/2', '1/2', '0'], 'probability-joint-independent-cell': ['1/16', '1/4', '1/2'],
  'probability-covariance-canonical': ['0', '0', '1/4', '1/2'], 'probability-covariance-affine': ['3', '-1', '2', '9/2', '-3/2', '-1/2'], 'probability-covariance-sum-variance': ['3/2'],
  'probability-lln-prefix-means': ['1', '1/2', '2/3', '3/4'], 'probability-lln-uniform-mean-variance': ['1/2', '1/1200'], 'probability-lln-bernoulli-scale': ['3/16', '3/1600'],
  'probability-clt-standardize': ['3/2', '1'], 'probability-clt-bernoulli-center-spread': ['1/4', '3/1600'], 'probability-clt-histogram-density': ['3/20', '1/20', '19/20', '1/20'],
};
const exercises = Object.values(BLOCK_C_EXERCISES).flat();
it('Block C has twenty unique exercises and five per chapter', () => {
  expect(exercises).toHaveLength(20); expect(new Set(exercises.map(e => e.id)).size).toBe(20);
  for (const list of Object.values(BLOCK_C_EXERCISES)) expect(list).toHaveLength(5);
});
for (const e of exercises) it(`${e.id}: literal answer, malformed input and corrective feedback`, () => {
  expect(e.solution.length).toBeGreaterThan(30); expect(e.grade({}).correct).toBe(false);
  if (e.choices) {
    expect(e.grade({ choice: e.choices[0]!.id })).toEqual({ correct: true, message: e.solution });
    for (const c of e.choices.slice(1)) { const result = e.grade({ choice: c.id }); expect(result.correct).toBe(false); expect(result.message.length).toBeGreaterThan(25); }
    expect(e.grade({ choice: 'unknown' }).correct).toBe(false);
  } else {
    const make = (values: readonly string[]) => Object.fromEntries(e.fields!.map((f, i) => [f.id, values[i]!]));
    expect(e.grade(make(answers[e.id]!))).toEqual({ correct: true, message: e.solution });
    for (const bad of ['999', 'NaN', '1/0', '']) expect(e.grade(make(e.fields!.map(() => bad))).correct).toBe(false);
  }
});
