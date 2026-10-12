/** Selected bounded algorithms. Exact references and actual binary64 intermediates remain separate. */
import {abs,add,cmp,div,int,mul,rational,sub,ZERO,ONE,type Rational} from '../quantity/rational';
import {asBinary64,decode,encode,exactBinary64,finiteDecimal,pow2,type FormatId} from './floating';
import {sqrtBounds} from './error';
import {integer} from '../probability/seeded';
export type Algorithm='hypot'|'log1p'|'expm1'|'sum'|'softmax'|'scaling';
export function decimalList(text:string,maximum=12,limit='1e300'):Rational[] {
 if(text.length>1200)throw new RangeError('Use at most 1200 characters in this bounded list.');
 const parts=text.split(',');integer(parts.length,1,maximum,'Entry count');const bound=finiteDecimal(limit);
 return parts.map(raw=>{const v=finiteDecimal(raw);if(cmp(abs(v),bound)>0)throw new RangeError(`Entries must lie within ±${limit}.`);return v;});
}
export interface ArithmeticStep {title:string;detail:string;values:Record<string,Rational|number|string|null>}
const sumExact=(xs:readonly Rational[])=>xs.reduce(add,ZERO);
/** Symmetric rational series bound; |x|≤0.1. 48 terms are ample for binary64, with an explicit remaining bound. */
export function smallFunction(x:Rational,kind:'log1p'|'expm1') {
 if(cmp(abs(x),rational(1n,10n))>0)throw new RangeError('This comparison supports |x| ≤ 0.1.');
 let term=x,total=ZERO;
 for(let k=1;k<=48;k++){
  if(kind==='log1p'){term=k===1?x:mul(term,x);total=add(total,mul(div(term,int(k)),int(k%2?1:-1)));}
  else{term=k===1?x:div(mul(term,x),int(k));total=add(total,term);}
 }
 const next=div(mul(abs(term),abs(x)),int(49));
 const remainder=kind==='log1p'?div(next,sub(ONE,abs(x))):mul(int(2),next);
 return {lower:sub(total,remainder),upper:add(total,remainder),reference:asBinary64(total),remainder};
}
export function stableAlgorithm(text:string,kind:Algorithm,scalePower=16,format:FormatId='fp16') {
 if(!['hypot','log1p','expm1','sum','softmax','scaling'].includes(kind))throw new RangeError('Unknown algorithm.');
 const exact=decimalList(text,kind==='softmax'?6:12),xs=exact.map(asBinary64),steps:ArithmeticStep[]=[],reference=kind==='sum'?sumExact(exact):null;
 let naive:number,stable:number,lower:Rational|null=null,upper:Rational|null=null,probabilities:number[]|null=null,logProbabilities:number[]|null=null;
 if(kind==='hypot'){
  if(xs.length!==2)throw new RangeError('Norm comparison uses exactly two entries.');
  const [x,y]=xs as [number,number],xx=x*x,yy=y*y,squares=xx+yy,scale=Math.max(Math.abs(x),Math.abs(y)),sx=scale===0?0:x/scale,sy=scale===0?0:y/scale,scaledSquares=sx*sx+sy*sy,scaledRoot=Math.sqrt(scaledSquares);
  naive=Math.sqrt(squares);stable=scale*scaledRoot;
  const exactScale=cmp(abs(exact[0]!),abs(exact[1]!))>=0?abs(exact[0]!):abs(exact[1]!);
  if(exactScale.num===0n)lower=upper=ZERO;else{const a=div(exact[0]!,exactScale),b=div(exact[1]!,exactScale),bounds=sqrtBounds(add(mul(a,a),mul(b,b)));lower=mul(exactScale,bounds[0]);upper=mul(exactScale,bounds[1]);}
  steps.push({title:'Naive squares',detail:'The individual products may overflow or underflow before their finite mathematical norm is formed.',values:{x,y,xx,yy,sum:squares,result:naive}},{title:'Scale before squaring',detail:'Divide by the largest represented magnitude, square bounded ratios, then restore the scale. Zero scale is handled explicitly.',values:{scale,sx,sy,scaledSquares,scaledRoot,result:stable}});
 }else if(kind==='log1p'||kind==='expm1'){
  if(xs.length!==1)throw new RangeError('This comparison uses one entry.');
  const x=xs[0]!,bounds=smallFunction(exact[0]!,kind);lower=bounds.lower;upper=bounds.upper;
  const intermediate=kind==='log1p'?1+x:Math.exp(x);naive=kind==='log1p'?Math.log(intermediate):intermediate-1;stable=kind==='log1p'?Math.log1p(x):Math.expm1(x);
  steps.push({title:'Naive intermediate',detail:kind==='log1p'?'The small input may disappear in 1+x before log is evaluated.':'The exponential may round to one before subtraction.',values:{x,intermediate,result:naive}},{title:'Specialized small-input evaluation',detail:'The runtime primitive retains the small change directly; its internal implementation is platform-dependent, so only observable inputs/results are claimed.',values:{x,result:stable,referenceLower:lower,referenceUpper:upper,seriesRemainder:bounds.remainder}});
 }else if(kind==='sum'){
  let ordinary=0,total=0,compensation=0;
  xs.forEach((x,i)=>{const previous=total,next=total+x,correction=Math.abs(total)>=Math.abs(x)?(total-next)+x:(x-next)+total;ordinary+=x;compensation+=correction;total=next;steps.push({title:`Accumulate entry ${i}`,detail:'Neumaier compensation retains a correction for the rounding in this addition; it is still finite-precision arithmetic.',values:{input:x,previous,next,correction,compensation,ordinary}});});
  naive=ordinary;stable=total+compensation;lower=upper=reference;
  steps.push({title:'Apply the retained correction',detail:'Add the accumulated correction once at the end. Overflowed accumulators cannot be repaired by compensation.',values:{sum:total,compensation,result:stable,exactIntended:reference,exactStoredOperandSum:sumExact(xs.map(exactBinary64))}});
 }else if(kind==='softmax'){
  if(exact.some(v=>cmp(abs(v),int(2000))>0))throw new RangeError('Softmax logits must lie within ±2000.');
  const exponentials=xs.map(Math.exp),naiveTotal=exponentials.reduce((a,b)=>a+b,0),maximum=Math.max(...xs),shifted=xs.map(x=>x-maximum),weights=shifted.map(Math.exp),total=weights.reduce((a,b)=>a+b,0),logTotal=Math.log(total);
  naive=Math.log(naiveTotal);stable=maximum+logTotal;probabilities=weights.map(w=>w/total);logProbabilities=shifted.map(z=>z-logTotal);
  steps.push({title:'Naive exponentials',detail:'Unshifted exponentials can overflow; an infinite sum does not imply an infinite mathematical log-sum-exp.',values:{total:naiveTotal,logSumExp:naive}});
  xs.forEach((z,i)=>steps.push({title:`Shift and normalize logit ${i}`,detail:'Log probabilities are computed from shifted logits directly, including finite tails whose displayed probabilities underflow to zero.',values:{logit:z,maximum,shifted:shifted[i]!,weight:weights[i]!,total,probability:probabilities![i]!,logProbability:logProbabilities![i]!}}));
  steps.push({title:'Restore the logarithmic scale',detail:'The maximum is added only after logging the bounded exponential sum.',values:{maximum,total,logTotal,logSumExp:stable}});
 }else{
  if(xs.length!==1)throw new RangeError('Loss-scaling simulation uses one gradient.');integer(scalePower,0,24,'Power-of-two scale');if(format!=='fp16'&&format!=='bf16')throw new RangeError('Scaling storage is emulated FP16 or BF16.');
  const value=exact[0]!,scale=pow2(scalePower),unscaled=decode(encode({kind:'finite',value,negativeZero:false},format),format),scaled=decode(encode({kind:'finite',value:mul(value,scale),negativeZero:false},format),format);
  naive=unscaled.value;stable=scaled.value/2**scalePower;lower=upper=value;
  steps.push({title:'Store without scaling',detail:'Direct low-precision storage may round a small nonzero gradient to zero.',values:{intended:value,storage:unscaled.value,bits:unscaled.bitString}},{title:'Scale before low-precision storage',detail:'This is deterministic software emulation, not a claim about actual training hardware or earlier gradient operations.',values:{scale,exactScaled:mul(value,scale),storage:scaled.value,bits:scaled.bitString}},{title:'Unscale in binary64',detail:'Scaling preserves some small gradients but may instead overflow large intermediates. It does not recover digits already lost earlier.',values:{storedScaled:scaled.value,scale:2**scalePower,unscaled:stable}});
 }
 const error=(value:number)=>lower===null||upper===null||!Number.isFinite(value)?null:[sub(exactBinary64(value),upper),sub(exactBinary64(value),lower)] as const;
 return {kind,exact,xs,naive,stable,lower,upper,reference:lower===null||upper===null?null:asBinary64(div(add(lower,upper),int(2))),naiveError:error(naive),stableError:error(stable),steps,probabilities,logProbabilities};
}
