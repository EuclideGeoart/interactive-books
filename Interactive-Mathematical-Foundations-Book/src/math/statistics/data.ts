/** Supported observations: 1–24 finite decimal values in [-20,20], at most two places. */
import { abs, add, cmp, div, eq, int, mul, sub, toNumber, ZERO, type Rational } from '../quantity/rational';
import { decimal, finiteMoments } from '../probability/moments';
import { seeded, integer } from '../probability/seeded';
export const sum = (xs: readonly Rational[]) => xs.reduce(add, ZERO);
export const average = (xs: readonly Rational[]) => div(sum(xs), int(xs.length));
export function observations(xs: readonly number[]) {
  integer(xs.length, 1, 24, 'Observation count');
  return xs.map(x => { if (Math.abs(x) > 20) throw new RangeError('Observations must lie in [-20,20].'); return decimal(x, 'Observation'); });
}
export function middle(xs: readonly Rational[]): Rational {
  const ordered = [...xs].sort(cmp), n = ordered.length;
  if (!n) throw new RangeError('Median needs observations.');
  return n % 2 ? ordered[(n-1)/2]! : div(add(ordered[n/2-1]!, ordered[n/2]!), int(2));
}
export function summarize(xs: readonly number[]) {
  const values = observations(xs), ordered = [...values].sort(cmp), n = values.length;
  const moments = finiteMoments(values, values.map(() => div(int(1), int(n))));
  const median = middle(values), mad = middle(values.map(x => abs(sub(x, median))));
  const frequencies: { value: Rational; count: number }[] = [];
  for (const value of ordered) { const last = frequencies.at(-1); if (last && eq(last.value, value)) last.count++; else frequencies.push({ value, count: 1 }); }
  const maximum = Math.max(...frequencies.map(x => x.count));
  const modes = maximum === 1 && frequencies.length > 1 ? [] : frequencies.filter(x => x.count === maximum).map(x => x.value);
  const squaredSum = sum(moments.squaredDistances), sampleVariance = n === 1 ? null : div(squaredSum, int(n-1));
  return { ...moments, n, ordered, median, mad, frequencies, modes, squaredSum, sampleVariance,
    modeKind: modes.length === 0 ? 'no-repeat' as const : modes.length === 1 ? 'single' as const : 'multiple' as const };
}
export const POPULATION = [0,1,2,3,6,7,8,9] as const;
export interface SamplingInput { seed: number; n: number; repetitions: number; biased: boolean; offset: number }
export function sampling(input: SamplingInput) {
  const { seed, n, repetitions, biased, offset } = input;
  integer(n, 1, 32, 'Sample size'); integer(repetitions, 1, 64, 'Repetitions');
  if (typeof biased !== 'boolean' || Math.abs(offset) > 5) throw new RangeError('Selection must be boolean; estimator offset lies in [-5,5].');
  const shift = decimal(offset), population = summarize(POPULATION), pool = biased ? POPULATION.slice(4) : [...POPULATION], source = summarize(pool), rng = seeded(seed);
  const samples = Array.from({ length: repetitions }, () => Array.from({ length: n }, () => pool[Math.floor(rng()*pool.length)]!));
  const means = samples.map(xs => average(xs.map(int))), estimates = means.map(x => add(x, shift));
  const empiricalMean = average(estimates), bias = sub(empiricalMean, population.mean);
  const empiricalVariance = div(sum(estimates.map(x => mul(sub(x, empiricalMean), sub(x, empiricalMean)))), int(repetitions));
  const mse = div(sum(estimates.map(x => mul(sub(x, population.mean), sub(x, population.mean)))), int(repetitions));
  if (!eq(mse, add(empiricalVariance, mul(bias,bias)))) throw new Error('Finite-run MSE identity failed.');
  const theoreticalMean = add(source.mean, shift), theoreticalBias = sub(theoreticalMean, population.mean), theoreticalVariance = div(source.variance, int(n));
  return { input, population, pool, samples, means, estimates, empiricalMean, bias, empiricalVariance, mse, theoreticalMean, theoreticalBias, theoreticalVariance,
    theoreticalMse: add(theoreticalVariance, mul(theoreticalBias,theoreticalBias)), standardError: Math.sqrt(toNumber(theoreticalVariance)) };
}
