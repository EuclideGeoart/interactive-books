import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';
import { PlaybackController } from '../../src/engine/playback';
import { sourceLines } from '../../src/engine/source';
import { spatialAdapter,spatialDefaults,spatialFiles,spatialKinds,spatialOperations } from '../../src/visualizers/spatial/adapter';
import { containsPoint,distanceSquared,overlaps,parseBounds,parsePoint,readBoxes,readPoints } from '../../src/visualizers/spatial/geometry';
import { describeSpatial,drawSpatial,inspectSpatial } from '../../src/visualizers/spatial/presentation';

for(const kind of spatialKinds)describe(`spatial integration: ${kind}`,()=>{
  const file=spatialFiles[kind],source=readFileSync(`cpp/chapter-${file.chapter}/${file.name}.hpp`,'utf8');
  for(const operation of spatialOperations[kind])it(`${operation.id}: unique C++ source, invariant snapshots, exact reverse and deterministic views`,()=>{
    const adapter=spatialAdapter(kind),inputs=spatialDefaults(kind),trace=adapter.build(operation.id,inputs);
    const tags=adapter.regions(operation.id,inputs).flatMap(region=>sourceLines(source,region).map(l=>l.tag).filter(Boolean));
    expect(tags.length).toBe(new Set(tags).size);
    expect(adapter.invariants(trace.initial,true).filter(r=>r.status==='fail')).toEqual([]);
    const player=new PlaybackController(trace);
    for(const [i,step] of trace.steps.entries()){
      if(step.source)expect(tags.filter(t=>t===step.source),step.title).toHaveLength(1);
      expect(adapter.invariants(step.state,i===trace.steps.length-1).filter(r=>r.status==='fail'),step.title).toEqual([]);
      const ids=[...step.state.objects,...step.state.nodes].map(o=>o.id);
      expect(ids.length).toBe(new Set(ids).size);
      player.next();expect(player.state).toEqual(step.state);
    }
    const final=player.state;
    for(const view of ['logical','memory'] as const){
      const markup=drawSpatial(final,'test',view,null);
      expect(markup).toBe(drawSpatial(final,'test',view,null));
      expect(markup).not.toMatch(/(?:NaN|undefined|Infinity)/);
    }
    for(let i=trace.steps.length-1;i>=0;i--){player.previous();expect(player.state).toEqual(i?trace.steps[i-1]!.state:trace.initial);}
    expect(describeSpatial(player.state)).toBe(describeSpatial(trace.initial));player.dispose();
  });
});

it('closed bounds include faces and zero extent; reversed/nonfinite/wrong-dimensional inputs fail',()=>{
  const b=parseBounds('-2,-2,3,3',2);
  expect(containsPoint(b,{x:3,y:-2})).toBe(true);
  expect(overlaps(b,parseBounds('3,3,3,3',2))).toBe(true);
  expect(overlaps(b,parseBounds('3.1,3.1,4,4',2))).toBe(false);
  for(const invalid of ['2,0,1,2','0,NaN,1,2','0,0,Infinity,2','0,0,9,2','0,,1,2'])expect(()=>parseBounds(invalid,2)).toThrow();
  expect(()=>parsePoint('1,2',3)).toThrow();
  expect(distanceSquared({x:1,y:1,z:1},{x:1,y:1,z:4})).toBe(9);
});
it('3D scene and query test z even when XY projections coincide',()=>{
  const f=new FormData();f.set('scene','custom');f.set('points','1,1,-4;1,1,4');
  expect(readPoints(f,3).map(p=>p.point!.z)).toEqual([-4,4]);
  f.set('boxes','0,0,-4,2,2,-2;0,0,2,2,2,4');
  const boxes=readBoxes(f,3);expect(overlaps(boxes[0]!.bounds,boxes[1]!.bounds)).toBe(false);
});
it('rendered inspection escapes text and exposes real z bounds and parent references',()=>{
  const trace=spatialAdapter('octree').build('range',spatialDefaults('octree')),s=trace.steps.at(-1)!.state;
  s.objects[0]!.detail='<script>unsafe</script>';
  expect(drawSpatial(s,'test','logical',null)).not.toContain('<script>unsafe');
  expect(inspectSpatial(s,s.objects[0]!.id)).toContain('&lt;script&gt;');
  expect(drawSpatial(s,'test','logical',null)).toContain('XZ projection');
  expect(inspectSpatial(s,s.nodes[0]!.id)).toContain('Children');
});

it('pruned internal regions remain visible after traversal leaves them',()=>{
  const inputs=spatialDefaults('kd-tree');
  inputs.set('queryPoint','-7,-7');
  const state=spatialAdapter('kd-tree').build('nearest',inputs).steps.at(-1)!.state;
  const pruned=state.nodes.filter(node=>node.children.length && node.status==='pruned');
  expect(pruned.length).toBeGreaterThan(0);
  expect(state.focus).toBe('');
  const diagram=drawSpatial(state,'test','logical',null);
  for(const node of pruned)expect(diagram).toContain(`data-node="${node.id}"`);
});
