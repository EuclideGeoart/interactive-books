import { deriveJoint } from '../../math/probability/joint';
import { integer } from '../../math/probability/seeded';
import { toNumber } from '../../math/quantity/rational';
import { approx, exactRow, exactText, massItem, numericRow, parameter, steps, tex, type ProbabilityView } from './view';
import { plotScene } from './plot';

export type JointChapter = 'joint' | 'covariance';
export interface JointState { selectedRow: number; selectedColumn: number; w0: number; w1: number; w2: number; w3: number; w4: number; w5: number; w6: number; w7: number; w8: number; xScale: number; yScale: number; xShift: number; yShift: number }
export const JOINT_CANONICAL: JointState = { selectedRow: 0, selectedColumn: 0, w0: 1, w1: 1, w2: 0, w3: 1, w4: 2, w5: 1, w6: 0, w7: 1, w8: 1, xScale: 1, yScale: 1, xShift: 0, yShift: 0 };
export const jointWeights = (s: JointState) => [s.w0, s.w1, s.w2, s.w3, s.w4, s.w5, s.w6, s.w7, s.w8];
export const cellWeightKey = (i: number): 'w0' | 'w1' | 'w2' | 'w3' | 'w4' | 'w5' | 'w6' | 'w7' | 'w8' => `w${integer(i, 0, 8, 'Cell')}` as 'w0';
export const jointSpecs = { weight: parameter('weight', 'Selected cell weight', 'w_{ij}', 0, 100, 1), xScale: parameter('xScale', 'X scale', 'a', -3, 3, 1, .5, 2), yScale: parameter('yScale', 'Y scale', 'c', -3, 3, 1, .5, 2), xShift: parameter('xShift', 'X shift', 'b', -3, 3, 0, .5, 2), yShift: parameter('yShift', 'Y shift', 'd', -3, 3, 0, .5, 2) };
export function jointPreset(preset: string): JointState {
  const values: Record<string, readonly number[]> = { independent: [1, 2, 1, 2, 4, 2, 1, 2, 1], diagonal: [1, 0, 0, 0, 1, 0, 0, 0, 1], nonlinear: [0, 0, 1, 0, 1, 0, 0, 0, 1], 'empty-row': [0, 0, 0, 1, 2, 1, 0, 1, 1], 'empty-column': [0, 1, 0, 0, 2, 1, 0, 1, 1], degenerate: [0, 0, 0, 1, 1, 1, 0, 0, 0] };
  if (preset === 'reversed') return { ...JOINT_CANONICAL, xScale: -1 };
  if (preset === 'collapsed') return { ...JOINT_CANONICAL, xScale: 0 };
  const weights = values[preset]; if (!weights) throw new RangeError('Unknown joint preset.');
  return { ...JOINT_CANONICAL, ...Object.fromEntries(weights.map((w, i) => [cellWeightKey(i), w])) };
}
export function deriveJointLesson(chapter: JointChapter, state: JointState) {
  if (!['joint', 'covariance'].includes(chapter)) throw new RangeError('Unknown joint chapter.');
  const row = integer(state.selectedRow, 0, 2, 'Selected row'), column = integer(state.selectedColumn, 0, 2, 'Selected column');
  const model = deriveJoint(jointWeights(state), state.xScale, state.yScale, state.xShift, state.yShift);
  const conditional = model.rowConditional[row], reverse = model.columnConditional[column];
  const conditionalMass = conditional?.map((p, j) => massItem(`V = ${j - 1} given U = ${row - 1}`, p)) ?? [];
  const rowMass = model.rows.map((p, i) => massItem(`U = ${i - 1}`, p)), columnMass = model.columns.map((p, i) => massItem(`V = ${i - 1}`, p));
  const verdict = chapter === 'joint' ? `${model.latentIndependent ? 'Independent' : 'Dependent'} U and V. Row and column marginals each sum to one. ${conditional ? `Conditioning on U = ${row - 1} divides the retained row by ${exactText(model.rows[row]!)}.` : `U = ${row - 1} has zero mass: its conditional distribution is undefined.`}`
    : `Covariance ${exactText(model.covariance)}; ${model.correlation === null ? 'correlation undefined because a marginal variance is zero' : `correlation approximately ${approx(model.correlation)}`}. ${model.independent ? 'The transformed X and Y are independent.' : model.covariance.num === 0n ? 'Zero covariance does not make these X and Y independent.' : 'X and Y are dependent.'} Correlation describes linear association, not causation.`;
  const description = `${model.mass.map((p, i) => `U=${Math.floor(i / 3) - 1}, V=${i % 3 - 1}: exact joint mass ${exactText(p)}`).join('; ')}. ${chapter === 'covariance' ? `X=${state.xScale}U+${state.xShift}, Y=${state.yScale}V+${state.yShift}. Coinciding mapped points combine their masses. ` : ''}${verdict}`;
  const conditionalFormula = conditional ? `P(V=${column - 1}\\mid U=${row - 1})=\\frac{${tex(model.mass[row * 3 + column]!)}}{${tex(model.rows[row]!)}}=${tex(conditional[column]!)}` : `P(V\\mid U=${row - 1})\\text{ undefined: }P(U=${row - 1})=0`;
  const covarianceFormula = `\\operatorname{Cov}(X,Y)=E[XY]-E[X]E[Y]=${tex(model.xy)}-${tex(model.x.mean)}\\cdot${tex(model.y.mean)}=${tex(model.covariance)}`;
  const view: ProbabilityView = { title: chapter === 'joint' ? 'One table, three distribution views' : 'Weight the scatter before measuring association', description, verdict,
    rows: chapter === 'joint' ? [exactRow('joint', 'P(U=u,V=v)', 'Selected joint cell', model.mass[row * 3 + column]!), exactRow('row', 'P(U=u)', 'Selected row marginal', model.rows[row]!), exactRow('column', 'P(V=v)', 'Selected column marginal', model.columns[column]!), exactRow('conditional', 'P(V=v\\mid U=u)', 'Column value given selected row', conditional?.[column] ?? null), exactRow('reverse-conditional', 'P(U=u\\mid V=v)', 'Row value given selected column', reverse?.[row] ?? null)]
      : [exactRow('mean-x', 'E[X]', 'X expectation', model.x.mean), exactRow('mean-y', 'E[Y]', 'Y expectation', model.y.mean), exactRow('variance-x', '\\operatorname{Var}(X)', 'X variance', model.x.variance), exactRow('variance-y', '\\operatorname{Var}(Y)', 'Y variance', model.y.variance), exactRow('covariance', '\\operatorname{Cov}(X,Y)', 'Covariance', model.covariance), numericRow('correlation', '\\rho_{X,Y}', 'Correlation', model.correlation)],
    formulas: chapter === 'joint' ? ['P(U=u_i)=\\sum_jp_{ij},\\qquad P(V=v_j)=\\sum_ip_{ij}', conditionalFormula, 'U\\perp V\\iff p_{ij}=P(U=u_i)P(V=v_j)\\quad\\text{for all }i,j'] : [covarianceFormula, '\\operatorname{Cov}(aU+b,cV+d)=ac\\operatorname{Cov}(U,V)', '\\rho_{X,Y}=\\frac{\\operatorname{Cov}(X,Y)}{\\sigma_X\\sigma_Y}\\quad(\\sigma_X\\sigma_Y>0)'],
    trace: steps([{ title: 'Normalize the nine joint weights', detail: 'The table is an indexed U,V outcome model. Nonnegative raw weights divide by their positive total.', formula: '\\sum_{i,j}p_{ij}=1', values: model.mass },
      { title: chapter === 'joint' ? 'Sum rows and columns' : 'Find the marginal balance points', detail: chapter === 'joint' ? `Row masses ${model.rows.map(exactText).join(', ')}; column masses ${model.columns.map(exactText).join(', ')}.` : `E[X]=${exactText(model.x.mean)}, E[Y]=${exactText(model.y.mean)}; variances ${exactText(model.x.variance)}, ${exactText(model.y.variance)}.`, formula: chapter === 'joint' ? 'P(U=u_i)=\\sum_jp_{ij}' : 'E[X]=\\sum_{i,j}x_ip_{ij}', masses: chapter === 'joint' ? rowMass : undefined, values: [model.x.mean, model.y.mean] },
      { title: chapter === 'joint' ? 'Retain and renormalize a row' : 'Weight the centered cross-products', detail: verdict, formula: chapter === 'joint' ? conditionalFormula : covarianceFormula, masses: chapter === 'joint' ? conditionalMass : undefined, values: [model.covariance] }]) };
  const xs = model.xValues.map(toNumber), ys = model.yValues.map(toNumber), xMin = Math.min(...xs) - 1, xMax = Math.max(...xs) + 1;
  const scatter = plotScene({ title: 'Weighted X,Y scatter · circle area is joint probability', kind: 'joint-scatter', description, xMin, xMax, yMin: Math.min(...ys) - 1, yMax: Math.max(...ys) + 1,
    dots: model.points.map(p => ({ x: toNumber(p.x), y: toNumber(p.y), radius: 26 * Math.sqrt(toNumber(p.mass)) })), mean: toNumber(model.x.mean), secondary: [{ x: xMin, y: toNumber(model.y.mean) }, { x: xMax, y: toNumber(model.y.mean) }], ticks: [...new Set(xs)], xLabel: 'Horizontal coordinate X · vertical coordinate Y · dashed lines mark marginal expectations' });
  const cells = model.mass.map((p, i) => ({ index: i, row: Math.floor(i / 3), column: i % 3, mass: exactText(p), shade: 10 + 65 * toNumber(p) }));
  return { view, model, cells, rowMass, columnMass, conditionalMass, scatter, selectedCell: row * 3 + column };
}
