import { beforeAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { compileQueueRingFixture } from '../../scripts/queue-ring-fixture.mjs';
import { sourceLines } from '../../src/engine/source';
import { queueState, queueTrace, queueOperations } from '../../src/visualizers/queue/model';
import { ringState, ringTrace, ringOperations } from '../../src/visualizers/ring-buffer/model';
import { queueAdapter } from '../../src/visualizers/queue/adapter';
import { ringAdapter } from '../../src/visualizers/ring-buffer/adapter';
let queueBinary: string, ringBinary: string;
beforeAll(() => { queueBinary=compileQueueRingFixture('queue'); ringBinary=compileQueueRingFixture('ring'); });
const native = (binary: string,args: string[]) => execFileSync(binary,args,{encoding:'utf8'}).trim().split('\n').filter(Boolean).map(line => { const [tag,state,result]=line.split('|');return [tag,JSON.parse(state!),result===undefined?null:JSON.parse(result)]; });
const cases=[[],[10],[10,20,30],[10,10,20],[-999,0,999],[1,2,3,4,5]];
for(const op of queueOperations) for(const values of cases) it(`queue native exact statements ${op} [${values}]`,()=>{
  const trace=queueTrace(op,queueState(values),42);
  const steps=trace.steps.filter(s=>s.source);
  expect(steps.map(({source,state:s})=>[source,[s.count,s.cursor??-1,s.data],source?.endsWith('.return') ? JSON.parse(s.result.includes(' = ') ? s.result.split(' = ')[1]! : s.result) : null])).toEqual(native(queueBinary,[op,'42','0','reject',...values.map(String)]));
  const tags=queueAdapter.regions(op,new FormData()).flatMap(region=>sourceLines(readFileSync('cpp/chapter-06/QueueDeque.hpp','utf8'),region).map(l=>l.tag));
  for(const s of steps) expect(tags).toContain(s.source);
});
for(const op of ringOperations) for(const values of cases) for(const head of [0,2,4]) for(const policy of ['reject','overwrite'] as const) it(`ring native exact statements ${op} [${values}] head=${head} ${policy}`,()=>{
  const trace=ringTrace(op,ringState(values,head),42,policy),steps=trace.steps.filter(s=>s.source);
  expect(steps.map(({source,state:s})=>[source,[s.head,s.tail,s.count,s.data],source?.endsWith('.return') ? JSON.parse(s.result.includes(' = ') ? s.result.split(' = ')[1]! : s.result) : null])).toEqual(native(ringBinary,[op,'42',String(head),policy,...values.map(String)]));
  const tags=ringAdapter.regions(op,new FormData()).flatMap(region=>sourceLines(readFileSync('cpp/chapter-07/RingBuffer.hpp','utf8'),region).map(l=>l.tag));
  for(const s of steps) expect(tags).toContain(s.source);
});
