import {it,expect} from 'vitest';
import {EXERCISES} from '../../src/lessons/numerical-computing/exercises';
const answers:Record<string,string[]>={representation:['1/1024','-6','1'],rounding:['8','1/4,1/40','1/2000'],conditioning:['401/10000','2','1000000,500000'],cancellation:['1','0,1/200000000','3/200,1/40']};
for(const chapter of Object.keys(answers))it(`${chapter}: five graded exercises with independent literal answers, corrective feedback and solutions`,()=>{
 const es=EXERCISES.filter(e=>e.id.startsWith(`numerical-${chapter}-`));expect(es).toHaveLength(5);
 es.forEach((e,i)=>{const answer=e.choices?{choice:'correct'}:Object.fromEntries(answers[chapter]![i]!.split(',').map((v,j)=>[`v${j}`,v]));expect(e.grade(answer).correct,e.id).toBe(true);expect(e.grade(e.choices?{choice:'wrong'}:Object.fromEntries(e.fields!.map(f=>[f.id,'999']))).correct).toBe(false);expect(e.grade({}).correct).toBe(false);expect(e.solution.length).toBeGreaterThan(30);});
});
