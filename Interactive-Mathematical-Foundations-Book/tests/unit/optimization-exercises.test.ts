import {describe,it,expect} from 'vitest';
import {BLOCK_A_EXERCISES} from '../../src/lessons/optimization/block-a-exercises';
const answers:Record<string,readonly string[]>={
 'optimization-landscapes-1':['4','2','4','1','4'], 'optimization-landscapes-2':['3/2','2','-2'], 'optimization-landscapes-3':['2','2','4','16'],
 'optimization-optima-1':['-1','1','0','2','-2'],'optimization-optima-3':['0','1','0','-4','2'],
 'optimization-convexity-1':['0','2','1/2','1','1/2'],'optimization-convexity-2':['0','1','-1'],
 'optimization-descent-1':['2','4','-1/2','-1','3/2','0','9/8'],'optimization-descent-2':['3/2','9/8','0','81/128'],'optimization-descent-3':['1/2','-2','65/8'],
};
const exercises=Object.values(BLOCK_A_EXERCISES).flat();
describe('Optimization Block A graded feedback',()=>{
 it('has exactly five exercises per chapter with unique ids and worked explanations',()=>{expect(exercises).toHaveLength(20);expect(new Set(exercises.map(e=>e.id)).size).toBe(20);for(const list of Object.values(BLOCK_A_EXERCISES))expect(list).toHaveLength(5);for(const e of exercises)expect(e.solution.length).toBeGreaterThan(80);});
 for(const e of exercises)it(e.id,()=>{expect(e.grade({}).correct).toBe(false);if(e.choices){expect(e.grade({choice:e.choices[0]!.id})).toMatchObject({correct:true});for(const c of e.choices.slice(1)){const result=e.grade({choice:c.id});expect(result.correct).toBe(false);expect(result.message.length).toBeGreaterThan(40);}}else{const a=answers[e.id]!;expect(a).toHaveLength(e.fields!.length);const literal=Object.fromEntries(e.fields!.map((f,i)=>[f.id,a[i]!]));expect(e.grade(literal).correct).toBe(true);expect(e.grade(Object.fromEntries(e.fields!.map(f=>[f.id,'999']))).correct).toBe(false);for(const bad of ['NaN','Infinity','1/0','garbage'])expect(e.grade({...literal,[e.fields![0]!.id]:bad}).correct).toBe(false);}});
});
