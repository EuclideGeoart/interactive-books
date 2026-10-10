import { context, numberInput, record, rule, walk, type Context } from './trace';
export type PoolLife = 'free' | 'reserved' | 'live' | 'destroyed';
export interface PoolState extends Context {
  kind: 'object-pool'; life: PoolLife[]; next: number[]; head: number; values: (number | null)[];
  constructions: number; destructions: number; rollbacks: number;
}
export function poolTrace(operation: string, inputs: FormData) {
  const count = numberInput(inputs, 'count', 3, 1, 6), index = numberInput(inputs, 'index', 0, 0, 8), value = numberInput(inputs, 'value', 42, -999, 999);
  const s: PoolState = { ...context(), kind: 'object-pool', life: Array(6).fill('free'), next: [1,2,3,4,5,6], head: 0, values: Array(6).fill(null), constructions: 0, destructions: 0, rollbacks: 0 };
  const { trace, emit } = record(s);
  const reserve = () => {
    if (s.head === 6) { emit('pool.exhausted', 'Pool exhausted', 'All six slots are occupied; no object is constructed.'); return null; }
    const i = s.head; s.active = i; s.head = s.next[i]!; s.next[i] = 6; s.life[i] = 'reserved';
    emit('pool.reserve', 'Acquire typed storage', `Slot ${i} is occupied raw storage aligned for T; T does not yet exist.`); return i;
  };
  const construct = (i: number, fail = false) => {
    s.active = i;
    if (s.life[i] !== 'reserved') { emit('pool.reject', 'Reject construction', 'Only reserved raw storage accepts construction.'); return; }
    if (fail) { s.next[i] = s.head; s.head = i; s.life[i] = 'free'; ++s.rollbacks;
      emit('pool.rollback', 'Constructor throws', 'Construction never completed. Return storage to the free list; do not call T’s destructor.'); return; }
    s.values[i] = value; s.life[i] = 'live'; ++s.constructions;
    emit('pool.construct', 'Complete construction', `std::construct_at completed; slot ${i} now contains a readable value ${value}.`);
  };
  const destroy = (i: number) => {
    s.active = i;
    if (s.life[i] !== 'live') { emit('pool.reject', 'Reject destruction', 'Only a live object can be destroyed; state is unchanged.'); return; }
    s.values[i] = null; s.life[i] = 'destroyed'; ++s.destructions;
    emit('pool.destroy', 'End object lifetime', `T’s destructor ran in slot ${i}. Its fields are now unreadable; storage remains occupied.`);
  };
  const release = (i: number) => {
    s.active = i;
    if (!['reserved','destroyed'].includes(s.life[i] ?? '')) { emit('pool.return-reject', 'Reject slot return', 'Live objects and already-free slots cannot be returned.'); return; }
    s.next[i] = s.head; s.head = i; s.life[i] = 'free';
    emit('pool.return', 'Return storage', `Slot ${i} becomes reusable. Returning storage and destroying T are separate actions.`);
  };
  if (operation === 'rollback') { const i = reserve()!; construct(i, true); construct(reserve()!); }
  else {
    for (let n = 0; n < count; ++n) construct(reserve()!);
    if (operation === 'lifecycle') { destroy(index); release(index); const i = reserve(); if (i !== null) construct(i); }
    else if (operation === 'double-release') { destroy(index); release(index); release(index); }
    else if (operation === 'exhaustion') { for (let n = count; n < 6; ++n) construct(reserve()!); reserve(); }
    else if (operation === 'break-it') {
      s.broken = true; s.head = 0; s.next[0] = 0;
      emit(null, 'Break-It: return a live slot', 'Copied metadata puts live slot 0 in the free chain. Lifetime and membership checks expose the error.');
    } else if (operation !== 'construct') throw new Error('Unknown pool operation.');
  }
  return trace;
}
export function poolInvariants(s: PoolState) {
  const chain = walk(s.head, s.next), free = s.life.flatMap((life,i) => life === 'free' ? [i] : []);
  return [rule('Free chain contains exactly the free slots', !chain.error && free.length === chain.order.length && free.every(i => chain.order.includes(i)), chain.error || 'Reserved, live, and destroyed slots are not free.'),
    rule('Only live objects expose values', s.life.every((life,i) => (life === 'live') === (s.values[i] !== null)), 'Destroyed storage never displays readable object fields.'),
    rule('Constructions − destructions = live objects', s.constructions - s.destructions === s.life.filter(life => life === 'live').length, 'Failed constructors add rollbacks, not completed constructions.')];
}
