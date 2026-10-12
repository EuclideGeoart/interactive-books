/** Bounded binary64 pipeline. Mathematical support zeros and numerical range loss remain distinct. */
export const NORMALIZATION_BUDGET = 32 * Number.EPSILON * 6;
export interface SoftmaxFailure {readonly status:'invalid'|'undefined';readonly logits:readonly number[];readonly reason:string}
export interface SoftmaxValue {
  readonly status:'valid';readonly logits:readonly number[];readonly max:number;readonly shifted:readonly number[];
  readonly shiftedExponentials:readonly number[];readonly denominator:number;readonly logDenominator:number;readonly logsumexp:number;
  readonly logProbabilities:readonly number[];readonly probabilities:readonly number[];readonly sum:number;readonly normalizationError:number;
  readonly excluded:readonly boolean[];readonly underflow:readonly boolean[];readonly logRangeExceeded:readonly boolean[];
  readonly naiveExponentials:readonly number[];readonly naiveDenominator:number;readonly naiveProbabilities:readonly number[];
  readonly naiveStatus:'finite'|'overflow'|'zero-denominator';
}
export type SoftmaxResult=SoftmaxValue|SoftmaxFailure;
export function softmaxPipeline(logits:readonly number[]):SoftmaxResult {
  if(logits.length<1||logits.length>6)return {status:'invalid',logits,reason:'Use a nonempty vector of 1–6 logits.'};
  if(logits.some(z=>Number.isNaN(z)||z===Infinity||typeof z!=='number'))return {status:'invalid',logits,reason:'NaN and positive infinity are rejected: no unambiguous normalized prediction is defined by this policy.'};
  const max=Math.max(...logits);
  if(max===-Infinity)return {status:'undefined',logits,reason:'All logits are −∞: every exponential is zero, so normalization and log-softmax are undefined.'};
  const excluded=logits.map(z=>z===-Infinity),shifted=logits.map(z=>z-max),shiftedExponentials=shifted.map(Math.exp);
  const denominator=shiftedExponentials.reduce((a,b)=>a+b,0),logDenominator=Math.log(denominator),logsumexp=max+logDenominator;
  // Center before subtracting the correction: z − rounded(logsumexp) loses log(n) at a huge common offset.
  const logProbabilities=shifted.map(z=>z-logDenominator),probabilities=shiftedExponentials.map(e=>e/denominator),sum=probabilities.reduce((a,b)=>a+b,0);
  const naiveExponentials=logits.map(Math.exp),naiveDenominator=naiveExponentials.reduce((a,b)=>a+b,0),naiveProbabilities=naiveExponentials.map(e=>e/naiveDenominator);
  return {status:'valid',logits,max,shifted,shiftedExponentials,denominator,logDenominator,logsumexp,logProbabilities,probabilities,sum,normalizationError:Math.abs(sum-1),excluded,
    underflow:probabilities.map((p,i)=>p===0&&!excluded[i]),logRangeExceeded:shifted.map((z,i)=>!Number.isFinite(z)&&!excluded[i]),
    naiveExponentials,naiveDenominator,naiveProbabilities,naiveStatus:!Number.isFinite(naiveDenominator)?'overflow':naiveDenominator===0?'zero-denominator':'finite'};
}
export function shiftedSoftmax(logits:readonly number[],shift:number) {
  if(!Number.isFinite(shift))throw new RangeError('The common shift must be finite.');
  const baseline=softmaxPipeline(logits),effective=logits.map(z=>z+shift);
  const overflow=effective.some((z,i)=>Number.isFinite(logits[i])&&!Number.isFinite(z));
  const shifted:SoftmaxResult=overflow?{status:'invalid',logits:effective,reason:'Adding the common finite shift overflowed binary64 input arithmetic; no support exclusion is inferred.'}:softmaxPipeline(effective);
  const difference=baseline.status==='valid'&&shifted.status==='valid'?Math.max(...baseline.probabilities.map((p,i)=>Math.abs(p-shifted.probabilities[i]!))):null;
  return {baseline,effective,shifted,difference,shift};
}
