/**
 * The I.9 view layer: every string the stages render is built from the models, so this file checks that
 *  - every LaTeX string survives strict KaTeX on the EDGE states (invalid indices, mismatched shapes, zero vectors, undefined expectations),
 *  - the diagram marks exactly the entry the model selected (and nothing at all when an index is invalid),
 *  - presets say what their labels say,
 *  - the verdicts keep the distinctions the chapter teaches (min / arg min / np.argmin, = against ≈, undefined with a reason).
 */
import { describe, expect, it } from 'vitest';
import { renderTex } from '../../src/platform/tex';
import { DIM_MAX } from '../../src/math/notation/shapes';
import {
  CANONICAL_SHAPE, SHAPE_PRESETS, axisLegend, deriveShapeLesson, diagramDescription, diagramOf, shapeCode, shapeFormulas, shapePresetMatches, shapeRows, shapeSpoken, shapeVerdict,
  type ShapeLessonState,
} from '../../src/lessons/notation/shape-lesson';
import {
  ALGEBRA_PRESETS, CANONICAL_ALGEBRA, algebraCode, algebraDescription, algebraFormulas, algebraPresetMatches, algebraRows, algebraSpoken, algebraVerdict, boxesOf, deriveAlgebraLesson,
  type AlgebraLessonState,
} from '../../src/lessons/notation/algebra-lesson';
import {
  CANONICAL_NORM, NORM_PRESETS, deriveNormLesson, normChainTex, normCode, normFormulas, normPlaneLabel, normPresetMatches, normRows, normScene, normSpoken, normVerdict,
  type NormLessonState,
} from '../../src/lessons/notation/norm-lesson';
import {
  ARGMIN_PRESETS, CANONICAL_ARGMIN, argminCode, argminFormulas, argminPresetMatches, argminRows, argminSpoken, argminVerdict, deriveArgminLesson, lossTex, setText,
  type ArgminLessonState,
} from '../../src/lessons/notation/argmin-lesson';
import {
  CANONICAL_EXPECT, EXPECT_PRESETS, deriveExpectLesson, expectCode, expectFormulas, expectPresetMatches, expectRows, expectSpoken, expectTable, expectVerdict, visibleCounts,
  type ExpectLessonState,
} from '../../src/lessons/notation/expect-lesson';
import {
  CANONICAL_GRADIENT, GRADIENT_PRESETS, deriveGradientLesson, gradientCode, gradientFormulas, gradientPresetMatches, gradientRows, gradientSpoken, gradientVerdict,
  type GradientLessonState,
} from '../../src/lessons/notation/gradient-lesson';

const tex = (s: string) => expect(() => renderTex(s, true), s).not.toThrow();
const rowTex = (rows: { symbolTex: string; description: { lines: readonly { tex: string }[] } }[]) => {
  for (const r of rows) { tex(r.symbolTex); for (const l of r.description.lines) tex(l.tex); }
};

