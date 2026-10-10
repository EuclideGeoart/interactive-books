/**
 * Lesson views for the shape-rule stage: for X in R^(n x d) and a second operand, does the product exist, and what is the shape of the result?
 * The rule (inner dimensions agree, outer dimensions remain) comes from `deriveAlgebra`; a mismatch is reported with its reason and no result.
 */
import type { ParamSpec } from '../../platform/params';
import type { InspectorRowData } from '../../ui/Inspector';
import { DIM_MAX, DIM_MIN, deriveAlgebra, tupleText, type AlgebraDerived, type AlgebraOp, type AlgebraState } from '../../math/notation/shapes';
import { exactText, missingDescription } from './view';

export type AlgebraLessonState = AlgebraState;
export const CANONICAL_ALGEBRA: AlgebraLessonState = Object.freeze({ op: 'matvec', n: 4, d: 3, p: 3, q: 2 });

export const OP_OPTIONS = Object.freeze([
  { id: 'matvec', label: 'X w' },
  { id: 'matmul', label: 'X W' },
  { id: 'transpose', label: 'Xᵀ' },
  { id: 'gram', label: 'XᵀX' },
] as const);

const dim = (id: string, name: string, symbol: string, def: number): ParamSpec => ({ id, name, symbolTex: symbol, symbolText: symbol, domain: { min: DIM_MIN, max: DIM_MAX }, default: def, step: 1, maxDecimals: 0, onInvalid: 'reject' });
export const ALGEBRA_PARAMS = Object.freeze({
  n: dim('alg-n', 'rows of X (examples)', 'n', 4),
  d: dim('alg-d', 'columns of X (features)', 'd', 3),
  pVector: dim('alg-p', 'entries of w', 'p', 3),
  pMatrix: dim('alg-p', 'rows of W', 'p', 3),
  q: dim('alg-q', 'columns of W', 'q', 2),
});

export interface AlgebraPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: AlgebraLessonState }
const P = (id: string, label: string, aria: string, s: Partial<AlgebraLessonState>): AlgebraPreset => Object.freeze({ id, label, aria, state: Object.freeze({ ...CANONICAL_ALGEBRA, ...s }) });
export const ALGEBRA_PRESETS: readonly AlgebraPreset[] = Object.freeze([
  P('fits', 'X w fits', 'a four by three matrix times a vector of three entries', {}),
  P('mismatch', 'X w does not fit', 'a four by three matrix times a vector of four entries, which does not fit', { p: 4 }),
  P('matrix', 'X W fits', 'a four by three matrix times a three by two matrix', { op: 'matmul' }),
  P('matrix-mismatch', 'X W does not fit', 'a four by three matrix times a two by two matrix, which does not fit', { op: 'matmul', p: 2 }),
  P('gram', 'XᵀX', 'the product of the transpose with the matrix itself', { op: 'gram' }),
  P('transpose', 'Xᵀ', 'the transpose of a four by three matrix', { op: 'transpose' }),
]);
export const algebraPresetMatches = (s: AlgebraLessonState, p: AlgebraPreset): boolean => (Object.keys(CANONICAL_ALGEBRA) as (keyof AlgebraLessonState)[]).every(key => Object.is(s[key], p.state[key]));

/** Which second-operand parameters the operation uses. */
export const usesP = (op: AlgebraOp): boolean => op === 'matvec' || op === 'matmul';
export const usesQ = (op: AlgebraOp): boolean => op === 'matmul';

export interface AlgebraLessonDerived { readonly state: AlgebraLessonState; readonly d: AlgebraDerived }
export function deriveAlgebraLesson(state: AlgebraLessonState): AlgebraLessonDerived {
  return Object.freeze({ state, d: deriveAlgebra(state) });
}

export interface BoxView {
  readonly id: 'left' | 'right' | 'result';
  readonly name: string;
  readonly rows: number;
  readonly cols: number;
  readonly valid: boolean;
}

/** The rectangles to draw: one per operand and, when the product exists, one for the result. */
export function boxesOf(derived: AlgebraLessonDerived): readonly BoxView[] {
  const { d, state: s } = derived;
  const out: BoxView[] = [{ id: 'left', name: s.op === 'gram' ? 'Xᵀ' : 'X', rows: s.op === 'gram' ? s.d : s.n, cols: s.op === 'gram' ? s.n : s.d, valid: true }];
  if (s.op === 'gram') out.push({ id: 'right', name: 'X', rows: s.n, cols: s.d, valid: true });
  if (d.right) out.push({ id: 'right', name: s.op === 'matvec' ? 'w' : 'W', rows: d.right[0]!, cols: d.right.length === 2 ? d.right[1]! : 1, valid: d.valid });
  if (d.result) out.push({ id: 'result', name: s.op === 'transpose' ? 'Xᵀ' : s.op === 'gram' ? 'XᵀX' : s.op === 'matvec' ? 'Xw' : 'XW', rows: d.result[0]!, cols: d.result.length === 2 ? d.result[1]! : 1, valid: true });
  return out;
}

