import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { hooks, intrusiveOperations, intrusiveTrace } from '../../src/visualizers/intrusive-list/model';
import { chain, intrusiveAdapter, intrusiveInvariants } from '../../src/visualizers/intrusive-list/adapter';
import { PlaybackController } from '../../src/engine/playback';
import { sourceLines } from '../../src/engine/source';
const source = readFileSync('cpp/chapter-05/IntrusiveList.hpp', 'utf8');
for (const operation of intrusiveOperations) for (const preset of ['empty', 'single', 'three']) it(`${operation} / ${preset}: replay, reverse, source and invariants`, () => {
  const trace = intrusiveTrace(operation, preset); expect(trace).toEqual(intrusiveTrace(operation, preset));
  const tags = intrusiveAdapter.regions(operation, new FormData()).flatMap(r => sourceLines(source, r).map(l => l.tag));
  for (const step of trace.steps.filter(step => step.source !== null)) expect(tags).toContain(step.source);
  expect(intrusiveInvariants(trace.steps.at(-1)!.state, true).every(r => r.status === 'pass')).toBe(true);
  const player = new PlaybackController(trace); player.seek(player.total);
  for (let i = trace.steps.length; i > 0; i--) { expect(player.state).toEqual(trace.steps[i - 1]!.state); player.previous(); }
  expect(player.state).toEqual(trace.initial);
});
it('exposes half-rewired middle deletion and keeps the object alive after unlink', () => {
  const trace = intrusiveTrace('remove-middle'); const half = trace.steps.find(s => s.source === 'erase.forward')!.state;
  expect(half.objects[0]!.hooks.active.next).toBe(2); expect(half.objects[2]!.hooks.active.prev).toBe(1);
  expect(intrusiveInvariants(half, false)[0]!.status).toBe('pending');
  const end = trace.steps.at(-1)!.state;
  expect(end.objects[1]).toMatchObject({ value: 20, hooks: { active: { prev: -1, next: -1, owner: null } } });
  expect(chain(end, 'active')).toEqual([0, 2]);
});
it('singleton membership is detected despite two null links', () => {
  const trace = intrusiveTrace('double-insert', 'single');
  expect(trace.initial.objects[0]!.hooks.active).toEqual({ prev: -1, next: -1, owner: 'active' });
  expect(trace.steps.at(-1)!.source).toBe('front.reject');
  expect(trace.steps.at(-1)!.state.objects).toEqual(trace.initial.objects);
});
for (const selected of hooks) it(`multiple hooks: removing ${selected} leaves other memberships unchanged`, () => {
  const trace = intrusiveTrace('multiple-hooks', 'three', selected); const end = trace.steps.at(-1)!.state;
  for (const h of hooks.filter(h => h !== selected)) {
    expect(end.lists[h]).toEqual(trace.initial.lists[h]);
    expect(end.objects.map(o => o.hooks[h])).toEqual(trace.initial.objects.map(o => o.hooks[h]));
  }
  expect(end.objects.map(o => o.value)).toEqual(trace.initial.objects.map(o => o.value));
});
it('traverses each direction and detects corruption', () => {
  expect(intrusiveTrace('forward').steps.at(-1)!.state.visited).toEqual([0, 1, 2]);
  expect(intrusiveTrace('backward').steps.at(-1)!.state.visited).toEqual([2, 1, 0]);
  const state = intrusiveTrace('forward').initial; state.objects[1]!.hooks.active.prev = -1;
  expect(intrusiveInvariants(state, true)[0]!.status).toBe('fail');
});
it('inspects current only while traversal is in scope and retains visits as history', () => {
  const trace = intrusiveTrace('forward');
  const start = trace.steps.find(step => step.source === 'walk.start')!;
  const returned = trace.steps.find(step => step.source === 'walk.return')!;
  const end = trace.steps.at(-1)!;
  expect(start.state).toMatchObject({ walking: true, current: 0 });
  expect(intrusiveAdapter.inspect(start.state, null)).toContain('<code>current</code>');
  expect(returned.state).toMatchObject({ walking: true, current: -1 });
  expect(end).toMatchObject({ source: null, event: { type: 'IntrusiveScopeEnd' }, state: { walking: false, current: -1, visited: [0, 1, 2] } });
  expect(intrusiveAdapter.inspect(end.state, null)).not.toContain('<code>current</code>');
});
