import type { Invariant, Trace } from '../../engine/types';
export interface HeapState { data: number[]; max: boolean; i: number | null; parent: number | null; child: number | null; right: number | null; comparisons: number; swaps: number; result: number | null; error: string; building: boolean }
export interface HeapEvent { type: 'Append' | 'Compare' | 'Index' | 'Swap' | 'MoveLast' | 'Pop' | 'Build' | 'Return' | 'Throw' | 'InvariantCheck'; detail: string; indices?: number[] }
export const heapOperations = ['insert', 'peek', 'extract', 'build'] as const;
export type HeapOperation = typeof heapOperations[number];
export const heapParent = (i: number) => i === 0 ? null : Math.floor((i - 1) / 2);
export const heapBetter = (s: HeapState, a: number, b: number) => s.max ? a > b : a < b;
export function heapViolations(s: HeapState): number[] { return s.data.flatMap((v, i) => i > 0 && heapBetter(s, v, s.data[heapParent(i)!]!) ? [i] : []); }
export function heapState(data = [90, 70, 60, 40, 50, 20], max = true, allowUnordered = false): HeapState {
  if (data.length > 15 || data.some(v => !Number.isInteger(v) || Math.abs(v) > 999)) throw new Error('Use at most fifteen integers from −999 to 999.');
  const s: HeapState = { data: [...data], max, i: null, parent: null, child: null, right: null, comparisons: 0, swaps: 0, result: null, error: '', building: allowUnordered };
  if (!allowUnordered && heapViolations(s).length) throw new Error('Starting array violates heap order. Choose Build heap for unordered input.');
  return s;
}
export function describeHeap(s: HeapState): string { return `${s.max ? 'Max' : 'Min'} heap array [${s.data.join(', ')}]; tree uses these same indices. ${s.data.map((v, i) => `${i}:${v} parent=${heapParent(i) ?? 'none'}`).join('; ')}${s.result !== null ? ` · returned ${s.result}` : ''}${s.error ? ` · ${s.error}` : ''}`; }
export function heapInvariants(s: HeapState, settled: boolean): Invariant[] {
  const broken = heapViolations(s);
  return [{ name: 'Complete tree = contiguous indices 0…size−1', status: 'pass', detail: `${s.data.length} values; both views derive from this one array.` },
    { name: s.max ? 'Every parent ≥ its children' : 'Every parent ≤ its children', status: broken.length ? (!settled || s.building ? 'pending' : 'fail') : 'pass', detail: broken.length ? `Child indices ${broken.join(', ')} violate order${!settled || s.building ? '; sifting/building is in progress' : ''}.` : 'All existing parent/child edges satisfy heap order. Siblings need not be sorted.' }];
}
export function heapTrace(operation: HeapOperation, initial: HeapState, value = 95, buildValues = initial.data): Trace<HeapState, HeapEvent> {
  if (!heapOperations.includes(operation) || !Number.isInteger(value) || Math.abs(value) > 999) throw new Error('Choose an operation and value from −999 to 999.');
  if (operation === 'insert' && initial.data.length >= 15) throw new Error('Teaching limit: fifteen entries. Use fourteen or fewer before insertion.');
  if (operation === 'build') heapState(buildValues, initial.max, true);
  let s = structuredClone(initial); s.i = s.parent = s.child = s.right = null; s.comparisons = s.swaps = 0; s.result = null; s.error = '';
  const trace: Trace<HeapState, HeapEvent> = { initial: structuredClone(s), steps: [] };
  const emit = (type: HeapEvent['type'], tag: string | null, title: string, detail = '', indices?: number[]) => { trace.steps.push({ event: { type, detail, indices }, source: tag, title, explanation: title, state: structuredClone(s) }); };
  const condition = (tag: string, result: boolean, title: string) => { if (tag === 'hu.loop') s.parent = null; if (tag === 'hd.loop') s.child = s.right = null; emit('Compare', tag, `${title}: ${result}`, String(result)); return result; };
  const swap = (a: number, b: number, tag: string) => { [s.data[a], s.data[b]] = [s.data[b]!, s.data[a]!]; s.swaps++; emit('Swap', tag, `Swap indices ${a} and ${b} in the one array; both views change together.`, '', [a, b]); };
  const down = (start: number) => {
    s.i = start; s.parent = s.child = s.right = null;
    while (condition('hd.loop', s.i! < Math.floor(s.data.length / 2), 'Does this index have a left child?')) {
      s.child = 2 * s.i! + 1; emit('Index', 'hd.left', `left(${s.i}) = 2×${s.i}+1 = ${s.child}.`, '', [s.child]);
      s.right = s.child! + 1; emit('Index', 'hd.right', `right(${s.i}) = ${s.right}; check the size before reading.`, '', [s.right]);
      if (s.right! < s.data.length) s.comparisons++;
      if (condition('hd.choose', s.right! < s.data.length && heapBetter(s, s.data[s.right!]!, s.data[s.child!]!), 'Does the right child exist and outrank the left?')) { s.child = s.right; emit('Index', 'hd.child', 'Choose the better child.', '', [s.child!]); }
      s.comparisons++;
      if (condition('hd.ordered', !heapBetter(s, s.data[s.child!]!, s.data[s.i!]!), 'Is the parent already at least as good as the best child?')) { emit('Index', 'hd.stop', 'Stop: both child edges satisfy order.'); break; }
      const child: number = s.child!; swap(s.i!, child, 'hd.swap'); s.i = child; emit('Index', 'hd.advance', 'Continue down at the swapped child.', '', [s.i!]);
    }
  };
  if (operation === 'insert') {
    s.data.push(value); emit('Append', 'hi.append', `Append ${value}: a new final array cell and the same new tree leaf.`, '', [s.data.length - 1]);
    s.i = s.data.length - 1;
    while (condition('hu.loop', s.i! > 0, 'Is there a parent?')) {
      s.parent = heapParent(s.i!); emit('Index', 'hu.parent', `parent(${s.i}) = floor((${s.i}−1)/2) = ${s.parent}.`, '', [s.i!, s.parent!]); s.comparisons++;
      if (condition('hu.ordered', !heapBetter(s, s.data[s.i!]!, s.data[s.parent!]!), 'Is this edge already ordered?')) { emit('Index', 'hu.stop', 'Stop: equality also satisfies heap order.'); break; }
      const parent = s.parent!; swap(s.i!, parent, 'hu.swap'); s.i = parent; emit('Index', 'hu.advance', 'Continue at the old parent index.', '', [s.i!]);
    }
    s.i = s.parent = null; emit('Index', 'hi.up', 'sift_up returns; insertion is complete.');
  } else if (operation === 'build') {
    s.data = [...buildValues]; s.building = true; emit('Build', 'hb.assign', 'Take the unsorted input array. Its complete shape already exists; order is not yet guaranteed.');
    let start = Math.floor(s.data.length / 2); s.i = start; emit('Index', 'hb.start', 'Begin just after the last internal node. Leaves are already heaps.');
    while (condition('hb.loop', start > 0, 'Are there internal nodes left to process?')) {
      start--; s.i = start; emit('Index', 'hb.previous', `Process internal node ${start}; both child subtrees are already heaps.`, '', [start]);
      down(start); s.i = start; s.child = s.right = null; emit('Index', 'hb.down', `sift_down(${start}) returns.`);
    }
    s.building = false;
  } else if (condition(operation === 'peek' ? 'hp.empty' : 'he.empty', s.data.length === 0, 'Is the heap empty?')) {
    s.error = 'Underflow: heap empty; unchanged'; emit('Throw', operation === 'peek' ? 'hp.throw' : 'he.throw', s.error, 'throw');
  } else if (operation === 'peek') { s.result = s.data[0]!; emit('Return', 'hp.return', `Read root ${s.result}; no mutation.`, String(s.result), [0]); }
  else {
    s.result = s.data[0]!; emit('Index', 'he.save', `Save root ${s.result} as the eventual result.`, '', [0]);
    s.data[0] = s.data.at(-1)!; emit('MoveLast', 'he.move', 'Copy the last value to index 0. The last slot still exists until pop_back.', '', [0, s.data.length - 1]);
    s.data.pop(); emit('Pop', 'he.pop', 'Remove the final cell and its tree leaf; completeness is preserved.');
    if (condition('he.remaining', s.data.length > 0, 'Does the heap still have a root?')) { down(0); s.i = s.child = s.right = null; emit('Index', 'he.down', 'sift_down returns.'); }
    emit('Return', 'he.return', `Return saved root ${s.result}.`, String(s.result));
  }
  s.i = s.parent = s.child = s.right = null; emit('InvariantCheck', null, s.error || 'Operation complete; both views read one array.'); return trace;
}
export function heapHeight(n: number): number { if (!Number.isInteger(n) || n < 0 || n > 1024) throw new Error('Use size 0–1024.'); return n === 0 ? -1 : Math.floor(Math.log2(n)); }
export function heapFault(kind: 'parent' | 'early' | 'child'): { state: HeapState; explanation: string } {
  if (kind === 'child') return { state: { ...heapState([90, 70, 80, 40, 50, 60]), data: [70, 60, 80, 40, 50] }, explanation: 'After removing 90, choosing left child 70 instead of better right child 80 leaves 80 above its parent. Compare BOTH children first.' };
  if (kind === 'parent') return { state: { ...heapState([90, 80, 60, 70, 50, 40]), data: [90, 80, 60, 70, 50, 40, 65] }, explanation: 'For new index 6, floor(i/2)=3 is wrong: its parent is floor((i−1)/2)=2. The wrong comparison sees 65 ≤ 70 and stops, leaving the real 60→65 edge broken.' };
  return { state: { ...heapState(), data: [90, 70, 95, 40, 50, 20, 60] }, explanation: 'A 95 inserted at index 6 swaps with 60 at index 2, then stops too early. The 90→95 edge still violates max order.' };
}
