import type { Invariant, Trace } from '../../engine/types';
export const ringOperations = ['push', 'pop', 'front', 'back', 'empty', 'size', 'full'] as const;
export type RingOperation = typeof ringOperations[number];
export type RingPolicy = 'reject' | 'overwrite';
export interface RingState { data: number[]; head: number; tail: number; count: number; writes: number; result: string }
export interface RingEvent { type: 'Compare' | 'WriteSlot' | 'MoveIndex' | 'SetCount' | 'Return' | 'Reject' | 'Complete'; index?: number; from?: number; marker?: 'head' | 'tail' }
export function ringState(values = [20, 30, 40], head = 2): RingState {
  if (!Number.isInteger(head) || head < 0 || head >= 5) throw new Error('Head must be an index from 0 to 4.');
  if (values.length > 5 || values.some(v => !Number.isInteger(v) || Math.abs(v) > 999)) throw new Error('Use up to five integers from −999 to 999.');
  const data = Array<number>(5).fill(0); values.forEach((v, i) => { data[(head + i) % 5] = v; });
  return { data, head, tail: (head + values.length) % 5, count: values.length, writes: 0, result: '' };
}
export const ringIndices = (s: RingState) => Array.from({ length: Math.max(0, Math.min(5, s.count)) }, (_, i) => (s.head + i) % 5);
export const ringValues = (s: RingState) => ringIndices(s).map(i => s.data[i]!);
export const describeRing = (s: RingState) => `Logical: [${ringValues(s).join(' → ')}]; physical: [${s.data.join(', ')}]; head = ${s.head}; tail = ${s.tail}; count = ${s.count}`;
export function ringInvariants(s: RingState, settled: boolean): Invariant[] {
  const bounds = s.head >= 0 && s.head < 5 && s.tail >= 0 && s.tail < 5;
  const relation = s.tail === (s.head + s.count) % 5;
  return [{ name: 'Read/write indices are within storage', status: bounds ? 'pass' : 'fail', detail: `0 ≤ head (${s.head}), tail (${s.tail}) < 5` }, { name: '0 ≤ count ≤ capacity', status: s.count >= 0 && s.count <= 5 ? 'pass' : 'fail', detail: `${s.count} members in five physical slots` }, { name: 'tail = (head + count) % capacity', status: relation ? 'pass' : settled ? 'fail' : 'pending', detail: relation ? 'count disambiguates equal indices: 0 is empty, 5 is full.' : 'An index and count change in separate statements. The relation must be restored at the operation boundary.' }];
}
export function ringTrace(op: RingOperation, initial: RingState, value = 50, policy: RingPolicy = 'reject'): Trace<RingState, RingEvent> {
  if (!ringOperations.includes(op)) throw new Error('Choose a ring operation.');
  if (!['reject', 'overwrite'].includes(policy)) throw new Error('Choose reject or overwrite.');
  if (!Number.isInteger(value) || Math.abs(value) > 999) throw new Error('Value must be an integer from −999 to 999.');
  const s = structuredClone(initial); s.writes = 0; s.result = '';
  const trace: Trace<RingState, RingEvent> = { initial: structuredClone(s), steps: [] };
  const emit = (event: RingEvent, source: string | null, title: string) => trace.steps.push({ event, source, title, explanation: title, state: structuredClone(s) });
  const check = (condition: boolean, source: string) => { emit({ type: 'Compare' }, source, `Condition is ${condition}`); return condition; };
  const result = (type: 'Return' | 'Reject', source: string, message: string) => { s.result = message; emit({ type }, source, message); };
  const move = (marker: 'head' | 'tail', source: string) => { const from = s[marker]; s[marker] = (from + 1) % 5; s.writes++; emit({ type: 'MoveIndex', marker, from, index: s[marker] }, source, `${marker}: (${from} + 1) % 5 = ${s[marker]}${from === 4 ? ' — wrap from the last slot to zero' : ''}`); };
  const count = (delta: number, source: string) => { s.count += delta; s.writes++; emit({ type: 'SetCount' }, source, `count becomes ${s.count}`); };
  if (op === 'push') {
    let rejected = false;
    if (check(s.count === 5, 'rp.full')) {
      if (check(policy === 'reject', 'rp.policy')) { result('Reject', 'rp.throw', 'Overflow: full; rejected without changes'); rejected = true; }
      else { move('head', 'rp.discard'); count(-1, 'rp.reduce'); }
    }
    if (!rejected) { s.data[s.tail] = value; s.writes++; emit({ type: 'WriteSlot', index: s.tail }, 'rp.write', `Write ${value} to physical slot ${s.tail}`); move('tail', 'rp.wrap'); count(1, 'rp.count'); }
  } else if (['pop', 'front', 'back'].includes(op)) {
    const p = op === 'pop' ? 'ro' : op === 'front' ? 'rf' : 'rb';
    if (check(s.count === 0, `${p}.empty`)) result('Reject', `${p}.throw`, 'Underflow: empty; unchanged');
    else if (op === 'pop') { move('head', 'ro.wrap'); count(-1, 'ro.count'); }
    else result('Return', `${p}.return`, `${op} = ${s.data[op === 'front' ? s.head : (s.tail + 4) % 5]}`);
  } else result('Return', op === 'empty' ? 're.return' : op === 'full' ? 'ru.return' : 'rs.return', op === 'size' ? `size = ${s.count}` : String(op === 'empty' ? s.count === 0 : s.count === 5));
  emit({ type: 'Complete' }, null, s.result || describeRing(s));
  return trace;
}
