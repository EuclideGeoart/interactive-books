import { describe, expect, it } from 'vitest';
import { stackState, stackTrace, stackValues, stackInvariants, stackOperations } from '../../src/visualizers/stack/model';
import { stackAdapter } from '../../src/visualizers/stack/adapter';
import { stackWork } from '../../src/visualizers/stack/comparison';
import { PlaybackController } from '../../src/engine/playback';

describe('stack semantics', () => {
  for (const kind of ['array', 'linked'] as const) for (const op of stackOperations) for (const values of [[], [10], [10,20,30], [1,2,3,4,5]]) {
    it(`${kind} ${op} [${values}] settles and reverses exactly`, () => {
      const trace = stackTrace(op, stackState(kind, values), 99);
      expect(stackInvariants(trace.steps.at(-1)!.state, true).every(i => i.status === 'pass')).toBe(true);
      const player = new PlaybackController(trace, () => {});
      for (let i=0; i<trace.steps.length; i++) player.next();
      for (let i=0; i<trace.steps.length; i++) player.previous();
      expect(player.state).toEqual(trace.initial);
      expect(stackValues(trace.initial)).toEqual(kind === 'array' ? values : [...values].reverse());
    });
  }
  it('array increment precedes writing and pop retains raw storage', () => {
    const trace = stackTrace('push', stackState('array'), 99);
    const increment = trace.steps.find(s => s.source === 'ap.increment')!.state;
    expect(increment.topIndex).toBe(3); expect(increment.storage[3]).toBe(0);
    const pop = stackTrace('pop', stackState('array'));
    expect(pop.steps.at(-1)!.state.storage[2]).toBe(30);
    expect(pop.steps.at(-1)!.state.topIndex).toBe(1);
  });
  it('linked pop unlinks before lifetime end and keeps a dangling local', () => {
    const trace = stackTrace('pop', stackState('linked'));
    const dead = trace.steps.find(s => s.event.type === 'Destroy')!.state;
    expect(dead.references.oldTop).not.toBe(dead.references.topNode);
    expect(dead.objects[0]!.data).toBeUndefined();
    expect(dead.objects[0]!.lifetime).toBe('destroyed');
    expect(trace.steps.at(-1)!.state.references.oldTop).toBeUndefined();
  });
  it('validates form data and exposes called helpers', () => {
    const f = new FormData(); f.set('implementation', 'linked');
    expect(stackAdapter.regions('pop',f)).toEqual(['linked-pop','linked-empty']);
    f.set('preset','custom'); f.set('values','1,,3'); expect(() => stackAdapter.build('push',f)).toThrow(/comma-separated/);
    f.set('values','1,2,3,4,5,6'); expect(() => stackAdapter.build('push',f)).toThrow(/five/);
  });
  it('counts bounded work without snapshot histories', () => {
    expect(stackWork(1024,'clear')).toMatchObject({arrayAssignments:1,linkedReleases:1024,linkedAssignments:2048});
    expect(stackWork(0,'pop').linkedReleases).toBe(0);
    expect(() => stackWork(1025,'clear')).toThrow();
  });
});

it('linked push preserves memory slots even from the five-node preset', async () => {
  const { drawStack } = await import('../../src/visualizers/stack/diagram');
  const trace = stackTrace('push', stackState('linked', [1,2,3,4,5]), 6);
  const frames=(svg:string)=>[...svg.matchAll(/data-node="([^"]+)"[^]*?<rect x="(\d+)" y="(\d+)"/g)].map(m=>[m[1],m[2],m[3]]);
  const before=frames(drawStack(trace.initial,'stack','memory',null));
  const after=frames(drawStack(trace.steps.at(-1)!.state,'stack','memory',null));
  expect(after.slice(0,5)).toEqual(before);
  const publish=trace.steps.find(s=>s.source==='lp.publish')!;
  expect(drawStack(publish.state,'stack','logical',null,publish.event)).toContain('reference-arrow active-arrow');
});
