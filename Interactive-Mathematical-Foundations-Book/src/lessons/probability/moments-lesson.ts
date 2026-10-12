import { deriveMoments } from '../../math/probability/moments';
import { toNumber } from '../../math/quantity/rational';
import { exactRow, exactText, massItem, parameter, rootRow, steps, tex, type ProbabilityView } from './view';
import { plotScene } from './plot';

export type MomentsChapter = 'expectation' | 'variance';
export interface MomentsState { x1: number; x2: number; x3: number; w1: number; w2: number; w3: number; scale: number; shift: number }
export const MOMENTS_CANONICAL: MomentsState = { x1: -2, x2: 0, x3: 4, w1: 1, w2: 2, w3: 1, scale: 1, shift: 0 };
export const momentsSpecs = [parameter('x1', 'First value', 'x_1', -5, 5, -2, .5, 2), parameter('x2', 'Second value', 'x_2', -5, 5, 0, .5, 2), parameter('x3', 'Third value', 'x_3', -5, 5, 4, .5, 2), parameter('w1', 'First weight', 'w_1', 0, 100, 1), parameter('w2', 'Second weight', 'w_2', 0, 100, 2), parameter('w3', 'Third weight', 'w_3', 0, 100, 1), parameter('scale', 'Affine scale', 'a', -3, 3, 1, .5, 2), parameter('shift', 'Affine shift', 'b', -4, 4, 0, .5, 2)];
export function deriveMomentsLesson(chapter: MomentsChapter, state: MomentsState) {
  if (!['expectation', 'variance'].includes(chapter)) throw new RangeError('Unknown moments chapter.');
  const model = deriveMoments([state.w1, state.w2, state.w3], [state.x1, state.x2, state.x3], state.scale, state.shift);
  const mass = model.probabilities.map((p, i) => massItem(`Outcome ${i + 1}: X = ${exactText(model.values[i]!)}`, p));
  const maxDistance = Math.max(1, ...model.deviations.map(d => Math.abs(toNumber(d))));
  const squares = model.squaredDistances.map((sq, i) => ({ side: Math.abs(toNumber(model.deviations[i]!)) / maxDistance * 90, squared: exactText(sq), contribution: exactText(model.varianceTerms[i]!), label: `Outcome ${i + 1}` }));
  const verdict = chapter === 'expectation' ? `The weighted balance point is E[X] = ${exactText(model.mean)}. Y = 2X + 1 depends on X, yet E[X+Y] = E[X]+E[Y] = ${exactText(model.sumXY.mean)}.`
    : `The theoretical variance is ${exactText(model.variance)}. Scaling by ${state.scale} changes it by a²; shifting by ${state.shift} changes location and leaves spread unchanged.`;
  const varianceFormula = `\\operatorname{Var}(X)=\\sum_i p_i(x_i-\\mu)^2=${tex(model.variance)}`;
  const view: ProbabilityView = { title: chapter === 'expectation' ? 'Probability makes a weighted balance point' : 'Measure spread around the expectation', verdict,
    description: `${model.values.map((x, i) => `Value ${exactText(x)} has mass ${exactText(model.probabilities[i]!)}, deviation ${exactText(model.deviations[i]!)}, squared distance ${exactText(model.squaredDistances[i]!)}`).join('; ')}. ${verdict}`,
    rows: [exactRow('mean', '\\mu=E[X]', 'Population expectation', model.mean), exactRow('second', 'E[X^2]', 'Second moment', model.secondMoment), exactRow('variance', '\\operatorname{Var}(X)', 'Population variance', model.variance), rootRow('sd', '\\sigma_X', 'Standard deviation', model.variance),
      exactRow('scaled-mean', 'E[aX+b]', 'Transformed expectation', model.transformed.mean), exactRow('scaled-variance', '\\operatorname{Var}(aX+b)', 'Transformed variance', model.transformed.variance),
      ...(chapter === 'expectation' ? [exactRow('linearity', 'E[X+Y]', 'Expectation of dependent sum', model.sumXY.mean)] : [])],
    formulas: [`E[X]=\\sum_i p_ix_i=${tex(model.mean)}`, chapter === 'expectation' ? `E[X+Y]=E[X]+E[Y]=${tex(model.mean)}+${tex(model.dependentY.mean)}=${tex(model.sumXY.mean)}` : varianceFormula,
      `E[aX+b]=aE[X]+b=${tex(model.transformed.mean)},\\quad\\operatorname{Var}(aX+b)=a^2\\operatorname{Var}(X)=${tex(model.transformed.variance)}`],
    trace: steps([{ title: 'Assign population probability mass', detail: 'Weights divide by their positive total; these are theoretical probabilities, not sample estimates.', formula: '\\sum_i p_i=1', masses: mass, values: model.probabilities },
      { title: 'Accumulate weighted values', detail: model.terms.map((p, i) => `Term ${i + 1} = ${exactText(p)}`).join('; ') + `; total = ${exactText(model.mean)}.`, formula: `\\mu=\\sum_i p_ix_i=${tex(model.mean)}`, values: model.terms },
      { title: chapter === 'variance' ? 'Square distances and weight them' : 'Verify linearity with dependent variables', detail: verdict, formula: chapter === 'variance' ? varianceFormula : `E[X+Y]=E[X]+E[Y]=${tex(model.sumXY.mean)}`, values: chapter === 'variance' ? model.varianceTerms : [model.mean, model.dependentY.mean, model.sumXY.mean] }]) };
  const support = model.distribution.map(x => toNumber(x.value));
  const gaps = support.slice(1).map((x, i) => x - support[i]!);
  const width = Math.min(.8, ...gaps.map(g => g * .7));
  const scene = plotScene({ title: 'The original population and its balance point', description: `Dashed marker at expectation ${exactText(model.mean)}. ${view.description}`, kind: 'moments', xMin: Math.min(...support) - 1, xMax: Math.max(...support) + 1, yMax: 1,
    bars: model.distribution.map(x => ({ x: toNumber(x.value), value: toNumber(x.mass), width })), mean: toNumber(model.mean), ticks: support, xLabel: 'X values · bar height is probability mass · dashed line is E[X]' });
  const table = model.values.map((x, i) => ({ value: exactText(x), mass: exactText(model.probabilities[i]!), term: exactText(model.terms[i]!), deviation: exactText(model.deviations[i]!), squared: exactText(model.squaredDistances[i]!), varianceTerm: exactText(model.varianceTerms[i]!) }));
  return { view, model, mass, squares, scene, table };
}
