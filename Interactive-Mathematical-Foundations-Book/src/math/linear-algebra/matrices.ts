/** Small exact matrices for II.8–II.13. This is deliberately not a tensor library. */
import { add, div, eq, fromDecimal, isZero, mul, rational, sub, ZERO, type Rational } from '../quantity/rational';

export interface Matrix {
  readonly rows: number;
  readonly cols: number;
  readonly values: readonly (readonly Rational[])[];
}
export type ExactVector = readonly Rational[];
export type Product<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reason: string };

const MAX_DIMENSION = 4;
const exactDecimal = (value: number): Rational => {
  const result = fromDecimal(value, 2);
  if (!result || Math.abs(value) > 1e6) throw new RangeError('Entries must be finite decimals, at most two places, within ±1,000,000.');
  return result;
};
const fromRows = (values: readonly (readonly Rational[])[]): Matrix => ({ rows: values.length, cols: values[0]!.length, values });

export function matrix(values: readonly (readonly number[])[]): Matrix {
  const rows = values.length, cols = values[0]?.length ?? 0;
  if (rows < 1 || cols < 1 || rows > MAX_DIMENSION || cols > MAX_DIMENSION || values.some(row => row.length !== cols)) {
    throw new RangeError('A small matrix must be rectangular with 1–4 rows and 1–4 columns.');
  }
  return fromRows(values.map(row => row.map(exactDecimal)));
}

export function exactVector(values: readonly number[]): ExactVector {
  if (values.length < 1 || values.length > MAX_DIMENSION) throw new RangeError('A small vector must have 1–4 entries.');
  return values.map(exactDecimal);
}

export const shape = (a: Matrix): string => `${a.rows}×${a.cols}`;
export const sameVector = (a: ExactVector, b: ExactVector): boolean => a.length === b.length && a.every((x, i) => eq(x, b[i]!));
export const sameMatrix = (a: Matrix, b: Matrix): boolean => a.rows === b.rows && a.cols === b.cols && a.values.every((row, i) => row.every((x, j) => eq(x, b.values[i]![j]!)));
export const column = (a: Matrix, j: number): ExactVector => {
  if (!Number.isInteger(j) || j < 0 || j >= a.cols) throw new RangeError('Column index is outside the matrix.');
  return a.values.map(row => row[j]!);
};

export function addMatrices(a: Matrix, b: Matrix): Product<Matrix> {
  if (a.rows !== b.rows || a.cols !== b.cols) return { ok: false, reason: `Addition needs equal shapes; ${shape(a)} and ${shape(b)} are incompatible.` };
  return { ok: true, value: fromRows(a.values.map((row, i) => row.map((x, j) => add(x, b.values[i]![j]!)))) };
}

export const scaleMatrix = (k: Rational, a: Matrix): Matrix => fromRows(a.values.map(row => row.map(x => mul(k, x))));

export function multiplyVector(a: Matrix, x: ExactVector): Product<ExactVector> {
  if (a.cols !== x.length) return { ok: false, reason: `${shape(a)} · ${x.length}×1 is undefined: the inner dimensions ${a.cols} and ${x.length} do not match.` };
  return { ok: true, value: a.values.map(row => row.reduce((sum, value, j) => add(sum, mul(value, x[j]!)), ZERO)) };
}

export function multiplyMatrices(left: Matrix, right: Matrix): Product<Matrix> {
  if (left.cols !== right.rows) return { ok: false, reason: `${shape(left)} · ${shape(right)} is undefined: the inner dimensions ${left.cols} and ${right.rows} do not match.` };
  const values = Array.from({ length: left.rows }, (_, i) => Array.from({ length: right.cols }, (_, j) =>
    left.values[i]!.reduce((sum, value, k) => add(sum, mul(value, right.values[k]![j]!)), ZERO),
  ));
  return { ok: true, value: fromRows(values) };
}

export const transpose = (a: Matrix): Matrix => fromRows(Array.from({ length: a.cols }, (_, j) => a.values.map(row => row[j]!)));
export const identity = (n: number): Matrix => {
  if (!Number.isInteger(n) || n < 1 || n > MAX_DIMENSION) throw new RangeError('Identity size must be 1–4.');
  return fromRows(Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => rational(i === j ? 1n : 0n))));
};

export function determinant2(a: Matrix): Rational {
  if (a.rows !== 2 || a.cols !== 2) throw new RangeError('This milestone defines determinant geometry only for 2×2 matrices.');
  return sub(mul(a.values[0]![0]!, a.values[1]![1]!), mul(a.values[0]![1]!, a.values[1]![0]!));
}

export function orthogonal2(q: Matrix): boolean {
  if (q.rows !== 2 || q.cols !== 2) return false;
  const product = multiplyMatrices(transpose(q), q);
  return product.ok && sameMatrix(product.value, identity(2));
}

export function affine2(a: Matrix, x: ExactVector, translation: ExactVector): Product<ExactVector> {
  const linear = multiplyVector(a, x);
  if (!linear.ok) return linear;
  if (linear.value.length !== translation.length) return { ok: false, reason: `Translation length ${translation.length} does not match output length ${linear.value.length}.` };
  return { ok: true, value: linear.value.map((value, i) => add(value, translation[i]!)) };
}

export type System2Result =
  | { readonly kind: 'unique'; readonly determinant: Rational; readonly solution: readonly [Rational, Rational] }
  | { readonly kind: 'none'; readonly determinant: Rational; readonly reason: string }
  | { readonly kind: 'infinite'; readonly determinant: Rational; readonly reason: string };

/** Exact classification of two equations in two unknowns, including zero rows. */
export function solveSystem2(a: Matrix, rhs: ExactVector): System2Result {
  if (a.rows !== 2 || a.cols !== 2 || rhs.length !== 2) throw new RangeError('solveSystem2 expects a 2×2 coefficient matrix and two right-hand sides.');
  const [[p, q], [r, s]] = a.values as readonly [readonly [Rational, Rational], readonly [Rational, Rational]];
  const [u, v] = rhs as readonly [Rational, Rational];
  const determinant = sub(mul(p, s), mul(q, r));
  if (!isZero(determinant)) {
    const xNumerator = sub(mul(u, s), mul(q, v));
    const yNumerator = sub(mul(p, v), mul(u, r));
    return {
      kind: 'unique', determinant,
      solution: [div(xNumerator, determinant), div(yNumerator, determinant)],
    };
  }
  const coefficientZero = [p, q, r, s].every(isZero);
  if (coefficientZero) {
    return isZero(u) && isZero(v)
      ? { kind: 'infinite', determinant, reason: 'Both rows are 0 = 0, so every point satisfies the system.' }
      : { kind: 'none', determinant, reason: 'A zero row claims 0 equals a nonzero value, so the system is inconsistent.' };
  }
  const consistent = isZero(sub(mul(p, v), mul(r, u))) && isZero(sub(mul(q, v), mul(s, u)));
  return consistent
    ? { kind: 'infinite', determinant, reason: 'The two equations describe the same constraint, so every point on that line is a solution.' }
    : { kind: 'none', determinant, reason: 'The constraints are parallel but distinct, so they never meet.' };
}
