import { describe,expect,it } from 'vitest';
import { h } from 'preact';
import { render } from 'preact-render-to-string';
import { readFileSync } from 'node:fs';
import { compile } from '@mdx-js/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import Formula from '../../../src/ui/Formula';
import NeighborStage from '../../../src/parts/p03/NeighborStage';
import MetricStage from '../../../src/parts/p03/MetricStage';
import BayesStage from '../../../src/parts/p03/BayesStage';
import PartExercises from '../../../src/parts/p03/PartExercises';
import { EXERCISES } from '../../../src/parts/p03/exercises';
import { deriveNeighborLesson,deriveMetricLesson,deriveBayesLesson,moveQuery,pointerQuery } from '../../../src/parts/p03/lesson';
import { NEIGHBOR_CANONICAL,neighborPreset } from '../../../src/parts/p03/model/neighbors';
import { METRIC_CANONICAL } from '../../../src/parts/p03/model/metrics';
import { BAYES_CANONICAL,bayesPreset } from '../../../src/parts/p03/model/bayes';
import manifest from '../../../src/parts/p03/manifest.json';
import inventory from '../../../src/curriculum/book-ii.json';
import plan from '../../../src/curriculum/plan.json';
import data from '../../../data/p03/bernoulli-toy.json';
describe('authoritative numeric projections',()=>{
  it('puts the identical projected sample array inside the neighbor plot',()=>{
    const a=deriveNeighborLesson(NEIGHBOR_CANONICAL);
    expect(a.plot.points).toBe(a.points);
    for(const row of a.tableRows){
      const point=a.plot.points.find(p=>p.id===row.id)!;
      expect(point.distance).toBe(row.distance);expect(point.selected).toBe(row.selected);
      expect(point.cx).toBe(320+80*row.x);expect(point.cy).toBe(320-80*row.y);
    }
  });
  it('keeps duplicate markers coincident while separating their identity labels',()=>{
    const a=deriveNeighborLesson(neighborPreset('duplicates'),320);
    const first=a.points.find(p=>p.id==='s4')!,second=a.points.find(p=>p.id==='s7')!;
    expect(first.cx).toBe(second.cx);expect(first.cy).toBe(second.cy);
    expect(Math.abs(first.label.y-second.label.y)).toBeGreaterThanOrEqual(a.plot.fontSize+4);
  });
  it('keeps given fine coordinates and marks every computed distance approximate',()=>{
    const query={x:.123456789,y:-.234567891},a=deriveNeighborLesson({...NEIGHBOR_CANONICAL,query});
    expect(a.plot.query.cx).toBe(320+80*query.x);expect(a.plot.query.cy).toBe(320-80*query.y);
    expect(a.plot.query.name).toContain('0.123456789');expect(a.speech).toContain('-0.234567891');
    expect(a.tableRows.every(r=>r.text.distance.startsWith('≈ '))).toBe(true);
  });
  it('uses declared pointer snapping while preserving keyboard fine precision',()=>{
    expect(moveQuery({x:-1.23456789,y:0},'ArrowRight').x).toBe(-1.23456789+.1);
    expect(pointerQuery(320+80*.1234567,320-80*.8765432,{left:0,top:0,width:640,height:640})).toEqual({x:.1,y:.9});
    expect(pointerQuery(2000,-100,{left:0,top:0,width:640,height:640})).toEqual({x:3,y:3});
    expect(()=>pointerQuery(0,0,{left:0,top:0,width:0,height:0})).toThrow(RangeError);
    expect(()=>deriveNeighborLesson({...NEIGHBOR_CANONICAL,query:{x:3.1,y:0}})).toThrow(RangeError);
  });
  it('adapts physical handle and label sizes without changing mathematics',()=>{
    for(const width of [250,320,700,1100]){
      const a=deriveNeighborLesson(NEIGHBOR_CANONICAL,width),m=deriveMetricLesson(METRIC_CANONICAL,width);
      expect(a.plot.hitRadius*2*width/640).toBeGreaterThanOrEqual(44);
      expect(a.plot.fontSize*width/640).toBeGreaterThanOrEqual(14);
      expect(m.strip.fontSize*width/640).toBeGreaterThanOrEqual(14);
      expect(a.regression).toBe(6);expect(m.pairDistance).toBeCloseTo(Math.sqrt(5),14);
    }
  });
  it('projects spread positions from the active distance rows',()=>{
    const a=deriveMetricLesson({...METRIC_CANONICAL,dimension:8});
    for(const p of a.strip.points){
      const value=a.rows.find(row=>row.id===p.id)!.distance;
      expect(p.cx).toBeCloseTo(56+(value-a.summary.min)*528/(a.summary.max-a.summary.min),12);
    }
    expect(a.plot.query.cx).toBe(320);expect(a.plot.points[0]!.cx).toBe(480);
  });
  it('explains undefined neighbor and Bayes decisions without claiming a selection',()=>{
    const neighbors=deriveNeighborLesson({...NEIGHBOR_CANONICAL,k:7});
    expect(neighbors.selectedIds).toEqual([]);
    expect(neighbors.voteExplanation).toContain('No neighbors selected.');
    expect(neighbors.voteExplanation).toContain(neighbors.reason!);
    expect(neighbors.voteExplanation).not.toContain('exactly k selected rows');
    expect(deriveNeighborLesson(NEIGHBOR_CANONICAL).voteExplanation).toContain('exactly k selected rows');
    const noPrior={...BAYES_CANONICAL,classes:BAYES_CANONICAL.classes.map(c=>({...c,priorWeight:0}))};
    for(const state of [bayesPreset('impossible'),bayesPreset('empty-class'),noPrior]){
      const a=deriveBayesLesson(state);
      expect(a.prediction).toBeNull();expect(a.scoreOrder).toBeNull();
      expect(a.decisionExplanation).toContain('No class decision is defined.');
      expect(a.decisionExplanation).toContain(a.reason!);
      expect(a.decisionExplanation).not.toContain('Choose by exact model-score ordering');
    }
    expect(deriveBayesLesson(BAYES_CANONICAL).decisionExplanation).toContain('Choose by exact model-score ordering');
    expect(deriveBayesLesson(bayesPreset('exact-tie')).decisionExplanation).toContain('Exact posterior tie');
  });
  it('renders strict symbolic formulas and keeps failures visible',()=>{
    for(const a of [deriveNeighborLesson(NEIGHBOR_CANONICAL),deriveMetricLesson({...METRIC_CANONICAL,p:1.234567,metric:'Lp'}),deriveBayesLesson(BAYES_CANONICAL)]){
      expect(()=>render(h(Formula,a.formula))).not.toThrow();
    }
    expect(deriveMetricLesson({...METRIC_CANONICAL,p:1.234567,metric:'Lp'}).formula.tex).toContain('r\\approx1.2346');
    expect(deriveBayesLesson(bayesPreset('impossible')).rows.map(r=>r.text.posterior)).toEqual(['Undefined','Undefined']);
    expect(deriveBayesLesson(bayesPreset('impossible')).rows.every(r=>r.text.logScore.startsWith('−∞'))).toBe(true);
    expect(deriveBayesLesson(bayesPreset('empty-class')).rows[0]!.features[0]!.text.logLikelihood).toBe('Undefined');
    expect(deriveBayesLesson(bayesPreset('tiny')).rows.every(r=>r.text.score.includes('underflow'))).toBe(true);
  });
});
describe('three complete chapters and accessible source contracts',()=>{
  it('renders each mathematical stage with shared controls',()=>{
    for(const Stage of [NeighborStage,MetricStage,BayesStage]){
      const html=render(h(Stage,{scope:'p03-'+Stage.name}));
      expect(html).toContain('data-p03');expect(html).toContain('Reset experiment');
      expect(html).toContain('data-announcement');expect(html).toContain('class="inspector"');
      if(Stage===BayesStage){
        expect(html).toContain('−∞ denotes zero probability; Undefined marks an unavailable estimate or posterior');
        expect(html).not.toContain('A null log');
      }
    }
  });
  it('keeps scoped SVG references unique for repeated stage instances',()=>{
    const html=render(h('div',null,h(NeighborStage,{scope:'first'}),h(NeighborStage,{scope:'second'}),h(MetricStage,{scope:'metric'})));
    const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
    expect(ids.length).toBeGreaterThanOrEqual(11);expect(new Set(ids).size).toBe(ids.length);
  });
  it('registers exact titles, actual raw Python imports and real prerequisites',()=>{
    expect(manifest.part).toBe('p03');expect(manifest.chapters).toHaveLength(3);
    const known=new Set(inventory.chapters.map(c=>c.id));
    for(const c of manifest.chapters){
      const text=readFileSync('src/parts/p03/chapters/'+c.slug+'.mdx','utf8');
      expect(text).toContain('chapterId: '+c.id);
      expect(text).toContain('title: '+plan.flatMap(p=>p.chapters).find(row=>row.id===c.id)!.title);
      const required=JSON.parse(text.match(/prerequisites: (\[[^\n]+\])/ )![1]!) as string[];
      required.forEach(id=>expect(known.has(id)).toBe(true));
      expect(text.indexOf('<Stage ')).toBeLessThan(text.indexOf('## '));
      const sources=[...text.matchAll(/from ['"]([^'"]+\.py)\?raw['"]/g)].map(m=>m[1]!);
      expect(sources.length).toBeGreaterThan(0);
      sources.forEach(path=>expect(readFileSync(new URL('../../../src/parts/p03/chapters/'+path,import.meta.url),'utf8')).toContain('def '));
    }
  });
  it('compiles all owned MDX with strict math',async()=>{
    for(const c of manifest.chapters){
      const text=readFileSync('src/parts/p03/chapters/'+c.slug+'.mdx','utf8');
      const output=await compile(text,{remarkPlugins:[remarkMath],rehypePlugins:[[rehypeKatex,{throwOnError:true,strict:'error'}]]});
      expect(String(output)).toContain('PartExercises');
    }
  });
  it('provides five graded misconception questions for each chapter',()=>{
    for(const c of manifest.chapters){
      const questions=EXERCISES[c.id]!;expect(questions).toHaveLength(5);
      questions.forEach(q=>{expect(q.choices.filter(v=>v.correct)).toHaveLength(1);expect(q.choices.every(v=>v.feedback.length>20)).toBe(true);});
      expect([...render(h(PartExercises,{chapter:c.id})).matchAll(/data-exercise=/g)]).toHaveLength(5);
    }
  });
  it('confirms the toy counts from actual records and empirical dependence',()=>{
    for(const c of BAYES_CANONICAL.classes){
      const rows=data.records.filter(row=>row.category===c.id);
      expect(rows).toHaveLength(c.count);
      expect([0,1].map(j=>rows.reduce((n,row)=>n+row.features[j]!,0))).toEqual(c.positive);
    }
    const a=data.records.filter(r=>r.category==='A');
    expect(a.filter(r=>r.features.every(v=>v===1)).length).toBe(1);
    expect(1/a.length).not.toBe((4/a.length)*(1/a.length));
  });
});
