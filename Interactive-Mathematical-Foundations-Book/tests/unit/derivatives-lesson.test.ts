import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { katexMacros } from '../../src/math/katex-macros.mjs';
import { deriveSecant, secantPresets, SECANT_CANONICAL } from '../../src/lessons/calculus/secant-lesson';

const strict = (t: string) => expect(() => katex.renderToString(t, { strict: 'error', throwOnError: true, macros: katexMacros() }), t).not.toThrow();
const texOf = (d: ReturnType<typeof deriveSecant>) => [...d.formulas, ...d.frames.map(f => f.state.formula), ...d.rows.map(r => r.symbolTex), ...d.rows.flatMap(r => r.description.lines.map(l => l.tex))];

describe('III.3 secant lesson', () => {
  for (const p of secantPresets) it(`${p.id}: strict formulas, immutable trace, truthful status`, () => {
    const d = deriveSecant(p.state);
    texOf(d).forEach(strict);
    expect(d.frames.length).toBe(7); expect(Object.isFrozen(d.frames[0]!.state)).toBe(true);
    expect({ smooth: 'differentiable', corner: 'corner', vertical: 'vertical', jump: 'discontinuous', endpoint: 'vertical', sine: 'differentiable', 'zero-h': 'zero-h' }[p.id]).toBe(d.status);
  });
  it('a sweep of x and h renders every formula and never fabricates a slope at h = 0', () => {
    for (const fn of ['cubic', 'abs', 'jump', 'cbrt', 'sqrt', 'sin']) for (const x of [-2.5, -1, -0.25, 0, 0.75, 2.5]) for (const h of [-2, -0.25, 0, 0.01, 1.5]) {
      const d = deriveSecant({ fn, x, h });
      texOf(d).forEach(strict);
      if (h === 0) { expect(d.metrics.secant).toBeNull(); expect(d.rows.find(r => r.id === 'secant')!.description.status).toBe('undefined'); }
    }
  });
  it('drawn geometry equals the model: secant through P and Q, slope triangle, tangent with the derived slope', () => {
    const d = deriveSecant(SECANT_CANONICAL), s = d.scenes[0]!;
    const sec = s.segments.find(x => x.name === 'secant')!, run = s.segments.find(x => x.name === 'run')!, rise = s.segments.find(x => x.name === 'rise')!;
    const slope = (a: { x: number; y: number }, b: { x: number; y: number }) => (b.y - a.y) / (b.x - a.x);
    expect(slope(sec.from, sec.to)).toBeCloseTo(1 / 6, 14);
    expect(run.from).toEqual({ x: 1, y: -5 / 6 }); expect(rise.to.y).toBeCloseTo(-2 / 3, 15);
    const tan = s.segments.find(x => x.name === 'tangent')!; expect(slope(tan.from, tan.to)).toBeCloseTo(-0.5, 14);
    expect(s.handles.map(h => h.at)).toEqual([{ x: 1, y: d.metrics.py }, { x: 2, y: d.metrics.qy }]);
    expect(s.handles[1]!.write!(1.5, 0)).toEqual({ h: 0.5 });
    expect(d.metrics.secantExact).toBe('1/6');
  });
  it('at a corner it draws two one-sided rays instead of a tangent line', () => {
    const s = deriveSecant({ fn: 'abs', x: 0, h: 1 }).scenes[0]!;
    expect(s.segments.some(x => x.name === 'tangent')).toBe(false);
    expect(s.segments.filter(x => x.name.startsWith('tangent-')).map(x => x.name)).toEqual(['tangent-left', 'tangent-right']);
  });
  it('a jump draws a filled actual value and an open one-sided limit', () => {
    const m = deriveSecant({ fn: 'jump', x: 0, h: 1 }).scenes[0]!.markers;
    expect(m.filter(x => x.filled).map(x => x.at)).toEqual([{ x: 0, y: 1 }]);
    expect(m.filter(x => !x.filled).map(x => x.at)).toEqual([{ x: 0, y: -1 }]);
  });
});

