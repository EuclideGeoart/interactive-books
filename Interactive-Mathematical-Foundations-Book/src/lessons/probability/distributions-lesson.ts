import { binomialValues, deriveBinomial, deriveNormal, deriveUniform, discreteInterval, normalCDF, normalDensity, uniformCDFNumber } from '../../math/probability/distributions';
import { toNumber, ZERO } from '../../math/quantity/rational';
import { approx, exactRow, exactText, numericRow, parameter, steps, tex, type ProbabilityView } from './view';
import { plotScene, type PlotPoint } from './plot';

export type DistributionChapter = 'representations' | 'binomial' | 'continuous';
export interface DistributionState { mode: 'discrete' | 'uniform' | 'normal'; n: number; p: number; k: number; a: number; b: number; mean: number; sigma: number; lower: number; upper: number }
const base: DistributionState = { mode: 'discrete', n: 2, p: 50, k: 1, a: -2, b: 2, mean: 0, sigma: 1, lower: 0, upper: 1 };
export const DISTRIBUTION_CANONICAL: Record<DistributionChapter, DistributionState> = { representations: base, binomial: { ...base, n: 8, p: 35, k: 3, upper: 8 }, continuous: { ...base, mode: 'normal', lower: -1, upper: 1 } };
export const distributionSpecs = {
  n: parameter('n', 'Bernoulli trial count', 'n', 0, 30, 8), p: parameter('p', 'Success probability (%)', '100p', 0, 100, 35, 1, 2), k: parameter('k', 'Selected success count', 'k', -1, 31, 3),
  a: parameter('a', 'Uniform start', 'a', -10, 10, -2, .5, 2), b: parameter('b', 'Uniform end', 'b', -10, 10, 2, .5, 2),
  mean: parameter('mean', 'Gaussian mean', '\\mu', -5, 5, 0, .5, 2), sigma: parameter('sigma', 'Gaussian standard deviation', '\\sigma', .1, 5, 1, .1, 2),
  lower: parameter('lower', 'Interval lower bound', '\\ell', -20, 35, -1, .5, 2), upper: parameter('upper', 'Interval upper bound', 'u', -20, 35, 1, .5, 2),
};
const titles: Record<DistributionChapter, string> = { representations: 'Mass, density and accumulated probability', binomial: 'Count successes in independent trials', continuous: 'Compare flat and Gaussian densities' };

