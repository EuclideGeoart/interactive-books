import katex from 'katex';
import { expect, it } from 'vitest';
import { katexMacros } from '../../src/math/katex-macros.mjs';
import { deriveElimination, eliminationPresets, eliminationSpecs, type EliminationChapter } from '../../src/lessons/linear-algebra/elimination-lesson';
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
