import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { distance,metricPower,type Metric } from '../../../src/parts/p03/model/distance';
import { deriveNeighbors,NEIGHBOR_CANONICAL,neighborPreset,neighborTrace,type NeighborState } from '../../../src/parts/p03/model/neighbors';
import { deriveMetrics,METRIC_CANONICAL,metricTrace,summarizeDistances,type MetricState } from '../../../src/parts/p03/model/metrics';
import { BAYES_CANONICAL,bayesPreset,bayesTrace,deriveBayes,editBayesClass,type BayesState } from '../../../src/parts/p03/model/bayes';
interface Case<S> {name:string;state:S;expected:Record<string,unknown>}
const fixture=JSON.parse(readFileSync('fixtures/p03/instance-probabilistic.json','utf8')) as {
  cases:{neighbors:Case<NeighborState>[];metrics:Case<MetricState>[];bayes:Case<BayesState>[]};
  experiments:{neighbors:{trace:Case<NeighborState>[]};metrics:{trace:Case<MetricState>[]};bayes:{trace:Case<BayesState>[]}};
};
// Tight arithmetic tolerance, separate from documented browser painted-geometry tolerance.
function parity(actual:unknown,expected:unknown,path='root') {
  if(typeof expected==='number'){
    expect(typeof actual,path).toBe('number');const value=actual as number;
    expect(Number.isFinite(value),path).toBe(true);
    expect(Math.abs(value-expected),path).toBeLessThanOrEqual(2e-12+1e-12*Math.abs(expected));return;
  }
  if(Array.isArray(expected)){
    expect(Array.isArray(actual),path).toBe(true);const values=actual as unknown[];
    expect(values.length,path).toBe(expected.length);expected.forEach((value,j)=>parity(values[j],value,path+'.'+j));return;
  }
  if(expected!==null&&typeof expected==='object'){
    expect(typeof actual,path).toBe('object');
    for(const [key,value] of Object.entries(expected))parity((actual as Record<string,unknown>)[key],value,path+'.'+key);
    return;
  }
  expect(actual,path).toBe(expected);
}
function neighborNumbers(state:NeighborState){
  const a=deriveNeighbors(state);
  return {...a,orderedIds:a.rows.map(r=>r.id),distances:a.rows.map(r=>r.distance),reasonCode:a.reason?'k-too-large':null};
}
function bayesNumbers(state:BayesState){
  const a=deriveBayes(state);
  const reasonCode=a.reason===null?null:a.reason.startsWith('All prior')?'no-prior':a.reason.startsWith('A required')?'unknown-likelihood':'impossible';
  return {...a,reasonCode};
}
describe('independent committed arithmetic',()=>{
  it('agrees with exhaustive-subset neighbor fixtures, including actual ID ties',()=>{
    fixture.cases.neighbors.forEach(c=>parity(neighborNumbers(c.state),c.expected,c.name));
  });
  it('agrees with Decimal norms and closed-form seeded dimension fixtures',()=>{
    fixture.cases.metrics.forEach(c=>parity(deriveMetrics(c.state),c.expected,c.name));
  });
  it('agrees with direct rational Bayes products and normalized posterior fixtures',()=>{
    fixture.cases.bayes.forEach(c=>parity(bayesNumbers(c.state),c.expected,c.name));
  });
  it('matches every full-state replay fixture',()=>{
    for(const [j,frame] of neighborTrace(NEIGHBOR_CANONICAL).entries())parity(neighborNumbers(frame.state),fixture.experiments.neighbors.trace[j]!.expected);
    for(const [j,frame] of metricTrace(METRIC_CANONICAL).entries())parity(deriveMetrics(frame.state),fixture.experiments.metrics.trace[j]!.expected);
    for(const [j,frame] of bayesTrace(BAYES_CANONICAL).entries())parity(bayesNumbers(frame.state),fixture.experiments.bayes.trace[j]!.expected);
  });
});
describe('nearest neighbors and numeric trust boundaries',()=>{
  it('checks literal neighbors, vote, regression mean and boundary tie',()=>{
    const a=deriveNeighbors(NEIGHBOR_CANONICAL);
    expect(a.selectedIds).toEqual(['s4','s2','s3']);expect(a.classification).toBe('A');expect(a.regression).toBe(6);
    expect(a.rows[0]!.distance).toBe(1);expect(a.rows[1]!.distance).toBeCloseTo(Math.sqrt(2),14);expect(a.boundaryTie).toBe(true);
  });
  it('keeps conflicting duplicates separate and deterministic vote ties visible',()=>{
    const a=deriveNeighbors(neighborPreset('duplicates'));
    expect(a.selectedIds).toEqual(['s4','s7']);expect(a.duplicateIds).toEqual(['s4','s7']);
    expect(a.classification).toBe('A');expect(a.voteTie).toBe(true);expect(a.regression).toBe(4);
  });
  it('does not silently clamp k greater than n',()=>{
    const a=deriveNeighbors({...NEIGHBOR_CANONICAL,k:7});
    expect(a.classification).toBeNull();expect(a.regression).toBeNull();expect(a.selectedIds).toEqual([]);
    expect(a.reason).toContain('exceeds');expect(a.rows).toHaveLength(6);
  });
  it('supports a one-sample predictor and all-zero regression targets',()=>{
    const state={...NEIGHBOR_CANONICAL,k:1,samples:[{...NEIGHBOR_CANONICAL.samples[0]!,target:0}]};
    expect(deriveNeighbors(state).regression).toBe(0);expect(deriveNeighbors(state).classification).toBe('A');
  });
  it('rejects empty/oversized observations, bad IDs, categories and fractional k',()=>{
    for(const state of [
      {...NEIGHBOR_CANONICAL,samples:[]},
      {...NEIGHBOR_CANONICAL,samples:Array.from({length:33},(_,j)=>({...NEIGHBOR_CANONICAL.samples[0]!,id:String(j)}))},
      {...NEIGHBOR_CANONICAL,samples:[NEIGHBOR_CANONICAL.samples[0]!,NEIGHBOR_CANONICAL.samples[0]!]},
      {...NEIGHBOR_CANONICAL,k:1.5},{...NEIGHBOR_CANONICAL,k:0},{...NEIGHBOR_CANONICAL,k:65},
    ])expect(()=>deriveNeighbors(state)).toThrow(RangeError);
    for(const invalid of ['',[],{},false]){
      const state=JSON.parse(JSON.stringify(NEIGHBOR_CANONICAL)) as NeighborState;
      expect(()=>deriveNeighbors({...state,samples:[{...state.samples[0]!,id:invalid as string}]})).toThrow(RangeError);
    }
    expect(()=>deriveNeighbors({...NEIGHBOR_CANONICAL,samples:[{...NEIGHBOR_CANONICAL.samples[0]!,category:1 as unknown as 'A'}]})).toThrow(RangeError);
  });
  it('rejects bool/string/nonfinite quantities on public numerical boundaries',()=>{
    for(const invalid of [true,false,'1',[],{},null,NaN,Infinity,-Infinity]){
      const v=invalid as number;
      expect(()=>distance([v],[0])).toThrow(RangeError);
      expect(()=>deriveNeighbors({...NEIGHBOR_CANONICAL,query:{x:v,y:0}})).toThrow(RangeError);
      expect(()=>deriveNeighbors({...NEIGHBOR_CANONICAL,samples:[{...NEIGHBOR_CANONICAL.samples[0]!,target:v}]})).toThrow(RangeError);
      expect(()=>deriveMetrics({...METRIC_CANONICAL,seed:v})).toThrow(RangeError);
      expect(()=>deriveBayes({...BAYES_CANONICAL,alpha:v})).toThrow(RangeError);
    }
  });
  it('uses binary64 large-integer quantities and duplicate identity',()=>{
    const state=JSON.parse('{"a":9007199254740993,"b":9007199254740992}') as {a:number;b:number};
    expect(distance([state.a],[state.b])).toBe(0);
    const c=fixture.cases.neighbors.find(c=>c.name==='binary64-integer-duplicates')!;
    expect(deriveNeighbors(c.state).duplicateIds).toEqual(['a','b']);
    expect(deriveNeighbors(c.state).rows.map(row=>row.distance)).toEqual([0,0]);
  });
  it('rejects sparse observations before k-selection, shapes or replay can be fabricated',()=>{
    const extended=[...NEIGHBOR_CANONICAL.samples];extended.length=7;
    const state={...NEIGHBOR_CANONICAL,samples:extended,k:7};
    expect(()=>deriveNeighbors(state)).toThrow(/Observation at index 6/);
    expect(()=>neighborTrace(state)).toThrow(/Observation at index 6/);
    const serialized=JSON.parse(JSON.stringify(state)) as NeighborState;
    expect(()=>deriveNeighbors(serialized)).toThrow(RangeError);
    expect(()=>neighborTrace(serialized)).toThrow(RangeError);
    for(const index of [0,2,5]){
      const samples=[...NEIGHBOR_CANONICAL.samples];Reflect.deleteProperty(samples,index);
      expect(()=>deriveNeighbors({...NEIGHBOR_CANONICAL,samples})).toThrow(RangeError);
      expect(()=>neighborTrace({...NEIGHBOR_CANONICAL,samples})).toThrow(RangeError);
    }
  });
  it('rejects invalid observation records before derivation or replay',()=>{
    for(const row of [null,undefined,false,1,'row',[],{},Object.create(NEIGHBOR_CANONICAL.samples[0]!)]){
      const samples=[...NEIGHBOR_CANONICAL.samples];Reflect.set(samples,2,row);
      expect(()=>deriveNeighbors({...NEIGHBOR_CANONICAL,samples})).toThrow(RangeError);
      expect(()=>neighborTrace({...NEIGHBOR_CANONICAL,samples})).toThrow(RangeError);
    }
  });
  it('preserves input order/state and genuinely immutable detached history',()=>{
    const query:{x:number;y:number}=structuredClone(NEIGHBOR_CANONICAL.query);
    const initial={...structuredClone(NEIGHBOR_CANONICAL),query},original=JSON.stringify(initial);
    deriveNeighbors(initial);expect(JSON.stringify(initial)).toBe(original);
    const trace=neighborTrace(initial);initial.query.x=2;
    expect(initial.query.x).toBe(2);
    expect(trace[0]!.state.query.x).toBe(0);expect(Object.isFrozen(trace[0]!.state.samples[0])).toBe(true);
    expect(Reflect.set(trace[0]!.state.query,'x',7)).toBe(false);
    expect(deriveNeighbors(trace[3]!.state).regression).toBe(10);
  });
});
describe('metric and seeded dimension limits',()=>{
  it('computes independent literal L1/L2/Lp and feature-unit scaling',()=>{
    expect(distance([3,4],[0,0],'L1')).toBe(7);expect(distance([3,4],[0,0],'L2')).toBe(5);
    expect(distance([1,1],[0,0],'Lp',3)).toBeCloseTo(Math.cbrt(2),14);
    expect(distance([200,1],[0,0],'L2',2,[100,1])).toBeCloseTo(Math.sqrt(5),14);
  });
  it('rescales powers for wide floats but rejects nonfinite differences/results',()=>{
    expect(distance([1e200],[0])).toBe(1e200);expect(distance([1e-300],[0])).toBe(1e-300);
    expect(distance([1e308],[0])).toBe(1e308);
    expect(()=>distance([1e308],[-1e308])).toThrow(/difference/i);
    expect(()=>distance([1e308,1e308],[0,0],'L1')).toThrow(/arithmetic/i);
    expect(()=>distance([1],[0],'L2',2,[0])).toThrow(RangeError);
    expect(()=>distance([1],[0],'L2',2,[1e-320])).toThrow(RangeError);
    expect(()=>metricPower('invalid' as Metric,2)).toThrow(RangeError);
    expect(()=>distance([0],[0],'Lp',.5)).toThrow(RangeError);
    expect(()=>distance([0,0],[0])).toThrow(RangeError);
  });
  it('retains row IDs and coordinate prefixes as dimension changes',()=>{
    const a=deriveMetrics({...METRIC_CANONICAL,dimension:2}),b=deriveMetrics({...METRIC_CANONICAL,dimension:32});
    expect(b.rows.map(row=>row.features.slice(0,2))).toEqual(a.rows.map(row=>row.features));
    expect(b.rows.map(row=>row.id)).toEqual(a.rows.map(row=>row.id));
    const trace=metricTrace(METRIC_CANONICAL);
    expect(trace).toHaveLength(5);expect(Object.isFrozen(trace[4]!.state)).toBe(true);
  });
  it('exposes the embedded-line counterexample and normalization convention',()=>{
    const a=deriveMetrics({...METRIC_CANONICAL,dimension:1,distribution:'line'});
    const b=deriveMetrics({...METRIC_CANONICAL,dimension:32,distribution:'line'});
    expect(b.rows.map(r=>r.distance)).toEqual(a.rows.map(r=>r.distance));
    expect(b.summary.coefficientOfVariation).toBe(a.summary.coefficientOfVariation);
    const normalized=deriveMetrics({...b.state,normalization:'per-coordinate'});
    expect(normalized.summary.coefficientOfVariation).toBeCloseTo(b.summary.coefficientOfVariation!,13);
    expect(normalized.summary.mean).toBeCloseTo(b.summary.mean/Math.sqrt(32),13);
    expect(summarizeDistances([0,0]).relativeSpread).toBeNull();
    expect(()=>deriveMetrics({...METRIC_CANONICAL,dimension:2.5})).toThrow(RangeError);
  });
});
describe('Bayes support, estimation and replay',()=>{
  it('matches the hand-worked exact tiny posterior',()=>{
    const a=deriveBayes(BAYES_CANONICAL);
    expect(a.rows[0]!.score).toBeCloseTo(3/32,14);expect(a.rows[1]!.score).toBeCloseTo(4/45,14);
    expect(a.rows[0]!.posterior).toBeCloseTo(135/263,14);expect(a.rows[1]!.posterior).toBeCloseTo(128/263,14);
    expect(a.prediction).toBe('A');
  });
  it('keeps zero priors, impossible evidence and missing estimates distinct',()=>{
    expect(deriveBayes(bayesPreset('zero-prior')).rows[0]!.posterior).toBe(0);
    const impossible=deriveBayes(bayesPreset('impossible'));
    expect(impossible.rows.map(r=>r.posterior)).toEqual([null,null]);expect(impossible.prediction).toBeNull();
    expect(impossible.rows.map(r=>r.logScore)).toEqual([null,null]);expect(impossible.reason).toContain('zero probability');
    expect(deriveBayes(bayesPreset('empty-class')).reason).toContain('required likelihood');
    const noPriors={...BAYES_CANONICAL,classes:BAYES_CANONICAL.classes.map(c=>({...c,priorWeight:0}))};
    expect(deriveBayes(noPriors).reason).toContain('prior weights');
    expect(deriveBayes({...bayesPreset('empty-class'),observed:[false,false]}).reason).toBeNull();
  });
  it('normalizes in log space even when every positive raw score underflows',()=>{
    const a=deriveBayes(bayesPreset('tiny'));
    expect(a.rows.map(r=>r.score)).toEqual([0,0]);expect(a.rows.every(r=>r.underflow)).toBe(true);
    expect(a.evidenceUnderflow).toBe(true);expect(a.rows[0]!.posterior).toBeCloseTo(.4,12);
    expect(a.rows[1]!.posterior).toBeCloseTo(.6,12);expect(a.reason).toBeNull();
  });
  it('validates count/feature shapes and preserves count identity',()=>{
    expect(()=>editBayesClass(BAYES_CANONICAL,'A',{count:3})).toThrow(RangeError);
    expect(()=>editBayesClass(BAYES_CANONICAL,'A',{positive:[4.5,1]})).toThrow(RangeError);
    expect(()=>deriveBayes({...BAYES_CANONICAL,query:[2,0]})).toThrow(RangeError);
    expect(()=>deriveBayes({...BAYES_CANONICAL,observed:[1 as unknown as boolean,true]})).toThrow(RangeError);
    const trace=bayesTrace(BAYES_CANONICAL);
    expect(trace[1]!.state.observed).toEqual([false,false]);expect(trace[3]!.state.classes).toEqual(BAYES_CANONICAL.classes);
    expect(Object.isFrozen(trace[0]!.state.classes[0]!.positive)).toBe(true);
  });
});

