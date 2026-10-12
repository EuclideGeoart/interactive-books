/** Bounded exact references separate input representation, evaluation error and sensitivity. */
import { abs, add, cmp, div, int, isqrt, mul, rational, sub, ONE, type Rational } from '../quantity/rational';
import { asBinary64, exactBinary64, finiteDecimal } from './floating';
export function conditioning(text:string,deltaText:string,kind:'square'|'reciprocal') {
  if(!['square','reciprocal'].includes(kind))throw new RangeError('Unknown sensitivity example.');
  const x=finiteDecimal(text),delta=finiteDecimal(deltaText),perturbed=add(x,delta);
  if(cmp(abs(x),int(100))>0||cmp(abs(delta),ONE)>0)throw new RangeError('Use |x| ≤ 100 and |perturbation| ≤ 1.');
  const f=(r:Rational)=>kind==='square'?mul(r,r):r.num===r.den?null:div(ONE,sub(r,ONE));
  const base=f(x),changed=f(perturbed),storedX=asBinary64(x),storedPerturbed=asBinary64(perturbed);
  const run=(v:number)=>kind==='square'?v*v:1/(v-1),computed=run(storedX),computedChanged=run(storedPerturbed);
  const storedReference=f(exactBinary64(storedX));
  const condition=base===null||base.num===0n?null:kind==='square'?int(2):div(abs(x),abs(sub(x,ONE)));
  return {x,delta,perturbed,kind,base,changed,change:base===null||changed===null?null:sub(changed,base),condition,storedX,storedPerturbed,computed,computedChanged,
    inputEffect:base===null||storedReference===null?null:sub(storedReference,base),roundoff:storedReference===null||!Number.isFinite(computed)?null:sub(exactBinary64(computed),storedReference),answerError:base===null||!Number.isFinite(computed)?null:sub(exactBinary64(computed),base),
    crossesPole:kind==='reciprocal'&&cmp(x,ONE)*cmp(perturbed,ONE)<=0};
}
/** Rational square-root enclosure with 220 fractional binary bits, using integer square root. */
export function sqrtBounds(r:Rational):readonly [Rational,Rational] {
  if(r.num<0n)throw new RangeError('Real square root needs nonnegative input.');
  const scale=1n<<220n,k=isqrt(r.num*scale*scale/r.den),lo=rational(k,scale);
  return [lo,k*k*r.den===r.num*scale*scale?lo:rational(k+1n,scale)];
}
export function cancellation(text:string) {
  const x=finiteDecimal(text);
  if(x.num<0n||cmp(x,finiteDecimal('1e300'))>0)throw new RangeError('Use an exact x in [0,1e300].');
  const a=sqrtBounds(add(x,ONE)),b=sqrtBounds(x),lower=div(ONE,add(a[1],b[1])),upper=div(ONE,add(a[0],b[0]));
  const binaryX=asBinary64(x),plusOne=binaryX+1,rootA=Math.sqrt(plusOne),rootB=Math.sqrt(binaryX),naive=rootA-rootB,denominator=rootA+rootB,stable=1/denominator;
  const error=(value:number)=>{const exact=exactBinary64(value);return [sub(exact,upper),sub(exact,lower)] as const;};
  return {x,binaryX,plusOne,rootA,rootB,naive,denominator,stable,lower,upper,reference:asBinary64(div(add(lower,upper),int(2))),naiveError:error(naive),stableError:error(stable),
    lostIncrement:plusOne===binaryX,referenceExpression:'1 / (sqrt(x+1) + sqrt(x))'};
}
