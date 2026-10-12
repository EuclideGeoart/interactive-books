import { NEED_NUMBERS, no, ok, parseRational, pick, type Exercise, type ExerciseKind } from '../../platform/exercise';
export function calculate(id:string,title:string,prompt:string,labels:readonly string[],expected:readonly string[],solution:string,hint:string,kind:ExerciseKind='calculation'):Exercise {
  return {id,title,prompt,kind,fields:labels.map((label,i)=>({id:`n${i}`,label})),solution,grade(answer){const xs=labels.map((_,i)=>parseRational(answer[`n${i}`]));if(xs.some(x=>!x))return NEED_NUMBERS;return xs.every((x,i)=>{const e=parseRational(expected[i])!;return x!.num*e.den===e.num*x!.den;})?ok(solution):no(hint);}};
}
export function choose(id:string,title:string,prompt:string,options:readonly [string,string,string][],kind:ExerciseKind='explanation'):Exercise {
  return {id,title,prompt,kind,choices:options.map(([id,label])=>({id,label})),solution:options[0]![2],grade:answer=>pick(answer,options[0]![0],Object.fromEntries(options.map(([id,,message])=>[id,message])))};
}