// ------------------------------------------------------------------------------------------------ shape
describe('the shape views', () => {
  const kinds = ['scalar', 'vector', 'matrix', 'tensor'] as const;
  it('renders every string with strict KaTeX over kinds, dimensions and indices, valid or not', () => {
    for (const kind of kinds) {
      for (const n of [1, 3, DIM_MAX]) for (const d of [1, 4]) for (const i of [0, 1, 3, 9]) for (const j of [1, 2, 9]) {
        const s: ShapeLessonState = { kind, n, d, B: 2, T: n, i, j, k: j };
        const l = deriveShapeLesson(s);
        rowTex(shapeRows(l));
        for (const f of shapeFormulas(l)) tex(f.tex);
        expect(shapeCode(l).length).toBeGreaterThan(0);
        expect(shapeVerdict(l).text.length).toBeGreaterThan(0);
        expect(shapeSpoken(l).length).toBeGreaterThan(0);
        expect(diagramDescription(l).length).toBeGreaterThan(0);
      }
    }
  });
  it('marks exactly the selected entry, at the position the model computed, and nothing when an index is invalid', () => {
    for (const kind of ['vector', 'matrix', 'tensor'] as const) {
      for (const n of [1, 2, 4]) for (const d of [1, 3]) for (const i of [0, 1, 2, 5]) for (const j of [1, 2, 4]) {
        const s: ShapeLessonState = { kind, n, d, B: n, T: 3, i, j, k: Math.min(j, 2) };
        const l = deriveShapeLesson(s);
        const cells = diagramOf(l).flatMap(slab => slab.cells);
        const selected = cells.filter(c => c.mark === 'selected');
        expect(cells.length, JSON.stringify(s)).toBe(l.d.count);
        expect(new Set(cells.map(c => c.offset)).size).toBe(cells.length);
        if (l.d.selection?.valid) {
          expect(selected.map(c => c.offset), JSON.stringify(s)).toEqual([l.d.selection.offset]);
        } else {
          expect(selected).toHaveLength(0);
          expect(cells.filter(c => c.mark === 'related')).toHaveLength(0);
        }
      }
    }
  });
  it('draws a vector as one column, a matrix as n rows by d columns and a tensor as B slabs of T by d', () => {
    const v = diagramOf(deriveShapeLesson({ ...CANONICAL_SHAPE, kind: 'vector', d: 5, j: 2 }));
    expect(v).toHaveLength(1);
    expect([v[0]!.rows, v[0]!.cols]).toEqual([5, 1]);
    const m = diagramOf(deriveShapeLesson(CANONICAL_SHAPE));
    expect([m[0]!.rows, m[0]!.cols]).toEqual([4, 3]);
    const t = diagramOf(deriveShapeLesson({ ...CANONICAL_SHAPE, kind: 'tensor', B: 3, T: 2, d: 4, i: 1, j: 1, k: 1 }));
    expect(t).toHaveLength(3);
    expect(t.every(slab => slab.rows === 2 && slab.cols === 4)).toBe(true);
    expect(t[2]!.cells[0]!.offset).toBe(16);
  });
  it('tints the row and column of the selected matrix entry', () => {
    const cells = diagramOf(deriveShapeLesson(CANONICAL_SHAPE))[0]!.cells;
    const related = cells.filter(c => c.mark === 'related').map(c => c.offset).sort((a, b) => a - b);
    // row 2 is positions 3, 4, 5 (3 is related, 5 is selected); column 3 is positions 2, 5, 8, 11
    expect(related).toEqual([2, 3, 4, 8, 11]);
  });
  it('has presets that do what their labels say', () => {
    const by = (id: string) => deriveShapeLesson(SHAPE_PRESETS.find(p => p.id === id)!.state);
    expect(by('data-matrix').d.shapeTuple).toBe('(4, 3)');
    expect(by('data-matrix').d.selection?.offset).toBe(5);
    expect(by('one-example').d.shapeTuple).toBe('(5,)');
    expect(by('batch').d.shapeTuple).toBe('(2, 3, 4)');
    expect(by('batch').d.selection?.offset).toBe(23);
    expect(by('wide').d.shapeTuple).toBe('(2, 6)');
    expect(by('wide').d.selection?.offset).toBe(11);
    expect(by('beyond').d.selection?.valid).toBe(false);
    expect(by('zero').d.selection?.valid).toBe(false);
    expect(by('scalar').d.selection).toBeNull();
    expect(SHAPE_PRESETS.filter(p => shapePresetMatches(CANONICAL_SHAPE, p)).map(p => p.id)).toEqual(['data-matrix']);
  });
  it('rejects instead of clamping: an invalid index gives an undefined row with the reason and a caution verdict', () => {
    const l = deriveShapeLesson({ ...CANONICAL_SHAPE, i: 5 });
    const row = shapeRows(l).find(r => r.id === 'element')!;
    expect(row.description.status).toBe('undefined');
    expect(row.description.note).toMatch(/i = 5 is outside 1 … 4/);
    expect(shapeRows(l).some(r => r.id === 'numpy' || r.id === 'offset')).toBe(false);
    const v = shapeVerdict(l);
    expect(v.caution).toBe(true);
    expect(v.text).toMatch(/IndexError/);
    expect(shapeCode(l)).toMatch(/IndexError: index 4 is out of bounds for axis 0 with size 4/);
  });
  it('explains that index 0 is a NumPy habit: it is not a mathematical index, and X[-1] silently returns the last entry', () => {
    const l = deriveShapeLesson({ ...CANONICAL_SHAPE, i: 0 });
    expect(shapeRows(l).find(r => r.id === 'element')!.description.status).toBe('undefined');
    expect(shapeVerdict(l).text).toMatch(/start at 1/);
    expect(shapeVerdict(l).text).toMatch(/silently return the LAST entry/);
    expect(shapeCode(l)).toMatch(/does NOT fail/);
  });
  it('says both names of the entry and the shift by one', () => {
    const l = deriveShapeLesson(CANONICAL_SHAPE);
    const rows = shapeRows(l);
    expect(rows.find(r => r.id === 'element')!.description.lines[0]!.text).toBe('X₂,₃');
    expect(rows.find(r => r.id === 'numpy')!.description.lines[0]!.text).toBe('X[1, 2]');
    expect(rows.find(r => r.id === 'offset')!.description.lines[0]!.text).toBe('1 * 3 + 2 = 5');
    expect(rows.find(r => r.id === 'shape')!.description.lines[0]!.text).toBe('(4, 3)');
    expect(rows.find(r => r.id === 'slice-row')!.description.lines[0]!.text).toBe('X[1, :]');
    expect(rows.find(r => r.id === 'slice-column')!.description.lines[0]!.text).toBe('X[:, 2]');
    expect(shapeCode(l)).toContain('X = np.arange(12).reshape(4, 3)');
    expect(shapeCode(l)).toContain('X[1, 2]');
    expect(shapeVerdict(l).text).toMatch(/subtract 1 from every index/);
  });
  it('lists the strides that explain the position', () => {
    const legend = axisLegend(deriveShapeLesson({ ...CANONICAL_SHAPE, kind: 'tensor', B: 2, T: 3, d: 4, i: 2, j: 3, k: 4 }));
    expect(legend.map(a => a.stride)).toEqual([12, 4, 1]);
    expect(legend.map(a => a.symbol)).toEqual(['B', 'T', 'd']);
  });
  it('says the vector is a column while NumPy shows a flat array', () => {
    const l = deriveShapeLesson({ ...CANONICAL_SHAPE, kind: 'vector', d: 5, j: 2 });
    expect(shapeVerdict(l).text).toMatch(/neither a row nor a column/);
    expect(diagramDescription(l)).toMatch(/column of 5 cells/);
  });
});

