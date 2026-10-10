import { execFileSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { compileMemoryFixture } from '../../scripts/systems-memory-fixture.mjs';
import { memoryAdapter, memoryDefaults, memoryKinds, memoryOperations, type MemoryKind, type MemoryState } from '../../src/visualizers/systems-memory/adapter';
let fixture: ReturnType<typeof compileMemoryFixture>;
beforeAll(()=>{ fixture=compileMemoryFixture(); },30000);
afterAll(()=>fixture?.cleanup());
const fields: Record<MemoryKind,string[]> = {
  'free-list':['head','next','free','pending','reads','writes'],
  arena:['offset','padding','allocations','resets','candidate','requested','alignment','blocks'],
  'object-pool':['life','next','head','constructions','destructions','rollbacks'],
  handles:['slots','head','validations','reuses','checked','valid'],
};
function projection(s: MemoryState) { return Object.fromEntries(fields[s.kind].map(key=>[key,(s as unknown as Record<string,unknown>)[key]])); }
function parity(kind: MemoryKind, operation: string, count=3,index=0, extra?: string) {
  const inputs=memoryDefaults(); inputs.set('count',String(count)); inputs.set('index',String(index));
  if (extra) inputs.set(kind === 'arena' ? 'requests' : kind === 'handles' ? 'generation' : 'value',extra);
  const expected=memoryAdapter(kind).build(operation,inputs).steps.map(step=>[step.source,projection(step.state)]);
  const native=execFileSync(fixture.binary,[kind,operation,String(count),String(index),...(extra ? [extra] : [])],{encoding:'utf8'}).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
  expect(native).toEqual(expected);
}
for(const kind of memoryKinds) describe(`${kind} canonical trace parity`,()=>{
  for(const operation of memoryOperations[kind].filter(op=>op.id !== 'break-it')) it(operation.id,()=>parity(kind,operation.id));
});
it('varied occupancy and invalid transitions agree statement by statement',()=>{
  for(const count of [1,6]) for(const index of [0,5,8]) {
    parity('free-list','reuse',count,index); parity('free-list','double-release',count,index);
    parity('object-pool','lifecycle',count,index,'-17'); parity('object-pool','double-release',count,index);
  }
});
it('arena rejection, exhaustion, reset and exact boundary traces match',()=>{
  for(const requests of ['0:1,1:0,1:3,1:32','63:1,2:2','16:16,16:16,32:16,1:1','3:1,5:8,8:16']) {
    parity('arena','allocate',3,0,requests); parity('arena','reset',3,0,requests);
  }
});
it('generation retirement and external validation traces match',()=>{
  for(const cycles of [1,2,3,6]) parity('handles','retire',cycles);
  for(const index of [0,1,8]) for(const generation of [0,1,2,9]) parity('handles','validate',3,index,String(generation));
});
