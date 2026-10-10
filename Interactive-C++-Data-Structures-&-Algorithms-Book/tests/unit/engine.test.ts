import { describe, it, expect, vi, afterEach } from 'vitest';
import { applyEvent } from '../../src/engine/memory';
import { listValues, asciiList } from '../../src/visualizers/linked-list/topology';
import { PlaybackController } from '../../src/engine/playback';
import { initialState, makeTrace, makeBrokenTrace, operations } from '../../src/visualizers/linked-list/model';
import { checkInvariants } from '../../src/visualizers/linked-list/invariants';

describe('semantic memory and ownership', () => {
  it('links the old head before publishing the new head', () => {
    const trace = makeTrace('insert-head', initialState(), 5);
    const link = trace.steps.find(step => step.source === 'head.link')!;
    expect(link.state.references.head).toBe('0xA120');
    expect(link.state.objects.at(-1)?.pointers.next).toBe('0xA120');
    expect(listValues(trace.steps.at(-1)!.state)).toEqual([5, 10, 20, 30]);
    expect(trace.initial.objects).toHaveLength(3);
  });
  it('detaches while live, ends lifetime, frees storage, and leaves locals dangling until scope ends', () => {
    const trace = makeTrace('delete', initialState(), 10);
    const detached = trace.steps.find(step => step.source === 'delete.head')!;
    expect(detached.state.objects[0]?.lifetime).toBe('live');
    expect(checkInvariants(detached.state, false).find(rule => rule.name.includes('reachable'))?.status).toBe('pending');
    for (const step of trace.steps.filter(step => ['Destroy', 'Free'].includes(step.event.type))) {
      expect(step.state.objects[0]?.data).toBeUndefined();
      expect(step.state.objects[0]?.pointers).toEqual({});
      expect(step.state.references.nodeToDelete).toBe('0xA120');
    }
    const final = trace.steps.at(-1)!.state;
    expect(final.references).toEqual({ head: '0xD800' });
    expect(checkInvariants(final, true).every(rule => rule.status === 'pass')).toBe(true);
    expect(() => applyEvent(final, { type: 'Visit', address: '0xA120' })).toThrow('freed');
    expect(() => applyEvent(final, { type: 'Free', address: '0xA120' })).toThrow();
  });
  for (const mode of ['lost', 'cycle', 'dangling'] as const) {
    it(`detects ${mode} corruption without unsafe traversal`, () => {
      const state = makeBrokenTrace(mode).steps.at(-1)!.state;
      expect(checkInvariants(state, true).some(rule => rule.status === 'fail')).toBe(true);
      expect(asciiList(state).length).toBeGreaterThan(0);
    });
  }
  for (const operation of operations) {
    for (const values of [[], [10], [10, 20, 30], [10, 10, 20]]) {
      it(`${operation} preserves final invariants for [${values}]`, () => {
        const trace = makeTrace(operation, initialState(values), 10, 10);
        expect(checkInvariants(trace.steps.at(-1)!.state, true).every(rule => rule.status === 'pass')).toBe(true);
        expect(trace).toEqual(makeTrace(operation, initialState(values), 10, 10));
      });
    }
  }
  it('reports unsuccessful operations and validates input', () => {
    expect(makeTrace('delete', initialState(), 99).steps.at(-1)!.state.result).toContain('not found');
    expect(() => initialState([NaN])).toThrow();
    expect(() => makeTrace('search', initialState(), 1.5)).toThrow();
  });
});

describe('deterministic playback', () => {
  afterEach(() => vi.useRealTimers());
  it('supports boundaries, reverse, reset, pause, speed, and replay without timers leaking', () => {
    vi.useFakeTimers();
    const trace = makeTrace('insert-head', initialState(), 5);
    const changed = vi.fn();
    const player = new PlaybackController(trace, changed);
    player.previous(); expect(player.index).toBe(0);
    player.next(); const first = structuredClone(player.state);
    player.next(); player.previous(); expect(player.state).toEqual(first);
    player.reset(); expect(player.state).toEqual(trace.initial);
    player.play(); player.play(); vi.advanceTimersByTime(1100); expect(player.index).toBe(1);
    player.pause(); vi.advanceTimersByTime(10000); expect(player.index).toBe(1);
    player.setSpeed(2); player.play(); vi.advanceTimersByTime(550); expect(player.index).toBe(2);
    vi.runAllTimers(); expect(player.index).toBe(player.total); expect(player.playing).toBe(false);
    player.play(); expect(player.index).toBe(0);
    player.dispose(); expect(vi.getTimerCount()).toBe(0);
    player.seek(999); expect(player.index).toBe(player.total);
  });
});
