import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {inference} from '../../src/math/statistics/likelihood';
const fixtures=JSON.parse(readFileSync('fixtures/statistics_likelihood.fixtures.json','utf8'));
const f=(x:{num:bigint;den:bigint}|null)=>x===null?null:`${x.num}/${x.den}`;
let worst=0;const near=(a:number,b:number)=>{const err=Math.abs(a-b)/Math.max(1,Math.abs(b));worst=Math.max(worst,err);expect(err).toBeLessThanOrEqual(2e-12);};
const logNear=(a:number,b:number|string)=>typeof b==='string'?expect(a).toBe(b==='Infinity'?Infinity:-Infinity):near(a,b);
it('independent products, log(product), analytic maxima and lgamma-normalized Beta posteriors',()=>{for(const c of fixtures.cases){const d=inference(c.input),e=c.expected;expect([d.n,d.k,d.a,d.b]).toEqual([e.n,e.k,e.a,e.b]);expect(f(d.likelihood)).toBe(e.likelihood);expect(f(d.maxLikelihood)).toBe(e.maxLikelihood);expect(f(d.mle)).toBe(e.mle);expect(f(d.posteriorMean)).toBe(e.posteriorMean);expect({kind:d.mode.kind,modes:d.mode.modes.map(f)}).toEqual(e.mode);logNear(d.logLikelihood,e.logLikelihood);logNear(d.logGap,e.logGap);near(d.maxLogLikelihood,e.maxLogLikelihood);near(d.evidence,e.evidence);for(const k of ['prior','posterior','unnormalized'] as const){expect(d[k].kind).toBe(e[k].kind);if(e[k].value===null)expect(d[k].value).toBeNull();else near(d[k].value!,e[k].value);logNear(d[k].log,e[k].log);}}console.info('Statistics likelihood worst scaled binary64 error:',worst);});
