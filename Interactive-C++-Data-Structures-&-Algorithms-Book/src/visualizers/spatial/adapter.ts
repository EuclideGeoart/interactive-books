import type { LabAdapter } from '../../components/controls/lab-types';
import type { SpatialEvent, SpatialKind, SpatialState } from './types';
import { buildPartitionTrace, partitionInvariants, partitionOperations, partitionRegions } from './partition';
import { buildBoundingTrace, boundingInvariants, boundingOperations, boundingRegions } from './bounding';
import { describeSpatial, drawSpatial, inspectSpatial } from './presentation';

export const spatialKinds: SpatialKind[] = ['spatial-hash','quadtree','octree','kd-tree','r-tree','bvh','broad-phase'];
export const spatialOperations = { ...partitionOperations, ...boundingOperations };
export const spatialFiles: Record<SpatialKind, { chapter: string; name: string }> = {
  'spatial-hash': { chapter: '60', name: 'SpatialHash' }, quadtree: { chapter: '61', name: 'Quadtree' }, octree: { chapter: '62', name: 'Octree' },
  'kd-tree': { chapter: '63', name: 'KDTree' }, 'r-tree': { chapter: '64', name: 'RTree' }, bvh: { chapter: '65', name: 'BVH' }, 'broad-phase': { chapter: '66', name: 'BroadPhase' },
};
export function spatialDefaults(kind: SpatialKind): FormData {
  const f = new FormData(), three = kind === 'octree';
  for (const [k,v] of Object.entries({ scene:'uniform', cellSize:'4', capacity:'2', maxDepth:'4', target:'A', dimension:three?'3':'2',
    points:three?'-6,-5,-6; -2,-4,2; 3,-5,5; 6,-1,-3; -5,3,4; -1,1,-2; 2,5,1; 6,6,6':'-6,-5; -2,-4; 3,-5; 6,-1; -5,3; -1,1; 2,5; 6,6',
    boxes:'-6,-5,-4,-3; -2,-1,1,2; 3,3,5,6', query:three?'-2,-2,-2,3,3,3':'-2,-2,3,3', queryPoint:three?'1,1,1':'1,1',
    point:three?'1,1,1':'1,1', object:'1,1,3,3' })) f.set(k,v);
  return f;
}
export function spatialAdapter(kind: SpatialKind): LabAdapter<SpatialState,SpatialEvent> {
  const partition = ['spatial-hash','quadtree','octree','kd-tree'].includes(kind);
  return {
    build:(operation,inputs)=>partition?buildPartitionTrace(kind,operation,inputs):buildBoundingTrace(kind,operation,inputs),
    invariants:partition?partitionInvariants:boundingInvariants,
    regions:operation=>partition?partitionRegions(kind,operation):boundingRegions(kind,operation),
    draw:drawSpatial, inspect:inspectSpatial, describe:describeSpatial, counters:state=>state.metrics,
  };
}