// ------------------------------------------------------------------------------------------------ algebra
describe('the shape-rule views', () => {
  const ops = ['matvec', 'matmul', 'transpose', 'gram'] as const;
  it('renders every string with strict KaTeX, fitting or not', () => {
    for (const op of ops) for (const n of [1, 4]) for (const d of [1, 3]) for (const p of [1, 3, 4]) for (const q of [1, 2]) {
      const s: AlgebraLessonState = { op, n, d, p, q };
      const l = deriveAlgebraLesson(s);
      rowTex(algebraRows(l));
      for (const f of algebraFormulas(l)) tex(f.tex);
      expect(algebraCode(l)).toMatch(/^import numpy as np/);
      expect(algebraVerdict(l).text.length).toBeGreaterThan(0);
      expect(algebraSpoken(l).length).toBeGreaterThan(0);
      expect(algebraDescription(l).length).toBeGreaterThan(0);
    }
  });
  it('draws a result exactly when the product exists, with the outer dimensions', () => {
    for (const op of ops) for (const n of [1, 4]) for (const d of [1, 3]) for (const p of [1, 3]) for (const q of [1, 2]) {
      const l = deriveAlgebraLesson({ op, n, d, p, q });
      const boxes = boxesOf(l);
      const result = boxes.find(b => b.id === 'result');
      expect(Boolean(result), JSON.stringify({ op, n, d, p, q })).toBe(l.d.valid);
      if (result) expect(result.rows * 1000 + result.cols).toBe(l.d.result![0]! * 1000 + (l.d.result![1] ?? 1));
      if (!l.d.valid) expect(boxes.find(b => b.id === 'right')!.valid).toBe(false);
    }
  });
  it('has presets that do what their labels say', () => {
    const by = (id: string) => deriveAlgebraLesson(ALGEBRA_PRESETS.find(p => p.id === id)!.state);
    expect(by('fits').d.resultTuple).toBe('(4,)');
    expect(by('mismatch').d.valid).toBe(false);
    expect(by('matrix').d.resultTuple).toBe('(4, 2)');
    expect(by('matrix-mismatch').d.valid).toBe(false);
    expect(by('gram').d.resultTuple).toBe('(3, 3)');
    expect(by('transpose').d.resultTuple).toBe('(3, 4)');
    expect(ALGEBRA_PRESETS.filter(p => algebraPresetMatches(CANONICAL_ALGEBRA, p)).map(p => p.id)).toEqual(['fits']);
  });
  it('reports a mismatch as undefined with the reason, and says NumPy raises', () => {
    const l = deriveAlgebraLesson({ ...CANONICAL_ALGEBRA, p: 4 });
    const result = algebraRows(l).find(r => r.id === 'result')!;
    expect(result.description.status).toBe('undefined');
    expect(result.description.note).toMatch(/3 ≠ 4/);
    expect(algebraRows(l).find(r => r.id === 'inner')!.description.status).toBe('undefined');
    expect(algebraCode(l)).toMatch(/ValueError: the inner dimensions differ \(3 and 4\)/);
    expect(algebraVerdict(l).caution).toBe(true);
    expect(algebraDescription(l)).toMatch(/without a result/);
  });
  it('writes the Python of each product', () => {
    expect(algebraCode(deriveAlgebraLesson(CANONICAL_ALGEBRA))).toContain('X @ w          # shape (4,)');
    expect(algebraCode(deriveAlgebraLesson({ ...CANONICAL_ALGEBRA, op: 'gram' }))).toContain('X.T @ X');
    expect(algebraCode(deriveAlgebraLesson({ ...CANONICAL_ALGEBRA, op: 'transpose' }))).toContain('X.T            # shape (3, 4)');
  });
});

