/** Ordered Bernoulli observations and half-integer Beta priors; bounded, exact likelihood. */
import { div,int,rational,sub,ONE,type Rational,toNumber } from '../quantity/rational';
import { decimal } from '../probability/moments';
import { integer } from '../probability/seeded';
export interface LikelihoodInput { data:readonly number[]; theta:number; alpha:number; beta:number }
const trialPower=(p:Rational,n:number)=>rational(p.num**BigInt(n),p.den**BigInt(n));
function evaluate(n:number,k:number,p:Rational){
 const failure=sub(ONE,p),success=trialPower(p,k),other=trialPower(failure,n-k);
 const likelihood=rational(success.num*other.num,success.den*other.den),theta=toNumber(p);
 // Empty factors contribute one and zero log, even at theta=0 or 1.
 const logLikelihood=(k? k*Math.log(theta):0)+(n-k? (n-k)*Math.log1p(-theta):0);
 return {likelihood,logLikelihood};
}
export function bernoulli(data:readonly number[],theta:number){
 integer(data.length,0,32,'Observation count');
 if(data.some(x=>x!==0&&x!==1))throw new RangeError('Bernoulli observations must be exactly 0 or 1.');
 if(!Number.isFinite(theta)||theta<0||theta>1)throw new RangeError('Candidate probability lies in [0,1].');
 const p=decimal(theta),n=data.length,k=data.reduce((a,b)=>a+b,0),value=evaluate(n,k,p),mle=n?rational(BigInt(k),BigInt(n)):null;
 const optimum=mle?evaluate(n,k,mle):evaluate(0,0,ONE);
 return {data,n,k,failures:n-k,p,...value,mle,maxLikelihood:optimum.likelihood,maxLogLikelihood:optimum.logLikelihood,logGap:optimum.logLikelihood-value.logLikelihood};
}
/** Gamma for positive half-integers: Γ(1)=1, Γ(1/2)=sqrt(pi), followed by recurrence in log space. */
function logGammaHalf(x:number){let value=x,log=Number.isInteger(x)?0:.5*Math.log(Math.PI),base=Number.isInteger(x)?1:.5;while(value>base){value-=1;log+=Math.log(value);}return log;}
const logBeta=(a:number,b:number)=>logGammaHalf(a)+logGammaHalf(b)-logGammaHalf(a+b);
export interface Density { kind:'finite'|'zero'|'divergent'; value:number|null; log:number }
function betaDensity(theta:number,a:number,b:number,normalizerLog:number):Density {
 if(theta===0){if(a<1)return {kind:'divergent',value:null,log:Infinity};if(a>1)return {kind:'zero',value:0,log:-Infinity};return {kind:'finite',value:Math.exp(-normalizerLog),log:-normalizerLog};}
 if(theta===1){if(b<1)return {kind:'divergent',value:null,log:Infinity};if(b>1)return {kind:'zero',value:0,log:-Infinity};return {kind:'finite',value:Math.exp(-normalizerLog),log:-normalizerLog};}
 const log=(a-1)*Math.log(theta)+(b-1)*Math.log1p(-theta)-normalizerLog;
 return {kind:'finite',value:Math.exp(log),log};
}
function betaMode(a:number,b:number){
 if(a>1&&b>1)return {kind:'interior' as const,modes:[div(decimal(a-1),decimal(a+b-2))]};
 if(a===1&&b===1)return {kind:'uniform' as const,modes:[] as Rational[]};
 if(a<1&&b<1)return {kind:'two-boundary-limits' as const,modes:[int(0),int(1)]};
 return {kind:(a<1||b<1?'boundary-limit':'boundary') as 'boundary-limit'|'boundary',modes:[a<=1&&b>=1?int(0):int(1)]};
}
export function inference(input:LikelihoodInput){
 const {data,theta,alpha,beta}=input;
 for(const value of [alpha,beta])if(!Number.isFinite(value)||value<.5||value>5||!Number.isInteger(value*2))throw new RangeError('Beta prior parameters must be half-integers from 0.5 to 5.');
 const model=bernoulli(data,theta),a=alpha+model.k,b=beta+model.failures,priorLogBeta=logBeta(alpha,beta),posteriorLogBeta=logBeta(a,b);
 const prior=betaDensity(theta,alpha,beta,priorLogBeta),posterior=betaDensity(theta,a,b,posteriorLogBeta);
 // Combine exponents before evaluating a boundary; never multiply zero by a divergent prior density.
 const unnormalized=betaDensity(theta,a,b,priorLogBeta),evidence=Math.exp(posteriorLogBeta-priorLogBeta),mode=betaMode(a,b);
 const curve=Array.from({length:201},(_,i)=>{const p=i/200,l=evaluate(model.n,model.k,rational(BigInt(i),200n));return {theta:p,likelihood:toNumber(l.likelihood),prior:betaDensity(p,alpha,beta,priorLogBeta),posterior:betaDensity(p,a,b,posteriorLogBeta),unnormalized:betaDensity(p,a,b,priorLogBeta)};});
 return {...model,input,a,b,prior,posterior,unnormalized,evidence,mode,posteriorMean:div(decimal(a),decimal(a+b)),priorLogBeta,posteriorLogBeta,curve};
}
