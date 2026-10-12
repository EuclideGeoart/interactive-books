import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { deriveBinomial, deriveNormal, deriveUniform, NORMAL_CDF_ERROR, NORMAL_INTERVAL_ERROR } from '../../src/math/probability/distributions';
import { fractionText } from '../../src/math/probability/finite';
const f = JSON.parse(readFileSync('fixtures/probability_distributions.fixtures.json', 'utf8'));
let cdfWorst = 0, intervalWorst = 0;
for (const [i, c] of f.binomial.entries()) it(`independent convolution/combinatorial oracle: binomial ${i}`, () => {
  const d = deriveBinomial(c.n, c.p, c.k); expect({ pmf: d.pmf.map(fractionText), selected: fractionText(d.selected), mean: fractionText(d.mean), variance: fractionText(d.variance) }).toEqual(c.expected);
});
for (const [i, c] of f.uniform.entries()) it(`independent Fraction oracle: uniform ${i}`, () => {
  const d = deriveUniform(c.a, c.b, c.lower, c.upper); expect({ density: fractionText(d.density), probability: fractionText(d.probability), lowerCDF: fractionText(d.lowerCDF), upperCDF: fractionText(d.upperCDF) }).toEqual(c.expected);
});
for (const [i, c] of f.normal.entries()) it(`Python erfc oracle: Gaussian ${i}`, () => {
  const d = deriveNormal(c.mean, c.sigma, c.lower, c.upper), e = c.expected;
  cdfWorst = Math.max(cdfWorst, Math.abs(d.lowerCDF - e.lowerCDF), Math.abs(d.upperCDF - e.upperCDF)); intervalWorst = Math.max(intervalWorst, Math.abs(d.probability - e.probability));
  expect(Math.abs(d.lowerCDF - e.lowerCDF)).toBeLessThanOrEqual(NORMAL_CDF_ERROR); expect(Math.abs(d.upperCDF - e.upperCDF)).toBeLessThanOrEqual(NORMAL_CDF_ERROR); expect(Math.abs(d.probability - e.probability)).toBeLessThanOrEqual(NORMAL_INTERVAL_ERROR);
  expect(Math.abs(d.densityAtMean - e.densityAtMean)).toBeLessThanOrEqual(1e-12 * Math.max(1, e.densityAtMean));
});
it('records actual Gaussian error against the independent oracle', () => { console.log(JSON.stringify({ cdfWorst, intervalWorst, cdfBudget: NORMAL_CDF_ERROR, intervalBudget: NORMAL_INTERVAL_ERROR })); });