describe('independent reviewer boundary reproducers',()=>{
  it('canonicalizes the same representable likelihood ratio before log scoring',()=>{
    const state:BayesState={...BAYES_CANONICAL,alpha:0,classes:[
      {id:'A',priorWeight:1,count:9,positive:[1,1]},{id:'B',priorWeight:1,count:18,positive:[2,2]},
    ]};
    const a=deriveBayes(state);
    expect(a.rows.map(r=>r.posterior)).toEqual([.5,.5]);expect(a.prediction).toBe('A');expect(a.tiedPosterior).toBe(true);
  });
  it('defaults scales only when the whole optional vector is omitted',()=>{
    expect(distance([1],[0])).toBe(1);
    expect(()=>distance([1],[0],'L2',2,null as unknown as number[])).toThrow(RangeError);
    for(const scales of [[null],[undefined],Array(1),['1'],[true]]){
      expect(()=>distance([1],[0],'L2',2,scales as number[])).toThrow(RangeError);
    }
  });
  it('preserves tiny variance and distinguishes subnormal output underflow',()=>{
    const tiny=summarizeDistances([0,1e-200]);
    expect(tiny.mean).toBe(5e-201);expect(tiny.sd).toBe(5e-201);expect(tiny.coefficientOfVariation).toBe(1);
    const equal=summarizeDistances([Number.MIN_VALUE,Number.MIN_VALUE]);
    expect(equal.mean).toBe(Number.MIN_VALUE);expect(equal.sd).toBe(0);expect(equal.coefficientOfVariation).toBe(0);expect(equal.reason).toBeNull();
    const mixed=summarizeDistances([0,Number.MIN_VALUE]);
    expect(mixed.mean).toBe(0);expect(mixed.coefficientOfVariation).toBe(1);
    expect(mixed.meanUnderflow).toBe(true);expect(mixed.sdUnderflow).toBe(true);expect(mixed.reason).toContain('underflow');
    const distinct=summarizeDistances([Number.MIN_VALUE,2*Number.MIN_VALUE]);
    expect(distinct.coefficientOfVariation).toBeCloseTo(1/3,14);expect(distinct.relativeSpread).toBeCloseTo(2/3,14);
  });
});

