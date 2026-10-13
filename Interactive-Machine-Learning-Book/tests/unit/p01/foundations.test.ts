import { describe, expect, it } from 'vitest';
import golden from '../../../fixtures/p01/foundations.json';
import { CANONICAL_REGRESSION } from '../../../src/parts/p02/model/linear-regression';
import { deriveFeatures, derivePipeline, deriveTask, FEATURE_CANONICAL, featureTargetKind, PIPELINE_CANONICAL, pipelineTrace, pipelineUpdate, TASKS, type FeatureState, type PipelineState } from '../../../src/parts/p01/model/foundations';
import { assignSplit, deriveSplit, leakageExample, seedSplit, shiftSplit, SPLIT_CANONICAL, SPLIT_SAMPLES, splitDrop, splitTrace, type SplitState } from '../../../src/parts/p01/model/splits';
import { assignCapacity, capacityCandidates, CAPACITY_CANONICAL, CAPACITY_RANK_REASON, capacityData, capacityTrace, deriveCapacity, fitCapacity, polynomialPrediction, presetCapacitySplit, type CapacityState } from '../../../src/parts/p01/model/capacity';

function parity(actual: unknown, expected: unknown, tolerance = 1e-11): void {
  if (typeof expected === 'number') {
    expect(typeof actual).toBe('number');
    expect(Math.abs((actual as number)-expected)).toBeLessThanOrEqual(tolerance*(1+Math.abs(expected)));
  } else if (Array.isArray(expected)) {
    expect(Array.isArray(actual)).toBe(true); expect((actual as unknown[]).length).toBe(expected.length);
    expected.forEach((value,i) => parity((actual as unknown[])[i],value,tolerance));
  } else if (expected && typeof expected === 'object') {
    expect(Object.keys(actual as object).sort()).toEqual(Object.keys(expected).sort());
    for (const [key,value] of Object.entries(expected)) parity((actual as Record<string,unknown>)[key],value,tolerance);
  } else expect(actual).toEqual(expected);
}

describe('pipeline, features and semantic tasks', () => {
  it('uses the frozen predictor and independently checked canonical loss/update', () => {
    const before = derivePipeline(PIPELINE_CANONICAL), next = pipelineUpdate(PIPELINE_CANONICAL);
    expect(before.numerical.mse).toBeCloseTo(4.1,12);
    expect(next.regression.weight).toBeCloseTo(1.02,12); expect(next.regression.bias).toBeCloseTo(.16,12);
    expect(derivePipeline(next).loss).toBeCloseTo(1.7064,12);
    parity(before,golden.pipeline.before); parity(derivePipeline(next),golden.pipeline.after);
    expect(CANONICAL_REGRESSION.weight).toBe(.5);
  });
  it('inference produces no observed error or optimizer update', () => {
    const state: PipelineState = { ...PIPELINE_CANONICAL,mode:'inference' };
    parity(derivePipeline(state),golden.pipeline.inference);
    expect(derivePipeline(state).prediction).toBe(.75);
    expect(() => pipelineUpdate(state)).toThrow(/Inference/);
    expect(pipelineTrace(state)).toHaveLength(3);
  });
  it('detaches immutable full states and validates unsupported updates', () => {
    const state = structuredClone(PIPELINE_CANONICAL), trace = pipelineTrace(state);
    parity(trace,golden.pipeline.trace);
    (state.regression.samples as {id:string;x:number;y:number}[])[0]!.x=5;
    expect(trace[0]!.state.regression.samples[0]!.x).toBe(-2);
    expect(Object.isFrozen(trace[4]!.state.regression.samples)).toBe(true);
    expect(() => derivePipeline({ ...PIPELINE_CANONICAL,query:Infinity })).toThrow(RangeError);
    expect(() => pipelineUpdate({ ...PIPELINE_CANONICAL,regression:{...CANONICAL_REGRESSION,weight:-4,learningRate:1} })).toThrow(RangeError);
  });
  it('inspects every supported rectangular shape and absent target schema', () => {
    for (let n=1;n<=6;n++) for(let d=1;d<=3;d++) {
      const active=deriveFeatures({...FEATURE_CANONICAL,sampleCount:n,featureCount:d});
      expect(active.X).toHaveLength(n); expect(active.X.every(row=>row.length===d)).toBe(true);
      expect(active.shapes).toEqual({X:[n,d],weights:[d,1],targets:[n,1]});
    }
    golden.features.forEach(f=>parity(deriveFeatures(f.state as FeatureState),f));
    expect(deriveFeatures(featureTargetKind(FEATURE_CANONICAL,'none')).y).toBeNull();
  });
  it('rejects fractional count, duplicate ID, nonfinite and shape/type mismatch', () => {
    const state=structuredClone(FEATURE_CANONICAL);
    for (const samples of [
      state.samples.map((r,i)=>i===0?{...r,values:[1,.5,7]}:r),
      state.samples.map((r,i)=>i===0?{...r,id:'r2'}:r),
      state.samples.map((r,i)=>i===0?{...r,values:[NaN,2,7]}:r),
    ]) expect(()=>deriveFeatures({...state,samples})).toThrow(RangeError);
    expect(()=>deriveFeatures({...state,sampleCount:1.5})).toThrow(RangeError);
    expect(()=>deriveFeatures({...state,targetKind:'category'})).toThrow(RangeError);
  });
  it('decides task from semantics, including 0/1 category and continuous proportion', () => {
    for(const scenario of TASKS) expect(deriveTask({scenario:scenario.id,choice:scenario.expected}).correct).toBe(true);
    for(const row of golden.tasks) parity(deriveTask(row.state as Parameters<typeof deriveTask>[0]),row);
    expect(deriveTask({scenario:'binary-code',choice:'regression'}).correct).toBe(false);
    expect(deriveTask({scenario:'ignore-label',choice:'unsupervised'}).usesTarget).toBe(false);
  });
});

