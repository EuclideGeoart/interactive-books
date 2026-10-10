import { expect,it } from 'vitest';
import { linearTrace,binaryTrace,fundamentalsTrace,elementaryTrace,compareElementary,finalState,searchSortInvariants,searchSortScene,stable,type SearchSortTrace } from '../../src/visualizers/search-sort/model';
function healthy(trace:SearchSortTrace){for(const s of [trace.initial,...trace.steps.map(x=>x.state)])expect(searchSortInvariants(s).filter(x=>x.status==='fail'),s.tag).toEqual([]);}
function arrays(length:number):number[][]{if(!length)return [[]];return arrays(length-1).flatMap(a=>[-1,0,1].map(x=>[...a,x]));}
const cases=[...Array.from({length:5},(_,n)=>arrays(n)).flat(),[-1000000,1000000,0],Array.from({length:12},(_,i)=>12-i)];
for(const [index,input] of cases.entries()){
  it(`independent search oracle ${index}`,()=>{
    for(const target of [-2,-1,0,1,2,1000000]){
      const linear=linearTrace(input,target);expect(finalState(linear).result).toBe(input.indexOf(target));healthy(linear);
      const sorted=[...input].sort((a,b)=>a-b),binary=binaryTrace(sorted,target),result=finalState(binary).result;
      expect(result>=0).toBe(sorted.includes(target));if(result>=0)expect(sorted[result]).toBe(target);healthy(binary);
      expect(finalState(linear).counts.comparisons).toBe(input.includes(target)?input.indexOf(target)+1:input.length);
    }
  });
  it(`independent sorting and inversion oracle ${index}`,()=>{
    for(const desc of [false,true]){
      const expected=input.map((key,id)=>({key,id})).sort((a,b)=>desc?b.key-a.key:a.key-b.key);
      for(const algorithm of ['bubble','selection','insertion'] as const){
        const trace=elementaryTrace(input,algorithm,desc),s=finalState(trace);
        expect(s.a.map(x=>x.key)).toEqual(expected.map(x=>x.key));
        if(algorithm!=='selection')expect(s.a).toEqual(expected);
        expect([...s.a].sort((a,b)=>a.id-b.id)).toEqual(input.map((key,id)=>({key,id})));healthy(trace);
      }
      const trace=fundamentalsTrace(input,desc),s=finalState(trace);
      const oracle=input.reduce((sum,key,i)=>sum+input.slice(i+1).filter(next=>desc?key<next:key>next).length,0);
      expect(s.inversions).toBe(oracle);expect(s.checked).toBe(input.length*Math.max(0,input.length-1)/2);healthy(trace);
    }
  });
}
it('selection instability is visible and bubble tie fault terminates',()=>{
  const s=finalState(elementaryTrace([2,2,1],'selection'));expect(stable(s.a)).toBe(false);
  const b=elementaryTrace([2,2,1],'bubble',false,true);expect(finalState(b).fault).toBe('unstable-ties');expect(searchSortInvariants(finalState(b)).some(x=>x.status==='fail')).toBe(true);
});
it('binary domain and update failures terminate with explicit invariant failure',()=>{
  for(const trace of [binaryTrace([3,1,2],2),binaryTrace([1,2,3,4,5],4,'update'),binaryTrace([1],2,'nonprogress')]){
    const s=finalState(trace);expect(s.done).toBe(true);expect(s.fault).not.toBe('');expect(trace.steps.length).toBeLessThan(10);expect(searchSortInvariants(s).some(x=>x.status==='fail')).toBe(true);
  }
});
it('counter formulas distinguish adaptive scans, selection scans and insertion shifts',()=>{
  for(let n=0;n<=12;n++){
    const a=Array.from({length:n},(_,i)=>i),rev=[...a].reverse();
    expect(finalState(elementaryTrace(a,'bubble')).counts.comparisons).toBe(Math.max(0,n-1));
    expect(finalState(elementaryTrace(a,'selection')).counts.comparisons).toBe(n*Math.max(0,n-1)/2);
    const s=finalState(elementaryTrace(rev,'insertion'));expect(s.counts.shifts).toBe(n*Math.max(0,n-1)/2);expect(s.counts.writes).toBe(s.counts.shifts+Math.max(0,n-1));
  }
});
it('insertion shift and cursor motion are distinct physical states',()=>{
  const trace=elementaryTrace([3,2,1],'insertion');const index=trace.steps.findIndex(x=>x.source==='insertion.shift');
  const shift=trace.steps[index]!.state,next=trace.steps[index+1]!.state;
  expect(shift.a.map(x=>x.key)).toEqual([3,3,1]);expect(shift.j).toBe(1);expect(next.j).toBe(0);expect(shift.held?.key).toBe(2);
  expect(searchSortScene(shift).rows.find(x=>x.id==='held')?.items[0]?.key).toBe(2);
});
it('snapshots are isolated, frozen and replay deterministic',()=>{
  const input=[3,1,2];const trace=elementaryTrace(input,'insertion');const copy=structuredClone(trace);input[0]=99;
  expect(trace).toEqual(copy);expect(trace).toEqual(elementaryTrace([3,1,2],'insertion'));
  expect(Object.isFrozen(trace.steps[0]!.state.a)).toBe(true);
});
it('comparative runs use identical records and expose meaningful teaching counts',()=>{
  const rows=compareElementary([2,2,1]);expect(rows.map(x=>x.algorithm)).toEqual(['bubble','selection','insertion']);
  expect(rows.map(x=>x.stable)).toEqual([true,false,true]);expect(rows.map(x=>x.adaptive)).toEqual([true,false,true]);
});
it('empty/single/duplicate policies and ascending/descending distinction',()=>{
  expect(finalState(binaryTrace([1,2,2,2,3],2)).result).toBe(2);
  expect(finalState(linearTrace([1,2,2,2,3],2)).result).toBe(1);
  expect(finalState(fundamentalsTrace([3,2,1],true)).inversions).toBe(0);
  expect(finalState(fundamentalsTrace([3,2,1])).inversions).toBe(3);
  expect(stable(finalState(fundamentalsTrace([2,1,2],false,[0,2])).a)).toBe(false);
});
it('bounded inputs reject invalid numbers and swap indices',()=>{
  for(const a of [[NaN],[Infinity],[1.5],[1000001],Array(65).fill(0)])expect(()=>linearTrace(a)).toThrow();
  expect(()=>fundamentalsTrace([],false,[0,0])).toThrow();expect(()=>binaryTrace([1],NaN)).toThrow();
});
