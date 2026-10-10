import { expect, it } from 'vitest';
import { binaryTrace, elementaryTrace, finalState, linearTrace, searchSortInvariants } from '../../src/visualizers/search-sort/model';
import { advancedInvariants, countingTrace, heapSortTrace, mergeTrace, quickTrace, radixTrace } from '../../src/visualizers/sort-advanced/model';

// Exhaust all short arrays over a duplicate-rich alphabet. The oracle sorts
// independent {key,id} records with the platform stable sort, not chapter code.
const inputs:number[][]=[[]];
for(let n=1;n<=4;n++)for(let code=0;code<3**n;code++) {
  let digits=code;const a:number[]=[];for(let i=0;i<n;i++){a.push(digits%3);digits=Math.floor(digits/3);}inputs.push(a);
}
for(const input of inputs) {
  const label=JSON.stringify(input);
  const oracle=input.map((key,id)=>({key,id})).sort((a,b)=>a.key-b.key);
  for(const algorithm of ['bubble','selection','insertion'] as const)it(`${algorithm} exhaustive oracle ${label}`,()=>{
    const trace=elementaryTrace(input,algorithm),end=finalState(trace);
    expect(end.a.map(x=>x.key)).toEqual(oracle.map(x=>x.key));
    expect([...end.a].sort((a,b)=>a.id-b.id)).toEqual(input.map((key,id)=>({key,id})));
    if(algorithm!=='selection')expect(end.a).toEqual(oracle);
    for(const {state} of trace.steps)expect(searchSortInvariants(state).filter(r=>r.status==='fail')).toEqual([]);
  });
  for(const [name,run,isStable] of [['merge',mergeTrace,true],['quick',quickTrace,false],['heap',heapSortTrace,false],['counting',countingTrace,true],['radix',radixTrace,true]] as const)it(`${name} exhaustive oracle ${label}`,()=>{
    const trace=run(input),end=trace.steps.at(-1)!.state;
    expect(end.a.map(x=>x.key)).toEqual(oracle.map(x=>x.key));
    expect([...end.a].sort((a,b)=>a.id-b.id)).toEqual(input.map((key,id)=>({key,id})));
    if(isStable)expect(end.a).toEqual(oracle);
    for(const {state} of trace.steps)expect(advancedInvariants(state).filter(r=>r.status==='fail')).toEqual([]);
  });
  it(`search contracts exhaustive oracle ${label}`,()=>{
    for(const target of [-1,0,1,2,3]) {
      const linear=finalState(linearTrace(input,target));
      expect(linear.result).toBe(input.indexOf(target));
      expect(linear.counts.comparisons).toBe(linear.result<0?input.length:linear.result+1);
      const sorted=oracle.map(x=>x.key),binary=finalState(binaryTrace(sorted,target));
      expect(binary.result<0).toBe(!sorted.includes(target));
      if(binary.result>=0)expect(sorted[binary.result]).toBe(target);
      expect(binary.counts.comparisons).toBeLessThanOrEqual(2*Math.ceil(Math.log2(sorted.length+1)));
    }
  });
}
