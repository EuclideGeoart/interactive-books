import { expect, it } from 'vitest';
import {
  binaryState,
  binaryTrace,
  binaryMetrics,
  binaryInvariants,
  binaryScene,
  type BinaryState,
  type BinaryOperation,
} from '../../src/visualizers/binary-tree/model';
import { binaryTreeAdapter } from '../../src/visualizers/binary-tree/adapter';
import { bstAdapter } from '../../src/visualizers/bst/adapter';
import { traversalAdapter } from '../../src/visualizers/traversal/adapter';
import { treeMutationAdapter } from '../../src/visualizers/tree-mutation/adapter';
const after = (s: BinaryState, op: BinaryOperation, v = 42) =>
  binaryTrace(op, s, v).steps.at(-1)!.state;
const keys = (s: BinaryState) =>
  s.nodes
    .filter((n) => n.lifetime === 'live')
    .map((n) => n.value)
    .sort((a, b) => a - b);
it('A–B–C–D–E hierarchy, height in edges, root depth and level count', () => {
  const s = binaryState(),
    m = binaryMetrics(s);
  expect(s.nodes.map((n) => [n.value, n.left, n.right])).toEqual([
    [65, 1, 2],
    [66, 3, 4],
    [67, null, null],
    [68, null, null],
    [69, null, null],
  ]);
  expect(m.treeHeight).toBe(2);
  expect([...m.depth.values()]).toEqual([0, 1, 2, 2, 1]);
  expect(m.height.get(1)).toBe(1);
  expect(binaryMetrics(binaryState([])).treeHeight).toBe(-1);
  const scene = binaryScene(s);
  expect(scene.nodes[0]!.label).toBe('A');
  expect(
    scene.nodes.every((n) => n.links.every((l) => l.name !== 'parent')),
  ).toBe(true);
  expect(scene.nodes[1]!.address > scene.nodes[2]!.address).toBe(false); // addresses are deterministic, not a level-order contiguous array
  expect(
    Number.parseInt(scene.nodes[1]!.address.slice(2), 16) -
      Number.parseInt(scene.nodes[0]!.address.slice(2), 16),
  ).not.toBe(24);
});
for (const [op, expected] of [
  ['preorder', [65, 66, 68, 69, 67]],
  ['inorder', [68, 66, 69, 65, 67]],
  ['postorder', [68, 69, 66, 67, 65]],
  ['bfs', [65, 66, 67, 68, 69]],
] as const) {
  it(`${op}: output follows call-stack or queue mechanics`, () => {
    const trace = binaryTrace(op, binaryState());
    expect(trace.steps.at(-1)!.state.output).toEqual(expected);
    expect(trace.steps.at(-1)!.state.frames).toEqual([]);
    expect(trace.steps.at(-1)!.state.queue).toEqual([]);
    if (op === 'bfs') {
      const front = trace.steps.find((s) => s.source === 'bfs.front')!,
        pop = trace.steps.find((s) => s.source === 'bfs.pop')!;
      expect(front.state.queue).toEqual([0]);
      expect(pop.state.queue).toEqual([]);
      expect(pop.state.output).toEqual([]);
    } else {
      expect(Math.max(...trace.steps.map((s) => s.state.frames.length))).toBe(
        4,
      );
      expect(
        trace.steps.some(
          (s) =>
            s.source === 'dfs.null' && s.state.frames.at(-1)?.node === null,
        ),
      ).toBe(true);
    }
  });
}
it('empty traversal performs no output but DFS still executes its null frame', () => {
  for (const op of ['preorder', 'inorder', 'postorder', 'bfs'] as const)
    expect(after(binaryState([]), op).output).toEqual([]);
});
it('search 62 takes every equality and branch comparison along 50 → 75 → 60 → 62', () => {
  const t = binaryTrace(
    'search',
    binaryState([50, 25, 75, 10, 35, 60, 90, 62], true),
    62,
  );
  expect(
    t.steps
      .filter((s) => s.source === 'search.equal')
      .map((s) => s.state.nodes[s.state.refs.current!]!.value),
  ).toEqual([50, 75, 60, 62]);
  expect(t.steps.filter((s) => s.source === 'search.less')).toHaveLength(3);
});
for (const values of [
  [],
  [50],
  [50, 25, 75, 10, 35, 60, 90, 62],
  [1, 2, 3, 4, 5],
  [-999, 0, 999],
])
  for (const value of [-999, 0, 10, 25, 50, 62, 75, 999])
    it(`set semantics and strict neighbors [${values}] query ${value}`, () => {
      const s = binaryState(values, true),
        set = [...new Set(values)].sort((a, b) => a - b);
      const inserted = after(s, 'insert', value);
      expect(keys(inserted)).toEqual(
        [...new Set([...values, value])].sort((a, b) => a - b),
      );
      expect(keys(after(s, 'erase', value))).toEqual(
        set.filter((v) => v !== value),
      );
      const next = set.find((v) => v > value),
        prev = set.filter((v) => v < value).at(-1);
      expect(after(s, 'successor', value).result).toBe(
        next === undefined ? 'No strict neighbor; nullptr' : `Result: ${next}`,
      );
      expect(after(s, 'predecessor', value).result).toBe(
        prev === undefined ? 'No strict neighbor; nullptr' : `Result: ${prev}`,
      );
      for (const result of [
        inserted,
        after(s, 'erase', value),
        after(s, 'clear'),
      ])
        expect(
          binaryInvariants(result, true).every((i) => i.status === 'pass'),
        ).toBe(true);
    });
