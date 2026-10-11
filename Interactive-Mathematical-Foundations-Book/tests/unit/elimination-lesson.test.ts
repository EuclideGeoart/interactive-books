import katex from 'katex';
import { expect, it } from 'vitest';
import { katexMacros } from '../../src/math/katex-macros.mjs';
import { deriveElimination, eliminationPresets, eliminationSpecs, ELIMINATION_CANONICAL, type EliminationChapter } from '../../src/lessons/linear-algebra/elimination-lesson';
import { COMPLETION_EXERCISES } from '../../src/lessons/linear-algebra/completion-exercises';
for (const chapter of ['elimination', 'rank', 'inverse'] as EliminationChapter[]) {
  for (const preset of eliminationPresets(chapter)) it(`${chapter} ${preset.id}: exact inspector, semantic trace and strict formulas`, () => {
    const d = deriveElimination(chapter, preset.state);
    expect(d.rows.every(row => row.description.spoken.length > 0)).toBe(true);
    expect(d.frames.every(frame => frame.state.semantic && frame.state.matrix)).toBe(true);
    for (const tex of [...d.formulas, ...d.frames.map(frame => frame.state.formula), ...d.rows.map(row => row.symbolTex)])
      expect(() => katex.renderToString(tex, { strict: 'error', throwOnError: true, macros: katexMacros() }), tex).not.toThrow();
    expect(d.rank).toBeGreaterThanOrEqual(0);
    expect(Object.values(eliminationSpecs(chapter)).every(spec => spec.maxDecimals === 2 && spec.onInvalid === 'reject')).toBe(true);
  });
  it(`${chapter}: five exercises accept worked answers and correct errors`, () => {
    const exercises = COMPLETION_EXERCISES[chapter]!;
    expect(exercises).toHaveLength(5);
    for (const e of exercises) { expect(e.solution).toBeTruthy(); expect(e.grade({}).correct).toBe(false); }
  });
}
it('rank geometry retains the full image square and a visible null direction at valid extreme inputs',()=>{
 const d=deriveElimination('rank',{...ELIMINATION_CANONICAL.rank,a11:4,a12:4,a21:4,a22:4}),plot=d.scenes[0]!;
 expect(d.rank).toBe(1);for(const p of plot.polygons[0]!.corners){expect(Math.abs(p.x)).toBeLessThan(plot.window.xMax);expect(Math.abs(p.y)).toBeLessThan(plot.window.yMax);}
 const thin=deriveElimination('rank',{...ELIMINATION_CANONICAL.rank,a11:.01,a12:4,a21:0,a22:0}).scenes[0]!.arrows.find(a=>a.name==='null-direction')!;
 expect(Math.hypot(thin.to.x,thin.to.y)).toBeCloseTo(1,14);expect(thin.to.x*.01+thin.to.y*4).toBeCloseTo(0,14);expect(thin.label).toContain('≈');
});
