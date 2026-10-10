import { expect,it } from 'vitest';
import { doublyState,doublyTrace,doublyInvariants,doublyOperations,walkDoubly,brokenDoubly,measureDoubly } from '../../src/visualizers/doubly-linked-list/model';
import { doublyAdapter } from '../../src/visualizers/doubly-linked-list/adapter';
import { PlaybackController } from '../../src/engine/playback';
import { drawDoubly } from '../../src/visualizers/doubly-linked-list/diagram';
for(const op of doublyOperations) for(const values of [[],[10],[10,20,30],[10,20,20,30]]) it(`${op} [${values}] restores invariants and reverses snapshots`,()=>{
  const trace=doublyTrace(op,doublyState(values),20);
  expect(doublyInvariants(trace.steps.at(-1)!.state,true).every(r=>r.status==='pass')).toBe(true);
  const player=new PlaybackController(trace,()=>{});
  for(let i=0;i<trace.steps.length;i++) player.next();
  for(let i=0;i<trace.steps.length;i++) player.previous();
  expect(player.state).toEqual(trace.initial);
});
it('preserves the half-rewired middle-deletion snapshot and lifetime boundary',()=>{
  const trace=doublyTrace('delete-middle',doublyState(),20);
  const half=trace.steps.find(s=>s.source==='unlink.forward')!.state;
  expect(walkDoubly(half).values).toEqual([10,30]);expect(walkDoubly(half,'prev').values).toEqual([30,20,10]);
  expect(half.objects[1]!.lifetime).toBe('live');
  expect(doublyInvariants(half,false).some(r=>r.status==='pending')).toBe(true);
  expect(doublyInvariants(half,false).some(r=>r.status==='fail')).toBe(false);
  const repaired=trace.steps.find(s=>s.source==='unlink.backward')!.state;
  expect(walkDoubly(repaired,'prev').values).toEqual([30,10]);
  const dead=trace.steps.find(s=>s.event.type==='Destroy')!.state;
  expect(dead.objects[1]!.data).toBeUndefined();expect(dead.references.curr).toBe(dead.objects[1]!.address);
});
it('sole-node deletion updates head then tail before destroying',()=>{
  const trace=doublyTrace('delete-head',doublyState([10]));
  const half=trace.steps.find(s=>s.source==='unlink.head')!.state;
  expect(half.references.head).toBeNull();expect(half.references.tail).not.toBeNull();
  expect(trace.steps.find(s=>s.source==='unlink.tail')!.state.references.tail).toBeNull();
});
for(const mode of ['backlink','head-prev','tail-next','lost-tail','single'] as const) it(`detects ${mode} without dereferencing invalid memory`,()=>{
  const state=brokenDoubly(mode);expect(doublyInvariants(state,true).some(r=>r.status==='fail')).toBe(true);
  expect(()=>walkDoubly(state,'prev')).not.toThrow();
  if(mode==='backlink'){expect(walkDoubly(state).values).toEqual([10,30]);expect(walkDoubly(state,'prev').error).toContain('ended');}
});
it('keeps fixed node slots across insertion and deletion in both representations',()=>{
  for(const view of ['logical','memory'] as const) {
    const trace=doublyTrace('push-front',doublyState());
    const before=drawDoubly(trace.initial,'test',view,null),after=drawDoubly(trace.steps.at(-1)!.state,'test',view,null);
    const frames=(svg:string)=>[...svg.matchAll(/data-node="([^"]+)"[^]*?<rect x="(\d+)" y="(\d+)"/g)].map(m=>[m[1],m[2],m[3]]);
    expect(frames(after).slice(0,3)).toEqual(frames(before));
  }
});
it('validates bounded forms and counts actual traversal direction',()=>{
  expect(measureDoubly(1024,1023,false)).toEqual({visits:1024,rewires:2});
  expect(measureDoubly(1024,1023,true)).toEqual({visits:1,rewires:2});
  const f=new FormData(); f.set('preset','custom');f.set('values','1,,2');expect(()=>doublyAdapter.build('clear',f)).toThrow();
  expect(doublyAdapter.regions('delete-middle',f)).toEqual(['delete-middle','unlink']);
});
for (const [target, visits] of [[99,3],[20,2]] as const) it(`counts ${visits} examined nodes for erase(${target}) at the comparison statement`,()=>{
  const trace=doublyTrace('delete-middle',doublyState(),target);
  const state=trace.steps.at(-1)!.state;
  expect(state.visited).toHaveLength(visits);expect(state.comparisons).toBe(visits);
  expect(trace.steps.find(step=>step.source==='erase.start')!.state.visited).toHaveLength(0);
  const examined=trace.steps.filter(step=>step.event.type==='Visit');
  expect(examined).toHaveLength(visits);
  for (const step of examined) expect(step.source).toBe('erase.compare');
  expect(doublyAdapter.counters!(state).find(counter=>counter.label==='Visited nodes')!.value).toBe(visits);
});
