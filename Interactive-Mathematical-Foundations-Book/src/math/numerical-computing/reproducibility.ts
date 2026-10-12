/** Fixed seeded stream and a controlled arithmetic-order comparison; rendering never draws random values. */
import {add,abs,div,int,sub} from '../quantity/rational';
import {seeded,integer} from '../probability/seeded';
import {asBinary64,exactBinary64,finiteDecimal} from './floating';
import {decimalList,type ArithmeticStep} from './algorithms';
export function approximateEqual(a:number,b:number,absoluteTolerance:number,relativeTolerance:number){
 if([absoluteTolerance,relativeTolerance].some(v=>!Number.isFinite(v)||v<0))throw new RangeError('Comparison tolerances must be finite and nonnegative.');
 if(!Number.isFinite(a)||!Number.isFinite(b))return {equal:false,difference:null,budget:null};
 const difference=Math.abs(a-b),budget=absoluteTolerance+relativeTolerance*Math.max(Math.abs(a),Math.abs(b));return {equal:Number.isFinite(difference)&&Number.isFinite(budget)&&difference<=budget,difference:Number.isFinite(difference)?difference:null,budget:Number.isFinite(budget)?budget:null};
}
export function stream(seed:number,count:number){
 integer(seed,0,0xffffffff,'Seed');integer(count,1,16,'Sample count');const rng=seeded(seed);let before=seed;
 return Array.from({length:count},(_,index)=>{const value=rng(),after=value*0x100000000,record={index,before,after,value,exact:div(int(after),int(0x100000000))};before=after;return record;});
}
export interface ReproInput{seed:number;count:number;values:string;absoluteTolerance:string;relativeTolerance:string}
export function reproducibility(s:ReproInput){
 const records=stream(s.seed,s.count),replayed=stream(s.seed,s.count),exactReplay=records.every((r,i)=>r.before===replayed[i]!.before&&r.after===replayed[i]!.after),intended=decimalList(s.values,3);if(intended.length!==3)throw new RangeError('The association comparison uses exactly three values.');
 const [a,b,c]=intended.map(asBinary64) as [number,number,number],ab=a+b,bc=b+c,left=ab+c,right=a+bc,reference=intended.reduce(add,int(0));
 const atol=asBinary64(finiteDecimal(s.absoluteTolerance)),rtol=asBinary64(finiteDecimal(s.relativeTolerance));if(atol>1||rtol>1)throw new RangeError('This experiment bounds each comparison tolerance by one.');const comparison=approximateEqual(left,right,atol,rtol);
 const error=(x:number)=>{const difference=sub(exactBinary64(x),reference);return {signed:difference,absolute:abs(difference),relative:reference.num===0n?null:div(abs(difference),abs(reference))};};
 const steps:ArithmeticStep[]=records.map(r=>({title:`LCG sample ${r.index}`,detail:'Replay uses the fixed uint32 algorithm and the recorded state. A seed alone is not a cross-implementation guarantee.',values:{before:String(r.before),after:String(r.after),uniform:r.exact}}));
 steps.push({title:'Left-associated evaluation',detail:'Add a and b, then add c. These are actual binary64 intermediates.',values:{a,b,c,first:ab,result:left}},{title:'Right-associated evaluation',detail:'Add b and c first, then add a. The mathematical sum is unchanged, while rounding opportunities move.',values:{b,c,first:bc,a,result:right}},{title:'Compare against the chosen budget',detail:'Exact discrete replay is checked exactly. A numeric tolerance is a stated absolute/relative error policy, not mathematical equality.',values:{left,right,difference:comparison.difference,budget:comparison.budget,withinBudget:String(comparison.equal),reference}});
 return {s,records,replayed,exactReplay,algorithm:'LCG32: state = (1664525·state + 1013904223) mod 2^32; uniform = state/2^32',a,b,c,ab,bc,left,right,reference,comparison,leftError:error(left),rightError:error(right),atol,rtol,steps};
}
