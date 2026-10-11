import { expect, it } from 'vitest';
import { eigen2, EIGEN_TOLERANCE, repeatAction, testEigenvector } from '../../src/math/linear-algebra/eigenvalues';
import { exactVector, matrix } from '../../src/math/linear-algebra/matrices';
import { rational } from '../../src/math/quantity/rational';
it('characteristic literals and all real eigenspace classes', () => {
  const d = eigen2(matrix([[2,0],[0,-1]])); expect(d.trace).toEqual(rational(1n));expect(d.determinant).toEqual(rational(-2n));expect(d.discriminant).toEqual(rational(9n));
  expect(d.pairs.map(p=>p.value)).toEqual([2,-1]);
  expect(eigen2(matrix([[1,1],[0,1]])).kind).toBe('defective');expect(eigen2(matrix([[1,1],[0,1]])).pairs).toHaveLength(1);
  expect(eigen2(matrix([[2,0],[0,2]])).kind).toBe('scalar');
  expect(eigen2(matrix([[0,-1],[1,0]])).pairs).toEqual([]);expect(eigen2(matrix([[0,-1],[1,0]])).kind).toBe('no-real');
  expect(eigen2(matrix([[2,0],[0,0]])).pairs.map(p=>p.value)).toEqual([2,0]);
});
it('eigenvectors are nonzero, with positive, negative and zero gains', () => {
  const a = matrix([[2,0],[0,-1]]);
  expect(testEigenvector(a,exactVector([0,0])).nonzero).toBe(false);
  expect(testEigenvector(a,exactVector([0,3])).value).toEqual(rational(-1n));
  expect(testEigenvector(a,exactVector([1,1])).onLine).toBe(false);
  expect(testEigenvector(matrix([[2,0],[0,0]]),exactVector([0,1])).value).toEqual(rational(0n));
});
it('radical values have checked unit-vector companions, never invented exact vectors', () => {
  const d=eigen2(matrix([[0,2],[1,0]]));expect(d.root.kind).toBe('exact');
  expect(d.pairs[0]!.value).toBeCloseTo(Math.sqrt(2),14);
  expect(d.pairs.every(p=>p.direction===null&&p.relativeResidual<=EIGEN_TOLERANCE)).toBe(true);
});
it('repeated action retains literal exact states and validates bounds', () => {
  expect(repeatAction(matrix([[2,0],[0,-1]]),exactVector([1,1]),3)).toEqual([[1,1],[2,-1],[4,1],[8,-1]].map(exactVector));
  expect(()=>repeatAction(matrix([[1]]),exactVector([1]),7)).toThrow();expect(()=>eigen2(matrix([[1]]))).toThrow();
});
