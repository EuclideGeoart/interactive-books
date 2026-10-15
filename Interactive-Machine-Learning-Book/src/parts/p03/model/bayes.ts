import { traceFrom } from '../../../platform/trace';
import { bounded, finite } from './distance';
export interface BayesClass {
  readonly id: 'A' | 'B'; readonly priorWeight: number; readonly count: number;
  readonly positive: readonly [number,number];
}
export interface BayesState {
  readonly classes: readonly BayesClass[]; readonly query: readonly [number,number];
  readonly observed: readonly [boolean,boolean]; readonly alpha: number; readonly provenance: string;
}
export const BAYES_CANONICAL: BayesState = {
  classes:[{id:'A',priorWeight:.6,count:6,positive:[4,1]},{id:'B',priorWeight:.4,count:4,positive:[1,3]}],
  query:[1,1],observed:[true,true],alpha:1,provenance:'Hand-authored ten-row Bernoulli toy counts',
};
export function bayesPreset(kind: string): BayesState {
  if (kind === 'canonical') return BAYES_CANONICAL;
  if (kind === 'exact-tie') return {...BAYES_CANONICAL,alpha:0,classes:[
    {id:'A',priorWeight:1,count:7,positive:[1,6]},{id:'B',priorWeight:1,count:7,positive:[2,3]},
  ],provenance:'Hand-authored equal-product likelihoods with different factors'};
  if (kind === 'zero-prior') return {...BAYES_CANONICAL,classes:BAYES_CANONICAL.classes.map(c => ({...c,priorWeight:c.id === 'A' ? 0 : 1})),provenance:'Toy counts; class A prior weight set to zero'};
  if (kind === 'impossible' || kind === 'tiny') return {...BAYES_CANONICAL,alpha:kind === 'impossible' ? 0 : 1e-200,
    classes:BAYES_CANONICAL.classes.map(c => ({...c,positive:[0,0] as const})),provenance:'Toy zero-positive counts; ' + (kind === 'impossible' ? 'no smoothing' : 'tiny positive smoothing')};
  if (kind === 'empty-class') return {...BAYES_CANONICAL,alpha:0,classes:BAYES_CANONICAL.classes.map(c => c.id === 'A' ? {...c,count:0,positive:[0,0] as const} : c),provenance:'Toy class A has no observations and no smoothing'};
  throw new RangeError('Unknown Bayes example.');
}
// Private exact binary64 score comparison for this two-class/two-feature model only.
type Rational = {n:bigint;d:bigint};
function rational(n:bigint,d:bigint):Rational {
  if(n===0n)return {n:0n,d:1n};
  let a=n,b=d;while(b!==0n){const next=a%b;a=b;b=next;}
  return {n:n/a,d:d/a};
}
function inputRational(value:number):Rational {
  if(value===0)return {n:0n,d:1n};
  const bytes=new DataView(new ArrayBuffer(8));bytes.setFloat64(0,value,false);
  const bits=bytes.getBigUint64(0,false),exponent=Number((bits>>52n)&2047n);
  const significand=(bits&((1n<<52n)-1n))+(exponent===0?0n:1n<<52n);
  const power=exponent===0?-1074:exponent-1075;
  return power>=0?rational(significand<<BigInt(power),1n):rational(significand,1n<<BigInt(-power));
}
const addRational=(a:Rational,b:Rational)=>rational(a.n*b.d+b.n*a.d,a.d*b.d);
const multiplyRational=(a:Rational,b:Rational)=>rational(a.n*b.n,a.d*b.d);
function exactScore(c:BayesClass,state:BayesState):Rational {
  let score=inputRational(c.priorWeight);
  if(score.n===0n)return score;
  const alpha=inputRational(state.alpha);
  const denominator=addRational(inputRational(c.count),multiplyRational({n:2n,d:1n},alpha));
  for(let j=0;j<2;j++)if(state.observed[j]){
    const count=state.query[j]===1?c.positive[j]!:c.count-c.positive[j]!;
    const numerator=addRational(inputRational(count),alpha);
    score=multiplyRational(score,rational(numerator.n*denominator.d,numerator.d*denominator.n));
  }
  return score;
}
function compareScores(a:Rational,b:Rational):number {
  const delta=a.n*b.d-b.n*a.d;return delta<0n?-1:delta>0n?1:0;
}
function logSum(values: readonly number[]): number {
  const max = Math.max(...values);
  return finite(max + Math.log(values.reduce((sum,value) => sum + Math.exp(value-max),0)),'Log normalization');
}
export function deriveBayes(state: BayesState) {
  if (!Array.isArray(state.classes) || state.classes.length !== 2 ||
      state.classes[0]?.id !== 'A' || state.classes[1]?.id !== 'B') throw new RangeError('Bayes classes must be ordered A, B.');
  if (!Array.isArray(state.query) || state.query.length !== 2 || !Array.isArray(state.observed) || state.observed.length !== 2)
    throw new RangeError('Bayes requires two binary query components and two evidence flags.');
  const query: readonly number[] = state.query;
  const observed: readonly boolean[] = state.observed;
  const classes: readonly BayesClass[] = state.classes;
  for(let j=0;j<2;j++){
    bounded(query[j]!,'Binary query',0,1,true);
    if (typeof observed[j] !== 'boolean') throw new RangeError('Evidence flags must be boolean.');
  }
  bounded(state.alpha,'Smoothing alpha',0,1e6);
  if (typeof state.provenance !== 'string') throw new RangeError('Count provenance must be text.');
  classes.forEach(c => {
    bounded(c.priorWeight,'Prior weight',0,1e6); bounded(c.count,'Class count',0,1e6,true);
    if (!Array.isArray(c.positive) || c.positive.length !== 2) throw new RangeError('Each class needs two positive counts.');
    for(let j=0;j<2;j++) bounded(c.positive[j]!,'Positive count',0,c.count,true);
  });
  const priorLogs = classes.filter(c => c.priorWeight > 0).map(c => Math.log(c.priorWeight));
  const logPriorTotal = priorLogs.length ? logSum(priorLogs) : null;
  const rows = classes.map(c => {
    const logPrior = c.priorWeight === 0 || logPriorTotal === null ? null : Math.log(c.priorWeight)-logPriorTotal;
    const prior = logPrior === null ? (logPriorTotal === null ? null : 0) : Math.exp(logPrior);
    const features = c.positive.map((positive,j) => {
      const numerator = (query[j] === 1 ? positive : c.count-positive)+state.alpha;
      const denominator = c.count+2*state.alpha;
      const reason = denominator === 0 ? 'No class observations and no smoothing.' :
        numerator === 0 ? 'This feature outcome has zero count and no smoothing.' : null;
      const likelihood = denominator === 0 ? null : numerator/denominator;
      // Equal representable ratios share one log; retain finite logs if a positive ratio underflows.
      const logLikelihood = numerator === 0 || denominator === 0 ? null :
        likelihood! > 0 ? Math.log(likelihood!) : Math.log(numerator)-Math.log(denominator);
      return {index:j,observed:observed[j]!,query:query[j]!,positive,numerator,denominator,
        likelihood,logLikelihood,reason,underflow:numerator > 0 && denominator > 0 && likelihood === 0};
    });
    let reason: string|null = logPriorTotal === null ? 'All prior weights are zero; no prior distribution exists.' :
      c.priorWeight === 0 ? 'Zero prior; this class has zero score.' : null;
    let undefinedLikelihood = false, impossible = c.priorWeight === 0;
    let logScore: number|null = logPrior;
    if (logPrior !== null) for (const f of features.filter(f => f.observed)) {
      if (f.denominator === 0) {undefinedLikelihood = true;reason = f.reason;logScore = null;break;}
      if (f.numerator === 0) {impossible = true;reason = f.reason;logScore = null;}
      else if (logScore !== null) logScore += f.logLikelihood!;
    }
    if (logScore !== null) finite(logScore,'Class log score');
    const score = logScore === null ? (impossible && logPriorTotal !== null && !undefinedLikelihood ? 0 : null) : Math.exp(logScore);
    return {...c,prior,logPrior,features,logScore,score,impossible,undefinedLikelihood,reason,
      underflow:logScore !== null && score === 0};
  });
  let reason: string|null = logPriorTotal === null ? 'All prior weights are zero; posterior undefined.' :
    rows.some(row => row.undefinedLikelihood) ? 'A required likelihood is undefined; posterior cannot be normalized.' : null;
  let finiteScores = rows.flatMap(row => row.logScore === null ? [] : [row.logScore]);
  if (reason === null && !finiteScores.length) reason = 'All classes assign zero probability to this evidence; posterior undefined.';
  const scoreOrder = reason === null ? compareScores(exactScore(classes[0]!,state),exactScore(classes[1]!,state)) : null;
  if(scoreOrder===0){
    const common=Math.max(rows[0]!.logScore!,rows[1]!.logScore!);
    for(const row of rows){row.logScore=common;row.score=Math.exp(common);row.underflow=row.score===0;}
    finiteScores=[common,common];
  }
  const shift = reason === null ? Math.max(...finiteScores) : null;
  const shifted = rows.map(row => shift === null ? null : row.logScore === null ? 0 : Math.exp(row.logScore-shift));
  const normalizer = shift === null ? null : shifted.reduce<number>((sum,value) => sum+value!,0);
  const logEvidence = reason === null ? logSum(finiteScores) : null;
  const posterior = shifted.map(value => normalizer === null ? null : value! / normalizer);
  const evidence = logEvidence === null ? null : Math.exp(logEvidence);
  const prediction = reason !== null ? null : scoreOrder! >= 0 ? 'A' : 'B';
  return {state,rows:rows.map((row,j) => ({...row,shifted:shifted[j]!,posterior:posterior[j]!})),
    shift,normalizer,logEvidence,evidence,evidenceUnderflow:logEvidence !== null && evidence === 0,
    prediction,reason,scoreOrder,tiedPosterior:scoreOrder === 0,roundedPosteriorTie:reason === null && scoreOrder !== 0 && posterior[0] === posterior[1],
    shapes:{query:[2,1],priors:[2,1],likelihoods:[2,2],posterior:[2,1]}};
}
export function editBayesClass(state: BayesState, id: 'A'|'B', change: Partial<Omit<BayesClass,'id'>>): BayesState {
  if (id !== 'A' && id !== 'B') throw new RangeError('Unknown Bayes class.');
  const next = {...state,classes:state.classes.map(c => c.id === id ? {...c,...change} : c)};
  deriveBayes(next); return next;
}
export function bayesTrace(state: BayesState) {
  const states: BayesState[] = [state,{...state,observed:[false,false]},{...state,observed:[true,false]},{...state,observed:[true,true]}];
  states.forEach(deriveBayes);
  return traceFrom(states.map((value,i) => ({state:value,explanation:['Initial displayed evidence.','Prior only: no observed features.','Condition on feature 1.','Condition on both features under the model assumption.'][i]!})));
}
