import { describe, expect, it } from 'vitest';
import {
  addMatrices, affine2, column, determinant2, exactVector, identity, matrix, multiplyMatrices,
  multiplyVector, orthogonal2, sameMatrix, sameVector, scaleMatrix, shape, solveSystem2, transpose,
} from '../../src/math/linear-algebra/matrices';
import { rational, toNumber } from '../../src/math/quantity/rational';

const numbers = (values: readonly ReturnType<typeof rational>[]) => values.map(toNumber);

describe('small exact matrix trust boundary and shapes', () => {
  it('accepts exact decimals and rejects ragged, oversized, nonfinite, or over-precise input', () => {
    expect(shape(matrix([[0.1, 0.2], [0.3, 0.4]]))).toBe('2×2');
    for (const values of [[], [[1], [1, 2]], Array.from({ length: 5 }, () => [1]), [[0.001]], [[Infinity]]]) {
      expect(() => matrix(values)).toThrow(RangeError);
    }
    expect(() => exactVector([])).toThrow(RangeError);
    expect(() => exactVector([1, 2, 3, 4, 5])).toThrow(RangeError);
  });

  it('adds and scales only compatible shapes', () => {
    const a = matrix([[1, 2], [3, 4]]), b = matrix([[0.5, -2], [1, 0]]);
    const sum = addMatrices(a, b);
    expect(sum.ok && sum.value.values.map(numbers)).toEqual([[1.5, 0], [4, 4]]);
    expect(scaleMatrix(rational(-2n), a).values.map(numbers)).toEqual([[-2, -4], [-6, -8]]);
    expect(addMatrices(a, matrix([[1, 2, 3]])).ok).toBe(false);
  });
});

describe('matrix action and composition', () => {
  it('makes row arithmetic and column combinations the same exact result', () => {
    const a = matrix([[2, -1], [1, 3]]), x = exactVector([4, 2]);
    const product = multiplyVector(a, x);
    expect(product.ok && numbers(product.value)).toEqual([6, 10]);
    const columns = [column(a, 0), column(a, 1)];
    expect(numbers(columns[0]!.map(v => ({ num: v.num * 4n, den: v.den })))).toEqual([8, 4]);
    expect(product.ok && sameVector(product.value, exactVector([6, 10]))).toBe(true);
  });

  it('supports rectangular products and reports incompatible dimensions explicitly', () => {
    const wide = matrix([[1, 2, 3], [0, -1, 2]]);
    const good = multiplyVector(wide, exactVector([2, 1, -1]));
    expect(good.ok && numbers(good.value)).toEqual([1, -3]);
    const bad = multiplyVector(wide, exactVector([2, 1]));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toContain('inner dimensions 3 and 2');
  });

  it('uses BA when A acts first, is noncommutative, and remains associative', () => {
    const a = matrix([[1, 1], [0, 1]]), b = matrix([[1, 0], [1, 1]]), x = exactVector([2, 1]);
    const ba = multiplyMatrices(b, a), ab = multiplyMatrices(a, b);
    expect(ba.ok && ba.value.values.map(numbers)).toEqual([[1, 1], [1, 2]]);
    expect(ab.ok && ab.value.values.map(numbers)).toEqual([[2, 1], [1, 1]]);
    expect(ba.ok && ab.ok && sameMatrix(ba.value, ab.value)).toBe(false);
    const ax = multiplyVector(a, x), sequential = ax.ok ? multiplyVector(b, ax.value) : ax;
    const combined = ba.ok ? multiplyVector(ba.value, x) : ba;
    expect(sequential.ok && combined.ok && sameVector(sequential.value, combined.value)).toBe(true);

    const left = matrix([[1, 2, 0], [0, 1, 1]]), middle = matrix([[1, 0], [2, 1], [-1, 3]]), right = matrix([[2, 1], [0, 1]]);
    const lm = multiplyMatrices(left, middle), mr = multiplyMatrices(middle, right);
    const lhs = lm.ok ? multiplyMatrices(lm.value, right) : lm;
    const rhs = mr.ok ? multiplyMatrices(left, mr.value) : mr;
    expect(lhs.ok && rhs.ok && sameMatrix(lhs.value, rhs.value)).toBe(true);
  });

  it('composes affine translation without moving the origin for a linear map', () => {
    const a = matrix([[2, 1], [0, 1]]), origin = exactVector([0, 0]), translation = exactVector([3, -2]);
    const linear = multiplyVector(a, origin), affine = affine2(a, origin, translation);
    expect(linear.ok && numbers(linear.value)).toEqual([0, 0]);
    expect(affine.ok && numbers(affine.value)).toEqual([3, -2]);
  });
});

describe('transpose, orthogonality, determinant, and systems', () => {
  it('recognizes exact rotations and reflections but not a shear', () => {
    const rotation = matrix([[0, -1], [1, 0]]), reflection = matrix([[1, 0], [0, -1]]), shear = matrix([[1, 1], [0, 1]]);
    expect(orthogonal2(rotation)).toBe(true);
    expect(orthogonal2(reflection)).toBe(true);
    expect(orthogonal2(shear)).toBe(false);
    const qtq = multiplyMatrices(transpose(rotation), rotation);
    expect(qtq.ok && sameMatrix(qtq.value, identity(2))).toBe(true);
  });

  it('keeps determinant sign, area scale, and singularity exact', () => {
    expect(toNumber(determinant2(matrix([[2, 1], [0, 3]])))).toBe(6);
    expect(toNumber(determinant2(matrix([[0, 1], [1, 0]])))).toBe(-1);
    expect(toNumber(determinant2(matrix([[1, 2], [2, 4]])))).toBe(0);
  });

  it('classifies unique, parallel, coincident, vertical, and degenerate zero-row systems', () => {
    const unique = solveSystem2(matrix([[1, 1], [1, -1]]), exactVector([3, 1]));
    expect(unique.kind).toBe('unique');
    if (unique.kind === 'unique') expect(numbers(unique.solution)).toEqual([2, 1]);
    const vertical = solveSystem2(matrix([[1, 0], [0, 1]]), exactVector([2, -3]));
    expect(vertical.kind).toBe('unique');
    const parallel = solveSystem2(matrix([[1, 1], [2, 2]]), exactVector([1, 3]));
    expect(parallel.kind).toBe('none');
    const coincident = solveSystem2(matrix([[1, 1], [2, 2]]), exactVector([1, 2]));
    expect(coincident.kind).toBe('infinite');
    expect(solveSystem2(matrix([[0, 0], [0, 0]]), exactVector([0, 0])).kind).toBe('infinite');
    expect(solveSystem2(matrix([[0, 0], [0, 0]]), exactVector([0, 1])).kind).toBe('none');
    expect(solveSystem2(matrix([[0, 0], [1, 0]]), exactVector([0, 2])).kind).toBe('infinite');
    expect(solveSystem2(matrix([[0, 0], [1, 0]]), exactVector([1, 2])).kind).toBe('none');
  });
});