for (const values of [
  [50],
  [50, 25],
  [50, 75],
  [50, 25, 75],
  [50, 25, 75, 60, 90, 55, 57],
])
  it(`root erasure owns exactly the survivors [${values}]`, () => {
    const s = binaryState(values, true),
      trace = binaryTrace('erase', s, 50),
      end = trace.steps.at(-1)!.state;
    expect(keys(end)).toEqual(
      values.filter((v) => v !== 50).sort((a, b) => a - b),
    );
    expect(end.nodes.filter((n) => n.lifetime === 'freed')).toHaveLength(1);
    const destroy = trace.steps.find((s) => s.event.type === 'Destroy')!,
      free = trace.steps.find((s) => s.event.type === 'Free')!;
    expect(
      binaryScene(destroy.state).nodes.find((n) => n.lifetime === 'destroyed')!
        .fields,
    ).toEqual([]);
    expect(
      binaryScene(free.state).nodes.find((n) => n.lifetime === 'freed')!.links,
    ).toEqual([]);
    if (values.length >= 3 && values.includes(25) && values.includes(75)) {
      expect(end.root).toBe(0);
      expect(
        trace.steps
          .find((s) => s.source === 'erase.copy-value')!
          .state.nodes.filter(
            (n) => n.lifetime === 'live' && n.value === end.nodes[0]!.value,
          ),
      ).toHaveLength(2);
    }
  });
it('clear rotates and assigns each owning pointer independently before freeing', () => {
  const t = binaryTrace(
    'clear',
    binaryState([50, 25, 75, 10, 35, 60, 90], true),
  );
  const transfer = t.steps.find((s) => s.source === 'clear.transfer')!,
    attach = t.steps.find((s) => s.source === 'clear.attach')!,
    root = t.steps.find((s) => s.source === 'clear.root')!;
  expect(transfer.state.root).toBe(0);
  expect(transfer.state.nodes[0]!.left).toBe(4);
  expect(attach.state.nodes[1]!.right).toBe(0);
  expect(root.state.root).toBe(1);
  expect(t.steps.at(-1)!.state.nodes.every((n) => n.lifetime === 'freed')).toBe(
    true,
  );
});
it('randomized continuing mutation sequences match a JS Set without changing prior snapshots', () => {
  let state = binaryState([], true);
  const set = new Set<number>();
  let seed = 431;
  for (let i = 0; i < 100; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const value = (seed % 13) - 6,
      op = i % 3 === 0 ? 'erase' : 'insert';
    const original = state;
    const before = JSON.stringify(state);
    const trace = binaryTrace(op, state, value);
    state = trace.steps.at(-1)!.state;
    if (op === 'erase') set.delete(value);
    else set.add(value);
    expect(JSON.stringify(original)).toBe(before);
    expect(keys(state)).toEqual([...set].sort((a, b) => a - b));
    expect(
      binaryInvariants(state, true).every((i) => i.status === 'pass'),
    ).toBe(true);
  }
});
it('guard malformed, unbounded and unsupported lab inputs before tracing', () => {
  for (const adapter of [
    binaryTreeAdapter,
    bstAdapter,
    traversalAdapter,
    treeMutationAdapter,
  ]) {
    const op =
      adapter === traversalAdapter
        ? 'preorder'
        : adapter === binaryTreeAdapter
          ? 'append'
          : 'insert';
    for (const text of [
      '1,,2',
      '1.5',
      'Infinity',
      '1<script>',
      '1000',
      Array(16).fill('1').join(','),
    ]) {
      const f = new FormData();
      f.set('preset', 'custom');
      f.set('values', text);
      expect(() => adapter.build(op, f)).toThrow();
    }
    const f = new FormData();
    f.set('value', 'NaN');
    expect(() => adapter.build(op, f)).toThrow();
    expect(() => adapter.build('bogus', new FormData())).toThrow();
  }
});
it('invariants diagnose cycles, sharing, order errors and links to freed storage', () => {
  const s = binaryState([50, 25, 75], true);
  s.nodes[1]!.left = 0;
  expect(binaryInvariants(s, true).some((i) => i.status === 'fail')).toBe(true);
  const sharing = binaryState([50, 25, 75], true);
  sharing.nodes[0]!.right = 1;
  expect(
    binaryInvariants(sharing, true).some(
      (i) => i.name === 'Acyclic, single ownership' && i.status === 'fail',
    ),
  ).toBe(true);
  const order = binaryState([50, 25, 75], true);
  order.nodes[1]!.value = 99;
  expect(binaryInvariants(order, true).at(-1)!.status).toBe('fail');
  const dead = binaryState([50, 25], true);
  dead.nodes[1]!.lifetime = 'freed';
  expect(binaryInvariants(dead, false)[0]!.status).toBe('fail');
});

