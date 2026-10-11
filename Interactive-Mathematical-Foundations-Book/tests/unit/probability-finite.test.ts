import { describe, expect, it } from 'vitest';
import { finiteEvents, finiteTrials, fractionText, sum, validateMass, weightedSpace } from '../../src/math/probability/finite';
import { seeded } from '../../src/math/probability/seeded';
import { add, eq, ONE, rational, sub } from '../../src/math/quantity/rational';
import { deriveFiniteLesson, FINITE_CANONICAL, finitePreset } from '../../src/lessons/probability/finite-lesson';
import katex from 'katex';

describe('exact outcome mass and conditioning', () => {
  it('fair die gives the hand-worked intersection and changed denominator', () => {
    const d = finiteEvents([1, 1, 1, 1, 1, 1], [1, 3, 5], [3, 4, 5]);
    expect([d.massA, d.massB, d.joint, d.conditional].map(p => fractionText(p!))).toEqual(['1/2', '1/2', '1/3', '2/3']);
    expect(d.independent).toBe(false); expect(fractionText(sum(d.conditionalMass!))).toBe('1/1');
    expect(eq(d.unionMass, sub(add(d.massA, d.massB), d.joint))).toBe(true);
  });
  it('weighted conditioning is mass renormalization, not counting', () => {
    const d = finiteEvents([1, 2, 7], [0], [0, 1]);
    expect(fractionText(d.conditional!)).toBe('1/3');
    expect(d.conditionalMass!.map(fractionText)).toEqual(['1/3', '2/3', '0/1']);
  });
  it('sets ignore repeated membership; empty or zero-mass conditioning is undefined', () => {
    expect(fractionText(finiteEvents([1, 1], [0, 0], [0]).massA)).toBe('1/2');
    for (const b of [[], [1]]) {
      const d = finiteEvents([1, 0], [0], b);
      expect(d.conditional).toBeNull(); expect(d.conditionalMass).toBeNull();
    }
  });
  it('overlap, disjointness and zero-probability independence are distinguished exactly', () => {
    expect(finiteEvents([1, 1, 1, 1], [0, 1], [0, 2]).independent).toBe(true);
    const disjoint = finiteEvents([1, 1], [0], [1]); expect(disjoint.disjoint).toBe(true); expect(disjoint.independent).toBe(false);
    expect(finiteEvents([1, 1], [], [1]).independent).toBe(true);
    expect(finiteEvents([1, 0], [1], [0]).independent).toBe(true);
  });
  it('invalid spaces and masses fail at the model boundary', () => {
    for (const weights of [[], [0, 0], [-1, 2], [NaN], [Infinity], [.5], [1000001]]) expect(() => weightedSpace(weights)).toThrow();
    for (const mass of [[rational(-1n), rational(2n)], [rational(1n, 2n)], [{ num: 1n, den: 0n }]]) expect(() => validateMass(mass)).toThrow();
    expect(() => finiteEvents([1, 1], [2], [])).toThrow();
  });
});
it('seeded trials reproduce literal uint32 draws and do not change model probabilities', () => {
  const random = seeded(42); expect([random(), random(), random()].map(x => x * 2 ** 32)).toEqual([1083814273, 378494188, 2479403867]);
  const p = weightedSpace([1, 1, 1, 1, 1, 1]), a = finiteTrials(p, 42, 12), b = finiteTrials(p, 42, 12);
  expect(a).toEqual(b); expect(a.observations).toEqual([1, 0, 3, 1, 2, 0, 2, 0, 5, 5, 5, 2]);
  expect(a.counts.reduce((x, y) => x + y)).toBe(12); expect(sum(p)).toEqual(ONE);
  for (const seed of [-1, .5, NaN, 2 ** 32]) expect(() => seeded(seed)).toThrow();
  for (const n of [0, 2001, .5]) expect(() => finiteTrials(p, 42, n)).toThrow();
});
for (const chapter of ['experiments', 'events', 'conditional', 'independence'] as const) it(`${chapter}: every preset has synchronized exact formulas and frozen trace`, () => {
  for (const preset of ['uniform', 'weighted', 'coins', 'empty-b', 'disjoint', 'zero-a']) {
    const d = deriveFiniteLesson(chapter, finitePreset(preset));
    expect(d.view.description.length).toBeGreaterThan(50); expect(d.view.rows.length).toBeGreaterThan(3);
    expect(Object.isFrozen(d.view.trace[0]!.state)).toBe(true);
    for (const formula of [...d.view.formulas, ...d.view.trace.map(f => f.state.formula)]) expect(() => katex.renderToString(formula, { throwOnError: true, strict: 'error' })).not.toThrow();
  }
  expect(() => deriveFiniteLesson(chapter, { ...FINITE_CANONICAL, aMask: 64 })).toThrow();
});
it('union, intersection and complement membership shading uses the same outcome sets as the masses', () => {
  for (const [operation, selected] of [['union', [1, 3, 4, 5]], ['intersection', [3, 5]], ['complement', [0, 2, 4]]] as const) {
    const d = deriveFiniteLesson('events', { ...FINITE_CANONICAL, operation });
    expect(d.outcomeRows.filter(row => row.highlighted).map(row => row.index)).toEqual(selected);
  }
});
