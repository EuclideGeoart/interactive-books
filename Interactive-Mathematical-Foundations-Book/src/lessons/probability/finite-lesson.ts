import { finiteEvents, finiteTrials, sum } from '../../math/probability/finite';
import { integer } from '../../math/probability/seeded';
import { rational } from '../../math/quantity/rational';
import { exactRow, exactText, massItem, parameter, steps, tex, type ProbabilityView } from './view';

export type FiniteChapter = 'experiments' | 'events' | 'conditional' | 'independence';
export interface FiniteState { model: 'die' | 'coins'; operation: 'A' | 'B' | 'union' | 'intersection' | 'complement'; aMask: number; bMask: number; selected: number; w1: number; w2: number; w3: number; w4: number; w5: number; w6: number; seed: number; trials: number }
export const FINITE_CANONICAL: FiniteState = { model: 'die', operation: 'union', aMask: 42, bMask: 56, selected: 1, w1: 1, w2: 1, w3: 1, w4: 1, w5: 1, w6: 1, seed: 42, trials: 12 };
export const finiteLabels = (state: FiniteState): string[] => state.model === 'die' ? ['1', '2', '3', '4', '5', '6'] : ['HH', 'HT', 'TH', 'TT'];
export const weightKey = (index: number): 'w1' | 'w2' | 'w3' | 'w4' | 'w5' | 'w6' => `w${integer(index, 1, 6, 'Selected outcome')}` as 'w1';
const titles: Record<FiniteChapter, string> = { experiments: 'An experiment and its sample space', events: 'Events carry probability mass', conditional: 'Restrict, then renormalize', independence: 'Test the product condition' };

