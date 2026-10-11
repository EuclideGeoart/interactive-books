import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { katexMacros } from '../../src/math/katex-macros.mjs';
import { CANONICAL, deriveLesson, fields, presets, specs, workedFrames, type Chapter } from '../../src/lessons/linear-algebra/chapter-lesson';
import { EXERCISES } from '../../src/lessons/linear-algebra/exercises';
import { parseParam } from '../../src/platform/params';

const chapters = Object.keys(CANONICAL) as Chapter[];
const render = (tex: string) => katex.renderToString(tex, { throwOnError: true, strict: 'error', macros: katexMacros() });
for (const chapter of chapters) describe(`${chapter}: one derived object feeds every view`, () => {
  for (const preset of presets(chapter)) it(`${preset.id}: formulas, scoped states and geometry remain valid`, () => {
    const d = deriveLesson(chapter, preset.state);
    d.formulas.forEach(tex => expect(() => render(tex), tex).not.toThrow());
    for (const r of d.rows) {
      expect(() => render(r.symbolTex)).not.toThrow();
      for (const l of r.description.lines) expect(() => render(l.tex)).not.toThrow();
      expect(r.description.spoken).toBeTruthy();
      if (r.description.status === 'undefined') expect(r.description.note).toBeTruthy();
    }
    const points = [...d.scene.arrows.flatMap(a => [a.from, a.to]), ...d.scene.lines.flatMap(l => [l.from, l.to]), ...d.scene.polygons.flatMap(p => p.corners)];
    for (const p of points) { expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true); expect(Math.abs(p.x)).toBeLessThan(d.scene.window.xMax); expect(Math.abs(p.y)).toBeLessThan(d.scene.window.yMax); }
    const names = d.scene.arrows.map(a => a.name); expect(new Set(names).size).toBe(names.length);
    for (const f of fields(chapter)) expect(parseParam(specs(chapter)[f], String(preset.state[f])).ok).toBe(true);
  });
  it('immutable traces store the inputs, derivations and explanation', () => {
    const frames = workedFrames(chapter);
    expect(frames.length).toBeGreaterThanOrEqual(2);
    expect(Object.isFrozen(frames[0]!.state.inputs)).toBe(true);
    expect(frames[0]!.state.inputs).toEqual(CANONICAL[chapter]);
    for (const f of frames) { expect(() => render(f.state.formula)).not.toThrow(); expect(f.explanation).toBeTruthy(); }
  });
  it('sweeps decimal states through strict formulas', () => {
    for (let i = -4; i <= 4; i++) {
      const d = deriveLesson(chapter, { ...CANONICAL[chapter], ux: i, uy: 0.1, vx: -0.2, vy: i, a: i / 2, b: -i / 2 });
      d.formulas.forEach(tex => expect(() => render(tex)).not.toThrow());
    }
  });
});

describe('world results independently worked from components', () => {
  const result = (chapter: Chapter) => deriveLesson(chapter, CANONICAL[chapter]).result;
  it('arithmetic, scaling, unit vector, projection and weighted sum endpoints agree', () => {
    expect(result('addition')).toEqual({ x: 3, y: 3 });
    expect(result('scaling')).toEqual({ x: -4.5, y: -3 });
    expect(result('norms')).toEqual({ x: 0.6, y: 0.8 });
    expect(result('projection')).toEqual({ x: 2, y: 1 });
    expect(result('span')).toEqual({ x: 1.5, y: 0 });
    expect(result('basis')).toEqual({ x: 3, y: 0 });
  });
  it('collapsed span geometry is a segment or point, never a decorative plane', () => {
    const line = deriveLesson('span', { ...CANONICAL.span, ux: 1, uy: 1, vx: 2, vy: 2 });
    expect(line.scene.polygons).toHaveLength(0); expect(line.rank).toBe(1);
    const reach = line.scene.lines.find(l => l.name === 'reachable-line')!;
    expect(reach.from).toEqual({ x: -6, y: -6 }); expect(reach.to).toEqual({ x: 6, y: 6 });
    const zero = deriveLesson('span', { ...CANONICAL.span, ux: 0, uy: 0, vx: 0, vy: 0 });
    expect(zero.scene.polygons).toHaveLength(0); expect(zero.rank).toBe(0); expect(zero.result).toEqual({ x: 0, y: 0 });
  });
  it('singular basis coordinates, zero normalization and zero direction remain explicitly undefined', () => {
    for (const [chapter, state, id] of [
      ['basis', { ...CANONICAL.basis, ux: 1, uy: 1, vx: 2, vy: 2 }, 'a'],
      ['norms', { ...CANONICAL.norms, vx: 0, vy: 0 }, 'unit'],
      ['projection', { ...CANONICAL.projection, ux: 0, uy: 0 }, 'projection'],
      ['dot', { ...CANONICAL.dot, vx: 0, vy: 0 }, 'angle'],
    ] as const) expect(deriveLesson(chapter, state).rows.find(r => r.id === id)!.description.status).toBe('undefined');
  });
});

const answers: Record<string, readonly string[]> = {
  'add-sum': ['2', '2'], 'add-difference': ['-4', '6'], 'add-missing': ['3', '-4'],
  'scale-value': ['-6', '2'], 'scale-length': ['7.5'], 'scale-missing': ['-0.5'],
  'norm-length': ['5', '7', '4'], 'norm-unit': ['-3/5', '4/5'], 'norm-construct': ['4/5'],
  'dot-value': ['2'], 'dot-cancel': ['0'], 'dot-construct': ['-2'],
  'proj-vector': ['2', '1'], 'proj-residual': ['-1', '2'], 'proj-construct': ['-1'],
  'span-combine': ['1.5', '0'], 'span-redundant': ['1', '2'], 'span-construct': ['-1', '3'],
  'basis-coordinates': ['2', '-1'], 'basis-det': ['0'], 'basis-target': ['0', '3'],
};
for (const exercise of Object.values(EXERCISES).flat()) it(`${exercise.id}: accepts worked answer and rejects a misconception and missing input`, () => {
  const answer = exercise.choices ? { choice: exercise.choices[0]!.id } : Object.fromEntries(answers[exercise.id]!.map((a, i) => [`n${i}`, a]));
  expect(exercise.grade(answer).correct).toBe(true);
  const wrong = exercise.choices ? { choice: exercise.choices[1]!.id } : Object.fromEntries(exercise.fields!.map(f => [f.id, '999']));
  expect(exercise.grade(wrong).correct).toBe(false); expect(exercise.grade(wrong).message).toBeTruthy();
  expect(exercise.grade({}).correct).toBe(false); expect(exercise.solution).toBeTruthy();
});