import { deriveLinear, linearPresets, LINEAR_CANONICAL } from '../../src/lessons/calculus/linear-model-lesson';
import { deriveRules, rulesPresets, RULES_CANONICAL } from '../../src/lessons/calculus/rules-lesson';
import { deriveChain, chainPresets, CHAIN_CANONICAL } from '../../src/lessons/calculus/chain-lesson';
type D = ReturnType<typeof deriveLinear>;
const allTex = (d: D) => [...d.formulas, ...d.frames.map(f => f.state.formula), ...d.rows.map(r => r.symbolTex), ...d.rows.flatMap(r => r.description.lines.map(l => l.tex))];
describe('III.4 linear model lesson', () => {
  for (const p of linearPresets) it(`${p.id}: formulas and status`, () => { const d = deriveLinear(p.state); allTex(d).forEach(strict); expect(d.status).toBe({ far: 'far', corner: 'no-derivative' }[p.id as 'far'] ?? 'local'); });
  it('model point, error segment and error marker equal the model', () => {
    const d = deriveLinear(LINEAR_CANONICAL), [g, e] = d.scenes;
    expect(g!.segments.find(s => s.name === 'error')).toMatchObject({ from: { x: 2, y: -4 / 3 }, to: { x: 2, y: -2 / 3 } });
    expect(e!.markers[0]!.at).toEqual({ x: 1, y: 2 / 3 }); expect(d.metrics.errorExact).toBe('2/3');
    expect(d.table!.rows[1]).toEqual(['0.5', '7/48', '7/24', '7/12']);
  });
  it('sweep', () => { for (const fn of ['cubic', 'sin', 'exp', 'abs']) for (const x0 of [-2.5, 0, 1.25]) for (const dx of [-3, 0, 0.25, 3]) allTex(deriveLinear({ fn, x0, dx })).forEach(strict); });
});
describe('III.5 rules lesson', () => {
  for (const p of rulesPresets) it(`${p.id}: rule equals the independent route`, () => {
    const d = deriveRules(p.state); allTex(d).forEach(strict);
    if (p.id === 'pole') { expect(d.status).toBe('undefined'); expect(d.metrics.rule).toBeNull(); } else expect(d.metrics.agree).toBe(true);
  });
  it('product area strips are the exact increment pieces', () => {
    const d = deriveRules(RULES_CANONICAL), area = d.scenes[1]!;
    expect(area.polygons.map(p => p.name)).toEqual(['rect-uv', 'strip-vdu', 'strip-udv', 'strip-corner']);
    expect(area.polygons[1]!.corners[1]).toEqual({ x: 2.5, y: 0 });
  });
  it('sweep, including exact zeros of v', () => { for (const mode of ['sum', 'product', 'quotient'] as const) for (const c of [-1, 0, 2]) for (const x of [-1, 0, 1]) { const d = deriveRules({ ...RULES_CANONICAL, mode, c, x }); allTex(d).forEach(strict); if (mode === 'quotient' && x * x + c === 0) expect(d.metrics.rule).toBeNull(); } });
});
describe('III.6 chain lesson', () => {
  for (const p of chainPresets) it(`${p.id}: local factors multiply`, () => {
    const d = deriveChain(p.state); allTex(d).forEach(strict);
    expect(d.metrics.product).toBeCloseTo((d.metrics.gp as number) * (d.metrics.fp as number), 14);
    if (p.state.inner !== 'sin' && p.state.outer === 'cube') expect(d.metrics.agree).toBe(true);
  });
  it('three linked planes share the state; the composite tangent slope is the product', () => {
    const d = deriveChain(CHAIN_CANONICAL); expect(d.scenes.map(s => s.id)).toEqual(['inner', 'outer', 'composite']);
    const t = d.scenes[2]!.segments.find(s => s.name === 'tangent-h')!; expect((t.to.y - t.from.y) / (t.to.x - t.from.x)).toBeCloseTo(1.5, 13);
  });
  it('sweep', () => { for (const inner of ['square', 'linear', 'sin']) for (const outer of ['cube', 'sin', 'exp']) for (const x of [-2.5, 0, 2.5]) allTex(deriveChain({ inner, outer, x, dx: 0.5 })).forEach(strict); });
});
