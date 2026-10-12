import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { sampling, summarize } from '../../src/math/statistics/data';
const fixtures=JSON.parse(readFileSync('fixtures/statistics_data.fixtures.json','utf8'));
const f=(x:{num:bigint;den:bigint}|null)=>x===null?null:`${x.num}/${x.den}`;
it('independent Python pairwise finite summaries: exact parity',()=>{for(const c of fixtures.summaries){const d=summarize(c.values);expect({mean:f(d.mean),median:f(d.median),mad:f(d.mad),variance:f(d.variance),sampleVariance:f(d.sampleVariance),modes:d.modes.map(f),ordered:d.ordered.map(f)}).toEqual(c.expected);}});
it('integer-index Python sampling and exact empirical identities: complete bounded replay parity',()=>{for(const c of fixtures.sampling){const d=sampling(c.input),e=c.expected;expect(d.samples).toEqual(e.samples);expect(d.estimates.map(f)).toEqual(e.estimates);for(const k of ['empiricalMean','bias','empiricalVariance','mse','theoreticalBias','theoreticalVariance','theoreticalMse'] as const)expect(f(d[k]),k).toBe(e[k]);}});