describe('partitions and independent leakage counterexamples', () => {
  it('is reproducible across seed boundaries and input ordering', () => {
    for (const seed of [0,42,0xffffffff]) for(const groups of [true,false]) {
      const first=seedSplit(SPLIT_SAMPLES,seed,groups), reversed=seedSplit([...SPLIT_SAMPLES].reverse(),seed,groups);
      expect(JSON.stringify(first)).toBe(JSON.stringify(reversed));
      const result=deriveSplit(first);
      expect(result.subsets.reduce((n,s)=>n+s.count,0)).toBe(12);
      if(groups) expect(result.groupLeaks).toEqual([]);
    }
    golden.splits.forEach(row=>parity(deriveSplit(row.state as SplitState),row));
  });
  it('moves all group members atomically, exposes intentional duplicate leakage', () => {
    const group=assignSplit(SPLIT_CANONICAL,'g1-a','test');
    expect(group.assignments['g1-b']).toBe('test');
    const manual=assignSplit({...group,keepGroups:false},'g1-a','validation');
    expect(deriveSplit(manual).groupLeaks).toContain('g1');
    expect(deriveSplit(manual).duplicateLeaks.length).toBeGreaterThan(0);
    expect(SPLIT_CANONICAL.assignments).not.toBe(manual.assignments);
  });
  it('retains special property IDs through the accepted shared immutable snapshot', () => {
    const rows=['__proto__','a','b'].map((id,i)=>({id,group:id,x:i,y:2*i+1}));
    const state=seedSplit(rows,42,true), frames=splitTrace(state);
    expect(Object.hasOwn(frames[0]!.state.assignments,'__proto__')).toBe(true);
    expect(frames[0]!.state.assignments.__proto__).toBe(state.assignments.__proto__);
    expect(deriveSplit(frames[0]!.state).partitionCount).toBe(3);
    expect(Object.isFrozen(frames[0]!.state.assignments)).toBe(true);
    parity(splitTrace(SPLIT_CANONICAL),golden.splitTrace);
  });
  it('shows empty-set reasons and deliberately out-of-range held-out IDs', () => {
    const empty={...SPLIT_CANONICAL,assignments:Object.fromEntries(SPLIT_SAMPLES.map(row=>[row.id,'validation' as const]))};
    expect(deriveSplit(empty).baselineMean).toBeNull();
    expect(deriveSplit(empty).subsets.every(row=>row.mse===null)).toBe(true);
    const shift=deriveSplit(shiftSplit(SPLIT_CANONICAL));
    expect(shift.subsets[2]!.outOfRange).toEqual(['g6-a','g6-b']);
  });
  it('rejects malformed memberships and invalid seeds instead of deleting samples', () => {
    for(const seed of [-1,1.5,2**32,NaN]) expect(()=>seedSplit(SPLIT_SAMPLES,seed,true)).toThrow(RangeError);
    expect(()=>deriveSplit({...SPLIT_CANONICAL,assignments:{}})).toThrow(RangeError);
    expect(()=>assignSplit(SPLIT_CANONICAL,'missing','train')).toThrow(RangeError);
  });
  it('independently confirms leakage direction, target leakage and training-only counterfactual', () => {
    const value=leakageExample(42,10);
    expect(value.trainX).toEqual([1,3]);
    expect([value.trainingMean,value.wholeMean,value.honestMSE,value.leakedMSE]).toEqual([2,5,0,9]);
    expect([value.targetCentering.honestMSE,value.targetCentering.leakedMSE]).toEqual([81,36]);
    expect(leakageExample(42,13).trainingMean).toBe(2);
    expect(leakageExample(42,13).wholeMean).not.toBe(5);
    golden.leakage.forEach(row=>parity(leakageExample(row.seed,row.distance),row));
  });
  it('maps pointer destinations with a keyboard-compatible partition representation', () => {
    const zones=[{partition:'train' as const,left:0,right:100,top:0,bottom:50}];
    expect(splitDrop(20,20,zones)).toBe('train');expect(splitDrop(120,20,zones)).toBeNull();
    expect(()=>splitDrop(NaN,0,zones)).toThrow(RangeError);
  });
});

