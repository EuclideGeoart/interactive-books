import { beforeAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { compileAdvancedFixture, advancedFiles } from '../../scripts/sort-advanced-fixture.mjs';
import { mergeTrace, quickTrace, heapSortTrace, countingTrace, radixTrace, advancedSnapshot, advancedInvariants, advancedScene, type SortTrace, type QuickFault } from '../../src/visualizers/sort-advanced/model';
import { PlaybackController } from '../../src/engine/playback';
const binary: Record<string, string> = {};
beforeAll(() => { for (const kind of Object.keys(advancedFiles)) binary[kind] = compileAdvancedFixture(kind); }, 30000);
const native = (kind: string, values: number[], op = kind, option = 0) => execFileSync(binary[kind]!, [op, String(option), ...values.map(String)], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim().split('\n').filter(Boolean).map(line => { const [tag, json] = line.split('|'); return [tag, JSON.parse(json!)]; });
const builders = { merge: mergeTrace, quick: quickTrace, heap: heapSortTrace, counting: countingTrace, radix: radixTrace };
const fixtures = [[], [0], [2,1,2,0], [1,2,3,4,5], [5,4,3,2,1], [3,3,3,3], [8,3,5,1,6,2,7,4], [2,2,1,2,1,0,0]];
for (const [kind, build] of Object.entries(builders)) for (const values of fixtures) {
  it(`${kind} [${values}]: native tag/state parity, independent oracle and replay`, () => {
    const trace = build(values), end = trace.steps.at(-1)!.state;
    expect(trace.steps.map(x => [x.source, advancedSnapshot(x.state)])).toEqual(native(kind === 'counting' || kind === 'radix' ? 'integer' : kind, values, kind, kind === 'counting' ? 9 : 0));
    const expected = values.map((key, id) => ({ key, id })).sort((a, b) => a.key - b.key);
    expect(end.a.map(x => x.key)).toEqual(expected.map(x => x.key));
    expect([...end.a].sort((a,b) => a.id-b.id)).toEqual(values.map((key,id) => ({key,id})));
    if (['merge','counting','radix'].includes(kind)) expect(end.a).toEqual(expected);
    for (const { state } of trace.steps) expect(advancedInvariants(state).filter(x => x.status === 'fail'), JSON.stringify(advancedSnapshot(state))).toEqual([]);
    expect(advancedInvariants(end).every(x => x.status === 'pass')).toBe(true);
    expect(build(values)).toEqual(trace);
    const player = new PlaybackController(trace, () => {}); player.seek(player.total);
    expect(player.state).toEqual(end); player.previous(); player.next(); expect(player.state).toEqual(end);
    player.reset(); expect(player.state).toEqual(trace.initial); player.dispose();
    expect(trace.initial.a).toEqual(values.map((key,id) => ({key,id})));
  });
}
for (const kind of ['merge','quick','heap'] as const) it(`${kind}: signed extremes are compared without subtraction overflow`, () => {
  const values = [2147483647,-2147483648,0,-1,2147483647,-2147483648];
  const trace = builders[kind](values);
  expect(trace.steps.map(x => [x.source, advancedSnapshot(x.state)])).toEqual(native(kind, values));
  expect(trace.steps.at(-1)!.state.a.map(x => x.key)).toEqual([...values].sort((a,b)=>a-b));
});
for (const [option,fault] of ['none','bounds','pivot','no-progress'].entries()) it(`quick fault ${fault} is bounded and native-exact`, () => {
  const trace = quickTrace([3,1,2], fault as QuickFault);
  expect(trace.steps.map(x => [x.source,advancedSnapshot(x.state)])).toEqual(native('quick',[3,1,2],'quick',option));
  if (option) { expect(trace.steps.length).toBeLessThan(40); expect(trace.steps.at(-1)!.state.phase).toBe('fault'); expect(advancedInvariants(trace.steps.at(-1)!.state).some(x=>x.status==='fail')).toBe(true); }
});
it('radix unstable pass actually loses lower-digit ordering', () => {
  const values=[21,22,11,12], trace=radixTrace(values,true);
  expect(trace.steps.map(x => [x.source,advancedSnapshot(x.state)])).toEqual(native('integer',values,'radix',1));
  expect(trace.steps.at(-1)!.state.a.map(x=>x.key)).toEqual([12,11,22,21]);
  expect(advancedInvariants(trace.steps.at(-1)!.state).find(x=>x.name==='Ascending result')!.status).toBe('fail');
  expect(radixTrace(values).steps.at(-1)!.state.a.map(x=>x.key)).toEqual([11,12,21,22]);
});
it('radix supports int32 maximum without overflowing its divisor', () => {
  const values=[2147483647,0,1000000000,2147483647,9,99,999];
  const trace=radixTrace(values), end=trace.steps.at(-1)!.state;
  expect(trace.steps.map(x => [x.source,advancedSnapshot(x.state)])).toEqual(native('integer',values,'radix'));
  expect(end.divisor).toBe(1000000000); expect(end.counters.passes).toBe(10);
  expect(end.counters.comparisons).toBe(0); expect(end.counters.maximumScans).toBe(values.length);
  expect(end.counters.digitReads).toBe(2*values.length*10);
});
for (const values of fixtures) it(`heap construction [${values}] matches accepted native Chapter 9`, () => {
  const expected=JSON.parse(execFileSync(binary.heap!,['legacy','0',...values.map(String)],{encoding:'utf8'}));
  expect(heapSortTrace(values).steps.find(x=>x.source==='heap.built')!.state.a.map(x=>x.key)).toEqual(expected);
});
it('all canonical trace tags are exercised and source-resolvable', () => {
  const traces: Record<string, SortTrace[]> = {
    merge: fixtures.map(mergeTrace), quick: [...fixtures.map(v=>quickTrace(v)), ...(['bounds','pivot','no-progress'] as const).map(f=>quickTrace([3,1,2],f))],
    heap: fixtures.map(heapSortTrace), integer: [...fixtures.map(v=>countingTrace(v)),radixTrace([170,45,75,90,802,24,2,66]),radixTrace([21,22,11,12],true)],
  };
  for (const [kind, ts] of Object.entries(traces)) {
    const [chapter,file] = advancedFiles[kind as keyof typeof advancedFiles]!;
    const source=readFileSync(`cpp/chapter-${chapter}/${file}.hpp`,'utf8');
    const tags=[...source.matchAll(/@trace ([\w.-]+)/g)].map(x=>x[1]);
    expect(new Set(tags).size).toBe(tags.length);
    expect(tags.sort()).toEqual([...new Set(ts.flatMap(t=>t.steps.map(x=>x.source)))].sort());
  }
});
it('reject unsupported domains at both public boundaries', () => {
  for (const bad of [[-1],[10],[2147483647]]) { expect(()=>countingTrace(bad)).toThrow(); expect(()=>native('integer',bad,'counting',9)).toThrow(); }
  for (const bound of [-1,100]) { expect(()=>countingTrace([0],bound)).toThrow(); expect(()=>native('integer',[0],'counting',bound)).toThrow(); }
  expect(()=>radixTrace([-1])).toThrow(); expect(()=>native('integer',[-1],'radix')).toThrow();
  for(const build of Object.values(builders)) for(const bad of [[1.5],[NaN],[2147483648],Array(33).fill(0)]) expect(()=>build(bad)).toThrow();
  for(const kind of ['merge','quick','heap']) expect(()=>native(kind,Array(33).fill(0))).toThrow();
});
it('merge writes, tie policy and copyback expose actual intermediate records', () => {
  const trace=mergeTrace([2,1,2,1]), end=trace.steps.at(-1)!.state;
  expect(end.a.map(x=>x.id)).toEqual([1,3,0,2]);
  expect(end.counters.bufferWrites).toBe(8); expect(end.counters.writes).toBe(8); expect(end.counters.maxDepth).toBe(3);
  const first=trace.steps.find(x=>x.source==='merge.copy')!.state;
  expect(first.a.map(x=>x.id)).toEqual([1,1,2,3]); expect(first.tmp[0]!.id).toBe(1); expect(first.tmp[1]!.id).toBe(0);
});
it('last-element Lomuto terminates worst cases with exact quadratic comparisons', () => {
  for(const values of [Array.from({length:32},(_,i)=>i),Array(32).fill(2)]) {
    const end=quickTrace(values).steps.at(-1)!.state;
    expect(end.counters.comparisons).toBe(32*31/2); expect(end.counters.maxDepth).toBe(32); expect(end.stack).toEqual([]);
  }
});
it('scene is a projection of storage, with buffers and decimal padding', () => {
  const state=radixTrace([2,45,170]).steps.find(x=>x.source==='radix.clear')!.state;
  const scene=advancedScene(state); expect(scene.rows.map(x=>x.id)).toEqual(['input','buffer','counts']);
  expect(scene.rows[0]!.items).toEqual(state.a); expect(scene.facts.flat().join(' ')).toContain('002');
  const heap=heapSortTrace([3,1,2]).steps.find(x=>x.source==='heap.shrink')!.state;
  expect(advancedScene(heap).heapSize).toBe(2); expect(advancedScene(heap).rows[0]!.finalized).toEqual([2]);
});
// Seeded corpus uses the language's stable numeric sort as a genuinely independent oracle.
for(const kind of ['merge','quick','heap','counting','radix'] as const) it(`${kind}: seeded corpus oracle`,()=>{
  let seed=7401; const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  for(let trial=0;trial<50;trial++) {
    const values=Array.from({length:random()%17},()=>random()%10);
    const trace=builders[kind](values), end=trace.steps.at(-1)!.state;
    const expected=values.map((key,id)=>({key,id})).sort((a,b)=>a.key-b.key);
    expect(end.a.map(x=>x.key)).toEqual(expected.map(x=>x.key));
    if(['merge','counting','radix'].includes(kind))expect(end.a).toEqual(expected);
    expect(advancedInvariants(end).every(x=>x.status==='pass')).toBe(true);
  }
});
it('recursive returns restore their own ranges and clear descendant cursors', () => {
  for (const build of [mergeTrace,quickTrace]) {
    const trace=build([8,3,5,1,6,2,7,4]);
    const active: [number,number][]=[];
    for(const step of trace.steps) {
      if(step.source?.endsWith('.enter')) active.push([step.state.lo,step.state.hi]);
      if(step.source?.endsWith('.leave')) {
        expect([step.state.lo,step.state.hi]).toEqual(active.pop());
        expect(step.state.i).toBe(-1); expect(step.state.j).toBe(-1);
      }
    }
    expect(active).toEqual([]);
  }
});
it('every trace tag highlights a visible canonical statement', () => {
  for(const [chapter,file] of Object.values(advancedFiles)) {
    const source=readFileSync(`cpp/chapter-${chapter}/${file}.hpp`,'utf8');
    for(const line of source.split('\n').filter(line=>line.includes('@trace '))) expect(line.split('// @trace')[0]!.trim()).not.toBe('');
  }
});
it('invariants inspect actual pivot identity, cursor bounds, permutation length and newly emitted buffer record', () => {
  const trace=quickTrace([3,1,2]);
  const active=trace.steps.find(x=>x.source==='quick.pivot')!.state;
  const check=(state: typeof active) => advancedInvariants(state).find(x=>x.name==='Pivot identity and scan bounds')!.status;
  expect(check(active)).toBe('pass');
  for(const corrupt of [
    (s:typeof active)=>{s.a[s.pivot]!.id=0;},
    (s:typeof active)=>{s.pivot=s.lo;},
    (s:typeof active)=>{s.j=s.hi;},
    (s:typeof active)=>{s.i=s.lo-1;},
    (s:typeof active)=>{s.i=s.hi+1;},
  ]) {
    const s=structuredClone(active); corrupt(s); expect(s.fault).toBe(''); expect(check(s)).toBe('fail');
  }
  const placed=structuredClone(trace.steps.find(x=>x.source==='quick.place')!.state);
  placed.a[placed.pivot]!.id=-1; expect(check(placed)).toBe('fail');
  const tooLong=structuredClone(active); tooLong.a.push({...tooLong.a[0]!});
  expect(advancedInvariants(tooLong).find(x=>x.name==='Input is a permutation')!.status).toBe('fail');
  const merge=mergeTrace([2,1]).steps.filter(x=>x.source==='merge.output').at(-1)!.state;
  const bad=structuredClone(merge); bad.tmp[bad.k]={...bad.tmp[0]!};
  expect(advancedInvariants(bad).find(x=>x.name==='Buffer contains unique records')!.status).toBe('fail');
  const reversed=structuredClone(merge); [reversed.tmp[0],reversed.tmp[1]]=[reversed.tmp[1]!,reversed.tmp[0]!];
  expect(advancedInvariants(reversed).find(x=>x.name==='Merged prefix is stable and sorted')!.status).toBe('fail');
});
