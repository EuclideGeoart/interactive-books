import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { render } from 'preact-render-to-string';
import { readFileSync } from 'node:fs';
import { compile } from '@mdx-js/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import Formula from '../../../src/ui/Formula';
import Stage from '../../../src/parts/p05/ClusteringStage';
import { deriveLab, editCoordinate, initialLab, labTrace, pointerCoordinate, scenario } from '../../../src/parts/p05/lesson';
import { editLloyd } from '../../../src/parts/p05/model/clustering';
import manifest from '../../../src/parts/p05/manifest.json';
import plan from '../../../src/curriculum/plan.json';
import inventory from '../../../src/curriculum/book-ii.json';
describe('one state supplies every mathematical projection', () => {
  it('projects real coordinates, means, distance labels and proposed objective', () => {
    const a = deriveLab(initialLab('lloyd'));
    expect(a.lloyd.proposedObjective).toBe(4);
    for (const p of a.points) { expect(p.cx).toBe(280+42*p.x[0]); expect(p.cy).toBe(280-42*p.x[1]); expect(p.cluster).toBe(a.lloyd.labels[a.points.indexOf(p)]); }
    expect(a.inspector.find(r=>r.label.includes('current → proposed'))!.value).toBe('≈ 8 → ≈ 4');
    a.formulas.forEach(f=>expect(()=>render(h(Formula,f))).not.toThrow());
  });
  it('sizes plot labels and touch targets in physical CSS pixels without changing math', () => {
    for (const width of [250,320,560,1000]) { const a = deriveLab(initialLab('lloyd'),width); expect(a.fontSize*width/560).toBeGreaterThanOrEqual(14); expect(2*a.hitRadius*width/560).toBeGreaterThanOrEqual(44); expect(a.lloyd.objective).toBe(8); }
  });
  it('freezes/detaches the entire LabState trace, including fields outside Lloyd', () => {
    const s = initialLab('lloyd'), frames = labTrace(s,'lloyd');
    expect(Object.isFrozen(frames)).toBe(true); expect(Object.isFrozen(frames[0]!.state)).toBe(true); expect(Object.isFrozen(frames[0]!.state.lloyd.points[0]!.x)).toBe(true);
    expect(frames[0]!.state.lloyd.points).not.toBe(s.lloyd.points);
    expect(()=>{ (frames[0]!.state as {seed:number}).seed=999; }).toThrow(TypeError);
    const displayed = frames[2]!.state, edited = editCoordinate(displayed,'center',0,[-1.23456789,0]);
    expect(edited.lloyd.centers[1]).toEqual([2,0]); expect(edited.lloyd.phase).toBe('ready'); expect(edited.lloyd.labels).toBeNull(); expect(edited.seed).toBe(displayed.seed); expect(frames[2]!.state.lloyd.centers[0]).toEqual([-2,0]);
    expect(Object.isFrozen(labTrace(initialLab('alternatives'),'alternatives')[1]!.state)).toBe(true);
  });
  it('preserves exact editor coordinates and declares pointer snapping/bounds', () => {
    const s = initialLab('lloyd'), fine = editCoordinate(s,'center',0,[-1.23456789,.0001]);
    expect(fine.lloyd.centers[0]).toEqual([-1.23456789,.0001]);
    expect(pointerCoordinate(280+42*.1234,280-42*.876,{left:0,top:0,width:560,height:560})).toEqual([.1,.9]);
    expect(pointerCoordinate(2000,-100,{left:0,top:0,width:560,height:560})).toEqual([5,5]);
    expect(()=>pointerCoordinate(0,0,{left:0,top:0,width:0,height:0})).toThrow();
    expect(()=>editCoordinate(s,'center',0,[6,0])).toThrow();
    expect(()=>editCoordinate(s,'center',0,[0,1e-200])).toThrow(/underflow/);
    expect(()=>deriveLab({...s,lloyd:editLloyd(s.lloyd,{scales:[.01,1]})})).toThrow();
  });
  it('derives real dendrogram heights and supports all failure presets without invalid auxiliary parameters', () => {
    const a = deriveLab(initialLab('alternatives')); expect(a.branches.map(b=>b.height)).toEqual(a.hierarchy.merges.map(m=>m.height)); expect(a.groups).toHaveLength(5);
    for (const kind of ['empty','coincident','vertical','horizontal','density','border']) expect(()=>deriveLab(scenario(initialLab('failures'),kind))).not.toThrow();
  });
});
describe('complete chapters and accessible stages', () => {
  it('registers exact curriculum titles and real prerequisite IDs with opening interactions and literal raw source', () => {
    expect(manifest.part).toBe('p05'); expect(manifest.chapters).toHaveLength(3);
    for (const chapter of manifest.chapters) {
      const source = readFileSync(`src/parts/p05/chapters/${chapter.slug}.mdx`,'utf8');
      expect(source).toContain('chapterId: '+chapter.id); expect(source).toContain('title: '+plan.flatMap(p=>p.chapters).find(c=>c.id===chapter.id)!.title);
      expect(source.indexOf('<Stage ')).toBeLessThan(source.indexOf('## '));
      expect(source).toContain('clustering.py?raw'); expect(source).toContain('<CodeFile source={reference}');
      expect([...source.matchAll(/<ChoiceExercise /g)]).toHaveLength(5);
      const prerequisites = JSON.parse(source.match(/prerequisites: (\[[^\n]+\])/ )![1]!) as string[];
      prerequisites.forEach(id=>expect(inventory.chapters.some(c=>c.id===id)).toBe(true));
    }
  });
  it('authors strict MDX and math plus five single-correct feedback exercises per chapter', async () => {
    for (const chapter of manifest.chapters) {
      const source = readFileSync(`src/parts/p05/chapters/${chapter.slug}.mdx`,'utf8');
      await compile(source,{remarkPlugins:[remarkMath],rehypePlugins:[[rehypeKatex,{throwOnError:true,strict:'error'}]]});
      expect([...source.matchAll(/correct:true/g)]).toHaveLength(5); expect([...source.matchAll(/correct:false/g)]).toHaveLength(5); expect([...source.matchAll(/feedback:/g)]).toHaveLength(10);
    }
  });
  it('renders labeled scoped SVGs and visible observation handles in alternatives', () => {
    const html = render(h('div',null,h(Stage,{scope:'first',mode:'lloyd'}),h(Stage,{scope:'second',mode:'alternatives'})));
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]); expect(new Set(ids).size).toBe(ids.length);
    expect(html).toContain('data-proposed-objective="4"'); expect(html).toContain('data-selected-label'); expect(html).toContain('Observation 0;'); expect(html).not.toContain('Centroids (for comparison)'); expect(html).toContain('p05-border'); expect(html).toContain('p05-noise');
  });
});
