import type { Trace, Invariant } from '../../engine/types';
import type { Graph, GraphEvent } from '../graph/types';
import { neighbors, validateGraph } from '../graph/model';

export type WeightedKind = 'dijkstra' | 'bellman-ford' | 'kruskal' | 'union-find';
export interface WeightedState {
  kind: WeightedKind; graph: Graph;
  distance: (number | null)[]; pred: number[]; predEdge: number[]; settled: boolean[];
  queue: [number, number][]; order: number[]; parent: number[]; size: number[];
  path: number[]; accepted: number[]; rejected: number[];
  active: number; edge: number; candidate: number | null; pass: number; changed: boolean;
  negative: boolean; components: number; total: number; scans: number; writes: number;
  queueOps: number; traversals: number; answer: number; result: string;
}
export function weightedState(kind: WeightedKind, graph: Graph): WeightedState {
  validateGraph(graph);
  const n = graph.labels.length;
  return { kind, graph: structuredClone(graph), distance: Array(n).fill(null), pred: Array(n).fill(-1), predEdge: Array(n).fill(-1), settled: Array(n).fill(false), queue: [], order: [], parent: Array.from({length:n},(_,i)=>i), size:Array(n).fill(1), path:[],accepted:[],rejected:[],active:-1,edge:-1,candidate:null,pass:0,changed:false,negative:false,components:n,total:0,scans:0,writes:0,queueOps:0,traversals:0,answer:-1,result:'' };
}
function vertex(s: WeightedState, u: number) {
  if (!Number.isInteger(u) || u < 0 || u >= s.parent.length) throw new Error('Vertex must belong to this graph / disjoint-set owner.');
}
export function checkedAdd(a:number,b:number) {
  const c = a+b;
  if (!Number.isSafeInteger(c)) throw new Error('Distance / total exceeds exact integer arithmetic.');
  return c;
}
export function weightedTrace(kind: WeightedKind, graph: Graph, source=0): Trace<WeightedState,GraphEvent> {
  const s = weightedState(kind,graph);
  if(kind==='union-find') throw new Error('Use unionFindTrace for disjoint-set operations.');
  if(kind==='dijkstra' && graph.edges.some(e=>e.weight<0)) throw new Error('Dijkstra requires nonnegative weights; use Bellman–Ford for negative edges.');
  if(kind==='kruskal' && graph.directed) throw new Error('Kruskal requires an undirected graph.');
  if(graph.labels.length && kind!=='kruskal') vertex(s,source);
  const trace: Trace<WeightedState,GraphEvent> = {initial:structuredClone(s),steps:[]};
  const emit=(tag:string,type:string,title:string)=> trace.steps.push({source:tag,event:{type},title,explanation:title,state:structuredClone(s)});
  const finish=(tag:string,result:string)=>{s.result=result;emit(tag,'Return',result);return trace;};
  const label=(u:number)=>graph.labels[u];
  if(!graph.labels.length) return finish(kind==='dijkstra'?'dj.empty':kind==='bellman-ford'?'bf.empty':'kr.empty','Empty graph');
  if(kind==='dijkstra') {
    s.distance[source]=0; s.writes++; emit('dj.seed','UpdateDistance','Set source distance to zero');
    s.queue.push([0,source]); s.queueOps++; emit('dj.push','Push','Push the source candidate');
    while(s.queue.length) {
      const [d,u]=s.queue.shift()!; s.active=u;s.candidate=d;s.queueOps++;emit('dj.pop','Pop',`Extract (${d}, ${label(u)})`);
      if(d!==s.distance[u]) {emit('dj.stale','StaleEntry','Discard the visible stale queue entry');continue;}
      s.settled[u]=true; s.writes++;emit('dj.settle','SettleVertex',`Finalize ${label(u)} at ${d}`);
      for(const {vertex:v,edge,weight} of neighbors(graph,u)) {
        s.edge=edge;s.scans++;emit('dj.inspect','InspectEdge',`Inspect ${label(u)} → ${label(v)}`);
        s.candidate=checkedAdd(d,weight);emit('dj.candidate','Candidate',`${d} + ${weight} = ${s.candidate}; no distance assignment yet`);
        emit('dj.compare','Compare',`Compare candidate with ${s.distance[v]??'∞'}`);
        if(s.distance[v]===null || s.candidate<s.distance[v]!) {
          s.distance[v]=s.candidate;s.writes++;emit('dj.distance','UpdateDistance',`Assign dist[${label(v)}] = ${s.candidate}`);
          s.pred[v]=u;s.writes++;emit('dj.pred','SetPredecessor',`Assign pred[${label(v)}] = ${label(u)}`);
          s.predEdge[v]=edge;s.writes++;emit('dj.pred-edge','SetPredecessorEdge','Record the predecessor edge');
          s.queue.push([s.candidate,v]);s.queue.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);s.queueOps++;emit('dj.enqueue','Push','Push a new entry; any older entry remains in the queue');
        }
      }
    }
    return finish('dj.done','Shortest distances finalized; ∞ means unreachable');
  }
  if(kind==='bellman-ford') {
    s.distance[source]=0;s.writes++;emit('bf.seed','UpdateDistance','Set source distance to zero');
    const arcs=graph.edges.flatMap((e,edge)=>[{...e,edge},...(!graph.directed&&e.from!==e.to?[{from:e.to,to:e.from,weight:e.weight,edge}]:[])]);
    for(let pass=1;pass<graph.labels.length;pass++) {
      s.pass=pass;s.changed=false;emit('bf.pass','BeginPass',`Begin pass ${pass} of at most V − 1`);
      for(const {from:u,to:v,weight,edge} of arcs) {
        s.active=u;s.edge=edge;s.scans++;s.candidate=null;emit('bf.inspect','InspectEdge',`Inspect ${label(u)} → ${label(v)}`);
        if(s.distance[u]===null) {emit('bf.unreachable','Skip','Unreachable source: never add to infinity');continue;}
        s.candidate=checkedAdd(s.distance[u]!,weight);emit('bf.candidate','Candidate',`Candidate = ${s.candidate}; distance is unchanged`);
        emit('bf.compare','Compare','Compare candidate with destination distance');
        if(s.distance[v]===null||s.candidate<s.distance[v]!) {
          s.distance[v]=s.candidate;s.writes++;emit('bf.distance','UpdateDistance',`Assign dist[${label(v)}] = ${s.candidate}`);
          s.pred[v]=u;s.writes++;emit('bf.pred','SetPredecessor',`Assign pred[${label(v)}] = ${label(u)}`);
          s.predEdge[v]=edge;s.writes++;emit('bf.pred-edge','SetPredecessorEdge','Record predecessor edge');
          s.changed=true;emit('bf.changed','Mark','This pass changed a distance');
        }
      }
      if(!s.changed) {emit('bf.early','EarlyExit','No update: stop relaxation passes early');break;}
    }
    s.pass=graph.labels.length;emit('bf.detect-pass','BeginDetection','Extra scan: test for a reachable negative cycle');
    for(const {from:u,to:v,weight,edge} of arcs) {
      s.active=u;s.edge=edge;s.scans++;s.candidate=null;emit('bf.detect-edge','InspectEdge','Detection scan inspects the next arc');
      if(s.distance[u]===null) continue;
      s.candidate=checkedAdd(s.distance[u]!,weight);emit('bf.detect-candidate','Candidate','Test candidate without assigning a distance');
      if(s.distance[v]===null||s.candidate<s.distance[v]!) {s.negative=true;emit('bf.negative','NegativeCycle','A reachable negative cycle exists');}
    }
    return finish('bf.done',s.negative?'Reachable negative cycle: finite-path result withheld':'Shortest distances finalized; ∞ means unreachable');
  }
  s.order=graph.edges.map((_,i)=>i).sort((a,b)=>graph.edges[a]!.weight-graph.edges[b]!.weight||a-b);emit('kr.sort','Sort','Sort by weight, then original edge index');
  const root=(u:number)=>{s.active=u;emit('kr.find','FindRoot','Start at an endpoint');while(s.parent[s.active]!==s.active){s.active=s.parent[s.active]!;s.traversals++;emit('kr.walk','FollowParent','Follow a parent to its representative');}return s.active;};
  while(s.order.length) {
    const edge=s.order.shift()!,e=graph.edges[edge]!;s.edge=edge;s.scans++;emit('kr.take','InspectEdge',`Consider edge ${edge} (weight ${e.weight})`);
    let a=root(e.from),b=root(e.to);
    if(a===b){s.rejected.push(edge);emit('kr.reject','RejectEdge','Reject: endpoints already share a component');continue;}
    if(s.size[a]!<s.size[b]!||(s.size[a]===s.size[b]&&a>b)) [a,b]=[b,a];
    s.parent[b]=a;s.writes++;emit('kr.parent','AssignParent','Attach the smaller root; ties choose the smaller ID');
    s.size[a]!+=s.size[b]!;s.writes++;emit('kr.size','UpdateSize','Update the surviving root size');
    s.components--;emit('kr.components','UnionSets','Two components become one');
    s.accepted.push(edge);emit('kr.accept','AcceptEdge','Accept this acyclic connection');
    s.total=checkedAdd(s.total,e.weight);emit('kr.total','UpdateTotal',`Accepted total = ${s.total}`);
  }
  return finish('kr.done',s.components===1?'Minimum spanning tree':'Minimum spanning forest (disconnected graph)');
}
export function unionFindState(labels=['A','B','C','D','E','F'],unions:[number,number][]=[[0,1],[2,3],[0,2]]):WeightedState {
  let s=weightedState('union-find',{labels,edges:[],directed:true});
  for(const [a,b] of unions) s=unionFindTrace('union',s,a,b).steps.at(-1)!.state;
  return resetUnion(s);
}
function resetUnion(initial:WeightedState) {const s=structuredClone(initial);s.path=[];s.active=-1;s.answer=-1;s.scans=0;s.traversals=0;s.writes=0;s.result='';return s;}
export function unionFindTrace(operation:string,initial:WeightedState,a=3,b=4,newLabel='G'):Trace<WeightedState,GraphEvent> {
  const s=resetUnion(initial);
  if(!['make-set','find','union','connected'].includes(operation))throw new Error('Choose make-set, find, union, or connected.');
  if(operation==='make-set') {if(s.parent.length>=8||newLabel.length>24||!newLabel.trim()||s.graph.labels.includes(newLabel))throw new Error('Use a unique nonempty label; at most eight sets fit this lab.');}
  else {vertex(s,a);if(operation!=='find')vertex(s,b);}
  const trace:Trace<WeightedState,GraphEvent>={initial:structuredClone(s),steps:[]};
  const emit=(tag:string,type:string,title:string)=>trace.steps.push({source:tag,event:{type},title,explanation:title,state:structuredClone(s)});
  const find=(u:number)=>{
    s.path=[];s.active=u;emit('uf.start','Find','Begin at the requested vertex');
    while(s.parent[s.active]!==s.active) {s.path.push(s.active);s.active=s.parent[s.active]!;s.traversals++;emit('uf.walk','FollowParent','Save this vertex and follow its parent');}
    const root=s.active;emit('uf.root','Root','Self-parent identifies the representative');
    for(const v of s.path) if(s.parent[v]!==root) {s.parent[v]=root;s.writes++;emit('uf.compress','CompressPath',`Assign parent[${s.graph.labels[v]}] = ${s.graph.labels[root]}`);}
    return root;
  };
  if(operation==='make-set') {
    const id=s.parent.length;s.graph.labels.push(newLabel);s.parent.push(id);s.size.push(1);s.components++;s.writes+=2;s.answer=id;emit('uf.make','MakeSet','Append a singleton with a self-parent and size one');
  } else if(operation==='find') {s.answer=find(a);emit('uf.find-result','Return','Return the representative');}
  else {let ra=find(a),rb=find(b);if(operation==='connected') {s.answer=Number(ra===rb);emit('uf.connected','Compare','Compare representatives');}
    else if(ra===rb){s.answer=0;emit('uf.same','NoChange','Already in the same set');}
    else {if(s.size[ra]!<s.size[rb]!||(s.size[ra]===s.size[rb]&&ra>rb))[ra,rb]=[rb,ra];
      s.parent[rb]=ra;s.writes++;emit('uf.parent','AssignParent','Attach smaller root; equal sizes choose smaller numeric root');
      s.size[ra]!+=s.size[rb]!;s.writes++;emit('uf.size','UpdateSize','Add the attached component size to the surviving root');
      s.components--;s.answer=1;emit('uf.union','UnionSets','One fewer component');
    }
  }
  s.result=operation==='connected'?(s.answer?'Connected':'Not connected'):operation==='find'?`Representative: ${s.graph.labels[s.answer]}`:operation==='make-set'?`Created ${s.graph.labels[s.answer]}`:s.answer?'Merged two sets':'Already connected';
  emit('uf.done','Return',s.result);return trace;
}
export function weightedSnapshot(s:WeightedState) {
  return [s.distance,s.pred,s.predEdge,s.settled.map(Number),s.queue,s.order,s.parent,s.size,s.path,s.accepted,s.rejected,s.active,s.edge,s.candidate,s.pass,Number(s.changed),Number(s.negative),s.components,s.total,s.scans,s.writes,s.queueOps,s.traversals,s.answer];
}
export function weightedInvariants(s:WeightedState,settled:boolean):Invariant[] {
  const rules:[string,boolean,string][]=[];
  const n=s.parent.length;let forest=true;const counts=Array(n).fill(0);
  for(let u=0;u<n;u++){let v=u;const seen=new Set<number>();while(Number.isInteger(v)&&v>=0&&v<n&&s.parent[v]!==v&&!seen.has(v)){seen.add(v);v=s.parent[v]!;}if(v<0||v>=n||!Number.isInteger(v)||seen.has(v))forest=false;else counts[v]++;}
  const sizes=forest&&s.parent.every((p,i)=>p!==i||s.size[i]===counts[i]);
  if(s.kind==='union-find'||s.kind==='kruskal') {
    rules.push(['Every parent reaches an owned self-root',forest,'Roots point to themselves, including singleton roots.'],['Root size and component count are exact',sizes&&s.components===s.parent.filter((p,i)=>p===i).length,'Nonroot sizes are historical; only root sizes describe a set.']);
  }
  if(s.kind==='dijkstra')rules.push(['Accepted input has no negative edge',s.graph.edges.every(e=>e.weight>=0),'Negative input is rejected before tracing.']);
  if(s.kind==='dijkstra'||s.kind==='bellman-ford') {
    const validPred=s.pred.every((p,v)=>p===-1||(s.graph.edges[s.predEdge[v]!]!==undefined&&(()=>{const e=s.graph.edges[s.predEdge[v]!]!;return(e.from===p&&e.to===v||!s.graph.directed&&e.to===p&&e.from===v);})()));
    rules.push(['Predecessors name actual graph edges',validPred,'Distance and predecessor assignments are separate statements.'],['Distances remain exact finite integers or infinity',s.distance.every(d=>d===null||Number.isSafeInteger(d)),'Arithmetic never adds to the infinity sentinel.']);
    if(s.result&&!s.negative) {
      const supported=s.pred.every((p,v)=>p===-1||s.predEdge[v]!>=0&&s.graph.edges[s.predEdge[v]!]!==undefined&&s.distance[p]!==null&&s.distance[v]===s.distance[p]!+s.graph.edges[s.predEdge[v]!]!.weight);
      const relaxed=s.graph.edges.every(e=>{const arc=(u:number,v:number)=>s.distance[u]===null||s.distance[v]!==null&&s.distance[v]!<=s.distance[u]!+e.weight;return arc(e.from,e.to)&&(s.graph.directed||arc(e.to,e.from));});
      rules.push(['Completed distances satisfy every relaxation and predecessor',supported&&relaxed,'This is checked only after a successful finite-path completion.']);
    }
  }
  if(s.kind==='kruskal') {
    const p=Array.from({length:n},(_,i)=>i);const root=(u:number):number=>p[u]===u?u:root(p[u]!);let acyclic=true;
    for(const i of s.accepted){const e=s.graph.edges[i]!;const a=root(e.from),b=root(e.to);if(a===b)acyclic=false;else p[b]=a;}
    rules.push(['Accepted edges form an acyclic forest',acyclic,'Self-loops and cycle-closing edges must be rejected.'],['Total equals accepted edge weights',s.total===s.accepted.reduce((a,i)=>a+s.graph.edges[i]!.weight,0),'Accept and total update are distinct trace statements.']);
  }
  return rules.map(([name,ok,detail])=>({name,status:ok?'pass':settled?'fail':'pending',detail}));
}
