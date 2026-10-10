import { ids, integer, invariant, recorder, type DirtyState } from './types';
export function dirtyTrace(operation: string, inputs: FormData) {
  const initial = ids(inputs, '0,1,0,2', 7), id = integer(inputs, 'id', 0, 0, 7), waves = integer(inputs, 'waves', 1, 1, 3);
  const s: DirtyState = { kind: 'dirty', current: [], next: [], processed: [], current_flags: Array(8).fill(false), next_flags: Array(8).fill(false), cursor: 0, wave: 0, active: -1, marks: 0, dedupes: 0, visits: 0, processing: false, broken: false };
  const { trace, emit } = recorder(s);
  const mark = (v: number) => {
    s.active = v; ++s.marks; const queue = s.processing ? s.next : s.current, flags = s.processing ? s.next_flags : s.current_flags;
    if (flags[v]) { ++s.dedupes; emit('dirty.dedupe', 'Already queued in this wave', `${v} gets no second entry in ${s.processing ? 'NEXT' : 'CURRENT'}.`); }
    else { queue.push(v); flags[v] = true; emit('dirty.mark', `Mark ${s.processing ? 'NEXT' : 'CURRENT'}`, 'Each wave owns its own membership flags. Being in CURRENT does not prevent scheduling NEXT.'); }
  };
  initial.forEach(mark);
  if (operation === 'mark') mark(id);
  else if (operation === 'clear') { s.current = []; s.next = []; s.current_flags.fill(false); s.next_flags.fill(false); s.processed = []; s.active = -1; emit('dirty.clear', 'Clear at a stable boundary', 'No traversal is active. Pending work is deliberately discarded.'); }
  else if (operation === 'wave' || operation === 'repeat') {
    for (let wave = 0; wave < waves && s.current.length; ++wave) {
      s.processing = true; s.cursor = 0; s.processed = []; ++s.wave; emit('dirty.begin', 'Freeze CURRENT for this wave', 'All marks now go to NEXT, even marks for unprocessed current IDs.');
      while (s.cursor < s.current.length) {
        s.active = s.current[s.cursor++]!; s.processed.push(s.active); ++s.visits;
        emit('dirty.process', 'Process one current entry', 'The cursor advances through a frozen vector; current membership remains until the boundary.');
        if (s.cursor === 1 || operation === 'repeat') { mark(operation === 'repeat' ? s.processed.at(-1)! : id); mark(operation === 'repeat' ? s.processed.at(-1)! : id); }
      }
      s.current = s.next; s.next = []; s.current_flags = [...s.next_flags]; s.next_flags.fill(false); s.processing = false; s.cursor = 0;
      emit('dirty.boundary', 'Promote NEXT at the boundary', 'This run has an explicit wave budget. Nonempty CURRENT means work remains, not that convergence was proved.');
    }
  } else if (operation === 'break-duplicate' || operation === 'break-flag') {
    if (!s.current_flags[id]) throw new Error('Break-It needs an ID in CURRENT.'); s.broken = true;
    if (operation === 'break-duplicate') { s.current.push(id); emit('dirty.duplicate', 'Break It: enqueue without deduplication', 'The queue now contains a repeated ID and can perform duplicate work.'); }
    else { s.current_flags[id] = false; emit('dirty.corrupt', 'Break It: clear membership too early', 'The queued ID no longer has its membership bit. A later mark could enqueue it again.'); }
  } else throw new Error('Unknown dirty-work operation.');
  return trace;
}
export function dirtyInvariants(s: DirtyState) {
  const consistent = (queue: number[], flags: boolean[]) => flags.every((flag, id) => flag === queue.includes(id));
  return [invariant('Deduplicated per wave', new Set(s.current).size === s.current.length && new Set(s.next).size === s.next.length, 'The same ID may appear once in each wave.'),
    invariant('Queue membership matches flags', consistent(s.current, s.current_flags) && consistent(s.next, s.next_flags), 'Current flags remain set while processing; next flags are independent.'),
    invariant('Cursor remains inside frozen CURRENT', s.cursor >= 0 && s.cursor <= s.current.length, 'Promotion resets the cursor only at a stable boundary.')];
}
