import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { weightedTrace, unionFindState, unionFindTrace, weightedInvariants, checkedAdd } from '../../src/visualizers/graph-weighted/model';
import { weightedPresets, weightedScene, dijkstraAdapter } from '../../src/visualizers/graph-weighted/adapter';
import { graphFrom } from '../../src/visualizers/graph/model';
import { sourceLines } from '../../src/engine/source';
const end=(t:ReturnType<typeof weightedTrace>)=>t.steps.at(-1)!.state;

describe('weighted shortest paths',()=>{
 it('keeps duplicate entries and discards stale entries, separating candidate/distance/pred',()=>{
  const t=weightedTrace('dijkstra',weightedPresets.stale!);const s=end(t);
  expect(s.distance).toEqual([0,3,2,5,null]);expect(s.pred).toEqual([-1,2,0,1,-1]);
  expect(t.steps.filter(x=>x.source==='dj.stale')).toHaveLength(2);
  expect(t.steps.some(x=>x.state.queue.filter(([,u])=>u===1).length===2)).toBe(true);
  const candidate=t.steps.findIndex(x=>x.source==='dj.candidate');expect(t.steps[candidate]!.state.distance[1]).toBe(null);
  const write=t.steps.findIndex(x=>x.source==='dj.distance');expect(t.steps[write]!.state.pred[1]).toBe(-1);expect(t.steps[write+1]!.state.pred[1]).toBe(0);
 });
 it('rejects negative Dijkstra input before any trace',()=>expect(()=>weightedTrace('dijkstra',weightedPresets.negative!)).toThrow(/nonnegative/));
 it('handles zero loops, empty, singleton, unreachable and equal alternatives',()=>{
  expect(end(weightedTrace('dijkstra',weightedPresets.self!)).distance).toEqual([0]);
  expect(end(weightedTrace('dijkstra',weightedPresets.empty!)).distance).toEqual([]);
  const equal=end(weightedTrace('dijkstra',weightedPresets.equal!));expect(equal.distance).toEqual([0,1,1,2]);expect(equal.pred[3]).toBe(1);
 });
 it('Bellman–Ford converges with negative edges and no cycle',()=>{const s=end(weightedTrace('bellman-ford',weightedPresets.negative!));expect(s.distance).toEqual([0,2,5,4]);expect(s.negative).toBe(false);});
 it('distinguishes reachable and unreachable negative cycles',()=>{
  const s=end(weightedTrace('bellman-ford',weightedPresets.cycle!));expect(s.negative).toBe(true);expect(weightedScene(s).fields[0]!.distance).toContain('provisional');expect(s.result).toContain('withheld');
  expect(end(weightedTrace('bellman-ford',weightedPresets.unreachableCycle!)).negative).toBe(false);
  expect(end(weightedTrace('bellman-ford',graphFrom(['A'],[[0,0,-1]],true))).negative).toBe(true);
  expect(end(weightedTrace('bellman-ford',graphFrom(['A','B'],[[0,1,-1]]))).negative).toBe(true);
 });
 it('early-exits but still performs detection; infinity is never added',()=>{
  const t=weightedTrace('bellman-ford',weightedPresets.unreachableCycle!);expect(t.steps.some(x=>x.source==='bf.early')).toBe(true);expect(t.steps.some(x=>x.source==='bf.detect-pass')).toBe(true);expect(t.steps.every(x=>x.state.candidate===null||Number.isSafeInteger(x.state.candidate))).toBe(true);
 });
 it('checks exact arithmetic and input ownership',()=>{expect(()=>checkedAdd(Number.MAX_SAFE_INTEGER,1)).toThrow();expect(()=>weightedTrace('dijkstra',weightedPresets.self!,1)).toThrow();expect(()=>graphFrom(['A'],[[0,0,1.5]])).toThrow();});
});
describe('minimum spanning forest',()=>{
 it('chooses deterministic ties without claiming uniqueness',()=>{const s=end(weightedTrace('kruskal',weightedPresets.equal!));expect(s.accepted).toEqual([0,1,2]);expect(s.total).toBe(3);expect(s.components).toBe(1);});
 it('keeps disconnected components, permits negative edges and rejects self-loops',()=>{const s=end(weightedTrace('kruskal',weightedPresets.forest!));expect(s.accepted).toEqual([3,1,2]);expect(s.rejected).toEqual([4,0]);expect(s.total).toBe(1);expect(s.components).toBe(3);expect(s.result).toContain('forest');expect(weightedInvariants(s,true).every(x=>x.status==='pass')).toBe(true);});
 it('rejects direction and detects accepted cycles',()=>{expect(()=>weightedTrace('kruskal',weightedPresets.stale!)).toThrow();const s=end(weightedTrace('kruskal',weightedPresets.equal!));s.accepted.push(3);expect(weightedInvariants(s,true).some(x=>x.status==='fail')).toBe(true);});
});
describe('union-find owns a forest',()=>{
 it('shows a genuine chain, exact compression, fixed positions and self-root arrows',()=>{
  const s=unionFindState();expect(s.parent.slice(0,4)).toEqual([0,0,0,2]);
  const t=unionFindTrace('find',s,3);const before=t.initial,after=end(t);
  expect(after.parent.slice(0,4)).toEqual([0,0,0,0]);expect(after.path).toEqual([3,2]);expect(after.traversals).toBe(2);expect(after.writes).toBe(1);
  expect(t.steps.filter(x=>x.source==='uf.compress')).toHaveLength(1);expect(weightedScene(before).positions).toEqual(weightedScene(after).positions);
  expect(weightedScene(after).graph.edges.filter(e=>e.from===e.to).map(e=>e.from)).toEqual([0,4,5]);
  expect(end(unionFindTrace('find',after,3)).traversals).toBe(1);expect(s.parent[3]).toBe(2);
 });
 it('unites by size, breaks equal-size ties by numeric root, supports connected and make-set',()=>{
  let s=unionFindState(['A','B','C','D'],[]);s=end(unionFindTrace('union',s,3,2));expect(s.parent[3]).toBe(2);
  s=end(unionFindTrace('union',s,2,0));expect(s.parent[0]).toBe(2);expect(s.size[2]).toBe(3);
  expect(end(unionFindTrace('connected',s,0,3)).answer).toBe(1);expect(end(unionFindTrace('connected',s,0,1)).answer).toBe(0);
  s=end(unionFindTrace('make-set',s,0,0,'E'));expect(s.parent[4]).toBe(4);expect(s.graph.labels).toEqual(['A','B','C','D','E']);
  expect(end(unionFindTrace('make-set',unionFindState([],[]),0,0,'A')).parent).toEqual([0]);
 });
 it('rejects invalid IDs before mutation and catches malformed parent/size invariants',()=>{
  const s=unionFindState();expect(()=>unionFindTrace('union',s,3,6)).toThrow(/owner/);expect(s.parent[3]).toBe(2);expect(()=>unionFindTrace('make-set',s,0,0,'A')).toThrow();
  s.parent[0]=1;expect(weightedInvariants(s,true).some(x=>x.status==='fail')).toBe(true);
  const size=unionFindState();size.size[0]=99;expect(weightedInvariants(size,true).some(x=>x.status==='fail')).toBe(true);
 });
});
it('all tagged states resolve to shipped C++ and every initial/finished state is valid',()=>{
 for(const [kind,num,file,preset] of [['dijkstra','33','Dijkstra','stale'],['bellman-ford','34','BellmanFord','cycle'],['kruskal','35','Kruskal','forest'],['union-find','36','UnionFind','']] as const){
  const t=kind==='union-find'?unionFindTrace('find',unionFindState(),3):weightedTrace(kind,weightedPresets[preset]!);
  const tags=new Set(sourceLines(readFileSync(`cpp/chapter-${num}/${file}.hpp`,'utf8')).map(x=>x.tag));for(const step of t.steps)expect(tags.has(step.source)).toBe(true);
  expect(weightedInvariants(t.initial,true).every(x=>x.status==='pass')).toBe(true);expect(weightedInvariants(end(t),true).every(x=>x.status==='pass')).toBe(true);
 }
});
it('adapter validates custom inputs and produces accessible shared graph scenes',()=>{
 const f=new FormData();f.set('preset','custom');f.set('labels','A,B');f.set('edges','0 1 2');const s=end(dijkstraAdapter.build('run',f));expect(s.distance).toEqual([0,2]);
 const svg=dijkstraAdapter.draw(s,'weighted-test','logical','v:0');expect(svg).toContain('v:0');expect(dijkstraAdapter.describe(s)).toContain('A');
});