export function algebraRows(derived: AlgebraLessonDerived): InspectorRowData[] {
  const { d, state: s } = derived;
  const rows: InspectorRowData[] = [
    { id: 'left', role: 'x', symbolTex: s.op === 'gram' ? 'X^{\\top}' : 'X', name: s.op === 'gram' ? 'the left factor, shape (d, n)' : 'the first operand, shape (n, d)', description: exactText(tupleText(s.op === 'gram' ? [s.d, s.n] : [s.n, s.d]), `\\left(${(s.op === 'gram' ? [s.d, s.n] : [s.n, s.d]).join(',\\ ')}\\right)`) },
  ];
  if (d.right) {
    const nm = s.op === 'matvec' ? '\\mathbf{w}' : 'W';
    rows.push({ id: 'right', role: 'y', symbolTex: nm, name: s.op === 'matvec' ? 'the vector, shape (p,)' : 'the second operand, shape (p, q)', description: exactText(tupleText(d.right), `\\left(${d.right.join(',\\ ')}\\right)`) });
  } else if (s.op === 'gram') {
    rows.push({ id: 'right', role: 'y', symbolTex: 'X', name: 'the right factor, shape (n, d)', description: exactText(tupleText([s.n, s.d]), `\\left(${s.n},\\ ${s.d}\\right)`) });
  }
  if (usesP(s.op)) {
    rows.push({
      id: 'inner', role: d.valid ? 'derived' : 'caution', symbolTex: '\\text{inner}', name: 'the inner dimensions, which must be equal',
      description: d.valid ? exactText(`${s.d} = ${s.p}`, `${s.d}=${s.p}`, `${s.d} equals ${s.p}`) : missingDescription(d.reason!),
    });
  }
  rows.push(d.result
    ? { id: 'result', role: 'primary', symbolTex: d.expressionTex, name: 'the product, shape (outer dimensions)', description: exactText(d.resultTuple!, `\\left(${d.result.join(',\\ ')}\\right)`) }
    : { id: 'result', role: 'caution', symbolTex: d.expressionTex, name: 'the product', description: missingDescription(d.reason!) });
  return rows;
}

export function algebraFormulas(derived: AlgebraLessonDerived): { id: string; label: string; tex: string }[] {
  const { d } = derived;
  return [{ id: 'rule', label: 'The shape rule for this product, scrollable', tex: `${d.expressionTex}:\\ ${d.ruleTex}` }];
}

export function algebraCode(derived: AlgebraLessonDerived): string {
  const { d, state: s } = derived;
  const lines = ['import numpy as np', '', `X = np.ones((${s.n}, ${s.d}))`];
  switch (s.op) {
    case 'matvec': lines.push(`w = np.ones(${s.p})`, d.valid ? `X @ w          # shape ${d.resultTuple}` : `X @ w          # ValueError: the inner dimensions differ (${s.d} and ${s.p})`); break;
    case 'matmul': lines.push(`W = np.ones((${s.p}, ${s.q}))`, d.valid ? `X @ W          # shape ${d.resultTuple}` : `X @ W          # ValueError: the inner dimensions differ (${s.d} and ${s.p})`); break;
    case 'transpose': lines.push(`X.T            # shape ${d.resultTuple}`); break;
    case 'gram': lines.push(`X.T @ X        # shape ${d.resultTuple}`); break;
  }
  return lines.join('\n');
}

export function algebraVerdict(derived: AlgebraLessonDerived): { text: string; caution: boolean } {
  const { d } = derived;
  if (!d.valid) return { text: `${d.reason} No product exists, so there is no result shape; NumPy raises a ValueError instead of guessing. ${d.rule}`, caution: true };
  return { text: `${d.rule} Result shape: ${d.resultTuple}.`, caution: false };
}

export function algebraSpoken(derived: AlgebraLessonDerived): string {
  const { d } = derived;
  return d.valid ? `The product exists and has shape ${d.result!.join(' by ')}.` : `The product does not exist. ${d.reason}`;
}

export function algebraDescription(derived: AlgebraLessonDerived): string {
  const boxes = boxesOf(derived);
  return `Rectangles drawn to scale, one per operand${derived.d.valid ? ' and one for the result' : ', without a result because the inner dimensions differ'}: ${boxes.map(b => `${b.name} has ${b.rows} ${b.rows === 1 ? 'row' : 'rows'} and ${b.cols} ${b.cols === 1 ? 'column' : 'columns'}`).join('; ')}.`;
}
