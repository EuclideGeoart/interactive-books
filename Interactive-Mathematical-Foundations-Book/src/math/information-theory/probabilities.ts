/** Exact finite masses; logarithms alone are approximate. Zero uses the extended log convention. */
import { cmp, eq, fromDecimal, mul, ONE, rational, toNumber, ZERO, type Rational } from '../quantity/rational';
import { validateMass, weightedSpace } from '../probability/finite';
import { integer } from '../probability/seeded';
export type Unit = 'nats' | 'bits';
export const unitScale = (unit: Unit): number => {
  if (unit !== 'nats' && unit !== 'bits') throw new RangeError('Choose nats or bits.');
  return unit === 'bits' ? Math.LN2 : 1;
};
export function probability(p: Rational): void {
  if (p.den <= 0n || cmp(p, ZERO) < 0 || cmp(p, ONE) > 0) throw new RangeError('Probability must be an exact rational in [0,1].');
}
export function decimalProbability(value: number): Rational {
  const p = fromDecimal(value, 2);
  if (!p) throw new RangeError('Probability must be finite with at most two decimal places.');
  probability(p); return p;
}
export function logProbability(p: Rational): number {
  probability(p);
  if (p.num === 0n) return -Infinity;
  if (p.num === p.den) return 0;
  // Positive exact rationals may underflow before log: use leading digits and their decimal exponent.
  const x = toNumber(p);
  if (x > 0) return Math.log(x);
  const logInteger = (n: bigint) => { const s = n.toString(); return Math.log(Number(s.slice(0, 16))) + (s.length - Math.min(16, s.length)) * Math.LN10; };
  return logInteger(p.num) - logInteger(p.den);
}
export function selfInformation(p: Rational, unit: Unit = 'nats'): number {
  return -logProbability(p) / unitScale(unit) + 0;
}
export function distribution(weights: readonly number[]): readonly Rational[] {
  integer(weights.length, 1, 6, 'Support size'); return weightedSpace(weights);
}
export function entropy(masses: readonly Rational[], unit: Unit = 'nats') {
  integer(masses.length, 1, 6, 'Support size'); validateMass(masses); unitScale(unit);
  const information = masses.map(p => selfInformation(p, unit));
  const terms = masses.map((p, i) => p.num === 0n ? 0 : toNumber(p) * information[i]!);
  const value = terms.reduce((a, b) => a + b, 0);
  return { masses, information, terms, value, maximum: Math.log(masses.length) / unitScale(unit),
    pointMass: masses.some(p => eq(p, ONE)), uniform: masses.every(p => p.num * BigInt(masses.length) === p.den) };
}
export interface ProductInput { readonly probabilities: readonly number[]; readonly repeat: number }
export function probabilityProduct(input: ProductInput) {
  integer(input.probabilities.length, 1, 6, 'Number of factors'); integer(input.repeat, 1, 1200, 'Repeat count');
  const masses = input.probabilities.map(decimalProbability), logs = masses.map(logProbability);
  const cycle = masses.reduce(mul, ONE), exact = rational(cycle.num ** BigInt(input.repeat), cycle.den ** BigInt(input.repeat));
  const cycleLog = logs.reduce((a,b) => a+b,0), logLikelihood = input.repeat * cycleLog;
  let direct = 1;
  const history = [{ x: 0, direct: 1, log: 0 }];
  for (let k = 1; k <= input.repeat; k++) {
    for (const p of input.probabilities) direct *= p;
    if (k === input.repeat || k % Math.max(1, Math.ceil(input.repeat / 40)) === 0) history.push({x:k,direct,log:k*cycleLog});
  }
  return { input, masses, logs, cycle, exact, direct, logLikelihood, recovered: Math.exp(logLikelihood), history,
    status: exact.num === 0n ? 'impossible' as const : direct === 0 ? 'underflow' as const : 'positive' as const };
}
export function surpriseModel(value: number, unit: Unit) {
  const mass = decimalProbability(value), information = selfInformation(mass, unit);
  const curve = Array.from({length:100},(_,i) => {const p = rational(BigInt(i+1),100n);return {x:toNumber(p),y:selfInformation(p,unit)};});
  return { mass, information, unit, curve };
}
