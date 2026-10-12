/** Directional comparison of two exact normalized finite distributions. */
import { div, cmp, toNumber, type Rational } from '../quantity/rational';
import { validateMass } from '../probability/finite';
import { integer } from '../probability/seeded';
import { entropy, logProbability, logRational, unitScale, type Unit } from './probabilities';
export function compareDistributions(p:readonly Rational[],q:readonly Rational[],unit:Unit='nats') {
  integer(p.length,1,6,'Support size');validateMass(p);validateMass(q);
  if(p.length!==q.length)throw new RangeError('P and Q must name the same ordered support.');
  const scale=unitScale(unit),h=entropy(p,unit);
  const crossTerms=p.map((mass,i)=>mass.num===0n?0:q[i]!.num===0n?Infinity:-toNumber(mass)*logProbability(q[i]!)/scale);
  const klTerms=p.map((mass,i)=>mass.num===0n?0:q[i]!.num===0n?Infinity:cmp(mass,q[i]!)===0?0:toNumber(mass)*logRational(div(mass,q[i]!))/scale);
  const cross=crossTerms.reduce((a,b)=>a+b,0),kl=klTerms.reduce((a,b)=>a+b,0);
  return {p,q,unit,entropy:h.value,crossTerms,klTerms,cross,kl,equal:p.every((mass,i)=>cmp(mass,q[i]!)===0),
    identityResidual:Number.isFinite(cross)&&Number.isFinite(kl)?kl-(cross-h.value):null};
}
export function oneHot(size:number,target:number):readonly Rational[] {
  integer(size,1,6,'Support size');integer(target,0,size-1,'Target index');
  return Array.from({length:size},(_,i)=>({num:i===target?1n:0n,den:1n}));
}