// ------------------------------------------------------------------------------------------------ norms
describe('the norm views', () => {
  const grid: number[] = [];
  for (let v = -4; v <= 4; v += 0.5) grid.push(v);
  it('renders every string with strict KaTeX over the whole grid of vectors and all three norms', () => {
    for (const x1 of grid) for (const x2 of grid) for (const norm of ['1', '2', 'inf'] as const) {
      const l = deriveNormLesson({ x1, x2, norm });
      rowTex(normRows(l));
      for (const f of normFormulas(l)) tex(f.tex);
      tex(normChainTex(l));
      expect(normVerdict(l).text.length).toBeGreaterThan(0);
      expect(normSpoken(l)).toMatch(/one-norm/);
      expect(normPlaneLabel(l).length).toBeGreaterThan(0);
      expect(normCode(l)).toMatch(/np.linalg.norm/);
    }
  });
  it('puts the vector on the boundary of the drawn ball, for every grid vector and norm', () => {
    for (const x1 of grid) for (const x2 of grid) for (const norm of ['1', '2', 'inf'] as const) {
      const l = deriveNormLesson({ x1, x2, norm });
      const scene = normScene(l);
      if (l.n.zero) { expect(scene.ball).toBeNull(); continue; }
      const r = scene.ball!.radius;
      const measure = norm === '1' ? Math.abs(x1) + Math.abs(x2) : norm === '2' ? Math.hypot(x1, x2) : Math.max(Math.abs(x1), Math.abs(x2));
      expect(r).toBeCloseTo(measure, 12);
      // every drawn point of the ball has the same norm: the radius
      for (const p of scene.ball!.points) {
        const m = norm === '1' ? Math.abs(p.x) + Math.abs(p.y) : norm === '2' ? Math.hypot(p.x, p.y) : Math.max(Math.abs(p.x), Math.abs(p.y));
        expect(m).toBeCloseTo(r, 9);
      }
    }
  });
  it('draws the three unit balls with norm 1', () => {
    const scene = normScene(deriveNormLesson(CANONICAL_NORM));
    expect(scene.unit.map(u => u.norm)).toEqual(['1', '2', 'inf']);
    for (const u of scene.unit) for (const p of u.points) {
      const m = u.norm === '1' ? Math.abs(p.x) + Math.abs(p.y) : u.norm === '2' ? Math.hypot(p.x, p.y) : Math.max(Math.abs(p.x), Math.abs(p.y));
      expect(m).toBeCloseTo(1, 12);
    }
  });
  it('has presets that do what their labels say', () => {
    const by = (id: string) => deriveNormLesson(NORM_PRESETS.find(p => p.id === id)!.state);
    const lines = (id: string) => Object.fromEntries(normRows(by(id)).map(r => [r.id, r.description.lines.map(l => `${l.relation} ${l.text}`)]));
    expect(lines('three-four')).toMatchObject({ l1: ['= 7'], l2: ['= 5'], linf: ['= 4'], l2sq: ['= 25'] });
    expect(lines('diagonal').l2![0]).toBe('= √2');
    expect(lines('diagonal').l2![1]).toMatch(/^≈ 1\.414214…$/);
    expect(lines('axis')).toMatchObject({ l1: ['= 4'], l2: ['= 4'], linf: ['= 4'] });
    expect(lines('negative')).toMatchObject({ l1: ['= 5'], linf: ['= 3'] });
    expect(lines('negative').l2![0]).toBe('= √13');
    expect(lines('half').l1).toEqual(['= 2']);
    expect(lines('zero')).toMatchObject({ l1: ['= 0'], l2: ['= 0'], linf: ['= 0'] });
    expect(by('zero').n.zero).toBe(true);
    expect(NORM_PRESETS.filter(p => normPresetMatches(CANONICAL_NORM, p)).map(p => p.id)).toEqual(['three-four']);
  });
  it('shows an irrational l2 norm as an exact radical with an approximation, never as an equality with a decimal', () => {
    const rows = normRows(deriveNormLesson({ x1: 1, x2: 1, norm: '2' }));
    const l2 = rows.find(r => r.id === 'l2')!;
    expect(l2.description.lines.map(l => l.relation)).toEqual(['=', '≈']);
    expect(l2.description.lines[1]!.text.endsWith('…')).toBe(true);
    expect(normVerdict(deriveNormLesson({ x1: 1, x2: 1, norm: '2' })).text).toMatch(/irrational/);
  });
  it('states the chain of inequalities with equality signs only where the norms are equal', () => {
    expect(normChainTex(deriveNormLesson({ x1: 3, x2: 4, norm: '2' }))).toMatch(/=4\\ \\le\\ .*=5\\ \\le\\ .*=7\\ \\le\\ .*=8$/);
    expect(normChainTex(deriveNormLesson({ x1: 4, x2: 0, norm: '2' }))).toBe('\\lVert\\mathbf{x}\\rVert_\\infty=4\\ =\\ \\lVert\\mathbf{x}\\rVert_2=4\\ =\\ \\lVert\\mathbf{x}\\rVert_1=4\\ \\le\\ 2\\lVert\\mathbf{x}\\rVert_\\infty=8');
    // (2, 2): l1 = 4 = 2 * linf, so the last link is an equality; (2, 1): l1 = 3 < 4, a strict one
    expect(normChainTex(deriveNormLesson({ x1: 2, x2: 2, norm: '2' }))).toMatch(/=4\\ =\\ 2\\lVert.*=4$/);
    expect(normChainTex(deriveNormLesson({ x1: 2, x2: 1, norm: '2' }))).toMatch(/=3\\ \\le\\ 2\\lVert.*=4$/);
  });
  it('says what a zero vector is', () => {
    const v = normVerdict(deriveNormLesson({ x1: 0, x2: 0, norm: '1' }));
    expect(v.text).toMatch(/only vector with norm 0/);
  });
});

