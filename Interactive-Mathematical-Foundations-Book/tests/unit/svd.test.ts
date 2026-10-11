import {expect,it} from 'vitest';
import {matrix} from '../../src/math/linear-algebra/matrices';
import {action2,product2,svd2,svdAction,svdCircle,transpose2,SVD_TOLERANCE} from '../../src/math/linear-algebra/svd';
it('literal reflection factors reconstruct diag(3,−1) in three visible actions',()=>{
 const d=svd2(matrix([[3,0],[0,-1]]));expect(d.singular).toEqual([3,1]);expect(d.rank).toBe(2);expect(d.U).toEqual([[1,0],[0,-1]]);
 const a=svdAction(d,[2,1]);expect(a.oriented).toEqual([2,1]);expect(a.scaled).toEqual([6,1]);expect(a.output).toEqual([6,-1]);expect(a.recovered).toEqual([2,1]);expect(a.error).toBe(0);
});
it('rank one preserves one input component and its pseudoinverse returns the minimum-norm input',()=>{
 const d=svd2(matrix([[1,2],[2,4]]));expect(d.rank).toBe(1);expect(d.singular[0]).toBeCloseTo(5,14);expect(d.singular[1]).toBe(0);
 const recovered=svdAction(d,[1,1]).recovered!;expect(recovered[0]).toBeCloseTo(.6,14);expect(recovered[1]).toBeCloseTo(1.2,14);
 expect(action2(d.numeric,recovered)[0]).toBeCloseTo(3,14);expect(action2(d.numeric,recovered)[1]).toBeCloseTo(6,14);
 for(const t of [-5,-.5,.5,5])expect(Math.hypot(recovered[0]-2*t,recovered[1]+t)).toBeGreaterThan(Math.hypot(...recovered));
 expect(d.rankOneError).toBeLessThan(SVD_TOLERANCE*5);
});
it('zero and repeated values use honest nonunique orthogonal completions, never reciprocal zero',()=>{
 const zero=svd2(matrix([[0,0],[0,0]]));expect(zero.singular).toEqual([0,0]);expect(zero.pseudoinverse).toEqual([[0,0],[0,0]]);expect(svdAction(zero,[1,2]).recovered).toEqual([0,0]);
 for(const a of [[[2,0],[0,2]],[[0,2],[2,0]],[[.01,.02],[-.02,.01]]]){const d=svd2(matrix(a));expect(d.repeated).toBe(true);expect(d.singular[0]).toBe(d.singular[1]);expect(d.reliable).toBe(true);}
});
it('tiny exact nonzero determinants remain rank two, with numerical recovery guarded separately',()=>{
 const near=svd2(matrix([[4,3.99],[3.99,3.98]]));expect(near.rank).toBe(2);expect(near.singular[1]).toBeGreaterThan(0);expect(near.warning).toContain('Ill-conditioned');expect(near.recoveryReliable).toBe(true);
 const extreme=svd2(matrix([[1000000,999999.99],[999999.99,999999.98]]));expect(extreme.rank).toBe(2);expect(extreme.reliable).toBe(true);expect(extreme.singular[1]).toBeGreaterThan(0);expect(extreme.pseudoinverse).toBeNull();expect(extreme.warning).toContain('unreliable');
});
it('circle geometry is the composition at every sampled point and rejects unsupported shapes',()=>{
 const d=svd2(matrix([[3,1],[0,1]])),c=svdCircle(d);expect(c.input).toHaveLength(65);
 for(let i=0;i<c.input.length;i++){expect(Math.hypot(...c.oriented[i]!)).toBeCloseTo(1,14);expect(Math.hypot(c.direct[i]![0]-c.output[i]![0],c.direct[i]![1]-c.output[i]![1])).toBeLessThan(SVD_TOLERANCE*4);}
 expect(product2(transpose2(d.U),d.U)[0][0]).toBeCloseTo(1,14);expect(()=>svd2(matrix([[1,2,3],[4,5,6]]))).toThrow(/2×2/);
});