describe('exact decision proof and underflow fixtures',()=>{
  it('proves all distinct-factor, weighted and smoothed ties without an epsilon',()=>{
    for(const name of ['different-factor-product-tie','weighted-unsmoothed-tie','smoothed-exact-tie']){
      const c=fixture.cases.bayes.find(c=>c.name===name)!,a=deriveBayes(c.state);
      expect(a.scoreOrder).toBe(0);expect(a.prediction).toBe('A');expect(a.tiedPosterior).toBe(true);
      expect(a.rows.map(r=>r.posterior)).toEqual([.5,.5]);
    }
    const c=fixture.cases.bayes.find(c=>c.name==='unequal-rounded-posterior')!,a=deriveBayes(c.state);
    expect(a.scoreOrder).toBe(1);expect(a.prediction).toBe('A');expect(a.tiedPosterior).toBe(false);
    expect(a.rows.map(r=>Number(r.posterior!.toFixed(4)))).toEqual([.5,.5]);
    expect(()=>JSON.stringify(a)).not.toThrow();expect(()=>JSON.stringify(bayesTrace(c.state))).not.toThrow();
  });
  it('checks tiny summary goldens with exact representable mean and SD assertions',()=>{
    const records=JSON.parse(readFileSync('fixtures/p03/instance-probabilistic.json','utf8')) as {
      summaries:{values:number[];expected:{mean:number;sd:number;meanUnderflow:boolean;sdUnderflow:boolean;coefficientOfVariation:number|null}}[];
    };
    for(const c of records.summaries){
      const a=summarizeDistances(c.values);expect(a.mean).toBe(c.expected.mean);expect(a.sd).toBe(c.expected.sd);
      parity(a,c.expected);expect(a.meanUnderflow).toBe(c.expected.meanUnderflow);expect(a.sdUnderflow).toBe(c.expected.sdUnderflow);
    }
  });
});

