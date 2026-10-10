import { beforeAll, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { compileWeightedFixture, weightedFiles } from '../../scripts/graph-weighted-fixture.mjs';
import { weightedTrace, weightedSnapshot, unionFindState, unionFindTrace } from '../../src/visualizers/graph-weighted/model';
import { graphFrom } from '../../src/visualizers/graph/model';
import type { Graph } from '../../src/visualizers/graph/types';
const binaries:Record<string,string>={};
beforeAll(()=>{for(const kind of Object.keys(weightedFiles))binaries[kind]=compileWeightedFixture(kind);},30000);
const native=(kind:string,args:string[])=>execFileSync(binaries[kind]!,args,{encoding:'utf8'}).trim().split('\n').filter(Boolean).map(line=>{const [tag,state]=line.split('|');return[tag,JSON.parse(state!)];});
const labels=(n:number)=>Array.from({length:n},(_,i)=>String.fromCharCode(65+i));
const fixtures:Graph[]=[
 graphFrom([],[],true),graphFrom(['A'],[],true),graphFrom(['A'],[[0,0,0]],true),
 graphFrom(labels(5),[[0,1,9],[0,2,2],[2,1,1],[1,3,2],[2,3,8]],true),
 graphFrom(labels(4),[[0,1,1],[0,2,1],[1,3,1],[2,3,1],[1,2,1]]),
 graphFrom(labels(4),[[0,1,4],[0,2,5],[2,1,-3],[1,3,2]],true),
 graphFrom(labels(4),[[0,1,1],[1,2,-2],[2,1,-2],[2,3,3]],true),
 graphFrom(labels(4),[[0,1,2],[2,3,-2],[3,2,-2]],true),
 graphFrom(labels(6),[[0,1,3],[1,2,1],[0,2,2],[3,4,-2],[4,4,-5]]),
 graphFrom(['A'],[[0,0,-1]],true),graphFrom(labels(3),[[2,1,1000000],[1,0,-1000000]],true),
 graphFrom(labels(3),[[2,1,1],[1,0,1]],true),
 graphFrom(labels(4),[[0,1,0],[1,2,0],[2,3,0],[3,0,0]]),
];
for(const kind of ['dijkstra','bellman-ford','kruskal'] as const)for(const [index,g] of fixtures.entries()){
 if(kind==='dijkstra'&&g.edges.some(e=>e.weight<0))continue;
 if(kind==='kruskal'&&g.directed&&g.edges.some((e,i)=>g.edges.some((p,j)=>j<i&&p.from===e.to&&p.to===e.from)))continue;
 const graph=kind==='kruskal'?{...g,directed:false}:g;
 for(const source of graph.labels.length?[0,graph.labels.length-1]:[0])it(`${kind} fixture ${index}, source ${source}: every tagged snapshot`,()=>{
  const t=weightedTrace(kind,graph,source);expect(t.steps.map(s=>[s.source,weightedSnapshot(s.state)])).toEqual(native(kind,[String(graph.labels.length),String(Number(graph.directed)),String(source),'_',...graph.edges.flatMap(e=>[e.from,e.to,e.weight].map(String))]));
 });
}
for(const [n,unions] of [[0,[]],[1,[]],[6,[[0,1],[2,3],[0,2]]],[8,[[0,1],[2,3],[4,5],[6,7],[0,2],[4,6],[0,4]]]] as [number,[number,number][]][])
 for(const op of ['find','union','connected','make-set']) {
  if((!n&&op!=='make-set')||(n===8&&op==='make-set'))continue;
  const a=n-1,b=0;
  it(`union-find ${n} ${op}: every tagged snapshot`,()=>{
   const t=unionFindTrace(op,unionFindState(labels(n),unions),a,b,String.fromCharCode(65+n));
   expect(t.steps.map(s=>[s.source,weightedSnapshot(s.state)])).toEqual(native('union-find',[String(n),op,String(a),String(b),...unions.flat().map(String)]));
  });
 }
it('native public APIs reject invalid algorithm domains',()=>{
 expect(()=>native('dijkstra',['2','1','0','_','0','1','-1'])).toThrow();
 expect(()=>native('kruskal',['2','1','0','_'])).toThrow();
 expect(()=>native('union-find',['2','find','2','0'])).toThrow();
});
