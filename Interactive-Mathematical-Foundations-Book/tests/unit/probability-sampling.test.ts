import { expect, it } from 'vitest';
import { deriveCLT, deriveLLN, populationModel, samplingHistogram } from '../../src/math/probability/sampling';
import { seeded } from '../../src/math/probability/seeded';
import { fractionText, sum } from '../../src/math/probability/finite';
import { SAMPLING_CANONICAL, deriveSamplingLesson, samplingPreset } from '../../src/lessons/probability/sampling-lesson';

it('the explicit uint32 generator matches literal first outputs, including wraparound', () => {
  const next = seeded(0); expect([next(), next(), next()]).toEqual([1013904223 / 2 ** 32, 1196435762 / 2 ** 32, 3519870697 / 2 ** 32]);
  expect(() => seeded(-1)).toThrow(); expect(() => seeded(2 ** 32)).toThrow();
});
it('LLN replays exactly, preserves prefixes and allows error to increase', () => {
  const a = deriveLLN('bernoulli', 25, 42, 200), b = deriveLLN('bernoulli', 25, 42, 400);
  expect(a.observations).toEqual(deriveLLN('bernoulli', 25, 42, 200).observations); expect(b.observations.slice(0, 200)).toEqual(a.observations); expect(a.outwardSteps).toBeGreaterThan(0); expect(a.mean).not.toBe(.25);
  const one = deriveLLN('uniform', 25, 42, 1); expect(one.sampleVariance).toBeNull(); expect(one.mean).toBe(one.observations[0]);
});
it('histogram bin areas plus omitted tails equal one and endpoint policy is explicit', () => {
  const h = samplingHistogram([-5, -4, -1, 0, 3.99, 4]); expect(h.underflow).toBe(1); expect(h.overflow).toBe(1); expect(h.bins[0]!.count).toBe(1);
  expect(fractionText(sum([...h.bins.map(b => b.mass), h.underflowMass, h.overflowMass]))).toBe('1/1'); expect(fractionText(h.insideMass)).toBe('2/3');
});
it('CLT block means are actual samples; repeats, seed and sample size have distinct effects', () => {
  const d = deriveCLT('exponential', 25, 42, 8, 240), longer = deriveCLT('exponential', 25, 42, 8, 400);
  expect(d.means).toEqual(deriveCLT('exponential', 25, 42, 8, 240).means); expect(longer.means.slice(0, 240)).toEqual(d.means);
  d.samples.forEach((sample, i) => { expect(d.sums[i]).toBe(sample.reduce((a, b) => a + b, 0)); expect(d.means[i]).toBe(d.sums[i]! / 8); });
  expect(d.means).not.toEqual(deriveCLT('exponential', 25, 43, 8, 240).means); expect(d.means).not.toEqual(deriveCLT('exponential', 25, 42, 1, 240).means);
  expect(d.meanOfMeans).not.toBe(1); expect(d.empiricalMeanVariance).not.toBe(.125);
});
it('zero variance is undefined standardization, and within-block dependence keeps variance unreduced', () => {
  const zero = deriveCLT('bernoulli', 0, 42, 30, 100); expect(zero.standardized).toBeNull(); expect(zero.histogram).toBeNull(); expect(zero.means.every(m => m === 0)).toBe(true);
  const d = deriveCLT('uniform', 25, 42, 30, 100, true); expect(fractionText(d.actualMeanVariance)).toBe('1/12'); expect(fractionText(d.iidMeanVariance)).toBe('1/360'); expect(d.samples[0]!.every(x => x === d.samples[0]![0])).toBe(true);
});
it('generation and retained sample allocations obey explicit bounds', () => {
  const d = deriveCLT('exponential', 25, 0xffffffff, 100, 1000); expect(d.draws).toBe(100000); expect(d.samples.flat()).toHaveLength(300); expect(d.means).toHaveLength(1000); expect(d.histogram!.bins).toHaveLength(24);
  for (const args of [[0, 100], [101, 100], [10, 9], [10, 1001]]) expect(() => deriveCLT('uniform', 25, 42, args[0]!, args[1]!)).toThrow();
  expect(() => deriveLLN('uniform', 25, 42, 4001)).toThrow(); expect(() => populationModel('bernoulli', 100.01)).toThrow();
});
it('descriptions and traces expose observed sampling, degenerate and violated-assumption states', () => {
  const lln = deriveSamplingLesson('lln', SAMPLING_CANONICAL.lln); expect(lln.view.description).toContain('cannot prove'); expect(Object.isFrozen(lln.view.trace[0]!.state.observations)).toBe(true);
  const zero = deriveSamplingLesson('clt', samplingPreset('clt', 'degenerate')); expect(zero.path).toBeNull(); expect(zero.view.rows.at(-1)!.description.status).toBe('undefined');
  const dependent = deriveSamplingLesson('clt', samplingPreset('clt', 'dependent')); expect(dependent.view.verdict).toContain('iid CLT does not apply');
});
