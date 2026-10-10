import type { Invariant, Trace } from '../../engine/types';
export const queueOperations = ['push-back', 'pop-front', 'push-front', 'pop-back', 'front', 'back', 'empty', 'size'] as const;
export type QueueOperation = typeof queueOperations[number];
export interface QueueState { data: number[]; count: number; cursor: number | null; writes: number; shifts: number; result: string }
export interface QueueEvent { type: 'Compare' | 'WriteSlot' | 'SetCount' | 'SetCursor' | 'Return' | 'Reject' | 'Complete'; index?: number }
export function queueState(values = [10, 20, 30]): QueueState {
  if (values.length > 5 || values.some(v => !Number.isInteger(v) || Math.abs(v) > 999)) throw new Error('Use up to five integers from −999 to 999.');
  return { data: [...values, ...Array(5 - values.length).fill(0)], count: values.length, cursor: null, writes: 0, shifts: 0, result: '' };
}
export const describeQueue = (s: QueueState) => `front → [${s.data.slice(0, s.count).join(' → ')}] ← back; size = ${s.count}`;
export function queueInvariants(s: QueueState, settled: boolean): Invariant[] {
  return [{ name: '0 ≤ size ≤ capacity', status: s.count >= 0 && s.count <= 5 ? 'pass' : 'fail', detail: `size = ${s.count}; capacity = 5` }, { name: 'Front at 0; back at size − 1', status: !settled && s.cursor !== null ? 'pending' : 'pass', detail: s.cursor !== null && !settled ? 'Shifting is in progress. Intermediate duplicates are real writes, not a finished deque.' : s.count ? 'Members occupy [0, size). Slots outside that interval remain live integers.' : 'Empty: neither endpoint may be read.' }];
}
export function queueTrace(op: QueueOperation, initial: QueueState, value = 40): Trace<QueueState, QueueEvent> {
  if (!queueOperations.includes(op)) throw new Error('Choose a queue/deque operation.');
  if (!Number.isInteger(value) || Math.abs(value) > 999) throw new Error('Value must be an integer from −999 to 999.');
  const s = structuredClone(initial); s.writes = 0; s.shifts = 0; s.result = ''; s.cursor = null;
  const trace: Trace<QueueState, QueueEvent> = { initial: structuredClone(s), steps: [] };
  const emit = (type: QueueEvent['type'], source: string | null, title: string, index?: number) => trace.steps.push({ event: { type, index }, source, title, explanation: title, state: structuredClone(s) });
  const check = (condition: boolean, tag: string) => { emit('Compare', tag, `Condition is ${condition}`); return condition; };
  const reject = (tag: string, message: string) => { s.result = message; emit('Reject', tag, message); };
  const ret = (tag: string, result: string) => { s.result = result; emit('Return', tag, result); };
  const write = (i: number, v: number, tag: string, shift = false) => { s.data[i] = v; s.writes++; if (shift) s.shifts++; emit('WriteSlot', tag, `${shift ? 'Shift' : 'Write'} ${v} into index ${i}`, i); };
  const size = (delta: number, tag: string) => { s.count += delta; s.writes++; emit('SetCount', tag, `size becomes ${s.count}`); };
  if (op === 'push-back' || op === 'push-front') {
    const p = op === 'push-back' ? 'qb' : 'qf';
    if (check(s.count === 5, `${p}.full`)) reject(`${p}.throw`, 'Overflow: full; unchanged');
    else {
      if (op === 'push-front') {
        s.cursor = s.count; emit('SetCursor', 'qf.start', `Start i at ${s.cursor}`);
        while (check(s.cursor > 0, 'qf.loop')) { write(s.cursor, s.data[s.cursor - 1]!, 'qf.shift', true); s.cursor--; emit('SetCursor', 'qf.previous', `i becomes ${s.cursor}`); }
      }
      write(op === 'push-back' ? s.count : 0, value, `${p}.write`); size(1, `${p}.count`);
    }
  } else if (['pop-front', 'pop-back', 'front', 'back'].includes(op)) {
    const p = ({ 'pop-front': 'qo', 'pop-back': 'qx', front: 'qh', back: 'qt' } as Record<string, string>)[op]!;
    if (check(s.count === 0, `${p}.empty`)) reject(`${p}.throw`, 'Underflow: empty; unchanged');
    else if (op === 'front' || op === 'back') ret(`${p}.return`, `${op} = ${s.data[op === 'front' ? 0 : s.count - 1]}`);
    else {
      if (op === 'pop-front') {
        s.cursor = 1; emit('SetCursor', 'qo.start', 'Start i at 1');
        while (check(s.cursor < s.count, 'qo.loop')) { write(s.cursor - 1, s.data[s.cursor]!, 'qo.shift', true); s.cursor++; emit('SetCursor', 'qo.next', `i becomes ${s.cursor}`); }
      }
      size(-1, `${p}.count`);
    }
  } else ret(op === 'empty' ? 'qe.return' : 'qs.return', op === 'empty' ? String(s.count === 0) : `size = ${s.count}`);
  s.cursor = null; emit('Complete', null, s.result || describeQueue(s));
  return trace;
}
export function queueWork(n: number, operation: 'push-front' | 'pop-front' | 'push-back' | 'pop-back') {
  if (!Number.isInteger(n) || n < 0 || n > 1024) throw new Error('Work model size must be 0…1024.');
  const shifts = operation === 'push-front' ? n : operation === 'pop-front' ? Math.max(0, n - 1) : 0;
  return { shifts, drainShifts: n * (n - 1) / 2, circularShifts: 0 };
}
