/** Bounded 2×2 example; exact matrix APIs classify/reference, binary64 pivoting computes. */
import {abs,add,cmp,div,mul,sub,ZERO,type Rational} from '../quantity/rational';
import {determinant2,multiplyVector,solveSystem2,type Matrix} from '../linear-algebra/matrices';
import {asBinary64,exactBinary64,finiteDecimal} from './floating';
import {decimalList,type ArithmeticStep} from './algorithms';
const maximum=(xs:readonly Rational[])=>xs.reduce((a,b)=>cmp(a,b)>=0?a:b,ZERO);
const norm=(xs:readonly Rational[])=>maximum(xs.map(abs));
export function numericalSolve(matrixText:string,rhsText:string,tolerance:number|string) {
 tolerance=typeof tolerance==='string'?asBinary64(finiteDecimal(tolerance)):tolerance;
 if(!Number.isFinite(tolerance)||tolerance<0||tolerance>0.01)throw new RangeError('Relative pivot diagnostic tolerance must lie in [0,0.01].');
 const entries=decimalList(matrixText,4,'10'),rhs=decimalList(rhsText,2,'10');if(entries.length!==4||rhs.length!==2)throw new RangeError('Use four row-major matrix entries and two right-hand sides.');
 const a:Matrix={rows:2,cols:2,values:[entries.slice(0,2),entries.slice(2)]},exact=solveSystem2(a,rhs),det=determinant2(a),nA=maximum(a.values.map(row=>row.reduce((s,v)=>add(s,abs(v)),ZERO)));
 const condition=det.num===0n?null:mul(nA,maximum([div(add(abs(entries[3]!),abs(entries[1]!)),abs(det)),div(add(abs(entries[2]!),abs(entries[0]!)),abs(det))]));
 const values=entries.map(asBinary64),b=rhs.map(asBinary64),storedA:Matrix={rows:2,cols:2,values:[values.slice(0,2).map(exactBinary64),values.slice(2).map(exactBinary64)]},stored=solveSystem2(storedA,b.map(exactBinary64));
 const rows=[[values[0]!,values[1]!,b[0]!],[values[2]!,values[3]!,b[1]!]],scale=Math.max(Math.abs(values[0]!)+Math.abs(values[1]!),Math.abs(values[2]!)+Math.abs(values[3]!)),steps:ArithmeticStep[]=[];
 const swapped=Math.abs(rows[1]![0]!)>Math.abs(rows[0]![0]!);if(swapped)[rows[0],rows[1]]=[rows[1]!,rows[0]!];
 steps.push({title:'Choose the first pivot',detail:swapped?'Swap both coefficient rows and their right-hand sides to use the larger first-column pivot.':'The first row already has the larger first-column pivot.',values:{swapped:String(swapped),a00:rows[0]![0]!,a01:rows[0]![1]!,b0:rows[0]![2]!,a10:rows[1]![0]!,a11:rows[1]![1]!,b1:rows[1]![2]!}});
 let solution:number[]|null=null,pivot2=0,multiplier:number|null=null;
 if(rows[0]![0]!==0){multiplier=rows[1]![0]!/rows[0]![0]!;pivot2=rows[1]![1]!-multiplier*rows[0]![1]!;const rhs2=rows[1]![2]!-multiplier*rows[0]![2]!;steps.push({title:'Eliminate the first column',detail:'These subtraction and multiplication results are actual binary64 intermediates.',values:{multiplier,pivot2,rhs2}});if(pivot2!==0){const y=rhs2/pivot2,x=(rows[0]![2]!-rows[0]![1]!*y)/rows[0]![0]!;if([x,y].every(Number.isFinite))solution=[x,y];steps.push({title:'Back substitute',detail:'A tiny nonzero pivot can amplify data and arithmetic error; a warning does not change exact rank.',values:{y,x}});}}
 if(steps.length<2)steps.push({title:'No nonzero first-column pivot',detail:'The stored system is rank deficient; no unique numerical solution is fabricated.',values:{storedClassification:stored.kind}});
 const numericalDet=values[0]!*values[3]!-values[1]!*values[2]!;
 const inverse=numericalDet===0?null:[values[3]!/numericalDet,-values[1]!/numericalDet,-values[2]!/numericalDet,values[0]!/numericalDet];
 let inverseSolution=inverse===null?null:[inverse[0]!*b[0]!+inverse[1]!*b[1]!,inverse[2]!*b[0]!+inverse[3]!*b[1]!];if(inverseSolution?.some(v=>!Number.isFinite(v)))inverseSolution=null;
 steps.push({title:'Form the explicit inverse',detail:'The comparison materializes four inverse entries before multiplying by the right-hand side; every value here is binary64.',values:{determinant:numericalDet,inv00:inverse?.[0]??null,inv01:inverse?.[1]??null,inv10:inverse?.[2]??null,inv11:inverse?.[3]??null,x:inverseSolution?.[0]??null,y:inverseSolution?.[1]??null}});
 const measure=(x:readonly number[]|null)=>{
  if(x===null)return null;
  const numericalResidual=Math.max(Math.abs(values[0]!*x[0]!+values[1]!*x[1]!-b[0]!),Math.abs(values[2]!*x[0]!+values[3]!*x[1]!-b[1]!));
  const rationalX=x.map(exactBinary64),product=multiplyVector(a,rationalX);if(!product.ok)throw new Error(product.reason);
  const residual=norm(product.value.map((v,i)=>sub(v,rhs[i]!))),forward=exact.kind==='unique'?norm(rationalX.map((v,i)=>sub(v,exact.solution[i]!))):null,referenceNorm=exact.kind==='unique'?norm(exact.solution):null;
  return {numericalResidual,residual,forward,relativeForward:forward===null||referenceNorm===null||referenceNorm.num===0n?null:div(forward,referenceNorm)};
 };
 return {a,rhs,values,b,exact,stored,det,condition,scale,tolerance,swapped,multiplier,pivot2,solution,inverse,inverseSolution,numericalDet,solveMeasure:measure(solution),inverseMeasure:measure(inverseSolution),nearSingular:solution!==null&&Math.abs(pivot2)<=tolerance*scale,steps};
}
