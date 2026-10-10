import { describe, it, expect } from 'vitest';
import { layoutTree } from '../../src/visualizers/tree/layout';
import {
  drawTree,
  inspectTree,
  describeTree,
} from '../../src/visualizers/tree/diagram';
import {
  binarySearchPath,
  avlHeightBound,
  pageLevels,
} from '../../src/visualizers/tree/complexity';
import type { TreeScene, TreeViewNode } from '../../src/visualizers/tree/types';

function node(i: number, children: (number | null)[] = []): TreeViewNode {
  return {
    address: `0x${(0xa000 + ((i * 37) % 1024) * 32).toString(16)}`,
    label: String(i),
    lifetime: 'live',
    fields: [{ name: 'value', value: i }],
    links: children.map((c, j) => ({
      name:
        children.length === 2
          ? ['left', 'right'][j]!
          : String.fromCharCode(97 + j),
      target: c === null ? null : node(c).address,
      structural: true,
    })),
  };
}
function scene(nodes: TreeViewNode[]): TreeScene {
  return {
    nodes,
    root: nodes[0]?.address ?? null,
    references: {},
    active: null,
    visited: [],
    auxiliary: [],
    output: [],
    result: '',
  };
}
function assertGeometry(s: TreeScene, view: 'logical' | 'memory' = 'logical') {
  const layout = layoutTree(s, view);
  expect(layout.boxes.size).toBe(s.nodes.length);
  const boxes = [...layout.boxes.values()];
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i]!;
    expect(a.x).toBeGreaterThanOrEqual(0);
    expect(a.y).toBeGreaterThanOrEqual(0);
    expect(a.x + a.width).toBeLessThan(layout.width);
    expect(a.y + a.height).toBeLessThan(layout.height);
    for (const b of boxes.slice(i + 1))
      expect(
        a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y,
      ).toBe(false);
  }
}
describe('tree-specific hierarchy layout', () => {
  for (const n of [0, 1, 3, 7, 15, 31, 63, 127])
    for (const shape of ['balanced', 'left', 'right'] as const)
      it(`${n} ${shape} nodes have distinct boxes in both representations`, () => {
        const nodes = Array.from({ length: n }, (_, i) => {
          const left =
            shape === 'balanced' ? i * 2 + 1 : shape === 'left' ? i + 1 : n;
          const right =
            shape === 'balanced' ? i * 2 + 2 : shape === 'right' ? i + 1 : n;
          return node(i, [left < n ? left : null, right < n ? right : null]);
        });
        const s = scene(nodes);
        assertGeometry(s);
        assertGeometry(s, 'memory');
        expect(layoutTree(s)).toEqual(layoutTree(structuredClone(s)));
      });
  it('retains the meaning of an empty left or right slot', () => {
    const right = layoutTree(scene([node(0, [null, 1]), node(1)]));
    const left = layoutTree(scene([node(0, [1, null]), node(1)]));
    expect(right.boxes.get(node(1).address)!.x).toBeGreaterThan(
      right.boxes.get(node(0).address)!.x,
    );
    expect(left.boxes.get(node(1).address)!.x).toBeLessThan(
      left.boxes.get(node(0).address)!.x,
    );
  });
  it('supports multi-key pages and ordered character edges without binary padding', () => {
    const nodes = [
      node(0, [1, 2, 3, 4, 5]),
      ...Array.from({ length: 5 }, (_, i) => node(i + 1)),
    ];
    nodes[0]!.label = '[10 | 20 | 30 | 40]';
    const s = scene(nodes);
    assertGeometry(s);
    expect(layoutTree(s).boxes.get(nodes[0]!.address)!.width).toBeGreaterThan(
      200,
    );
    const xs = nodes.slice(1).map((n) => layoutTree(s).boxes.get(n.address)!.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });
  it('terminates on rotation cycles, shared targets, unknown targets and detached lifetimes', () => {
    const a = node(0, [1, 2]),
      b = node(1, [0, 2]),
      c = node(2, [2, 99]),
      d = node(3);
    d.lifetime = 'freed';
    const s = scene([a, b, c, d]);
    assertGeometry(s);
    assertGeometry(s, 'memory');
    expect(drawTree(s, 'broken', 'logical', a.address)).toContain('FREED');
    expect(layoutTree(s).hierarchy.size).toBeLessThan(s.nodes.length);
  });
  it('shows ended lifetime without exposing stale values or links', () => {
    const dead = node(0, [1]);
    dead.label = 'secret former payload';
    dead.fields = [{ name: 'value', value: 871231 }];
    dead.lifetime = 'freed';
    const s = scene([dead, node(1)]);
    const html = inspectTree(s, dead.address),
      drawing = drawTree(s, 'lifetime', 'logical', dead.address);
    expect(html).not.toContain('871231');
    expect(html).not.toContain('secret former payload');
    expect(html).not.toContain('<dt>');
    expect(drawing).not.toContain('secret former payload');
    expect(drawing).not.toContain('data-from=');
    expect(describeTree(s)).toContain('fields unavailable');
  });
  it('escapes chapter labels and field values at the SVG/HTML boundary', () => {
    const s = scene([node(0)]);
    s.nodes[0]!.label = '<img src=x onerror=alert(1)>';
    s.nodes[0]!.fields = [{ name: '<script>', value: '<svg onload=1>' }];
    expect(drawTree(s, 'safe', 'logical', null)).not.toContain('<img');
    expect(inspectTree(s, s.root)).not.toContain('<script>');
  });
});
describe('complexity evidence', () => {
  it('walks actual median-first and sorted maximum-search decisions', () => {
    expect(binarySearchPath(7, 'balanced')).toEqual([4, 6, 7]);
    expect(binarySearchPath(7, 'skewed')).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(binarySearchPath(1024, 'balanced')).toHaveLength(11);
    expect(binarySearchPath(0, 'balanced')).toEqual([]);
  });
  it('bounds AVL heights at exact minimum-node thresholds', () => {
    expect([0, 1, 2, 3, 4, 6, 7, 11, 12].map(avlHeightBound)).toEqual([
      -1, 0, 1, 1, 2, 2, 3, 3, 4,
    ]);
  });
  it('counts wide-page capacity boundaries', () => {
    expect(pageLevels(63, 8)).toEqual({ levels: 2, capacities: [7, 63] });
    expect(pageLevels(64, 8).levels).toBe(3);
    expect(pageLevels(1024, 32).levels).toBeLessThan(
      pageLevels(1024, 3).levels,
    );
  });
});
