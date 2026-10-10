import { beforeAll, afterAll, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { compileRecursiveFixture } from '../../scripts/techniques-recursive-fixture.mjs';
import { PlaybackController } from '../../src/engine/playback';
import { sourceLines } from '../../src/engine/source';
import { factorialTrace, combinationTrace, mergeSortTrace, buildRecursiveTrace, recursiveInvariants, recursiveRegions, recursiveSnapshot, type FactorialState, type CombinationState, type MergeState } from '../../src/visualizers/techniques/recursive';
import type { TechniqueTrace } from '../../src/visualizers/techniques/types';
let binary: string;
beforeAll(() => { binary = compileRecursiveFixture(); }, 30000);
afterAll(() => { if (binary) rmSync(dirname(binary), { recursive: true, force: true }); });
const native = (...args: string[]) => execFileSync(binary, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim().split('\n').map(line => JSON.parse(line));
const snapshots = (trace: TechniqueTrace) => trace.steps.map(step => [step.source, recursiveSnapshot(step.state)]);
const last = (trace: TechniqueTrace) => recursiveSnapshot(trace.steps.at(-1)!.state);
const factorials = [1, 1, 2, 6, 24, 120, 720, 5040, 40320];
for (let n = 0; n <= 8; ++n) for (const iterative of [false, true]) it(`factorial n=${n}, iterative=${iterative}: oracle, order and native parity`, () => {
  const trace = factorialTrace(n, iterative), done = last(trace) as FactorialState;
  expect(done.value).toBe(factorials[n]);
  expect(done.stack).toEqual([]);
  expect(done.maxDepth).toBe(iterative ? 1 : Math.max(1, n));
  expect(done.multiplications).toBe(Math.max(0, n - 1));
  if (!iterative) {
    expect(trace.steps.filter(s => s.source === 'rec.enter').map(s => (s.state.semantic as FactorialState).stack.at(-1))).toEqual(Array.from({ length: Math.max(1, n) }, (_, i) => n - i));
    expect(done.returned.map(r => r.n)).toEqual(n ? Array.from({ length: n }, (_, i) => i + 1) : [0]);
  }
  expect(snapshots(trace)).toEqual(native(iterative ? 'iterative' : 'recursive', String(n)));
});
// Exhaustive bit masks are independent of the recursive choose/explore/undo implementation.
function combinationsOracle(n: number, k: number) {
  const result: number[][] = [];
  for (let mask = 0; mask < 2 ** n; ++mask) {
    const set = Array.from({ length: n }, (_, i) => i + 1).filter((_, i) => mask & (1 << i));
    if (set.length === k) result.push(set);
  }
  return result.sort((a, b) => { for (let i = 0; i < a.length; ++i) if (a[i] !== b[i]) return a[i]! - b[i]!; return 0; });
}
for (let n = 0; n <= 6; ++n) for (let k = 0; k <= 6; ++k) it(`all ${n} choose ${k}: bitmask oracle, pruning and native parity`, () => {
  const trace = combinationTrace(n, k), done = last(trace) as CombinationState;
  expect(done.solutions).toEqual(combinationsOracle(n, k));
  expect(done.partial).toEqual([]); expect(done.stack).toEqual([]);
  const beforeChoices: number[][] = [];
  trace.steps.forEach((step, i) => {
    const s = step.state.semantic as CombinationState;
    if (step.source === 'bt.choose') beforeChoices.push((trace.steps[i - 1]!.state.semantic as CombinationState).partial);
    if (step.source === 'bt.undo') expect(s.partial).toEqual(beforeChoices.pop());
    if (step.source === 'bt.prune') expect(n - s.stack.at(-1)!.start + 1).toBeLessThan(k - s.partial.length);
  });
  expect(beforeChoices).toEqual([]);
  expect(snapshots(trace)).toEqual(native('combinations', String(n), String(k)));
});
const sortCases = [[], [4], [2, 1], [2, 2], [7, 2, 5, 2, 9, 1], [8, 7, 6, 5, 4, 3, 2, 1], [-1000000, 0, 1000000], [1, 1, 1, 1, 1, 1, 1, 1]];
for (const input of sortCases) it(`merge ${JSON.stringify(input)}: stable oracle, exact subranges and native parity`, () => {
  const trace = mergeSortTrace(input), done = last(trace) as MergeState;
  const expected = input.map((value, origin) => ({ value, origin })).sort((a, b) => a.value - b.value || a.origin - b.origin);
  expect(done.values).toEqual(expected.map(x => x.value)); expect(done.origins).toEqual(expected.map(x => x.origin));
  expect(done.stack).toEqual([]);
  for (const node of done.nodes.filter(n => n.hi - n.lo > 1)) {
    const children = done.nodes.filter(n => n.parent === node.id);
    expect(children.map(n => [n.lo, n.hi])).toEqual([[node.lo, node.lo + Math.floor((node.hi - node.lo) / 2)], [node.lo + Math.floor((node.hi - node.lo) / 2), node.hi]]);
  }
  expect(snapshots(trace)).toEqual(native('merge-sort', ...input.map(String)));
});
it('merge oracle covers every ternary array up to length five', () => {
  for (let n = 0; n <= 5; ++n) for (let code = 0; code < 3 ** n; ++code) {
    const input = Array.from({ length: n }, (_, i) => Math.floor(code / 3 ** i) % 3 - 1);
    const done = last(mergeSortTrace(input)) as MergeState;
    expect(done.values).toEqual([...input].sort((a, b) => a - b));
    expect(done.origins).toEqual(input.map((_, i) => i).sort((a, b) => input[a]! - input[b]! || a - b));
  }
});
const traces = () => [factorialTrace(8), factorialTrace(0), factorialTrace(8, true), combinationTrace(6, 3), combinationTrace(0, 0), combinationTrace(2, 4), ...sortCases.map(mergeSortTrace)];
it('every frame uses valid invariants, immutable snapshots and exact reverse playback', () => {
  for (const trace of traces()) {
    const serial = JSON.stringify(trace);
    const playback = new PlaybackController(trace);
    expect(recursiveInvariants(trace.initial, true).filter(x => x.status === 'fail')).toEqual([]);
    for (let i = 0; i <= playback.total; ++i) {
      playback.seek(i);
      expect(recursiveInvariants(playback.state, i === playback.total).filter(x => x.status === 'fail')).toEqual([]);
      if (i) expect(playback.state.semantic).not.toBe((i === 1 ? trace.initial : trace.steps[i - 2]!.state).semantic);
    }
    for (let i = playback.total - 1; i >= 0; --i) { playback.previous(); expect(playback.state).toEqual(i ? trace.steps[i - 1]!.state : trace.initial); }
    expect(JSON.stringify(trace)).toBe(serial);
    playback.dispose();
  }
});
it('positions are stable, boxes never overlap, and all dependency endpoints exist', () => {
  for (const trace of traces()) {
    const positions = new Map<string, [number, number]>();
    for (const { state } of trace.steps) {
      const ids = new Set([...state.nodes, ...state.cells].map(n => n.id));
      expect(ids.size).toBe(state.nodes.length + state.cells.length);
      for (const edge of state.dependencies) { expect(ids.has(edge.from)).toBe(true); expect(ids.has(edge.to)).toBe(true); }
      for (const [i, node] of state.nodes.entries()) {
        if (positions.has(node.id)) expect([node.x, node.y]).toEqual(positions.get(node.id));
        positions.set(node.id, [node.x, node.y]);
        for (const other of state.nodes.slice(i + 1)) expect(Math.abs(node.x - other.x) >= 184 || Math.abs(node.y - other.y) >= 100).toBe(true);
      }
    }
  }
});
it('source tags occur exactly once in the selected canonical regions', () => {
  for (const [kind, operation, filename, trace] of [
    ['recursion', 'recursive', '45/Recursion', factorialTrace(4)], ['recursion', 'iterative', '45/Recursion', factorialTrace(4, true)],
    ['backtracking', 'combinations', '46/Backtracking', combinationTrace(4, 2)], ['divide-conquer', 'merge-sort', '47/DivideConquer', mergeSortTrace([3, 1, 2])]
  ] as const) {
    const source = readFileSync(`cpp/chapter-${filename}.hpp`, 'utf8');
    const tags = recursiveRegions(kind, operation).flatMap(region => sourceLines(source, region).map(l => l.tag).filter(Boolean));
    expect(new Set(tags).size).toBe(tags.length);
    for (const step of trace.steps) expect(tags.filter(tag => tag === step.source)).toHaveLength(1);
  }
});
it('public APIs reject invalid inputs without altering caller-owned arrays', () => {
  for (const n of [-1, 9, 1.5, NaN, Infinity]) expect(() => factorialTrace(n)).toThrow();
  for (const [n, k] of [[7, 2], [2, -1], [0, 7], [2.5, 1]]) expect(() => combinationTrace(n!, k!)).toThrow();
  for (const values of [Array(9).fill(1), [1000001], [1.5], [NaN]]) expect(() => mergeSortTrace(values)).toThrow();
  for (const args of [['recursive', '-1'], ['iterative', '9'], ['combinations', '7', '2'], ['merge-sort', '1000001'], ['merge-sort', ...Array(9).fill('1')]]) expect(() => native(...args)).toThrow();
  const input = [3, 2, 1]; mergeSortTrace(input); expect(input).toEqual([3, 2, 1]);
  for (const raw of ['<img>', '1.2', '1e2', '']) { const form = new FormData(); form.set('n', raw); expect(() => buildRecursiveTrace('recursion', 'recursive', form)).toThrow(); }
  const empty = new FormData(); empty.set('values', ''); expect((last(buildRecursiveTrace('divide-conquer', 'merge-sort', empty)) as MergeState).values).toEqual([]);
  expect(() => buildRecursiveTrace('recursion', 'unknown', new FormData())).toThrow();
});
it('invariants detect corrupted return values, invalid prefixes and unstable equal-value results', () => {
  const f = structuredClone(factorialTrace(4).steps.at(-1)!.state); (f.semantic as FactorialState).returned[0]!.value = 99;
  const b = structuredClone(combinationTrace(4, 2).steps.at(-1)!.state); (b.semantic as CombinationState).partial = [2, 1];
  const m = structuredClone(mergeSortTrace([2, 2]).steps.at(-1)!.state); (m.semantic as MergeState).origins = [1, 0];
  for (const state of [f, b, m]) expect(recursiveInvariants(state, true).some(i => i.status === 'fail')).toBe(true);
});

it('resumed factorial frames expose child results and local answers', () => {
  const trace = factorialTrace(4);
  const returned = trace.steps.find(step => step.source === 'rec.return')!;
  expect(returned.state.frames.at(-1)!.locals).toContain('child = 1');
  const multiplied = trace.steps.find(step => step.source === 'rec.multiply')!;
  expect(multiplied.state.frames.at(-1)!.locals).toContain('answer = 2');
});
