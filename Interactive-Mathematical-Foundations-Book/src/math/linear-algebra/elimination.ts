/** Exact, deterministic elimination for 1–4 equations/unknowns; at most four RHS columns. */
import { add, div, eq, isZero, mul, neg, ONE, sub, ZERO, type Rational } from '../quantity/rational';
import { identity, multiplyMatrices, multiplyVector, sameMatrix, sameVector, type ExactVector, type Matrix } from './matrices';
import { traceFrom } from '../../platform/trace';

export type RowOperation =
  | { readonly kind: 'swap'; readonly row: number; readonly other: number }
  | { readonly kind: 'scale'; readonly row: number; readonly factor: Rational }
  | { readonly kind: 'add'; readonly row: number; readonly source: number; readonly factor: Rational };
export interface EliminationFrame {
  readonly matrix: Matrix;
  readonly pivots: readonly number[];
  readonly phase: 'input' | 'forward' | 'echelon' | 'back-substitution' | 'reduced';
  readonly operation?: RowOperation;
  readonly solution?: ExactVector;
  readonly solved?: readonly number[];
}
const rowsMatrix = (values: readonly (readonly Rational[])[]): Matrix => ({ rows: values.length, cols: values[0]!.length, values });

/** Every legal operation acts on the entire augmented row, including every right-hand side. */
export function applyRowOperation(a: Matrix, op: RowOperation): Matrix {
  const valid = (i: number) => Number.isInteger(i) && i >= 0 && i < a.rows;
  if (!valid(op.row) || (op.kind === 'swap' && !valid(op.other)) ||
    (op.kind === 'add' && (!valid(op.source) || op.source === op.row))) throw new RangeError('Row indices must be distinct and inside the matrix.');
  if (op.kind === 'scale' && isZero(op.factor)) throw new RangeError('A row can only be scaled by a nonzero number.');
  const values = a.values.map(row => [...row]);
  if (op.kind === 'swap') [values[op.row], values[op.other]] = [values[op.other]!, values[op.row]!];
  else values[op.row] = values[op.row]!.map((x, j) => op.kind === 'scale' ? mul(op.factor, x) : add(x, mul(op.factor, values[op.source]![j]!)));
  return rowsMatrix(values);
}