it('every binary foundation snapshot reverses and resets exactly through accepted playback', async () => {
  const { PlaybackController } = await import('../../src/engine/playback');
  for (const op of [
    'insert',
    'erase',
    'clear',
    'preorder',
    'inorder',
    'postorder',
    'bfs',
    'append',
  ] as const) {
    const trace = binaryTrace(
      op,
      binaryState([50, 25, 75, 60, 90, 55, 57], op !== 'append'),
      50,
    );
    const playback = new PlaybackController(trace);
    for (let i = 0; i < trace.steps.length; i++) {
      playback.next();
      expect(playback.state).toEqual(trace.steps[i]!.state);
    }
    for (let i = trace.steps.length - 2; i >= 0; i--) {
      playback.previous();
      expect(playback.state).toEqual(trace.steps[i]!.state);
    }
    playback.reset();
    expect(playback.state).toEqual(trace.initial);
    playback.dispose();
  }
});
it('all chapter adapter source regions include every event tag, including clear helper', async () => {
  const { readFileSync } = await import('node:fs');
  const { sourceLines } = await import('../../src/engine/source');
  const base = readFileSync('cpp/chapter-10/BinaryTree.hpp', 'utf8');
  const bst =
    readFileSync('cpp/chapter-11/BinarySearchTree.hpp', 'utf8') + '\n' + base;
  const traversal = readFileSync('cpp/chapter-12/Traversal.hpp', 'utf8');
  for (const [adapter, source, operations] of [
    [binaryTreeAdapter, base, ['append', 'clear']],
    [
      bstAdapter,
      bst,
      [
        'insert',
        'search',
        'minimum',
        'maximum',
        'successor',
        'predecessor',
        'erase',
        'clear',
      ],
    ],
    [traversalAdapter, traversal, ['preorder', 'inorder', 'postorder', 'bfs']],
    [treeMutationAdapter, bst, ['insert', 'erase', 'clear']],
  ] as const) {
    const inputs = new FormData();
    for (const op of operations) {
      const tags = adapter
        .regions(op, inputs)
        .flatMap((region) => sourceLines(source, region).map((l) => l.tag));
      for (const step of adapter.build(op, inputs).steps)
        if (step.source) expect(tags).toContain(step.source);
    }
  }
});
it('DFS returns remove child frame before the caller source statement completes', () => {
  const trace = binaryTrace('inorder', binaryState([65, 66, 67]));
  const left = trace.steps.find(
    (s) => s.source === 'dfs.left' && s.state.active === 0,
  )!;
  expect(left.state.frames.map((f) => f.node)).toEqual([0]);
  expect(left.state.output).toEqual([66]);
  const start = trace.steps.find((s) => s.source === 'dfs.start')!;
  expect(start.state.frames).toEqual([]);
  expect(start.state.output).toEqual([66, 65, 67]);
});
it('native block scopes remove mutation helper locals before the function return', () => {
  const trace = binaryTrace(
    'erase',
    binaryState([50, 25, 75, 60, 90, 55, 57], true),
    50,
  );
  const deleting = trace.steps.find(
    (s) => s.source === 'erase.successor-delete' && s.event.type === 'Free',
  )!.state;
  expect(deleting.refs.successor).toBe(5);
  expect(deleting.slots.successorSlot).toEqual({ owner: 3, field: 'left' });
  const returning = trace.steps.find((s) => s.source === 'erase.return')!.state;
  expect(returning.refs.successor).toBeUndefined();
  expect(returning.slots.successorSlot).toBeUndefined();
  expect(returning.refs.victim).toBe(0);
  expect(trace.steps.at(-1)!.state.refs).toEqual({});
  expect(trace.steps.at(-1)!.state.slots).toEqual({});
});
it('traversal construction rule changes shape, preserves input values, and rejects unknown shape', () => {
  const f = new FormData();
  f.set('preset', 'skewed');
  f.set('shape', 'complete');
  const complete = traversalAdapter.build('bfs', f).initial;
  f.set('shape', 'bst');
  const chain = traversalAdapter.build('preorder', f).initial;
  expect(keys(complete)).toEqual(keys(chain));
  expect(binaryMetrics(complete).treeHeight).toBe(2);
  expect(binaryMetrics(chain).treeHeight).toBe(5);
  f.set('shape', 'unknown');
  expect(() => traversalAdapter.build('bfs', f)).toThrow();
});