export function deriveFiniteLesson(chapter: FiniteChapter, state: FiniteState) {
  if (!['die', 'coins'].includes(state.model) || !(chapter in titles)) throw new RangeError('Unknown finite experiment or chapter.');
  const labels = finiteLabels(state), weights = labels.map((_, i) => state[weightKey(i + 1)]);
  integer(state.aMask, 0, (1 << labels.length) - 1, 'Event A'); integer(state.bMask, 0, (1 << labels.length) - 1, 'Event B'); integer(state.selected, 1, labels.length, 'Selected outcome');
  const indices = labels.map((_, i) => i), a = indices.filter(i => state.aMask & (1 << i)), b = indices.filter(i => state.bMask & (1 << i));
  const model = finiteEvents(weights, a, b), trial = finiteTrials(model.probabilities, state.seed, state.trials);
  const operation = { A: a, B: b, union: model.union, intersection: model.intersection, complement: indices.filter(i => !a.includes(i)) }[state.operation];
  if (!operation) throw new RangeError('Choose A, B, union, intersection or complement.');
  const operationLabel = { A: 'A', B: 'B', union: 'A ∪ B', intersection: 'A ∩ B', complement: 'Aᶜ' }[state.operation];
  const outcomeRows = labels.map((label, i) => ({ label, index: i, weight: weights[i]!, probability: exactText(model.probabilities[i]!),
    conditional: model.conditionalMass ? exactText(model.conditionalMass[i]!) : 'undefined', inA: a.includes(i), inB: b.includes(i), inBoth: model.intersection.includes(i), highlighted: operation.includes(i) }));
  const assumption = weights.every(w => w === weights[0]) ? 'Equal weights explicitly assume equiprobable outcomes.' : `Unequal weights are the chosen model: each is divided by total weight ${weights.reduce((x, y) => x + y, 0)}.`;
  const verdict = chapter === 'conditional' ? model.conditional === null ? 'Conditioning is undefined: B has zero probability mass.' : `The denominator changes from 1 to P(B) = ${exactText(model.massB)}. Inside B, P(A|B) = ${exactText(model.conditional)}.`
    : chapter === 'independence' ? `${model.independent ? 'Independent' : 'Dependent'}: P(A∩B) ${model.independent ? '=' : '≠'} P(A)P(B). ${model.disjoint ? 'The sets are disjoint.' : 'The sets overlap.'} Disjointness and independence answer different questions.`
    : chapter === 'experiments' ? `The fixed model assigns probabilities before a trial. Seed ${state.seed} selects this reproducible observed sequence; its frequencies do not redefine the model.`
    : `Union includes either event; intersection includes both; complement includes outcomes outside A. Every mass uses the same weights.`;
  const rows = [exactRow('total', '\\sum_\\omega p_\\omega', 'Total probability', sum(model.probabilities)), exactRow('a', 'P(A)', 'Event A', model.massA, '', 'x'),
    exactRow('b', 'P(B)', 'Event B', model.massB, '', 'y'), exactRow('intersection', 'P(A\\cap B)', 'Intersection', model.joint),
    ...(chapter === 'events' ? [exactRow('union', 'P(A\\cup B)', 'Union', model.unionMass), exactRow('complement', 'P(A^c)', 'Complement of A', model.complement)] : []),
    ...(chapter === 'conditional' ? [exactRow('conditional', 'P(A\\mid B)', 'Conditional probability', model.conditional)] : []),
    ...(chapter === 'independence' ? [exactRow('product', 'P(A)P(B)', 'Product for comparison', model.product)] : []),
    ...(chapter === 'experiments' ? [exactRow('observed', '\\widehat P(A)', 'Observed frequency of A', rational(BigInt(trial.observations.filter(i => a.includes(i)).length), BigInt(state.trials)))] : [])];
  const formulas = [`P(A)=\\sum_{\\omega\\in A}p_\\omega=${tex(model.massA)}`, chapter === 'conditional' ? model.conditional === null ? 'P(A\\mid B)=\\text{undefined}\\quad(P(B)=0)' : `P(A\\mid B)=\\frac{${tex(model.joint)}}{${tex(model.massB)}}=${tex(model.conditional)}`
    : chapter === 'independence' ? `P(A\\cap B)=${tex(model.joint)}\\quad${model.independent ? '=' : '\\ne'}\\quad P(A)P(B)=${tex(model.product)}`
    : `P(A\\cup B)=P(A)+P(B)-P(A\\cap B)=${tex(model.unionMass)}`];
  const masses = labels.map((label, i) => massItem(label, model.probabilities[i]!, a.includes(i) ? 'x' : 'primary'));
  const trace = steps(chapter === 'experiments' ? [
    { title: 'Define the experiment', detail: `${labels.length} mutually exclusive outcomes, total mass one. ${assumption}`, formula: '\\sum_\\omega p_\\omega=1', masses, values: model.probabilities },
    { title: 'Observe the first trial', detail: `Seed ${state.seed}: first observation is ${labels[trial.observations[0]!]}. An observation is one outcome, not a probability.`, formula: '\\omega_1\\in\\Omega', observations: trial.observations.slice(0, 1) },
    { title: 'Replay repeated trials', detail: `${state.trials} trials produce ${trial.counts.map((count, i) => `${labels[i]}: ${count}`).join(', ')}. The original probabilities stay fixed.`, formula: `\\widehat P(A)=\\frac{${trial.observations.filter(i => a.includes(i)).length}}{${state.trials}}`, observations: trial.observations },
  ] : [
    { title: 'Start with total mass one', detail: assumption, formula: '\\sum_\\omega p_\\omega=1', masses, values: model.probabilities },
    { title: 'Select the relevant mass', detail: `A∩B contains ${model.intersection.map(i => labels[i]).join(', ') || 'no outcomes'}. Its original mass is ${exactText(model.joint)}.`, formula: `P(A\\cap B)=${tex(model.joint)}`, values: [model.massA, model.massB, model.joint] },
    { title: chapter === 'conditional' ? 'Use the restricted denominator' : chapter === 'independence' ? 'Compare joint with product' : 'Combine sets without double counting', detail: verdict, formula: formulas[1]!,
      ...(chapter === 'conditional' && model.conditionalMass ? { masses: labels.map((label, i) => massItem(label, model.conditionalMass![i]!, 'derived')), values: model.conditionalMass } : { values: [model.unionMass, model.product] }) },
  ]);
  const view: ProbabilityView = { title: titles[chapter], rows, formulas, description: `Sample space: ${labels.join(', ')}. ${assumption} A = {${a.map(i => labels[i]).join(', ')}}; B = {${b.map(i => labels[i]).join(', ')}}. ${verdict}`, verdict, trace };
  return { view, model, outcomeRows, masses, trial, labels, operationLabel, observations: trial.observations.slice(0, 16).map(i => labels[i]!), moreTrials: state.trials > 16 };
}

export function finitePreset(name: string): FiniteState {
  const state = { ...FINITE_CANONICAL };
  if (name === 'weighted') return { ...state, w1: 1, w2: 2, w3: 3, w4: 4, w5: 5, w6: 6 };
  if (name === 'empty-b') return { ...state, bMask: 0 };
  if (name === 'disjoint') return { ...state, aMask: 7, bMask: 56 };
  if (name === 'zero-a') return { ...state, aMask: 0 };
  if (name === 'coins') return { ...state, model: 'coins', aMask: 3, bMask: 5 };
  return state;
}
export const finiteSpecs = { weight: parameter('weight', 'Selected outcome weight', 'w_\\omega', 0, 100, 1), seed: parameter('seed', 'Experiment seed', 's', 0, 0xffffffff, 42), trials: parameter('trials', 'Observed trials', 'm', 1, 2000, 12) };
