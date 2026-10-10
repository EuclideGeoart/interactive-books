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

describe('traceFrom — deep, detached snapshots', () => {
  interface S { total: number; terms: number[]; nested: { label: { text: string }; list: { v: number }[] } }
  const make = (): { input: S; event: { kind: string; at: number[] } } => ({
    input: { total: 3, terms: [1, 2], nested: { label: { text: 'a' }, list: [{ v: 1 }] } },
    event: { kind: 'add', at: [0] },
  });

  it('is unaffected by later mutation of the objects passed in (state and event)', () => {
    const { input, event } = make();
    const frames = traceFrom<S, typeof event>([{ state: input, event, explanation: 'x' }]);
    input.total = 99; input.terms.push(7); input.nested.label.text = 'changed'; input.nested.list[0]!.v = 42; input.nested.list.push({ v: 5 });
    event.kind = 'other'; event.at.push(9);
    expect(frames[0]!.state).toEqual({ total: 3, terms: [1, 2], nested: { label: { text: 'a' }, list: [{ v: 1 }] } });
    expect(frames[0]!.event).toEqual({ kind: 'add', at: [0] });
  });

  it('does not alias the input: the stored state is a different object at every depth', () => {
    const { input } = make();
    const s = traceFrom<S>([{ state: input }])[0]!.state;
    expect(s).not.toBe(input);
    expect(s.terms).not.toBe(input.terms);
    expect(s.nested.label).not.toBe(input.nested.label);
  });

  it('freezes every nested object and array in states and events', () => {
    const { input, event } = make();
    const f = traceFrom<S, typeof event>([{ state: input, event }])[0]!;
    for (const o of [f, f.state, f.state.terms, f.state.nested, f.state.nested.label, f.state.nested.list, f.state.nested.list[0], f.event, f.event!.at]) {
      expect(Object.isFrozen(o)).toBe(true);
    }
  });

  it('rejects attempts to mutate a stored state (strict mode throws; nothing changes)', () => {
    const { input } = make();
    const s = traceFrom<S>([{ state: input }])[0]!.state;
    expect(() => { s.total = 0; }).toThrow(TypeError);
    expect(() => { s.terms.push(1); }).toThrow(TypeError);
    expect(() => { s.terms[0] = 100; }).toThrow(TypeError);
    expect(() => { s.nested.label.text = 'z'; }).toThrow(TypeError);
    expect(() => { delete (s.nested as Partial<S['nested']>).list; }).toThrow(TypeError);
    expect(() => { (s as unknown as Record<string, unknown>).extra = 1; }).toThrow(TypeError);
    expect(s).toEqual({ total: 3, terms: [1, 2], nested: { label: { text: 'a' }, list: [{ v: 1 }] } });
  });

  it('gives frames that were handed the same object independent stored copies', () => {
    const working = { total: 5, terms: [1, 2] };
    const frames = traceFrom<typeof working>([{ state: working }, { state: working }]);
    expect(frames[0]!.state).not.toBe(frames[1]!.state);
    expect(frames[0]!.state.terms).not.toBe(frames[1]!.state.terms);
    expect(frames[0]!.state).toEqual(frames[1]!.state);
  });

  it('preserves shared references and cycles inside one frame', () => {
    const shared = { n: 1 };
    const cyc: { self?: unknown; a: typeof shared; b: typeof shared } = { a: shared, b: shared };
    cyc.self = cyc;
    const s = traceFrom<typeof cyc>([{ state: cyc }])[0]!.state;
    expect(s.a).toBe(s.b);
    expect(s.self).toBe(s);
    expect(Object.isFrozen(s)).toBe(true);
  });

  it('rejects state it cannot protect, instead of leaving it silently mutable', () => {
    expect(() => traceFrom([{ state: new Map([[1, 2]]) }])).toThrow(TypeError);
    expect(() => traceFrom([{ state: { when: new Date(0) } }])).toThrow(TypeError);
    expect(() => traceFrom([{ state: { f: () => 1 } }])).toThrow(TypeError);
    expect(() => traceFrom([{ state: new Float64Array(2) }])).toThrow(TypeError);
  });

  it('keeps primitives (including -0, NaN, Infinity) exactly', () => {
    const s = traceFrom<{ a: number; b: number; c: number; d: null; e: undefined; f: string; g: boolean }>(
      [{ state: { a: -0, b: NaN, c: Infinity, d: null, e: undefined, f: 'ü', g: true } }])[0]!.state;
    expect(Object.is(s.a, -0)).toBe(true);
    expect(s.b).toBeNaN();
    expect(s.c).toBe(Infinity);
    expect(s).toMatchObject({ d: null, f: 'ü', g: true });
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
