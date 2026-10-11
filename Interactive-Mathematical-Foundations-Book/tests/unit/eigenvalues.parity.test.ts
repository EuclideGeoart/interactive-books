import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { eigen2, EIGEN_TOLERANCE } from '../../src/math/linear-algebra/eigenvalues';
import { matrix } from '../../src/math/linear-algebra/matrices';
const fixture=JSON.parse(readFileSync('fixtures/eigenvalues.fixtures.json','utf8'));
const str=(x:{num:bigint;den:bigint})=>x.den===1n?String(x.num):`${x.num}/${x.den}`;
for(const [i,c] of fixture.cases.entries())it(`independent characteristic/Decimal spectrum ${i}`,()=>{
  const d=eigen2(matrix(c.a)),e=c.expected;expect(d.kind).toBe(e.kind);expect(str(d.trace)).toBe(e.trace);expect(str(d.determinant)).toBe(e.determinant);expect(str(d.discriminant)).toBe(e.discriminant);
  expect(d.reliable).toBe(true);
  const scale=Math.max(1,Math.hypot(...c.a.flat()));
  for(const [j,p]of d.pairs.entries()) {expect(Math.abs(p.value-e.values[j]!)).toBeLessThanOrEqual(EIGEN_TOLERANCE*scale);expect(p.relativeResidual).toBeLessThanOrEqual(EIGEN_TOLERANCE);expect(Math.hypot(...p.unit)).toBeCloseTo(1,14);}
});
