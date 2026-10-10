import type { Trace } from '../../engine/types';

// Spatial presentation vocabulary only. Each chapter owns its algorithm and invariants.
export type SpatialKind = 'spatial-hash' | 'quadtree' | 'octree' | 'kd-tree' | 'r-tree' | 'bvh' | 'broad-phase';
export type SpatialStatus = 'unvisited' | 'current' | 'visited' | 'pruned' | 'candidate' | 'accepted' | 'fault';
export interface Vec { x: number; y: number; z?: number }
export interface Bounds { minX: number; minY: number; maxX: number; maxY: number; minZ?: number; maxZ?: number }
export interface SpatialObject {
  id: string; label: string; bounds: Bounds; point?: Vec; status: SpatialStatus; detail: string;
}
export interface SpatialNode {
  id: string; label: string; bounds: Bounds; parent: string | null; depth: number;
  children: string[]; items: string[]; status: SpatialStatus; detail: string;
  axis?: 'x' | 'y' | 'z'; split?: number;
}
export interface SpatialState {
  kind: SpatialKind; dimension: 2 | 3; operation: string;
  objects: SpatialObject[]; nodes: SpatialNode[];
  query: Bounds | null; queryPoint: Vec | null;
  currentRegion?: Bounds;
  resultIds: string[]; candidatePairs: [string, string][]; exactPairs: [string, string][];
  focus: string; result: string; metrics: { label: string; value: number }[];
  table: { caption: string; columns: string[]; rows: { id: string; values: string[]; status: SpatialStatus }[] };
  cellSize?: number;
}
export interface SpatialEvent { type: string }
export type SpatialTrace<S extends SpatialState = SpatialState> = Trace<S, SpatialEvent>;
export function emptySpatialState(kind: SpatialKind, operation: string, dimension: 2 | 3 = 2): SpatialState {
  return { kind, operation, dimension, objects: [], nodes: [], query: null, queryPoint: null,
    resultIds: [], candidatePairs: [], exactPairs: [], focus: '', result: '', metrics: [],
    table: { caption: 'Spatial state', columns: [], rows: [] } };
}
