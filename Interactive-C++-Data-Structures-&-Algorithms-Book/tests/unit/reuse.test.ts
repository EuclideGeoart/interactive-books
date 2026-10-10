import { describe, it, expect } from 'vitest';
import { dataNode, pointerField } from '../../src/components/visualizers/primitives';
import { pointerInspector } from '../../src/components/memory/inspector';
import { initialState, measureSearch, makeTrace } from '../../src/visualizers/linked-list/model';
import { cleanSource, sourceLines } from '../../src/engine/source';
import { readFileSync } from 'node:fs';

describe('reusable chapter boundaries', () => {
  it('source region names match exactly when a helper shares their prefix', () => {
    const source = '// @begin ecs-remove\nremove(); // @trace ecs.remove\n// @end ecs-remove\n// @begin ecs\ncreate(); // @trace ecs.create\n// @end ecs';
    expect(sourceLines(source, 'ecs')).toEqual([{ number: 5, text: 'create();', tag: 'ecs.create' }]);
    expect(sourceLines(source, 'ecs-remove')).toEqual([{ number: 2, text: 'remove();', tag: 'ecs.remove' }]);
    expect(() => sourceLines(source, 'ec')).toThrow('Missing C++ region');
  });
  it('the SVG node and inspector accept multiple pointer fields without linked-list logic', () => {
    const state = initialState([10]);
    state.objects[0]!.pointers = { prev: null, next: null };
    const node = dataNode(state.objects[0]!, { x: 0, y: 0 }, false, false, [], ['prev', 'next']);
    expect(node).toContain('width="188"');
    expect(node).toContain('>prev</text>');
    expect(node).toContain('>next</text>');
    expect(pointerInspector(state, '0xA120')).toContain('<dt>prev</dt>');
    expect(pointerField('<invalid>', 0, 0)).toContain('&lt;invalid&gt;');
    state.objects[0]!.lifetime = 'freed';
    state.objects[0]!.pointers = {};
    delete state.objects[0]!.data;
    const freed = dataNode(state.objects[0]!, { x: 0, y: 0 }, false, false, [], ['prev', 'next']);
    expect(freed).toContain('width="188"');
    expect(freed).not.toContain('>prev</text>');
    expect(freed).toContain('no valid fields');
  });
  it('downloaded code preserves the canonical line numbers while removing teaching annotations', () => {
    const source = readFileSync('cpp/chapter-01/SinglyLinkedList.hpp', 'utf8');
    const clean = cleanSource(source);
    expect(clean).not.toContain('@trace');
    expect(clean.split('\n').length).toBe(source.split('\n').length);
    for (const line of sourceLines(source).filter(line => line.tag)) {
      expect(clean.split('\n')[line.number - 1]?.trim()).toBe(line.text.trim());
    }
  });
  for (const n of [8, 32, 128, 1024]) {
    it(`counts an actual traversal of ${n} objects`, () => {
      const state = initialState(Array.from({ length: n }, (_, index) => index - Math.floor(n / 2)));
      expect(measureSearch(state, state.objects.at(-1)!.data!)).toEqual({ visits: n, comparisons: n, found: true });
      expect(measureSearch(state, 999)).toEqual({ visits: n, comparisons: n, found: false });
      expect(measureSearch(state, state.objects[0]!.data!).visits).toBe(1);
    });
  }
  it('counter agrees with the operation trace on duplicate and missing targets', () => {
    for (const values of [[], [10], [10, 10, 20]]) for (const target of [10, 20, 99]) {
      const initial = initialState(values);
      const final = makeTrace('search', initial, target).steps.at(-1)!.state;
      expect(measureSearch(initial, target).visits).toBe(final.visited.length);
      expect(measureSearch(initial, target).comparisons).toBe(final.comparisons);
    }
  });
});
