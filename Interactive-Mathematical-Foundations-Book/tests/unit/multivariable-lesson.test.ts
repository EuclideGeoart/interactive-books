import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { katexMacros } from '../../src/math/katex-macros.mjs';
import { derivePartial, partialPresets, PARTIAL_CANONICAL } from '../../src/lessons/calculus/partials-lesson';
import { deriveGradient, gradientPresets, GRADIENT_CANONICAL } from '../../src/lessons/calculus/gradient-lesson';
import { deriveJacobian, jacobianPresets, JACOBIAN_CANONICAL } from '../../src/lessons/calculus/jacobian-lesson';
import { deriveHessian, hessianPresets } from '../../src/lessons/calculus/hessian-lesson';
import type { CalcDerived } from '../../src/lessons/calculus/calculus-view';

const strict = (t: string) => expect(() => katex.renderToString(t, { strict: 'error', throwOnError: true, macros: katexMacros() }), t).not.toThrow();
const tex = (d: CalcDerived) => [...d.formulas, ...d.frames.map(f => f.state.formula), ...d.rows.map(r => r.symbolTex), ...d.rows.flatMap(r => r.description.lines.map(l => l.tex))];
const slope = (s: { from: { x: number; y: number }; to: { x: number; y: number } }) => (s.to.y - s.from.y) / (s.to.x - s.from.x);
describe('III.7 partials', () => {
  for (const p of partialPresets) it(`${p.id}: formulas and slices`, () => { const d = derivePartial(p.state); tex(d).forEach(strict); expect(d.scenes.map(s => s.id)).toEqual(['map', 'slice-x', 'slice-y']); });
  it('slice tangents carry the exact partial derivatives', () => {
    const d = derivePartial(PARTIAL_CANONICAL);
    expect(slope(d.scenes[1]!.segments[0]!)).toBeCloseTo(2, 13); expect(slope(d.scenes[2]!.segments[0]!)).toBeCloseTo(-1, 13);
    expect(d.scenes[0]!.handles[0]).toMatchObject({ xField: 'x', yField: 'y', at: { x: 1, y: 0.5 } });
  });
});
describe('III.8 gradient', () => {
  for (const p of gradientPresets) it(`${p.id}: formulas and status`, () => {
    const d = deriveGradient(p.state); tex(d).forEach(strict);
    expect(d.status).toBe({ stationary: 'stationary', 'zero-direction': 'zero-direction', level: 'level' }[p.id as 'level'] ?? 'directional');
  });
  it('arrow is the gradient at its declared scale; the level tangent is perpendicular; exact 11/5', () => {
    const d = deriveGradient(GRADIENT_CANONICAL), a = d.scenes[0]!.arrows.find(x => x.name === 'gradient')!;
    expect([(a.to.x - a.from.x) / 0.25, (a.to.y - a.from.y) / 0.25]).toEqual([1, 2]);
    const t = d.scenes[0]!.segments.find(x => x.name === 'level-tangent')!;
    expect((t.to.x - t.from.x) * 1 + (t.to.y - t.from.y) * 2).toBeCloseTo(0, 12);
    const e = deriveGradient({ ...GRADIENT_CANONICAL, dx: 0.75, dy: 1 });
    expect(e.rows.find(r => r.id === 'du')!.description.lines[0]!.text).toBe('2.2'); expect(e.rows.find(r => r.id === 'du')!.description.status).toBe('exact');
    expect(deriveGradient({ ...GRADIENT_CANONICAL, x: 0, y: 0 }).scenes[0]!.arrows.some(x => x.name === 'gradient')).toBe(false);
  });
});
describe('III.9 Jacobian', () => {
  for (const p of jacobianPresets) it(`${p.id}: formulas and status`, () => {
    const d = deriveJacobian(p.state); tex(d).forEach(strict);
    expect(d.status).toBe({ square: 'local', large: 'nonlocal', singular: 'singular', shear: 'local', linear: 'exact', lift: 'rectangular' }[p.id]);
  });
  it('the drawn prediction and actual arrows end at the model values', () => {
    const d = deriveJacobian(JACOBIAN_CANONICAL), out = d.scenes[1]!;
    expect(out.arrows.find(a => a.name === 'actual')!.to).toEqual({ x: 1, y: 1.875 });
    expect(out.segments.find(a => a.name === 'predicted')!.to).toEqual({ x: 1, y: 1.75 });
    expect(d.rows.find(r => r.id === 'mismatch')!.description.status).toBe('undefined');
  });
});
describe('III.11 Hessian', () => {
  const kinds: Record<string, string> = { minimum: 'minimum', maximum: 'maximum', saddle: 'saddle', 'well-min': 'minimum', 'well-saddle': 'saddle', monkey: 'inconclusive', quartic: 'inconclusive', 'cubic-y': 'inconclusive', 'not-critical': 'not-critical' };
  for (const p of hessianPresets) it(`${p.id}: ${kinds[p.id]}`, () => { const d = deriveHessian(p.state); tex(d).forEach(strict); expect(d.status).toBe(kinds[p.id]); });
  it('curvature in any direction lies between the principal curvatures', () => {
    for (const angle of [-180, -105, -30, 0, 45, 90, 165]) { const m = deriveHessian({ fn: 'double-well', x: 1, y: 0.5, angle }).metrics; expect(m.curvature as number).toBeLessThanOrEqual((m.l1 as number) + 1e-12); expect(m.curvature as number).toBeGreaterThanOrEqual((m.l2 as number) - 1e-12); }
  });
});
