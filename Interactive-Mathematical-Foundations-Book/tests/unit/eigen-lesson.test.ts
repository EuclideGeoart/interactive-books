import katex from 'katex';
import {expect,it} from 'vitest';
import {deriveEigen,eigenPresets} from '../../src/lessons/linear-algebra/eigen-lesson';
import {katexMacros} from '../../src/math/katex-macros.mjs';
for(const p of eigenPresets)it(`eigen ${p.id}: strict formulas and actual repeated-vector states`,()=>{
 const d=deriveEigen(p.state);for(const t of [...d.formulas,...d.frames.map(f=>f.state.formula),...d.rows.map(r=>r.symbolTex)])expect(()=>katex.renderToString(t,{strict:'error',throwOnError:true,macros:katexMacros()}),t).not.toThrow();
 expect(d.frames.length).toBe(7);expect(d.frames.every(f=>f.state.semantic)).toBe(true);
 if(p.id==='rotation')expect(d.scenes[0]!.lines).toHaveLength(0);
 if(p.id==='defective')expect(d.scenes[0]!.lines).toHaveLength(1);
 if(p.id==='zero-vector')expect(d.rows.find(r=>r.id==='input-eigenvalue')!.description.status).toBe('undefined');
});
