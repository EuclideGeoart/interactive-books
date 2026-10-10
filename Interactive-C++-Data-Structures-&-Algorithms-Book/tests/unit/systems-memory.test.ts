import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PlaybackController } from '../../src/engine/playback';
import { sourceLines } from '../../src/engine/source';
import { memoryAdapter, memoryDefaults, memoryHeaders, memoryInvariants, memoryKinds, memoryOperations } from '../../src/visualizers/systems-memory/adapter';
import { freeListTrace } from '../../src/visualizers/systems-memory/free-list';
import { arenaTrace } from '../../src/visualizers/systems-memory/arena';
import { poolTrace } from '../../src/visualizers/systems-memory/object-pool';
import { handlesTrace, validHandle } from '../../src/visualizers/systems-memory/handles';
import { drawMemory, inspectMemory } from '../../src/visualizers/systems-memory/presentation';
import { walk } from '../../src/visualizers/systems-memory/trace';
const last = <S>(trace: {steps:{state:S}[]}) => trace.steps.at(-1)!.state;
const failed = (state: Parameters<typeof memoryInvariants>[0]) => memoryInvariants(state).filter(rule=>rule.status === 'fail');

for (const kind of memoryKinds) describe(kind,()=>{
  const adapter = memoryAdapter(kind), source = readFileSync(`cpp/chapter-${memoryHeaders[kind]}.hpp`,'utf8');
  for (const operation of memoryOperations[kind]) it(`${operation.id}: source sync, reverse, both views and invariants`,()=>{
    const input = memoryDefaults(), trace = adapter.build(operation.id,input);
    const tags = adapter.regions(operation.id,input).flatMap(region=>sourceLines(source,region).flatMap(line=>line.tag ? [line.tag] : []));
    expect(new Set(tags).size).toBe(tags.length);
    expect(failed(trace.initial)).toEqual([]);
    const player = new PlaybackController(trace);
    for (const step of trace.steps) {
      if (step.source) expect(tags.filter(tag=>tag === step.source),step.title).toHaveLength(1);
      else expect(operation.id).toBe('break-it');
      player.next(); expect(player.state).toEqual(step.state);
      if (!step.state.broken) expect(failed(step.state),step.title).toEqual([]);
      for (const view of ['logical','memory'] as const) {
        const html = drawMemory(step.state,'test',view,null);
        expect(html).toContain('systems-diagram'); expect(html).toContain('viewBox=');
        expect(html).toContain('tabindex="0"'); expect(html).toContain('role="button"');
      }
    }
    if (operation.id === 'break-it') expect(failed(last(trace)).length).toBeGreaterThan(0);
    else expect(failed(last(trace))).toEqual([]);
    for (let i=trace.steps.length-1;i>=0;--i) { player.previous(); expect(player.state).toEqual(i ? trace.steps[i-1]!.state : trace.initial); }
    player.dispose();
  });
});

