import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { katexMacros } from '../../src/math/katex-macros.mjs';
import { AUTODIFF_CANONICAL, autodiffPresets, deriveAutodiff, layout } from '../../src/lessons/calculus/autodiff-lesson';
import { GRAPHS } from '../../src/math/calculus/autodiff';

const strict = (t: string) => expect(() => katex.renderToString(t, { strict: 'error', throwOnError: true, macros: katexMacros() }), t).not.toThrow();
describe('III.10 autodiff lesson', () => {
  for (const p of autodiffPresets) for (const mode of ['reverse', 'forward'] as const) it(`${p.id} ${mode}: strict formulas, frozen trace`, () => {
    const d = deriveAutodiff({ ...p.state, mode });
    [...d.formulas, ...d.frames.map(f => f.state.formula), ...d.rows.map(r => r.symbolTex), ...d.rows.flatMap(r => r.description.lines.map(l => l.tex))].forEach(strict);
    expect(Object.isFrozen(d.frames.at(-1)!.state)).toBe(true);
    expect(d.description).not.toMatch(/\\(frac|partial|bar)/);
  });
  it('the trace accumulates both contributions to x before reporting 7 = 2x + y', () => {
    const d = deriveAutodiff(AUTODIFF_CANONICAL), adj = d.frames.filter(f => f.state.phase === 'adjoint');
    expect(adj.map(f => f.state.focus)).toEqual(['z', 'u']);
    expect(adj[0]!.state.derivs.x).toBe('5'); expect(adj[1]!.state.derivs.x).toBe('7');
    expect(adj[1]!.state.contributions).toEqual({ 'u->z#0': '2', 'x->z#1': '5', 'x->u#0': '2', 'y->u#1': '2' });
    expect(d.rows.find(r => r.id === 'paths-x')!.description.lines[0]!.text).toBe('2 via u + 5 via z');
  });
  it('values appear only after the step that computes them', () => {
    const f = deriveAutodiff(AUTODIFF_CANONICAL).frames;
    expect(f[0]!.state.values).toEqual({ x: '2', y: '3' }); expect(f[1]!.state.values.u).toBe('5'); expect(f[1]!.state.values.z).toBeUndefined();
  });
  it('layout places every argument column left of its operation and gives repeated arguments parallel edges', () => {
    for (const g of Object.values(GRAPHS)) { const L = layout(g); for (const e of L.edges) expect(e.x1).toBeLessThan(e.x2); }
    expect(layout(GRAPHS.square!).edges.map(e => e.parallel)).toEqual([-1, 1]);
  });
  it('the cost table states forward passes = inputs and reverse passes = outputs', () => {
    expect(deriveAutodiff({ ...AUTODIFF_CANONICAL, graph: 'scalar-loss' }).table.rows[0]!).toEqual(['3', '1', '3', '1']);
    expect(deriveAutodiff({ ...AUTODIFF_CANONICAL, graph: 'many-outputs' }).table.rows[0]!).toEqual(['1', '3', '1', '3']);
  });
});