// ------------------------------------------------------------------------------------------------ arg min
describe('the arg min views', () => {
  const kinds = ['bowl', 'two-wells', 'flat-bottom'] as const;
  it('renders every string with strict KaTeX over the whole parameter grid', () => {
    for (const kind of kinds) for (let c = -3; c <= 3; c++) for (let b = 0; b <= 6; b++) {
      const s: ArgminLessonState = { kind, c, b };
      const l = deriveArgminLesson(s);
      rowTex(argminRows(l));
      for (const f of argminFormulas(l)) tex(f.tex);
      tex(lossTex(s));
      expect(argminCode(l)).toContain('np.argmin(L)');
      expect(argminVerdict(l).text).toMatch(/np\.argmin\(L\) returns neither/);
      expect(argminSpoken(l).length).toBeGreaterThan(0);
    }
  });
  it('has presets that do what their labels say', () => {
    const by = (id: string) => deriveArgminLesson(ARGMIN_PRESETS.find(p => p.id === id)!.state).d;
    expect([by('bowl').minValue, by('bowl').argmin, by('bowl').npIndex]).toEqual([1, [2], 6]);
    expect([by('raised').minValue, by('raised').argmin]).toEqual([5, [2]]);
    expect([by('wells').minValue, by('wells').argmin, by('wells').npIndex, by('wells').npTheta]).toEqual([0, [-1, 1], 3, -1]);
    expect(by('wells-shifted').argmin).toEqual([0, 2]);
    expect(by('flat').argmin).toEqual([-1, 0, 1]);
    expect(by('unique').argmin).toEqual([0]);
    expect(ARGMIN_PRESETS.filter(p => argminPresetMatches(CANONICAL_ARGMIN, p)).map(p => p.id)).toEqual(['bowl']);
  });
  it('keeps value, set and position apart in the inspector and says when np.argmin leaves minimisers out', () => {
    const l = deriveArgminLesson({ kind: 'two-wells', c: 0, b: 0 });
    const rows = argminRows(l);
    expect(rows.find(r => r.id === 'min')!.description.lines[0]!.text).toBe('0');
    expect(rows.find(r => r.id === 'argmin')!.description.lines[0]!.text).toBe('{−1, 1}');
    expect(rows.find(r => r.id === 'np-index')!.description.lines[0]!.text).toBe('3');
    expect(rows.find(r => r.id === 'np-theta')!.description.lines[0]!.text).toBe('−1');
    expect(rows.find(r => r.id === 'argmin')!.name).toMatch(/SET/);
    const v = argminVerdict(l);
    expect(v.caution).toBe(true);
    expect(v.text).toMatch(/silently left out/);
    expect(argminVerdict(deriveArgminLesson(CANONICAL_ARGMIN)).caution).toBe(false);
  });
  it('writes the shift without a double sign', () => {
    expect(lossTex({ kind: 'bowl', c: 0, b: 0 })).toBe('L(\\theta)=\\theta^{2}+0');
    expect(lossTex({ kind: 'bowl', c: -2, b: 1 })).toBe('L(\\theta)=\\left(\\theta+2\\right)^{2}+1');
    expect(argminCode(deriveArgminLesson({ kind: 'bowl', c: -2, b: 1 }))).toContain('L = (thetas + 2) ** 2 + 1');
    expect(argminCode(deriveArgminLesson({ kind: 'flat-bottom', c: 1, b: 0 }))).toContain('L = np.maximum(np.abs(thetas - 1) - 1, 0) ** 2 + 0');
    expect(setText([-1, 1])).toBe('{−1, 1}');
  });
});