describe('same-row polynomial capacity and baseline', () => {
  it('matches Fraction/SVD-confirmed goldens, including manual and seeded memberships', () => {
    golden.capacity.forEach(row=>{
      parity(deriveCapacity(row.state as CapacityState),row.derived,1e-8);
      parity(capacityCandidates(row.state as CapacityState),row.selection,1e-8);
    });
  });
  it('recomputes fit and baseline from actual moved training IDs', () => {
    const before=deriveCapacity(CAPACITY_CANONICAL), state=assignCapacity(CAPACITY_CANONICAL,'p1','validation'), after=deriveCapacity(state);
    expect(after.trainingIds).not.toContain('p1'); expect(after.trainingIds).toHaveLength(8);
    const train=after.rows.filter(row=>row.partition==='train');
    expect(after.baselineMean).toBeCloseTo(train.reduce((s,r)=>s+r.y,0)/train.length,14);
    expect(after.coefficients).not.toEqual(before.coefficients);
    expect(after.rows.map(row=>row.id)).toEqual(before.rows.map(row=>row.id));
    expect(CAPACITY_CANONICAL.assignments).toBeUndefined();
  });
  it('repartitioning preserves observed x/y/noise and uses a separate split seed', () => {
    const before=capacityData(CAPACITY_CANONICAL);
    const seeded=presetCapacitySplit(CAPACITY_CANONICAL,'seeded',123);
    expect(capacityData(seeded).map(({id,x,y})=>({id,x,y}))).toEqual(before.map(({id,x,y})=>({id,x,y})));
    expect(deriveCapacity(seeded).errors.map(r=>r.count)).toEqual([10,3,4]);
    expect(seeded.seed).toBe(42);
  });
  it('renders no fabricated loss for empty training/validation or deficient rank', () => {
    const empty:CapacityState={...CAPACITY_CANONICAL,source:'manual',assignments:Object.fromEntries(capacityData(CAPACITY_CANONICAL).map(r=>[r.id,'validation']))};
    const derived=deriveCapacity(empty);
    expect(derived.baselineMean).toBeNull(); expect(derived.coefficients).toBeNull(); expect(derived.reason).toMatch(/empty/);
    expect(capacityCandidates(empty).selectedDegree).toBeNull();
    const allTrain={...empty,assignments:Object.fromEntries(capacityData(empty).map(r=>[r.id,'train' as const]))};
    expect(deriveCapacity(allTrain).errors[1]!.mse).toBeNull();
    expect(capacityCandidates(allTrain).selectedDegree).toBeNull();
    const one={...empty,assignments:{...empty.assignments,p9:'train' as const}};
    expect(deriveCapacity(one).reason).toMatch(/distinct/);
    expect(deriveCapacity({...one,degree:0}).coefficients).toEqual([1.5]);
  });
  it('rejects the supplied near-rank fixture with identical exact reason', () => {
    expect(fitCapacity(golden.nearRank.samples,1)).toEqual({coefficients:null,reason:CAPACITY_RANK_REASON});
    expect(fitCapacity(golden.nearRank.samples,1)).toEqual(golden.nearRank.fit);
    const resolved=[.5-1e-5,.5,.5+1e-5].map((x,i)=>({id:String(i),x,y:2*x+1}));
    const coefficients=fitCapacity(resolved,1).coefficients!;
    expect(coefficients[0]).toBeCloseTo(1,9);expect(coefficients[1]).toBeCloseTo(2,9);
  });
  it('distinguishes constant/one-sample fits from unique higher degree coefficients', () => {
    const constant=[{id:'a',x:.5,y:1},{id:'b',x:.5,y:3}];
    expect(fitCapacity(constant,0).coefficients![0]).toBeCloseTo(2,14);
    expect(fitCapacity(constant,1).coefficients).toBeNull();
    expect(fitCapacity([],0).reason).toMatch(/empty/);
    expect(()=>fitCapacity([{id:'a',x:2,y:1}],1)).toThrow(RangeError);
    expect(()=>fitCapacity([{id:'a',x:0,y:1},{id:'a',x:1,y:2}],1)).toThrow(RangeError);
    expect(()=>polynomialPrediction(1,[Infinity])).toThrow(RangeError);
  });
  it('uses validation-only selection with the simplest tie and exact noiseless quadratic', () => {
    const state={...CAPACITY_CANONICAL,noise:0};
    const fit=deriveCapacity(state);
    parity(fit.coefficients,[1,2,-1]);expect(fit.errors[1]!.mse!).toBeLessThan(1e-25);
    expect(capacityCandidates(state).selectedDegree).toBe(2);
    expect(capacityCandidates(state)).toEqual(capacityCandidates(structuredClone(state)));
    expect(capacityCandidates(state).candidates.every(row=>!Object.hasOwn(row,'testMSE'))).toBe(true);
  });
  it('keeps split/noise data immutable through selected capacity history', () => {
    const state=structuredClone(CAPACITY_CANONICAL),trace=capacityTrace(state);
    parity(trace,golden.capacityTrace);
    expect(trace.map(frame=>frame.state.degree)).toEqual([0,2,8]);
    expect(Object.isFrozen(trace[1]!.state)).toBe(true);
    expect(assignCapacity(trace[1]!.state,'p1','test').degree).toBe(2);
    expect(trace[1]!.state.assignments).toBeUndefined();
  });
});

