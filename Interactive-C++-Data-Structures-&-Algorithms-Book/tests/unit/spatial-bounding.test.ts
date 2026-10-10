import { describe, expect, it, vi } from 'vitest';
import * as geometry from '../../src/visualizers/spatial/geometry';
import { readFileSync } from 'node:fs';
import { buildBoundingTrace, boundingInvariants, boundingOperations, boundingRegions, type BoundingState } from '../../src/visualizers/spatial/bounding';
import type { Bounds, SpatialKind } from '../../src/visualizers/spatial/types';
import { sourceLines } from '../../src/engine/source';
const form = (values: Record<string, string>) => { const f = new FormData(); Object.entries(values).forEach(([k, v]) => f.set(k, v)); return f; };
const last = (kind: SpatialKind, op: string, values: Record<string, string> = {}) => buildBoundingTrace(kind, op, form(values)).steps.at(-1)!.state;
// Oracle deliberately independent of shared geometry implementation.
const overlap = (a: Bounds, b: Bounds) => !(a.maxX < b.minX || b.maxX < a.minX || a.maxY < b.minY || b.maxY < a.minY || (a.maxZ ?? 0) < (b.minZ ?? 0) || (b.maxZ ?? 0) < (a.minZ ?? 0));
const brutePairs = (s: BoundingState) => s.objects.flatMap((a, i) => s.objects.slice(i + 1).filter(b => overlap(a.bounds, b.bounds)).map(b => [a.id, b.id].sort().join('|'))).sort();
const scenes = ['uniform', 'clustered', 'overlap', 'sorted', 'empty', 'single', 'duplicates', 'boundary'];

describe('bounding trees: independent exhaustive queries and snapshots', () => {
  for (const kind of ['r-tree', 'bvh'] as const) for (const scene of scenes) it(`${kind}: ${scene}`, () => {
    const trace = buildBoundingTrace(kind, 'query', form({ scene })); const s = trace.steps.at(-1)!.state;
    const want = s.objects.filter(o => overlap(o.bounds, s.query!)).map(o => o.id).sort();
    expect([...s.resultIds].sort()).toEqual(want);
    for (const step of [trace.initial, ...trace.steps.map(t => t.state)]) expect(boundingInvariants(step, step.semantic.done).filter(i => i.status === 'fail')).toEqual([]);
    expect(boundingInvariants(s, true).every(i => i.status === 'pass')).toBe(true);
    expect(s.semantic.tests).toBe(s.semantic.visits + trace.steps.filter(s => s.source === (kind === 'r-tree' ? 'rt.test' : 'bvh.test')).length);
  });
  it('propagates R-tree splits to a new root and respects every capacity', () => {
    const boxes = Array.from({ length: 12 }, (_, i) => `${i - 6},0,${i - 5},1`).join(';');
    for (let capacity = 2; capacity <= 6; capacity++) {
      const s = last('r-tree', 'insert', { scene: 'custom', boxes, capacity: String(capacity) });
      expect(boundingInvariants(s, true).every(i => i.status === 'pass')).toBe(true);
      if (capacity === 2) expect(Math.max(...s.nodes.map(n => n.depth))).toBeGreaterThanOrEqual(3);
      expect(s.objects.at(-1)!.id).toBe('new');
    }
  });
  it('preserves BVH topology on refit, restores enclosure at completion, rebuilds grouping', () => {
    const values = { scene: 'custom', boxes: '-8,-8,-6,-6;-5,-5,-3,-3;2,2,4,4;5,5,7,7', object: '6,6,8,8' };
    const before = last('bvh', 'build', values), refit = buildBoundingTrace('bvh', 'refit', form(values)), rebuilt = last('bvh', 'rebuild', values);
    const after = refit.steps.at(-1)!.state;
    const topology = (s: BoundingState) => s.nodes.map(n => [n.id, n.parent, n.children, n.items]);
    expect(topology(after)).toEqual(topology(before)); expect(topology(rebuilt)).not.toEqual(topology(before));
    const move = refit.steps.findIndex(s => s.source === 'bvh.move');
    expect(refit.steps.slice(move + 1, -1).every(s => s.source === 'bvh.bounds')).toBe(true);
    expect(refit.steps.slice(move + 1, -1).map(s => s.state.focus)).toEqual(['N2', 'N1', 'N0']);
    for (const step of refit.steps) expect(boundingInvariants(step.state, false).filter(i => i.status === 'fail')).toEqual([]);
    expect(boundingInvariants(after, true).every(i => i.status === 'pass')).toBe(true);
    expect(after.nodes.find(n => n.id === 'N2')!.bounds).toEqual({ minX: 6, minY: 6, maxX: 8, maxY: 8 });
  });
  it('takes independent snapshots and derives view values from semantic values', () => {
    const trace = buildBoundingTrace('r-tree', 'query', form({})); const first = trace.steps[0]!.state, final = trace.steps.at(-1)!.state;
    const saved = JSON.stringify(first); final.semantic.objects[0]!.bounds.minX = 7;
    expect(JSON.stringify(first)).toBe(saved); expect(trace.initial.nodes).toEqual([]);
    expect(first.objects).not.toBe(first.semantic.objects); expect(first.nodes).not.toBe(first.semantic.nodes);
  });
});

