import { beforeAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { sourceLines } from '../../src/engine/source';
import { stackAdapter } from '../../src/visualizers/stack/adapter';
import { execFileSync } from 'node:child_process';
import { compileLinearFixture } from '../../scripts/linear-fixture.mjs';
import { stackState, stackTrace, stackOperations, type StackState } from '../../src/visualizers/stack/model';
let binary: string;
beforeAll(() => { binary = compileLinearFixture('stack'); });
function snapshot(s: StackState) {
  const id = (address: string | null) => address === null ? -1 : s.objects.findIndex(n => n.address === address);
  return s.implementation === 'array' ? [s.topIndex,s.storage] : [id(s.references.topNode ?? null),s.objects.map(n => n.lifetime === 'freed' ? null : [n.data,id(n.pointers.next ?? null)])];
}
for (const kind of ['array','linked'] as const) for (const op of stackOperations) for (const values of [[],[10],[10,20,30],[10,10,20],[-999,0,999],[1,2,3,4,5]]) {
  it(`native ${kind} ${op} [${values}]: exact nested tags and storage/topology at every statement`, () => {
    const trace = stackTrace(op, stackState(kind,values), 42);
    const steps = trace.steps.filter(s => s.source);
    const semantic = steps.filter((s,i) => steps[i+1]?.source !== s.source).map(s => [s.source,snapshot(s.state)]);
    const output = execFileSync(binary,[kind,op,'42',...values.map(String)],{encoding:'utf8'});
    const native = output.trim().split('\n').filter(Boolean).map(line => { const [tag,state]=line.split('|'); return [tag,JSON.parse(state!)]; });
    expect(semantic).toEqual(native);
    const form = new FormData(); form.set('implementation', kind);
    const tags = stackAdapter.regions(op, form).flatMap(region => sourceLines(readFileSync('cpp/chapter-02/Stack.hpp', 'utf8'), region).map(line => line.tag));
    for (const step of steps) expect(tags).toContain(step.source);
  });
}
