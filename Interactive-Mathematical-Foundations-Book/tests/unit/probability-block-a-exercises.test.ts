import { expect, it } from 'vitest';
import { BLOCK_A_EXERCISES } from '../../src/lessons/probability/block-a-exercises';
const answers: Record<string, readonly string[]> = {
  'probability-experiments-even-mass': ['6', '1/2'], 'probability-experiments-biased-event': ['1/2'],
  'probability-events-overlap-union': ['1/3', '2/3'], 'probability-events-complement': ['1/2'], 'probability-events-weighted-union': ['1/3', '1'],
  'probability-counting-default-selections': ['12', '6'], 'probability-counting-replacement-orders': ['16', '10'], 'probability-counting-target-pair': ['1/6'],
  'probability-conditional-restricted-die': ['2/3'], 'probability-conditional-weighted-restriction': ['2/3', '1/3'], 'probability-conditional-reverse-direction': ['1/3', '1'],
  'probability-independence-die-test': ['1/3', '1/4'], 'probability-independence-two-coins': ['1/4', '1/2'], 'probability-independence-construct-joint': ['1/6', '1/6', '1/3', '1/3'],
  'probability-bayes-population-counts': ['90', '10', '495', '9405'], 'probability-bayes-positive-update': ['117/2000', '2/13'], 'probability-bayes-negative-update': ['2/1883'],
};
const exercises = Object.values(BLOCK_A_EXERCISES).flat();
it('Block A has thirty unique exercises and five per chapter', () => {
  expect(exercises).toHaveLength(30); expect(new Set(exercises.map(e => e.id)).size).toBe(30);
  for (const list of Object.values(BLOCK_A_EXERCISES)) expect(list).toHaveLength(5);
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
