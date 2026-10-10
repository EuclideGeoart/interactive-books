import { beforeAll, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { compilePriorityHeapFixture } from '../../scripts/priority-heap-fixture.mjs';
import { sourceLines } from '../../src/engine/source';
import { priorityState, priorityTrace, priorityOperations } from '../../src/visualizers/priority-queue/model';
import { heapState, heapTrace, heapOperations } from '../../src/visualizers/binary-heap/model';
import { priorityAdapter } from '../../src/visualizers/priority-queue/adapter';
import { heapAdapter } from '../../src/visualizers/binary-heap/adapter';
let priorityBinary: string, heapBinary: string;
beforeAll(() => { priorityBinary = compilePriorityHeapFixture('priority'); heapBinary = compilePriorityHeapFixture('heap'); });
const native = (binary: string, args: string[]) => execFileSync(binary, args, {encoding:'utf8'}).trim().split('\n').filter(Boolean).map(line => { const [tag, data, detail, counts, locals] = line.split('|'); return [tag, JSON.parse(data!), detail, counts!.split(',').map(Number), locals!.split(',').map(Number)]; });
for (const higher of [true,false]) for (const op of priorityOperations) for (const data of [[],[{value:10,priority:5}],[{value:10,priority:5},{value:20,priority:2},{value:30,priority:9},{value:40,priority:5}],[{value:1,priority:0},{value:2,priority:0},{value:3,priority:0}], [{value:-999,priority:999},{value:999,priority:-999}]]) {
  it(`priority native ${higher} ${op} ${JSON.stringify(data)}: every tagged statement, condition and result`, () => {
    const steps = priorityTrace(op,priorityState(data,higher),42,5).steps.filter(s=>s.source);
    expect(steps.map(s=>[s.source,s.state.data.map(e=>[e.value,e.priority]),s.event.detail,[s.state.comparisons,0],[s.state.best??-1,s.state.cursor??-1,-1,-1]])).toEqual(native(priorityBinary,[op,String(higher),'42','5',...data.map(e=>`${e.value}:${e.priority}`)]));
    const tags = priorityAdapter.regions(op,new FormData()).flatMap(r=>sourceLines(readFileSync('cpp/chapter-08/PriorityQueue.hpp','utf8'),r).map(l=>l.tag));
    for (const step of steps) expect(tags).toContain(step.source);
  });
}
for (const max of [true,false]) for (const op of heapOperations) for (const raw of [[],[10],[5,5,5],[-999,0,999],[90,70,60,40,50,20],Array.from({length:14},(_,i)=>i-7)]) {
  // Sorted arrays satisfy the appropriate heap order without preparation swaps.
  const values = op === 'build' ? raw : [...raw].sort((a,b)=>max ? b-a : a-b);
  it(`heap native ${max} ${op} [${values}]: nested helpers, swaps, conditions and return`, () => {
    const steps=heapTrace(op,heapState(op==='build'?[]:values,max),max?999:-999,values).steps.filter(s=>s.source);
    expect(steps.map(s=>[s.source,s.state.data,s.event.detail,[s.state.comparisons,s.state.swaps],[s.state.i??-1,s.state.parent??-1,s.state.child??-1,s.state.right??-1]])).toEqual(native(heapBinary,[op,String(max),String(max?999:-999),'unused',...values.map(String)]));
    const tags=heapAdapter.regions(op,new FormData()).flatMap(r=>sourceLines(readFileSync('cpp/chapter-09/BinaryHeap.hpp','utf8'),r).map(l=>l.tag));
    for (const step of steps) expect(tags).toContain(step.source);
  });
}