// ------------------------------------------------------------------------------------------------ expectation
describe('the expectation views', () => {
  it('renders every string with strict KaTeX over presets and random counts', () => {
    const sets = ['die', 'rating', 'payoff'] as const;
    let seed = 12345;
    const next = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed; };
    for (const p of EXPECT_PRESETS) {
      const l = deriveExpectLesson(p.state);
      rowTex(expectRows(l));
      for (const f of expectFormulas(l)) tex(f.tex);
      expect(expectCode(l)).toMatch(/counts \/ counts\.sum\(\)/);
    }
    for (let t = 0; t < 300; t++) {
      const s: ExpectLessonState = { set: sets[next() % 3]!, c1: next() % 100, c2: next() % 100, c3: next() % 100, c4: next() % 100, c5: next() % 100, c6: next() % 100 };
      const l = deriveExpectLesson(s);
      rowTex(expectRows(l));
      for (const f of expectFormulas(l)) tex(f.tex);
      expect(expectVerdict(l).text.length).toBeGreaterThan(0);
      expect(expectSpoken(l).length).toBeGreaterThan(0);
    }
  });
  it('has presets that do what their labels say', () => {
    const by = (id: string) => deriveExpectLesson(EXPECT_PRESETS.find(p => p.id === id)!.state).d;
    const e = (id: string) => { const x = by(id).expectation; return x ? `${x.num}/${x.den}` : null; };
    expect(e('counts')).toBe('13/3');
    expect(e('fair')).toBe('7/2');
    expect(e('single')).toBe('6/1');
    expect(e('ratings')).toBe('9/4');
    expect(e('payoff')).toBe('-1/5');
    expect(e('empty')).toBeNull();
    expect(by('empty').defined).toBe(false);
    expect(EXPECT_PRESETS.filter(p => expectPresetMatches(CANONICAL_EXPECT, p)).map(p => p.id)).toEqual(['counts']);
  });
  it('matches a preset by the visible counts only', () => {
    const rating = EXPECT_PRESETS.find(p => p.id === 'ratings')!;
    expect(expectPresetMatches({ ...rating.state, c6: 7 }, rating)).toBe(true);
    expect(visibleCounts(rating.state)).toEqual([2, 3, 5, 8, 2]);
    expect(expectPresetMatches({ ...rating.state, c1: 3 }, rating)).toBe(false);
  });
  it('lists exact probabilities that add to 1 and weighted values that add to E[X]', () => {
    const l = deriveExpectLesson(CANONICAL_EXPECT);
    const table = expectTable(l);
    expect(table.map(r => r.pText)).toEqual(['1/21', '2/21', '1/7', '4/21', '5/21', '2/7']);
    expect(table.map(r => r.weighted)).toEqual(['1/21', '4/21', '3/7', '16/21', '25/21', '12/7']);
    expect(expectRows(l).find(r => r.id === 'sum-p')!.description.lines[0]!.text).toBe('1');
    expect(expectRows(l).find(r => r.id === 'expectation')!.description.lines.map(x => x.relation)).toEqual(['=', '≈']);
  });
  it('reports no data as undefined, with the division by zero, and fabricates no probabilities', () => {
    const l = deriveExpectLesson(EXPECT_PRESETS.find(p => p.id === 'empty')!.state);
    const rows = expectRows(l);
    expect(rows.find(r => r.id === 'expectation')!.description.status).toBe('undefined');
    expect(rows.find(r => r.id === 'sum-p')!.description.status).toBe('undefined');
    expect(expectTable(l).every(r => r.pText === 'undefined' && r.weighted === 'undefined')).toBe(true);
    expect(expectVerdict(l).caution).toBe(true);
    expect(expectVerdict(l).text).toMatch(/divide by 0/);
    expect(expectCode(l)).toMatch(/nan and a RuntimeWarning/);
  });
  it('says when the expectation is not a value the variable can take', () => {
    expect(expectVerdict(deriveExpectLesson(CANONICAL_EXPECT)).text).toMatch(/not a value X can take/);
    expect(expectVerdict(deriveExpectLesson(EXPECT_PRESETS.find(p => p.id === 'single')!.state)).text).toMatch(/happens to be one of the possible values/);
  });
});

