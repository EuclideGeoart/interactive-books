import { deriveCLT, deriveLLN, HISTOGRAM_WIDTH, populationModel, type Population } from '../../math/probability/sampling';
import { normalDensity } from '../../math/probability/distributions';
import { toNumber } from '../../math/quantity/rational';
import { approx, exactRow, exactText, massItem, numericRow, parameter, steps, tex, type ProbabilityView } from './view';
import { plotScene } from './plot';

export type SamplingChapter = 'lln' | 'clt';
export interface SamplingState { population: Population; p: number; seed: number; trials: number; n: number; repetitions: number; dependent: boolean }
const base: SamplingState = { population: 'bernoulli', p: 25, seed: 42, trials: 200, n: 8, repetitions: 240, dependent: false };
export const SAMPLING_CANONICAL: Record<SamplingChapter, SamplingState> = { lln: base, clt: { ...base, population: 'exponential' } };
export const samplingSpecs = { p: parameter('p', 'Bernoulli success probability (%)', '100p', 0, 100, 25, 1, 2), seed: parameter('seed', 'Explicit experiment seed', 's', 0, 0xffffffff, 42), trials: parameter('trials', 'Observation count', 'm', 1, 4000, 200, 25), n: parameter('n', 'Observations in each sample', 'n', 1, 100, 8), repetitions: parameter('repetitions', 'Independent sample repetitions', 'R', 10, 1000, 240, 20) };
export function samplingPreset(chapter: SamplingChapter, preset: string): SamplingState {
  const canonical = SAMPLING_CANONICAL[chapter];
  if (preset === 'bernoulli' || preset === 'uniform' || preset === 'exponential') return { ...canonical, population: preset };
  if (preset === 'degenerate') return { ...canonical, population: 'bernoulli', p: 0 };
  if (preset === 'short') return { ...canonical, n: 1, trials: 10 };
  if (preset === 'large') return { ...canonical, n: 30, trials: 2000 };
  if (preset === 'dependent') return { ...canonical, population: 'uniform', dependent: true };
  if (preset === 'maximum') return { ...canonical, n: 100, repetitions: 1000, trials: 4000 };
  throw new RangeError('Unknown sampling preset.');
}
function populationScene(state: SamplingState) {
  const p = populationModel(state.population, state.p);
  const description = `Ideal ${state.population} population. Mean ${exactText(p.mean)}, variance ${exactText(p.variance)}. The pseudo-random experiment approximates this mathematical sampling model.`;
  if (state.population === 'bernoulli') return plotScene({ title: 'Original Bernoulli population · PMF masses', kind: 'population', description, xMin: -1, xMax: 2, yMax: 1,
    bars: [{ x: 0, value: 1 - toNumber(p.p) }, { x: 1, value: toNumber(p.p) }], ticks: [0, 1], xLabel: 'One observation X · probability mass at 0 or 1' });
  const uniform = state.population === 'uniform';
  const curve = uniform ? [{ x: -.2, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 1.2, y: 0 }]
    : Array.from({ length: 129 }, (_, i) => ({ x: i / 128 * 6, y: Math.exp(-i / 128 * 6) }));
  return plotScene({ title: `Original ${uniform ? 'Uniform(0,1)' : 'Exponential(rate 1)'} population · PDF density`, kind: 'population', description, xMin: uniform ? -.2 : 0, xMax: uniform ? 1.2 : 6, yMax: 1.15, curve, ticks: uniform ? [0, .5, 1] : [0, 2, 4, 6],
    xLabel: uniform ? 'One observation X · flat density on [0,1]; endpoints have zero mass' : 'One observation X · nonnormal, right-skewed density · positive tail beyond 6 has mass e⁻⁶ ≈ 0.00247875' });
}
export function deriveSamplingLesson(chapter: SamplingChapter, state: SamplingState) {
  if (!['lln', 'clt'].includes(chapter)) throw new RangeError('Unknown sampling chapter.');
  const original = populationScene(state);
  if (chapter === 'lln') {
    const model = deriveLLN(state.population, state.p, state.seed, state.trials), target = toNumber(model.population.mean);
    const verdict = `Seed ${state.seed}, ${state.trials} actual observations: sample mean approximately ${approx(model.mean)}, target ${exactText(model.population.mean)}, signed deviation approximately ${approx(model.deviation)}. ${model.outwardSteps} steps moved farther from the target. One path illustrates variability; it cannot prove a limit theorem.`;
    const description = `${verdict} The theoretical iid mean standard deviation is σ/√m ≈ ${approx(model.standardError)}; it is not a guaranteed realized error.`;
    const checkpoints = [...new Set([1, 2, 5, 10, 50, 100, state.trials])].filter(m => m <= state.trials).sort((a, b) => a - b).map(m => ({ m, mean: approx(model.means[m - 1]!), deviation: approx(model.deviations[m - 1]!) }));
    const indices = [...new Set([Math.min(5, state.trials), Math.max(1, Math.floor(state.trials / 2)), state.trials])];
    while (indices.length < 3) indices.push(state.trials);
    const view: ProbabilityView = { title: 'Follow a seeded sample mean', description, verdict,
      rows: [exactRow('target', '\\mu=E[X]', 'True population mean', model.population.mean), exactRow('population-variance', '\\sigma^2', 'True population variance', model.population.variance), numericRow('sample-mean', '\\overline X_m', 'Observed sample mean', model.mean), numericRow('deviation', '\\overline X_m-\\mu', 'Observed signed deviation', model.deviation), numericRow('standard-error', '\\sigma/\\sqrt m', 'Theoretical iid mean standard deviation', model.standardError), numericRow('sample-variance', 's_m^2', 'Unbiased sample variance estimate', model.sampleVariance, 'At least two observations are needed for the usual m−1 estimator.')],
      formulas: [`\\mu=${tex(model.population.mean)},\\quad\\overline X_m=\\frac1m\\sum_{i=1}^mX_i\\approx ${approx(model.mean)}`, '\\operatorname{Var}(\\overline X_m)=\\sigma^2/m\\quad\\text{for iid observations}', '\\overline X_m\\xrightarrow{P}\\mu\\quad\\text{as }m\\to\\infty'],
      trace: steps(indices.map((m, i) => ({ title: ['Read the first observations', 'Continue the same seeded stream', 'Inspect the completed finite path'][i]!, detail: `Prefix m=${m}: actual sum ≈ ${approx(model.sums[m - 1]!)}, mean ≈ ${approx(model.means[m - 1]!)}, signed deviation ≈ ${approx(model.deviations[m - 1]!)}. ${i === 0 ? `First observations: ${model.observations.slice(0, m).map(approx).join(', ')}.` : 'No values are adjusted to hit the target.'}`, formula: `\\overline X_{${m}}=\\frac{\\sum_{i=1}^{${m}}X_i}{${m}}\\approx ${approx(model.means[m - 1]!)}`, observations: model.observations.slice(0, Math.min(16, m)) }))) };
    const path = plotScene({ title: 'Actual prefix means · dashed line is the population target', description, kind: 'lln-path', xMin: 1, xMax: Math.max(2, state.trials), yMax: Math.max(.1, target, ...model.means) * 1.15,
      curve: model.means.map((mean, i) => ({ x: i + 1, y: mean })), secondary: [{ x: 1, y: target }, { x: Math.max(2, state.trials), y: target }], ticks: [...new Set([1, Math.max(1, Math.round(state.trials / 2)), state.trials])], xLabel: 'Observation count m · vertical coordinate is the observed prefix mean, not a probability' });
    return { view, original, path, lln: model, clt: null, checkpoints, sampleRows: [], firstObservations: model.observations.slice(0, 16).map(approx) };
  }
  const model = deriveCLT(state.population, state.p, state.seed, state.n, state.repetitions, state.dependent), histogram = model.histogram;
  const warning = state.dependent ? 'Assumption failure: observations within each sample repeat one draw. The iid CLT does not apply; Var(mean)=σ² instead of σ²/n. The displayed iid scaling is a comparison that fails.' : 'Each sample uses its own next n draws from one deterministic pseudo-random stream, approximating the iid model. A finite sampling distribution is not exactly Gaussian.';
  const verdict = histogram ? `${state.repetitions} ${state.dependent ? 'dependent-within-block' : 'iid-model'} sample means, n=${state.n}, seed ${state.seed}. Histogram mass inside [−4,4) is ${exactText(histogram.insideMass)}, with ${histogram.underflow} below and ${histogram.overflow} at or above the window. ${warning}` : 'Population variance is zero. Every sample mean equals the population mean; standardization divides by zero and is undefined. No normal approximation is shown.';
  const description = `${verdict} Centered standardized means use sqrt(n)(mean−μ)/σ. Histogram density divides each count by all ${state.repetitions} repetitions and bin width 1/3; tails are not renormalized away.`;
  const sampleRows = model.samples.map((sample, i) => ({ repetition: i + 1, values: sample.map(approx).join(', '), sum: approx(model.sums[i]!), mean: approx(model.means[i]!), standardized: model.standardized ? approx(model.standardized[i]!) : 'undefined' }));
  const normalCurve = Array.from({ length: 129 }, (_, i) => ({ x: i / 16 - 4, y: normalDensity(i / 16 - 4) }));
  const path = histogram ? plotScene({ title: 'Standardized sample means · histogram density and dashed normal reference', description, kind: 'clt-histogram', xMin: -4.2, xMax: 4.2, yMax: Math.max(normalDensity(0), ...histogram.bins.map(bin => toNumber(bin.density))) * 1.15,
    bars: histogram.bins.map(bin => ({ x: (bin.lower + bin.upper) / 2, value: toNumber(bin.density), width: HISTOGRAM_WIDTH })), secondary: normalCurve, ticks: [-4, -2, 0, 2, 4], xLabel: 'z = √n(mean−μ)/σ · bar area is observed fraction · normal reference has theoretical variance one' }) : null;
  const tailMass = histogram ? [massItem('Below −4', histogram.underflowMass), massItem('Inside [−4,4)', histogram.insideMass), massItem('At or above 4', histogram.overflowMass)] : [];
  const view: ProbabilityView = { title: 'Watch repeated means change shape', description, verdict,
    rows: [exactRow('population-mean', '\\mu', 'Original population mean', model.population.mean), exactRow('population-variance', '\\sigma^2', 'Original population variance', model.population.variance), exactRow('iid-mean-variance', '\\sigma^2/n', 'Mean variance under iid assumptions', model.iidMeanVariance), exactRow('actual-mean-variance', '\\operatorname{Var}(\\overline X_n)', 'Mean variance in this sampling design', model.actualMeanVariance), numericRow('observed-mean', '\\operatorname{mean}(\\overline X_n)', 'Observed average of repeated means', model.meanOfMeans), numericRow('observed-variance', 'v_{\\mathrm{empirical}}', 'Empirical spread of repeated means (divide by R)', model.empiricalMeanVariance),
      ...(histogram ? [exactRow('hist-inside', 'M_{[-4,4)}', 'Observed histogram area inside window', histogram.insideMass)] : [numericRow('standardization', 'Z_n', 'Standardized mean', null)])],
    formulas: [`E[\\overline X_n]=\\mu=${tex(model.population.mean)},\\quad\\operatorname{Var}_{\\mathrm{iid}}(\\overline X_n)=\\frac{\\sigma^2}{n}=${tex(model.iidMeanVariance)}`, '\\frac{\\sqrt n(\\overline X_n-\\mu)}{\\sigma}\\xrightarrow{d}\\mathcal N(0,1)\\quad\\text{for iid, }0<\\sigma^2<\\infty', 'h_j=\\frac{\\mathrm{count}_j}{R\\,\\Delta z},\\quad\\Delta z=\\frac13'],
    trace: steps([{ title: 'Specify the original nonnormal population', detail: `Mean ${exactText(model.population.mean)}, variance ${exactText(model.population.variance)}. ${warning}`, formula: `E[X]=${tex(model.population.mean)},\\quad\\operatorname{Var}(X)=${tex(model.population.variance)}`, values: [model.population.mean, model.population.variance] },
      { title: 'Replay one actual sample, then center and scale', detail: `First sample: ${sampleRows[0]!.values}. Sum ≈ ${sampleRows[0]!.sum}; mean ≈ ${sampleRows[0]!.mean}; standardized mean ${sampleRows[0]!.standardized}.`, formula: '\\overline X_n=\\frac1n\\sum_{i=1}^nX_i,\\qquad Z_n=\\frac{\\sqrt n(\\overline X_n-\\mu)}{\\sigma}', observations: model.samples[0] },
      { title: 'Count repeated standardized means without fitting them', detail: verdict, formula: 'h_j\\Delta z=\\frac{\\mathrm{count}_j}{R}', masses: tailMass, observations: model.means.slice(0, 16) }]) };
  return { view, original, path, lln: null, clt: model, checkpoints: [], sampleRows, tailMass, firstObservations: [] };
}
