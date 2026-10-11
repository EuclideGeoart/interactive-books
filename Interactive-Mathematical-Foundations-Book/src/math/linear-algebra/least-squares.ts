/** Exact orthogonalization and least-squares geometry, not a numerical solver recommendation. */
import { add, div, isZero, mul, sub, toNumber, ZERO, type Rational } from '../quantity/rational';
import { rootOf } from '../quantity/root';
import { column, multiplyMatrices, multiplyVector, sameVector, transpose, type ExactVector, type Matrix } from './matrices';
import { eliminate, solveExact } from './elimination';
export const inner = (a: ExactVector, b: ExactVector): Rational => {
  if (a.length !== b.length) throw new RangeError('Dot products require matching dimensions.');
  return a.reduce((sum, value, j) => add(sum, mul(value, b[j]!)), ZERO);
};
export function gramSchmidt(vectors: readonly ExactVector[]) {
  if (!vectors.length || vectors.length > 4 || vectors.some(v => v.length !== vectors[0]!.length || v.length < 1 || v.length > 4)) throw new RangeError('Gram–Schmidt supports 1–4 vectors of the same small dimension.');
  const orthogonal: ExactVector[] = [], frames = [], failures: { index: number; kind: 'zero' | 'dependent' }[] = [];
  for (const [index, vector] of vectors.entries()) {
    let residual = [...vector];
    frames.push({ index, phase: 'start' as const, residual: [...residual], onto: null, coefficient: null });
    for (const [j, direction] of orthogonal.entries()) {
      const coefficient = div(inner(residual, direction), inner(direction, direction));
      residual = residual.map((x, k) => sub(x, mul(coefficient, direction[k]!)));
      frames.push({ index, phase: 'subtract' as const, residual: [...residual], onto: j, coefficient });
    }
    if (residual.every(isZero)) { failures.push({ index, kind: vector.every(isZero) ? 'zero' : 'dependent' }); continue; }
    orthogonal.push(residual);
  }
  const lengths = orthogonal.map(v => rootOf(inner(v, v), 2));
  const orthonormal = orthogonal.map(v => { const h = Math.hypot(...v.map(toNumber)); return v.map(x => toNumber(x)/h); });
  return { orthogonal, orthonormal, lengths, failures, frames };
}

export function leastSquares(a: Matrix, b: ExactVector) {
  if (a.rows !== b.length) throw new RangeError('The data vector must have one entry per equation.');
  const columns = Array.from({ length: a.cols }, (_, j) => column(a, j));
  const gs = gramSchmidt(columns);
  const coefficients = gs.orthogonal.map(u => div(inner(b, u), inner(u, u)));
  const projected = b.map((_, i) => gs.orthogonal.reduce((sum, u, j) => add(sum, mul(coefficients[j]!, u[i]!)), ZERO));
  const residual = b.map((x, i) => sub(x, projected[i]!));
  const solution = solveExact(a, projected);
  const x = solution.particular;
  if (!x || !solution.verified) throw new Error('Projection must belong to the column space.');
  const at = transpose(a), gram = multiplyMatrices(at, a), rhs = multiplyVector(at, b), orthogonality = multiplyVector(at, residual);
  if (!gram.ok || !rhs.ok || !orthogonality.ok) throw new Error('Validated least-squares shapes are incompatible.');
  const normal = solveExact(gram.value, rhs.value);
  const exact = residual.every(isZero);
  const separation = a.cols === 2 && gs.orthogonal.length === 2
    ? Math.sqrt(toNumber(inner(gs.orthogonal[1]!, gs.orthogonal[1]!)) / toNumber(inner(columns[1]!, columns[1]!))) : null;
  // A 0.05 relative orthogonal remainder is a visible teaching cue, never a rank tolerance.
  const warning = separation !== null && separation < 0.05 ? 'Columns are close to dependent: coefficients are sensitive, and normal equations square the 2-norm condition number. Exact rank is unchanged.' : null;
  return { a, b, gs, coefficients, projected, residual, objective: inner(residual, residual), x,
    separation, warning, nullspace: solution.nullspace, rank: solution.rank, unique: solution.fullColumnRank, exact,
    orthogonality: orthogonality.value, gram: gram.value, normalRhs: rhs.value, normal,
    normalVerified: normal.particular !== null && sameVector(normal.particular, x),
    elimination: eliminate(a), trace: solution.frames };
}
