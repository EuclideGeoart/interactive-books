import { describe, expect, it } from 'vitest';
import { queueState, queueTrace, queueWork, queueOperations, queueInvariants } from '../../src/visualizers/queue/model';
import { ringState, ringTrace, ringValues, ringOperations, ringInvariants } from '../../src/visualizers/ring-buffer/model';
import { queueAdapter } from '../../src/visualizers/queue/adapter';
import { ringAdapter } from '../../src/visualizers/ring-buffer/adapter';
import { queueFault, queueFaults } from '../../src/visualizers/queue/faults';
import { ringFault, ringFaults } from '../../src/visualizers/ring-buffer/faults';
import { PlaybackController } from '../../src/engine/playback';
const last = <S>(trace: { steps: {state:S}[] }) => trace.steps.at(-1)!.state;
it('deque models both ends, singleton, duplicates and retained outside slots',()=>{
  let state=queueState([]);const expected:number[]=[];
  for(const op of ['push-front','push-back','push-front','pop-back','pop-front','pop-front'] as const){
    state=last(queueTrace(op,state,7));if(op==='push-front')expected.unshift(7);if(op==='push-back')expected.push(7);if(op==='pop-front')expected.shift();if(op==='pop-back')expected.pop();
    expect(state.data.slice(0,state.count)).toEqual(expected);expect(queueInvariants(state,true).every(r=>r.status==='pass')).toBe(true);
  }
  expect(state.data[0]).toBe(7);
});
it('naive FIFO dequeue writes every shift separately and drains quadratically',()=>{
  const trace=queueTrace('pop-front',queueState([10,20,30,40]));
  expect(trace.steps.filter(s=>s.source==='qo.shift').map(s=>s.state.data.slice(0,4))).toEqual([[20,20,30,40],[20,30,30,40],[20,30,40,40]]);
  expect(last(trace).shifts).toBe(3);expect(queueWork(1024,'pop-front').drainShifts).toBe(523776);
  expect(queueWork(0,'pop-front').shifts).toBe(0);expect(queueWork(4,'push-front').shifts).toBe(4);
});
for(const op of queueOperations) it(`queue ${op} preserves input and reversible snapshots`,()=>{
  const state=queueState(), saved=structuredClone(state),trace=queueTrace(op,state),player=new PlaybackController(trace,()=>{});
  player.seek(player.total);for(let i=player.total;i>0;i--){player.previous();expect(player.state).toEqual(i===1?trace.initial:trace.steps[i-2]!.state);}expect(state).toEqual(saved);player.dispose();
});
for(const op of ringOperations) it(`ring ${op} preserves input and reversible snapshots`,()=>{
  const state=ringState(),saved=structuredClone(state),trace=ringTrace(op,state),player=new PlaybackController(trace,()=>{});
  player.seek(player.total);for(let i=player.total;i>0;i--){player.previous();expect(player.state).toEqual(i===1?trace.initial:trace.steps[i-2]!.state);}expect(state).toEqual(saved);player.dispose();
});
it('ring count remains unchanged until its tagged statement; modulo wrap is visible',()=>{
  const trace=ringTrace('push',ringState([20,30],2),40);
  const wrap=trace.steps.find(s=>s.source==='rp.wrap')!;
  expect(wrap.state).toMatchObject({head:2,tail:0,count:2});expect(wrap.event).toMatchObject({from:4,index:0});
  expect(ringInvariants(wrap.state,false).some(r=>r.status==='pending')).toBe(true);
  expect(ringAdapter.draw(wrap.state,'test','memory',null,wrap.event)).toContain('4 → 0');
  expect(ringValues(last(trace))).toEqual([20,30,40]);
});
it('ring full rejection is unchanged; overwrite removes exactly the oldest value',()=>{
  const state=ringState([10,20,30,40,50],4);
  const rejected=last(ringTrace('push',state,60));expect(rejected.data).toEqual(state.data);expect(rejected.count).toBe(5);expect(rejected.writes).toBe(0);
  const overwrite=ringTrace('push',state,60,'overwrite');expect(ringValues(last(overwrite))).toEqual([20,30,40,50,60]);expect(last(overwrite)).toMatchObject({head:0,tail:0,count:5});
  expect(overwrite.steps.find(s=>s.source==='rp.discard')!.state.count).toBe(5);
});
it('ring repeated reuse agrees with a reference FIFO including overwrite',()=>{
  let s=ringState([],4);const reference:number[]=[];
  for(let i=0;i<100;i++){
    if(i%3===0&&reference.length){s=last(ringTrace('pop',s));reference.shift();}
    else {s=last(ringTrace('push',s,i,'overwrite'));if(reference.length===5)reference.shift();reference.push(i);}
    expect(ringValues(s)).toEqual(reference);expect(ringInvariants(s,true).every(r=>r.status==='pass')).toBe(true);
  }
});
for(const adapter of [queueAdapter,ringAdapter]) describe('input validation',()=>{
  for(const raw of ['1,,2','NaN','1.5','1000','1,2,3,4,5,6'])it(`rejects ${raw}`,()=>{const f=new FormData();f.set('preset','custom');f.set('values',raw);expect(()=>adapter.build(adapter===queueAdapter?'push-back':'push',f)).toThrow();});
});
it('empty reads and pops reject without touching raw storage',()=>{
  for(const op of ['pop-front','pop-back','front','back'] as const){const s=last(queueTrace(op,queueState([])));expect(s.result).toContain('Underflow');expect(s.writes).toBe(0);}
  for(const op of ['pop','front','back'] as const){const s=last(ringTrace(op,ringState([],4)));expect(s.result).toContain('Underflow');expect(s.writes).toBe(0);}
});
for(const fault of queueFaults)it(`queue controlled fault ${fault} has a diagnosed contract violation`,()=>{const f=queueFault(fault);expect(f.detail.length).toBeGreaterThan(50);expect(f.before).toEqual(queueFault(fault).before);if(fault!=='empty-read')expect(f.broken.data.slice(0,f.broken.count)).not.toEqual(f.correct.data.slice(0,f.correct.count));});
for(const fault of ringFaults)it(`ring controlled fault ${fault} has a diagnosed contract violation`,()=>{const f=ringFault(fault);expect(f.detail.length).toBeGreaterThan(50);if(fault==='no-modulo')expect(ringInvariants(f.broken,true).some(r=>r.status==='fail')).toBe(true);if(fault==='full-empty'||fault==='overwrite-unread')expect(ringValues(f.broken)).not.toEqual(ringValues(f.correct));});
it('bounds include negative indices, fractional positions and invalid policy',()=>{for(const h of [-1,5,1.5,NaN])expect(()=>ringState([],h)).toThrow();expect(()=>queueWork(-1,'pop-front')).toThrow();const f=new FormData();f.set('policy','silent');expect(()=>ringAdapter.build('push',f)).toThrow();});
