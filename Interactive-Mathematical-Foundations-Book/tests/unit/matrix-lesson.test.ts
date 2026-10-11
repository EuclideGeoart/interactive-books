import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { katexMacros } from '../../src/math/katex-macros.mjs';
import {
  MATRIX_CANONICAL, deriveMatrixLesson, matrixFields, matrixPresets, matrixSpecs, matrixWorkedFrames,
  type MatrixChapter,
} from '../../src/lessons/linear-algebra/matrix-lesson';
import { parseParam } from '../../src/platform/params';

const chapters = Object.keys(MATRIX_CANONICAL) as MatrixChapter[];
const render = (tex: string) => katex.renderToString(tex, { throwOnError: true, strict: 'error', macros: katexMacros() });

for (const chapter of chapters) describe(chapter + ': one matrix derivation feeds every view', () => {
  for (const preset of matrixPresets(chapter)) it(preset.id + ': formulas, exact readouts, and geometry remain valid', () => {
    const derived = deriveMatrixLesson(chapter, preset.state);
    derived.formulas.forEach(tex => expect(() => render(tex), tex).not.toThrow());
    for (const item of derived.rows) {
      expect(() => render(item.symbolTex)).not.toThrow();
      item.description.lines.forEach(line => expect(() => render(line.tex), line.tex).not.toThrow());
      expect(item.description.spoken).toBeTruthy();
    }
    if (derived.scene) {
      const points = [
        ...derived.scene.lines.flatMap(line => [line.from, line.to]),
        ...derived.scene.arrows.flatMap(arrow => [arrow.from, arrow.to]),
        ...derived.scene.polygons.flatMap(poly => poly.corners),
        ...derived.scene.points.map(item => item.at),
      ];
      points.forEach(point => expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true));
      expect(new Set(derived.scene.lines.map(line => line.name)).size).toBe(derived.scene.lines.length);
    }
    for (const field of matrixFields(chapter, preset.state)) expect(parseParam(matrixSpecs(chapter)[field], String(preset.state[field])).ok).toBe(true);
  });

  it('stores immutable canonical inputs in a semantic worked trace', () => {
    const frames = matrixWorkedFrames(chapter);
    expect(frames).toHaveLength(3);
    expect(Object.isFrozen(frames[0]!.state.inputs)).toBe(true);
    expect(frames[0]!.state.inputs).toEqual(MATRIX_CANONICAL[chapter]);
    frames.forEach(frame => { expect(frame.explanation).toBeTruthy(); expect(() => render(frame.state.formula)).not.toThrow(); });
  });
});

describe('canonical geometry and exact exceptional states', () => {
  it('matches independently worked output points', () => {
    expect(deriveMatrixLesson('transform', MATRIX_CANONICAL.transform).result).toEqual({ x: 3, y: 1 });
    expect(deriveMatrixLesson('matvec', MATRIX_CANONICAL.matvec).result).toEqual({ x: 6, y: 10 });
    expect(deriveMatrixLesson('composition', MATRIX_CANONICAL.composition).result).toEqual({ x: 3, y: 4 });
    expect(deriveMatrixLesson('orthogonality', MATRIX_CANONICAL.orthogonality).result).toEqual({ x: -1, y: 2 });
    expect(deriveMatrixLesson('systems', MATRIX_CANONICAL.systems).result).toEqual({ x: 2, y: 1 });
  });

  it('never lets rounded geometry redefine incompatibility, singularity, orthogonality, or system class', () => {
    const preset = (chapter: MatrixChapter, id: string) => matrixPresets(chapter).find(item => item.id === id)!.state;
    expect(deriveMatrixLesson('matvec', preset('matvec', 'invalid')).status).toBe('incompatible');
    expect(deriveMatrixLesson('composition', preset('composition', 'invalid')).status).toBe('incompatible');
    expect(deriveMatrixLesson('orthogonality', preset('orthogonality', 'shear')).status).toBe('not-orthogonal');
    expect(deriveMatrixLesson('determinant', preset('determinant', 'collapse')).status).toBe('singular');
    expect(deriveMatrixLesson('systems', preset('systems', 'parallel')).status).toBe('none');
    expect(deriveMatrixLesson('systems', preset('systems', 'coincident')).status).toBe('infinite');
  });
});
