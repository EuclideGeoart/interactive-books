import katex from 'katex';
import {expect,it} from 'vitest';
import {deriveLeastSquares,leastSquaresPresets} from '../../src/lessons/linear-algebra/least-squares-lesson';
import {katexMacros} from '../../src/math/katex-macros.mjs';
for(const p of leastSquaresPresets)it(`least squares ${p.id}: synchronized geometry, semantic projection and strict formulas`,()=>{
 const d=deriveLeastSquares(p.state);for(const t of [...d.formulas,...d.frames.map(f=>f.state.formula),...d.rows.map(r=>r.symbolTex)])expect(()=>katex.renderToString(t,{strict:'error',throwOnError:true,macros:katexMacros()}),t).not.toThrow();
 expect(d.frames.every(f=>f.state.semantic)).toBe(true);expect(d.scenes[0]!.handles.length).toBe(p.state.mode==='fit'?3:2);
 if(p.id==='dependent'||p.id==='zero-vector')expect(d.verdict).toContain('cannot be normalized');
});
