import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { katexMacros } from '../../src/math/katex-macros.mjs';
import { deriveLimit, limitPresets, LIMIT_CANONICAL } from '../../src/lessons/calculus/limits-lesson';
import { deriveContinuity, continuityPresets, CONTINUITY_CANONICAL } from '../../src/lessons/calculus/continuity-lesson';
import type { CalcDerived } from '../../src/lessons/calculus/calculus-view';

const strict = (t: string) => expect(() => katex.renderToString(t, { strict: 'error', throwOnError: true, macros: katexMacros() }), t).not.toThrow();
const tex = (d: CalcDerived) => [...d.formulas, ...d.frames.map(f => f.state.formula), ...d.rows.map(r => r.symbolTex), ...d.rows.flatMap(r => r.description.lines.map(l => l.tex))];
describe('III.1 limits lesson', () => {
  const expected: Record<string, string> = { hole: 'removable', moved: 'removable', jump: 'jump', 'recip-square': 'infinite', recip: 'infinite', oscillation: 'oscillation', squeeze: 'removable', smooth: 'continuous' };
  for (const p of limitPresets) it(`${p.id}: strict formulas, immutable trace, analytic classification`, () => {
    const d = deriveLimit(p.state); tex(d).forEach(strict);
    expect(d.status).toBe(expected[p.id]); expect(d.frames).toHaveLength(7); expect(Object.isFrozen(d.frames[6]!.state)).toBe(true);
    expect(d.table!.rows).toHaveLength(8);
  });
  it('the value at a is never replaced by the limit', () => {
    const hole = deriveLimit({ fn: 'hole', a: 1, x: 1 });
    expect(hole.metrics.fx).toBeNull(); expect(hole.metrics.fa).toBeNull(); expect(hole.metrics.limit).toBe(2);
    expect(hole.rows.find(r => r.id === 'fa')!.description.status).toBe('undefined');
    const moved = deriveLimit({ fn: 'moved', a: 1, x: 1 }); expect(moved.metrics.fa).toBe(3); expect(moved.metrics.limit).toBe(2);
  });
  it('drawn traces are actual samples at a ∓ δ and the limit line sits at the limit', () => {
    const s = deriveLimit(LIMIT_CANONICAL).scenes[0]!;
    expect(s.markers.filter(m => m.name.startsWith('trace-left')).map(m => m.at)).toEqual([{ x: 0, y: 1 }, { x: 0.5, y: 1.5 }, { x: 0.75, y: 1.75 }, { x: 0.875, y: 1.875 }, { x: 0.9375, y: 1.9375 }]);
    expect(s.segments.find(x => x.name === 'line-limit')!.from.y).toBe(2);
    expect(s.markers.find(m => m.name.startsWith('f-hole'))!.at).toEqual({ x: 1, y: 2 });
  });
  it('a sweep of a and x renders every formula', () => {
    for (const p of limitPresets) for (const a of [-2.5, -1, 0, 1, 2.5]) for (const x of [-3, 0, 0.05, 1, 3]) tex(deriveLimit({ fn: p.state.fn, a, x })).forEach(strict);
  });
});
describe('III.2 continuity lesson', () => {
  const expected: Record<string, string> = { jump: 'jump', joined: 'continuous', removable: 'removable', missing: 'removable-missing', pole: 'infinite', endpoint: 'right-continuous', local: 'continuous' };
  for (const p of continuityPresets) it(`${p.id}: three conditions and classification`, () => {
    const d = deriveContinuity(p.state); tex(d).forEach(strict); expect(d.status).toBe(expected[p.id]);
    const c = ['c1', 'c2', 'c3'].map(id => d.rows.find(r => r.id === id)!.description.lines[0]!.text);
    if (p.id === 'joined') expect(c).toEqual(['yes', 'yes', 'yes']);
    if (p.id === 'removable') expect(c).toEqual(['yes', 'yes', 'no']);
    if (p.id === 'missing') expect(c).toEqual(['no', 'yes', 'no']);
    if (p.id === 'jump') expect(c).toEqual(['yes', 'no', 'no']);
  });
  it('the join condition 1 + c = m is exact, and continuity is local', () => {
    for (const c of [-2, -1, 0, 0.5, 1, 1.75]) for (const m of [-1, 0, 1, 2, 2.5]) {
      const d = deriveContinuity({ ...CONTINUITY_CANONICAL, c, m });
      expect(d.status === 'continuous').toBe(1 + c === m);
      tex(d).forEach(strict);
    }
    expect(deriveContinuity({ ...CONTINUITY_CANONICAL, a: -1 }).metrics.breaks).toBe('1');
  });
});
