import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {openState,openTrace,tombstoneExperiment} from '../../src/visualizers/open-addressing/model';
import {robinState,robinTrace,robinInvariants,robinMetrics} from '../../src/visualizers/robin-hood/model';
import {contractState,contractTrace,pointContract} from '../../src/visualizers/unordered-map/model';
import {PlaybackController} from '../../src/engine/playback';
it('searches beyond a tombstone before updating; later reuses it for a new key',()=>{
 const s=openState(['a','i','q'],8,['a']);
 const update=openTrace('insert',s,'q',9).steps.at(-1)!.state;
 expect(update.slots.filter(x=>x.status==='occupied')).toHaveLength(2);expect(update.slots[1]!.status).toBe('tombstone');expect(update.slots[3]!.value).toBe(9);
 const insert=openTrace('insert',s,'y',4).steps.at(-1)!.state;expect(insert.slots[1]!.key).toBe('y');
});
it('interactive tombstone fault hides a reachable key, restore fixes it',()=>{
 const broken=tombstoneExperiment(true),correct=tombstoneExperiment(false);
 expect(broken.trace.steps.at(-1)!.state.result).toMatch('Not found');expect(broken.rules.some(x=>x.status==='fail')).toBe(true);
 expect(correct.trace.steps.at(-1)!.state.result).toMatch('Found q');expect(correct.rules.every(x=>x.status==='pass')).toBe(true);
});
it('full and all-tombstone tables terminate after capacity inspections',()=>{
 const s=openState(['a','e','i','m'],4);expect(openTrace('find',s,'z').steps.at(-1)!.state.probes).toBe(4);
 const dead=openState(['a','e','i','m'],4,['a','e','i','m']);const t=openTrace('insert',dead,'z');expect(t.steps.at(-1)!.state.probes).toBe(4);expect(t.steps.at(-1)!.state.result).toBe('Inserted');
});
it('Robin Hood swaps name both incoming and displaced resident',()=>{
 const t=robinTrace('insert',robinState(['a','b']),'i');const step=t.steps.find(x=>x.source==='rh.insert.swap')!;
 expect(step.state.slots[2]!.key).toBe('i');expect(step.state.incoming!.key).toBe('b');expect(step.state.incoming!.distance).toBe(0);
 const next=t.steps[t.steps.indexOf(step)+1]!;expect(next.state.incoming!.distance).toBe(1);expect(robinMetrics(t.steps.at(-1)!.state).max).toBe(1);
});
it('only reachability is pending during explicit backward repair',()=>{
 const t=robinTrace('erase',robinState(['a','i','q']),'a');const hole=t.steps.find(x=>x.source==='rh.erase.hole')!.state;
 expect(hole.repairing).toBe(true);expect(robinInvariants(hole,false).some(x=>x.status==='pending')).toBe(true);
 const wrong=structuredClone(hole);wrong.slots[2]!.distance=0;expect(robinInvariants(wrong,false)[0]!.status).toBe('fail');
 const duplicate=structuredClone(hole);duplicate.slots[3]!.key='i';expect(robinInvariants(duplicate,false)[2]!.status).toBe('fail');
 const unmarked=structuredClone(hole);unmarked.repairing=false;expect(robinInvariants(unmarked,false)[1]!.status).toBe('fail');
 expect(t.steps.at(-1)!.state.repairing).toBe(false);expect(robinInvariants(t.steps.at(-1)!.state).every(x=>x.status==='pass')).toBe(true);
});
it('rehash counts real target probes and retains original until commit',()=>{
 const a=openTrace('rehash',openState(['a','i','q']), 'a',9,8);expect(a.steps.at(-1)!.state.probes).toBe(6);expect(a.steps.slice(0,-1).every(x=>JSON.stringify(x.state.slots)===JSON.stringify(a.initial.slots))).toBe(true);
 const b=robinTrace('rehash',robinState(['a','i','q']),'a',9,8);expect(b.steps.at(-1)!.state.probes).toBe(12);expect(b.steps.some(x=>x.source==='rh.insert.place'&&x.state.staging.length===8)).toBe(true);
});
it('rejects invalid inputs and too-small rehash without changing initial state',()=>{
 const s=openState();const before=JSON.stringify(s);expect(()=>openTrace('insert',s,'ABC')).toThrow();expect(()=>openTrace('rehash',s,'a',9,1)).toThrow();expect(JSON.stringify(s)).toBe(before);
 expect(()=>robinState([],0)).toThrow();expect(()=>robinTrace('insert',robinState(),'a',1.5)).toThrow();
});
it('source synchronization and reverse playback preserve every snapshot',()=>{
 for(const [chapter,name,trace] of [['21','OpenAddressing',openTrace('rehash',openState(),'a',9,16)],['22','RobinHood',robinTrace('erase',robinState(['a','i','q']),'a')]] as const){
  const header=readFileSync(`cpp/chapter-${chapter}/${name}.hpp`,'utf8');const player=new PlaybackController(trace as never,()=>{});const states=JSON.stringify(trace);
  for(const step of trace.steps)expect(header.split(`@trace ${step.source}`).length-1).toBe(1);
  player.seek(player.total);while(player.index)player.previous();expect(player.state).toEqual(trace.initial);expect(JSON.stringify(trace)).toBe(states);player.dispose();
 }
});
it('contract handles and load hints avoid fabricated bucket counts',()=>{
 const initial=contractState();const reserve=contractTrace('reserve',initial).steps.at(-1)!.state;expect(reserve.bucketMinimum).toBe(16);expect(reserve.reference).toBe(initial.reference);expect(reserve.iterator).toMatch('reacquire');
 const hint=contractTrace('max-load',initial).steps.at(-1)!.state;expect(hint.maxLoad).toBeNull();expect(hint.bucketMinimum).toBe(initial.bucketMinimum);expect(contractTrace('reserve',hint).steps.at(-1)!.state.bucketMinimum).toBe(0);
 const erase=contractTrace('erase',initial,'cat').steps.at(-1)!.state;expect(erase.reference).toMatch('invalidated');
});
it('PointKey implication accepts collisions and exposes inconsistent equality',()=>{
 expect(pointContract({x:1,y:2},{x:1,y:2}).valid).toBe(true);expect(pointContract({x:1,y:2},{x:0,y:33})).toMatchObject({equal:false,hashA:33,hashB:33,valid:true});expect(pointContract({x:1,y:2},{x:1,y:3},true).valid).toBe(false);
});
