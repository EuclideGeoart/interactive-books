import { deriveCounting } from '../../math/probability/counting';
import { int } from '../../math/quantity/rational';
import { exactRow, exactText, parameter, steps, type ProbabilityView } from './view';

export interface CountingState { n: number; k: number; ordered: boolean; replacement: boolean }
export const COUNTING_CANONICAL: CountingState = { n: 4, k: 2, ordered: true, replacement: false };
export const countingSpecs = [parameter('n', 'Available items', 'n', 2, 8, 4), parameter('k', 'Selection size', 'k', 0, 4, 2)];
export function deriveCountingLesson(state: CountingState) {
  const model = deriveCounting(state.n, state.k, state.ordered, state.replacement);
  const rule = state.ordered ? state.replacement ? 'n^k' : '\\frac{n!}{(n-k)!}' : state.replacement ? '\\binom{n+k-1}{k}' : '\\binom nk';
  const formula = model.impossible ? 'N=0\\quad(k>n\\text{ without replacement})' : `N=${rule}=${model.count}`;
  const verdict = model.impossible ? 'Impossible selection: more distinct items requested than available.' : model.uniformSelections ? 'Under uniform draws, these displayed selections are equiprobable.' : 'Unordered selections with replacement have unequal masses: distinct orderings combine into the same multiset.';
  const examples = model.examples.map(example => ({ label: example.items.length ? example.items.map(i => String.fromCharCode(65 + i)).join(state.ordered ? ' → ' : ', ') : 'empty selection',
    probability: example.probability ? exactText(example.probability) : 'undefined', arrangements: example.arrangements.toString() }));
  const view: ProbabilityView = { title: 'Count the right kind of outcome', description: `${state.n} labeled items, ${state.k} draws, ${state.ordered ? 'order matters' : 'order ignored'}, ${state.replacement ? 'with' : 'without'} replacement. ${model.count} selections. ${verdict}`,
    verdict, rows: [exactRow('count', 'N', 'Number of selections', int(model.count)), exactRow('ordered-count', 'N_{\\rm ordered}', 'Underlying ordered outcomes', int(model.orderedCount))],
    formulas: [formula, 'P(S)=\\frac{\\text{equiprobable ordered outcomes in }S}{\\text{all ordered outcomes}}'],
    trace: steps([{ title: 'Specify what counts as one outcome', detail: `${state.ordered ? 'AB and BA are different' : 'AB and BA are the same'}; ${state.replacement ? 'AA is allowed' : 'AA is forbidden'}.`, formula: `n=${state.n},\\quad k=${state.k}`, values: [int(state.n), int(state.k)] },
      { title: 'Count ordered draws', detail: `${model.orderedCount} ordered outcomes under the stated sampling rule. Zero draws give one empty outcome.`, formula: `N_{\\rm ordered}=${model.orderedCount}`, values: [int(model.orderedCount)] },
      { title: 'Account for order and probability', detail: verdict, formula, values: [int(model.count)] }]) };
  return { view, model, examples };
}
