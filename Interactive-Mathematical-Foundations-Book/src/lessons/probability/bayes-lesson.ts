import { deriveBayes } from '../../math/probability/bayes';
import { exactRow, exactText, massItem, parameter, steps, tex, type ProbabilityView } from './view';

export interface BayesState { prior: number; sensitivity: number; falsePositive: number; evidence: 'positive' | 'negative' }
export const BAYES_CANONICAL: BayesState = { prior: 1, sensitivity: 90, falsePositive: 5, evidence: 'positive' };
export const bayesSpecs = [parameter('prior', 'Prior base rate (%)', '100P(A)', 0, 100, 1, .1, 2), parameter('sensitivity', 'Positive flag given A (%)', '100P(+\\mid A)', 0, 100, 90, 1, 2), parameter('falsePositive', 'False positive rate (%)', '100P(+\\mid A^c)', 0, 100, 5, 1, 2)];

export function deriveBayesLesson(state: BayesState) {
  const model = deriveBayes(state.prior, state.sensitivity, state.falsePositive, state.evidence);
  const priorMass = [massItem('Prior A', model.prior, 'x'), massItem('Prior Aᶜ', { num: model.prior.den - model.prior.num, den: model.prior.den }, 'y')];
  const evidenceMass = [massItem('A and observed evidence', model.cells[0]!, 'x'), massItem('Aᶜ and observed evidence', model.cells[2]!, 'y')];
  const posteriorMass = model.posteriorMass?.map((mass, i) => massItem(i === 0 ? 'Posterior A' : 'Posterior Aᶜ', mass, i === 0 ? 'x' : 'y')) ?? null;
  const verdict = model.posterior === null ? 'Impossible evidence: P(E) = 0. A posterior cannot be normalized.' : `Observed ${state.evidence} evidence changes the mass of A from ${exactText(model.prior)} to ${exactText(model.posterior)}. The posterior masses sum to exactly one.`;
  const formula = model.posterior === null ? 'P(A\\mid E)=\\text{undefined}\\quad(P(E)=0)' : `P(A\\mid E)=\\frac{P(E\\mid A)P(A)}{P(E)}=\\frac{${tex(model.cells[0]!)}}{${tex(model.evidence)}}=${tex(model.posterior)}`;
  const countLabels = ['A and E', 'A and Eᶜ', 'Aᶜ and E', 'Aᶜ and Eᶜ'];
  const view: ProbabilityView = { title: 'Evidence moves probability mass', description: `Fictional quality flag model. E is the ${state.evidence} flag. Expected counts in 10,000 items: ${model.expectedCounts.map((p, i) => `${countLabels[i]} = ${exactText(p)}`).join('; ')}. ${verdict}`,
    verdict, rows: [exactRow('prior', 'P(A)', 'Prior', model.prior, '', 'x'), exactRow('likelihood', 'P(E\\mid A)', 'Evidence likelihood given A', model.likelihoodA), exactRow('false-alarm', 'P(E\\mid A^c)', 'Evidence likelihood given Aᶜ', model.likelihoodNotA, '', 'y'), exactRow('false-negative', 'P(-\\mid A)', 'False negative rate', model.falseNegative), exactRow('evidence', 'P(E)', 'Normalizing evidence', model.evidence), exactRow('posterior', 'P(A\\mid E)', 'Posterior', model.posterior, 'Observed evidence has zero probability; conditioning is impossible.')],
    formulas: [`P(E)=P(E\\mid A)P(A)+P(E\\mid A^c)P(A^c)=${tex(model.evidence)}`, formula],
    trace: steps([{ title: 'Before observing evidence', detail: `Prior mass of A is ${exactText(model.prior)}.`, formula: `P(A)=${tex(model.prior)}`, masses: priorMass, values: [model.prior] },
      { title: 'Retain only matching evidence', detail: `Joint retained mass: ${exactText(model.cells[0]!)} from A and ${exactText(model.cells[2]!)} from Aᶜ. Discarded mass = ${exactText(model.discarded)}.`, formula: `P(A\\cap E)=P(A)P(E\\mid A)=${tex(model.cells[0]!)}`, masses: evidenceMass, values: model.cells },
      { title: 'Normalize the retained mass', detail: verdict, formula, ...(posteriorMass ? { masses: posteriorMass, values: model.posteriorMass! } : {}) }]) };
  return { view, model, priorMass, evidenceMass, posteriorMass, counts: model.expectedCounts.map((count, i) => ({ label: countLabels[i]!, count: exactText(count), mass: exactText(model.cells[i]!) })) };
}
