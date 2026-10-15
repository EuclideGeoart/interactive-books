import { seeded } from '../../../platform/seed';
import { traceFrom } from '../../../platform/trace';
import { bounded, distance, finite, metricPower, pointVector, type Metric } from './distance';
import type { Point } from './neighbors';
export interface MetricState {
  readonly query: Point; readonly point: Point; readonly metric: Metric; readonly p: number;
  readonly scales: readonly [number,number]; readonly seed: number; readonly dimension: number;
  readonly distribution: 'cube' | 'line'; readonly normalization: 'raw' | 'per-coordinate';
}
export const METRIC_CANONICAL: MetricState = {
  query:{x:0,y:0},point:{x:2,y:1},metric:'L2',p:2,scales:[1,1],seed:42,dimension:2,distribution:'cube',normalization:'raw',
};
export function summarizeDistances(values: readonly number[]) {
  if (!Array.isArray(values) || !values.length) throw new RangeError('A distance summary needs observations.');
  const numbers: readonly number[] = values;
  let min = Infinity,max = 0;
  for (let j=0;j<numbers.length;j++) {
    const v=finite(numbers[j]!, 'Summary distance');
    if (v < 0) throw new RangeError('Distances cannot be negative.');
    min=Math.min(min,v);max=Math.max(max,v);
  }
  if (max === 0) return {min,max,mean:0,sd:0,relativeSpread:null,coefficientOfVariation:null,
    meanUnderflow:false,sdUnderflow:false,reason:'All distances are zero; relative spread and coefficient of variation are undefined.'};
  const unit = numbers.map(v => v/max);
  const unitMean = unit.reduce((sum,v) => sum+v,0)/unit.length;
  const unitSD = Math.sqrt(unit.reduce((sum,v) => sum+(v-unitMean)**2,0)/unit.length);
  const mean=finite(max*unitMean,'Summary mean'),sd=finite(max*unitSD,'Summary standard deviation');
  const meanUnderflow=mean===0,sdUnderflow=unitSD>0&&sd===0;
  const relativeSpread=finite((1-min/max)/unitMean,'Summary relative spread');
  const coefficientOfVariation=finite(unitSD/unitMean,'Summary coefficient of variation');
  return {min,max,mean,sd,relativeSpread,coefficientOfVariation,
    meanUnderflow,sdUnderflow,reason:meanUnderflow||sdUnderflow?
      'Positive mean or standard deviation underflowed to zero; relative metrics use normalized arithmetic.':null};
}
export function deriveMetrics(state: MetricState) {
  const power = metricPower(state.metric,state.p);
  bounded(state.seed,'Seed',0,0xffffffff,true); bounded(state.dimension,'Dimension',1,32,true);
  if (!['cube','line'].includes(state.distribution)) throw new RangeError('Choose cube or embedded-line data.');
  if (!['raw','per-coordinate'].includes(state.normalization)) throw new RangeError('Choose raw or per-coordinate normalization.');
  const pairDistance = distance(pointVector(state.point),pointVector(state.query),state.metric,state.p,state.scales);
  const draw = seeded(state.seed);
  // Always draw 32 coordinates per row: dimension edits reuse prefixes, not different random observations.
  const full = Array.from({length:24},() => Array.from({length:32},() => 2*draw()-1));
  const divisor = state.normalization === 'raw' ? 1 : state.dimension ** (1/power);
  const rows = full.map((vector,index) => {
    const features = vector.slice(0,state.dimension).map((value,j) => state.distribution === 'line' && j > 0 ? 0 : value);
    const raw = distance(features,Array.from({length:state.dimension},() => 0),state.metric,state.p);
    return {id:'d'+(index+1),features,raw,distance:raw/divisor};
  });
  return {state,power,pairDistance,rows,summary:summarizeDistances(rows.map(row => row.distance)),
    shapes:{X:[24,state.dimension],query:[state.dimension,1],distances:[24,1]},
    provenance:'LCG seed ' + state.seed + '; 24 rows, 32 draws per row, prefixes retained; ' +
      (state.distribution === 'cube' ? 'cube model: pseudo-random uniform-coordinate draws in [−1,1]' : 'one uniform coordinate, remaining coordinates exactly zero')};
}
export function metricTrace(state: MetricState) {
  const states = [state,...[1,2,8,32].map(dimension => ({...state,dimension}))];
  states.forEach(deriveMetrics);
  return traceFrom(states.map((value,i) => ({state:value,explanation:i === 0 ? 'Initial displayed experiment.' : 'Dimension ' + value.dimension + '; same seed and coordinate prefixes.'})));
}