it('rejects blank custom label fields without silently changing endpoint identities',()=>{
 const f=new FormData();f.set('preset','custom');f.set('labels','A,,B');f.set('edges','');expect(()=>dijkstraAdapter.build('run',f)).toThrow();
 expect(()=>unionFindTrace('make-set',unionFindState([],[]),0,0,'x'.repeat(25))).toThrow();
});
it('shortest-path distances agree with independent all-pairs relaxation on varied nonnegative graphs',()=>{
 for(let seed=1;seed<=24;seed++){
  const n=5,edges:[number,number,number][]=[];
  for(let u=0;u<n;u++)for(let v=0;v<n;v++)if((u*11+v*7+seed)%4===0)edges.push([u,v,(u*3+v+seed)%7]);
  const g=graphFrom(['A','B','C','D','E'],edges,true);const matrix=Array.from({length:n},(_,u)=>Array.from({length:n},(_,v)=>u===v?0:Infinity));
  for(const [u,v,w] of edges)matrix[u]![v]=Math.min(matrix[u]![v]!,w);
  for(let k=0;k<n;k++)for(let u=0;u<n;u++)for(let v=0;v<n;v++)matrix[u]![v]=Math.min(matrix[u]![v]!,matrix[u]![k]!+matrix[k]![v]!);
  for(const kind of ['dijkstra','bellman-ford'] as const)expect(end(weightedTrace(kind,g,seed%n)).distance).toEqual(matrix[seed%n]!.map(d=>d===Infinity?null:d));
 }
});
it('Kruskal total matches exhaustive spanning-tree search even with equal and negative weights',()=>{
 for(let seed=0;seed<12;seed++){
  const edges:[number,number,number][]=[[0,1,seed%3-1],[0,2,1],[0,3,seed%2],[1,2,0],[1,3,2],[2,3,-1]];
  let best=Infinity;
  for(let mask=0;mask<64;mask++){
   const picked=edges.filter((_,i)=>(mask&(1<<i))!==0);if(picked.length!==3)continue;
   const reached=new Set([0]);for(let k=0;k<4;k++)for(const [a,b]of picked){if(reached.has(a))reached.add(b);if(reached.has(b))reached.add(a);}
   if(reached.size===4)best=Math.min(best,picked.reduce((sum,e)=>sum+e[2],0));
  }
  expect(end(weightedTrace('kruskal',graphFrom(['A','B','C','D'],edges))).total).toBe(best);
 }
});
it('DSU preserves an independent partition over repeated unions and compressing queries',()=>{
 let s=unionFindState(['A','B','C','D','E','F','G','H'],[]);const component=Array.from({length:8},(_,i)=>i);
 for(let k=0;k<30;k++){
  const a=(k*3)%8,b=(k*5+2)%8,old=component[b],target=component[a];
  const before=s.components;s=end(unionFindTrace('union',s,a,b));for(let i=0;i<8;i++)if(component[i]===old)component[i]=target!;
  expect(s.components).toBe(before-Number(old!==target));expect(weightedInvariants(s,true).every(x=>x.status==='pass')).toBe(true);
  for(let v=0;v<8;v++){const query=end(unionFindTrace('connected',s,a,v));expect(Boolean(query.answer)).toBe(component[a]===component[v]);s=query;}
 }
});
