import { beforeAll,expect,it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { compileLinearFixture } from '../../scripts/linear-fixture.mjs';
import { doublyState,doublyTrace,doublyOperations } from '../../src/visualizers/doubly-linked-list/model';
import type { MemoryState } from '../../src/engine/types';
import { readFileSync } from 'node:fs';
import { sourceLines } from '../../src/engine/source';
import { doublyAdapter } from '../../src/visualizers/doubly-linked-list/adapter';
let binary:string;
beforeAll(()=>{binary=compileLinearFixture('doubly');});
const source=readFileSync('cpp/chapter-03/DoublyLinkedList.hpp','utf8');
function snapshot(s:MemoryState){
  const id=(address:string|null|undefined)=>address == null ? -1 : s.objects.findIndex(n=>n.address===address);
  return [id(s.references.head),id(s.references.tail),s.objects.map(n=>n.lifetime==='freed' ? null : [n.data,id(n.pointers.prev),id(n.pointers.next)])];
}
for(const op of doublyOperations) for(const values of [[],[10],[10,20,30],[10,20,20,30],[-999,0,999]]) for(const value of [10,20,30,99]) it(`native ${op}(${value}) [${values}] matches every field at statement boundaries`,()=>{
  const steps=doublyTrace(op,doublyState(values),value).steps.filter(s=>s.source);
  const semantic=steps.filter((s,i)=>steps[i+1]?.source!==s.source).map(s=>[s.source,snapshot(s.state)]);
  const output=execFileSync(binary,['doubly',op,String(value),...values.map(String)],{encoding:'utf8'});
  const native=output.trim().split('\n').filter(Boolean).map(line=>{const [tag,state]=line.split('|');return [tag,JSON.parse(state!)];});
  expect(semantic).toEqual(native);
  const tags=doublyAdapter.regions(op,new FormData()).flatMap(region=>sourceLines(source,region).map(line=>line.tag));
  for(const step of steps)expect(tags).toContain(step.source);
});
