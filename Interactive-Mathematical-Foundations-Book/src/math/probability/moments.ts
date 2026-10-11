import { add, cmp, eq, fromDecimal, int, mul, sub, toNumber, ZERO, type Rational } from '../quantity/rational';
import { sum, validateMass, weightedSpace } from './finite';

export function decimal(value: number, name = 'Value'): Rational {
  const exact = fromDecimal(value, 2);
  if (!exact || Math.abs(value) > 1e6) throw new RangeError(`${name} must be finite, within ±1,000,000, with at most two decimal places.`);
  return exact;
}

export function finiteMoments(values: readonly Rational[], probabilities: readonly Rational[]) {
  validateMass(probabilities);
  if (values.length !== probabilities.length || values.some(x => x.den <= 0n)) throw new RangeError('Every outcome needs a valid numerical value.');
  const terms = values.map((x, i) => mul(x, probabilities[i]!)), mean = sum(terms);
  const secondMoment = sum(values.map((x, i) => mul(mul(x, x), probabilities[i]!)));
  const deviations = values.map(x => sub(x, mean));
  const squaredDistances = deviations.map(x => mul(x, x));
  const varianceTerms = squaredDistances.map((sq, i) => mul(sq, probabilities[i]!));
  const variance = sum(varianceTerms);
  if (cmp(variance, ZERO) < 0 || !eq(variance, sub(secondMoment, mul(mean, mean)))) throw new Error('Exact variance identity failed.');
  return { values, probabilities, terms, mean, secondMoment, deviations, squaredDistances, varianceTerms, variance, standardDeviation: Math.sqrt(toNumber(variance)) };
}

/** Outcomes remain distinct even when their numerical values merge. */
export function mappingDistribution(weights: readonly number[], inputs: readonly number[]) {
  const probabilities = weightedSpace(weights);
  if (inputs.length !== probabilities.length) throw new RangeError('Every outcome needs one value.');
  const values = inputs.map(value => decimal(value));
  const distribution: { value: Rational; mass: Rational }[] = [];
  values.forEach((value, i) => {
    if (probabilities[i]!.num === 0n) return;
    const existing = distribution.find(item => eq(item.value, value));
    if (existing) existing.mass = add(existing.mass, probabilities[i]!);
    else distribution.push({ value, mass: probabilities[i]! });
  });
  distribution.sort((a, b) => cmp(a.value, b.value));
  return { values, probabilities, distribution, moments: finiteMoments(values, probabilities) };
}

export function deriveMoments(weights: readonly number[], inputs: readonly number[], scale: number, shift: number) {
  const model = mappingDistribution(weights, inputs), a = decimal(scale, 'Scale'), b = decimal(shift, 'Shift');
  const transformed = finiteMoments(model.values.map(x => add(mul(a, x), b)), model.probabilities);
  const y = model.values.map(x => add(mul(int(2), x), int(1)));
  const dependentY = finiteMoments(y, model.probabilities);
  const sumXY = finiteMoments(model.values.map((x, i) => add(x, y[i]!)), model.probabilities);
  return { ...model, ...model.moments, transformed, scale: a, shift: b, dependentY, sumXY };
}
