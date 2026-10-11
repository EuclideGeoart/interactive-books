import { add, cmp, div, eq, mul, ONE, rational, sub, toNumber, ZERO, type Rational } from '../quantity/rational';
import { integer, seeded } from './seeded';

export const sum = (values: readonly Rational[]): Rational => values.reduce(add, ZERO);
export const fractionText = (r: Rational): string => `${r.num}/${r.den}`;

/** Raw integer weights are normalized openly; probabilities themselves are never silently repaired. */
export function weightedSpace(weights: readonly number[]): readonly Rational[] {
  if (weights.length < 1 || weights.length > 12) throw new RangeError('Use 1–12 outcomes.');
  weights.forEach(w => integer(w, 0, 1000000, 'Outcome weight'));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) throw new RangeError('At least one outcome must have positive weight.');
  return weights.map(w => rational(BigInt(w), BigInt(total)));
}

export function validateMass(mass: readonly Rational[]): void {
  if (mass.length < 1 || mass.length > 256 || mass.some(p => p.den <= 0n || cmp(p, ZERO) < 0) || !eq(sum(mass), ONE))
    throw new RangeError('Probabilities must be nonnegative, with total mass exactly one.');
}

export function finiteEvents(weights: readonly number[], a: readonly number[], b: readonly number[]) {
  const probabilities = weightedSpace(weights);
  a = [...new Set(a)]; b = [...new Set(b)];
  for (const event of [a, b]) {
    event.forEach(i => integer(i, 0, weights.length - 1, 'Outcome index'));
  }
  const intersection = a.filter(i => b.includes(i)), union = [...new Set([...a, ...b])];
  const mass = (event: readonly number[]) => sum(event.map(i => probabilities[i]!));
  const massA = mass(a), massB = mass(b), joint = mass(intersection);
  const conditional = massB.num === 0n ? null : div(joint, massB);
  const conditionalMass = massB.num === 0n ? null : probabilities.map((p, i) => b.includes(i) ? div(p, massB) : ZERO);
  return { probabilities, a, b, intersection, union, massA, massB, joint, unionMass: mass(union), complement: sub(ONE, massA),
    product: mul(massA, massB), conditional, conditionalMass,
    independent: eq(joint, mul(massA, massB)), disjoint: intersection.length === 0 };
}

export function finiteTrials(probabilities: readonly Rational[], seed: number, trials: number) {
  validateMass(probabilities); integer(trials, 1, 2000, 'Trial count');
  const random = seeded(seed), cumulative = probabilities.map((_, i) => toNumber(sum(probabilities.slice(0, i + 1))));
  const observations = Array.from({ length: trials }, () => {
    const draw = random();
    return cumulative.findIndex(limit => draw < limit);
  });
  return { observations, counts: probabilities.map((_, i) => observations.filter(x => x === i).length) };
}
