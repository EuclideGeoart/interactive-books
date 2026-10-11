import katex from 'katex';
import {expect,it} from 'vitest';
import {deriveSVD,svdPresets} from '../../src/lessons/linear-algebra/svd-lesson';
import {katexMacros} from '../../src/math/katex-macros.mjs';
for(const p of svdPresets)it(`SVD ${p.id}: strict formulas, four honest geometric stages and replay states`,()=>{
 const d=deriveSVD(p.state);for(const t of [...d.formulas,...d.frames.map(f=>f.state.formula),...d.rows.map(r=>r.symbolTex)])expect(()=>katex.renderToString(t,{strict:'error',throwOnError:true,macros:katexMacros()}),t).not.toThrow();
 expect(d.scenes).toHaveLength(4);expect(d.frames).toHaveLength(7);expect(d.frames.every(f=>f.state.semantic)).toBe(true);expect(Object.isFrozen(d.frames[0]!.state.semantic)).toBe(true);
 expect(new Set(d.scenes.map(s=>s.window.xMax)).size).toBe(1);
 if(p.id==='zero'){expect(d.rank).toBe(0);expect(d.verdict).toContain('origin');}
 if(p.id==='rank-one'){expect(d.rank).toBe(1);expect(d.verdict).toContain('segment');}
 if(p.id==='repeated')expect(d.verdict).toContain('not mathematically unique');
 if(p.id==='near'){expect(d.rank).toBe(2);expect(d.verdict).toContain('Ill-conditioned');}
});
