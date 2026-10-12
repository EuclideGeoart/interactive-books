import { expect, it } from 'vitest';
import katex from 'katex';
import { binomialValues, deriveBinomial, deriveNormal, deriveUniform, discreteInterval, normalCDF, NORMAL_CDF_ERROR } from '../../src/math/probability/distributions';
import { fractionText, sum } from '../../src/math/probability/finite';
import { ONE } from '../../src/math/quantity/rational';
import { deriveDistributionLesson, DISTRIBUTION_CANONICAL } from '../../src/lessons/probability/distributions-lesson';

it('binomial mass agrees with hand-worked values and exact boundary conventions', () => {
  expect(deriveBinomial(2, 50, 1).pmf.map(fractionText)).toEqual(['1/4', '1/2', '1/4']);
  expect(fractionText(deriveBinomial(4, 50, 2).selected)).toBe('3/8');
  for (const p of [0, 100]) for (const n of [0, 1, 30]) { const d = deriveBinomial(n, p, p ? n : 0); expect(d.selected).toEqual(ONE); expect(sum(d.pmf)).toEqual(ONE); }
  expect(fractionText(deriveBinomial(3, 40, 4).selected)).toBe('0/1');
  for (const n of [-1, 31, .5]) expect(() => deriveBinomial(n, 50, 0)).toThrow();
  for (const p of [-1, 101, .001, NaN]) expect(() => deriveBinomial(2, p, 1)).toThrow();
});
it('closed discrete intervals subtract the lower left limit, retaining point mass', () => {
  const d = deriveBinomial(2, 50, 1), interval = discreteInterval(binomialValues(2), d.pmf, 0, 1);
  expect([interval.probability, interval.lowerCDF, interval.lowerLeftCDF].map(fractionText)).toEqual(['3/4', '1/4', '0/1']);
  expect(fractionText(discreteInterval(binomialValues(2), d.pmf, 1, 1).probability)).toBe('1/2');
});
it('uniform density and selected interval area use length, not a PMF sum', () => {
  const d = deriveUniform(-2, 2, -1, 1); expect([d.density, d.probability].map(fractionText)).toEqual(['1/4', '1/2']);
  expect(fractionText(deriveUniform(0, .2, 0, .2).density)).toBe('5/1');
  expect(fractionText(deriveUniform(-2, 2, 1, 1).probability)).toBe('0/1');
  expect(deriveUniform(-2, 2, -20, 20).probability).toEqual(ONE);
  for (const args of [[0, 0, -1, 1], [2, 1, -1, 1], [-2, 2, 2, 1]]) expect(() => deriveUniform(args[0]!, args[1]!, args[2]!, args[3]!)).toThrow();
});
it('Gaussian interval quadrature has symmetry, standardization and the declared error budget', () => {
  expect(deriveNormal(0, 1, -1, 1).probability).toBeCloseTo(.6826894921370859, 9);
  expect(deriveNormal(10, 2, 8, 12).probability).toBeCloseTo(.6826894921370859, 9);
  expect(normalCDF(0)).toBe(.5); expect(normalCDF(-1) + normalCDF(1)).toBe(1);
  expect(deriveNormal(0, 1, 1, 1).probability).toBe(0);
  for (const sigma of [0, -1, Infinity, NaN]) expect(() => deriveNormal(0, sigma, -1, 1)).toThrow();
  expect(() => deriveNormal(0, 1, 2, 1)).toThrow();
  expect(deriveNormal(0, 1, 6, 7).probability).toBeGreaterThan(0);
  let previous = 0;
  for (let i = -800; i <= 800; i++) { const value = normalCDF(i / 100); expect(value).toBeGreaterThanOrEqual(previous); expect(value).toBeLessThanOrEqual(1); previous = value; }
  expect(NORMAL_CDF_ERROR).toBe(1e-9);
});
it('drawing labels remain separated when a narrow density shares a wide comparison viewport', () => {
  const d = deriveDistributionLesson('continuous', { ...DISTRIBUTION_CANONICAL.continuous, sigma: .1, lower: -.1, upper: .1 });
  expect(d.normal.probability).toBeCloseTo(.6826894921370859, 9);
  for (let i = 1; i < d.densityScene.ticks.length; i++) expect(d.densityScene.ticks[i]!.x - d.densityScene.ticks[i - 1]!.x).toBeGreaterThanOrEqual(40);
});
for (const chapter of ['representations', 'binomial', 'continuous'] as const) it(`${chapter}: curves, masses, inspector and trace retain distribution semantics`, () => {
  const canonical = DISTRIBUTION_CANONICAL[chapter], states = chapter === 'binomial' ? [canonical, { ...canonical, p: 0 }, { ...canonical, p: 100 }, { ...canonical, n: 0, k: 0 }, { ...canonical, k: -1 }, { ...canonical, k: 31 }] : [canonical, { ...canonical, mode: 'uniform' as const, lower: -1, upper: 1 }, { ...canonical, mode: 'normal' as const, sigma: .1 }];
  for (const state of states) {
    const d = deriveDistributionLesson(chapter, state); expect(d.cdfScene.curve).not.toBe(''); expect(Object.isFrozen(d.view.trace[0]!.state)).toBe(true);
    for (const f of [...d.view.formulas, ...d.view.trace.map(t => t.state.formula)]) expect(() => katex.renderToString(f, { strict: 'error', throwOnError: true })).not.toThrow();
    if (state.mode === 'discrete') expect(d.densityScene.bars.map(b => b.value)).toEqual(d.binomial.pmf.map(p => Number(p.num) / Number(p.den)));
    if (state.mode === 'uniform') {
      expect(d.densityScene.xLabel).toContain('uniform mass is exactly one over [a, b]');
      expect(d.cdfScene.xLabel).toContain('0 below a, 1 at and above b');
    }
  }
});
