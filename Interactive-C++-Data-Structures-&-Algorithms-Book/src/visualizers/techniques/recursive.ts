import type { Invariant } from '../../engine/types';
import { emptyTechniqueState, type TechniqueState, type TechniqueTrace, type TechniqueStatus } from './types';

export interface FactorialState {
  n: number; iterative: boolean; stack: number[]; returned: { n: number; value: number }[];
  operand: number; value: number; calls: number; multiplications: number; maxDepth: number;
}
interface SearchNode { id: number; parent: number; depth: number; partial: number[]; status: TechniqueStatus }
export interface CombinationState {
  n: number; k: number; partial: number[]; solutions: number[][];
  stack: { id: number; start: number; candidate: number }[]; nodes: SearchNode[];
  calls: number; choices: number; prunes: number; maxDepth: number;
}
interface MergeFrame {
  id: number; lo: number; hi: number; mid: number; i: number; j: number;
  output: number[]; outputOrigins: number[]; phase: string;
}
export interface MergeState {
  original: number[]; values: number[]; origins: number[]; stack: MergeFrame[];
  nodes: { id: number; parent: number; lo: number; hi: number; depth: number; status: TechniqueStatus }[];
  calls: number; comparisons: number; writes: number; maxDepth: number;
}
export interface RecursiveState extends TechniqueState { semantic: FactorialState | CombinationState | MergeState }
const list = (values: number[]) => `[${values.join(', ')}]`;
const frameId = (id: number) => `call-${id}`;
const bound = (value: number, max: number, label: string, min = 0) => {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${label} must be an integer in ${min}..${max}.`);
  return value;
};
const cell = (id: string, label: string, value: string, status: TechniqueStatus, detail: string) => ({ id, label, value, status, detail });

function factorialDisplay(d: FactorialState, tag: string): RecursiveState {
  const s: RecursiveState = { ...emptyTechniqueState('recursion'), semantic: d };
  s.frames = d.stack.map(n => ({ id: frameId(d.n - n), function: d.iterative ? 'factorial_iterative' : 'factorial_call', arguments: `n = ${n}`,
    locals: d.iterative ? `factor = ${d.operand || 2}; accumulator = ${d.value}` : [
      `retained n = ${n}`,
      n <= 1 ? 'base case: no child call' : d.returned.some(r => r.n === n - 1) ? `child = ${d.returned.find(r => r.n === n - 1)!.value}` : 'child pending',
      d.stack.at(-1) === n && ['rec.base', 'rec.multiply'].includes(tag) ? `answer = ${d.value}` : 'answer pending'
    ].join('; '),
    resume: d.iterative ? 'advance loop, then return accumulator' : n <= 1 ? 'return base value 1' : `multiply returned child by ${n}`,
    returned: null }));
  const visited = d.iterative ? (d.calls ? [d.n] : []) : Array.from({ length: d.calls }, (_, i) => d.n - i);
  s.nodes = visited.map((n, i) => {
    const returned = d.returned.find(r => r.n === n);
    return { id: frameId(i), parent: i ? frameId(i - 1) : null, label: `factorial(${n})`, detail: returned ? `returned ${returned.value}` : `retains n = ${n}`,
      status: returned ? 'resolved' : d.stack.at(-1) === n ? 'current' : 'accepted', x: 32, y: 32 + i * 110 };
  });
  s.cells = visited.map((n, i) => {
    const r = d.returned.find(r => r.n === n);
    return cell(`return-${i}`, `factorial(${n})`, r ? String(r.value) : 'pending', r ? 'resolved' : 'unknown', `Return value for conceptual frame ${i}.`);
  });
  s.table = { caption: 'Retained arguments and returned values', columns: ['Call', 'Retained n', 'Return'], rows: visited.map((n, i) => ({ id: `return-${i}`, values: [`factorial(${n})`, String(n), d.returned.find(r => r.n === n)?.value.toString() ?? 'pending'], status: d.returned.some(r => r.n === n) ? 'resolved' : 'unknown' })) };
  s.dependencies = s.nodes.filter(n => n.parent).map(n => ({ from: n.id, to: n.parent!, label: 'return to caller' }));
  s.focus = d.stack.length ? frameId(d.iterative ? 0 : d.n - d.stack.at(-1)!) : (s.nodes[0]?.id ?? '');
  s.metrics = [{ label: 'Calls', value: d.calls }, { label: 'Maximum depth', value: d.maxDepth }, { label: 'Multiplications', value: d.multiplications }];
  s.result = tag.endsWith('.done') ? `${d.n}! = ${d.value}` : `Returned value / accumulator: ${d.value}`;
  return s;
}
function combinationDisplay(d: CombinationState, tag: string): RecursiveState {
  const s: RecursiveState = { ...emptyTechniqueState('backtracking'), semantic: d };
  const top = d.stack.at(-1);
  s.frames = d.stack.map(f => ({ id: frameId(f.id), function: 'explore', arguments: `start = ${f.start}`,
    locals: `candidate = ${f.candidate || 'pending'}; prefix = ${list(d.nodes[f.id]!.partial)}`, resume: 'undo this choice, then try next candidate', returned: null }));
  // Preorder rows never move. Depth controls indentation; large trees scroll in the shared panel.
  s.nodes = d.nodes.map(n => ({ id: frameId(n.id), parent: n.parent < 0 ? null : frameId(n.parent), label: list(n.partial),
    detail: n.status === 'rejected' ? 'too few candidates remain' : n.status === 'solution' ? 'complete combination' : `next starts at ${(n.partial.at(-1) ?? 0) + 1}`,
    status: n.status, x: 32 + n.depth * 184, y: 32 + n.id * 100 }));
  s.cells = Array.from({ length: d.k }, (_, i) => cell(`partial-${i}`, `Chosen slot ${i}`, d.partial[i]?.toString() ?? 'empty', d.partial[i] === undefined ? 'unknown' : 'accepted', 'Shared partial vector; undo removes its last element.'));
  const candidates = Array.from({ length: Math.max(0, d.n - (top?.start ?? 1) + 1) }, (_, i) => (top?.start ?? 1) + i);
  for (const v of candidates) s.cells.push(cell(`candidate-${v}`, `Candidate ${v}`, top?.candidate === v ? 'selected' : 'available', top?.candidate === v ? 'current' : 'unexplored', 'Choices advance in increasing order; recurse with candidate + 1.'));
  s.table = { caption: 'Candidates, partial solution, and saved solutions', columns: ['Role', 'Value', 'Meaning'], rows: [
    ...candidates.map(v => ({ id: `candidate-${v}`, values: ['candidate', String(v), top?.candidate === v ? 'current candidate' : 'ascending order'], status: (top?.candidate === v ? 'current' : 'unexplored') as TechniqueStatus })),
    { id: 'partial-summary', values: ['partial', list(d.partial), `${d.partial.length} of ${d.k} slots`], status: 'current' },
    ...d.solutions.map((v, i) => ({ id: `solution-${i}`, values: ['solution', list(v), 'saved copy'], status: 'solution' as const }))
  ] };
  s.focus = tag === 'bt.choose' ? frameId(d.nodes.length - 1) : top ? frameId(top.id) : frameId(0);
  s.result = `${d.solutions.length} combinations${tag === 'bt.done' ? '; partial restored to []' : ' saved'}`;
  s.metrics = [{ label: 'Calls', value: d.calls }, { label: 'Choices', value: d.choices }, { label: 'Pruned branches', value: d.prunes }, { label: 'Maximum depth', value: d.maxDepth }];
  return s;
}
function mergeDisplay(d: MergeState, tag: string): RecursiveState {
  const s: RecursiveState = { ...emptyTechniqueState('divide-conquer'), semantic: d };
  const top = d.stack.at(-1);
  s.frames = d.stack.map(f => ({ id: frameId(f.id), function: 'solve', arguments: `range [${f.lo}, ${f.hi})`,
    locals: `mid = ${f.mid}; i = ${f.i}; j = ${f.j}; output = ${list(f.output)}`, resume: f.phase === 'divide' ? 'solve children, then combine' : 'finish merge, then return', returned: null }));
  s.nodes = d.nodes.map(n => ({ id: frameId(n.id), parent: n.parent < 0 ? null : frameId(n.parent), label: `[${n.lo}, ${n.hi})`,
    detail: n.hi - n.lo <= 1 ? 'base range' : `combine ${n.hi - n.lo} items`, status: n.status,
    x: 32 + Math.max(0, n.lo + n.hi - 1) * 92, y: 32 + n.depth * 110 }));
  s.cells = d.values.map((v, i) => cell(`value-${i}`, `a[${i}]`, String(v), top && i >= top.lo && i < top.hi ? 'current' : 'resolved', `Original index ${d.origins[i]}; equal values retain input order.`));
  if (top) top.output.forEach((v, i) => s.cells.push(cell(`buffer-${i}`, `output[${i}]`, String(v), 'accepted', `From original index ${top.outputOrigins[i]}; not yet all copied back.`)));
  s.dependencies = top && top.phase === 'merge' ? [top.i < top.mid ? { from: `value-${top.i}`, to: frameId(top.id), label: 'left candidate' } : null,
    top.j < top.hi ? { from: `value-${top.j}`, to: frameId(top.id), label: 'right candidate' } : null].filter((v): v is NonNullable<typeof v> => v !== null) : [];
  s.table = { caption: 'Subranges and combine work', columns: ['Range', 'Left half', 'Right half', 'State'], rows: d.nodes.map(n => {
    const mid = n.lo + Math.floor((n.hi - n.lo) / 2);
    return { id: frameId(n.id), values: [`[${n.lo}, ${n.hi})`, `[${n.lo}, ${mid})`, `[${mid}, ${n.hi})`, n.status], status: n.status };
  }) };
  s.focus = top ? frameId(top.id) : (s.nodes[0]?.id ?? '');
  s.result = tag === 'dc.done' ? `Sorted: ${list(d.values)}` : `Working array: ${list(d.values)}`;
  s.metrics = [{ label: 'Calls', value: d.calls }, { label: 'Maximum depth', value: d.maxDepth }, { label: 'Comparisons', value: d.comparisons }, { label: 'Combine writes', value: d.writes }];
  return s;
}
function recorder<D extends RecursiveState['semantic']>(data: D, display: (d: D, tag: string) => RecursiveState) {
  const trace: TechniqueTrace<RecursiveState> = { initial: structuredClone(display(data, '')), steps: [] };
  const emit = (tag: string, title: string, explanation: string) => trace.steps.push({ event: { type: tag }, source: tag, title, explanation, state: structuredClone(display(data, tag)) });
  return { trace, emit };
}

export function factorialTrace(n: number, iterative = false): TechniqueTrace<RecursiveState> {
  bound(n, 8, 'n');
  const d: FactorialState = { n, iterative, stack: [], returned: [], operand: 0, value: 1, calls: 0, multiplications: 0, maxDepth: 0 };
  const { trace, emit } = recorder(d, factorialDisplay);
  if (iterative) {
    d.stack.push(n); d.calls = d.maxDepth = 1;
    emit('iter.start', 'Start one frame', 'The accumulator begins at the multiplicative identity 1.');
    for (let factor = 2; factor <= n; ++factor) {
      d.value *= factor; d.operand = factor; ++d.multiplications;
      emit('iter.multiply', 'Accumulate one factor', `Multiply by ${factor}; the call depth stays one.`);
    }
    d.returned.push({ n, value: d.value }); d.stack.pop();
    emit('iter.done', 'Return accumulator', 'The loop has multiplied every factor from 2 through n.');
  } else {
    const call = (arg: number): number => {
      d.stack.push(arg); ++d.calls; d.maxDepth = Math.max(d.maxDepth, d.stack.length);
      emit('rec.enter', 'Enter a call frame', `This invocation owns n = ${arg}; its caller keeps its own n.`);
      let answer: number;
      if (arg <= 1) {
        answer = d.value = 1;
        emit('rec.base', 'Reach the base case', 'Both 0! and 1! are 1; no smaller call is needed.');
      } else {
        emit('rec.call', 'Suspend this caller', `Retain ${arg}; resume at multiplication after factorial(${arg - 1}) returns.`);
        const child = call(arg - 1);
        answer = arg * child; d.operand = arg; d.value = answer; ++d.multiplications;
        emit('rec.multiply', 'Resume the caller', `${arg} times returned child ${child} gives ${answer}.`);
      }
      d.returned.push({ n: arg, value: answer }); d.stack.pop();
      emit('rec.return', 'Return and remove this frame', `factorial(${arg}) returns ${answer}. Its retained argument is no longer live.`);
      return answer;
    };
    d.value = call(n);
    emit('rec.done', 'All calls returned', 'The final result is available; no conceptual frames remain.');
  }
  return trace;
}
export function combinationTrace(n: number, k: number): TechniqueTrace<RecursiveState> {
  bound(n, 6, 'n'); bound(k, 6, 'k');
  const d: CombinationState = { n, k, partial: [], solutions: [], stack: [], nodes: [{ id: 0, parent: -1, depth: 0, partial: [], status: 'unexplored' }], calls: 0, choices: 0, prunes: 0, maxDepth: 0 };
  const { trace, emit } = recorder(d, combinationDisplay);
  const explore = (start: number, id: number) => {
    d.stack.push({ id, start, candidate: 0 }); d.nodes[id]!.status = 'current'; ++d.calls; d.maxDepth = Math.max(d.maxDepth, d.stack.length);
    emit('bt.enter', 'Explore this prefix', `Next candidates start at ${start}; ${k - d.partial.length} slots remain.`);
    if (d.partial.length === k) {
      d.solutions.push([...d.partial]); d.nodes[id]!.status = 'solution';
      emit('bt.solution', 'Save a complete solution', 'Copy the partial vector before later undo operations change it.');
    } else if (n - start + 1 < k - d.partial.length) {
      ++d.prunes; d.nodes[id]!.status = 'rejected';
      emit('bt.prune', 'Prune an impossible suffix', 'The number of remaining candidates is smaller than the number of empty slots.');
    } else {
      for (let candidate = start; candidate <= n; ++candidate) {
        d.stack.at(-1)!.candidate = candidate;
        emit('bt.candidate', 'Inspect the next candidate', `Try ${candidate}; increasing order prevents duplicate sets.`);
        d.partial.push(candidate); ++d.choices;
        const child = d.nodes.length; d.nodes[id]!.status = 'accepted';
        d.nodes.push({ id: child, parent: id, depth: d.partial.length, partial: [...d.partial], status: 'unexplored' });
        emit('bt.choose', 'Choose: append one value', `Partial solution is now ${list(d.partial)}. The child has not been explored yet.`);
        explore(candidate + 1, child);
        d.partial.pop(); d.nodes[id]!.status = 'current';
        emit('bt.undo', 'Undo: restore the parent prefix', `Restore ${list(d.partial)} before trying another candidate.`);
      }
    }
    if (d.nodes[id]!.status === 'current') d.nodes[id]!.status = 'resolved';
    d.stack.pop();
    emit('bt.return', 'Return from this search', 'The caller will undo its choice next; returning alone does not pop the shared partial vector.');
  };
  explore(1, 0);
  emit('bt.done', 'Enumeration complete', 'Every increasing k-subset has been saved once and the shared partial solution is empty.');
  return trace;
}
export function mergeSortTrace(values: number[]): TechniqueTrace<RecursiveState> {
  if (values.length > 8) throw new Error('Use at most eight values.');
  values.forEach(v => bound(v, 1000000, 'value', -1000000));
  const d: MergeState = { original: [...values], values: [...values], origins: values.map((_, i) => i), stack: [], nodes: [], calls: 0, comparisons: 0, writes: 0, maxDepth: 0 };
  const { trace, emit } = recorder(d, mergeDisplay);
  const solve = (lo: number, hi: number, parent: number) => {
    const id = d.nodes.length, mid = lo + Math.floor((hi - lo) / 2);
    d.nodes.push({ id, parent, lo, hi, depth: d.stack.length, status: 'current' });
    d.stack.push({ id, lo, hi, mid, i: lo, j: mid, output: [], outputOrigins: [], phase: 'divide' });
    ++d.calls; d.maxDepth = Math.max(d.maxDepth, d.stack.length);
    emit('dc.enter', 'Solve one half-open range', `This call owns [${lo}, ${hi}); sibling ranges do not overlap.`);
    if (hi - lo <= 1) {
      d.stack.at(-1)!.phase = 'return';
      emit('dc.base', 'A tiny range is already sorted', 'Empty and singleton ranges need no comparisons or writes.');
    } else {
      d.nodes[id]!.status = 'accepted';
      emit('dc.split', 'Divide into independent halves', `[${lo}, ${mid}) and [${mid}, ${hi}) cover the parent exactly.`);
      solve(lo, mid, id); solve(mid, hi, id);
      const f = d.stack.at(-1)!; f.phase = 'merge'; d.nodes[id]!.status = 'current';
      while (f.i < mid || f.j < hi) {
        let left = f.j === hi;
        if (f.i < mid && f.j < hi) {
          ++d.comparisons;
          emit('dc.compare', 'Compare the two front candidates', 'Both halves are sorted. Equal values select the left half first.');
          left = d.values[f.i]! <= d.values[f.j]!;
        }
        const index = left ? f.i++ : f.j++;
        f.output.push(d.values[index]!); f.outputOrigins.push(d.origins[index]!);
        emit(left ? 'dc.take-left' : 'dc.take-right', 'Append to the combine buffer', `Take from the ${left ? 'left' : 'right'} half; the input range is still unchanged.`);
      }
      f.phase = 'write';
      for (let offset = 0; offset < hi - lo; ++offset) {
        d.values[lo + offset] = f.output[offset]!; d.origins[lo + offset] = f.outputOrigins[offset]!; ++d.writes;
        emit('dc.write', 'Copy back one result', `Write a[${lo + offset}]. The buffer preserves unread values during partial copy-back.`);
      }
    }
    d.nodes[id]!.status = 'resolved'; d.stack.pop();
    emit('dc.return', 'Return a sorted subrange', `[${lo}, ${hi}) is sorted; the parent may now use it.`);
  };
  solve(0, values.length, -1);
  emit('dc.done', 'Divide, solve, combine complete', 'The root range is sorted and equal-valued items retain original order.');
  return trace;
}
export function buildRecursiveTrace(kind: string, operation: string, inputs: FormData): TechniqueTrace<RecursiveState> {
  const integer = (name: string, fallback: string) => {
    const raw = String(inputs.get(name) ?? fallback).trim();
    if (!/^-?\d+$/.test(raw)) throw new Error(`${name} must be an integer.`);
    return Number(raw);
  };
  if (kind === 'recursion' && ['recursive', 'iterative'].includes(operation)) return factorialTrace(integer('n', '4'), operation === 'iterative');
  if (kind === 'backtracking' && operation === 'combinations') return combinationTrace(integer('n', '4'), integer('k', '2'));
  if (kind === 'divide-conquer' && operation === 'merge-sort') {
    const raw = String(inputs.get('values') ?? '7,2,5,2,9,1').trim();
    if (raw && !/^-?\d+(?:[\s,]+-?\d+)*$/.test(raw)) throw new Error('Use comma or space separated integers.');
    return mergeSortTrace(raw ? raw.split(/[\s,]+/).map(Number) : []);
  }
  throw new Error('Unknown recursive-family operation.');
}
export function recursiveRegions(kind: string, operation: string): string[] {
  if (kind === 'recursion' && ['recursive', 'iterative'].includes(operation)) return [`factorial-${operation}`];
  if (kind === 'backtracking' && operation === 'combinations') return ['combinations'];
  if (kind === 'divide-conquer' && operation === 'merge-sort') return ['merge-sort'];
  throw new Error('Unknown recursive-family operation.');
}
export function recursiveSnapshot(s: TechniqueState): RecursiveState['semantic'] { return (s as RecursiveState).semantic; }
export function recursiveInvariants(s: TechniqueState, settled: boolean): Invariant[] {
  const d = recursiveSnapshot(s);
  // mountTraceLab calls both initial and final snapshots settled; only completed work has final postconditions.
  const completed = settled && d.calls > 0 && d.stack.length === 0;
  const check = (name: string, ok: boolean, detail: string): Invariant => ({ name, status: ok ? 'pass' : 'fail', detail });
  const ids = new Set([...s.nodes, ...s.cells].map(n => n.id));
  const result = [check('Conceptual references exist', s.nodes.every(n => n.parent === null || ids.has(n.parent)) && s.dependencies.every(e => ids.has(e.from) && ids.has(e.to)), 'Frame and dependency IDs identify displayed objects, never native addresses.')];
  if ('iterative' in d) {
    result.push(check('Arguments approach the base case', d.stack.every((n, i) => n >= 0 && (i === 0 || d.stack[i - 1] === n + 1)), 'Each recursive child decreases its retained argument by one.'));
    result.push(check('Return values satisfy factorial', d.returned.every(r => r.value === Array.from({ length: r.n }, (_, i) => i + 1).reduce((a, b) => a * b, 1)), 'Each completed invocation returns the product of 1 through its own n.'));
  } else if ('partial' in d) {
    const valid = (v: number[]) => v.length <= d.k && v.every((x, i) => x >= 1 && x <= d.n && (i === 0 || v[i - 1]! < x));
    result.push(check('Partial solution stays increasing', valid(d.partial), 'Chosen values are distinct, in range, and occupy at most k slots.'));
    result.push(check('Saved solutions are valid and unique', d.solutions.every(v => valid(v) && v.length === d.k) && new Set(d.solutions.map(v => v.join(','))).size === d.solutions.length, 'Solutions are copies; undo cannot erase or mutate them.'));
    if (completed) result.push(check('Undo restores the root prefix', d.partial.length === 0, 'The shared partial vector is empty after enumeration.'));
  } else {
    result.push(check('Subranges are bounded', d.nodes.every(n => n.lo >= 0 && n.lo <= n.hi && n.hi <= d.values.length), 'Half-open ranges contain exactly hi minus lo items.'));
    result.push(check('Combine buffers are sorted', d.stack.every(f => f.output.every((v, i) => !i || f.output[i - 1]! <= v)), 'Choose the smaller front item; ties select left.'));
    if (completed) result.push(check('Stable sorted permutation', d.values.every((v, i) => d.original[d.origins[i]!] === v && (!i || d.values[i - 1]! < v || (d.values[i - 1] === v && d.origins[i - 1]! < d.origins[i]!))) && new Set(d.origins).size === d.original.length, 'Copy-back is complete, every original item occurs once, and equal values keep input order.'));
    else result.push({ name: 'Permutation during copy-back', status: 'pending', detail: 'A partial write can temporarily repeat an array entry; the combine buffer still owns every result.' });
  }
  if (completed) result.push(check('All calls have returned', d.stack.length === 0, 'No conceptual frame remains live.'));
  return result;
}
