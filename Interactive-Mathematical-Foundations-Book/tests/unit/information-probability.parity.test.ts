import { readFileSync } from 'node:fs';
import {it,expect} from 'vitest';
import {rational as q} from '../../src/math/quantity/rational';
import {probabilityProduct,selfInformation,entropy,distribution} from '../../src/math/information-theory/probabilities';
const fixture=JSON.parse(readFileSync(new URL('../../fixtures/information_probability.fixtures.json',import.meta.url),'utf8'));
const exact=(p:{num:bigint;den:bigint})=>`${p.num}/${p.den}`;
let worst=0;
function close(actual:number,expected:number|string){if(typeof expected==='string'){expect(actual).toBe(expected==='Infinity'?Infinity:-Infinity);return;}const error=Math.abs(actual-expected)/Math.max(1,Math.abs(expected));worst=Math.max(worst,error);expect(error).toBeLessThanOrEqual(2e-12);}
it('matches Fraction/Decimal100 independent sources within the declared numerical budget',()=>{
  for(const c of fixture.products){const d=probabilityProduct(c.input);expect(exact(d.exact)).toBe(c.expected.exact);close(d.logLikelihood,c.expected.logLikelihood);expect(d.exact.num===0n).toBe(c.expected.status==='impossible');}
  for(const c of fixture.surprises){const [n,d='1']=c.input.p.split('/');close(selfInformation(q(BigInt(n),BigInt(d)),c.input.unit),c.expected);}
  for(const c of fixture.entropies){const d=entropy(distribution(c.input.weights),c.input.unit);expect(d.masses.map(exact)).toEqual(c.expected.masses);d.terms.forEach((x,i)=>close(x,c.expected.terms[i]));d.information.forEach((x,i)=>close(x,c.expected.information[i]));close(d.value,c.expected.value);}
  console.info('information_probability worst scaled absolute error',worst);
});
