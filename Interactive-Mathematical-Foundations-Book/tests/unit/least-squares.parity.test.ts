import { readFileSync } from 'node:fs';
import { expect,it } from 'vitest';
import { leastSquares } from '../../src/math/linear-algebra/least-squares';
import { matrix,exactVector,type ExactVector } from '../../src/math/linear-algebra/matrices';
const value=(v:ExactVector)=>v.map(x=>x.den===1n?String(x.num):`${x.num}/${x.den}`);
const fixture=JSON.parse(readFileSync('fixtures/least_squares.fixtures.json','utf8'));
for(const[i,c]of fixture.cases.entries())it(`independent exact normal-equation oracle ${i}`,()=>{
 const d=leastSquares(matrix(c.a),exactVector(c.b)),e=c.expected;expect(d.rank).toBe(e.rank);expect(d.unique).toBe(e.unique);expect(value(d.x)).toEqual(e.x);expect(d.nullspace.map(value)).toEqual(e.nullspace);
 expect(value(d.projected)).toEqual(e.projected);expect(value(d.residual)).toEqual(e.residual);expect(value([d.objective])[0]).toBe(e.objective);expect(d.orthogonality.every(x=>x.num===0n)).toBe(true);expect(d.normalVerified).toBe(true);
});
