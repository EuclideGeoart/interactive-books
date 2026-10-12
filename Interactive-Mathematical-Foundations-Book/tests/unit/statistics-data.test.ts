import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { summarize, sampling } from '../../src/math/statistics/data';
import { DATA_CANONICAL, deriveDataLesson } from '../../src/lessons/statistics/data-lesson';
import { DATA_EXERCISES } from '../../src/lessons/statistics/data-exercises';
const f=(x:{num:bigint;den:bigint})=>`${x.num}/${x.den}`;
describe('Statistics data: hand-worked values, boundaries and synchronized views',()=>{
 it('summaries and exact centered identity',()=>{const d=summarize([1,2,2,3,7]);expect(f(d.mean)).toBe('3/1');expect(f(d.median)).toBe('2/1');expect(f(d.variance)).toBe('22/5');expect(f(d.sampleVariance!)).toBe('11/2');expect(d.modes.map(f)).toEqual(['2/1']);expect(f(d.mad)).toBe('1/1');});
 it('mode policies and singleton sample variance',()=>{expect(summarize([1,1,3,3]).modes.map(f)).toEqual(['1/1','3/1']);expect(summarize([1,2,3]).modeKind).toBe('no-repeat');expect(summarize([4]).sampleVariance).toBeNull();expect(f(summarize([4]).variance)).toBe('0/1');});
 it('literal seed, actual estimates and theoretical properties stay distinct',()=>{const d=sampling({...DATA_CANONICAL,repetitions:1});expect(d.samples).toEqual([[2,0,6,1]]);expect(d.estimates.map(f)).toEqual(['9/4']);expect(f(d.theoreticalVariance)).toBe('41/16');expect(f(d.empiricalVariance)).toBe('0/1');expect(f(d.bias)).toBe('-9/4');});
 it('biased samples never acquire the correct theoretical target by increasing n',()=>{for(const n of [1,4,32])expect(f(sampling({...DATA_CANONICAL,biased:true,n}).theoreticalBias)).toBe('3/1');});
 it('rejects invalid states before deriving output',()=>{for(const xs of [[],[21],[NaN],[.001],Array(25).fill(0)])expect(()=>summarize(xs)).toThrow();for(const patch of [{n:0},{n:33},{seed:-1},{seed:1.2},{repetitions:65},{offset:6},{offset:.001},{biased:'yes'}])expect(()=>sampling({...DATA_CANONICAL,...patch} as never)).toThrow();expect(()=>deriveDataLesson('summaries',{...DATA_CANONICAL,selected:99})).toThrow();});
 it('all views parse, geometry uses data, traces are detached frozen mathematics',()=>{for(const chapter of ['summaries','spread','sampling','estimators'] as const)for(const values of [[1,2,2,3,7],[4],[-20,20],[0,0]]){const state={...DATA_CANONICAL,values,selected:0};const d=deriveDataLesson(chapter,state);for(const tex of [...d.view.formulas,...d.view.trace.map(x=>x.state.formula)])expect(()=>katex.renderToString(tex,{throwOnError:true,strict:'error'}),tex).not.toThrow();expect(d.handle.x).toBe(values[0]);expect(Object.isFrozen(d.view.trace[0]!.state)).toBe(true);expect(d.view.description.length).toBeGreaterThan(30);}});
 it('20 exercises grade literal answers and give corrective feedback',()=>{
  const ex=Object.values(DATA_EXERCISES).flat();
  const answers=[['3','2','2'],['28/5','2'],['7/2'],[],[],['2/3','1'],['2','1'],['14','12'],[],[],['9/2','41/4'],['9/4'],['41/16'],[],[],['13/4'],['1','57/16'],['0','1','1'],[],[]];
  expect(ex).toHaveLength(20);expect(new Set(ex.map(x=>x.id)).size).toBe(20);
  for(const [i,e]of ex.entries()) {
   expect(e.grade({}).correct).toBe(false);expect(e.solution).toBeTruthy();
   if(e.choices) { expect(e.grade({choice:'correct'}).correct).toBe(true);for(const c of e.choices.slice(1))expect(e.grade({choice:c.id}).correct).toBe(false); }
   else { for(const wrong of ['999','1/0']) { const answer=Object.fromEntries(e.fields!.map(x=>[x.id,wrong]));expect(e.grade(answer).correct).toBe(false); } const answer=Object.fromEntries(e.fields!.map((x,j)=>[x.id,answers[i]![j]!]));expect(e.grade(answer).correct,e.id).toBe(true); }
  }
 });
});
