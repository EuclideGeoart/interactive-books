import {it,expect} from 'vitest';
import {chapterCatalog,makePlan} from '../../scripts/validation-plan.mjs';
it('Numerical stages and actual transitive dependencies retain chapter, oracle, unit, browser and screenshot ownership',()=>{
 const chapters=chapterCatalog().filter(c=>c.id.startsWith('VIII.'));expect(chapters).toHaveLength(10);chapters.forEach(c=>{expect(c.family).toMatch(/^numerical_/);expect(c.kind).toBeTruthy();});
 for(const file of ['src/math/numerical-computing/floating.ts','src/lessons/numerical-computing/numbers-lesson.ts','oracle/numerical_floating_oracle.py','fixtures/numerical_floating.fixtures.json']){const p=makePlan({files:[file]});expect(p.conservativeExpansion).toBe(false);expect(p.chapters).toEqual(expect.arrayContaining(['VIII.1','VIII.2','VIII.3','VIII.4']));expect(p.oracles).toContain('numerical_floating');}
 expect(makePlan({files:['tests/e2e/__screenshots__/visual-numerical-computing.spec.ts/mobile-viii-catastrophic-cancellation.png']}).chapters).toEqual(['VIII.4']);
 expect(makePlan({files:['src/math/numerical-computing/deleted.ts']}).conservativeExpansion).toBe(true);
});

it('shared Python reference and oracle imports reach all actual consumers',()=>{const p=makePlan({files:['code/python/floating_point_representation.py']});expect(p.conservativeExpansion).toBe(false);expect(p.chapters.slice().sort()).toEqual(['VIII.1','VIII.2','VIII.5','VIII.6']);expect(p.oracles).toEqual(['numerical_algorithms','numerical_floating']);const oracle=makePlan({files:['oracle/numerical_floating_oracle.py']});expect(oracle.chapters).toEqual(expect.arrayContaining(['VIII.1','VIII.6','VIII.7']));expect(oracle.oracles).toEqual(['numerical_algorithms','numerical_floating']);});

it('structure families retain actual sparse/tensor/replay consumers and all new screenshot owners',()=>{
 for(const file of ['src/math/numerical-computing/sparse.ts','src/math/numerical-computing/tensors.ts','src/math/numerical-computing/reproducibility.ts','src/lessons/numerical-computing/StructureStage.tsx','oracle/numerical_structure_oracle.py','fixtures/numerical_structure.fixtures.json','tests/unit/numerical-structure.parity.test.ts']){
  const p=makePlan({files:[file]});expect(p.conservativeExpansion,file).toBe(false);expect(p.chapters.slice().sort(),file).toEqual(['VIII.8','VIII.9','VIII.10'].sort());expect(p.oracles).toContain('numerical_structure');expect(p.units).toContain('tests/unit/numerical-structure.parity.test.ts');expect(p.commands.some(c=>c.command.includes('tests/e2e/numerical-computing.spec.ts'))).toBe(true);
 }
 for(const [slug,id] of [['sparse-matrices-structure','VIII.8'],['vectorized-computation','VIII.9'],['reproducibility-random-seeds','VIII.10']])expect(makePlan({files:[`tests/e2e/__screenshots__/visual-numerical-computing.spec.ts/mobile-viii-${slug}-failure.png`]}).chapters).toEqual([id]);
 const sample=makePlan({files:['code/python/vectorized_computation.py']});expect(sample.chapters).toEqual(['VIII.9']);expect(sample.conservativeExpansion).toBe(false);
 const visual=makePlan({files:['tests/e2e/visual-numerical-computing.spec.ts']});expect(visual.chapters).toHaveLength(10);expect(visual.conservativeExpansion).toBe(false);
 expect(makePlan({files:['src/math/numerical-computing/unowned-new-input.ts']}).conservativeExpansion).toBe(true);
});
