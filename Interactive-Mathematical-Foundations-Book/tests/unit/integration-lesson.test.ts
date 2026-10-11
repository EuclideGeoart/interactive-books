import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { katexMacros } from '../../src/math/katex-macros.mjs';
import { deriveRiemann, riemannPresets, RIEMANN_CANONICAL } from '../../src/lessons/calculus/riemann-lesson';
import { deriveAccumulation, accumulationPresets, ACCUMULATION_CANONICAL } from '../../src/lessons/calculus/accumulation-lesson';
import { deriveQuadrature, quadraturePresets, QUADRATURE_CANONICAL, observedOrder, errorsFor, PROBLEMS } from '../../src/lessons/calculus/quadrature-lesson';
import type { CalcDerived } from '../../src/lessons/calculus/calculus-view';

const strict = (t: string) => expect(() => katex.renderToString(t, { strict: 'error', throwOnError: true, macros: katexMacros() }), t).not.toThrow();
const tex = (d: CalcDerived) => [...d.formulas, ...d.frames.map(f => f.state.formula), ...d.rows.map(r => r.symbolTex), ...d.rows.flatMap(r => r.description.lines.map(l => l.tex))];
describe('III.12 Riemann lesson', () => {
  const st: Record<string, string> = { signed: 'signed', positive: 'one-sign', cancel: 'signed', reversed: 'reversed', trapezoid: 'signed', sine: 'one-sign' };
  for (const p of riemannPresets) it(`${p.id}: ${st[p.id]}`, () => { const d = deriveRiemann(p.state); tex(d).forEach(strict); expect(d.status).toBe(st[p.id]); });
  it('drawn panels are the summed panels: count, widths and signed colouring', () => {
    const d = deriveRiemann(RIEMANN_CANONICAL), polys = d.scenes[0]!.polygons;
    expect(polys).toHaveLength(10); expect(polys[0]!.corners[1]!.x - polys[0]!.corners[0]!.x).toBe(0.5);
    expect(polys[0]!.corners[2]!.y).toBe(0); expect(polys[1]!.role).toBe('y'); expect(polys[5]!.role).toBe('caution');
    expect(d.metrics.sumExact).toBe('0.703125'); expect(d.table!.rows).toHaveLength(7);
  });
  it('sweep including n = 1 and n = 64 and a = b', () => { for (const fn of ['cubic', 'parabola', 'linear', 'sin']) for (const [a, b] of [[-3, 3], [1, 1], [2, -1]]) for (const n of [1, 64]) for (const rule of ['left', 'midpoint', 'trapezoid'] as const) tex(deriveRiemann({ fn, a: a!, b: b!, n, rule })).forEach(strict); });
});
describe('III.13 accumulation lesson', () => {
  for (const p of accumulationPresets) it(`${p.id}`, () => { const d = deriveAccumulation(p.state); tex(d).forEach(strict); expect(d.status).toBe(p.id === 'jump' ? 'corner' : 'ftc'); });
  it('F slope equals f(x); the strip is the exact ΔF', () => {
    const d = deriveAccumulation(ACCUMULATION_CANONICAL);
    expect(d.metrics).toMatchObject({ FExact: '0.5625', f: -0.75, slope: -0.75, delta: -0.37109375 });
    const t = d.scenes[1]!.segments.find(s => s.name === 'tangent')!; expect((t.to.y - t.from.y) / (t.to.x - t.from.x)).toBeCloseTo(-0.75, 13);
  });
});
describe('III.15 quadrature lesson', () => {
  for (const p of quadraturePresets) it(`${p.id}`, () => { const d = deriveQuadrature(p.state); tex(d).forEach(strict); });
  it('exact trapezoid errors are 1/(6n²) and the observed order is exactly 2', () => {
    const e = errorsFor(PROBLEMS.square!, 'trapezoid');
    e.forEach((v, k) => expect(v.exact).toEqual({ num: 1n, den: 6n * 4n ** BigInt(k) }));
    expect(observedOrder(e, 3)).toBe(2);
    expect(observedOrder(errorsFor(PROBLEMS.sqrt!, 'trapezoid'), 10)!).toBeCloseTo(1.5, 1);
    expect(deriveQuadrature({ ...QUADRATURE_CANONICAL, k: 8 }).scenes[0]!.polygons).toHaveLength(0);
  });
});
