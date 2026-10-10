import type { LabAdapter } from '../../components/controls/lab-types';
import type { Graph, GraphEvent, GraphScene } from '../graph/types';
import { graphFrom, graphPresentation } from '../graph/model';
import { weightedTrace, unionFindState, unionFindTrace, weightedInvariants, type WeightedKind, type WeightedState } from './model';

export const weightedPresets:Record<string,Graph> = {
  stale:graphFrom(['A','B','C','D','E'],[[0,1,9],[0,2,2],[2,1,1],[1,3,2],[2,3,8]],true),
  negative:graphFrom(['A','B','C','D'],[[0,1,4],[0,2,5],[2,1,-3],[1,3,2]],true),
  cycle:graphFrom(['A','B','C','D'],[[0,1,1],[1,2,-2],[2,1,-2],[2,3,3]],true),
  unreachableCycle:graphFrom(['A','B','C','D'],[[0,1,2],[2,3,-2],[3,2,-2]],true),
  equal:graphFrom(['A','B','C','D'],[[0,1,1],[0,2,1],[1,3,1],[2,3,1],[1,2,1]]),
  forest:graphFrom(['A','B','C','D','E','F'],[[0,1,3],[1,2,1],[0,2,2],[3,4,-2],[4,4,-5]]),
  self:graphFrom(['A'],[[0,0,0]],true),
  empty:graphFrom([],[],true),
};
export function weightedScene(s:WeightedState):GraphScene {
  const dsu=s.kind==='union-find', kr=s.kind==='kruskal';
  const graph=dsu?{labels:s.graph.labels,edges:s.parent.map((p,i)=>({from:i,to:p,weight:1})),directed:true}:s.graph;
  const edgeStates:GraphScene['edgeStates']={};
  if(!dsu){for(const i of s.predEdge)if(i>=0)edgeStates[i]='tree';for(const i of s.accepted)edgeStates[i]='accepted';for(const i of s.rejected)edgeStates[i]='rejected';if(s.edge>=0&&!s.result)edgeStates[s.edge]='active';}
  const fields=graph.labels.map((_,i):Record<string,string|number|boolean>=>dsu||kr?{parent:graph.labels[s.parent[i]!]!,size:s.size[i]!,root:s.parent[i]===i}:{distance:s.negative?'provisional '+(s.distance[i]??'∞'):(s.distance[i]??'∞'),predecessor:s.pred[i]===-1?'none':graph.labels[s.pred[i]!]!,...(s.kind==='dijkstra'?{settled:s.settled[i]!}:{status:s.negative?'provisional':s.result?'final':'tentative'})});
  const auxiliary=dsu?[{label:'Saved find path (before compression)',entries:s.path.map(i=>graph.labels[i]!)},{label:'Components / answer',entries:[String(s.components),s.answer<0?'—':String(s.answer)]}]:kr?[{label:'Sorted edge queue (weight, original index)',entries:s.order.map(i=>`${s.graph.edges[i]!.weight}: e${i}`)},{label:'Accepted / rejected / total / components',entries:[s.accepted.join(', ')||'none',s.rejected.join(', ')||'none',String(s.total),String(s.components)]}]:[{label:s.kind==='dijkstra'?'Priority queue (sorted dequeue order; duplicates retained)':'Pass / extra detection scan',entries:s.kind==='dijkstra'?s.queue.map(([d,u])=>`(${d}, ${graph.labels[u]})${d!==s.distance[u]?' STALE':''}`):[String(s.pass),s.changed?'pass updated a distance':'no update this pass',s.negative?'reachable negative cycle':'no cycle detected yet']},{label:'Candidate (not an assignment)',entries:[s.candidate===null?'—':String(s.candidate)]}];
  return {graph,fields,active:s.active<0?null:s.active,visited:s.settled.flatMap((v,i)=>v?[i]:[]),discovered:s.distance.flatMap((d,i)=>d!==null&&!s.settled[i]?[i]:[]),edgeStates,auxiliary,output:[],result:s.result,weighted:!dsu,showRepresentations:false};
}
function parseGraph(inputs:FormData,kind:WeightedKind):Graph {
  const preset=String(inputs.get('preset')??(kind==='bellman-ford'?'negative':kind==='kruskal'?'equal':'stale'));
  if(preset!=='custom') {const graph=weightedPresets[preset];if(!graph)throw new Error('Choose a graph preset.');return kind==='kruskal'?{...structuredClone(graph),directed:false}:structuredClone(graph);}
  const rawLabels=String(inputs.get('labels')??'A,B,C,D');
  const labels=rawLabels.trim()?rawLabels.split(',').map(x=>x.trim()):[];
  const raw=String(inputs.get('edges')??'').trim();
  const tuples=raw?raw.split(';').map(edge=>{const bits=edge.trim().split(/\s+/).map(Number);if(bits.length!==3)throw new Error('Write each edge as from to weight; separate edges with semicolons.');return bits as [number,number,number];}):[];
  return graphFrom(labels,tuples,kind!=='kruskal'&&inputs.get('directed')!=='false');
}
function adapter(kind:WeightedKind):LabAdapter<WeightedState,GraphEvent> {
  return {
    build(operation,inputs) {
      if(kind!=='union-find')return weightedTrace(kind,parseGraph(inputs,kind),Number(inputs.get('source')??0));
      const raw=String(inputs.get('labels')??'A,B,C,D,E,F');const labels=raw.trim()?raw.split(',').map(x=>x.trim()):[];
      const pairs=String(inputs.get('unions')??'0 1;2 3;0 2').trim();
      const unions=pairs?pairs.split(';').map(pair=>{const p=pair.trim().split(/\s+/).map(Number);if(p.length!==2)throw new Error('Initial unions use pairs: 0 1;2 3;0 2.');return p as [number,number];}):[];
      return unionFindTrace(operation,unionFindState(labels,unions),Number(inputs.get('a')??3),Number(inputs.get('b')??4),String(inputs.get('newLabel')??'G'));
    },
    ...graphPresentation(weightedScene),
    invariants:weightedInvariants,
    regions:()=>[kind==='dijkstra'?'dijkstra':kind==='bellman-ford'?'bellman-ford':kind==='kruskal'?'kruskal':'union-find'],
    counters:s=>[{label:'Edges inspected',value:s.scans},{label:'Field writes',value:s.writes},{label:'Queue operations',value:s.queueOps},{label:'Parent traversals',value:s.traversals}],
  };
}
export const dijkstraAdapter=adapter('dijkstra');
export const bellmanFordAdapter=adapter('bellman-ford');
export const kruskalAdapter=adapter('kruskal');
export const unionFindAdapter=adapter('union-find');
