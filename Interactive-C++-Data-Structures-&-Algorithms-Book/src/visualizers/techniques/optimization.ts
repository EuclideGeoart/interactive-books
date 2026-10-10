import type { Invariant } from '../../engine/types';
import { emptyTechniqueState, type TechniqueState, type TechniqueTrace, type TechniqueStatus } from './types';

export interface Interval { start: number; finish: number }
interface Frame { id: number; amount: number; best: number; pending: number; returned: number }
export interface OptimizationState extends TechniqueState {
  operation: string; started: boolean;
  intervals: Interval[]; order: number[]; accepted: number[]; rejected: number[];
  coins: number[]; chosen: number[]; remaining: number;
  values: (number | null)[]; stack: Frame[];
  target: number; active: number; dependency: number; candidate: number; best: number;
  calls: number; hits: number; misses: number; checks: number; writes: number; maxDepth: number;
  answer: number | null; collapsed: boolean;
}
const value = (v: number | null): string => v === null ? 'unknown' : v < 0 ? 'unreachable' : String(v);
const integer = (v: number, min: number, max: number, name: string) => {
  if (!Number.isInteger(v) || v < min || v > max) throw new Error(`${name}: integer ${min} to ${max} required.`);
  return v;
};
function validateCoins(coins: number[], target: number) {
  integer(target, 0, 16, 'Target');
  if (coins.length > 6 || new Set(coins).size !== coins.length) throw new Error('Use at most six unique denominations.');
  coins.forEach(c => integer(c, 1, 16, 'Coin'));
  return [...coins].sort((a, b) => a - b);
}
function initial(kind: string, operation: string): OptimizationState {
  return { ...emptyTechniqueState(kind), operation, started: false, intervals: [], order: [], accepted: [], rejected: [], coins: [], chosen: [], remaining: 0,
    values: [], stack: [], target: 0, active: -1, dependency: -1, candidate: -1, best: -1,
    calls: 0, hits: 0, misses: 0, checks: 0, writes: 0, maxDepth: 0, answer: null, collapsed: false };
}
const explanations: Record<string, string> = {
  'greedy.sort': 'Order by earliest finish; equal finish times preserve original input order.',
  'greedy.inspect': 'Compare this activity start with the finish of the last accepted activity.',
  'greedy.accept': 'Commit to this compatible interval; touching endpoints are allowed.',
  'greedy.reject': 'This interval overlaps the last commitment. Keep the accepted schedule.',
  'greedy.done': 'The exchange argument proves maximum cardinality for these unweighted intervals.',
  'coin.start': 'Try denominations from largest to smallest. This rule has no general optimality guarantee.',
  'coin.inspect': 'Consider this denomination, even if the remaining amount is too small.',
  'coin.take': 'Commit one coin and subtract its denomination from the remaining amount.',
  'coin.done': 'A completed greedy representation need not use the fewest coins; failure does not prove impossibility.',
  'dp.base': 'Zero amount needs zero coins. Every other amount is still unknown.',
  'dp.start': 'Begin one amount with no reachable candidate. Its cell stays unknown until all coins are checked.',
  'dp.check': 'Count one denomination check. Coins larger than the amount are skipped.',
  'dp.candidate': 'Read a smaller resolved amount; unreachable dependencies cannot produce a candidate.',
  'dp.improve': 'Keep the strictly smaller reachable count. Equal candidates keep the first ascending coin.',
  'dp.write': 'All denominations were checked: publish the optimum, or proved unreachable.',
  'dp.done': 'Read the target cell after dependency-safe evaluation.',
  'memo.call': 'Push a conceptual invocation with its own amount, local best, and pending child.',
  'memo.hit': 'This amount is already solved, including a cached unreachable result. Do not recompute it.',
  'memo.miss': 'This amount is unknown. Its dependencies must be solved before caching its result.',
  'memo.check': 'Count one denomination check; positive coins make every recursive dependency smaller.',
  'memo.pending': 'The caller retains its local best while waiting for this child amount.',
  'memo.candidate': 'The child has returned. Add one coin only when its amount is reachable.',
  'memo.improve': 'Update this caller’s local best, not a shared best belonging to another invocation.',
  'memo.write': 'Cache the completed result. Unknown and unreachable are different states.',
  'memo.return': 'Expose the return value while the frame still exists.',
  'memo.pop': 'Remove the returned frame; the waiting caller remains intact.',
  'memo.done': 'The target is solved. Amounts never needed by this recursion may remain unknown.',
  'fib.call': 'One invocation is a tree node; equal arguments at different nodes repeat the same subproblem.',
  'fib.pending': 'Retain the left return value while waiting for the right recursive call.',
  'fib.return': 'The call now has a result; repeated arguments produced identical results independently.',
  'fib.pop': 'Unwind one frame after observing its return.',
  'fib.collapse': 'Group calls by equal argument. The dependency DAG has only one node per subproblem.',
  'fib.write': 'Evaluate each DAG state once, reading its already resolved predecessors.',
  'fib.done': 'Compare recursive calls with DAG writes: repeated work became reused values.',
};
function present(s: OptimizationState, tag: string) {
  s.frames = s.stack.map(f => ({ id: `call-${f.id}`, function: s.operation === 'fibonacci' ? 'F' : 'solve', arguments: `${s.operation === 'fibonacci' ? 'n' : 'amount'} = ${f.amount}`,
    locals: s.operation === 'fibonacci' ? `left return = ${f.best < 0 ? 'pending' : f.best}` : `best = ${f.best < 0 ? 'no reachable candidate yet' : f.best}`,
    resume: f.pending < 0 ? 'No child pending' : s.operation === 'fibonacci' ? `Waiting for F(${f.pending})` : `Waiting for amount ${f.pending}`,
    returned: tag.endsWith('.return') && f === s.stack.at(-1) ? value(f.returned) : null }));
  s.metrics = [{ label: 'Denomination / interval checks', value: s.checks }, { label: 'Resolved writes', value: s.writes },
    { label: 'Calls', value: s.calls }, { label: 'Cache hits', value: s.hits }, { label: 'Cache misses', value: s.misses }, { label: 'Maximum depth', value: s.maxDepth }];
  if (s.kind === 'greedy' && s.operation === 'intervals') {
    const status = (id: number): TechniqueStatus => s.accepted.includes(id) ? 'accepted' : s.rejected.includes(id) ? 'rejected' : id === s.active ? 'current' : 'unexplored';
    s.cells = s.intervals.map((i, id) => ({ id: `interval-${id}`, label: `Activity ${id + 1}`, value: `${i.start} to ${i.finish}`, status: status(id), detail: 'Half-open interval: a finish may equal the next start.' }));
    s.table = { caption: 'Finish-ordered candidate schedule', columns: ['Activity', 'Start', 'Finish', 'Decision'], rows: s.order.map(id => ({ id: `row-${id}`, values: [String(id + 1), String(s.intervals[id]!.start), String(s.intervals[id]!.finish), status(id)], status: status(id) })) };
    s.focus = s.active < 0 ? '' : `interval-${s.active}`;
    s.result = s.answer === null ? `Accepted ${s.accepted.length}` : `Maximum compatible activities: ${s.answer}`;
  } else if (s.kind === 'greedy') {
    s.cells = s.coins.map(c => ({ id: `coin-${c}`, label: `Coin ${c}`, value: `${s.chosen.filter(x => x === c).length} used`, status: c === s.active ? 'current' : 'unexplored', detail: 'Largest-first commits without revisiting previous choices.' }));
    s.table = { caption: 'Committed partial solution', columns: ['Choice', 'Coin'], rows: s.chosen.map((c, i) => ({ id: `chosen-${i}`, values: [String(i + 1), String(c)], status: 'accepted' })) };
    s.focus = s.active < 0 ? '' : `coin-${s.active}`;
    s.result = s.answer === null ? `Remaining: ${s.remaining}` : s.answer < 0 ? `Greedy stuck; remaining ${s.remaining}. This does not prove unreachable.` : `Greedy used ${s.answer} coins: ${s.chosen.join(' + ') || 'empty sum'}`;
  } else {
    const focused = s.stack.at(-1)?.amount ?? s.active;
    s.cells = s.values.map((v, a) => ({ id: `amount-${a}`, label: s.operation === 'fibonacci' ? `F(${a})` : `D(${a})`, value: value(v),
      status: a === focused ? 'current' : a === s.dependency ? 'dependency' : v === null ? 'unknown' : v < 0 ? 'rejected' : 'resolved',
      detail: v === null ? 'Not evaluated yet.' : v < 0 ? 'Evaluated: no representation exists.' : `Resolved value ${v}.` }));
    s.focus = focused < 0 ? '' : `amount-${focused}`;
    s.table = { caption: 'Current candidates and retained locals', columns: s.operation === 'fibonacci' ? ['n', 'Pending argument', 'Return', 'Retained left'] : ['Amount', 'Dependency', 'Candidate', 'Best'], rows: s.stack.length
      ? s.stack.map(f => ({ id: `local-${f.id}`, values: [String(f.amount), f.pending < 0 ? 'none' : String(f.pending), s.operation === 'fibonacci' ? (tag === 'fib.return' && f === s.stack.at(-1) ? String(f.returned) : 'pending') : f === s.stack.at(-1) && ['memo.candidate','memo.improve'].includes(tag) ? value(s.candidate) : 'pending', f.best < 0 ? (s.operation === 'fibonacci' ? 'pending' : 'no candidate yet') : String(f.best)], status: 'current' }))
      : [{ id: 'candidate', values: [s.active < 0 ? 'none' : String(s.active), s.dependency < 0 ? 'none' : String(s.dependency), s.dependency < 0 ? 'none yet' : value(s.candidate), s.best < 0 ? 'no candidate yet' : String(s.best)], status: 'current' }] };
    s.dependencies = s.dependency >= 0 && s.active >= 0 ? [{ from: `amount-${s.dependency}`, to: `amount-${s.active}`, label: 'candidate + 1' }] : [];
    if (s.operation === 'memo') {
      s.dependencies = s.stack.filter(f => f.pending >= 0).map(f => ({ from: `amount-${f.pending}`, to: `amount-${f.amount}`, label: 'waiting for' }));
      if (tag === 'memo.candidate' || tag === 'memo.improve') s.dependencies = [{ from: `amount-${s.dependency}`, to: `amount-${s.active}`, label: 'returned + 1' }];
    }
    if (s.operation === 'fibonacci') {
      if (s.collapsed) {
        s.table = { caption: 'One row per Fibonacci subproblem', columns: ['State', 'Dependencies', 'Value'], rows: s.values.map((v, a) => ({ id: `fib-row-${a}`, values: [`F(${a})`, a < 2 ? 'base case' : `F(${a - 1}), F(${a - 2})`, value(v)], status: v === null ? 'unknown' : 'resolved' })) };
        s.nodes = s.values.map((v, a) => ({ id: `fib-${a}`, label: `F(${a})`, detail: value(v), parent: null, status: v === null ? 'unknown' : 'resolved', x: 24 + a * 184, y: 24 + (a % 2) * 110 }));
        s.dependencies = s.values.flatMap((_, a) => a < 2 ? [] : [1, 2].map(d => ({ from: `fib-${a - d}`, to: `fib-${a}`, label: `F(${a - d})` })));
      } else {
        if (!s.stack.length) s.table.rows = [];
        const f = s.stack.at(-1);
        if (f) {
          s.focus = `call-${f.id}`;
          const node = s.nodes.find(n => n.id === s.focus)!;
          node.status = tag === 'fib.return' ? 'resolved' : 'current';
          if (tag === 'fib.return') node.detail = `returns ${f.returned}`;
        }
        s.nodes.forEach(n => { if (n.status === 'current' && n.id !== s.focus) n.status = 'accepted'; });
      }
    }
    s.result = s.answer === null ? 'Evaluation in progress' : s.answer < 0 ? 'Target is unreachable' : `${s.operation === 'fibonacci' ? 'Fibonacci value' : 'Minimum coins'}: ${s.answer}`;
  }
}
function recorder(s: OptimizationState) {
  present(s, '');
  const trace: TechniqueTrace<OptimizationState> = { initial: structuredClone(s), steps: [] };
  return { trace, emit(tag: string) { s.started = true; present(s, tag); trace.steps.push({ event: { type: tag }, source: tag, title: tag.split('.').join(' · '), explanation: explanations[tag]!, state: structuredClone(s) }); } };
}
export function intervalTrace(intervals: Interval[]): TechniqueTrace<OptimizationState> {
  if (intervals.length > 8) throw new Error('At most eight intervals.');
  intervals.forEach(i => { integer(i.start, 0, 19, 'Start'); integer(i.finish, i.start + 1, 20, 'Finish'); });
  const s = initial('greedy', 'intervals'); s.intervals = structuredClone(intervals);
  const { trace, emit } = recorder(s);
  s.order = intervals.map((_, i) => i).sort((a, b) => intervals[a]!.finish - intervals[b]!.finish || a - b); emit('greedy.sort');
  let finish = 0;
  for (const id of s.order) {
    s.active = id; s.checks++; emit('greedy.inspect');
    if (intervals[id]!.start >= finish) { s.accepted.push(id); finish = intervals[id]!.finish; emit('greedy.accept'); }
    else { s.rejected.push(id); emit('greedy.reject'); }
  }
  s.answer = s.accepted.length; emit('greedy.done'); return trace;
}
export function greedyCoinTrace(coins: number[], target: number): TechniqueTrace<OptimizationState> {
  const sorted = validateCoins(coins, target), s = initial('greedy', 'coins'); s.coins = sorted; s.target = target; s.remaining = target;
  const { trace, emit } = recorder(s); emit('coin.start');
  for (const c of [...sorted].reverse()) {
    s.active = c; s.checks++; emit('coin.inspect');
    while (s.remaining >= c) { s.remaining -= c; s.chosen.push(c); emit('coin.take'); }
  }
  s.answer = s.remaining === 0 ? s.chosen.length : -1; emit('coin.done'); return trace;
}
export function coinDPTrace(coins: number[], target: number, strategy: 'coins' | 'memo' | 'tabulation' = 'coins'): TechniqueTrace<OptimizationState> {
  const s = initial(strategy === 'coins' ? 'dynamic-programming' : 'memo-tabulation', strategy);
  s.coins = validateCoins(coins, target); s.target = target; s.values = Array(target + 1).fill(null);
  const { trace, emit } = recorder(s);
  if (strategy === 'memo') {
    const solve = (amount: number): number => {
      const f: Frame = { id: s.calls++, amount, best: -1, pending: -1, returned: -1 };
      s.stack.push(f); s.maxDepth = Math.max(s.maxDepth, s.stack.length); emit('memo.call');
      if (s.values[amount] !== null) { s.hits++; emit('memo.hit'); }
      else {
        s.misses++; emit('memo.miss'); let best = amount === 0 ? 0 : -1; f.best = best;
        if (amount !== 0) for (const coin of s.coins) {
          s.checks++; emit('memo.check'); if (coin > amount) continue;
          f.pending = amount - coin; emit('memo.pending');
          const previous = solve(amount - coin); s.active = amount; s.dependency = amount - coin;
          s.candidate = previous < 0 ? -1 : previous + 1; emit('memo.candidate');
          if (s.candidate >= 0 && (best < 0 || s.candidate < best)) { best = s.candidate; f.best = best; emit('memo.improve'); }
          f.pending = -1;
        }
        s.values[amount] = best; s.writes++; emit('memo.write');
      }
      const result = s.values[amount]!; f.returned = result; emit('memo.return'); s.stack.pop(); emit('memo.pop'); return result;
    };
    s.answer = solve(target); emit('memo.done');
  } else {
    s.values[0] = 0; s.writes++; emit('dp.base');
    for (let amount = 1; amount <= target; amount++) {
      s.active = amount; s.best = -1; s.dependency = -1; s.candidate = -1; emit('dp.start');
      for (const coin of s.coins) {
        s.checks++; emit('dp.check'); if (coin > amount) continue;
        s.dependency = amount - coin; const previous = s.values[s.dependency]!;
        s.candidate = previous < 0 ? -1 : previous + 1; emit('dp.candidate');
        if (s.candidate >= 0 && (s.best < 0 || s.candidate < s.best)) { s.best = s.candidate; emit('dp.improve'); }
      }
      s.values[amount] = s.best; s.writes++; emit('dp.write');
    }
    s.answer = s.values[target]!; emit('dp.done');
  }
  return trace;
}
export function fibonacciTrace(n: number): TechniqueTrace<OptimizationState> {
  integer(n, 0, 6, 'Fibonacci n'); const s = initial('dynamic-programming', 'fibonacci'); s.target = n; s.values = Array(n + 1).fill(null);
  let leaf = 0, id = 0;
  const layout = (k: number, parent: string | null, depth: number): number => {
    const node = { id: `call-${id++}`, label: `F(${k})`, detail: 'unexplored invocation', parent, status: 'unexplored' as TechniqueStatus, x: 0, y: 24 + depth * 110 };
    s.nodes.push(node);
    node.x = k < 2 ? 24 + leaf++ * 184 : (layout(k - 1, node.id, depth + 1) + layout(k - 2, node.id, depth + 1)) / 2;
    return node.x;
  };
  layout(n, null, 0); const { trace, emit } = recorder(s);
  const visit = (k: number): number => {
    const f: Frame = { id: s.calls++, amount: k, best: -1, pending: -1, returned: -1 }; s.stack.push(f); s.maxDepth = Math.max(s.maxDepth, s.stack.length); emit('fib.call');
    let result = k;
    if (k > 1) { const left = visit(k - 1); f.best = left; f.pending = k - 2; emit('fib.pending'); result = left + visit(k - 2); }
    f.returned = result; emit('fib.return'); s.stack.pop(); emit('fib.pop'); return result;
  };
  visit(n); s.collapsed = true; emit('fib.collapse');
  for (let k = 0; k <= n; k++) { s.active = k; s.values[k] = k < 2 ? k : s.values[k - 1]! + s.values[k - 2]!; s.writes++; emit('fib.write'); }
  s.answer = s.values[n]!; emit('fib.done'); return trace;
}
function numberField(form: FormData, key: string, fallback: string) {
  const raw = String(form.get(key) ?? fallback).trim();
  if (!/^\d+$/.test(raw)) throw new Error(`${key}: enter a whole nonnegative number.`);
  return Number(raw);
}
export function buildOptimizationTrace(kind: string, operation: string, inputs: FormData): TechniqueTrace<OptimizationState> {
  if (kind === 'greedy' && operation === 'intervals') {
    const raw = String(inputs.get('intervals') ?? '0:3,1:2,2:4,3:5,4:6').trim();
    const intervals = raw ? raw.split(',').map(piece => { if (!/^\s*\d+\s*:\s*\d+\s*$/.test(piece)) throw new Error('Intervals use start:finish pairs separated by commas.'); const [start, finish] = piece.split(':').map(Number); return { start: start!, finish: finish! }; }) : [];
    return intervalTrace(intervals);
  }
  if (kind === 'dynamic-programming' && operation === 'fibonacci') return fibonacciTrace(numberField(inputs, 'n', '5'));
  if (!((kind === 'greedy' || kind === 'dynamic-programming') && operation === 'coins') && !(kind === 'memo-tabulation' && ['memo', 'tabulation'].includes(operation))) throw new Error('Unknown optimization operation.');
  const raw = String(inputs.get('coins') ?? '1,3,4').trim();
  if (raw && !/^\d+(\s*,\s*\d+)*$/.test(raw)) throw new Error('Coins use positive integers separated by commas.');
  const coins = raw ? raw.split(',').map(Number) : [], target = numberField(inputs, 'target', '6');
  return kind === 'greedy' ? greedyCoinTrace(coins, target) : coinDPTrace(coins, target, operation as 'coins' | 'memo' | 'tabulation');
}
export function optimizationRegions(kind: string, operation: string): string[] {
  return [kind === 'greedy' ? operation === 'intervals' ? 'intervals' : 'greedy-coins' : kind === 'dynamic-programming' ? operation === 'fibonacci' ? 'fibonacci' : 'coin-dp' : operation];
}
export function optimizationInvariants(state: TechniqueState, settled: boolean): Invariant[] {
  const s = state as OptimizationState;
  const check = (name: string, pass: boolean, detail: string): Invariant => ({ name, status: pass ? 'pass' : 'fail', detail });
  const ids = new Set([...s.nodes, ...s.cells].map(n => n.id));
  const out = [check('Owned dependencies', s.dependencies.every(d => ids.has(d.from) && ids.has(d.to)), 'Every dependency names an existing cell or conceptual node.')];
  if (s.kind === 'greedy' && s.operation === 'intervals') {
    out.push(check('Compatible commitments', s.accepted.every((id, i) => i === 0 || s.intervals[s.accepted[i - 1]!]!.finish <= s.intervals[id]!.start), 'Accepted half-open intervals never overlap.'));
  } else if (s.kind === 'greedy') {
    out.push(check('Amount conservation', s.chosen.reduce((a, b) => a + b, 0) + s.remaining === s.target, 'Committed coin sum plus remainder equals the target.'));
  } else {
    out.push(check('Terminating dependencies', s.stack.every((f, i) => i === 0 || f.amount < s.stack[i - 1]!.amount), 'Positive coins and smaller Fibonacci arguments make calls terminate.'));
    if (s.operation !== 'fibonacci') out.push(check('Resolved recurrence', s.values.every((v, a) => {
      if (v === null) return true; if (a === 0) return v === 0;
      const deps = s.coins.filter(c => c <= a).map(c => s.values[a - c]);
      if (deps.some(d => d === null)) return false;
      const candidates = deps.filter((d): d is number => d !== null && d !== undefined && d >= 0).map(d => d + 1);
      return v === (candidates.length ? Math.min(...candidates) : -1);
    }), 'Only resolved smaller dependencies justify publishing an optimum or unreachable.'));
  }
  out.push({ name: 'Completion', status: !s.started ? 'pass' : !settled ? 'pending' : s.answer !== null && s.stack.length === 0 ? 'pass' : 'fail', detail: !s.started ? 'Initial state: evaluation has not begun.' : 'A finished trace has an answer and no live call frames.' });
  return out;
}
// Semantic projection shared with the independent native observer fixture.
export function optimizationSnapshot(s: OptimizationState) {
  if (s.kind === 'greedy') return { order: s.order, accepted: s.accepted, rejected: s.rejected, chosen: s.chosen, active: s.active, remaining: s.remaining, checks: s.checks, answer: s.answer ?? -1 };
  return { values: s.values, stack: s.stack.map(f => [f.id, f.amount, f.best, f.pending, f.returned]), active: s.active, dependency: s.dependency, candidate: s.candidate, best: s.best,
    calls: s.calls, hits: s.hits, misses: s.misses, checks: s.checks, writes: s.writes, maxDepth: s.maxDepth, answer: s.answer ?? -1, collapsed: s.collapsed };
}
