import { context, numberInput, record, rule, walk, type Context } from './trace';
export interface FreeListState extends Context {
  kind: 'free-list'; head: number; next: number[]; free: boolean[]; pending: number;
  reads: number; writes: number;
}
export function freeListTrace(operation: string, inputs: FormData) {
  const count = numberInput(inputs, 'count', 3, 1, 6), index = numberInput(inputs, 'index', 0, 0, 8);
  const s: FreeListState = { ...context(), kind: 'free-list', head: 0, next: [1,2,3,4,5,6], free: Array(6).fill(true), pending: 6, reads: 0, writes: 0 };
  const { trace, emit } = record(s);
  const acquire = () => {
    if (s.head === 6) { emit('fl.exhausted', 'Exhaustion', 'No free slot exists; no state was changed.'); return; }
    const i = s.head; s.pending = s.active = i; ++s.reads;
    emit('fl.select', 'Read free-list head', `Select slot ${i}; no client object is constructed.`);
    s.head = s.next[i]!; ++s.writes;
    emit('fl.pop', 'Detach the head', `head becomes ${s.head === 6 ? 'nullptr' : s.head}. Slot ${i} is temporarily detached.`);
    s.free[i] = false; s.next[i] = 6; s.pending = 6;
    emit('fl.acquire', 'Reserve raw storage', `Slot ${i} now belongs to the caller as raw bytes. Embedded next is no longer readable as a free link.`);
  };
  const release = (i: number) => {
    s.active = i;
    if (i >= 6 || s.free[i]) { emit('fl.reject', 'Reject invalid release', `Slot ${i} is invalid or already free; the list is unchanged.`); return; }
    s.pending = i; s.next[i] = s.head; ++s.writes;
    emit('fl.link', 'Write embedded next', `Write the old head into slot ${i}; caller must already have ended any object lifetime.`);
    s.free[i] = true; s.head = i; s.pending = 6; ++s.writes;
    emit('fl.push', 'Publish new head', `Slot ${i} is free and appears exactly once in the chain.`);
  };
  for (let i = 0; i < count; ++i) acquire();
  if (operation === 'reuse') { release(index); acquire(); }
  else if (operation === 'double-release') { release(index); release(index); }
  else if (operation === 'exhaustion') { for (let i = count; i <= 6; ++i) acquire(); }
  else if (operation === 'break-it') {
    const fault = String(inputs.get('fault') ?? 'cycle'); s.broken = true;
    // Bounded metadata sandbox: never dereference an invalid C++ pointer.
    if (fault === 'cycle') { s.head = 5; s.free[5] = true; s.next[5] = 5; }
    else if (fault === 'used') s.head = 0;
    else if (fault === 'lost') { if (s.free.every(free => !free)) release(5); s.head = 6; }
    else if (fault === 'invalid') s.head = 99;
    else if (fault === 'duplicate') { release(0); s.next[0] = 0; }
    else throw new Error('Unknown free-list corruption.');
    emit(null, 'Break-It: corrupt copied metadata', `Injected ${fault}; the bounded traversal detects damage without following unsafe memory.`);
  } else if (operation !== 'acquire') throw new Error('Unknown free-list operation.');
  return trace;
}
export function freeListInvariants(s: FreeListState) {
  const traversal = walk(s.head, s.next), detached = s.phase === 'fl.pop' ? s.pending : -1;
  const expected = s.free.flatMap((free, i) => free && i !== detached ? [i] : []);
  return [rule('Bounded, acyclic free chain', !traversal.error, traversal.error || 'All links reach nullptr within six slots.'),
    rule('Chain references only free storage', traversal.order.every(i => s.free[i]), 'Allocated storage cannot be followed as an embedded link.'),
    rule('Every free slot appears once', expected.length === traversal.order.length && expected.every(i => traversal.order.includes(i)), detached >= 0 ? `Slot ${detached} is explicitly detached during pop.` : 'Reachable set equals the free bitmap.'),
    rule('No object lifetime is implied', true, 'This allocator never constructs or destroys a client object.')];
}
