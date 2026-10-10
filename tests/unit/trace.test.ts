import { describe, expect, it } from 'vitest';
import { atEnd, atStart, cursorAt, next, previous, reset, seek, traceFrom } from '../../src/platform/trace';

describe('traceFrom — immutable semantic frames', () => {
  const frames = traceFrom<{ total: number }, string>([{ state: { total: 0 } }, { state: { total: 3 }, event: 'add 3', explanation: 'first term' }, { state: { total: 5 }, event: 'add 2' }]);
  it('assigns consecutive indices and freezes every frame', () => {
    expect(frames.map(f => f.index)).toEqual([0, 1, 2]);
    expect(Object.isFrozen(frames)).toBe(true);
    expect(frames.every(f => Object.isFrozen(f))).toBe(true);
  });
  it('preserves state, event and explanation', () => {
    expect(frames[1]).toMatchObject({ index: 1, state: { total: 3 }, event: 'add 3', explanation: 'first term' });
  });
});

describe('TraceCursor — selection, never mutation', () => {
  it('clamps at both ends', () => {
    const c = cursorAt(4);
    expect(previous(c).index).toBe(0);
    expect(next(next(next(next(c)))).index).toBe(3);
    expect(seek(c, 99).index).toBe(3);
    expect(seek(c, -5).index).toBe(0);
    expect(seek(c, 1.9).index).toBe(1);
  });
  it('reports start / end and resets to the canonical first frame', () => {
    const c = cursorAt(3, 2);
    expect(atEnd(c)).toBe(true);
    expect(atStart(c)).toBe(false);
    expect(reset(c).index).toBe(0);
    expect(atStart(reset(c))).toBe(true);
  });
  it('is a pure value: operations return a new cursor and leave the old one untouched', () => {
    const c = cursorAt(3, 1);
    const n = next(c);
    expect(c.index).toBe(1);
    expect(n.index).toBe(2);
  });
  it('requires at least one frame', () => {
    expect(() => cursorAt(0)).toThrow(RangeError);
  });
  it('going back selects an earlier canonical frame (round trip is exact)', () => {
    let c = cursorAt(5);
    const seen: number[] = [];
    for (let i = 0; i < 4; i++) { c = next(c); seen.push(c.index); }
    for (let i = 0; i < 4; i++) { c = previous(c); seen.push(c.index); }
    expect(seen).toEqual([1, 2, 3, 4, 3, 2, 1, 0]);
  });
});
