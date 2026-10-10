import { context, numberInput, record, rule, walk, type Context } from './trace';
export interface Handle { index: number; generation: number }
export interface HandleSlot { generation: number; alive: boolean; retired: boolean; next: number; value: number | null }
export interface HandleState extends Context {
  kind: 'handles'; slots: HandleSlot[]; head: number; validations: number; reuses: number;
  checked: Handle; valid: boolean; saved: Handle[]; revoked: Handle[]; limit: number; pending: number | null;
}
export const validHandle = (s: HandleState, h: Handle): boolean => Number.isInteger(h.index) && h.index >= 0 && h.index < s.slots.length && s.slots[h.index]!.alive && s.slots[h.index]!.generation === h.generation;
export function handlesTrace(operation: string, inputs: FormData) {
  const count = numberInput(inputs, 'count', 3, 1, 6), index = numberInput(inputs, 'index', 0, 0, 8), generation = numberInput(inputs, 'generation', 1, 0, 9);
  const s: HandleState = { ...context(), kind: 'handles', slots: Array.from({length:6}, (_,i) => ({generation:1,alive:false,retired:false,next:i+1,value:null})), head:0, validations:0, reuses:0, checked:{index:6,generation:0}, valid:false, saved:[], revoked:[], limit:3, pending:null };
  const { trace, emit } = record(s);
  const create = (value: number) => {
    if (s.head === 6) { emit('handle.exhausted','Registry exhausted','No reusable slots remain, including retired slots.'); return null; }
    const i = s.head, slot = s.slots[i]!; s.head = slot.next; slot.next = 6; slot.value = value; slot.alive = true; s.active = i;
    if (slot.generation > 1) ++s.reuses;
    const handle = {index:i,generation:slot.generation}; s.saved.push(handle);
    emit('handle.create','Publish a new identity',`Value ${value} is addressed by {${i}, ${slot.generation}}; the handle does not own storage.`); return handle;
  };
  const validate = (h: Handle) => {
    s.checked = {...h}; s.active = h.index; ++s.validations; s.valid = validHandle(s,h);
    emit('handle.validate', s.valid ? 'Valid handle' : 'Reject stale or invalid handle', `Check bounds, alive, then generation equality for {${h.index}, ${h.generation}}.`); return s.valid;
  };
  const destroy = (h: Handle) => {
    if (!validate(h)) { emit('handle.reject','Reject destruction','An invalid handle cannot end another identity.'); return; }
    const slot = s.slots[h.index]!; slot.value = null; slot.alive = false; s.pending = h.index; s.revoked.push({...h});
    emit('handle.destroy','Remove the live value','The slot is not yet reusable; its former value is unreadable.');
    if (slot.generation === s.limit) { slot.retired = true; s.pending = null;
      emit('handle.retire','Retire exhausted generation','Generation 3 is the teaching limit. This slot will never return to the free list.');
    } else { ++slot.generation;
      emit('handle.advance','Invalidate the former identity',`Current generation becomes ${slot.generation}; the saved old handle keeps ${h.generation}.`);
      slot.next = s.head; s.head = h.index; s.pending = null;
      emit('handle.return','Return reusable slot','Free-list integration happens after lifetime and generation changes.');
    }
  };
  if (operation === 'exhaustion') { for (let n = 0; n < 7; ++n) create(42 + n); }
  else {
    const old = create(42)!;
    if (operation === 'validate') validate({index,generation});
    else if (operation === 'retire') { let h = old; for (let n = 0; n < count; ++n) { destroy(h); h = create(43 + n)!; } validate(old); validate(h); }
    else if (['reuse','double-destroy','break-it'].includes(operation)) {
      destroy(old);
      if (operation === 'double-destroy') destroy(old);
      const replacement = create(99)!; validate(old); validate(replacement);
      if (operation === 'break-it') { s.broken = true; s.slots[0]!.generation = old.generation;
        emit(null,'Break-It: rewind the generation','Copied metadata deliberately makes a revoked identity alias its replacement. The revoked-handle invariant now fails.'); validate(old); }
    } else throw new Error('Unknown handle operation.');
  }
  return trace;
}
export function handleInvariants(s: HandleState) {
  const chain = walk(s.head,s.slots.map(slot => slot.next));
  const free = s.slots.flatMap((slot,i) => !slot.alive && !slot.retired && i !== s.pending ? [i] : []);
  return [rule('Reusable slots match the free chain', !chain.error && free.length === chain.order.length && free.every(i => chain.order.includes(i)), 'An identity being destroyed is explicitly pending until returned or retired.'),
    rule('Retired slots never become live', s.slots.every(slot => !slot.retired || (!slot.alive && slot.generation === s.limit)), 'Exhausted slots permanently consume capacity.'),
    rule('Revoked handles cannot resolve', s.revoked.every(h => !validHandle(s,h)), 'Retirement prevents local generation wraparound within this registry lifetime.'),
    rule('Value exists exactly while alive', s.slots.every(slot => slot.alive === (slot.value !== null)), 'No payload remains readable after destruction.')];
}
