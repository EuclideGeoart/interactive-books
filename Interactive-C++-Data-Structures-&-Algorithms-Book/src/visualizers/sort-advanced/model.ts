import type { Invariant, Trace } from '../../engine/types';
import type { SortItem, SortingScene } from '../sorting/types';

export type AdvancedKind = 'merge' | 'quick' | 'heap' | 'counting' | 'radix';
export type QuickFault = 'none' | 'bounds' | 'pivot' | 'no-progress';
export interface SortCounters {
  comparisons: number; swaps: number; writes: number; bufferWrites: number;
  passes: number; maxDepth: number; digitReads: number; maximumScans: number;
}
export interface AdvancedState {
  kind: AdvancedKind; original: SortItem[]; a: SortItem[]; tmp: (SortItem | null)[];
  counts: number[]; stack: [number, number][];
  lo: number; mid: number; hi: number; i: number; j: number; k: number;
  pivot: number; pivotId: number; heapSize: number; child: number; right: number;
  divisor: number; maximum: number; digit: number; condition: boolean;
  phase: string; fault: string; counters: SortCounters;
}
export interface SortEvent { type: string; }
export type SortTrace = Trace<AdvancedState, SortEvent>;
const copy = <T>(x: T): T => structuredClone(x);
function create(kind: AdvancedKind, values: number[]) {
  if (values.length > 32 || values.some(x => !Number.isInteger(x) || x < -2147483648 || x > 2147483647))
    throw new Error('Use at most 32 signed 32-bit integers (−2147483648 through 2147483647).');
  const a = values.map((key, id) => ({ key, id }));
  const s: AdvancedState = {
    kind, original: copy(a), a, tmp: [], counts: [], stack: [],
    lo: 0, mid: -1, hi: a.length, i: -1, j: -1, k: -1,
    pivot: -1, pivotId: -1, heapSize: a.length, child: -1, right: -1,
    divisor: 1, maximum: 0, digit: -1, condition: false,
    phase: 'ready', fault: '', counters: { comparisons: 0, swaps: 0, writes: 0, bufferWrites: 0, passes: 0, maxDepth: 0, digitReads: 0, maximumScans: 0 },
  };
  const trace: SortTrace = { initial: copy(s), steps: [] };
  const emit = (tag: string, title: string) => trace.steps.push({ source: tag, event: { type: tag.split('.')[1]! }, title, explanation: title, state: copy(s) });
  const swap = (a: number, b: number) => { [s.a[a], s.a[b]] = [s.a[b]!, s.a[a]!]; s.counters.swaps++; s.counters.writes += 2; };
  return { s, trace, emit, swap };
}
export function mergeTrace(values: number[]): SortTrace {
  const { s, trace, emit } = create('merge', values);
  s.tmp = s.a.map(() => null); emit('merge.allocate', 'Allocate one n-item temporary buffer; input is unchanged.');
  function sort(lo: number, hi: number) {
    s.lo = lo; s.hi = hi; s.mid = -1; s.i = s.j = s.k = -1; s.stack.push([lo, hi]);
    s.counters.maxDepth = Math.max(s.counters.maxDepth, s.stack.length); s.phase = 'divide';
    emit('merge.enter', `Enter [${lo}, ${hi}); active recursion depth ${s.stack.length}.`);
    s.condition = hi - lo < 2; emit('merge.base', `Range has fewer than two items: ${s.condition}.`);
    if (!s.condition) {
      const mid = lo + Math.floor((hi - lo) / 2); s.mid = mid;
      emit('merge.split', `Split into [${lo}, ${mid}) and [${mid}, ${hi}).`);
      sort(lo, mid); sort(mid, hi);
      s.lo = lo; s.hi = hi; s.mid = mid; s.i = lo; s.j = mid; s.k = lo; s.phase = 'merge'; s.counters.passes++;
      for (let p = lo; p < hi; p++) s.tmp[p] = null; // Clear diagnostic occupancy; no algorithm item write.
      emit('merge.cursors', 'Both halves are sorted. Reset left, right and output cursors.');
      while (s.k < hi) {
        s.condition = s.j === hi || (s.i < mid && s.a[s.i]!.key <= s.a[s.j]!.key);
        if (s.i < mid && s.j < hi) s.counters.comparisons++;
        emit('merge.choose', `Choose left: ${s.condition}; exhaustion is checked before reading. Left wins ties.`);
        s.tmp[s.k] = copy(s.a[s.condition ? s.i : s.j]!); s.counters.bufferWrites++;
        emit('merge.output', `Write one record to temporary[${s.k}].`);
        if (s.condition) s.i++; else s.j++; s.k++;
        emit('merge.advance', 'Advance only the chosen input cursor and the output cursor.');
      }
      s.phase = 'copyback'; s.k = lo; emit('merge.copy-start', 'Merged output is complete; begin copy-back.');
      while (s.k < hi) {
        s.a[s.k] = copy(s.tmp[s.k]!); s.counters.writes++; emit('merge.copy', `Copy temporary[${s.k}] to input[${s.k}].`);
        s.k++; emit('merge.copy-next', 'Advance copy-back cursor.');
      }
    }
    s.lo = lo; s.hi = hi; s.mid = -1; s.i = s.j = s.k = -1; s.stack.pop(); s.phase = 'return'; emit('merge.leave', `Return sorted range [${lo}, ${hi}).`);
  }
  sort(0, s.a.length); s.phase = 'done'; emit('merge.done', 'Stable ascending order; all recursive calls returned.');
  return trace;
}
export function quickTrace(values: number[], fault: QuickFault = 'none'): SortTrace {
  if (!['none', 'bounds', 'pivot', 'no-progress'].includes(fault)) throw new Error('Unknown quicksort experiment.');
  const { s, trace, emit, swap } = create('quick', values);
  function sort(lo: number, hi: number): void {
    s.lo = lo; s.hi = hi; s.i = s.j = s.pivot = s.pivotId = -1; s.stack.push([lo, hi]);
    s.counters.maxDepth = Math.max(s.counters.maxDepth, s.stack.length); s.phase = 'partition';
    emit('quick.enter', `Enter half-open range [${lo}, ${hi}).`);
    s.condition = hi - lo < 2; emit('quick.base', `Range has fewer than two items: ${s.condition}.`);
    if (!s.condition) {
      s.pivot = hi - 1; s.pivotId = s.a[s.pivot]!.id; s.i = lo; s.j = lo; s.counters.passes++;
      const pivotKey = s.a[s.pivot]!.key;
      emit('quick.pivot', `Lomuto: pivot at ${s.pivot}; i is the next ≤ pivot slot, j is the scan index.`);
      if (fault === 'bounds') {
        s.j = hi; s.phase = 'fault'; s.fault = 'Scan index equals exclusive high; guard prevents an out-of-bounds read.';
        emit('quick.bounds-fault', s.fault); return;
      }
      if (fault === 'pivot') {
        swap(lo, s.pivot); s.phase = 'fault'; s.fault = 'Pivot identity moved before partition; saved pivot index no longer owns that record.';
        emit('quick.pivot-fault', s.fault); return;
      }
      while (true) {
        s.condition = s.j < hi - 1; emit('quick.scan', `j < pivot index: ${s.condition}.`);
        if (!s.condition) break;
        s.counters.comparisons++; s.condition = s.a[s.j]!.key <= pivotKey;
        emit('quick.compare', `input[j].key ≤ pivot.key: ${s.condition}.`);
        if (s.condition) {
          swap(s.i, s.j); emit('quick.swap', `Swap i=${s.i} and j=${s.j}; self-swaps also execute two array writes.`);
          s.i++; emit('quick.grow', 'Grow the ≤ pivot prefix by one slot.');
        }
        s.j++; emit('quick.advance', 'Advance scan index j.');
      }
      swap(s.i, hi - 1); s.pivot = s.i; s.phase = 'partitioned';
      emit('quick.place', `Place pivot at final index ${s.pivot}; left keys ≤ pivot, right keys > pivot.`);
      const p = s.i;
      if (fault === 'no-progress') {
        s.condition = hi - lo < hi - lo; s.phase = 'fault'; s.fault = 'Requested child equals its parent range. Strict-shrink guard stops recursion.';
        emit('quick.progress-fault', s.fault); return;
      }
      sort(lo, p); sort(p + 1, hi);
    }
    s.lo = lo; s.hi = hi; s.i = s.j = s.pivot = s.pivotId = -1; s.stack.pop(); s.phase = 'return'; emit('quick.leave', `Return from [${lo}, ${hi}).`);
  }
  sort(0, s.a.length);
  if (!s.fault) { s.phase = 'done'; emit('quick.done', 'Ascending permutation; equality does not imply stability.'); }
  return trace;
}
export function heapSortTrace(values: number[]): SortTrace {
  const { s, trace, emit, swap } = create('heap', values);
  function down(start: number) {
    s.i = start; s.child = s.right = -1;
    while (true) {
      s.child = s.right = -1; s.condition = s.i < Math.floor(s.heapSize / 2);
      emit('heap.has-child', `i < heapSize/2: ${s.condition}; guard child arithmetic.`);
      if (!s.condition) break;
      s.child = 2 * s.i + 1; emit('heap.left', 'Left child = 2i + 1.');
      s.right = s.child + 1; emit('heap.right', 'Right candidate = left + 1; check active-prefix bounds.');
      if (s.right < s.heapSize) s.counters.comparisons++;
      s.condition = s.right < s.heapSize && s.a[s.right]!.key > s.a[s.child]!.key;
      emit('heap.choose', `Right exists and is strictly larger: ${s.condition}.`);
      if (s.condition) { s.child = s.right; emit('heap.child', 'Choose the larger child; ties keep the left.'); }
      s.counters.comparisons++; s.condition = s.a[s.child]!.key <= s.a[s.i]!.key;
      emit('heap.ordered', `Parent already ≥ chosen child: ${s.condition}.`);
      if (s.condition) break;
      swap(s.i, s.child); emit('heap.swap', 'Swap parent with its larger child.');
      s.i = s.child; emit('heap.advance', 'Continue sift-down at the child index.');
    }
  }
  s.phase = 'build'; emit('heap.build', 'Bottom-up build: leaves are already heaps.');
  for (let start = Math.floor(s.heapSize / 2); start > 0;) {
    start--; s.k = start; emit('heap.root', `Sift internal node ${start}; its child subtrees are heaps.`); down(start);
  }
  s.phase = 'heap'; s.i = s.child = s.right = -1; emit('heap.built', 'The entire active prefix is a max heap.');
  while (s.heapSize > 1) {
    s.phase = 'extract'; swap(0, s.heapSize - 1); s.counters.passes++;
    emit('heap.extract', 'Swap the maximum root with the last active slot.');
    s.heapSize--; s.phase = 'sift'; emit('heap.shrink', 'Shrink active heap by one; that maximum is now finalized.');
    down(0); s.phase = 'heap'; s.i = s.child = s.right = -1; emit('heap.restored', 'Active prefix is a max heap again.');
  }
  s.heapSize = 0; s.phase = 'done'; emit('heap.done', 'Every slot is finalized in ascending order.');
  return trace;
}
function distributionTrace(kind: 'counting' | 'radix', values: number[], maxKey: number, unstable: boolean): SortTrace {
  if (values.some(v => v < 0)) throw new Error('Counting and radix require nonnegative integer keys.');
  if (kind === 'counting' && (!Number.isInteger(maxKey) || maxKey < 0 || maxKey > 99 || values.some(v => v > maxKey)))
    throw new Error('Counting domain must be 0…maxKey with maxKey between 0 and 99.');
  const { s, trace, emit } = create(kind, values), tag = (x: string) => `${kind}.${x}`;
  if (kind === 'radix') {
    for (s.i = 0; s.i < s.a.length; s.i++) {
      s.counters.maximumScans++; s.maximum = Math.max(s.maximum, s.a[s.i]!.key);
      emit(tag('maximum'), 'Inspect a key to determine the largest required decimal digit.');
    }
  }
  if (s.a.length) do {
    s.counts = Array(kind === 'radix' ? 10 : maxKey + 1).fill(0); s.tmp = s.a.map(() => null);
    s.counters.bufferWrites += s.counts.length; s.counters.passes++; s.phase = 'histogram';
    s.i = s.j = s.k = -1; s.digit = -1; emit(tag('clear'), 'Zero the counting array and reset output occupancy for this pass.');
    for (s.i = 0; s.i < s.a.length; s.i++) {
      s.digit = kind === 'radix' ? Math.floor(s.a[s.i]!.key / s.divisor) % 10 : s.a[s.i]!.key;
      if (kind === 'radix') s.counters.digitReads++;
      s.counts[s.digit]!++; s.counters.bufferWrites++; emit(tag('count'), `Count bucket ${s.digit}.`);
    }
    s.phase = 'cumulative';
    for (s.k = 1; s.k < s.counts.length; s.k++) {
      s.counts[s.k]! += s.counts[s.k - 1]!; s.counters.bufferWrites++; emit(tag('prefix'), 'Convert frequencies into exclusive bucket ends.');
    }
    s.phase = 'place';
    for (let t = 0; t < s.a.length; t++) {
      s.i = unstable ? t : s.a.length - 1 - t;
      s.digit = kind === 'radix' ? Math.floor(s.a[s.i]!.key / s.divisor) % 10 : s.a[s.i]!.key;
      if (kind === 'radix') s.counters.digitReads++;
      s.counts[s.digit]!--; s.j = s.counts[s.digit]!; s.counters.bufferWrites++;
      emit(tag('reserve'), `Decrement bucket ${s.digit} end to reserve output[${s.j}].`);
      s.tmp[s.j] = copy(s.a[s.i]!); s.counters.bufferWrites++; emit(tag('output'), 'Place the complete key + identity record in its reserved output slot.');
    }
    s.phase = 'copyback';
    for (s.k = 0; s.k < s.a.length; s.k++) {
      s.a[s.k] = copy(s.tmp[s.k]!); s.counters.writes++; emit(tag('copy'), 'Copy one output record back to the input array.');
    }
    s.phase = 'pass'; emit(tag('pass'), unstable ? 'Unstable forward pass completed; equal-digit groups were reversed.' : 'Pass complete; stable placement preserves the order within each bucket.');
    if (kind === 'counting') break;
    s.condition = s.divisor > Math.floor(s.maximum / 10);
    emit(tag('last'), `No next digit is required: ${s.condition}. Check before multiplying divisor.`);
    if (s.condition) break;
    s.divisor *= 10; emit(tag('divisor'), 'Advance divisor by a factor of ten; the preceding bound prevents overflow.');
  } while (true);
  s.phase = 'done';
  if (unstable) s.fault = 'Forward traversal with decrementing ends reverses equal-digit groups; LSD composition is not guaranteed sorted.';
  emit(tag('done'), unstable ? s.fault : 'Stable ascending output.');
  return trace;
}
export const countingTrace = (values: number[], maxKey = 9): SortTrace => distributionTrace('counting', values, maxKey, false);
export const radixTrace = (values: number[], unstable = false): SortTrace => distributionTrace('radix', values, 9, unstable);

