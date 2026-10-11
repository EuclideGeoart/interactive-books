import { mappingDistribution } from '../../math/probability/moments';
import { integer } from '../../math/probability/seeded';
import { toNumber } from '../../math/quantity/rational';
import { exactRow, exactText, massItem, parameter, steps, tex, type ProbabilityView } from './view';
import { plotScene } from './plot';

export interface VariableState { selected: number; v1: number; v2: number; v3: number; v4: number; v5: number; v6: number; w1: number; w2: number; w3: number; w4: number; w5: number; w6: number }
export const VARIABLE_CANONICAL: VariableState = { selected: 1, v1: 0, v2: 0, v3: 1, v4: 1, v5: 2, v6: 2, w1: 1, w2: 1, w3: 1, w4: 1, w5: 1, w6: 1 };
export const variableSpecs = [parameter('value', 'Value of selected outcome', 'X(\\omega)', -4, 6, 0, .5, 2), parameter('weight', 'Weight of selected outcome', 'w_\\omega', 0, 100, 1)];
export const valueKey = (i: number): 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6' => `v${integer(i, 1, 6, 'Outcome')}` as 'v1';
export const variableWeightKey = (i: number): 'w1' | 'w2' | 'w3' | 'w4' | 'w5' | 'w6' => `w${integer(i, 1, 6, 'Outcome')}` as 'w1';
export function deriveVariableLesson(state: VariableState) {
  integer(state.selected, 1, 6, 'Selected outcome');
  const model = mappingDistribution([state.w1, state.w2, state.w3, state.w4, state.w5, state.w6], [state.v1, state.v2, state.v3, state.v4, state.v5, state.v6]);
  const masses = model.distribution.map(item => massItem(`X = ${exactText(item.value)}`, item.mass));
  const verdict = `Six outcomes induce ${model.distribution.length} numerical value(s) with positive mass. Matching values combine their original masses; the induced distribution still totals one.`;
  const view: ProbabilityView = { title: 'A random variable maps outcomes to values', description: `${model.values.map((x, i) => `Face ${i + 1} maps to ${exactText(x)}, with mass ${exactText(model.probabilities[i]!)}`).join('; ')}. ${verdict}`, verdict,
    rows: [exactRow('mean', 'E[X]', 'Expected numerical value', model.moments.mean), exactRow('variance', '\\operatorname{Var}(X)', 'Variance', model.moments.variance)],
    formulas: ['X:\\Omega\\longrightarrow\\mathbb R', 'P(X=x)=\\sum_{\\omega:X(\\omega)=x}P(\\omega)'],
    trace: steps([{ title: 'Keep the original outcomes', detail: 'The six die faces remain distinguishable, each with its model probability.', formula: '\\sum_{\\omega\\in\\Omega}P(\\omega)=1', values: model.probabilities },
      { title: 'Apply the numerical mapping', detail: model.values.map((x, i) => `X(${i + 1})=${exactText(x)}`).join('; '), formula: 'X:\\Omega\\to\\mathbb R', values: model.values },
      { title: 'Collect equal numerical values', detail: verdict, formula: 'P(X=x)=\\sum_{\\omega:X(\\omega)=x}P(\\omega)', masses, values: model.distribution.map(item => item.mass) }]) };
  const support = model.distribution.map(item => toNumber(item.value));
  const width = Math.min(.8, ...support.slice(1).map((x, i) => (x - support[i]!) * .7));
  const scene = plotScene({ title: 'Induced probability mass function', description: masses.map(item => `${item.label} has probability ${item.text}`).join('; '), kind: 'variable-pmf',
    xMin: Math.min(...support) - 1, xMax: Math.max(...support) + 1, yMax: 1, bars: model.distribution.map(item => ({ x: toNumber(item.value), value: toNumber(item.mass), width })), ticks: support, xLabel: 'Numerical values of X · bar height is probability mass' });
  return { view, model, masses, scene, outcomes: model.values.map((value, i) => ({ face: i + 1, value: exactText(value), mass: exactText(model.probabilities[i]!) })) };
}
