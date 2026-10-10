import { ids, integer, invariant, member, recorder, type SparseState } from './types';
export function sparseTrace(operation: string, inputs: FormData) {
  const initial = ids(inputs, '1,9,4', 15), id = integer(inputs, 'id', 9, 0, 15);
  const s: SparseState = { kind: 'sparse', sparse: Array(16).fill(0), dense: [], active: -1, index: -1, moved: -1, lookups: 0, moves: 0, writes: 0, pending: false, broken: false, found: false };
  const { trace, emit } = recorder(s);
  const contains = (v: number) => { s.active = v; ++s.lookups; s.index = s.sparse[v]!; s.found = member(s, v); emit('sparse.lookup', 'Check the round trip', `sparse[${v}]=${s.index}; index in range AND dense[index] == ID → ${s.found}.`); return s.found; };
  const insert = (v: number) => {
    if (contains(v)) return;
    s.pending = true; s.index = s.dense.length; s.dense.push(v); ++s.writes;
    emit('sparse.append', 'Append the ID', 'The dense vector owns one new ID; publish the inverse mapping next.');
    s.sparse[v] = s.index; ++s.writes; s.pending = false;
    emit('sparse.publish', 'Publish the inverse index', 'The inserted ID now completes its sparse → dense round trip.');
  };
  initial.forEach(insert);
  if (operation === 'insert') insert(id);
  else if (operation === 'contains') contains(id);
  else if (operation === 'iterate') for (const v of s.dense) { s.active = v; s.index = s.sparse[v]!; emit('sparse.visit', 'Visit dense storage', 'Iteration reads only members, in the current unstable dense order.'); }
  else if (['remove', 'stale'].includes(operation)) {
    if (contains(id)) {
      s.pending = true; s.moved = s.dense.at(-1)!;
      if (s.index !== s.dense.length - 1) { s.dense[s.index] = s.moved; ++s.moves; ++s.writes; emit('sparse.move', 'Move the last ID into the hole', 'The last ID temporarily occurs twice. This is a private mutation step.'); }
      s.dense.pop(); ++s.writes; emit('sparse.pop', 'Pop the old final entry', 'The moved ID is present once; its sparse index may still need repair.');
      if (s.index < s.dense.length) { s.sparse[s.moved] = s.index; ++s.writes; emit('sparse.repair', 'Repair the moved ID’s sparse index', `sparse[${s.moved}] = ${s.index}. The erased ID’s stale sparse entry is harmless.`); }
      s.pending = false; emit('sparse.settle', 'Return to the stable boundary', 'Every remaining dense member has a valid inverse mapping.');
    }
    if (operation === 'stale') contains(id);
  } else if (operation === 'break-map' || operation === 'break-duplicate') {
    if (!contains(id)) throw new Error('Break-It requires a member ID.');
    s.broken = true;
    if (operation === 'break-map') { s.sparse[id] = 16; emit('sparse.corrupt', 'Break It: corrupt a live inverse mapping', 'Index 16 is rejected by the bounds test; no unchecked memory access occurs.'); }
    else { if (s.dense.length >= 16) throw new Error('Break-It needs spare dense capacity.'); s.dense.push(id); emit('sparse.duplicate', 'Break It: bypass duplicate protection', 'A duplicated member cannot have two inverse positions. The invariant panel detects it.'); }
  } else throw new Error('Unknown sparse-set operation.');
  return trace;
}
export function sparseInvariants(s: SparseState) {
  return [invariant('Dense IDs are unique', new Set(s.dense).size === s.dense.length, 'Swap-move can temporarily duplicate the last ID before pop.', s.pending),
    invariant('Every live ID round-trips to its dense index', s.dense.every((id, i) => s.sparse[id] === i), 'Absent IDs may retain stale sparse entries; they must fail the full membership predicate.', s.pending),
    invariant('Bounded storage', s.dense.length <= 16 && s.dense.every(id => id >= 0 && id < 16), 'IDs are bounded to 0..15. No raw addresses are inferred.')];
}
