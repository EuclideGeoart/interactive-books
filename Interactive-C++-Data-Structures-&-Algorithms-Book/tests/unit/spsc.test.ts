import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PlaybackController } from '../../src/engine/playback';
import { sourceLines } from '../../src/engine/source';
import { buildSpscTrace, initialSpscState, popSpsc, pushSpsc, queuedSlots, spscInvariants, traceSpscActions, type SpscAction } from '../../src/visualizers/spsc/model';
import { drawSpsc, inspectSpsc, spscAdapter, spscDefaults, spscOperations } from '../../src/visualizers/spsc/adapter';
import { buildSpscFixture } from '../../scripts/spsc-fixture.mjs';

const header = readFileSync('cpp/chapter-59/SpscRing.hpp', 'utf8');
for (const operation of spscOperations) it(`${operation.id}: immutable playback, source tags and invariant policy`, () => {
  const form = spscDefaults(), trace = buildSpscTrace(operation.id, form);
  const tags = spscAdapter.regions(operation.id, form).flatMap(r => sourceLines(header, r).map(line => line.tag).filter(Boolean));
  expect(new Set(tags).size).toBe(tags.length);
  expect(spscInvariants(trace.initial).filter(i => i.status === 'fail')).toEqual([]);
  const player = new PlaybackController(trace);
  for (const step of trace.steps) {
    if (step.source) expect(tags.filter(tag => tag === step.source)).toHaveLength(1);
    else expect(step.state.unsafe).toBe(true);
    player.next(); expect(player.state).toEqual(step.state);
    expect(spscInvariants(step.state).some(i => i.status === 'fail')).toBe(step.state.unsafe);
  }
  for (let i = trace.steps.length - 1; i >= 0; i--) { player.previous(); expect(player.state).toEqual(i ? trace.steps[i - 1]!.state : trace.initial); }
  player.dispose();
  expect(buildSpscTrace(operation.id, form)).toEqual(trace);
});

describe('independent FIFO oracle and native statement parity', () => {
  const fixtures: { count: number; initial: number[]; actions: SpscAction[] }[] = [];
  for (let count = 2; count <= 8; count++) for (let bits = 0; bits < 64; bits++) fixtures.push({ count, initial: [], actions: Array.from({ length: 6 }, (_, i) => bits & 1 << i ? { type: 'push', value: i - 3 } : { type: 'pop' }) });
  for (let count = 2; count <= 8; count++) fixtures.push({ count, initial: Array.from({ length: count - 1 }, (_, i) => i + 10), actions: Array.from({ length: 24 }, (_, i) => i % 3 ? { type: 'pop' } : { type: 'push', value: 100 + i }) });
  it('matches every native tagged payload/index state in 455 histories', () => {
    const native = buildSpscFixture()(fixtures);
    fixtures.forEach((fixture, index) => {
      const trace = traceSpscActions(fixture.count, fixture.initial, fixture.actions);
      expect(native[index], `history ${index}`).toEqual(trace.steps.map(step => ({ tag: step.source, read: step.state.read, write: step.state.write, slots: step.state.slots })));
    });
  }, 30000);
  it('matches an independent array queue after each operation', () => {
    for (const fixture of fixtures) {
      const s = initialSpscState(fixture.count, fixture.initial), queue = [...fixture.initial], consumed: number[] = [];
      for (const action of fixture.actions) {
        if (action.type === 'push') { if (queue.length < fixture.count - 1) queue.push(action.value); }
        else if (queue.length) consumed.push(queue.shift()!);
        for (const _ of action.type === 'push' ? pushSpsc(s, action.value) : popSpsc(s)) expect(spscInvariants(s).filter(i => i.status === 'fail')).toEqual([]);
        expect(queuedSlots(s).map(i => s.slots[i])).toEqual(queue);
        expect(s.consumed).toEqual(consumed);
      }
    }
  });
});

it('exhausts source-level interleavings of one push and one pop', () => {
  let schedules = 0;
  for (const initial of [[], [11]]) for (const count of [2, 3]) {
    const pending: string[] = [''];
    while (pending.length) {
      const prefix = pending.pop()!, s = initialSpscState(count, initial), producer = pushSpsc(s, 42), consumer = popSpsc(s);
      let pDone = false, cDone = false;
      for (const thread of prefix) {
        if (thread === 'P') pDone = producer.next().done === true;
        else cDone = consumer.next().done === true;
        expect(spscInvariants(s).filter(i => i.status === 'fail'), prefix).toEqual([]);
      }
      if (pDone && cDone) { schedules++; expect(s.consumed.every((v, i) => v === s.accepted[i])).toBe(true); }
      else { if (!pDone) pending.push(prefix + 'P'); if (!cDone) pending.push(prefix + 'C'); }
    }
  }
  expect(schedules).toBeGreaterThan(1000);
}, 30000);

it('exposes unpublished payload and retained-slot handoffs separately', () => {
  const trace = buildSpscTrace('publication', spscDefaults());
  const written = trace.steps.find(s => s.source === 'spsc.push.payload')!.state;
  expect(written.slots[0]).toBe(42); expect(written.write).toBe(0);
  expect(trace.steps.some(s => s.source === 'spsc.pop.check' && s.state.result.startsWith('Empty'))).toBe(true);
  expect(trace.steps.at(-1)!.state.consumed).toEqual([42]);
  const reuse = buildSpscTrace('reuse', spscDefaults());
  expect(reuse.steps.some(s => s.source === 'spsc.push.check' && s.state.result.startsWith('Full'))).toBe(true);
  expect(reuse.steps.at(-1)!.state.accepted).toEqual([1, 2, 3, 42]);
});

it('renders fixed coordinates and readable lifetime/permission details', () => {
  const trace = buildSpscTrace('push', spscDefaults());
  const positions = (html: string) => [...html.matchAll(/<rect x="(\d+)" y="(\d+)" width="134"/g)].map(m => m.slice(1));
  for (const view of ['logical', 'memory'] as const) for (const step of trace.steps) {
    expect(positions(drawSpsc(step.state, 'test', view, null))).toEqual(positions(drawSpsc(trace.initial, 'test', view, null)));
    expect(inspectSpsc(step.state, 'slot:0')).toContain('LIVE int');
  }
  const unsafe = buildSpscTrace('break-publication', spscDefaults()).steps.at(-1)!.state;
  expect(inspectSpsc(unsafe, 'slot:0')).toContain('No safe queue payload');
});

it.each([['slots', '1'], ['slots', '9'], ['slots', '3.5'], ['values', '1,2,3,4'], ['values', 'NaN'], ['values', '1,,2'], ['value', '1000001']])('rejects malformed %s=%s before a trace', (name, value) => {
  const form = spscDefaults(); form.set(name, value);
  expect(() => buildSpscTrace('push', form)).toThrow();
});

it('detects deliberate FIFO corruption independently of source parity', () => {
  const s = initialSpscState(4, [1, 2]); s.slots[0] = 8;
  expect(spscInvariants(s).find(rule => rule.name.startsWith('FIFO'))?.status).toBe('fail');
});
