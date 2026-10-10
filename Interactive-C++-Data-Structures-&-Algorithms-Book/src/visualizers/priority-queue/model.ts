import type { Invariant, Trace } from '../../engine/types';
export interface Entry { value: number; priority: number }
export interface PriorityState { data: Entry[]; higher: boolean; best: number | null; cursor: number | null; comparisons: number; result: Entry | null; error: string }
export interface PriorityEvent { type: 'Append' | 'Compare' | 'Visit' | 'Choose' | 'Erase' | 'Return' | 'Throw' | 'InvariantCheck'; detail: string; indices?: number[] }
export const priorityOperations = ['insert', 'peek', 'extract'] as const;
export type PriorityOperation = typeof priorityOperations[number];
export const validPriorityNumber = (n: number) => Number.isInteger(n) && Math.abs(n) <= 999;
export function priorityState(data: Entry[] = [{ value: 10, priority: 5 }, { value: 20, priority: 2 }, { value: 30, priority: 9 }, { value: 40, priority: 5 }], higher = true): PriorityState {
  if (data.length > 8 || data.some(e => !validPriorityNumber(e.value) || !validPriorityNumber(e.priority))) throw new Error('Use at most eight value:priority pairs; each integer must be −999…999.');
  return { data: structuredClone(data), higher, best: null, cursor: null, comparisons: 0, result: null, error: '' };
}
export function priorityOrder(s: PriorityState): number[] { return s.data.map((_, i) => i).sort((a, b) => (s.higher ? s.data[b]!.priority - s.data[a]!.priority : s.data[a]!.priority - s.data[b]!.priority) || a - b); }
export function describePriority(s: PriorityState): string { return `Arrival storage: ${s.data.map(e => `${e.value}:${e.priority}`).join(', ') || 'empty'} · ${s.higher ? 'higher' : 'lower'} priority first · equal priorities FIFO${s.result ? ` · returned ${s.result.value} (priority ${s.result.priority})` : ''}${s.error ? ` · ${s.error}` : ''}`; }
export function priorityInvariants(s: PriorityState): Invariant[] { return [
  { name: 'Priority direction is explicit', status: 'pass', detail: `${s.higher ? 'Larger' : 'Smaller'} priority number wins; values are payloads, not ranks.` },
  { name: 'Equal priorities keep arrival order', status: 'pass', detail: 'Strict comparisons never replace the earlier equal candidate; erase preserves relative order.' },
  { name: 'Empty access is guarded', status: 'pass', detail: s.error || `${s.data.length} entries. No peek/extract result exists for an empty queue.` },
]; }
export function priorityTrace(operation: PriorityOperation, initial: PriorityState, value = 50, priority = 7): Trace<PriorityState, PriorityEvent> {
  if (!priorityOperations.includes(operation) || !validPriorityNumber(value) || !validPriorityNumber(priority)) throw new Error('Choose an operation and integers from −999 to 999.');
  if (operation === 'insert' && initial.data.length >= 8) throw new Error('Teaching limit: eight entries. Use seven or fewer before insertion.');
  let s = structuredClone(initial); s.best = null; s.cursor = null; s.comparisons = 0; s.result = null; s.error = '';
  const trace: Trace<PriorityState, PriorityEvent> = { initial: structuredClone(s), steps: [] };
  const emit = (type: PriorityEvent['type'], tag: string | null, title: string, detail = '', indices?: number[]) => { trace.steps.push({ event: { type, detail, indices }, source: tag, title, explanation: title, state: structuredClone(s) }); };
  const condition = (tag: string, result: boolean, title: string) => { emit('Compare', tag, `${title}: ${result}`, String(result)); return result; };
  if (operation === 'insert') { s.data.push({ value, priority }); emit('Append', 'pi.append', `Append value ${value} with priority ${priority}; arrival order is retained.`, '', [s.data.length - 1]); }
  else if (condition('pb.empty', s.data.length === 0, 'Is the queue empty?')) { s.error = 'Underflow: priority queue empty; unchanged'; emit('Throw', 'pb.throw', s.error, 'throw'); }
  else {
    s.best = 0; emit('Choose', 'pb.start', 'First arrival is the initial candidate.', '', [0]);
    s.cursor = 1; emit('Visit', 'pb.scan', 'Start scanning at storage index 1.');
    while (condition('pb.loop', s.cursor! < s.data.length, 'More candidates?')) {
      const i = s.cursor!, best = s.best!; s.comparisons++;
      const better = s.higher ? s.data[i]!.priority > s.data[best]!.priority : s.data[i]!.priority < s.data[best]!.priority;
      if (condition('pb.compare', better, `Does priority ${s.data[i]!.priority} outrank ${s.data[best]!.priority}? Equal keeps the earlier arrival`)) { s.best = i; emit('Choose', 'pb.choose', `Candidate becomes storage index ${i}.`, '', [i]); }
      s.cursor!++; emit('Visit', 'pb.advance', 'Advance the scan.');
    }
    emit('Return', 'pb.return', `Return candidate index ${s.best}.`, String(s.best));
    const best = s.best!; s.cursor = null;
    emit('Choose', operation === 'peek' ? 'pp.best' : 'pe.best', `The caller receives index ${best}.`, '', [best]);
    if (operation === 'extract') { s.result = { ...s.data[best]! }; emit('Visit', 'pe.save', 'Save the selected entry before removing it.'); s.data.splice(best, 1); emit('Erase', 'pe.erase', 'Erase the entry; later entries shift left, retaining arrival order.'); }
    else s.result = { ...s.data[best]! };
    emit('Return', operation === 'peek' ? 'pp.return' : 'pe.return', `Return value ${s.result!.value}, priority ${s.result!.priority}.`, `${s.result!.value},${s.result!.priority}`);
  }
  s.best = null; s.cursor = null; emit('InvariantCheck', null, s.error || 'Operation complete. Equal priorities remain FIFO.'); return trace;
}
// Count model, not timing: sufficient capacity, best sorted entry at the back.
export function priorityWork(n: number, operation: PriorityOperation) {
  if (!Number.isInteger(n) || n < 1 || n > 1024) throw new Error('Size must be 1–1024.');
  return { unsorted: operation === 'insert' ? 1 : n - 1, sorted: operation === 'insert' ? n : 1, heap: operation === 'peek' ? 1 : Math.floor(Math.log2(operation === 'insert' ? n + 1 : n)) };
}
export function priorityFault(kind: 'fifo' | 'ties' | 'direction') {
  const state = priorityState();
  if (kind === 'ties') state.data = [{ value: 10, priority: 5 }, { value: 40, priority: 5 }];
  const expected = priorityOrder(state)[0]!;
  const selected = kind === 'fifo' ? 0 : kind === 'ties' ? 1 : priorityOrder({ ...state, higher: false })[0]!;
  return { state, expected, selected, message: kind === 'fifo' ? 'Taking the oldest arrival ignores priority 9.' : kind === 'ties' ? 'Replacing on equality selects the newest equal item, violating our FIFO tie policy.' : 'Reversing the comparator selects priority 2 in higher-first mode.' };
}
