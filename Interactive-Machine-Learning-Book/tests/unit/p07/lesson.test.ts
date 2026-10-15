import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { compile } from '@mdx-js/mdx';
import remarkMath from 'remark-math';
import manifest from '../../../src/parts/p07/manifest.json';
import { deriveLab, editPoint, initialLab, movePoint, pointerPoint, preset, tradeoffTrace } from '../../../src/parts/p07/lesson';
import { decision, type SVMState } from '../../../src/parts/p07/model/svm';
import review from '../../../fixtures/p07/review-regressions.json';
const near = (a: number, b: number, tolerance = 2e-10) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tolerance * (1 + Math.abs(b)));

describe('one authoritative SVM lesson state, geometry and immutable replay', () => {
  it('projects real solved lines, point coordinates and physical label/target sizes', () => {
    const s = preset(initialLab('hard'), 'anchor');
    for (const width of [260, 320, 560]) {
      const lab = deriveLab(s, width);
      expect(lab.points.map(p => [p.cx, p.cy])).toEqual([[208, 240], [272, 240]]);
      expect(lab.fontSize * width / 480).toBeGreaterThanOrEqual(14.1);
      expect(2 * lab.hitRadius * width / 480).toBeGreaterThanOrEqual(44);
      for (const line of lab.lines) for (const [x, y] of [[line.x1, line.y1], [line.x2, line.y2]]) near(decision(s, lab.numerical, [(x! - 240) / 32, (240 - y!) / 32]), line.level);
      expect(lab.speech).toContain('solved'); expect(lab.inspector.some(row => row.value.includes('solved'))).toBe(true);
    }
  });
  it('does not draw hard infeasibility or invent distance for zero normal', () => {
    const hard = deriveLab(preset(initialLab('hard'), 'coincident'));
    expect(hard.lines).toEqual([]); expect(hard.surface).toBeNull(); expect(hard.numerical.status).toBe('infeasible');
    const soft = deriveLab(preset(initialLab('soft'), 'coincident'));
    expect(soft.lines).toEqual([]); expect(soft.numerical.halfMargin).toBeNull();
  });
  it('samples actual nonlinear scores and contours independently of training-row drawing', () => {
    const lab = deriveLab(initialLab('kernel'));
    expect(lab.numerical.status).toBe('approximate'); expect(lab.surface).not.toBeNull(); expect(lab.surface!.segments.length).toBeGreaterThan(0);
    for (const [i, j] of [[0, 0], [16, 16], [24, 20]]) near(lab.surface!.values[i!]![j!]!, decision(lab.state, lab.numerical, [-6 + j! * 12 / 32, -6 + i! * 12 / 32]));
    expect(lab.numerical.rows.every(row => row.signedDistance === null)).toBe(true);
  });
  it('keeps replay detached and edits from the displayed frame', () => {
    const s = initialLab('soft'), frames = tradeoffTrace(s), before = JSON.stringify(frames);
    const displayed = frames[1]!.state, edited = editPoint(displayed, 'a', { x: -.25 });
    expect(edited.C).toBe(.25); expect(edited.points[0]!.x[0]).toBe(-.25);
    expect(JSON.stringify(frames)).toBe(before); expect(Object.isFrozen(frames[0]!.state.points[0]!.x)).toBe(true);
    expect(s.points[0]!.x[0]).toBe(-2);
  });
  it('gives numeric, keyboard and snapped pointer equivalents on the common lattice', () => {
    const s = preset(initialLab('hard'), 'anchor');
    const keyboard = movePoint(s, 'a', 'ArrowRight'), numeric = editPoint(s, 'a', { x: -.9 });
    expect(keyboard).toEqual(numeric);
    expect(pointerPoint(211.2, 240, { left: 0, top: 0, width: 480, height: 480 })).toEqual({ x: -.9, y: 0 });
    expect(pointerPoint(0, 0, { left: 0, top: 0, width: 480, height: 480 })).toEqual({ x: -5, y: 5 });
    const precise = editPoint(s, 'a', { x: -.912345 }); expect(precise.points[0]!.x[0]).toBe(-.912345);
    expect(() => editPoint(s, 'missing', { x: 0 })).toThrow(); expect(() => editPoint(s, 'a', { x: NaN })).toThrow();
    expect(() => editPoint(s, 'a', { label: 1 })).toThrow(/Both labels/);
  });
  it('keeps training metrics distinct from hinge objectives and preserves provenance', () => {
    const s = { ...preset(initialLab('soft'), 'anchor'), C: .25 }, lab = deriveLab(s);
    expect(lab.numerical.rows.every(row => row.margin > 0)).toBe(true); expect(lab.numerical.rows.reduce((total, row) => total + row.hinge, 0)).toBe(1);
    expect(lab.numerical.primal).toBe(.375); expect('seed' in lab.state).toBe(false);
  });
  it('unconditionally withholds lines and mesh for the real polynomial diagnostic failure', () => {
    const s = preset(initialLab('kernel'), 'diagnosticFailure'), lab = deriveLab(s);
    expect(s).toEqual(review.diagnosticFailure.input);
    expect(() => preset(initialLab('hard'), 'diagnosticFailure')).toThrow(/kernel laboratory/);
    expect(lab.numerical.status).toBe('failed'); expect(lab.numerical.kkt).toBeGreaterThan(2e-5);
    expect(lab.lines).toEqual([]); expect(lab.surface).toBeNull(); expect(lab.speech).toContain('Diagnostic failure');
    expect(lab.inspector.some(row => row.value === 'failed')).toBe(true);
    expect(() => decision(s, lab.numerical, [0, 0])).toThrow(/successful fit/);
  });
  it('withholds any fit failing its fixed diagnostics on bounded stress data', () => {
    const base = initialLab('kernel');
    const s: SVMState = { ...base, C: 20, kernel: { kind: 'polynomial', gamma: 2, coef0: 2, degree: 4 }, points: [{ id: 'a', x: [-5, -5], y: -1 }, { id: 'b', x: [-4.999, -5], y: 1 }, { id: 'c', x: [5, 4.999], y: -1 }, { id: 'd', x: [5, 5], y: 1 }] };
    const lab = deriveLab(s);
    expect(lab.numerical.iterations).toBeLessThanOrEqual(1200);
    if (lab.numerical.status === 'failed') { expect(lab.lines).toEqual([]); expect(lab.surface).toBeNull(); expect(lab.speech).toContain('failure'); }
    else { expect(lab.numerical.kkt).toBeLessThanOrEqual(2e-5); expect(Math.abs(lab.numerical.gap!)).toBeLessThanOrEqual(1e-5 * (1 + lab.numerical.primal!)); }
  });
});

describe('Part VII chapter MDX compilation sanity', () => {
  for (const chapter of manifest.chapters) it(`${chapter.id} compiles with math syntax`, async () => {
    const source = readFileSync(`src/parts/p07/chapters/${chapter.slug}.mdx`, 'utf8');
    await expect(compile(source.replace(/^---[\s\S]*?---\n/, ''), { remarkPlugins: [remarkMath] })).resolves.toBeTruthy();
  });
});
