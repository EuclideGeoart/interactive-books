import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PlaybackController } from '../../src/engine/playback';
import { sourceLines } from '../../src/engine/source';
import { techniqueAdapter, techniqueDefaults, techniqueKinds, techniqueOperations } from '../../src/visualizers/techniques/adapter';
import { drawTechnique, inspectTechnique } from '../../src/visualizers/techniques/presentation';

const headers = ['45/Recursion', '46/Backtracking', '47/DivideConquer', '48/Greedy', '49/DynamicProgramming', '50/MemoTabulation'];
for (const [i, kind] of techniqueKinds.entries()) describe(kind, () => {
  const source = readFileSync(`cpp/chapter-${headers[i]}.hpp`, 'utf8');
  for (const operation of techniqueOperations[kind]) it(`${operation.id}: exact reverse, unique source target and valid initial/final states`, () => {
    const adapter = techniqueAdapter(kind), inputs = techniqueDefaults(kind);
    const trace = adapter.build(operation.id, inputs);
    const tags = adapter.regions(operation.id, inputs).flatMap(region => sourceLines(source, region).map(line => line.tag).filter(Boolean));
    expect(tags.length).toBe(new Set(tags).size);
    expect(adapter.invariants(trace.initial, true).filter(rule => rule.status === 'fail')).toEqual([]);
    const player = new PlaybackController(trace);
    for (const [stepIndex, step] of trace.steps.entries()) {
      expect(tags.filter(tag => tag === step.source), step.title).toHaveLength(1);
      player.next();
      expect(player.state).toEqual(step.state);
      expect(adapter.invariants(step.state, stepIndex === trace.steps.length - 1).filter(rule => rule.status === 'fail')).toEqual([]);
      const ids = [...step.state.nodes, ...step.state.cells].map(node => node.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const dep of step.state.dependencies) {
        expect(ids).toContain(dep.from);
        expect(ids).toContain(dep.to);
      }
      for (const node of step.state.nodes) {
        const prior = (trace.steps[stepIndex - 1]?.state ?? trace.initial).nodes.find(n => n.id === node.id);
        if (prior) expect([node.x, node.y], node.id).toEqual([prior.x, prior.y]);
      }
    }
    for (let index = trace.steps.length - 1; index >= 0; index--) {
      player.previous();
      expect(player.state).toEqual(index ? trace.steps[index - 1]!.state : trace.initial);
    }
    player.dispose();
  });
});

it('shared rendering escapes content and reports an expired frame selection', () => {
  const state = techniqueAdapter('recursion').build('recursive', techniqueDefaults('recursion')).steps[0]!.state;
  state.frames[0]!.locals = '<script>unsafe</script>';
  expect(drawTechnique(state, 'test', 'memory', null)).toContain('&lt;script&gt;');
  expect(drawTechnique(state, 'test', 'logical', null)).not.toContain('<script>unsafe');
  expect(inspectTechnique(state, 'frame:missing')).toContain('State no longer active');
});
