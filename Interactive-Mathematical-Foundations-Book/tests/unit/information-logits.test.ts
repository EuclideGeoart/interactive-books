import {it,expect} from 'vitest';
import {softmaxPipeline,shiftedSoftmax,NORMALIZATION_BUDGET,type SoftmaxValue} from '../../src/math/information-theory/softmax';
const valid=(z:readonly number[])=>{const d=softmaxPipeline(z);expect(d.status).toBe('valid');return d as SoftmaxValue;};
it('all stages expose the max-shift algorithm, normalization and naive overflow',()=>{
  const d=valid([1000,0,-1000]);expect(d.max).toBe(1000);expect(d.shifted).toEqual([0,-1000,-2000]);expect(d.shiftedExponentials).toEqual([1,0,0]);expect(d.denominator).toBe(1);expect(d.logProbabilities).toEqual([0,-1000,-2000]);expect(d.probabilities).toEqual([1,0,0]);expect(d.underflow).toEqual([false,true,true]);expect(d.naiveStatus).toBe('overflow');expect(d.naiveProbabilities[0]).toBeNaN();
  expect(valid([-1000,-1001,-1002]).naiveStatus).toBe('zero-denominator');
  for(let k=0;k<50;k++){const z=[(k-25)*40,k*.03,-k*20],d=valid(z);expect(d.normalizationError).toBeLessThanOrEqual(NORMALIZATION_BUDGET);expect(d.denominator).toBeGreaterThanOrEqual(1);expect(d.denominator).toBeLessThanOrEqual(3);}
});
it('softmax is shift invariant within rounding; centered logsoftmax survives huge offsets',()=>{
  for(const shift of [-1000,-10,0,.25,1000])expect(shiftedSoftmax([1,2,3],shift).difference).toBeLessThanOrEqual(2e-14);
  const d=valid([1e308,1e308]);expect(d.probabilities).toEqual([.5,.5]);expect(d.logProbabilities).toEqual([-Math.LN2,-Math.LN2]);expect(d.logsumexp).toBe(1e308);
  const range=valid([Number.MAX_VALUE,-Number.MAX_VALUE]);expect(range.logRangeExceeded).toEqual([false,true]);expect(range.excluded).toEqual([false,false]);expect(range.underflow).toEqual([false,true]);
  // Finite addition can erase differences; this is binary64 input rounding, not a counterexample in real arithmetic.
  expect(shiftedSoftmax([0,1,2],1e308).difference).toBeGreaterThan(.2);
  expect(()=>shiftedSoftmax([1,2],Infinity)).toThrow();
  expect(shiftedSoftmax([-Number.MAX_VALUE],-Number.MAX_VALUE).shifted.status).toBe('invalid');
  expect(shiftedSoftmax([Number.MAX_VALUE],Number.MAX_VALUE).shifted.status).toBe('invalid');
});
it('empty NaN +∞ and all −∞ policies are explicit; a single −∞ excludes a class',()=>{
  for(const z of [[],[NaN,0],[Infinity,0],[0,0,0,0,0,0,0]])expect(softmaxPipeline(z).status).toBe('invalid');
  expect(softmaxPipeline([-Infinity,-Infinity]).status).toBe('undefined');
  const d=valid([0,-Infinity]);expect(d.excluded).toEqual([false,true]);expect(d.underflow).toEqual([false,false]);expect(d.probabilities).toEqual([1,0]);expect(d.logProbabilities).toEqual([0,-Infinity]);
});
