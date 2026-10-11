import { expect, it } from 'vitest';
import katex from 'katex';
import { deriveMoments, mappingDistribution } from '../../src/math/probability/moments';
import { fractionText } from '../../src/math/probability/finite';
import { add, eq, mul } from '../../src/math/quantity/rational';
import { deriveMomentsLesson, MOMENTS_CANONICAL } from '../../src/lessons/probability/moments-lesson';
import { deriveVariableLesson, VARIABLE_CANONICAL } from '../../src/lessons/probability/variables-lesson';

it('random variables merge equal values without erasing outcome mass', () => {
  const d = mappingDistribution([1, 1, 1, 1, 1, 1], [0, 0, 1, 1, 2, 2]);
  expect(d.distribution.map(x => [fractionText(x.value), fractionText(x.mass)])).toEqual([['0/1', '1/3'], ['1/1', '1/3'], ['2/1', '1/3']]);
});
it('expectation and centered variance equal independent literal calculations', () => {
  const d = deriveMoments([1, 2, 1], [-2, 0, 4], 1, 0);
  expect([d.mean, d.secondMoment, d.variance].map(fractionText)).toEqual(['1/2', '5/1', '19/4']);
  expect(d.standardDeviation).toBe(Math.sqrt(19) / 2);
  expect(eq(d.sumXY.mean, add(d.mean, d.dependentY.mean))).toBe(true);
  expect(fractionText(d.sumXY.mean)).toBe('5/2');
});
it('location, scale and degeneracy retain exact population meanings', () => {
  const shifted = deriveMoments([1, 2, 1], [-2, 0, 4], 1, 2), reversed = deriveMoments([1, 2, 1], [-2, 0, 4], -2, 0);
  expect(fractionText(shifted.transformed.mean)).toBe('5/2'); expect(fractionText(shifted.transformed.variance)).toBe('19/4');
  expect(fractionText(reversed.transformed.mean)).toBe('-1/1'); expect(fractionText(reversed.transformed.variance)).toBe('19/1');
  const constant = deriveMoments([1, 2, 1], [2, 2, 2], 0, 3); expect(fractionText(constant.variance)).toBe('0/1'); expect(constant.standardDeviation).toBe(0);
  expect(eq(reversed.transformed.variance, mul(mul(reversed.scale, reversed.scale), reversed.variance))).toBe(true);
  for (const args of [[[], []], [[0], [2]], [[1, 2], [1]], [[1], [NaN]]]) expect(() => deriveMoments(args[0]!, args[1]!, 1, 0)).toThrow();
});
it('mapping and moments views expose the same exact data, squared-distance geometry and immutable steps', () => {
  const variable = deriveVariableLesson(VARIABLE_CANONICAL); expect(variable.masses[0]!.text).toBe('1/3'); expect(variable.scene.bars[0]!.value).toBeCloseTo(1/3, 15);
  for (const chapter of ['expectation', 'variance'] as const) for (const state of [MOMENTS_CANONICAL, { ...MOMENTS_CANONICAL, x1: 2, x2: 2, x3: 2 }, { ...MOMENTS_CANONICAL, scale: -2 }]) {
    const d = deriveMomentsLesson(chapter, state); expect(Object.isFrozen(d.view.trace[2]!.state)).toBe(true);
    expect(d.squares[0]!.squared).toBe(d.table[0]!.squared);
    for (const f of [...d.view.formulas, ...d.view.trace.map(t => t.state.formula)]) expect(() => katex.renderToString(f, { throwOnError: true, strict: 'error' })).not.toThrow();
  }
});
