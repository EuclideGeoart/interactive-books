import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compilePartitionFixture } from '../../scripts/check-spatial-partition-cpp.mjs';
import { buildPartitionTrace, partitionInvariants, partitionOperations, partitionRegions, partitionSnapshot, type PartitionState } from '../../src/visualizers/spatial/partition';
import { parsePoint, readPoints, readQuery, readQueryPoint } from '../../src/visualizers/spatial/geometry';
import { sourceLines } from '../../src/engine/source';
import type { Bounds, SpatialKind, SpatialTrace, Vec } from '../../src/visualizers/spatial/types';

const kinds = ['spatial-hash', 'quadtree', 'octree', 'kd-tree'] as const;
const scenes = ['uniform', 'clustered', 'overlap', 'sorted', 'empty', 'single', 'duplicates', 'boundary'];
const sources = { 'spatial-hash': '60/SpatialHash', quadtree: '61/Quadtree', octree: '62/Octree', 'kd-tree': '63/KDTree' };
const form = (values: Record<string, string | number> = {}) => { const f = new FormData(); for (const [k, v] of Object.entries(values)) f.set(k, String(v)); return f; };
const last = (trace: SpatialTrace<PartitionState>) => trace.steps.at(-1)!.state;
const inside = (b: Bounds, p: Vec) => p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY && (p.z ?? 0) >= (b.minZ ?? 0) && (p.z ?? 0) <= (b.maxZ ?? 0);
const squared = (a: Vec, b: Vec) => (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) + ((a.z ?? 0) - (b.z ?? 0)) ** 2;
let directory: string, binary: string;
beforeAll(() => { directory = mkdtempSync(join(tmpdir(), 'spatial-partition-')); binary = compilePartitionFixture(directory); }, 60000);
afterAll(() => { if (directory) rmSync(directory, { recursive: true, force: true }); });
function native(kind: typeof kinds[number], op: string, f: FormData) {
  const dim = kind === 'octree' ? 3 : 2, p = readPoints(f, dim), q = readQuery(f, dim), qp = readQueryPoint(f, dim);
  const inserted = parsePoint(String(f.get('point') ?? (dim === 3 ? '1,1,1' : '1,1')), dim);
  const input = [String(p.length), ...p.map(p => `${p.id} ${p.point!.x} ${p.point!.y} ${p.point!.z ?? 0}`),
    `${f.get('cellSize') ?? 4} ${f.get('capacity') ?? 2} ${f.get('maxDepth') ?? 4} ${f.get('target') ?? 'A'}`,
    `${q.minX} ${q.minY} ${q.maxX} ${q.maxY} ${q.minZ ?? 0} ${q.maxZ ?? 0}`,
    `${qp.x} ${qp.y} ${qp.z ?? 0} ${inserted.x} ${inserted.y} ${inserted.z ?? 0}`].join('\n');
  return execFileSync(binary, [kind, op], { input, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim().split('\n').map(line => JSON.parse(line));
}
function verify(trace: SpatialTrace<PartitionState>) {
  expect(partitionInvariants(trace.initial, true).filter(i => i.status === 'fail')).toEqual([]);
  for (const [i, step] of trace.steps.entries()) {
    expect(partitionInvariants(step.state, i === trace.steps.length - 1).filter(v => v.status === 'fail'), `${step.source}: ${step.explanation}`).toEqual([]);
    expect(step.state.focus === '' || [...step.state.nodes, ...step.state.objects].some(o => o.id === step.state.focus)).toBe(true);
  }
  expect(partitionInvariants(last(trace), true).every(i => i.status === 'pass')).toBe(true);
}
for (const kind of kinds) describe(kind, () => {
  for (const scene of scenes) for (const { id: op } of partitionOperations[kind]) {
    if (scene === 'empty' && (op === 'remove' || op === 'update')) continue;
    it(`${scene} / ${op}: all snapshots, independent answer and native parity`, () => {
      const f = form({ scene }), trace = buildPartitionTrace(kind, op, f), done = last(trace);
      verify(trace);
      expect(trace.steps.map(s => [s.source, partitionSnapshot(s.state)])).toEqual(native(kind, op, f));
      if (op === 'range' || op === 'point') {
        expect(done.resultIds).toEqual(done.semantic.points.filter(p => inside(done.query!, p.point)).map(p => p.id).sort());
      } else if (op === 'nearest') {
        const sorted = done.semantic.points.slice().sort((a, b) => squared(a.point, done.queryPoint!) - squared(b.point, done.queryPoint!) || a.id.localeCompare(b.id));
        expect(done.resultIds).toEqual(sorted.length ? [sorted[0]!.id] : []);
        expect(done.semantic.best).toBe(sorted.length ? squared(sorted[0]!.point, done.queryPoint!) : null);
      }
      const raw = readFileSync(`cpp/chapter-${sources[kind]}.hpp`, 'utf8');
      const lines = partitionRegions(kind, op).flatMap(region => sourceLines(raw, region));
      for (const step of trace.steps) expect(lines.filter(l => l.tag === step.source)).toHaveLength(1);
      expect(new Set(lines.filter(l => l.tag).map(l => l.tag)).size).toBe(lines.filter(l => l.tag).length);
    });
  }
});
it('snapshots retain earlier membership and input coordinates after mutation', () => {
  const t = buildPartitionTrace('spatial-hash', 'update', form({ scene: 'single', point: '8,-8' }));
  expect(t.initial.semantic.points[0]!.point).toEqual({ x: 0, y: 0 });
  expect(t.steps.find(s => s.source === 'hash.store')!.state.semantic.cells[0]!.ids).toEqual(['A']);
  expect(last(t).semantic.points[0]!.point).toEqual({ x: 8, y: -8 });
  const saved = JSON.stringify(t.steps[0]); last(t).semantic.points[0]!.point.x = 2;
  expect(JSON.stringify(t.steps[0])).toBe(saved);
});
it('floor cells distinguish negative coordinates, co-location, and hash collisions', () => {
  const f = form({ scene: 'custom', points: '-8,-8;-8,-1;-0.1,0;0,0;0,0', cellSize: 1, query: '-8,-8,-8,-8' });
  const trace = buildPartitionTrace('spatial-hash', 'range', f), d = last(trace).semantic;
  verify(trace); expect(d.cells.find(c => c.ids.includes('C'))!.x).toBe(-1);
  expect(d.cells.find(c => c.ids.includes('D'))!.ids).toEqual(['D', 'E']);
  expect(d.cells[0]!.bucket).toBe(d.cells[1]!.bucket);
  expect(last(trace).resultIds).toEqual(['A']);
  expect(trace.steps.some(s => s.source === 'hash.key')).toBe(true);
  expect(trace.steps.map(s => [s.source, partitionSnapshot(s.state)])).toEqual(native('spatial-hash', 'range', f));
});
it('hash update removes old cell record and routes the new coordinate', () => {
  const trace = buildPartitionTrace('spatial-hash', 'update', form({ scene: 'single', point: '-8,8' }));
  const d = last(trace).semantic; expect(d.cells).toHaveLength(1); expect([d.cells[0]!.x, d.cells[0]!.y]).toEqual([-2, 2]);
  expect(d.buckets.flat()).toEqual(['-2,2']); verify(trace);
});
for (const kind of ['quadtree', 'octree'] as const) it(`${kind}: max depth 0 and duplicate overflow; split conservation`, () => {
  for (const depth of [0, 1, 6]) {
    const f = form({ scene: 'duplicates', capacity: 1, maxDepth: depth });
    const trace = buildPartitionTrace(kind, 'build', f); verify(trace);
    expect(last(trace).semantic.tree.every(n => n.depth <= depth)).toBe(true);
    expect(trace.steps.some(s => s.source?.endsWith('.limit'))).toBe(true);
    expect(trace.steps.map(s => [s.source, partitionSnapshot(s.state)])).toEqual(native(kind, 'build', f));
    const split = trace.steps.find(s => s.source?.endsWith('.split'));
    if (depth) expect(split!.state.semantic.pending.length).toBeGreaterThan(0);
  }
});
it('octree uses real z coordinates and sparse octants', () => {
  const f = form({ scene: 'custom', points: '0,0,-3;0,0,3;0,0,3', capacity: 1, query: '-1,-1,2,1,1,4' });
  const trace = buildPartitionTrace('octree', 'range', f); verify(trace);
  expect(last(trace).resultIds).toEqual(['B', 'C']);
  expect(last(trace).semantic.tree[0]!.children.filter(id => id === null).length).toBe(6);
  expect(last(trace).objects.map(o => o.point!.z)).toEqual([-3, 3, 3]);
  expect(trace.steps.map(s => [s.source, partitionSnapshot(s.state)])).toEqual(native('octree', 'range', f));
});
it('nearest actually prunes branches, and plane equality preserves ID ties', () => {
  const sparse = buildPartitionTrace('kd-tree', 'nearest', form({ queryPoint: '-7,-7' })); verify(sparse);
  expect(last(sparse).semantic.prunes).toBeGreaterThan(0);
  expect(last(sparse).semantic.tests).toBeLessThan(last(sparse).objects.length);
  const f = form({ scene: 'custom', points: '0,0;0,5;2,0', queryPoint: '1,0' });
  const trace = buildPartitionTrace('kd-tree', 'nearest', f); verify(trace);
  expect(last(trace).resultIds).toEqual(['A']);
  expect(trace.steps.some(s => s.source === 'kd.plane' && s.state.semantic.planeDistance === s.state.semantic.best)).toBe(true);
  expect(trace.steps.map(s => [s.source, partitionSnapshot(s.state)])).toEqual(native('kd-tree', 'nearest', f));
  const source = readFileSync('cpp/chapter-63/KDTree.hpp', 'utf8');
  expect(source.indexOf('@trace kd.nearVisit')).toBeGreaterThan(source.indexOf('inline void nearest'));
  expect(source.indexOf('@trace kd.farPrune')).toBeGreaterThan(source.indexOf('inline void nearest'));
});
it('deterministic fractional scenes match exhaustive scans across cell sizes and dimensions', () => {
  let seed = 630062;
  const coord = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return (seed % 65 - 32) / 4; };
  for (const kind of kinds) for (let trial = 0; trial < 32; ++trial) {
    const dim = kind === 'octree' ? 3 : 2, points = Array.from({ length: trial % 13 }, () => Array.from({ length: dim }, coord).join(','));
    const lows = Array.from({ length: dim }, coord), highs = lows.map(v => Math.min(8, v + 2));
    const f = form({ scene: 'custom', points: points.join(';'), query: [...lows, ...highs].join(','), capacity: 1 + trial % 4, cellSize: 1 + trial % 8, maxDepth: trial % 7 });
    const trace = buildPartitionTrace(kind, 'range', f); verify(trace);
    const done = last(trace);
    expect(done.resultIds).toEqual(done.semantic.points.filter(p => inside(done.query!, p.point)).map(p => p.id).sort());
  }
});
it('invalid inputs are rejected without a partial returned trace', () => {
  const bad: Record<string, string | number>[] = [{ points: 'NaN,0' }, { points: '9,0' }, { points: '0,' }, { points: '0,0;'}, { points: Array(13).fill('0,0').join(';') }, { cellSize: 0 }, { cellSize: 1.5 }, { capacity: 0 }, { maxDepth: 7 }, { query: '2,2,-2,-2' }];
  for (const values of bad) expect(() => buildPartitionTrace('spatial-hash', 'range', form({ scene: 'custom', points: '0,0', ...values }))).toThrow();
  expect(() => buildPartitionTrace('spatial-hash', 'remove', form({ scene: 'empty' }))).toThrow('Unknown target');
  expect(() => buildPartitionTrace('octree', 'insert', form({ point: '0,0' }))).toThrow();
  expect(() => buildPartitionTrace('kd-tree', 'nonsense', form())).toThrow();
  expect(() => buildPartitionTrace('bvh' as SpatialKind, 'build', form())).toThrow();
});
it('chapter-owned invariants detect corrupted hash membership and subtree routing', () => {
  const hash = last(buildPartitionTrace('spatial-hash', 'build', form())); hash.semantic.cells[0]!.x += 1;
  expect(partitionInvariants(hash, true).some(i => i.name === 'Membership matches floor coordinates' && i.status === 'fail')).toBe(true);
  const quad = last(buildPartitionTrace('quadtree', 'build', form())); quad.semantic.tree[0]!.children.reverse();
  expect(partitionInvariants(quad, true).some(i => i.name === 'Unique high-side subdivision routing' && i.status === 'fail')).toBe(true);
});
it('native validation independently checks 640 bounded scenes and malformed inputs', () => {
  expect(execFileSync(binary, ['--self-test'], { encoding: 'utf8' })).toContain('640 deterministic native scenes');
});

it('empty query cells have a semantic current region without fake occupied records', () => {
  const trace = buildPartitionTrace('spatial-hash', 'range', form({ scene: 'empty', query: '-1,-1,1,1', cellSize: 1 }));
  const probes = trace.steps.filter(s => s.source === 'hash.cell');
  expect(probes).toHaveLength(9);
  for (const step of probes) {
    expect(step.state.currentRegion).toBeDefined();
    expect(step.state.semantic.activeCell).not.toBeNull();
    expect(step.state.nodes).toEqual([]);
    expect(step.state.semantic.cells).toEqual([]);
  }
  expect(last(trace).currentRegion).toBeUndefined();
  expect(last(trace).semantic.activeCell).toBeNull();
  verify(trace);
});
it('colliding unrelated keys are rejected before matching the requested cell', () => {
  const f = form({ scene: 'custom', points: '-8,-8;-8,-1', cellSize: 1, query: '-8,-1,-8,-1' });
  const trace = buildPartitionTrace('spatial-hash', 'range', f);
  expect(last(trace).resultIds).toEqual(['B']);
  expect(last(trace).semantic.keyComparisons).toBe(2);
  expect(last(trace).semantic.tests).toBe(1);
  expect(trace.steps.some(s => s.source === 'hash.key' && s.explanation.includes('collides with'))).toBe(true);
  expect(trace.steps.map(s => [s.source, partitionSnapshot(s.state)])).toEqual(native('spatial-hash', 'range', f));
});
it('all four chapter pages retain the exact thirteen sections and shared spatial components', () => {
  for (const [number, slug] of [[60, 'spatial-hashing'], [61, 'quadtrees'], [62, 'octrees'], [63, 'kd-trees']]) {
    const mdx = readFileSync(`src/content/chapters/${number}-${slug}.mdx`, 'utf8');
    expect([...mdx.matchAll(/<Section id="([^"]+)"/g)].map(m => m[1])).toEqual(['mental-model', 'intuition', 'memory', 'operations', 'implementation', 'pointer-trace', 'invariants', 'complexity', 'break-it', 'analogy', 'engineering', 'exercises', 'summary']);
    for (const component of ['SpatialPreview', 'SpatialLab', 'SpatialExplorer', 'CanonicalSource']) expect(mdx).toContain(`<${component} `);
    expect(readFileSync(`src/pages/chapters/${number}-${slug}.astro`, 'utf8')).toContain('<BookLayout');
  }
});
