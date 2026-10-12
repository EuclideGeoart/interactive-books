import {it,expect} from 'vitest';
import katex from 'katex';
import {CANONICAL,deriveLogitLesson} from '../../src/lessons/information-theory/logit-lesson';
import {CANONICAL as TOKENS,deriveTokenLesson} from '../../src/lessons/information-theory/token-lesson';
import {EXERCISES} from '../../src/lessons/information-theory/block-c-exercises';
it('stable, naive, boundary and mask views render from shared models and frozen semantic traces',()=>{
  const views=[];
  for(const chapter of ['softmax','stability'] as const)for(const logits of [[2,1,0],[1000,0,-1000],[-Infinity,-Infinity],[Infinity,0],[NaN,0],[],[1e308,1e308]]){const d=deriveLogitLesson(chapter,{...CANONICAL,logits});views.push(d.view);if(d.model.status==='valid')expect(d.bars.map(b=>b.value)).toEqual(d.model.probabilities);}
  for(const ignored of [false,true])views.push(deriveTokenLesson({...TOKENS,positions:TOKENS.positions.map(p=>({...p,ignored}))}).view);
  for(const view of views){expect(view.description.length).toBeGreaterThan(40);expect(Object.isFrozen(view.trace[0]!.state)).toBe(true);for(const tex of [...view.formulas,...view.trace.map(f=>f.state.formula),...view.rows.map(r=>r.symbolTex)])expect(()=>katex.renderToString(tex,{throwOnError:true,strict:'error'})).not.toThrow();}
});
it('all fifteen graded exercises accept their worked answers and reject malformed input',()=>{const answers=[['1/3'],['3','2/3'],['score'],['same'],['overflow'],['1000','0','-1','-2'],['-1'],['finite'],['undefined'],['centered'],['2'],['2','5'],['undefined'],['finite'],['differentiate']],es=Object.values(EXERCISES).flat();expect(es).toHaveLength(15);es.forEach((e,i)=>{expect(e.grade(e.choices?{choice:answers[i]![0]!}:Object.fromEntries(answers[i]!.map((v,j)=>[`n${j}`,v]))).correct,e.id).toBe(true);expect(e.grade({}).correct,e.id).toBe(false);expect(e.grade(e.choices?{choice:'unknown'}:{n0:'Infinity'}).correct,e.id).toBe(false);expect(e.solution.length).toBeGreaterThan(30);});});
