import { describe, expect, it } from 'vitest';
import { MATRIX_EXERCISES } from '../../src/lessons/linear-algebra/matrix-exercises';

const answers: Record<string, readonly string[]> = {
  'transform-columns': ['6', '10'], 'transform-singular': ['0'],
  'matvec-rows': ['6', '10'], 'matvec-columns': ['-1', '5'],
  'compose-product': ['1', '1', '1', '2'], 'compose-vector': ['3', '5'], 'compose-affine': ['2', '2'],
  'orth-transpose': ['0', '1', '-1', '0'], 'orth-length': ['5'],
  'det-value': ['6'], 'det-area': ['4'], 'det-singular': ['0'],
  'systems-unique': ['2', '1'], 'systems-vertical': ['2', '-3'],
};

describe('II.8–II.13 exercises', () => {
  const exercises = Object.values(MATRIX_EXERCISES).flat();

  it('has five graded, uniquely named exercises per chapter', () => {
    expect(Object.values(MATRIX_EXERCISES).map(chapter => chapter.length)).toEqual([5, 5, 5, 5, 5, 5]);
    expect(new Set(exercises.map(exercise => exercise.id)).size).toBe(30);
    for (const exercise of exercises) {
      expect(exercise.prompt.length).toBeGreaterThan(20);
      expect(exercise.solution).toBeTruthy();
    }
  });

  it('accepts every worked answer and rejects a misconception and missing input', () => {
    expect(Object.keys(answers).sort()).toEqual(exercises.filter(exercise => exercise.fields).map(exercise => exercise.id).sort());
    for (const exercise of exercises) {
      const correct = exercise.choices
        ? { choice: exercise.choices[0]!.id }
        : Object.fromEntries(answers[exercise.id]!.map((value, index) => [`n${index}`, value]));
      const wrong = exercise.choices
        ? { choice: exercise.choices[1]!.id }
        : Object.fromEntries(exercise.fields!.map(field => [field.id, '999']));
      expect(exercise.grade(correct).correct, exercise.id).toBe(true);
      expect(exercise.grade(wrong).correct, exercise.id).toBe(false);
      expect(exercise.grade({}).correct, exercise.id).toBe(false);
    }
  });
});
