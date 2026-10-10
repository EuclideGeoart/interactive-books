import { beforeAll, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { compileSearchSortFixture } from '../../scripts/search-sort-fixture.mjs';
import { linearTrace,binaryTrace,fundamentalsTrace,elementaryTrace,searchSortSnapshot,type SearchSortTrace,type BinaryMode } from '../../src/visualizers/search-sort/model';
let binary:string;beforeAll(()=>{binary=compileSearchSortFixture();},30000);
const reached=new Set<string>();
function parity(op:string,values:number[],trace:SearchSortTrace,target=40,mode='normal',desc=false,left=-1,right=-1){
  const text=execFileSync(binary,[op,String(target),mode,desc?'1':'0',String(left),String(right),...values.map(String)],{encoding:'utf8'});
  const native=text.trim().split('\n').map(line=>{const i=line.indexOf('|');return [line.slice(0,i),JSON.parse(line.slice(i+1))];});
  const actual=trace.steps.map(step=>{reached.add(step.source!);return [step.source,searchSortSnapshot(step.state)];});
  expect(actual).toEqual(native);
}
const cases=[[],[40],[1,2,3,4,5],[5,4,3,2,1],[2,2,2],[2,2,1],[1,2,4,3,5],[-1000000,-3,0,1000000],[1,2,2,2,3]];
for(const values of cases){
  for(const target of [40,1,2,5,-1000000,1000000,99]){
    it(`linear native ${values} target ${target}`,()=>parity('linear',values,linearTrace(values,target),target));
    it(`binary native ${values} target ${target}`,()=>parity('binary',values,binaryTrace(values,target),target));
  }
  for(const desc of [false,true]){
    it(`fundamentals native ${values} descending ${desc}`,()=>parity('fundamentals',values,fundamentalsTrace(values,desc),40,'normal',desc));
    for(const algorithm of ['bubble','selection','insertion'] as const)
      it(`${algorithm} native ${values} descending ${desc}`,()=>parity(algorithm,values,elementaryTrace(values,algorithm,desc),40,'normal',desc));
  }
}
for(const mode of ['update','nonprogress','unsorted'] satisfies BinaryMode[])
  for(const values of [[1],[1,2,3,4,5],[3,1,2]])for(const target of [0,2,4,8])
    it(`binary fault native ${mode} ${values} ${target}`,()=>parity('binary',values,binaryTrace(values,target,mode),target,mode));
for(const values of [[2,2,1],[2,2,2],[3,2,1]])
  it(`unstable ties native ${values}`,()=>parity('bubble',values,elementaryTrace(values,'bubble',false,true),40,'unstable-ties'));
it('arbitrary equal-record swap native',()=>parity('fundamentals',[2,1,2],fundamentalsTrace([2,1,2],false,[0,2]),40,'normal',false,0,2));
it('self swap native',()=>parity('fundamentals',[2],fundamentalsTrace([2],false,[0,0]),40,'normal',false,0,0));
it('every unique canonical tag has exact native state parity',()=>{
  const paths=['37/LinearSearch','38/BinarySearch','39/Fundamentals','40/ElementarySorts'];
  const tags=paths.flatMap(path=>[...readFileSync(`cpp/chapter-${path}.hpp`,'utf8').matchAll(/@trace ([\w.-]+)/g)].map(m=>m[1]!));
  expect(new Set(tags).size).toBe(tags.length);expect(tags.filter(tag=>!reached.has(tag))).toEqual([]);
});