// ------------------------------------------------------------------------------------------------ gradient
describe('the gradient views', () => {
  const steps = [1, 3, 6, 9, 13];
  const grid = [-4, -1.5, 0, 0.5, 1, 2, 3.25, 4];
  it('renders every string with strict KaTeX', () => {
    for (const t1 of grid) for (const t2 of grid) for (const e of steps) {
      const s: GradientLessonState = { t1, t2, e };
      const l = deriveGradientLesson(s);
      rowTex(gradientRows(l));
      for (const f of gradientFormulas(l)) tex(f.tex);
      expect(gradientCode(l)).toContain(`h = 1e-${e}`);
      expect(gradientVerdict(l).text.length).toBeGreaterThan(0);
      expect(gradientSpoken(l).length).toBeGreaterThan(0);
    }
  });
  it('uses = for the exact gradient and ≈ for every computed double', () => {
    const rows = gradientRows(deriveGradientLesson(CANONICAL_GRADIENT));
    for (const id of ['grad1', 'grad2', 'f', 'shape']) expect(rows.find(r => r.id === id)!.description.lines[0]!.relation, id).toBe('=');
    for (const id of ['est1', 'est2', 'err1', 'err2']) {
      const r = rows.find(x => x.id === id)!;
      expect(r.description.lines.map(l => l.relation), id).toEqual(['≈']);
      expect(r.description.status, id).toBe('approximate');
    }
    expect(rows.find(r => r.id === 'grad1')!.description.lines[0]!.text).toBe('2');
    expect(rows.find(r => r.id === 'grad2')!.description.lines[0]!.text).toBe('12');
    expect(rows.find(r => r.id === 'shape')!.description.lines[0]!.text).toBe('(2,)');
  });
  it('reports the errors of all five steps and which one is smallest at this point', () => {
    const l = deriveGradientLesson(CANONICAL_GRADIENT);
    expect(l.errors.map(r => r.e)).toEqual(steps);
    const smallest = l.errors.reduce((a, b) => (b.worst < a.worst ? b : a));
    expect(l.bestE).toBe(smallest.e);
    // for f = t1^2 + 3 t2^2 the truncation error of a forward difference is h (first entry) and 3h (second entry): the large step is clearly worse than a medium one
    expect(l.errors.find(r => r.e === 1)!.worst).toBeGreaterThan(l.errors.find(r => r.e === 6)!.worst);
    expect(l.errors.find(r => r.e === 1)!.error1).toBeCloseTo(0.1, 9);
    expect(l.errors.find(r => r.e === 1)!.error2).toBeCloseTo(0.3, 9);
  });
  it('has presets that do what their labels say', () => {
    const by = (id: string) => deriveGradientLesson(GRADIENT_PRESETS.find(p => p.id === id)!.state);
    expect(by('canonical').state.e).toBe(3);
    expect(by('large-step').state.e).toBe(1);
    expect(by('tiny-step').state.e).toBe(13);
    expect(by('origin').d.stationary).toBe(true);
    expect(gradientVerdict(by('origin')).text).toMatch(/zero vector, so θ is a stationary point/);
    expect(gradientVerdict(by('canonical')).text).toMatch(/same shape as θ/);
    expect(GRADIENT_PRESETS.filter(p => gradientPresetMatches(CANONICAL_GRADIENT, p)).map(p => p.id)).toEqual(['canonical']);
  });
});
