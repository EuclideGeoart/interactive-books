import { describe, expect, it } from 'vitest';
import { byId, no, ok, parseNumber, parseRational, pick, type Exercise } from '../../src/platform/exercise';
import { BASE_FRAME_MS, PLAY_SPEEDS, frameDelay } from '../../src/platform/trace';

describe('parseNumber / parseRational', () => {
  it('parses plain decimals and the typographic minus; rejects everything else', () => {
    expect(parseNumber('−2.5')).toBe(-2.5);
    expect(parseNumber(' 7 ')).toBe(7);
    for (const bad of ['', '1e3', '3/4', 'two', '1,5', '--1', undefined]) expect(parseNumber(bad)).toBeNull();
  });
  it('parses exact rationals in lowest terms, with a positive denominator', () => {
    expect(parseRational('6/8')).toEqual({ num: 3n, den: 4n });
    expect(parseRational('-1/3')).toEqual({ num: -1n, den: 3n });
    expect(parseRational('0.75')).toEqual({ num: 3n, den: 4n });
    expect(parseRational('−2.5')).toEqual({ num: -5n, den: 2n });
    expect(parseRational('0')).toEqual({ num: 0n, den: 1n });
    for (const bad of ['1/0', '', 'a', '1/', undefined]) expect(parseRational(bad)).toBeNull();
  });
});

describe('pick / byId', () => {
  const feedback = { a: 'right because…', b: 'that is the sign slip' };
  it('grades a multiple-choice answer with per-choice feedback and demands a choice', () => {
    expect(pick({}, 'a', feedback)).toEqual(no('Choose an answer first.'));
    expect(pick({ choice: 'a' }, 'a', feedback)).toEqual(ok('right because…'));
    expect(pick({ choice: 'b' }, 'a', feedback)).toEqual(no('that is the sign slip'));
    expect(pick({ choice: 'z' }, 'a', feedback).message).toBe('Not quite.');
  });
  it('looks an exercise up by id', () => {
    const e: Exercise = { id: 'x', kind: 'calculation', title: 't', prompt: 'p', solution: 's', grade: () => ok('') };
    expect(byId([e], 'x')).toBe(e);
    expect(byId([e], 'y')).toBeUndefined();
  });
});

describe('trace playback timing', () => {
  it('offers 0.5×, 1× and 2×, and a faster speed means a proportionally shorter pause', () => {
    expect(PLAY_SPEEDS).toEqual([0.5, 1, 2]);
    expect(frameDelay(1)).toBe(BASE_FRAME_MS);
    expect(frameDelay(2)).toBe(BASE_FRAME_MS / 2);
    expect(frameDelay(0.5)).toBe(BASE_FRAME_MS * 2);
  });
});
