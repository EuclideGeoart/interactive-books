import {it,expect} from 'vitest';
import {chapterCatalog,makePlan} from '../../scripts/validation-plan.mjs';
it('Numerical stages and actual transitive dependencies retain chapter, oracle, unit, browser and screenshot ownership',()=>{
 const chapters=chapterCatalog().filter(c=>c.id.startsWith('VIII.'));expect(chapters.length).toBeGreaterThanOrEqual(4);chapters.forEach(c=>{expect(c.family).toMatch(/^numerical_/);expect(c.kind).toBeTruthy();});
 for(const file of ['src/math/numerical-computing/floating.ts','src/lessons/numerical-computing/numbers-lesson.ts','oracle/numerical_floating_oracle.py','fixtures/numerical_floating.fixtures.json']){const p=makePlan({files:[file]});expect(p.conservativeExpansion).toBe(false);expect(p.chapters).toEqual(expect.arrayContaining(['VIII.1','VIII.2','VIII.3','VIII.4']));expect(p.oracles).toContain('numerical_floating');}
 expect(makePlan({files:['tests/e2e/__screenshots__/visual-numerical-computing.spec.ts/mobile-viii-catastrophic-cancellation.png']}).chapters).toEqual(['VIII.4']);
 expect(makePlan({files:['src/math/numerical-computing/deleted.ts']}).conservativeExpansion).toBe(true);
});
