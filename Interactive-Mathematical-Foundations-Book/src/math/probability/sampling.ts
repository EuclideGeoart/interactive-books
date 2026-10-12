import { div, int, mul, ONE, rational, sub, toNumber } from '../quantity/rational';
import { percent } from './percent';
import { integer, seeded } from './seeded';
import { normalCDF } from './distributions';

export type Population = 'bernoulli' | 'uniform' | 'exponential';
export function populationModel(kind: Population, pPercent: number) {
  if (!['bernoulli', 'uniform', 'exponential'].includes(kind)) throw new RangeError('Choose a supported population.');
  const p = percent(pPercent), probability = toNumber(p);
  const mean = kind === 'bernoulli' ? p : kind === 'uniform' ? rational(1n, 2n) : ONE;
  const variance = kind === 'bernoulli' ? mul(p, sub(ONE, p)) : kind === 'uniform' ? rational(1n, 12n) : ONE;
  const draw = (u: number): number => kind === 'bernoulli' ? Number(u < probability) : kind === 'uniform' ? u : -Math.log1p(-u);
  return { kind, p, mean, variance, sigma: Math.sqrt(toNumber(variance)), draw };
}

export function deriveLLN(kind: Population, pPercent: number, seed: number, trials: number) {
  integer(trials, 1, 4000, 'Observation count');
  const population = populationModel(kind, pPercent), random = seeded(seed), target = toNumber(population.mean);
  const observations: number[] = [], sums: number[] = [], means: number[] = [], deviations: number[] = [];
  let total = 0, outwardSteps = 0;
  for (let i = 0; i < trials; i++) {
    const observation = population.draw(random()); total += observation;
    observations.push(observation); sums.push(total); means.push(total / (i + 1)); deviations.push(total / (i + 1) - target);
    if (i > 0 && Math.abs(deviations[i]!) > Math.abs(deviations[i - 1]!)) outwardSteps++;
  }
  const mean = means[trials - 1]!, deviation = deviations[trials - 1]!;
  const residual = observations.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  return { population, observations, sums, means, deviations, outwardSteps, mean, deviation, standardError: population.sigma / Math.sqrt(trials), empiricalVariance: residual / trials, sampleVariance: trials > 1 ? residual / (trials - 1) : null };
}

export const HISTOGRAM_BINS = 24, HISTOGRAM_MIN = -4, HISTOGRAM_MAX = 4, HISTOGRAM_WIDTH = 8 / HISTOGRAM_BINS;
/** Fixed bins keep the original repetition denominator, including values outside the drawing window. */
export function samplingHistogram(values: readonly number[]) {
  integer(values.length, 1, 1000, 'Histogram observation count');
  const counts = Array<number>(HISTOGRAM_BINS).fill(0); let underflow = 0, overflow = 0;
  for (const value of values) {
    if (!Number.isFinite(value)) throw new RangeError('Histogram observations must be finite.');
    if (value < HISTOGRAM_MIN) underflow++; else if (value >= HISTOGRAM_MAX) overflow++;
    else counts[Math.min(HISTOGRAM_BINS - 1, Math.floor((value - HISTOGRAM_MIN) / HISTOGRAM_WIDTH))]!++;
  }
  const bins = counts.map((count, i) => {
    const lower = HISTOGRAM_MIN + i * HISTOGRAM_WIDTH, upper = HISTOGRAM_MIN + (i + 1) * HISTOGRAM_WIDTH;
    return { lower, upper, count, mass: rational(BigInt(count), BigInt(values.length)), density: rational(BigInt(3 * count), BigInt(values.length)), normalMass: normalCDF(upper) - normalCDF(lower) };
  });
  return { bins, underflow, overflow, included: values.length - underflow - overflow,
    underflowMass: rational(BigInt(underflow), BigInt(values.length)), overflowMass: rational(BigInt(overflow), BigInt(values.length)), insideMass: rational(BigInt(values.length - underflow - overflow), BigInt(values.length)) };
}

export function deriveCLT(kind: Population, pPercent: number, seed: number, n: number, repetitions: number, dependent = false) {
  integer(n, 1, 100, 'Sample size'); integer(repetitions, 10, 1000, 'Repetition count');
  if (typeof dependent !== 'boolean') throw new RangeError('Dependence mode must be a boolean.');
  const population = populationModel(kind, pPercent), random = seeded(seed), target = toNumber(population.mean);
  const samples: number[][] = [], sums: number[] = [], means: number[] = [], standardized: number[] = [];
  for (let r = 0; r < repetitions; r++) {
    const sample: number[] = []; let total = 0;
    const common = dependent ? population.draw(random()) : 0;
    for (let i = 0; i < n; i++) {
      const value = dependent ? common : population.draw(random()); total += value; if (r < 3) sample.push(value);
    }
    if (r < 3) samples.push(sample);
    sums.push(total); const mean = total / n; means.push(mean);
    if (population.sigma > 0) standardized.push(Math.sqrt(n) * (mean - target) / population.sigma);
  }
  const meanOfMeans = means.reduce((a, b) => a + b, 0) / repetitions;
  const empiricalMeanVariance = means.reduce((a, value) => a + (value - meanOfMeans) ** 2, 0) / repetitions;
  const iidMeanVariance = div(population.variance, int(n)), actualMeanVariance = dependent ? population.variance : iidMeanVariance;
  return { population, n, repetitions, dependent, samples, sums, means, standardized: population.sigma === 0 ? null : standardized,
    histogram: population.sigma === 0 ? null : samplingHistogram(standardized), meanOfMeans, empiricalMeanVariance, iidMeanVariance, actualMeanVariance,
    draws: dependent ? repetitions : n * repetitions };
}