describe('broad phase completeness and dimensionality', () => {
  for (const dimension of [2, 3]) for (const scene of scenes) it(`${dimension}D ${scene}`, () => {
    const trace = buildBoundingTrace('broad-phase', 'filter', form({ scene, dimension: String(dimension) })), s = trace.steps.at(-1)!.state;
    const want = brutePairs(s); const candidates = s.candidatePairs.map(p => p.join('|'));
    expect(s.exactPairs.map(p => p.join('|')).sort()).toEqual(want); want.forEach(p => expect(candidates).toContain(p));
    expect(new Set(candidates).size).toBe(candidates.length); expect(s.semantic.tests).toBe(candidates.length);
    for (const step of [trace.initial, ...trace.steps.map(s => s.state)]) expect(boundingInvariants(step, step.semantic.done).filter(i => i.status === 'fail')).toEqual([]);
    expect(trace.steps.filter(s => s.source === 'broad.index')).toHaveLength(s.objects.length);
  });
  it('keeps false positives and separates Z-disjoint boxes', () => {
    const s = last('broad-phase', 'filter', { scene: 'custom', dimension: '3', boxes: '0,0,0,1,1,1;0,0,2,1,1,3' });
    expect(s.candidatePairs).toEqual([['A', 'B']]); expect(s.exactPairs).toEqual([]);
    expect(last('broad-phase', 'filter', { scene: 'custom', boxes: '0,0,1,1;0,0,1,1' }).exactPairs).toEqual([['A', 'B']]);
  });
  it('includes all touched cells at negative and positive boundaries', () => {
    const s = last('broad-phase', 'filter', { scene: 'custom', cellSize: '2', boxes: '-2,-2,0,0;0,0,2,2;2,2,2,2' });
    expect(s.exactPairs).toEqual([['A', 'B'], ['B', 'C']]);
    expect(s.semantic.cells.find(c => c.key === '-1,-1')!.items).toEqual(['A']);
    expect(s.semantic.cells.find(c => c.key === '0,0')!.items).toEqual(['A', 'B']);
    expect(s.semantic.pairAttempts).toBeGreaterThanOrEqual(s.candidatePairs.length);
  });
  it('rejects oversized 3D membership sets without silently dropping objects', () => {
    expect(() => last('broad-phase', 'filter', { scene: 'overlap', dimension: '3', cellSize: '1' })).toThrow('4096');
    expect(() => last('broad-phase', 'filter', { scene: 'custom', dimension: '3', cellSize: '1', boxes: '-8,-8,-8,8,8,8' })).toThrow('4096');
    const s = last('broad-phase', 'filter', { scene: 'overlap', dimension: '3', cellSize: '2' });
    expect(s.exactPairs.map(p => p.join('|')).sort()).toEqual(brutePairs(s));
  });
});

