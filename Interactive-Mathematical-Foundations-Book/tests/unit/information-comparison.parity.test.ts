import {readFileSync} from 'node:fs';
import {it,expect} from 'vitest';
import {rational as q} from '../../src/math/quantity/rational';
import {compareDistributions} from '../../src/math/information-theory/comparison';
const f=JSON.parse(readFileSync(new URL('../../fixtures/information_comparison.fixtures.json',import.meta.url),'utf8'));
const parse=(s:string)=>{const [n,d='1']=s.split('/');return q(BigInt(n!),BigInt(d));};
it('matches exact-source Decimal100 identity and independent log-difference terms',()=>{let worst=0;const close=(actual:number,expected:number|string)=>{if(expected==='Infinity'){expect(actual).toBe(Infinity);return;}const e=Math.abs(actual-(expected as number))/Math.max(1,Math.abs(expected as number));worst=Math.max(worst,e);expect(e).toBeLessThanOrEqual(2e-12);};for(const c of f.cases){const d=compareDistributions(c.input.p.map(parse),c.input.q.map(parse),c.input.unit);for(const field of ['entropy','cross','kl'] as const)close(d[field],c.expected[field]);for(const field of ['crossTerms','klTerms'] as const)d[field].forEach((x,i)=>close(x,c.expected[field][i]));}console.info('information_comparison worst scaled absolute error',worst);});
