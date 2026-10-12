import { expect, it } from 'vitest';
import katex from 'katex';
import { deriveBayes } from '../../src/math/probability/bayes';
import { fractionText, sum } from '../../src/math/probability/finite';
import { ONE } from '../../src/math/quantity/rational';
import { BAYES_CANONICAL, deriveBayesLesson } from '../../src/lessons/probability/bayes-lesson';

it('a rare quality flag gives the hand-worked posterior 2/13, not sensitivity 9/10', () => {
  const d = deriveBayes(1, 90, 5, 'positive');
  expect(d.expectedCounts.map(fractionText)).toEqual(['90/1', '10/1', '495/1', '9405/1']);
  expect(fractionText(d.evidence)).toBe('117/2000'); expect(fractionText(d.posterior!)).toBe('2/13');
  expect(sum(d.cells)).toEqual(ONE); expect(sum(d.posteriorMass!)).toEqual(ONE);
  expect(fractionText(deriveBayes(50, 90, 5, 'positive').posterior!)).toBe('18/19');
});
it('negative evidence, perfect flags and impossible evidence retain exact policies', () => {
  expect(fractionText(deriveBayes(1, 90, 5, 'negative').posterior!)).toBe('2/1883');
  expect(fractionText(deriveBayes(1, 100, 0, 'positive').posterior!)).toBe('1/1');
  for (const args of [[1, 0, 0, 'positive'], [0, 100, 0, 'positive'], [100, 0, 100, 'positive'], [1, 100, 100, 'negative']] as const) {
    const d = deriveBayes(args[0], args[1], args[2], args[3]); expect(d.posterior).toBeNull(); expect(d.posteriorMass).toBeNull(); expect(d.impossible).toBe(true);
  }
  for (const p of [-1, 101, .001, NaN, Infinity]) expect(() => deriveBayes(p, 90, 5, 'positive')).toThrow();
});
it('Bayes drawing widths, exact inspector, description and immutable update agree', () => {
  const d = deriveBayesLesson(BAYES_CANONICAL);
  expect(d.posteriorMass![0]!.width).toBeCloseTo(100 * 2 / 13, 12);
  expect(d.view.description).toContain('90'); expect(d.view.verdict).toContain('2/13');
  expect(Object.isFrozen(d.view.trace[2]!.state.masses)).toBe(true);
  for (const f of [...d.view.formulas, ...d.view.trace.map(f => f.state.formula)]) expect(() => katex.renderToString(f, { throwOnError: true, strict: 'error' })).not.toThrow();
});
