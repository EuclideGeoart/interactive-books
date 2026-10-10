import { expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { searchSortAdapters,searchSortInputs, type SearchSortKey } from '../../src/visualizers/search-sort/adapter';
import { sourceLines } from '../../src/engine/source';
import { finalState } from '../../src/visualizers/search-sort/model';
const chapters:[SearchSortKey,string,string,string][]=[
  ['linear-search','37','LinearSearch','linear'],['binary-search','38','BinarySearch','binary'],
  ['sorting-fundamentals','39','Fundamentals','inspect'],['elementary-sorts','40','ElementarySorts','bubble'],
];
for(const [key,chapter,header,operation] of chapters){
  it(`${key} uses shared renderer in both views and exposes all facts in text`,()=>{
    const a=searchSortAdapters[key],form=new FormData(),trace=a.build(operation,form),s=trace.steps.at(-1)!.state;
    for(const view of ['logical','memory'] as const){const html=a.draw(s,'test',view,'array:0');expect(html).toContain('data-node="array:0"');expect(html).toContain('<svg');}
    expect(a.describe(s)).toContain('Comparisons:');expect(a.inspect(s,'array:0')).toContain('Identity');
    expect(a.invariants(s,true).filter(x=>x.status==='fail')).toEqual([]);
    const source=readFileSync(`cpp/chapter-${chapter}/${header}.hpp`,'utf8');
    const tags=new Set(a.regions(operation,form).flatMap(region=>sourceLines(source,region).flatMap(line=>line.tag?[line.tag]:[])));
    expect(trace.steps.every(step=>tags.has(step.source!))).toBe(true);
  });
  it(`${key} has thirteen authored section IDs and dependency instructions`,()=>{
    const slug=chapter==='37'?'linear-search':chapter==='38'?'binary-search':chapter==='39'?'sorting-fundamentals':'elementary-sorts';
    const text=readFileSync(`src/content/chapters/${chapter}-${slug}.mdx`,'utf8');
    expect([...text.matchAll(/<Section id="([^"]+)"/g)].map(m=>m[1])).toEqual(['mental-model','intuition','memory','operations','implementation','pointer-trace','invariants','complexity','break-it','analogy','engineering','exercises','summary']);
    expect(text).toContain(`<SearchSortDownload chapter="${chapter}"`);expect(text).toContain(`<SortingComplexity chapter="${chapter}"`);
  });
}
it('adapter accepts empty custom input and rejects malformed/range-invalid input',()=>{
  const f=new FormData();f.set('preset','custom');f.set('values','');expect(searchSortInputs(f,'linear-search').values).toEqual([]);
  for(const raw of ['1,,2','NaN','2.5','1000001',Array(13).fill('1').join(',')]){f.set('values',raw);expect(()=>searchSortInputs(f,'linear-search')).toThrow();}
  f.set('values','1,2,3');f.set('target','1.2');expect(()=>searchSortInputs(f,'linear-search')).toThrow();
});
it('comparative results are immutable normal runs from the original input',()=>{
  const f=new FormData();f.set('preset','stability');f.set('mode','unstable-ties');
  const trace=searchSortAdapters['elementary-sorts'].build('bubble',f),s=trace.steps.at(-1)!.state;
  expect(s.fault).toBe('unstable-ties');expect(s.comparison?.map(x=>x.stable)).toEqual([true,false,true]);
  expect(Object.isFrozen(s.comparison)).toBe(true);expect(Object.isFrozen(s.comparison?.[0])).toBe(true);
  expect(searchSortAdapters['elementary-sorts'].describe(s)).toContain('SAME original input');
});
it('fundamentals swap and binary faults route through canonical regions',()=>{
  const f=new FormData();f.set('preset','custom');f.set('values','2,1,2');f.set('left','0');f.set('right','2');
  const a=searchSortAdapters['sorting-fundamentals'];expect(a.regions('swap',f)).toEqual(['explore']);expect(finalState(a.build('swap',f)).a.map(x=>x.id)).toEqual([2,1,0]);
  f.set('preset','single');f.set('target','41');f.set('mode','nonprogress');expect(finalState(searchSortAdapters['binary-search'].build('binary',f)).fault).toBe('nonprogress');
});