// Compact complete numeric snapshot shared with native observer fixtures.
export function advancedSnapshot(s: AdvancedState): unknown[] {
  const items = (a: (SortItem | null)[]) => a.map(x => x ? [x.key, x.id] : null);
  return [items(s.a), items(s.tmp), s.counts, s.stack, s.lo, s.mid, s.hi, s.i, s.j, s.k,
    s.pivot, s.pivotId, s.heapSize, s.child, s.right, s.divisor, s.maximum, s.digit,
    Number(s.condition), s.phase, s.fault, ...Object.values(s.counters)];
}
const sorted = (a: SortItem[]) => a.every((x, i) => !i || a[i - 1]!.key <= x.key);
const stable = (a: SortItem[]) => a.every((x, i) => !i || a[i - 1]!.key !== x.key || a[i - 1]!.id < x.id);
export function advancedInvariants(s: AdvancedState): Invariant[] {
  const done = s.phase === 'done';
  const rule = (name: string, good: boolean, detail: string, pending = false): Invariant => ({ name, status: good ? 'pass' : pending ? 'pending' : 'fail', detail });
  const records = [...s.a, ...s.tmp.filter((x): x is SortItem => x !== null)];
  const rules = [rule('Record identity stays attached to its key', records.every(x => s.original[x.id]?.key === x.key), 'Every visible record is one original key/identity pair.'),
    rule('Input is a permutation', s.a.length === s.original.length && new Set(s.a.map(x => x.id)).size === s.original.length, 'Copy-back may temporarily duplicate records; the buffer retains the complete result.', !done && s.phase === 'copyback'),
    rule('Ascending result', sorted(s.a), 'Every adjacent output key is nondecreasing when the algorithm finishes.', !done),
  ];
  if (s.kind === 'merge' || s.kind === 'counting' || s.kind === 'radix') {
    rules.push(rule('Stable equal keys', stable(s.a), 'Equal keys retain increasing original identities in completed output.', !done));
    const output = s.kind === 'merge' ? s.tmp.slice(s.lo, s.phase === 'merge' ? s.k + Number(s.k < s.hi && s.tmp[s.k] !== null) : s.hi) : s.tmp;
    const occupied = output.filter((x): x is SortItem => x !== null);
    rules.push(rule('Buffer contains unique records', new Set(occupied.map(x => x.id)).size === occupied.length, 'A merge or distribution pass emits each record at most once.'));
    if (s.kind === 'merge') rules.push(rule('Merged prefix is stable and sorted', sorted(occupied) && stable(occupied), 'The completed temporary prefix chooses the left head on ties.', ['ready', 'divide', 'return'].includes(s.phase)));
    else {
      rules.push(rule('Bucket ends remain within output bounds', s.counts.every(x => Number.isInteger(x) && x >= 0 && x <= s.a.length), 'Counts and cumulative ends never address outside the output.'));
      if (['pass', 'done'].includes(s.phase) && s.a.length && !s.fault) {
        const digitOrder = s.kind === 'radix' ? s.a.map(x => ({ ...x, key: x.key % (s.divisor * 10) })) : s.a;
        rules.push(rule('Processed digits form a stable order', sorted(digitOrder) && stable(digitOrder), 'After each stable LSD pass, the processed low-order digits are ordered, retaining original ties.'));
      }
    }
  }
  if (s.kind === 'quick') {
    rules.push(rule('Recursion strictly shrinks', s.stack.every(([lo, hi], n) => !n || hi - lo < s.stack[n - 1]![1] - s.stack[n - 1]![0]) && !s.fault.includes('Strict-shrink'), 'Children exclude the placed pivot; a no-progress experiment is stopped.'));
    const initialized = s.pivot !== -1 || s.pivotId !== -1;
    const scanning = initialized && s.phase === 'partition';
    const placed = initialized && s.phase === 'partitioned';
    const ownsPivot = !initialized || (s.pivot >= s.lo && s.pivot < s.hi && s.a[s.pivot]?.id === s.pivotId);
    const pivotPosition = !scanning || s.pivot === s.hi - 1;
    const scanBounds = !scanning || (s.lo <= s.i && s.i <= s.j && s.j <= s.hi - 1);
    // Grow executes before Advance. A successful self/frontier swap can put i
    // one past j for this one stored transition; no next scan/read happens yet.
    const awaitingAdvance = scanning && s.condition && s.i === s.j + 1 && s.lo <= s.j && s.j < s.hi - 1;
    rules.push(rule('Pivot identity and scan bounds', !s.fault && ownsPivot && pivotPosition && scanBounds && (!placed || s.i === s.pivot),
      s.fault || (awaitingAdvance ? 'The accepted prefix has grown; j must advance before the next scan.' : 'During scanning the saved pivot owns high−1; low ≤ i ≤ j ≤ high−1. After placement the final pivot retains its identity.'),
      !s.fault && ownsPivot && pivotPosition && awaitingAdvance));
    if (s.phase === 'partitioned') rules.push(rule('Lomuto partition', s.a.slice(s.lo, s.pivot).every(x => x.key <= s.a[s.pivot]!.key) && s.a.slice(s.pivot + 1, s.hi).every(x => x.key > s.a[s.pivot]!.key), 'Left ≤ pivot, right > pivot; the pivot is at its final rank.'));
  }
  if (s.kind === 'heap') {
    rules.push(rule('Active prefix is a max heap', s.a.slice(0, s.heapSize).every((x, i) => !i || s.a[Math.floor((i - 1) / 2)]!.key >= x.key), 'Sift-down may temporarily violate parent order; complete shape never changes.', !['heap', 'done'].includes(s.phase)));
    const suffix = s.a.slice(s.heapSize);
    rules.push(rule('Finalized suffix is ordered above the heap', sorted(suffix) && (!suffix.length || s.a.slice(0, s.heapSize).every(x => x.key <= suffix[0]!.key)), 'Only indices at or beyond heapSize are finalized.'));
  }
  return rules;
}
export function advancedScene(s: AdvancedState): SortingScene {
  const all = s.a.map((_, i) => i), done = s.phase === 'done';
  const rows: SortingScene['rows'] = [{ id: 'input', label: 'Input array · key + original identity', items: s.a,
    ...(s.kind === 'radix' ? { padDigits: String(s.maximum).length, activeDigit: Math.round(Math.log10(s.divisor)) } : {}),
    active: [s.i, s.j, s.pivot, s.child].filter(x => x >= 0 && x < s.a.length),
    finalized: done && !s.fault ? all : s.kind === 'heap' ? all.filter(i => i >= s.heapSize) : s.phase === 'partitioned' ? [s.pivot] : [],
    fault: s.fault ? all : [], cursors: s.kind === 'heap' ? [{ label: 'sift i', index: s.i }, { label: 'child', index: s.child }] : [{ label: s.kind === 'merge' ? 'left i' : 'i', index: s.i }, { label: s.kind === 'merge' ? 'right j' : 'j', index: s.j }, ...(s.kind === 'quick' ? [{ label: 'pivot', index: s.pivot }] : [])],
    ranges: s.kind === 'merge' && s.mid >= 0 ? [{ label: 'left', low: s.lo, high: s.mid }, { label: 'right', low: s.mid, high: s.hi }] : [{ label: s.kind === 'heap' ? 'active heap' : 'current range', low: s.lo, high: s.kind === 'heap' ? s.heapSize : s.hi }],
  }];
  if (s.tmp.length) rows.push({ id: 'buffer', label: 'Temporary output · separately allocated', items: s.tmp, ...(s.kind === 'radix' ? { padDigits: String(s.maximum).length, activeDigit: Math.round(Math.log10(s.divisor)) } : {}), active: [s.kind === 'merge' ? s.k : s.j], cursors: [{ label: s.phase === 'copyback' ? 'copy k' : 'output', index: s.kind === 'merge' || s.phase === 'copyback' ? s.k : s.j }] });
  if (s.counts.length) rows.push({ id: 'counts', label: `${s.phase === 'histogram' ? 'Frequencies' : 'Bucket boundaries / remaining positions'} · key is the count`, items: s.counts.map((key, id) => ({ key, id })), active: [s.digit], labels: s.counts.map((_, i) => `bucket ${i}`) });
  const c = s.counters;
  const facts: [string, string][] = [
    ['Phase', s.phase], ['Last condition', String(s.condition)], ['Current range', `[${s.lo}, ${s.hi})`],
    ['Recursion ranges', s.stack.map(([lo, hi]) => `[${lo}, ${hi})`).join(' → ') || 'none'],
    ['Comparisons / swaps', `${c.comparisons} / ${c.swaps}`], ['Array / buffer writes', `${c.writes} / ${c.bufferWrites}`],
    ['Passes / maximum recursion', `${c.passes} / ${c.maxDepth}`],
  ];
  if (s.kind === 'quick') facts.push(['Lomuto cursors', `i=${s.i}, j=${s.j}, pivot index=${s.pivot}, pivot identity=${s.pivotId}`]);
  if (s.kind === 'merge') facts.push(['Merge cursors', `left=${s.i}, right=${s.j}, output/copy=${s.k}; mid=${s.mid}`]);
  if (s.kind === 'heap') facts.push(['Heap boundary', `${s.heapSize} active; ${s.a.length - s.heapSize} finalized`], ['Child indices', `i=${s.i}, chosen=${s.child}, right candidate=${s.right}`]);
  if (s.kind === 'counting' || s.kind === 'radix') facts.push(['Placement', `input i=${s.i}, output j=${s.j}, copy/prefix k=${s.k}, bucket=${s.digit}`]);
  if (s.kind === 'radix') facts.push(['Decimal pass', `divisor=${s.divisor}; digit reads=${c.digitReads}; maximum=${s.maximum}; maximum scans=${c.maximumScans}`], ['Zero-padded keys (display only)', s.a.map(x => String(x.key).padStart(String(s.maximum).length, '0')).join(' · ')]);
  return { title: `${s.kind} sort`, rows, facts, message: s.fault || (done ? 'Completed ascending order. Identity letters travel with their records.' : 'Step through exact canonical statements; counters exclude snapshots and validation.'), ...(s.kind === 'heap' ? { heapSize: s.heapSize } : {}) };
}
