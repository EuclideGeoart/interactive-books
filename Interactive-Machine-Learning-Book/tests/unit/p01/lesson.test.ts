import { describe,expect,it } from 'vitest';
import { h } from 'preact';
import { render } from 'preact-render-to-string';
import { readFileSync } from 'node:fs';
import { compile } from '@mdx-js/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import Formula from '../../../src/ui/Formula';
import PipelineStage from '../../../src/parts/p01/PipelineStage';
import FeatureStage from '../../../src/parts/p01/FeatureStage';
import TaskStage from '../../../src/parts/p01/TaskStage';
import SplitStage from '../../../src/parts/p01/SplitStage';
import CapacityStage from '../../../src/parts/p01/CapacityStage';
import FoundationExercises from '../../../src/parts/p01/FoundationExercises';
import { EXERCISES } from '../../../src/parts/p01/exercises';
import { deriveCapacityLesson,derivePipelineLesson,deriveSplitLesson } from '../../../src/parts/p01/lesson';
import { CAPACITY_CANONICAL,assignCapacity } from '../../../src/parts/p01/model/capacity';
import { PIPELINE_CANONICAL } from '../../../src/parts/p01/model/foundations';
import { SPLIT_CANONICAL } from '../../../src/parts/p01/model/splits';
import { keyboardPartition,partitionIndex } from '../../../src/parts/p01/MembershipBoard';
import manifest from '../../../src/parts/p01/manifest.json';
import prerequisites from '../../../src/curriculum/book-ii.json';
import plan from '../../../src/curriculum/plan.json';

describe('authoritative lesson projections',()=>{
  it('never equates rounded coefficients with exact substitutions',()=>{
    const state={...PIPELINE_CANONICAL,regression:{...PIPELINE_CANONICAL.regression,weight:.1234567,bias:-.2345678}};
    const active=derivePipelineLesson(state);
    expect(active.formula.tex).toContain('\\hat y=wx+b');
    expect(active.formula.tex).toContain('w\\approx0.1235');
    expect(active.formula.tex).not.toContain('=0.1235');
    expect(active.speech).toContain('Weight 0.1234567');
    expect(()=>render(h(Formula,active.formula))).not.toThrow();
  });
  it('distinguishes unlabelled query loss from the known stored training batch',()=>{
    const a=derivePipelineLesson({...PIPELINE_CANONICAL,mode:'inference'});
    expect(a.loss).toBeNull();expect(a.numerical.mse).toBeCloseTo(4.1,12);
    expect(a.lossScope).toBe('inference-query');
    expect(a.metricLabels.loss).toContain('Inference query loss');
  });
  it('keeps fine given values and authoritative numerical prediction',()=>{
    const original=PIPELINE_CANONICAL.regression;
    const state={...PIPELINE_CANONICAL,regression:{...original,weight:.1234567,samples:original.samples.map(r=>r.id==='s3'?{...r,x:.123456789}:r)}};
    const active=derivePipelineLesson(state);
    expect(active.x).toBe(.123456789);expect(active.nodes[0]!.value).toBe('0.123456789');
    expect(active.prediction).toBe(state.regression.weight*active.x+state.regression.bias);
    expect(active.speech).toContain('Input 0.123456789');
    expect(active.nodes[2]!.value).toMatch(/^≈ /);
  });
  it('builds residual geometry from the same fitted object',()=>{
    const active=deriveCapacityLesson(CAPACITY_CANONICAL,320);
    for(const point of active.plot.points){
      expect(point.cx).toBeCloseTo(48+(point.x+1.1)*544/2.2,13);
      expect(point.cy).toBeCloseTo(352-(point.y+3)*304/7,13);
      expect(point.residualLine?.y2).toBeCloseTo(352-(point.prediction!+3)*304/7,12);
    }
    expect(active.plot.paths.fit).toMatch(/^M /);
    expect(()=>render(h(Formula,active.formula))).not.toThrow();
  });
  it('adapts physical labels without changing the fitted mathematics',()=>{
    for(const width of [260,320,650,1100]){
      const active=deriveCapacityLesson(CAPACITY_CANONICAL,width);
      expect(active.plot.fontSize*width/640).toBeGreaterThanOrEqual(14);
      expect(active.coefficients).toEqual(deriveCapacityLesson(CAPACITY_CANONICAL).coefficients);
    }
    expect(()=>deriveCapacityLesson(CAPACITY_CANONICAL,0)).toThrow(RangeError);
  });
  it('uses actual memberships in the deliberate whole-target leak comparison',()=>{
    const before=deriveCapacityLesson(CAPACITY_CANONICAL);
    const after=deriveCapacityLesson(assignCapacity(CAPACITY_CANONICAL,'p1','validation'));
    expect(after.leakage.wholeMean).toBe(before.leakage.wholeMean);
    expect(after.baselineMean).not.toBe(before.baselineMean);
    const heldout=after.rows.filter(row=>row.partition==='validation');
    const independent=heldout.reduce((sum,row)=>sum+(after.leakage.wholeMean-row.y)**2,0)/heldout.length;
    expect(after.leakage.errors[1]!.leakedMSE).toBe(independent);
    expect(after.leakage.reason).toMatch(/Invalid.*labels/);
  });
  it('projects split table residuals from the derived prediction rows',()=>{
    const a=deriveSplitLesson(SPLIT_CANONICAL);
    a.tableRows.forEach(row=>expect(row.residual).toBe(a.subsets.find(s=>s.partition===row.partition)!.predictions.find(p=>p.id===row.id)!.residual));
  });
  it('validates discrete numeric destinations and preserves keyboard direction',()=>{
    expect(partitionIndex(0)).toBe('train');expect(partitionIndex(2)).toBe('test');
    expect(()=>partitionIndex(.5)).toThrow(RangeError);
    expect(keyboardPartition('validation','ArrowLeft')).toBe('train');
    expect(keyboardPartition('train','ArrowLeft')).toBe('train');
    expect(keyboardPartition('validation','ArrowRight')).toBe('test');
  });
});

