/** The independent Python oracle owns these expectations; statuses/nulls/zeros remain exact. */
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {evaluateObjective, type ObjectiveId} from '../../src/math/optimization/objectives';
import {fromDecimal} from '../../src/math/quantity/rational';
import {descentTrace} from '../../src/math/optimization/descent';
const f=JSON.parse(readFileSync('fixtures/optimization_landscapes.fixtures.json','utf8'));
let worst=0;
function check(actual:any,expected:any):void {
 if(Array.isArray(expected)){expect(actual).toHaveLength(expected.length);expected.forEach((e,i)=>check(actual[i],e));}
 else if(typeof expected==='number'){
  if(expected===0)expect(actual+0).toBe(0);
  else{const ulp=Number.EPSILON*2**Math.floor(Math.log2(Math.max(1,Math.abs(expected))));const error=Math.abs(actual-expected)/ulp;worst=Math.max(worst,error);expect(error).toBeLessThanOrEqual(f.policy.tolerance.ulps);}
 }else expect(actual).toEqual(expected);
}
describe('Python-owned Optimization landscape parity',()=>{
 for(const [i,c] of f.cases.entries())it(`objective case ${i}: ${c.objective} (${c.point})`,()=>{
  const config={objective:c.objective as ObjectiveId,a:c.a??1,center:c.center??0};
  if(config.a<=0||!fromDecimal(config.a,2)||!fromDecimal(config.center,2)) {expect(()=>evaluateObjective(config,c.point)).toThrow();return;}
  const e=evaluateObjective(config,c.point);for(const key of ['status','loss','gradient','hessian'] as const)check(e[key],c.expected[key]);
 });
 for(const c of f.descent)it('exact dyadic quadratic closed form agrees with actual updates',()=>{
  const t=descentTrace({objective:'quadratic',a:1,center:0,start:c.start,eta:c.eta,iterations:c.steps});
  const val=(s:string)=>{const [n,d]=s.split('/').map(Number);return n!/d!;};
  c.expected.slice(0,-1).forEach((e:any,i:number)=>{const v=t.frames[i]!.state;expect(v.point).toEqual(e.point.map(val));expect(v.loss).toBe(val(e.loss));expect(v.gradient).toEqual(e.gradient.map(val));});
  expect(t.final).toEqual(c.expected.at(-1).point.map(val));
 });
 it('reports worst observed scaled-ulp error',()=>{console.info(`Optimization landscape parity worst observed error: ${worst} ulp(max(1, |expected|)); allowed ${f.policy.tolerance.ulps}.`);expect(worst).toBeLessThanOrEqual(f.policy.tolerance.ulps);});
});
