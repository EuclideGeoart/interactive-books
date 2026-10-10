import { expect, it } from 'vitest';
import { PlaybackController } from '../../src/engine/playback';
import { priorityState, priorityTrace, priorityOrder, priorityFault, priorityWork } from '../../src/visualizers/priority-queue/model';
import { priorityAdapter } from '../../src/visualizers/priority-queue/adapter';
import { heapState, heapTrace, heapViolations, heapParent, heapFault, heapHeight } from '../../src/visualizers/binary-heap/model';
import { heapAdapter, drawHeap } from '../../src/visualizers/binary-heap/adapter';
const end = <S>(trace: {steps:{state:S}[]})=>trace.steps.at(-1)!.state;
it('priority selects priority first and FIFO within ties in either direction',()=>{
  for(const higher of [true,false]) { let s=priorityState([{value:1,priority:5},{value:2,priority:5},{value:3,priority:9},{value:4,priority:2}],higher); const returned=[]; while(s.data.length){s=end(priorityTrace('extract',s));returned.push(s.result!.value);} expect(returned).toEqual(higher?[3,1,2,4]:[4,1,2,3]); }
});
it('peek is non-mutating; empty access returns a diagnostic without reading storage',()=>{
  const s=priorityState();expect(end(priorityTrace('peek',s)).data).toEqual(s.data);
  for(const op of ['peek','extract'] as const) {expect(end(priorityTrace(op,priorityState([]))).error).toMatch(/Underflow/);expect(end(heapTrace(op,heapState([]))).error).toMatch(/Underflow/);}
});
it('snapshots remain detached across append, swap, locals and counters; reverse is exact',()=>{
  const t=heapTrace('insert',heapState(),95), append=t.steps.find(s=>s.source==='hi.append')!, swapIndex=t.steps.findIndex(s=>s.source==='hu.swap'), swap=t.steps[swapIndex]!;
  expect(t.initial.data).toEqual([90,70,60,40,50,20]);expect(append.state.data).toEqual([90,70,60,40,50,20,95]);expect(append.state.i).toBeNull();expect(append.state.comparisons).toBe(0);
  expect(t.steps[swapIndex-1]!.state.data[6]).toBe(95);expect(t.steps[swapIndex-1]!.state.swaps).toBe(0);
  expect(swap.state.data).toEqual([90,70,95,40,50,20,60]);expect(swap.state.i).toBe(6);expect(swap.state.swaps).toBe(1);expect(end(t).data[0]).toBe(95);
  const player=new PlaybackController(t,()=>{});player.seek(swapIndex+1);expect(player.state).toEqual(swap.state);player.previous();expect(player.state).toEqual(t.steps[swapIndex-1]!.state);player.reset();expect(player.state).toEqual(t.initial);player.dispose();
  const p=priorityTrace('extract',priorityState());const start=p.steps.find(s=>s.source==='pb.start')!;expect(start.state.best).toBe(0);expect(start.state.cursor).toBeNull();expect(start.state.comparisons).toBe(0);expect(start.state.data).toHaveLength(4);expect(end(p).data).toHaveLength(3);
});
it('move-last exists in both slots before pop and singleton extract is safe',()=>{
  const t=heapTrace('extract',heapState());expect(t.steps.find(s=>s.source==='he.move')!.state.data).toEqual([20,70,60,40,50,20]);expect(t.steps.find(s=>s.source==='he.pop')!.state.data).toEqual([20,70,60,40,50]);expect(heapViolations(end(t))).toEqual([]);expect(end(heapTrace('extract',heapState([7]))).data).toEqual([]);
});
it('buildHeap and repeated extraction match a sorted oracle for bounded varied inputs',()=>{
  for(const max of [true,false]) for(let n=0;n<=15;n++) { const values=Array.from({length:n},(_,i)=>(i*17+n*7)%23-11);let s=end(heapTrace('build',heapState([],max),0,values));expect(heapViolations(s)).toEqual([]);const returned=[];while(s.data.length){s=end(heapTrace('extract',s));returned.push(s.result);}expect(returned).toEqual([...values].sort((a,b)=>max?b-a:a-b)); }
});
it('duplicate heap values stop sifting and are not promised FIFO identities',()=>{const t=heapTrace('insert',heapState([5,5,5]),5);expect(end(t).swaps).toBe(0);expect(end(t).data).toEqual([5,5,5,5]);});
it('tree and array share index selection and each swap event marks both views',()=>{
  const step=heapTrace('insert',heapState(),95).steps.find(s=>s.event.type==='Swap')!, svg=drawHeap(step.state,'test','logical','array:2',step.event);
  expect((svg.match(/data-node="(?:tree|array):2"/g)||[])).toHaveLength(2);expect((svg.match(/class="data-node selected active-node"/g)||[])).toHaveLength(2);expect(svg).toContain('data-heap-view="tree"');expect(svg).toContain('data-heap-view="array"');expect(heapParent(0)).toBeNull();expect(heapParent(6)).toBe(2);
});
it('all controlled faults violate their advertised rule',()=>{for(const f of ['parent','early','child'] as const)expect(heapViolations(heapFault(f).state).length).toBeGreaterThan(0);for(const f of ['fifo','ties','direction'] as const){const s=priorityFault(f);expect(s.selected).not.toBe(s.expected);expect(priorityOrder(s.state)[0]).toBe(s.expected);}});
it('complexity explorers give exact complete-tree heights and honest count units',()=>{expect([0,1,3,7,15,31].map(heapHeight)).toEqual([-1,0,1,2,3,4]);expect(priorityWork(32,'peek')).toEqual({unsorted:31,sorted:1,heap:1});expect(priorityWork(31,'insert').heap).toBe(5);});
it('adapters reject malformed, oversized and unordered experiments before replacing a trace',()=>{
  for(const adapter of [priorityAdapter,heapAdapter]) {const f=new FormData();f.set('preset','custom');f.set('values','1,,2');expect(()=>adapter.build('insert',f)).toThrow();f.set('values','');f.set('value','1000');expect(()=>adapter.build('insert',f)).toThrow();}
  expect(()=>heapState([1,2])).toThrow(/order/);expect(()=>heapTrace('insert',heapState(Array(15).fill(5)))).toThrow(/limit/);expect(()=>priorityTrace('insert',priorityState(Array(8).fill({value:1,priority:1})))).toThrow(/limit/);
  const f=new FormData();f.set('preset','unordered');expect(()=>heapAdapter.build('insert',f)).toThrow(/order/);expect(heapAdapter.build('build',f).steps.length).toBeGreaterThan(1);
});