describe('reviewed JSON type and duplicate boundaries',()=>{
  it('rejects category arrays/objects instead of silently adding a target dimension',()=>{
    const state=featureTargetKind(FEATURE_CANONICAL,'category');
    for(const target of [['ready'],{value:'ready'},null,true,1]){
      const payload={...state,samples:state.samples.map((row,i)=>i===0?{...row,target}:row)};
      expect(()=>deriveFeatures(JSON.parse(JSON.stringify(payload)))).toThrow(RangeError);
    }
    expect(deriveFeatures(state).y!.every(row=>row.length===1&&typeof row[0]==='string')).toBe(true);
  });
  it('rejects JSON booleans/nonnumbers across numeric APIs and keeps ordinary numbers valid',()=>{
    for(const value of [true,false,null,'1',[],{}]){
      expect(()=>derivePipeline(JSON.parse(JSON.stringify({...PIPELINE_CANONICAL,mode:'inference',query:value})))).toThrow(RangeError);
      expect(()=>capacityData(JSON.parse(JSON.stringify({...CAPACITY_CANONICAL,noise:value})))).toThrow(RangeError);
      expect(()=>capacityCandidates(JSON.parse(JSON.stringify({...CAPACITY_CANONICAL,noise:value})))).toThrow(RangeError);
      expect(()=>capacityTrace(JSON.parse(JSON.stringify({...CAPACITY_CANONICAL,noise:value})))).toThrow(RangeError);
      for(const key of ['x','y']){
        expect(()=>fitCapacity(JSON.parse(JSON.stringify([{id:'a',x:0,y:1,[key]:value}])),0)).toThrow(RangeError);
        const samples=SPLIT_SAMPLES.map((row,i)=>i===0?{...row,[key]:value}:row);
        expect(()=>seedSplit(JSON.parse(JSON.stringify(samples)),42,true)).toThrow(RangeError);
      }
      expect(()=>polynomialPrediction(JSON.parse(JSON.stringify(value)),[1,2])).toThrow(RangeError);
      expect(()=>polynomialPrediction(1,JSON.parse(JSON.stringify([1,value])))).toThrow(RangeError);
      expect(()=>leakageExample(42,JSON.parse(JSON.stringify(value)))).toThrow(RangeError);
    }
    expect(derivePipeline({...PIPELINE_CANONICAL,mode:'inference',query:1.0}).prediction).toBe(.5);
    expect(fitCapacity([{id:'a',x:0,y:1.0}],0).coefficients).toEqual([1]);
    expect(polynomialPrediction(1.0,[1,2.0])).toBe(3);
  });
  it('treats integer/float spellings as identical values across partitions',()=>{
    const state:SplitState={samples:[{id:'integer',group:'a',x:1,y:2},{id:'float',group:'b',x:1.0,y:2.0},{id:'other',group:'c',x:3,y:4}],
      seed:42,keepGroups:false,source:'manual',assignments:{integer:'train',float:'validation',other:'test'}};
    expect(deriveSplit(state).duplicateLeaks).toEqual(['1|2']);
    expect(deriveSplit(state).subsets.map(row=>row.mse)).toEqual([0,0,4]);
    for(const [value,text] of [[-0,'0'],[1e-7,'1e-7'],[1e-6,'0.000001']] as const){
      const samples=state.samples.map(row=>row.id==='other'?row:{...row,x:value,y:2.0});
      expect(deriveSplit({...state,samples}).duplicateLeaks).toEqual([text+'|2']);
    }
  });
});
