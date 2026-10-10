import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { poolOperations, poolTrace } from '../../src/visualizers/allocator/model';
import { poolAdapter, poolInvariants } from '../../src/visualizers/allocator/adapter';
import { PlaybackController } from '../../src/engine/playback';
import { sourceLines } from '../../src/engine/source';
const header = readFileSync('cpp/chapter-04/Pool.hpp', 'utf8');
describe('pool storage and lifetime', () => {
  for (const op of poolOperations) it(`${op}: deterministic reversible bounded trace and covered source`, () => {
    const trace = poolTrace(op); expect(trace).toEqual(poolTrace(op));
    const tags = poolAdapter.regions(op, new FormData()).flatMap(r => sourceLines(header, r).map(l => l.tag));
    for (const step of trace.steps.filter(step => step.source !== null)) expect(tags).toContain(step.source);
    const playback = new PlaybackController(trace); playback.seek(playback.total);
    expect(poolInvariants(playback.state, true).every(i => i.status === 'pass')).toBe(true);
    for (let i = trace.steps.length; i > 0; i--) { expect(playback.state).toEqual(trace.steps[i - 1]!.state); playback.previous(); }
    expect(playback.state).toEqual(trace.initial);
  });
  it('separates head removal, reservation, construction, destruction and head publication', () => {
    const trace = poolTrace('cycle'); const at = (tag: string) => trace.steps.find(s => s.source === tag)!.state;
    expect(at('allocate.head').head).toBe(1); expect(at('allocate.head').slots[0]!.phase).toBe('free');
    expect(at('allocate.reserve').slots[0]!.alive).toBe(false);
    expect(at('construct.object').slots[0]).toMatchObject({ alive: true, phase: 'reserved', next: -2 });
    expect(at('destroy.object').slots[0]).toMatchObject({ alive: false, phase: 'live', value: null });
    expect(at('deallocate.link').slots[0]!.next).toBe(1); expect(at('deallocate.link').head).toBe(1);
    expect(at('deallocate.head').head).toBe(0);
  });
  it('reuses storage with a different value and restores failed construction', () => {
    const reused = poolTrace('reuse', 1, 23).steps.at(-1)!.state;
    expect(reused.slots[0]).toMatchObject({ alive: true, value: 24 });
    const failed = poolTrace('failure', 2).steps.at(-1)!.state;
    expect(failed.head).toBe(0); expect(failed.slots.every(s => !s.alive)).toBe(true);
  });
  it('validates inputs and detects a corrupted free list without following it forever', () => {
    expect(() => poolTrace('allocate', 7)).toThrow('1–6');
    expect(() => poolTrace('allocate', 2, NaN)).toThrow('integer');
    const state = poolTrace('cycle').initial; state.slots[0]!.next = 0;
    expect(poolInvariants(state, true)[0]!.status).toBe('fail');
  });
});
it('exposes the saved block only inside its native function scope', () => {
  const trace = poolTrace('cycle');
  const at = (source: string) => trace.steps.find(step => step.source === source)!;
  expect(at('allocate.block').state.block).toBe(0);
  expect(at('allocate.return').state.block).toBe(0);
  expect(at('construct.validate').state.block).toBe(-1);
  expect(at('deallocate.block').state.block).toBe(0);
  expect(trace.steps.at(-1)).toMatchObject({ source: null, event: { type: 'PoolScopeEnd' }, state: { block: -1 } });
  expect(trace.steps.filter(step => step.source === null)).toHaveLength(2);
  expect(poolAdapter.inspect(at('allocate.block').state, null)).toContain('data-local-reference="block"');
  expect(poolAdapter.inspect(at('construct.validate').state, null)).not.toContain('data-local-reference="block"');
});
