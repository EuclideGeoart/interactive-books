import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { teachingHash, validateKey } from '../../src/visualizers/hashing/hash';
import { hashTrace } from '../../src/visualizers/hash-fundamentals/model';
import { chainState, chainTrace, chainInvariants, chainSnapshot, breakChain, distributionEvidence, parseEntries, type ChainOperation } from '../../src/visualizers/chaining/model';
import { chainingAdapter, drawChain } from '../../src/visualizers/chaining/adapter';
import { hashFundamentalsAdapter } from '../../src/visualizers/hash-fundamentals/adapter';
import { sourceLines } from '../../src/engine/source';
import { PlaybackController } from '../../src/engine/playback';
const final = (op: ChainOperation, entries: [string,number][], key='a', value=7) => chainTrace(op,chainState(entries),key,value).steps.at(-1)!.state;
it('fixed policy validates lowercase ASCII and wraps uint32',()=>{
  expect(teachingHash('cat')).toBe(98262);
  expect(teachingHash('zzzzzzzzzzzz')).toBe(Number([...('zzzzzzzzzzzz')].reduce((h,c)=>(h*31n+BigInt(c.charCodeAt(0)))%4294967296n,0n)));
  for(const key of ['', 'A','a b','é','abcdefghijklmn','a\n']) expect(()=>validateKey(key)).toThrow();
  for(const key of ['a','abcdefghijkl']) expect(()=>validateKey(key)).not.toThrow();
});
it('capacity changes mapping without changing hash and explicitly reveals collisions',()=>{
  const eight=hashTrace('a','i',8).steps.at(-1)!.state;
  const sixteen=hashTrace('a','i',16).steps.at(-1)!.state;
  expect(eight.result).toContain('Collision'); expect(sixteen.result).toContain('Different buckets'); expect(eight.hash).toBe(sixteen.hash);
  expect(hashTrace('a','a',8).steps.at(-1)!.state.result).toContain('Equal keys');
  expect(()=>hashTrace('a','i',0)).toThrow();
});
it('duplicate assignment preserves identity, size, capacity and zero values',()=>{
  const initial=chainState([['a',1],['i',2],['q',3],['b',4],['c',5],['d',6]]);
  const s=chainTrace('update',initial,'a',0).steps.at(-1)!.state;
  expect(s.size).toBe(6); expect(s.buckets.length).toBe(8); expect(s.nodes.length).toBe(6); expect(s.nodes[0]!.value).toBe(0);
  expect(chainTrace('find',s,'a').steps.at(-1)!.state.result).toBe('Found 0');
  expect(initial.nodes[0]!.value).toBe(1);
});
it('empty, missing, head, middle and tail deletions preserve remaining chains',()=>{
  expect(final('erase',[]).size).toBe(0);
  expect(final('erase',[['a',1]]).size).toBe(0);
  for(const key of ['a','i','q','z']) {
    const s=final('erase',[['a',1],['i',2],['q',3]],key);
    expect(s.size).toBe(key==='z'?3:2);
    expect(chainInvariants(s,true).every(r=>r.status==='pass')).toBe(true);
  }
});
it('actual comparisons distinguish empty buckets, collision traversal and missing suffix',()=>{
  const s=chainState([['a',1],['i',2],['q',3]]);
  expect(chainTrace('find',s,'a').steps.at(-1)!.state.comparisons).toBe(3);
  expect(chainTrace('find',s,'y').steps.at(-1)!.state.comparisons).toBe(3);
  expect(chainTrace('find',s,'b').steps.at(-1)!.state.comparisons).toBe(0);
});
it('threshold 8→16 remaps every entry while retaining node identities and temporary owners',()=>{
  const s=chainState([['a',1],['i',2],['q',3],['b',4],['c',5],['d',6]]);
  const t=chainTrace('insert',s,'e',7);const end=t.steps.at(-1)!.state;
  expect(end.buckets.length).toBe(16);expect(end.size).toBe(7);
  expect(chainSnapshot(end).buckets[9]).toEqual([['i',2]]);
  expect(end.nodes.slice(0,6).map(n=>[n.id,n.key,n.row,n.column])).toEqual(s.nodes.map(n=>[n.id,n.key,n.row,n.column]));
  expect(t.steps.some(s=>s.state.replacement && Object.keys(chainSnapshot(s.state).locals).length===2)).toBe(true);
  for(const step of t.steps) expect(chainInvariants(step.state,false).filter(r=>r.status==='fail')).toEqual([]);
  expect(chainInvariants(end,true).every(r=>r.status==='pass')).toBe(true);
});
it('break-it scenarios detect duplicate keys, lost ownership and wrong modulo',()=>{
  for(const fault of ['duplicate','lost-link','old-bucket'] as const) expect(chainInvariants(breakChain(fault),true).some(r=>r.status==='fail')).toBe(true);
});
it('distribution measurements come from actual key comparisons',()=>{
  for(const count of [8,16,32,64]) {
    const pathological=distributionEvidence(count,true), normal=distributionEvidence(count,false);
    expect(pathological.comparisons).toBe(count*(count+1)/2);expect(pathological.worst).toBe(count); expect(pathological.average).toBe((count+1)/2);
    expect(normal.comparisons).toBeLessThan(pathological.comparisons);expect(normal.load).toBe(pathological.load);
    expect(pathological.buckets[1]!.every(key=>teachingHash(key)%16===1)).toBe(true);
  }
});
it('reverse playback selects retained snapshots, including erased nodes',()=>{
  const t=chainTrace('erase',chainState([['a',1],['i',2],['q',3]]),'i');
  const controller=new PlaybackController(t,()=>{});controller.seek(controller.total); expect(controller.state.size).toBe(2);controller.reset();expect(controller.state).toEqual(t.initial);controller.next();controller.previous();expect(controller.state).toEqual(t.initial);controller.dispose();
});
it('canonical regions contain each emitted source exactly once',()=>{
  const source=readFileSync('cpp/chapter-20/ChainedMap.hpp','utf8');
  for(const op of ['insert','find','update','erase','contains','rehash'] as const) {
    const tags=chainingAdapter.regions(op,new FormData()).flatMap(region=>sourceLines(source,region)).map(line=>line.tag);
    for(const step of chainTrace(op,chainState([['a',1],['i',2],['q',3],['b',4],['c',5],['d',6]]),'e').steps) if(step.source) expect(tags.filter(tag=>tag===step.source)).toHaveLength(1);
  }
  const hashSource=readFileSync('cpp/chapter-18/TeachingHash.hpp','utf8');
  const tags=hashFundamentalsAdapter.regions('hash',new FormData()).flatMap(region=>sourceLines(hashSource,region)).map(line=>line.tag);
  expect(tags.filter(t=>t===hashTrace('a','i',8).steps[0]!.source)).toHaveLength(1);
});
it('both views expose selectable nodes, truthful ownership and freed storage',()=>{
  const s=chainState([['a',1],['i',2],['q',3]]);
  for(const view of ['logical','memory'] as const) {const svg=drawChain(s,'test',view,null);expect(svg).toContain('data-node="0xE000"');expect(svg).toContain('data-field="next"');expect(svg).toContain('nullptr');}
  const t=chainTrace('rehash',s);const allocation=t.steps.find(s=>s.source==='rehash.allocate')!.state;
  const inspector=chainingAdapter.inspect(allocation,'0xE080');expect(inspector).toContain('current');expect(inspector).toContain('destination under new capacity');
  const dead=final('erase',[['a',1]],'a');expect(chainingAdapter.inspect(dead,'0xE000')).toContain('fields unavailable');expect(drawChain(dead,'test','logical',null)).toContain('FREED');
});
it('input bounds reject malformed pairs and unsupported capacities',()=>{
  expect(parseEntries('')).toEqual([]);expect(parseEntries('a:0,i:-9')).toEqual([['a',0],['i',-9]]);
  for(const raw of ['a:1:2','A:1','a:x','a:1000',Array(9).fill('a:1').join(',')]) expect(()=>parseEntries(raw)).toThrow();
  expect(()=>chainState([],0)).toThrow();
});
