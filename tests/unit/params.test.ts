import { describe, expect, it } from 'vitest';
import { clampToDomain, parseParam, snapToGrid, stepValue, type Grid, type ParamSpec } from '../../src/platform/params';

const x: ParamSpec = { id: 'x', name: 'x-component', symbolTex: 'x', symbolText: 'x', domain: { min: -6, max: 6 }, default: 3, step: 0.1, onInvalid: 'reject' };
const lattice = (step: number): Grid => ({ kind: 'lattice', step });
const free: Grid = { kind: 'free' };

describe('parseParam — invalid input is rejected with a reason, never silently repaired', () => {
  it('accepts plain decimals, including the typographic minus U+2212', () => {
    expect(parseParam(x, '3')).toEqual({ ok: true, value: 3 });
    expect(parseParam(x, ' 2.5 ')).toEqual({ ok: true, value: 2.5 });
    expect(parseParam(x, '−2')).toEqual({ ok: true, value: -2 });
    expect(parseParam(x, '.5')).toEqual({ ok: true, value: 0.5 });
  });
  it('normalises "-0" to +0', () => {
    const r = parseParam(x, '-0');
    expect(r.ok && Object.is(r.value, 0)).toBe(true);
  });
  it('rejects empty, non-numeric, hex, infinity and comma-decimal text', () => {
    for (const bad of ['', '  ', 'abc', '0x10', 'Infinity', 'NaN', '1,5', '2 3', '--1']) expect(parseParam(x, bad).ok, bad).toBe(false);
  });
  it('rejects out-of-domain values and names the domain', () => {
    const r = parseParam(x, '7');
    expect(r).toEqual({ ok: false, reason: 'x must be between −6 and 6.' });
    expect(parseParam(x, '-6.0001').ok).toBe(false);
    expect(parseParam(x, '6').ok).toBe(true);
    expect(parseParam(x, '-6').ok).toBe(true);
  });
});

describe('snapToGrid', () => {
  it('snaps to the nearest lattice point and returns the double nearest the decimal (no 2.3000000000000003)', () => {
    expect(snapToGrid(2.37, lattice(1))).toBe(2);
    expect(snapToGrid(2.34, lattice(0.1))).toBe(2.3);
    expect(snapToGrid(0.1 + 0.2, lattice(0.1))).toBe(0.3);
    expect(snapToGrid(2.74, lattice(0.5))).toBe(2.5);
  });
  it('never returns −0', () => {
    expect(Object.is(snapToGrid(-0.2, lattice(1)), 0)).toBe(true);
    expect(Object.is(snapToGrid(-0, free), 0)).toBe(true);
  });
  it('free movement is rounded to 6 decimals only to remove representation noise', () => {
    expect(snapToGrid(1.23456789, free)).toBe(1.234568);
  });
});

describe('stepValue — keyboard steps', () => {
  it('moves one lattice step; Shift (coarse) moves five; results are clamped to the domain', () => {
    expect(stepValue(3, 1, x, lattice(1), false)).toBe(4);
    expect(stepValue(3, -1, x, lattice(1), false)).toBe(2);
    expect(stepValue(3, 1, x, lattice(1), true)).toBe(6); // 3 + 5 = 8 → clamped
    expect(stepValue(-5, -1, x, lattice(1), true)).toBe(-6);
  });
  it('from a non-lattice value it lands on the lattice', () => {
    expect(stepValue(2.37, 1, x, lattice(1), false)).toBe(3);
    expect(stepValue(5.5, 1, x, lattice(1), false)).toBe(6); // 6.5 → snap 7 → clamp 6
  });
  it('free mode uses the parameter step', () => {
    expect(stepValue(3, -1, x, free, false)).toBe(2.9);
    expect(stepValue(0.1, -1, x, free, false)).toBe(0);
  });
  it('clampToDomain', () => {
    expect(clampToDomain(9, x.domain)).toBe(6);
    expect(clampToDomain(-9, x.domain)).toBe(-6);
    expect(clampToDomain(2, x.domain)).toBe(2);
  });
});
