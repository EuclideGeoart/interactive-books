/** iid Normal(mu,sigma²), known sigma > 0; exact-normal intervals for every supported n. */
import { decimal } from '../probability/moments';
import { normalCDF, NORMAL_INTERVAL_ERROR } from '../probability/distributions';
import { seeded, integer } from '../probability/seeded';
export const CRITICAL = { 90:1.6448536269514722, 95:1.959963984540054, 99:2.5758293035489004 } as const;
export interface IntervalInput { mu:number; sigma:number; n:number; repetitions:number; seed:number; confidence:90|95|99 }
export function intervals(input:IntervalInput) {
  const {mu,sigma,n,repetitions,seed,confidence}=input;
  if(!Number.isFinite(mu)||Math.abs(mu)>10||!Number.isFinite(sigma)||sigma<.5||sigma>5||!Number.isInteger(confidence)||!Object.hasOwn(CRITICAL,confidence))throw new RangeError('Use |mu| ≤ 10, sigma in [0.5,5], confidence 90, 95 or 99.');
  const trueMean=decimal(mu),knownSigma=decimal(sigma);
  integer(n,1,64,'Sample size');integer(repetitions,1,80,'Repetitions');
  const rng=seeded(seed),critical=CRITICAL[confidence],standardError=sigma/Math.sqrt(n),halfWidth=critical*standardError;
  // Two uniforms per observation; discard the paired sine draw. 1-u lies in (0,1], so log is finite.
  const runs=Array.from({length:repetitions},()=>{const sample=Array.from({length:n},()=>mu+sigma*Math.sqrt(-2*Math.log(1-rng()))*Math.cos(2*Math.PI*rng()));const mean=sample.reduce((a,b)=>a+b,0)/n,lower=mean-halfWidth,upper=mean+halfWidth;return {sample,mean,lower,upper,contains:lower<=mu&&mu<=upper};});
  const covered=runs.filter(x=>x.contains).length;
  return {input,trueMean,knownSigma,critical,standardError,halfWidth,width:2*halfWidth,runs,covered,empiricalCoverage:covered/repetitions,analyticCoverage:2*normalCDF(critical)-1,coverageError:NORMAL_INTERVAL_ERROR};
}