describe('bounded input and exact canonical source identity', () => {
  it('rejects nonfinite/reversed bounds, invalid operations, dimensions and move IDs', () => {
    for (const boxes of ['NaN,0,1,1', '0,0,9,1', '1,0,-1,1', '0,,1,1']) expect(() => last('r-tree', 'build', { scene: 'custom', boxes })).toThrow();
    expect(() => last('r-tree', 'query', { query: '0,0,-1,1' })).toThrow();
    expect(() => last('bvh', 'refit', { scene: 'empty' })).toThrow();
    expect(() => last('r-tree', 'build', { capacity: '2.5' })).toThrow();
    expect(() => last('broad-phase', 'filter', { dimension: '2.5' })).toThrow();
    expect(() => last('broad-phase', 'query')).toThrow();
  });
  for (const kind of Object.keys(boundingOperations) as (keyof typeof boundingOperations)[]) it(`${kind}: every operation's event resolves to canonical code`, () => {
    const path = kind === 'r-tree' ? '64/RTree' : kind === 'bvh' ? '65/BVH' : '66/BroadPhase';
    const source = readFileSync(`cpp/chapter-${path}.hpp`, 'utf8');
    for (const op of boundingOperations[kind]) {
      const region = boundingRegions(kind, op.id)[0]!; const tags = sourceLines(source, region).flatMap(l => l.tag ? [l.tag] : []);
      expect(new Set(tags).size).toBe(tags.length); expect(source).toContain(`@region ${region}`);
      const trace = buildBoundingTrace(kind, op.id, form({})); trace.steps.forEach(s => expect(tags).toContain(s.source));
    }
  });
});

it('focus is current in the projection while accepted and pruned remain explicit', () => {
  for (const [kind, op] of [['r-tree', 'insert'], ['bvh', 'refit'], ['bvh', 'query'], ['broad-phase', 'filter']] as const) {
    const trace = buildBoundingTrace(kind, op, form({}));
    for (const { state: s } of trace.steps) if (s.focus) {
      const focused = [...s.nodes, ...s.objects].find(n => n.id === s.focus);
      expect(focused, s.focus).toBeDefined();
      expect(['current', 'accepted', 'pruned', 'fault']).toContain(focused!.status);
    }
  }
});

it('R-tree distinguishes input-scene rectangles from stored leaf entries', () => {
  const trace = buildBoundingTrace('r-tree', 'build', form({}));
  expect(trace.initial.objects.every(o => o.detail.includes('Pending scene input'))).toBe(true);
  const first = trace.steps[0]!.state;
  expect(first.objects.find(o => o.id === 'A')!.detail).toContain('Stored in a leaf');
  expect(first.objects.find(o => o.id === 'B')!.detail).toContain('Pending scene input');
  expect(trace.steps.at(-1)!.state.objects.every(o => o.detail.includes('Stored in a leaf'))).toBe(true);
});

for (const [count, nodeCount, depth] of [[8, 28, 6], [12, 66, 10], [16, 120, 14]]) it(`capacity-two sorted ${count}: ${nodeCount} nodes, depth ${depth}`, () => {
  const objects = Array.from({ length: count! }, (_, i) => ({ id: String.fromCharCode(65 + i), label: String.fromCharCode(65 + i), bounds: { minX: i - 8, minY: 0, maxX: i - 7, maxY: 1 }, status: 'unvisited' as const, detail: 'Sorted regression box' }));
  // Exercise the bounded algorithm at its 16-object guard without widening the
  // shared 12-object form parser. Only fixture loading is replaced, not geometry.
  const loader = vi.spyOn(geometry, 'readBoxes').mockReturnValue(objects);
  try {
    const two = last('r-tree', 'query', { capacity: '2', query: '-8,-8,8,8' });
    const three = last('r-tree', 'query', { capacity: '3', query: '-8,-8,8,8' });
    expect(two.nodes).toHaveLength(nodeCount!); expect(Math.max(...two.nodes.map(n => n.depth))).toBe(depth);
    expect(two.semantic.visits).toBe(nodeCount); expect(two.semantic.tests).toBe(nodeCount! + count!);
    expect(two.resultIds).toHaveLength(count!);
    expect(boundingInvariants(two, true).every(i => i.status === 'pass')).toBe(true);
    expect(three.nodes.length).toBeLessThan(2 * count!); expect(Math.max(...three.nodes.map(n => n.depth))).toBeLessThan(depth!);
  } finally { loader.mockRestore(); }
});

it('retains the form limit and rejects invalid capacities', () => {
  const boxes = Array.from({ length: 16 }, (_, i) => `${i - 8},0,${i - 7},1`).join(';');
  expect(() => last('r-tree', 'query', { scene: 'custom', boxes })).toThrow('12');
  for (const capacity of ['1', '7', '2.5', 'NaN', 'Infinity']) expect(() => last('r-tree', 'build', { capacity })).toThrow();
});