export function eliminate(a: Matrix, rhs?: Matrix) {
  if (a.rows < 1 || a.rows > 4 || a.cols < 1 || a.cols > 4 ||
    (rhs && (rhs.rows !== a.rows || rhs.cols < 1 || rhs.cols > 4))) throw new RangeError('Elimination supports 1–4 rows/unknowns and 1–4 compatible RHS columns.');
  let current = rowsMatrix(a.values.map((row, i) => [...row, ...(rhs?.values[i] ?? [])]));
  const pivots: number[] = [];
  let displayedPivots = pivots;
  const frames: { state: EliminationFrame; explanation: string }[] = [];
  const record = (phase: EliminationFrame['phase'], explanation: string, operation?: RowOperation, solution?: ExactVector, solved?: readonly number[]) => {
    frames.push({ state: { matrix: current, pivots: [...displayedPivots], phase, ...(operation ? { operation } : {}), ...(solution ? { solution: [...solution], solved: [...(solved ?? [])] } : {}) }, explanation });
  };
  const perform = (operation: RowOperation, phase: EliminationFrame['phase']) => {
    current = applyRowOperation(current, operation);
    const r = operation.row + 1;
    const factor = operation.kind === 'swap' ? '' : `${operation.factor.num}/${operation.factor.den}`;
    record(phase, operation.kind === 'swap' ? `Swap R${r} and R${operation.other + 1}; this only reorders equations.`
      : operation.kind === 'scale' ? `Multiply every entry of R${r}, including the RHS, by ${factor}.`
        : `Add ${factor} times R${operation.source + 1} to R${r}; the solution set is preserved.`, operation);
  };
  record('input', 'The original equations. Coefficients are left of the augmentation boundary.');
  for (let col = 0; col < a.cols && pivots.length < a.rows; col++) {
    const row = pivots.length;
    const pivot = current.values.findIndex((values, i) => i >= row && !isZero(values[col]!));
    if (pivot < 0) { record('forward', `Column ${col + 1} has no remaining nonzero pivot; skip it, without dividing by zero.`); continue; }
    if (pivot !== row) perform({ kind: 'swap', row, other: pivot }, 'forward');
    pivots.push(col);
    if (!eq(current.values[row]![col]!, ONE)) perform({ kind: 'scale', row, factor: div(ONE, current.values[row]![col]!) }, 'forward');
    else record('forward', `Pivot ${pivots.length} is already 1 in column ${col + 1}.`);
    for (let i = row + 1; i < a.rows; i++) if (!isZero(current.values[i]![col]!))
      perform({ kind: 'add', row: i, source: row, factor: neg(current.values[i]![col]!) }, 'forward');
  }
  record('echelon', 'Echelon form: pivots step right and entries below them vanish. Zero coefficient rows may still contain contradictory right-hand sides.');
  const echelon = current;
  const inconsistent = rhs ? Array.from({ length: rhs.cols }, (_, j) => current.values.some(row => row.slice(0, a.cols).every(isZero) && !isZero(row[a.cols + j]!))) : [];
  if (rhs?.cols === 1 && !inconsistent[0]) {
    const x = Array.from({ length: a.cols }, () => ZERO);
    for (let i = pivots.length - 1; i >= 0; i--) {
      const col = pivots[i]!;
      const remainder = current.values[i]!.slice(col + 1, a.cols).reduce((sum, coefficient, k) => add(sum, mul(coefficient, x[col + 1 + k]!)), ZERO);
      x[col] = sub(current.values[i]![a.cols]!, remainder);
      record('back-substitution', `Solve pivot variable x${col + 1} from the last remaining equation; free variables are set to 0 for this particular solution.`, undefined, x, pivots.slice(i));
    }
  }
  for (let i = pivots.length - 1; i >= 0; i--) for (let row = 0; row < i; row++) {
    const col = pivots[i]!;
    if (!isZero(current.values[row]![col]!)) perform({ kind: 'add', row, source: i, factor: neg(current.values[row]![col]!) }, 'reduced');
  }
  // RHS pivots belong to the augmented matrix, never to rank(A).
  displayedPivots = [...pivots];
  for (let col = a.cols; col < current.cols && displayedPivots.length < a.rows; col++) {
    const row = displayedPivots.length;
    const pivot = current.values.findIndex((values, i) => i >= row && !isZero(values[col]!));
    if (pivot < 0) continue;
    if (pivot !== row) perform({ kind: 'swap', row, other: pivot }, 'reduced');
    displayedPivots.push(col);
    if (!eq(current.values[row]![col]!, ONE)) perform({ kind: 'scale', row, factor: div(ONE, current.values[row]![col]!) }, 'reduced');
    for (let i = 0; i < a.rows; i++) if (i !== row && !isZero(current.values[i]![col]!))
      perform({ kind: 'add', row: i, source: row, factor: neg(current.values[i]![col]!) }, 'reduced');
  }
  record('reduced', 'Reduced row-echelon form of the full augmented matrix. A pivot right of the boundary is a contradiction, not a coefficient pivot contributing to rank(A).');
  const free = Array.from({ length: a.cols }, (_, j) => j).filter(j => !pivots.includes(j));
  const nullspace = free.map(col => {
    const x = Array.from({ length: a.cols }, () => ZERO); x[col] = ONE;
    for (const [i, pivot] of pivots.entries()) x[pivot] = neg(current.values[i]![col]!);
    return x;
  });
  const particulars = rhs ? Array.from({ length: rhs.cols }, (_, j) => {
    if (inconsistent[j]) return null;
    const x = Array.from({ length: a.cols }, () => ZERO);
    for (const [i, col] of pivots.entries()) x[col] = current.values[i]![a.cols + j]!;
    return x;
  }) : [];
  return { rank: pivots.length, nullity: free.length, pivots, free, nullspace, particulars, inconsistent,
    echelon, rref: current, frames: traceFrom(frames), fullColumnRank: pivots.length === a.cols, fullRowRank: pivots.length === a.rows };
}

export function solveExact(a: Matrix, b: ExactVector) {
  const result = eliminate(a, rowsMatrix(b.map(value => [value])));
  const particular = result.particulars[0] ?? null;
  const product = particular ? multiplyVector(a, particular) : null;
  const verified = product?.ok === true && sameVector(product.value, b);
  return { ...result, kind: !particular ? 'none' as const : result.nullity ? 'infinite' as const : 'unique' as const, particular, verified };
}

/** The right side is extracted only after exact row operations turn A into I. */
export function inverseExact(a: Matrix) {
  if (a.rows !== a.cols || a.rows > 3) throw new RangeError('Inverse construction supports square matrices of size 1–3.');
  const result = eliminate(a, identity(a.rows));
  if (!result.fullColumnRank) return { ...result, inverse: null, leftIdentity: false, rightIdentity: false };
  const inverse = rowsMatrix(result.rref.values.map(row => row.slice(a.cols)));
  const left = multiplyMatrices(inverse, a), right = multiplyMatrices(a, inverse);
  return { ...result, inverse, leftIdentity: left.ok && sameMatrix(left.value, identity(a.rows)), rightIdentity: right.ok && sameMatrix(right.value, identity(a.rows)) };
}
