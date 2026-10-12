import {it,expect} from 'vitest';
import katex from 'katex';
import {CANONICAL,deriveProbabilityLesson} from '../../src/lessons/information-theory/probability-lesson';
import {EXERCISES} from '../../src/lessons/information-theory/block-a-exercises';
it('views, formulas and immutable semantic traces derive from the same quantity',()=>{
  for(const chapter of ['logs','surprise','entropy'] as const)for(const p of [0,.01,.25,1])for(const unit of ['nats','bits'] as const){
    const d=deriveProbabilityLesson(chapter,{...CANONICAL,p,unit});expect(d.view.description.length).toBeGreaterThan(50);expect(Object.isFrozen(d.view.trace)).toBe(true);expect(Object.isFrozen(d.view.trace[0]!.state)).toBe(true);
    for(const tex of [...d.view.formulas,...d.view.trace.map(f=>f.state.formula),...d.view.rows.map(r=>r.symbolTex)])expect(()=>katex.renderToString(tex,{throwOnError:true,strict:'error'})).not.toThrow();
    if(chapter==='entropy')expect(d.bars.map(b=>b.value)).toEqual((d.model as {terms:readonly number[]}).terms);
  }
});
it('all fifteen graders accept the worked answer and reject malformed/incorrect input',()=>{
  const answers=[['1/10'],['-3'],['finite'],['minus-infinity'],['reject'],['2'],['0'],['infinite'],['divide'],['1'],['1'],['0'],['1/2','1/2','1/2','3/2'],['uniform'],['no']];
  const exercises=Object.values(EXERCISES).flat();expect(exercises).toHaveLength(15);
  exercises.forEach((e,i)=>{const a=e.choices?{choice:answers[i]![0]!}:Object.fromEntries(answers[i]!.map((v,j)=>[`n${j}`,v]));expect(e.grade(a).correct,e.id).toBe(true);expect(e.grade({}).correct,e.id).toBe(false);expect(e.grade(e.choices?{choice:'malformed'}:{n0:'Infinity'}).correct,e.id).toBe(false);expect(e.solution.length).toBeGreaterThan(30);});
});
