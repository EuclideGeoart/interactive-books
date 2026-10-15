import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { dbscan, hierarchical, initialize, inspectLloyd, lloydStep, lloydTrace, samePartition, squaredDistance, validatePoints, type LloydState, type Point, type Linkage } from '../../../src/parts/p05/model/clustering';
import { initialLab, scenario, reseed } from '../../../src/parts/p05/lesson';
interface Request { operation: string; state: LloydState; points: Point[]; scales?: readonly [number, number]; linkage: Linkage; epsilon: number; minPoints: number; k: number; seed: number }
interface Fixture { name: string; input: Request; expected: Record<string, unknown> }
const document = JSON.parse(readFileSync('fixtures/p05/clustering.json', 'utf8')) as { cases: Fixture[] };
function dispatch(r: Request) {
  if (r.operation === 'lloyd') {
    const a = inspectLloyd(r.state), next = lloydStep(r.state);
    return { distances: a.distances, labels: a.labels, means: a.clusters.map(c=>c.mean), empty: a.clusters.map(c=>c.empty), objective: a.objective,
      proposedObjective: a.proposedObjective, afterCenters: next.centers, afterObjective: inspectLloyd(next).objective };
  }
  if (r.operation === 'hierarchical') return { merges: hierarchical(r.points,r.linkage,r.scales).merges.map(m=>({ left:m.left.members,right:m.right.members,height:m.height })) };
  if (r.operation === 'dbscan') { const a = dbscan(r.points,r.epsilon,r.minPoints,r.scales); return { neighborhoods:a.neighborhoods,core:a.core,labels:a.labels,kinds:a.kinds,count:a.count }; }
  if (r.operation === 'initialize') return { centers: initialize(r.points,r.k,r.seed) };
  throw new RangeError('Unknown fixture operation.');
}
function close(actual: unknown, expected: unknown) {
  if (typeof expected === 'number') { expect(typeof actual).toBe('number'); expect(Number.isFinite(actual)).toBe(true); expect(Math.abs(Number(actual)-expected)).toBeLessThanOrEqual(1e-12+1e-12*Math.abs(expected)); }
  else if (Array.isArray(expected)) { expect(Array.isArray(actual)).toBe(true); expect((actual as unknown[]).length).toBe(expected.length); expected.forEach((v,i)=>close((actual as unknown[])[i],v)); }
  else if (expected && typeof expected === 'object') { expect(Object.keys(actual as object).sort()).toEqual(Object.keys(expected).sort()); for (const [key,v] of Object.entries(expected)) close((actual as Record<string,unknown>)[key],v); }
  else expect(actual).toBe(expected);
}
describe('literal independently authored fixture parity', () => {
  for (const f of document.cases) it(f.name, () => { const actual = dispatch(f.input); close(actual,f.expected); for (const key of ['labels','empty','neighborhoods','core','kinds','count']) if (key in f.expected) expect((actual as Record<string,unknown>)[key]).toEqual(f.expected[key]); });
  it('runs the actual canonical Python against every literal expectation', () => {
    const python = process.env.BOOK_PYTHON ?? (existsSync('.venv/bin/python') ? resolve('.venv/bin/python') : 'python3');
    const script = 'import json,sys; sys.path.insert(0,"code/python/p05"); import clustering; print(json.dumps([clustering.dispatch(r) for r in json.load(sys.stdin)],allow_nan=False))';
    const run = spawnSync(python,['-B','-c',script],{input:JSON.stringify(document.cases.map(f=>f.input)),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
    expect(run.error).toBeUndefined(); expect(run.status,run.stderr).toBe(0);
    const outputs = JSON.parse(run.stdout) as unknown[]; expect(outputs).toHaveLength(document.cases.length);
    outputs.forEach((a,i)=>close(a,document.cases[i]!.expected));
  });
});
describe('Lloyd mechanics and precise limits', () => {
  it('commits actual distances, lowest-index ties and coordinate means', () => {
    const s = initialLab('lloyd').lloyd, before = inspectLloyd(s);
    expect(before.distances).toEqual([[0,16],[4,4],[16,0],[36,4]]); expect(before.nearest).toEqual([0,0,1,1]); expect(before.ties).toEqual([false,true,false,false]);
    expect(before.objective).toBe(8); expect(before.proposedObjective).toBe(4);
    const assigned = lloydStep(s), updated = lloydStep(assigned);
    expect(assigned.phase).toBe('assign'); expect(assigned.centers).toBe(s.centers);
    expect(updated.centers).toEqual([[-2,0],[2,0]]); expect(updated.labels).toEqual(assigned.labels); expect(inspectLloyd(updated).objective).toBe(4);
  });
  it('records non-increasing exact small-case half-step objectives and an honest stop', () => {
    const trace = lloydTrace(initialLab('lloyd').lloyd), values = trace.map(f=>inspectLloyd(f.state).objective);
    expect(values).toEqual([8,8,4,4,4]); values.slice(1).forEach((v,i)=>expect(v).toBeLessThanOrEqual(values[i]!)); expect(trace.at(-1)!.state.stopped).toBe(true);
    expect(lloydTrace(initialLab('lloyd').lloyd,1).at(-1)!.state.stopped).toBe(false);
    expect(lloydStep(trace.at(-1)!.state)).toBe(trace.at(-1)!.state);
  });
  it('distinguishes two actual fixed points without calling both globally best', () => {
    const s = initialLab('failures'), horizontal = scenario(s,'horizontal'), vertical = scenario(s,'vertical');
    expect(inspectLloyd(horizontal.lloyd).objective).toBe(16); expect(inspectLloyd(vertical.lloyd).objective).toBe(4);
    expect(lloydStep(lloydStep(horizontal.lloyd)).stopped).toBe(true); expect(lloydStep(lloydStep(vertical.lloyd)).stopped).toBe(true);
  });
  it('retains empty centroids and treats coincident IDs as separate observations', () => {
    for (const kind of ['empty','coincident']) {
      const s = scenario(initialLab('failures'),kind).lloyd, a = inspectLloyd(s), next = lloydStep(lloydStep(s));
      expect(a.labels.every(v=>v===0)).toBe(true); expect(a.clusters.slice(1).every(c=>c.empty)).toBe(true); expect(next.centers).toEqual(s.centers); expect(next.stopped).toBe(true);
    }
  });
  it('supports k=1 and k=n, deterministic unsigned seeds and permutation evaluation', () => {
    const s = initialLab('lloyd');
    expect(reseed(s,1).lloyd.centers).toHaveLength(1); expect(reseed(s,4).lloyd.centers).toHaveLength(4);
    for (const seed of [0,7,0xffffffff]) expect(initialize(s.lloyd.points,4,seed)).toEqual(initialize(s.lloyd.points,4,seed));
    expect(samePartition([0,0,1,2],[2,2,0,1])).toBe(true); expect(samePartition([0,0,1],[0,1,1])).toBe(false);
    expect(()=>samePartition([0],[])).toThrow(); expect(()=>samePartition([-1],[-1])).toThrow();
  });
  it('changes normalized geometry with units, and preserves it on consistent conversion', () => {
    expect(squaredDistance([2,1],[0,0],[1,1])).toBe(squaredDistance([200,1],[0,0],[100,1]));
    expect(squaredDistance([200,1],[0,0],[1,1])).toBe(40001);
    const s = scenario(initialLab('failures'),'horizontal').lloyd;
    expect(inspectLloyd({...s,scales:[10,1]}).objective).toBeCloseTo(.16,14);
  });
  it('rejects sparse/ragged shapes, nonfinite inputs, duplicate IDs and invalid discrete state', () => {
    const s = initialLab('lloyd').lloyd;
    for (const points of [[],Array(2),[{id:'a',x:Array(2)}],[{id:'a',x:[0]}],[{id:'a',x:[0,0,0]}],[{id:'a',x:[NaN,0]}],[{id:'',x:[0,0]}],[s.points[0],s.points[0]]]) expect(()=>validatePoints(points as readonly Point[])).toThrow();
    for (const centers of [[],Array(2),[[0]],[[0,Infinity]],Array(5).fill([0,0])]) expect(()=>inspectLloyd({...s,centers:centers as LloydState['centers']})).toThrow();
    for (const scales of [[0,1],[-1,1],[1],[NaN,1]]) expect(()=>squaredDistance([0,0],[1,1],scales as unknown as readonly [number,number])).toThrow();
    for (const k of [0,5,1.5]) expect(()=>initialize(s.points,k,7)).toThrow();
    for (const seed of [-1,2**32,1.5,NaN]) expect(()=>initialize(s.points,2,seed)).toThrow();
    expect(()=>inspectLloyd({...s,phase:'assign',labels:[0,0,0,2]})).toThrow(); expect(()=>inspectLloyd({...s,phase:'assign',labels:Array(4)})).toThrow(); expect(()=>lloydTrace(s,101)).toThrow();
  });
  it('rejects overflowing and nonzero-underflowing distance arithmetic with rescaling guidance', () => {
    for (const [a,b,scales] of [[[1e308,0],[-1e308,0],[1,1]],[[1e200,0],[0,0],[1,1]],[[1,0],[0,0],[1e-300,1]]] as const) expect(()=>squaredDistance(a,b,scales)).toThrow();
    for (const [a,b,scales] of [[[1e-200,0],[0,0],[1,1]],[[Number.MIN_VALUE,0],[0,0],[1e308,1]],[[1e-200,1],[0,0],[1,1]]] as const) expect(()=>squaredDistance(a,b,scales)).toThrow(/underflow.*rescale/);
    expect(()=>dbscan([{id:'a',x:[0,0]},{id:'b',x:[1e-200,0]}],0,2)).toThrow(/underflow/);
    expect(squaredDistance([1e-100,1],[0,0])).toBe(1); expect(squaredDistance([0,0],[0,0])).toBe(0);
  });
});
describe('actual linkage and density mechanisms', () => {
  it('uses Euclidean cross pairs rather than centroid/Ward squared linkage', () => {
    const points: Point[] = [{id:'a',x:[0,0]},{id:'b',x:[1,0]},{id:'c',x:[3,0]}];
    expect(hierarchical(points,'single').merges.map(m=>m.height)).toEqual([1,2]); expect(hierarchical(points,'complete').merges.map(m=>m.height)).toEqual([1,3]); expect(hierarchical(points,'average').merges.map(m=>m.height)).toEqual([1,2.5]);
    expect(hierarchical([points[0]!],'single').merges).toEqual([]);
  });
  it('separates core/border/noise on actual Stage inputs and includes exact boundary/self', () => {
    const s = initialLab('alternatives'), a = dbscan(s.lloyd.points,s.epsilon,s.minPoints);
    expect(a.labels).toEqual([0,0,0,0,0,-1]); expect(a.kinds).toEqual(['core','core','core','core','border','noise']);
    expect(a.neighborhoods[3]).toEqual([0,1,2,3,4]);
    expect(dbscan([{id:'a',x:[0,0]},{id:'b',x:[1,0]}],1,2).labels).toEqual([0,0]);
    expect(dbscan([{id:'a',x:[0,0]}],0,1).kinds).toEqual(['core']);
  });
  it('does not let shared border join core components and reclassifies earlier noise', () => {
    const s = scenario(initialLab('alternatives'),'border'), a = dbscan(s.lloyd.points,1,4);
    expect(a.count).toBe(2); expect(a.kinds[8]).toBe('border'); expect(a.neighborhoods[8]).toEqual([3,7,8]); expect(a.labels[8]).toBe(0);
    const points = [s.lloyd.points[8]!,...s.lloyd.points.slice(0,8)];
    expect(dbscan(points,1,4).kinds[0]).toBe('border'); expect(dbscan(points,1,4).labels[0]).toBe(0);
  });
  it('rejects unsupported linkage and epsilon/minimum-count boundaries', () => {
    const points = initialLab('lloyd').lloyd.points;
    expect(()=>hierarchical(points,'ward' as Linkage)).toThrow();
    for (const epsilon of [-1,Infinity,NaN,1e308]) expect(()=>dbscan(points,epsilon,1)).toThrow();
    for (const count of [0,5,1.5]) expect(()=>dbscan(points,1,count)).toThrow();
  });
});
