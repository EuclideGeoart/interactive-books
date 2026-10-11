import {expect,it} from 'vitest';
import {COMPLETION_EXERCISES} from '../../src/lessons/linear-algebra/completion-exercises';
const answers:Record<string,readonly string[]>={
 'elim-solve':['2','1'],'elim-row':['0','1','2'],'rank-nullity':['1'],'rank-repeat':['1'],'rank-null':['-2'],
 'inv-value':['1','-1','-1','2'],'inv-recover':['2','1'],'eigen-gain':['-1'],'eigen-polynomial':['1','-2'],
 'ls-fit':['4/3','1'],'ls-error':['2/3'],'ls-gram':['1/2','-1/2'],'svd-values':['3','1'],'svd-error':['1'],'svd-recover':['2','0'],
};
it('the completion chapters each have five exercises with globally unique identifiers',()=>{
 const all=Object.values(COMPLETION_EXERCISES).flat();expect(Object.keys(COMPLETION_EXERCISES)).toHaveLength(6);expect(all).toHaveLength(30);expect(new Set(all.map(e=>e.id)).size).toBe(30);
 for(const list of Object.values(COMPLETION_EXERCISES))expect(list).toHaveLength(5);
});
for(const e of Object.values(COMPLETION_EXERCISES).flat())it(`${e.id}: independent literal answer, rejection and worked feedback`,()=>{
 expect(e.solution).not.toBe('');expect(e.grade({}).correct).toBe(false);
 if(e.choices){expect(e.grade({choice:e.choices[0]!.id})).toEqual({correct:true,message:e.solution});for(const c of e.choices.slice(1)){const r=e.grade({choice:c.id});expect(r.correct).toBe(false);expect(r.message.length).toBeGreaterThan(25);}expect(e.grade({choice:'unknown'}).correct).toBe(false);}
 else{const make=(values:readonly string[])=>Object.fromEntries(e.fields!.map((f,i)=>[f.id,values[i]!]));expect(e.grade(make(answers[e.id]!))).toEqual({correct:true,message:e.solution});for(const value of ['999','NaN','1/0',''])expect(e.grade(make(e.fields!.map(()=>value))).correct).toBe(false);}
});
