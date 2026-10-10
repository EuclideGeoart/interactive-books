import { beforeAll, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { afterAll } from 'vitest';
import { compileOptimizationFixture } from '../../scripts/techniques-optimization-fixture.mjs';
import { PlaybackController } from '../../src/engine/playback';
import { buildOptimizationTrace, coinDPTrace, fibonacciTrace, greedyCoinTrace, intervalTrace, optimizationInvariants, optimizationRegions, optimizationSnapshot, type Interval } from '../../src/visualizers/techniques/optimization';
let binary: string;
beforeAll(() => { binary = compileOptimizationFixture(); }, 30000);
afterAll(() => { if (binary) rmSync(dirname(binary), { recursive: true }); });
const native = (mode: string, target: number, coins: number[]) => execFileSync(binary, [mode, String(target), ...coins.map(String)], { encoding: 'utf8' }).trim().split('\n').filter(Boolean).map(line => { const [tag, state] = line.split('|'); return [tag, JSON.parse(state!)]; });
const final = <S>(trace: { steps: {state:S}[] }) => trace.steps.at(-1)!.state;
// Independent breadth-first search in the amount graph, not the min recurrence.
function coinOracle(coins: number[], target: number) {
  const queue: [number, number][] = [[0, 0]], seen = new Set([0]);
  for (let i = 0; i < queue.length; i++) {
    const [amount, count] = queue[i]!; if (amount === target) return count;
    for (const c of coins) if (amount + c <= target && !seen.has(amount + c)) { seen.add(amount + c); queue.push([amount + c, count + 1]); }
  }
  return -1;
}
function intervalOracle(a: Interval[]) {
  let best = 0;
  for (let mask = 0; mask < 2 ** a.length; mask++) {
    const selected = a.filter((_, i) => mask & (1 << i));
    if (selected.every((x, i) => selected.slice(i + 1).every(y => x.finish <= y.start || y.finish <= x.start))) best = Math.max(best, selected.length);
  }
  return best;
}
it('greedy interval cardinality matches exhaustive compatible subsets, including stable ties', () => {
  const pool = [{start:0,finish:1},{start:0,finish:3},{start:1,finish:2},{start:1,finish:3},{start:2,finish:3},{start:3,finish:4}];
  for (let mask = 0; mask < 64; mask++) { const a = pool.filter((_, i) => mask & (1 << i)); expect(final(intervalTrace(a)).answer).toBe(intervalOracle(a)); }
  expect(final(intervalTrace([{start:0,finish:2},{start:1,finish:2},{start:2,finish:3}])).accepted).toEqual([0,2]);
});
it('all three DP modes match independent BFS for every small denomination subset and target', () => {
  for (let mask = 0; mask < 16; mask++) {
    const coins = [1,2,3,4].filter((_, i) => mask & (1 << i));
    for (let target = 0; target <= 12; target++) for (const mode of ['coins','memo','tabulation'] as const) expect(final(coinDPTrace(coins,target,mode)).answer).toBe(coinOracle(coins,target));
  }
});
it('greedy coin counterexample distinguishes suboptimal success from false impossibility', () => {
  expect(final(greedyCoinTrace([1,3,4],6)).chosen).toEqual([4,1,1]);
  expect(final(coinDPTrace([1,3,4],6)).answer).toBe(2);
  expect(final(greedyCoinTrace([3,4],6)).answer).toBe(-1);
  expect(coinOracle([3,4],6)).toBe(2);
});
it('memo caches unreachable results, preserves caller locals, and leaves unneeded states unknown', () => {
  const t = coinDPTrace([2,4],7,'memo'), s = final(t);
  expect(s.answer).toBe(-1); expect(s.values[0]).toBe(null); expect(s.values[1]).toBe(-1);
  expect(s.hits).toBeGreaterThan(0); expect(s.misses).toBe(s.writes); expect(s.calls).toBe(s.hits+s.misses);
  const hit = t.steps.find(step => step.source === 'memo.hit')!;
  expect(hit.state.values[hit.state.stack.at(-1)!.amount]).toBe(-1);
  const positive = coinDPTrace([1,3,4],6,'memo');
  const baseWrite = positive.steps.find(step => step.source === 'memo.write' && step.state.stack.at(-1)?.amount === 0)!;
  expect(baseWrite.state.stack.at(-1)!.best).toBe(0);
  expect(baseWrite.state.frames.at(-1)!.locals).toBe('best = 0');
  expect(positive.steps.some(step => step.state.stack.slice(0,-1).some(f => f.pending >= 0 && f.best >= 0))).toBe(true);
  expect(final(positive).frames).toEqual([]);
});
it('Fibonacci explicitly replaces repeated invocation nodes with unique DAG states', () => {
  const t = fibonacciTrace(5), collapsed = t.steps.find(s => s.source === 'fib.collapse')!.state;
  expect(t.initial.nodes.filter(n => n.label === 'F(3)')).toHaveLength(2);
  expect(collapsed.nodes).toHaveLength(6); expect(final(t).calls).toBe(15); expect(final(t).writes).toBe(6); expect(final(t).answer).toBe(5);
  expect(collapsed.dependencies).toHaveLength(8);
  for (const step of t.steps.filter(step => !step.state.collapsed)) expect(step.state.nodes.map(n => [n.id,n.x,n.y,n.parent])).toEqual(t.initial.nodes.map(n => [n.id,n.x,n.y,n.parent]));
  for (let n = 0; n <= 6; n++) {
    const nodes = fibonacciTrace(n).initial.nodes;
    for (const a of nodes) for (const b of nodes) if (a.id !== b.id && a.y === b.y) expect(Math.abs(a.x-b.x)).toBeGreaterThanOrEqual(184);
    expect(final(fibonacciTrace(n)).answer).toBe([0,1,1,2,3,5,8][n]);
  }
});
for (const [coins,target] of [[[1,3,4],6],[[2,4],7],[[],0],[[],7],[[1],16],[[4,3,1],6],[[16],16],[[5],3]] as [number[],number][]) {
  for (const mode of ['greedy','coins','memo','tabulation'] as const) it(`${mode}: native snapshot parity coins=${coins} target=${target}`, () => {
    const t = mode === 'greedy' ? greedyCoinTrace(coins,target) : coinDPTrace(coins,target,mode);
    expect(t.steps.map(step => [step.source, optimizationSnapshot(step.state)])).toEqual(native(mode,target,coins));
  });
}
for (let n = 0; n <= 6; n++) it(`Fibonacci ${n}: every native call/return and DAG write`, () => {
  expect(fibonacciTrace(n).steps.map(step => [step.source,optimizationSnapshot(step.state)])).toEqual(native('fibonacci',n,[]));
});
for (const a of [[],[{start:0,finish:3},{start:1,finish:2},{start:2,finish:4},{start:3,finish:5},{start:4,finish:6}],[{start:0,finish:2},{start:1,finish:2},{start:2,finish:3}]]) it(`interval observer parity for ${a.length} activities`, () => {
  expect(intervalTrace(a).steps.map(step => [step.source,optimizationSnapshot(step.state)])).toEqual(native('intervals',0,a.flatMap(i => [i.start,i.finish])));
});
it('every emitted tag belongs to its canonical source region and every snapshot reverses exactly', () => {
  for (const [kind,op,chapter,file] of [['greedy','intervals','48','Greedy'],['greedy','coins','48','Greedy'],['dynamic-programming','fibonacci','49','DynamicProgramming'],['dynamic-programming','coins','49','DynamicProgramming'],['memo-tabulation','memo','50','MemoTabulation'],['memo-tabulation','tabulation','50','MemoTabulation']]) {
    const t = buildOptimizationTrace(kind!,op!,new FormData()), text = readFileSync(`cpp/chapter-${chapter}/${file}.hpp`,'utf8');
    const region = optimizationRegions(kind!,op!)[0]!;
    const body = text.split(`// @begin ${region}\n`)[1]!.split(`// @end ${region}`)[0]!;
    const tags = [...body.matchAll(/@trace ([\w.]+)/g)].map(m => m[1]);
    expect(t.steps.every(step => tags.includes(step.source!))).toBe(true);
    const saved = structuredClone(t), player = new PlaybackController(t); player.seek(player.total);
    for (let i = player.total; i > 0; i--) { expect(player.state).toEqual(saved.steps[i-1]!.state); player.previous(); }
    expect(player.state).toEqual(saved.initial);
    for (let i = 0; i < t.steps.length; i++) expect(optimizationInvariants(t.steps[i]!.state, i === t.steps.length-1).some(v => v.status === 'fail')).toBe(false);
    t.steps.at(-1)!.state.cells[0]!.value = 'mutated'; expect(t.initial).toEqual(saved.initial); expect(t.steps[0]).toEqual(saved.steps[0]);
  }
});
it('invalid inputs are rejected before traces, including hostile strings and fractional numbers', () => {
  for (const coins of [[0],[-1],[1,1],[17],[1.5]]) {
    expect(() => coinDPTrace(coins,6)).toThrow(); expect(() => greedyCoinTrace(coins,6)).toThrow();
    if (coins.every(Number.isInteger)) expect(() => native('memo',6,coins)).toThrow();
  }
  expect(() => coinDPTrace([1],17)).toThrow(); expect(() => fibonacciTrace(7)).toThrow(); expect(() => intervalTrace([{start:2,finish:2}])).toThrow();
  for (const [key,v] of [['coins','<img src=x>'],['target','6.5'],['target',''],['coins','1,,3']]) { const form = new FormData(); form.set(key!,v!); expect(() => buildOptimizationTrace('dynamic-programming','coins',form)).toThrow(); }
  const form = new FormData(); form.set('intervals','<script>'); expect(() => buildOptimizationTrace('greedy','intervals',form)).toThrow();
  expect(() => buildOptimizationTrace('unknown','coins',new FormData())).toThrow();
});