describe('six chapter source contracts and renderable controls',()=>{
  it('renders each distinct stage and strict formula without runtime errors',()=>{
    for(const Component of [PipelineStage,FeatureStage,TaskStage,SplitStage,CapacityStage]){
      const html=render(h(Component,{scope:'p01-unit-'+Component.name}));
      expect(html).toContain('data-p01');expect(html).toContain('Reset experiment');expect(html).toContain('data-announcement');
    }
  });
  it('creates unique SVG references for two stages using distinct scopes',()=>{
    const html=render(h('div',null,h(CapacityStage,{scope:'capacity-one'}),h(CapacityStage,{scope:'capacity-two'})));
    const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
    expect(ids.length).toBeGreaterThanOrEqual(6);expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some(id=>id!.startsWith('capacity-one-'))).toBe(true);expect(ids.some(id=>id!.startsWith('capacity-two-'))).toBe(true);
  });
  it('publishes six owned sources with actual code imports and known prerequisites',()=>{
    expect(manifest.chapters).toHaveLength(6);
    const ids=new Set(prerequisites.chapters.map(row=>row.id));
    for(const chapter of manifest.chapters){
      const text=readFileSync(new URL('../../../src/parts/p01/chapters/'+chapter.slug+'.mdx',import.meta.url),'utf8');
      expect(text).toContain('chapterId: '+chapter.id);
      const expected=plan.flatMap(part=>part.chapters).find(row=>row.id===chapter.id)!;
      expect(text).toContain('title: '+expected.title);
      const required=JSON.parse(text.match(/prerequisites: (\[[^\n]+\])/ )![1]!) as string[];
      required.forEach(id=>expect(ids.has(id)).toBe(true));
      const sources=[...text.matchAll(/from ['"]([^'"]+\.py)\?raw['"]/g)].map(match=>match[1]!);
      expect(sources.length).toBeGreaterThanOrEqual(1);
      sources.forEach(path=>expect(readFileSync(new URL('../../../src/parts/p01/chapters/'+path,import.meta.url),'utf8')).toContain('def '));
      expect(text.indexOf('<Stage ')).toBeLessThan(text.indexOf('## '));
    }
  });
  it('compiles all six local MDX chapters with strict math',async()=>{
    for(const chapter of manifest.chapters){
      const text=readFileSync(new URL('../../../src/parts/p01/chapters/'+chapter.slug+'.mdx',import.meta.url),'utf8');
      const compiled=await compile(text,{remarkPlugins:[remarkMath],rehypePlugins:[[rehypeKatex,{strict:'error',throwOnError:true}]]});
      expect(String(compiled)).toContain('FoundationExercises');
    }
  });
  it('supplies five independently graded questions per chapter with corrective feedback',()=>{
    for(const chapter of manifest.chapters){
      expect(EXERCISES[chapter.id]).toHaveLength(5);
      for(const question of EXERCISES[chapter.id]!){
        expect(question.choices.filter(choice=>choice.correct)).toHaveLength(1);
        expect(question.choices.every(choice=>choice.feedback.length>20)).toBe(true);
      }
      const html=render(h(FoundationExercises,{chapter:chapter.id}));
      expect([...html.matchAll(/data-exercise=/g)]).toHaveLength(5);
    }
  });
});
