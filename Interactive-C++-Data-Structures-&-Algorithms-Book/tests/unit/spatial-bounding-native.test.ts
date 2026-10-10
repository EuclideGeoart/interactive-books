import { beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { buildBoundingTrace, boundingOperations } from '../../src/visualizers/spatial/bounding';
const fixture = [[-6,-6,-4,-4],[-4,-4,-2,-2],[-2,-2,0,0],[0,0,2,2],[2,2,4,4],[4,4,6,6],[-3,1,1,3],[-1,-1,1,1],[0,0,0,0],[6,-6,8,-4]];
const binary = '.cpp-build/spatial-bounding-parity';
beforeAll(() => { mkdirSync('.cpp-build', { recursive: true }); execFileSync(process.env.CXX || 'g++', ['-std=c++20', '-Wall', '-Wextra', '-Werror', '-pedantic', 'cpp/validation/spatial-bounding.cpp', '-o', binary]); }, 30000);
describe('canonical C++ / TypeScript bounding parity', () => {
  it('native randomized brute-force and hierarchy checks', () => expect(execFileSync(binary, { encoding: 'utf8' })).toContain('140 deterministic scenes'));
  for (const kind of ['r-tree', 'bvh', 'broad-phase'] as const) for (const op of boundingOperations[kind]) for (const dimension of kind === 'broad-phase' ? [2, 3] : [2]) it(`${kind}/${op.id}/${dimension}D: topology, counters, results and event order`, () => {
    const f = new FormData(); f.set('scene', 'custom'); f.set('dimension', String(dimension)); f.set('boxes', fixture.map((b, i) => dimension === 2 ? b.join(',') : [b[0], b[1], i % 3 - 1, b[2], b[3], i % 3].join(',')).join(';'));
    const trace = buildBoundingTrace(kind, op.id, f), s = trace.steps.at(-1)!.state, d = s.semantic;
    const lines: string[] = [];
    if (kind !== 'broad-phase') {
      lines.push(`root ${d.root === null ? -1 : Number(d.root.slice(1))}`);
      d.nodes.forEach(n => lines.push(`node ${n.id} ${n.parent === null ? -1 : Number(n.parent.slice(1))} ${[n.bounds.minX,n.bounds.minY,n.bounds.maxX,n.bounds.maxY].join(',')} children${n.children.map(id => ` ${id}`).join('')} items${n.items.map(id => ` ${id}`).join('')}`));
      lines.push(`results${[...d.results].sort().map(id => ` ${id}`).join('')}`, `counts ${d.visits} ${d.tests} ${d.prunes} ${d.updates}`);
    } else lines.push(`candidates${d.candidates.map(p => ` ${p.join(',')}`).join('')}`, `exact${d.exact.map(p => ` ${p.join(',')}`).join('')}`, `counts ${d.memberships} ${d.pairAttempts} ${d.tests}`);
    lines.push(`tags${trace.steps.map(s => ` ${s.source}`).join('')}`);
    expect(execFileSync(binary, ['--parity', kind, op.id, String(dimension)], { encoding: 'utf8' }).trim()).toBe(lines.join('\n'));
  });
});

describe('every canonical tag retains the same semantic half-state', () => {
  for (const kind of ['r-tree', 'bvh', 'broad-phase'] as const) for (const op of boundingOperations[kind]) for (const dimension of kind === 'broad-phase' ? [2, 3] : [2]) for (const capacity of kind === 'r-tree' ? [2, 3, 4, 5, 6] : [2]) it(`${kind}/${op.id}/${dimension}D/M${capacity}: per-tag bounds, references, entries, object positions, results, counters`, () => {
    const f = new FormData(); f.set('scene', 'custom'); f.set('dimension', String(dimension)); f.set('capacity', String(capacity)); f.set('boxes', fixture.map((b, i) => dimension === 2 ? b.join(',') : [b[0], b[1], i % 3 - 1, b[2], b[3], i % 3].join(',')).join(';'));
    const trace = buildBoundingTrace(kind, op.id, f);
    const snapshots = trace.steps.map(step => {
      const d = step.state.semantic, lines = [`event ${step.source}`];
      if (kind !== 'broad-phase') {
        d.objects.forEach(o => lines.push(`object ${o.id} ${[o.bounds.minX,o.bounds.minY,o.bounds.maxX,o.bounds.maxY].join(',')}`));
        lines.push(`root ${d.root === null ? -1 : Number(d.root.slice(1))}`);
        d.nodes.forEach(n => lines.push(`node ${n.id} ${n.parent === null ? -1 : Number(n.parent.slice(1))} ${[n.bounds.minX,n.bounds.minY,n.bounds.maxX,n.bounds.maxY].join(',')} children${n.children.map(id => ` ${id}`).join('')} items${n.items.map(id => ` ${id}`).join('')}`));
        lines.push(`results${[...d.results].sort().map(id => ` ${id}`).join('')}`, `counts ${d.visits} ${d.tests} ${d.prunes} ${d.updates}`, 'tags');
      } else {
        d.objects.forEach(o => lines.push(`object ${o.id} ${[o.bounds.minX,o.bounds.minY,...(dimension === 3 ? [o.bounds.minZ] : []),o.bounds.maxX,o.bounds.maxY,...(dimension === 3 ? [o.bounds.maxZ] : [])].join(' ')}`));
        d.cells.forEach(c => lines.push(`cell ${c.coords.join(' ')} items${c.items.map(id => ` ${id}`).join('')}`));
        lines.push(`candidates${d.candidates.map(p => ` ${p.join(',')}`).join('')}`, `exact${d.exact.map(p => ` ${p.join(',')}`).join('')}`, `counts ${d.memberships} ${d.pairAttempts} ${d.tests}`);
      }
      return lines.join('\n');
    });
    expect(execFileSync(binary, ['--snapshots', kind, op.id, String(dimension), String(capacity)], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).trim()).toBe(snapshots.join('\n'));
  });
});