export function deriveDistributionLesson(chapter: DistributionChapter, state: DistributionState) {
  if (!(chapter in titles) || !['discrete', 'uniform', 'normal'].includes(state.mode) || (chapter === 'binomial' && state.mode !== 'discrete') || (chapter === 'continuous' && state.mode === 'discrete')) throw new RangeError('Choose a valid distribution for this chapter.');
  const binomial = deriveBinomial(state.n, state.p, state.k), values = binomialValues(state.n), interval = discreteInterval(values, binomial.pmf, state.lower, state.upper);
  const uniform = deriveUniform(state.a, state.b, state.lower, state.upper), normal = deriveNormal(state.mean, state.sigma, state.lower, state.upper);
  const discrete = state.mode === 'discrete', uniformMode = state.mode === 'uniform';
  const probabilityText = discrete ? exactText(interval.probability) : uniformMode ? exactText(uniform.probability) : `approximately ${approx(normal.probability)}`;
  const verdict = discrete ? `PMF bars carry exact point masses. The closed interval has mass ${probabilityText}. A CDF includes the jump at its argument: subtract F(ℓ−), not F(ℓ), for a closed interval.`
    : `A PDF height is density, with inverse-value units. Interval probability is area: ${probabilityText}. A single continuous point has probability zero.`;
  const rows = chapter === 'binomial' ? [exactRow('selected', 'P(X=k)', 'Selected binomial mass', binomial.selected), exactRow('total', '\\sum_k P(X=k)', 'Total finite mass', binomial.total), exactRow('mean', 'np', 'Expectation', binomial.mean), exactRow('variance', 'np(1-p)', 'Variance', binomial.variance)]
    : [discrete ? exactRow('interval', 'P(\\ell\\le X\\le u)', 'Selected interval mass', interval.probability) : uniformMode ? exactRow('interval', 'P(\\ell\\le X\\le u)', 'Selected interval area', uniform.probability) : numericRow('interval', 'P(\\ell\\le X\\le u)', 'Selected interval area', normal.probability),
      discrete ? exactRow('lower-cdf', 'F(\\ell)', 'CDF at lower bound', interval.lowerCDF) : uniformMode ? exactRow('lower-cdf', 'F(\\ell)', 'CDF at lower bound', uniform.lowerCDF) : numericRow('lower-cdf', 'F(\\ell)', 'CDF at lower bound', normal.lowerCDF),
      discrete ? exactRow('upper-cdf', 'F(u)', 'CDF at upper bound', interval.upperCDF) : uniformMode ? exactRow('upper-cdf', 'F(u)', 'CDF at upper bound', uniform.upperCDF) : numericRow('upper-cdf', 'F(u)', 'CDF at upper bound', normal.upperCDF),
      ...(discrete ? [exactRow('lower-left', 'F(\\ell^-)', 'CDF just before lower bound', interval.lowerLeftCDF)] : [uniformMode ? exactRow('height', 'f(x)', 'Density on uniform support', uniform.density) : numericRow('height', 'f(\\mu)', 'Density at Gaussian mean', normal.densityAtMean), exactRow('point', 'P(X=x)', 'Any exact point probability', ZERO)]),
      ...(state.mode === 'normal' ? [numericRow('lower-z', 'z_\\ell', 'Standardized lower bound', normal.lowerZ), numericRow('upper-z', 'z_u', 'Standardized upper bound', normal.upperZ)] : [])];
  const intervalFormula = discrete ? `P(\\ell\\le X\\le u)=F(u)-F(\\ell^-)=${tex(interval.probability)}` : uniformMode ? `P(\\ell\\le X\\le u)=F(u)-F(\\ell)=${tex(uniform.probability)}` : `P(\\ell\\le X\\le u)=\\Phi(z_u)-\\Phi(z_\\ell)\\approx ${approx(normal.probability)}`;
  const densityFormula = discrete ? `P(X=k)=\\binom nk p^k(1-p)^{n-k}\\quad p=${tex(binomial.p)}` : uniformMode ? `f(x)=\\frac1{b-a}=${tex(uniform.density)}\\quad(a\\le x\\le b)` : 'f(x)=\\frac1{\\sigma\\sqrt{2\\pi}}\\exp\\!\\left(-\\frac{(x-\\mu)^2}{2\\sigma^2}\\right)';
  const description = `${state.mode === 'discrete' ? `Binomial n=${state.n}, p=${state.p} percent. Selected k=${state.k}, exact mass ${exactText(binomial.selected)}.` : uniformMode ? `Uniform support [${state.a}, ${state.b}].` : `Gaussian mean ${state.mean}, standard deviation ${state.sigma}.`} Selected closed interval [${state.lower}, ${state.upper}]. ${verdict}${state.mode === 'normal' ? ' Numerical CDF absolute error budget 1e-9; interval budget 2e-9. The finite drawing does not prove normalization.' : ''}`;
  const view: ProbabilityView = { title: titles[chapter], description, verdict, rows, formulas: chapter === 'binomial' ? [densityFormula, state.k < 0 || state.k > state.n ? 'P(X=k)=0\\quad(k\\notin\\{0,\\ldots,n\})' : `P(X=${state.k})=${tex(binomial.selected)}`, '\\sum_{k=0}^n\\binom nk p^k(1-p)^{n-k}=(p+1-p)^n=1'] : [densityFormula, intervalFormula],
    trace: steps([{ title: discrete ? 'Start with individual trial outcomes' : 'Specify a normalized density', detail: discrete ? `${state.n} iid Bernoulli trials, p=${exactText(binomial.p)}. Empty products are one in this counting context; n=0 means zero successes with probability one.` : uniformMode ? `Density is ${exactText(uniform.density)} on an interval of length b−a.` : 'The Gaussian density is normalized analytically over the full real line, not over the displayed window.', formula: densityFormula,
      ...(discrete ? { values: binomial.pmf } : {}) },
      { title: discrete ? 'Accumulate point masses' : 'Restrict to the selected interval', detail: discrete ? `CDFs add all masses at or below each argument; the selected count ${state.k} has mass ${exactText(binomial.selected)}.` : `Bounds ${state.lower} to ${state.upper} determine an area, not a density height.`, formula: 'F(x)=P(X\\le x)', ...(discrete ? { values: binomial.cdf } : {}) },
      { title: discrete ? 'Use the correct interval endpoints' : 'Read the interval probability', detail: description, formula: intervalFormula, ...(discrete ? { values: [interval.lowerLeftCDF, interval.upperCDF, interval.probability] } : uniformMode ? { values: [uniform.lowerCDF, uniform.upperCDF, uniform.probability] } : {}) }]) };
  let densityScene, cdfScene;
  if (discrete) {
    const cdfPoints: PlotPoint[] = [{ x: -1, y: 0 }];
    binomial.cdf.forEach((p, i) => { cdfPoints.push({ x: i, y: i ? toNumber(binomial.cdf[i - 1]!) : 0 }, { x: i, y: toNumber(p) }); });
    cdfPoints.push({ x: state.n + 1, y: 1 });
    const ticks = values.filter((_, i) => i % Math.max(1, Math.ceil(state.n / 6)) === 0 || i === state.n).map(toNumber);
    densityScene = plotScene({ title: 'PMF · probability at a numerical value', description, kind: 'pmf', xMin: -1, xMax: state.n + 1, yMax: 1, bars: binomial.pmf.map((p, i) => ({ x: i, value: toNumber(p), selected: chapter === 'binomial' ? i === state.k : interval.selected[i] })), ticks, mean: toNumber(binomial.mean), xLabel: 'Success count k · colored selected bars carry probability mass' });
    cdfScene = plotScene({ title: 'CDF · nondecreasing and continuous from the right', description, kind: 'cdf', xMin: -1, xMax: state.n + 1, yMax: 1, curve: cdfPoints, ticks,
      dots: binomial.cdf.flatMap((p, i) => binomial.pmf[i]!.num === 0n ? [{ x: i, y: toNumber(p), closed: true }] : [{ x: i, y: i ? toNumber(binomial.cdf[i - 1]!) : 0, closed: false }, { x: i, y: toNumber(p), closed: true }]), xLabel: 'Filled dot gives F(k); an open dot marks the left limit at a positive jump. F ends at one.' });
  } else {
    const xMin = Math.min(state.a - 1, state.mean - 4 * state.sigma, state.lower), xMax = Math.max(state.b + 1, state.mean + 4 * state.sigma, state.upper);
    const normalXs = [...new Set([xMin, xMax, state.lower, state.upper, ...Array.from({ length: 129 }, (_, i) => state.mean + (i / 16 - 4) * state.sigma)])].filter(x => x >= xMin && x <= xMax).sort((a, b) => a - b);
    const normalCurve = normalXs.map(x => ({ x, y: normalDensity((x - state.mean) / state.sigma) / state.sigma }));
    const uniformCurve = [{ x: xMin, y: 0 }, { x: state.a, y: 0 }, { x: state.a, y: toNumber(uniform.density) }, { x: state.b, y: toNumber(uniform.density) }, { x: state.b, y: 0 }, { x: xMax, y: 0 }];
    const densityCurve = uniformMode ? uniformCurve : normalCurve;
    const area = uniformMode ? [{ x: Math.max(state.a, Math.min(state.b, state.lower)), y: 0 }, { x: Math.max(state.a, Math.min(state.b, state.lower)), y: toNumber(uniform.density) }, { x: Math.max(state.a, Math.min(state.b, state.upper)), y: toNumber(uniform.density) }, { x: Math.max(state.a, Math.min(state.b, state.upper)), y: 0 }]
      : [{ x: state.lower, y: 0 }, ...normalCurve.filter(p => p.x >= state.lower && p.x <= state.upper), { x: state.upper, y: 0 }];
    const comparison = chapter === 'continuous' ? uniformMode ? normalCurve : uniformCurve : [];
    densityScene = plotScene({ title: chapter === 'continuous' ? 'PDF comparison · solid selected, dashed alternative' : 'PDF · height is density, shaded area is probability', description, kind: 'pdf', xMin, xMax,
      yMax: Math.max(uniformMode || chapter === 'continuous' ? toNumber(uniform.density) : 0, !uniformMode || chapter === 'continuous' ? normal.densityAtMean : 0) * 1.15,
      curve: densityCurve, secondary: comparison, area, ticks: [xMin, state.lower, state.upper, xMax].filter((x, i, all) => all.indexOf(x) === i), xLabel: 'x · density has inverse-x units · drawn tails are truncated, total Gaussian mass is analytically one' });
    const cdfXs = uniformMode ? [xMin, state.a, state.b, xMax] : [...new Set([xMin, xMax, state.lower, state.upper, ...Array.from({ length: 33 }, (_, i) => state.mean + (i / 4 - 4) * state.sigma)])].sort((a, b) => a - b);
    const cdfCurve = cdfXs.map(x => ({ x, y: uniformMode ? uniformCDFNumber(state.a, state.b, x) : normalCDF((x - state.mean) / state.sigma) }));
    cdfScene = plotScene({ title: 'CDF · accumulated area', description, kind: 'cdf', xMin, xMax, yMax: 1, curve: cdfCurve, ticks: [xMin, state.mean, xMax], xLabel: 'F(x) = area to the left · approaches zero and one in the tails' });
  }
  const fields: (keyof typeof distributionSpecs)[] = discrete ? ['n', 'p', 'k', ...(chapter === 'representations' ? ['lower', 'upper'] as const : [])] : [...(chapter === 'continuous' || uniformMode ? ['a', 'b'] as const : []), ...(chapter === 'continuous' || !uniformMode ? ['mean', 'sigma'] as const : []), 'lower', 'upper'];
  return { view, binomial, uniform, normal, interval, densityScene, cdfScene, fields };
}
