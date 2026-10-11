import { expect, it } from 'vitest';
import { gramSchmidt, inner, leastSquares } from '../../src/math/linear-algebra/least-squares';
import { exactVector, matrix } from '../../src/math/linear-algebra/matrices';
import { rational } from '../../src/math/quantity/rational';
it('literal three-point projection and exact normal orthogonality',()=>{
  const d=leastSquares(matrix([[1,-1],[1,0],[1,1]]),exactVector([0,2,2]));
  expect(d.x).toEqual([rational(4n,3n),rational(1n)]);expect(d.projected).toEqual([rational(1n,3n),rational(4n,3n),rational(7n,3n)]);
  expect(d.residual).toEqual([rational(-1n,3n),rational(2n,3n),rational(-1n,3n)]);expect(d.objective).toEqual(rational(2n,3n));
  expect(d.orthogonality.every(x=>x.num===0n)).toBe(true);expect(d.normalVerified).toBe(true);expect(d.unique).toBe(true);expect(d.exact).toBe(false);
});
it('Gram–Schmidt distinguishes dependent and zero-vector failures without division by zero',()=>{
  const d=gramSchmidt([exactVector([1,1]),exactVector([1,0])]);expect(d.orthogonal).toEqual([exactVector([1,1]),exactVector([.5,-.5])]);
  expect(inner(d.orthogonal[0]!,d.orthogonal[1]!)).toEqual(rational(0n));
  const failed=gramSchmidt([exactVector([0,0]),exactVector([1,1]),exactVector([2,2])]);
  expect(failed.failures).toEqual([{index:0,kind:'zero'},{index:2,kind:'dependent'}]);expect(failed.orthogonal).toHaveLength(1);
});
it('nonunique minimizers differ only by null directions; projected outputs remain unique',()=>{
  const d=leastSquares(matrix([[1,1],[1,1],[1,1]]),exactVector([0,2,2]));expect(d.unique).toBe(false);expect(d.x).toEqual([rational(4n,3n),rational(0n)]);expect(d.nullspace).toEqual([exactVector([-1,1])]);
  expect(d.objective).toEqual(rational(8n,3n));
  expect(leastSquares(matrix([[0,0],[0,0]]),exactVector([1,2])).x).toEqual(exactVector([0,0]));
});
it('exact solutions are a special zero-residual minimum and shapes are validated',()=>{
  expect(leastSquares(matrix([[1,-1],[1,0],[1,1]]),exactVector([0,1,2])).exact).toBe(true);
  expect(()=>gramSchmidt([])).toThrow();expect(()=>gramSchmidt([exactVector([1]),exactVector([1,2])])).toThrow();
  expect(()=>leastSquares(matrix([[1],[1]]),exactVector([1]))).toThrow();
});
