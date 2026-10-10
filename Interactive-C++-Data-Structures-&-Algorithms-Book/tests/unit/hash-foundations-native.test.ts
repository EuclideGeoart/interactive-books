import { beforeAll, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { compileHashFoundationsFixture, compileHashArithmeticFixture } from '../../scripts/hash-foundations-fixture.mjs';
import { chainState, chainTrace, chainSnapshot, type ChainOperation } from '../../src/visualizers/chaining/model';
import { hashTrace } from '../../src/visualizers/hash-fundamentals/model';
let binary: string, arithmetic: string;
beforeAll(() => { binary = compileHashFoundationsFixture(); arithmetic = compileHashArithmeticFixture(); });
const samples: [string, number][][] = [[], [['a',0]], [['a',1],['i',2],['q',3]], [['a',1],['i',2],['q',3],['b',4],['c',5],['d',6]], [['a',1],['i',2],['q',3],['b',4],['c',5],['d',6],['e',7],['f',8]], [['cat',1],['cat',9],['dog',-3]], [['zzzzzzzzzzzz',999]]];
const operations: ChainOperation[] = ['insert','update','find','contains','erase','rehash'];
for (const entries of samples) for (const operation of operations) for (const key of ['a','i','q','z']) it(`canonical chain ${operation} ${key} [${entries.map(x=>x[0])}]`, () => {
  const trace = chainTrace(operation, chainState(entries), key, 7);
  const semantic = trace.steps.filter(s => s.source).map(s => [s.source, chainSnapshot(s.state)]);
  const output = execFileSync(binary, [operation,key,'7',...entries.map(([k,v]) => `${k}:${v}`)], { encoding:'utf8' });
  const native = output.trim().split('\n').filter(Boolean).map(line => { const i=line.indexOf('|'); return [line.slice(0,i),JSON.parse(line.slice(i+1))]; });
  expect(semantic).toEqual(native);
});
for (const key of ['a','i','cat','dog','zzzzzzzzzzzz','abcdefghijkl']) for (const capacity of [4,8,16,32]) it(`canonical arithmetic ${key} mod ${capacity}`, () => {
  const trace=hashTrace(key,'a',capacity);
  const native=execFileSync(arithmetic,[key,String(capacity)],{encoding:'utf8'}).trim().split('\n').map(line=>{const [tag,value]=line.split('|');return [tag,Number(value)];});
  expect(trace.steps.map(s=>[s.source,s.source!.startsWith('hash.')?s.state.hash:s.state.bucket])).toEqual(native);
});
it('all canonical hash and chain source tags are exercised', () => {
  const reached = new Set<string>();
  for(const sample of samples) for(const op of operations) for(const key of ['a','i','q','z']) for(const step of chainTrace(op,chainState(sample),key,7).steps) if(step.source) reached.add(step.source);
  for(const step of hashTrace('zzzzzzzzzzzz','a',8).steps) if(step.source) reached.add(step.source);
  const source=readFileSync('cpp/chapter-18/TeachingHash.hpp','utf8')+readFileSync('cpp/chapter-20/ChainedMap.hpp','utf8');
  expect([...source.matchAll(/@trace ([\w.-]+)/g)].map(m=>m[1]).filter(t=>!reached.has(t!))).toEqual([]);
});
