import { beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { sourceLines } from '../../src/engine/source';
import { compileOrganizationFixture } from '../../scripts/systems-organization-fixture.mjs';
import { organizationAdapter, organizationDefaults, organizationOperations } from '../../src/visualizers/systems-organization/adapter';
import { sparseTrace } from '../../src/visualizers/systems-organization/sparse';
import { dirtyTrace } from '../../src/visualizers/systems-organization/dirty';
import { ecsTrace } from '../../src/visualizers/systems-organization/ecs';
import { commandsTrace } from '../../src/visualizers/systems-organization/commands';
import { member, type OrganizationKind } from '../../src/visualizers/systems-organization/types';
let binary: string;
beforeAll(() => { binary = compileOrganizationFixture(); }, 30000);
const kinds: OrganizationKind[] = ['sparse','ecs','dirty','commands'];
const files = { sparse: [54,'SparseSet'], ecs: [56,'ECSStorage'], dirty: [57,'DirtyWorkList'], commands: [58,'CommandBuffer'] };
for (const kind of kinds) describe(kind, () => {
  for (const operation of organizationOperations[kind]) it(`${operation.id}: native event/state parity and source tags`, () => {
    const adapter = organizationAdapter(kind), input = organizationDefaults(kind), trace = adapter.build(operation.id, input);
    const args = [kind,operation.id,...['id','generation','value','pool','waves'].map(k=>String(input.get(k)))];
    if (kind === 'sparse' || kind === 'dirty') args.push(...String(input.get('ids')).split(','));
    const native = execFileSync(binary, args, { encoding:'utf8' }).trim().split('\n').filter(Boolean).map(line => { const split=line.indexOf('|'); return { tag:line.slice(0,split), state:JSON.parse(line.slice(split+1)) }; });
    expect(native).toEqual(trace.steps.map(step => { const { kind: _kind, ...state } = step.state; return { tag:step.source,state }; }));
    const [chapter,name] = files[kind]; const source=readFileSync(`cpp/chapter-${chapter}/${name}.hpp`,'utf8');
    const tags = adapter.regions(operation.id, input).flatMap(region => sourceLines(source, region).map(line => line.tag));
    for (const step of trace.steps) expect(tags).toContain(step.source);
    const after=trace.steps.at(-1)!.state, rules=adapter.invariants(after,true);
    expect(rules.some(r=>r.status==='fail')).toBe(operation.id.startsWith('break-'));
    expect(trace.initial).not.toEqual(after);
    for (const view of ['logical','memory'] as const) {
      const svg=adapter.draw(after,'test',view,null);expect(svg).toContain('systems-diagram');expect(svg).toContain('viewBox=');expect(svg).toContain('tabindex="0"');expect(svg).not.toContain('undefined');expect(svg).not.toContain('NaN');
    }
  });
});
it('sparse exhaustive small-domain erase/insert agrees with independent Set', () => {
  for(let mask=0;mask<64;++mask)for(let id=0;id<6;++id)for(const op of ['insert','remove']) {
    const input=organizationDefaults('sparse'), initial=Array.from({length:6},(_,i)=>i).filter(i=>mask&(1<<i));input.set('ids',initial.join(','));input.set('id',String(id));
    const expected=new Set(initial);op==='insert'?expected.add(id):expected.delete(id);
    const state=sparseTrace(op,input).steps.at(-1)!.state;
    expect(new Set(state.dense)).toEqual(expected);for(let v=0;v<16;++v)expect(member(state,v)).toBe(expected.has(v));
  }
});
it('sparse distinguishes move, pop and repair snapshots; stale absent metadata is safe', () => {
  const trace=sparseTrace('stale',organizationDefaults('sparse'));
  expect(trace.steps.find(s=>s.source==='sparse.move')!.state.dense).toEqual([1,4,4]);
  expect(trace.steps.find(s=>s.source==='sparse.pop')!.state.sparse[4]).toBe(2);
  expect(trace.steps.find(s=>s.source==='sparse.repair')!.state.sparse[4]).toBe(1);
  expect(trace.steps.at(-1)!.state.found).toBe(false);
});
it('membership rejects negative and out-of-range signed inverse indices before a dense read', () => {
  const pool = { sparse: [-1], dense: new Proxy([0], { get(target, key, receiver) {
    if (key === '-1' || key === '1') throw new Error('unchecked dense index');
    return Reflect.get(target, key, receiver);
  } }) };
  expect(member(pool, 0)).toBe(false);
  pool.sparse[0] = 1; expect(member(pool, 0)).toBe(false);
  pool.sparse[0] = 0; expect(member(pool, 0)).toBe(true);
  expect(member(pool, -1)).toBe(false); expect(member(pool, 1)).toBe(false);
});
it('dirty per-wave membership permits re-dirty but never changes frozen traversal', () => {
  const input=organizationDefaults('dirty');input.set('waves','3');
  const trace=dirtyTrace('repeat',input), end=trace.steps.at(-1)!.state;
  expect(end.visits).toBe(9);expect(end.current).toEqual([0,1,2]);expect(end.processing).toBe(false);
  for(const step of trace.steps)if(step.state.processing)expect(step.state.current).toEqual([0,1,2]);
  expect(end.dedupes).toBe(10);
});
it('ECS query joins IDs; destroyed/reused identities reject stale additions', () => {
  const q=ecsTrace('query',organizationDefaults('ecs')).steps.at(-1)!.state;
  expect(q.position.values).toEqual([11,20,33]);expect(q.updates).toBe(2);
  const r=ecsTrace('reuse',organizationDefaults('ecs')).steps.at(-1)!.state;
  expect(r.slots[1]).toEqual({alive:true,generation:2});expect(member(r.position,1)).toBe(false);
});
it('commands match independently calculated outcomes and deterministic replay', () => {
  const input=organizationDefaults('commands'), end=commandsTrace('ordered',input).steps.at(-1)!.state;
  expect(end.slots.map(s=>s.value)).toEqual([27,16,null,null,null,null,null,null]);
  expect(end.reports.map(r=>r.code)).toEqual([0,0,0,1,0,0]);expect(end.commands).toEqual([]);
  expect(commandsTrace('replay',input).steps.at(-1)!.state).toEqual(end);
  expect(commandsTrace('record',input).steps.at(-1)!.state.slots[0]!.value).toBe(10);
});
it('empty inputs and boundary errors are explicit', () => {
  for(const kind of kinds) { const input=organizationDefaults(kind);input.set('id','-1');expect(()=>organizationAdapter(kind).build(organizationOperations[kind][0]!.id,input)).toThrow(); }
  const empty=organizationDefaults('dirty');empty.set('ids','');expect(dirtyTrace('wave',empty).steps).toEqual([]);
  const invalid=organizationDefaults('sparse');invalid.set('ids','1,,2');expect(()=>sparseTrace('insert',invalid)).toThrow();
});
