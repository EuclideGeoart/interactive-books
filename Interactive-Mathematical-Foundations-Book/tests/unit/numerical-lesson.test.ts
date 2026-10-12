import katex from 'katex';
import {describe,it,expect} from 'vitest';
import {INITIAL,PRESETS,deriveNumbers} from '../../src/lessons/numerical-computing/numbers-lesson';
import {katexMacros} from '../../src/math/katex-macros.mjs';
describe('numerical lesson identity and immutable replay',()=>{
 for(const chapter of Object.keys(INITIAL) as (keyof typeof INITIAL)[])for(const p of PRESETS[chapter])it(`${chapter} ${p.id}: every formula renders and snapshots retain actual values`,()=>{
  const v=deriveNumbers(p.state,chapter);expect(v.description.length).toBeGreaterThan(60);expect(v.frames.length).toBeGreaterThanOrEqual(2);
  for(const tex of [...v.formulas,...v.rows.map(r=>r.symbolTex),...v.frames.map(f=>f.state.formula)])expect(()=>katex.renderToString(tex,{throwOnError:true,strict:'error',macros:katexMacros()})).not.toThrow();
  expect(Object.isFrozen(v.frames)).toBe(true);expect(Object.isFrozen(v.frames[0]!.state.semantic)).toBe(true);
  if(v.bits)expect(v.bits.map(b=>b.digits).join('')).toBe(v.metrics.bits);
 });
 it('rounding displays and bits use the computed sum, while exceptional states stay explicit',()=>{
  const v=deriveNumbers(INITIAL.rounding,'rounding');expect(v.metrics.exact).toBe('1351079888211149/4503599627370496');expect(v.rows.find(r=>r.id==='exact')!.description.lines[0]!.text).toBe(v.metrics.exact);
  expect(deriveNumbers(PRESETS.representation.find(p=>p.id==='negative-zero')!.state,'representation').metrics.display).toBe('−0');
  expect(deriveNumbers(PRESETS.conditioning.find(p=>p.id==='pole')!.state,'conditioning').rows.find(r=>r.id==='reference')!.description.status).toBe('undefined');
 });
});

it('manual bit edits are explicitly distinguished from direct decimal rounding',()=>{const state={...INITIAL.representation,bits:'1010101101100110'};const v=deriveNumbers(state,'representation');expect(v.description).toContain('Manually edited bits');expect(v.metrics.bits).toBe(state.bits);});

import {STABLE_PRESETS,SOLVER_PRESETS,deriveStable,deriveSolver} from '../../src/lessons/numerical-computing/algorithms-lesson';
for(const [name,presets,derive]of [['stable',STABLE_PRESETS,deriveStable],['solver',SOLVER_PRESETS,deriveSolver]] as const)for(const p of presets)it(`${name} ${p.id}: exact records feed all views and every formula renders`,()=>{const v=(derive as any)(p.state);expect(v.frames.length).toBeGreaterThanOrEqual(2);for(const tex of [...v.formulas,...v.rows.map((r:any)=>r.symbolTex)])expect(()=>katex.renderToString(tex,{throwOnError:true,strict:'error',macros:katexMacros()})).not.toThrow();expect(Object.isFrozen(v.frames[0].state.semantic)).toBe(true);});
it('a missing independent live softmax reference is never called undefined mathematics',()=>{const v=deriveStable(STABLE_PRESETS.find(p=>p.id==='tail')!.state);expect(v.rows.some(r=>r.id==='reference'&&r.description.status==='undefined')).toBe(false);expect(v.description).toContain('defined and finite');});

import {SPARSE_PRESETS,TENSOR_PRESETS,REPRO_PRESETS,deriveSparse,deriveTensor,deriveRepro} from '../../src/lessons/numerical-computing/structure-lesson';
for(const [name,presets,derive]of [['sparse',SPARSE_PRESETS,deriveSparse],['broadcasting',TENSOR_PRESETS,deriveTensor],['reproducibility',REPRO_PRESETS,deriveRepro]] as const)for(const p of presets)it(`${name} ${p.id}: model-built scene, formulas and actual replay are consistent`,()=>{const v=(derive as any)(p.state);expect(v.frames.length).toBeGreaterThanOrEqual(2);for(const tex of [...v.formulas,...v.rows.map((r:any)=>r.symbolTex)])expect(()=>katex.renderToString(tex,{throwOnError:true,strict:'error',macros:katexMacros()})).not.toThrow();expect(Object.isFrozen(v.frames[0].state.semantic)).toBe(true);if(v.grid)expect(v.grid.cells.map((c:any)=>c.value)).toEqual(v.metrics.dense.flat());});