it('free-list LIFO result is independently predictable, not physical order',()=>{
  const inputs = memoryDefaults(); inputs.set('index','1');
  const trace = freeListTrace('reuse',inputs), pushed = trace.steps.find(step=>step.source === 'fl.push')!.state;
  expect(walk(pushed.head,pushed.next).order).toEqual([1,3,4,5]);
  expect(last(trace).free).toEqual([false,false,false,true,true,true]);
  expect(last(trace).reads).toBe(4); expect(last(trace).writes).toBe(6);
  const selected = trace.steps[0]!.state; expect(trace.initial.pending).toBe(6); expect(selected.pending).toBe(0);
});
for (const fault of ['cycle','used','lost','invalid','duplicate']) for (const count of [1,6]) it(`safe ${fault} corruption at occupancy ${count}`,()=>{
  const inputs = memoryDefaults(); inputs.set('fault',fault); inputs.set('count',String(count));
  const trace = freeListTrace('break-it',inputs);
  expect(failed(last(trace)).length).toBeGreaterThan(0);
  expect(failed(trace.initial)).toEqual([]);
});
it('double-release and invalid release preserve free-list metadata',()=>{
  for (const index of [0,5,8]) {
    const inputs = memoryDefaults(); inputs.set('index',String(index));
    const trace = freeListTrace('double-release',inputs);
    for (let i=0;i<trace.steps.length;++i) if (trace.steps[i]!.source === 'fl.reject') {
      const before = trace.steps[i-1]!.state, after = trace.steps[i]!.state;
      expect([after.head,after.next,after.free,after.reads,after.writes]).toEqual([before.head,before.next,before.free,before.reads,before.writes]);
    }
  }
});
it('arena byte-by-byte alignment oracle covers every initial offset and supported alignment',()=>{
  for (let first=1;first<=32;++first) for (const alignment of [1,2,4,8,16]) {
    const inputs = memoryDefaults(); inputs.set('requests',`${first}:1,3:${alignment}`);
    const state = last(arenaTrace('allocate',inputs));
    let expected=first; while(expected%alignment) ++expected;
    expect(state.blocks[1]).toEqual({begin:expected,size:3,alignment,padding:expected-first});
    expect(state.offset).toBe(expected+3); expect(failed(state)).toEqual([]);
  }
});
it('arena validation, exhaustion and reset preserve raw-byte semantics',()=>{
  const inputs = memoryDefaults(); inputs.set('requests','0:1,1:0,4:3,4:32,63:1,2:2');
  const trace = arenaTrace('allocate',inputs);
  expect(trace.steps.filter(step=>step.source === 'arena.reject')).toHaveLength(4);
  expect(last(trace).offset).toBe(63); expect(last(trace).blocks).toHaveLength(1);
  const reset = arenaTrace('reset',memoryDefaults()).steps.find(step=>step.source === 'arena.reset')!.state;
  expect(reset.blocks).toEqual([]); expect(reset.offset).toBe(0); expect(reset.padding).toBe(0);
  expect(inspectMemory(reset,'byte:0')).toContain('AVAILABLE');
});
it('pool destroy makes fields unreadable before return; failure never constructs',()=>{
  const trace=poolTrace('lifecycle',memoryDefaults());
  const destroyed=trace.steps.find(step=>step.source === 'pool.destroy')!.state;
  expect(destroyed.life[0]).toBe('destroyed'); expect(destroyed.values[0]).toBeNull();
  expect(inspectMemory(destroyed,'slot:0')).toContain('unreadable'); expect(destroyed.head).toBe(3);
  const rollback=poolTrace('rollback',memoryDefaults()).steps.find(step=>step.source === 'pool.rollback')!.state;
  expect(rollback.constructions).toBe(0); expect(rollback.destructions).toBe(0); expect(rollback.head).toBe(0);
  expect(rollback.rollbacks).toBe(1);
});
it('handles issue unique identities, reject old generations and retire at the exact boundary',()=>{
  const inputs=memoryDefaults(); inputs.set('count','6');
  const trace=handlesTrace('retire',inputs), state=last(trace);
  expect(state.saved).toEqual([{index:0,generation:1},{index:0,generation:2},{index:0,generation:3},{index:1,generation:1},{index:1,generation:2},{index:1,generation:3},{index:2,generation:1}]);
  expect(state.slots.filter(slot=>slot.retired)).toHaveLength(2);
  for (const old of state.saved.slice(0,-1)) expect(validHandle(state,old)).toBe(false);
  expect(validHandle(state,state.saved.at(-1)!)).toBe(true);
  expect(validHandle(state,{index:-1,generation:1})).toBe(false);
  expect(validHandle(state,{index:99,generation:1})).toBe(false);
  expect(inspectMemory(state,'handle:0')).toContain('STALE HANDLE');
});
it('corrupt generation demonstrates false acceptance caught by identity-history invariant',()=>{
  const state=last(handlesTrace('break-it',memoryDefaults()));
  expect(validHandle(state,state.saved[0]!)).toBe(true);
  expect(failed(state).map(rule=>rule.name)).toContain('Revoked handles cannot resolve');
});
it('drawing escapes diagnostic text and does not claim missing objects have readable values',()=>{
  const state=last(poolTrace('lifecycle',memoryDefaults())); state.result='<script>bad</script>';
  expect(drawMemory(state,'test','memory',null)).toContain('&lt;script&gt;');
  expect(drawMemory(state,'test','memory',null)).not.toContain('<script>bad');
  expect(inspectMemory(state,'slot:99')).toContain('Selection is unavailable');
});
it('validates numeric inputs and rejects malformed request syntax',()=>{
  for(const kind of ['free-list','object-pool','handles'] as const) {
    const inputs=memoryDefaults(); inputs.set('count','1.5');
    expect(()=>memoryAdapter(kind).build(memoryOperations[kind][0]!.id,inputs)).toThrow(/integer/);
  }
  const inputs=memoryDefaults(); inputs.set('requests','a:4'); expect(()=>arenaTrace('allocate',inputs)).toThrow(/pairs/);
});
