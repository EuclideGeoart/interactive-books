import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { deriveCLT, deriveLLN } from '../../src/math/probability/sampling';
import { fractionText } from '../../src/math/probability/finite';
const f = JSON.parse(readFileSync('fixtures/probability_sampling.fixtures.json', 'utf8'));
let worstScaledError = 0;
const numeric = (actual: number, expected: number) => { const scaled = Math.abs(actual - expected) / Math.max(1, Math.abs(expected)); worstScaledError = Math.max(worstScaledError, scaled); expect(scaled).toBeLessThanOrEqual(2e-12); };
const array = (actual: readonly number[], expected: readonly number[]) => { expect(actual.length).toBeGreaterThanOrEqual(expected.length); expected.forEach((e, i) => numeric(actual[i]!, e)); };
for (const [i, c] of f.lln.entries()) it(`independent LCG/prefix-sum LLN experiment ${i}`, () => {
  const d = deriveLLN(c.kind, c.p, c.seed, c.trials), e = c.expected;
  expect(fractionText(d.population.mean)).toBe(e.populationMean); expect(fractionText(d.population.variance)).toBe(e.populationVariance);
  array(d.observations, e.observations); array(d.sums, e.sums); array(d.means, e.means); array(d.deviations.map(Math.abs), e.deviations);
  numeric(d.sums.at(-1)!, e.finalSum); numeric(d.mean, e.finalMean); numeric(Math.abs(d.deviation), e.finalDeviation); numeric(d.standardError, e.standardError); expect(d.outwardSteps).toBe(e.errorIncreases);
});
for (const [i, c] of f.clt.entries()) it(`independent bounded CLT block/standardization/histogram experiment ${i}`, () => {
  const d = deriveCLT(c.kind, c.p, c.seed, c.n, c.repetitions, c.dependent), e = c.expected;
  expect(fractionText(d.population.mean)).toBe(e.populationMean); expect(fractionText(d.population.variance)).toBe(e.populationVariance); expect(fractionText(d.iidMeanVariance)).toBe(e.iidMeanVariance); expect(fractionText(d.actualMeanVariance)).toBe(e.meanVariance);
  d.samples.forEach((sample, j) => array(sample, e.firstBlocks[j])); array(d.sums, e.sums); array(d.means, e.means);
  numeric(d.meanOfMeans, e.empiricalMean); numeric(d.empiricalMeanVariance, e.empiricalVariance);
  if (e.standardized) { array(d.standardized!, e.z); expect(d.histogram!.bins.map(bin => bin.count)).toEqual(e.counts); array(d.histogram!.bins.map(bin => Number(bin.density.num) / Number(bin.density.den)), e.densities); expect(d.histogram!.underflow).toBe(e.underflow); expect(d.histogram!.overflow).toBe(e.overflow); }
  else { expect(d.standardized).toBeNull(); expect(d.histogram).toBeNull(); }
});
it('records the actual scaled sampling error under its cross-language numerical budget', () => { console.log(JSON.stringify({ worstScaledError, numericalBudget: 2e-12, statisticalError: 'No guaranteed realized error or Gaussian fit' })); });
