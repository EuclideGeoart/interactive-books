import {readFileSync} from 'node:fs';
import {it,expect} from 'vitest';
import {softmaxPipeline,NORMALIZATION_BUDGET} from '../../src/math/information-theory/softmax';
import {sequenceLoss} from '../../src/math/information-theory/tokens';
const f=JSON.parse(readFileSync(new URL('../../fixtures/information_logits.fixtures.json',import.meta.url),'utf8'));
const parse=(x:number|string)=>x==='-Infinity'?-Infinity:x==='Infinity'?Infinity:x==='NaN'?NaN:x as number;
it('matches independent raw Decimal400 computations and analytic enormous cases',()=>{let worst=0,worstProbability=0;const close=(a:number,e:number|string,prob=false)=>{if(typeof e==='string'){expect(a).toBe(e==='Infinity'?Infinity:-Infinity);return;}const error=Math.abs(a-e)/(prob?1:Math.max(1,Math.abs(e)));if(prob)worstProbability=Math.max(worstProbability,error);else worst=Math.max(worst,error);expect(error).toBeLessThanOrEqual(prob?2e-14:2e-12);};
  for(const c of f.logits){const d=softmaxPipeline(c.input.map(parse));expect(d.status).toBe(c.expected.status);if(d.status==='valid'){expect(d.max).toBe(c.expected.max);close(d.denominator,c.expected.denominator);close(d.logsumexp,c.expected.logsumexp);d.shiftedExponentials.forEach((x,i)=>close(x,c.expected.shiftedExponentials[i]));d.logProbabilities.forEach((x,i)=>close(x,c.expected.logProbabilities[i]));d.probabilities.forEach((x,i)=>close(x,c.expected.probabilities[i],true));expect(d.normalizationError).toBeLessThanOrEqual(NORMALIZATION_BUDGET);}}
  for(const c of f.sequences){const d=sequenceLoss(c.input.map((p:{logits:(number|string)[];target:number;ignored:boolean})=>({...p,logits:p.logits.map(parse)})));expect(d.count).toBe(c.expected.count);close(d.total,c.expected.total);if(c.expected.mean===null)expect(d.mean).toBeNull();else close(d.mean!,c.expected.mean);d.rows.forEach((row,i)=>{close(row.nll,c.expected.losses[i]);row.oneHotTerms.forEach((x,j)=>close(x,c.expected.oneHotTerms[i][j]));});}
  console.info('information_logits worst scaled log error',worst,'worst probability absolute error',worstProbability);
});
