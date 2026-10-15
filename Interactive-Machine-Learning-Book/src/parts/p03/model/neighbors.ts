import { traceFrom } from '../../../platform/trace';
import { bounded, compareIds, distance, finite, metricPower, pointVector, type Metric } from './distance';
export interface Point { readonly x: number; readonly y: number }
export interface NeighborSample extends Point { readonly id: string; readonly category: 'A' | 'B'; readonly target: number }
export interface NeighborState {
  readonly samples: readonly NeighborSample[];
  readonly query: Point; readonly k: number; readonly metric: Metric; readonly p: number;
  readonly scales: readonly [number, number]; readonly provenance: string;
}
export const NEIGHBOR_CANONICAL: NeighborState = {
  samples: [
    {id:'s1',x:-2,y:0,category:'A',target:2}, {id:'s2',x:-1,y:1,category:'A',target:4},
    {id:'s3',x:-1,y:-1,category:'A',target:6}, {id:'s4',x:1,y:0,category:'B',target:8},
    {id:'s5',x:1,y:1,category:'B',target:10}, {id:'s6',x:2,y:-1,category:'B',target:12},
  ], query:{x:0,y:0}, k:3, metric:'L2', p:2, scales:[1,1], provenance:'Hand-authored six-row toy dataset',
};
export function neighborPreset(kind: string): NeighborState {
  if (kind === 'canonical') return NEIGHBOR_CANONICAL;
  if (kind === 'duplicates') return {...NEIGHBOR_CANONICAL,k:2,query:{x:1,y:0},
    samples:[...NEIGHBOR_CANONICAL.samples,{id:'s7',x:1,y:0,category:'A',target:0}],provenance:'Hand-authored conflicting duplicate at s4/s7'};
  if (kind === 'ties') return {...NEIGHBOR_CANONICAL,k:4,samples:[
    {id:'aa',x:-1,y:0,category:'A',target:2},{id:'ab',x:1,y:0,category:'A',target:4},
    {id:'ba',x:0,y:-1,category:'B',target:6},{id:'bb',x:0,y:1,category:'B',target:8},
  ],provenance:'Hand-authored four-way distance and vote tie'};
  throw new RangeError('Unknown neighbor dataset.');
}
export function deriveNeighbors(state: NeighborState) {
  if (!Array.isArray(state.samples) || state.samples.length < 1 || state.samples.length > 32)
    throw new RangeError('Neighbors require 1 to 32 observations.');
  bounded(state.k,'Neighbor count k',1,64,true); metricPower(state.metric,state.p);
  if (typeof state.provenance !== 'string') throw new RangeError('Dataset provenance must be text.');
  const ids = new Set<string>();
  const samples: readonly NeighborSample[] = state.samples;
  const measured = Array.from(samples,(sample,index) => {
    if (sample === null || typeof sample !== 'object' || Array.isArray(sample) ||
        !['id','x','y','category','target'].every(key => Object.prototype.hasOwnProperty.call(sample,key)))
      throw new RangeError('Observation at index '+index+' must be a sample record with id, x, y, category and target.');
    if (typeof sample.id !== 'string' || !sample.id.trim() || ids.has(sample.id)) throw new RangeError('Sample IDs must be unique nonempty strings.');
    ids.add(sample.id);
    if (sample.category !== 'A' && sample.category !== 'B') throw new RangeError('A sample category must be A or B.');
    finite(sample.target,'Regression target');
    return {...sample,distance:distance(pointVector(sample),pointVector(state.query),state.metric,state.p,state.scales)};
  });
  measured.sort((a,b) => a.distance - b.distance || compareIds(a.id,b.id));
  const reason = state.k > measured.length ? 'k exceeds the number of observations; no neighbor prediction is defined.' : null;
  const rows = measured.map((sample,index) => ({...sample,rank:index+1,selected:reason === null && index < state.k}));
  const selected = rows.filter(row => row.selected);
  const votes = ['A','B'].map(category => ({category,count:selected.filter(row => row.category === category).length}));
  const voteTie = reason === null && votes[0]!.count === votes[1]!.count;
  const classification = reason === null ? (votes[0]!.count >= votes[1]!.count ? 'A' : 'B') : null;
  const largest = selected.length ? Math.max(...selected.map(row => Math.abs(row.target))) : 0;
  const regression = reason !== null ? null : largest === 0 ? 0 :
    finite(largest * (selected.reduce((sum,row) => sum + row.target / largest,0) / state.k),'Regression average');
  const duplicateIds = rows.filter(row => rows.some(other => other.id !== row.id && other.x === row.x && other.y === row.y)).map(row => row.id);
  const boundaryTie = reason === null && state.k < rows.length && rows[state.k-1]!.distance === rows[state.k]!.distance;
  return {state,rows,selectedIds:selected.map(row => row.id),votes,classification,regression,reason,voteTie,boundaryTie,duplicateIds,
    shapes:{X:[rows.length,2],query:[2,1],distances:[rows.length,1],targets:[rows.length,1]}};
}
export function neighborTrace(state: NeighborState) {
  const states = [state,...[-1.5,0,1.5].map(x => ({...state,query:{x,y:0}}))];
  states.forEach(deriveNeighbors);
  return traceFrom(states.map((value,i) => ({state:value,explanation:i === 0 ? 'Initial displayed query.' : 'Query x = ' + value.query.x + '; compare the same stored observations.'})));
}