describe('final source checkpoint regressions',()=>{
  it.each([
    {name:'six equal large distances',value:1e308,count:6},
    {name:'nine equal maximum distances',value:Number.MAX_VALUE,count:9},
  ])('keeps $name finite with exactly zero SD',({value,count})=>{
    const a=summarizeDistances(Array.from({length:count},()=>value));
    expect(a.mean).toBe(value);expect(a.sd).toBe(0);
    expect(a.relativeSpread).toBe(0);expect(a.coefficientOfVariation).toBe(0);
    expect(a.reason).toBeNull();expect(a.meanUnderflow).toBe(false);expect(a.sdUnderflow).toBe(false);
  });
  it('keeps distinct nearby large observations distinct without epsilon-zeroing',()=>{
    const a=summarizeDistances([1e308,1e308*(1-Number.EPSILON)]);
    expect(a.sd).toBeGreaterThan(0);expect(Number.isFinite(a.sd)).toBe(true);
    expect(a.coefficientOfVariation).toBeGreaterThan(0);expect(a.reason).toBeNull();
  });
  it('rejects every holey required Bayes tuple before creating replay',()=>{
    for(let j=0;j<2;j++){
      const query=structuredClone(BAYES_CANONICAL);
      const observed=structuredClone(BAYES_CANONICAL);
      const positiveA=structuredClone(BAYES_CANONICAL);
      const positiveB=structuredClone(BAYES_CANONICAL);
      Reflect.deleteProperty(query.query,j);Reflect.deleteProperty(observed.observed,j);
      Reflect.deleteProperty(positiveA.classes[0]!.positive,j);Reflect.deleteProperty(positiveB.classes[1]!.positive,j);
      for(const state of [query,observed,positiveA,positiveB]){
        expect(()=>deriveBayes(state)).toThrow(RangeError);
        expect(()=>bayesTrace(state)).toThrow(RangeError);
      }
    }
  });
});
