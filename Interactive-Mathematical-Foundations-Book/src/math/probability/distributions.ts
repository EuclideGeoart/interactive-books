import { add, cmp, div, int, mul, ONE, rational, sub, ZERO, type Rational } from '../quantity/rational';
import { choose } from './counting';
import { percent } from './percent';
import { sum, validateMass } from './finite';
import { integer } from './seeded';
import { decimal } from './moments';

// In this product of trial factors, an empty product equals one, including a factor raised to exponent zero.
const trialPower = (p: Rational, exponent: number) => rational(p.num ** BigInt(exponent), p.den ** BigInt(exponent));
export function deriveBinomial(n: number, p: number, k: number) {
  integer(n, 0, 30, 'Trial count'); integer(k, -1, 31, 'Selected count');
  const probability = percent(p), failure = sub(ONE, probability);
  const pmf = Array.from({ length: n + 1 }, (_, i) => mul(int(choose(n, i)), mul(trialPower(probability, i), trialPower(failure, n - i))));
  validateMass(pmf);
  return { n, p: probability, k, pmf, selected: k < 0 || k > n ? ZERO : pmf[k]!, total: sum(pmf),
    mean: mul(int(n), probability), variance: mul(int(n), mul(probability, failure)), cdf: pmf.map((_, i) => sum(pmf.slice(0, i + 1))) };
}

export function discreteInterval(values: readonly Rational[], mass: readonly Rational[], lower: number, upper: number) {
  validateMass(mass); const lo = decimal(lower, 'Lower bound'), hi = decimal(upper, 'Upper bound');
  if (values.length !== mass.length || cmp(lo, hi) > 0) throw new RangeError('Use matching values/masses and lower ≤ upper.');
  const lowerLeftCDF = sum(mass.filter((_, i) => cmp(values[i]!, lo) < 0));
  const lowerCDF = sum(mass.filter((_, i) => cmp(values[i]!, lo) <= 0));
  const upperCDF = sum(mass.filter((_, i) => cmp(values[i]!, hi) <= 0));
  return { probability: sub(upperCDF, lowerLeftCDF), lowerCDF, lowerLeftCDF, upperCDF,
    selected: values.map(x => cmp(x, lo) >= 0 && cmp(x, hi) <= 0) };
}

export function deriveUniform(a: number, b: number, lower: number, upper: number) {
  const start = decimal(a, 'Uniform start'), end = decimal(b, 'Uniform end'), lo = decimal(lower, 'Lower bound'), hi = decimal(upper, 'Upper bound');
  if (cmp(start, end) >= 0 || cmp(lo, hi) > 0) throw new RangeError('Uniform endpoints require a < b; interval bounds require lower ≤ upper.');
  const width = sub(end, start), density = div(ONE, width);
  const cdf = (x: Rational): Rational => cmp(x, start) <= 0 ? ZERO : cmp(x, end) >= 0 ? ONE : div(sub(x, start), width);
  const lowerCDF = cdf(lo), upperCDF = cdf(hi);
  return { a: start, b: end, density, lowerCDF, upperCDF, probability: sub(upperCDF, lowerCDF),
    mean: div(add(start, end), int(2)), variance: div(mul(width, width), int(12)), pointProbability: ZERO };
}

export const NORMAL_CDF_ERROR = 1e-9;
export const NORMAL_INTERVAL_ERROR = 2 * NORMAL_CDF_ERROR;
export const normalDensity = (z: number): number => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);

/** Positive tail quadrature avoids subtracting almost equal quantities in the small tail.
 * Simpson: |φ⁽⁴⁾| < 4, L ≤ 8, N=2048 → error < 4.2e−11; rounding fits within 1e−9.
 * Beyond |z|=8, the discarded tail is < φ(8)/8 < 6.4e−16. This is an approximation, not exact zero.
 */
export function normalCDF(z: number): number {
  if (!Number.isFinite(z)) throw new RangeError('Standardized value must be finite.');
  if (z === 0) return .5;
  const magnitude = Math.abs(z);
  if (magnitude >= 8) return z < 0 ? 0 : 1;
  const n = 2048, h = (8 - magnitude) / n;
  let total = normalDensity(magnitude) + normalDensity(8);
  for (let i = 1; i < n; i++) total += (i % 2 ? 4 : 2) * normalDensity(magnitude + i * h);
  const tail = total * h / 3;
  return z < 0 ? tail : 1 - tail;
}

export function deriveNormal(mean: number, sigma: number, lower: number, upper: number) {
  // Gaussian parameters are numerical companions; the explorer separately declares its input precision.
  if ([mean, sigma, lower, upper].some(value => !Number.isFinite(value) || Math.abs(value) > 1e6)) throw new RangeError('Gaussian parameters must be finite and within ±1,000,000.');
  if (sigma <= 0 || lower > upper) throw new RangeError('Standard deviation must be positive; interval bounds require lower ≤ upper.');
  if (!Number.isFinite(normalDensity(0) / sigma) || sigma * sigma === 0) throw new RangeError('This standard deviation exceeds the numerical density/variance range.');
  const lowerZ = (lower - mean) / sigma, upperZ = (upper - mean) / sigma;
  const lowerCDF = normalCDF(lowerZ), upperCDF = normalCDF(upperZ);
  // Symmetry lets intervals wholly in a positive tail use small tail values directly.
  const probability = lowerZ > 0 ? normalCDF(-lowerZ) - normalCDF(-upperZ) : upperCDF - lowerCDF;
  return { mean, sigma, lowerZ, upperZ, lowerCDF, upperCDF, probability, densityAtMean: normalDensity(0) / sigma,
    variance: sigma * sigma, cdfError: NORMAL_CDF_ERROR, intervalError: NORMAL_INTERVAL_ERROR, pointProbability: 0 };
}

export const uniformCDFNumber = (a: number, b: number, x: number): number => x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a);
export const binomialValues = (n: number): Rational[] => Array.from({ length: n + 1 }, (_, i) => int(i));
