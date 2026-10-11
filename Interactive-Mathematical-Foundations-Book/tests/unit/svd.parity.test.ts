import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {matrix} from '../../src/math/linear-algebra/matrices';
import {action2,svd2,svdAction,SVD_TOLERANCE} from '../../src/math/linear-algebra/svd';
const fixture=JSON.parse(readFileSync('fixtures/svd.fixtures.json','utf8'));
for(const[i,c]of fixture.cases.entries())it(`independent NumPy/Decimal SVD ${i}`,()=>{
 const d=svd2(matrix(c.a)),scale=Math.max(1,Math.hypot(...c.a.flat()));expect(d.rank).toBe(c.expected.rank);expect(d.repeated).toBe(c.expected.repeated);expect(d.reliable).toBe(true);
 for(let j=0;j<2;j++)expect(Math.abs(d.singular[j]!-c.expected.singular[j]!)).toBeLessThanOrEqual(SVD_TOLERANCE*scale);
 expect(d.singular[0]).toBeGreaterThanOrEqual(d.singular[1]);expect(d.singular[1]).toBeGreaterThanOrEqual(0);
 expect(d.relativeReconstructionError).toBeLessThanOrEqual(SVD_TOLERANCE);expect(d.uOrthogonality).toBeLessThanOrEqual(SVD_TOLERANCE);expect(d.vOrthogonality).toBeLessThanOrEqual(SVD_TOLERANCE);
 expect(Math.abs(d.rankOneError-c.expected.singular[1])).toBeLessThanOrEqual(SVD_TOLERANCE*scale);
 const a=svdAction(d,[.5,-1]);expect(a.error).toBeLessThanOrEqual(SVD_TOLERANCE*scale*2);
 if(a.recovered){const back=action2(d.numeric,a.recovered);expect(Math.hypot(back[0]-a.direct[0],back[1]-a.direct[1])).toBeLessThanOrEqual(SVD_TOLERANCE*scale*Math.max(1,d.rank===2?d.condition:1)*2);}
});
