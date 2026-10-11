import { expect, it } from 'vitest';
import { BLOCK_B_EXERCISES } from '../../src/lessons/probability/block-b-exercises';
const answers: Record<string, readonly string[]> = {
  'probability-variables-induced-masses': ['1/3', '1/3', '1/3'], 'probability-variables-preimage-event': ['2/3'], 'probability-variables-weighted-group': ['3/4', '1/4'],
  'probability-representations-inclusive-interval': ['3/4', '0'], 'probability-representations-cdf-values': ['1/4', '3/4', '1'], 'probability-representations-density-height': ['2', '1/2'],
  'probability-binomial-two-trials': ['1/4', '1/2', '1/4'], 'probability-binomial-three-trials': ['27/64'], 'probability-binomial-boundaries': ['1', '0', '1', '1'],
  'probability-continuous-uniform-window': ['1/4', '1/2'], 'probability-continuous-clipped-window': ['1'], 'probability-continuous-standardize': ['-1', '1'],
  'probability-expectation-canonical-moments': ['1/2', '5'], 'probability-expectation-dependent-linearity': ['5/2'], 'probability-expectation-affine': ['4'],
  'probability-variance-canonical': ['19/4'], 'probability-variance-scale-collapse': ['19', '0'], 'probability-variance-shift': ['5/2', '19/4'],
};
const exercises = Object.values(BLOCK_B_EXERCISES).flat();
it('Block B has thirty unique exercises and five per chapter', () => {
  expect(exercises).toHaveLength(30); expect(new Set(exercises.map(e => e.id)).size).toBe(30);
  for (const list of Object.values(BLOCK_B_EXERCISES)) expect(list).toHaveLength(5);
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
