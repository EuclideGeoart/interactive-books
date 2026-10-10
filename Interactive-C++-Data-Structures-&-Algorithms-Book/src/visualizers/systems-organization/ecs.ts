import { integer, invariant, member, recorder, type ECSState, type Handle, type Pool } from './types';
export function ecsTrace(operation: string, inputs: FormData) {
  const id = integer(inputs, 'id', 1, 0, 7), generation = integer(inputs, 'generation', 1, 1, 65535), kind = integer(inputs, 'pool', 0, 0, 1), value = integer(inputs, 'value', 7, -100, 100);
  const empty = (): Pool => ({ sparse: Array(8).fill(0), dense: [], values: [] });
  const s: ECSState = { kind: 'ecs', slots: Array.from({ length: 8 }, () => ({ generation: 1, alive: false })), position: empty(), velocity: empty(), active: -1, pool: 0, index: -1, moved: -1, validations: 0, probes: 0, updates: 0, pending: false };
  const { trace, emit } = recorder(s);
  const valid = (h: Handle) => { s.active = h.index; ++s.validations; const slot = s.slots[h.index]; const ok = !!slot?.alive && slot.generation === h.generation; emit('ecs.validate', ok ? 'VALID HANDLE' : 'STALE HANDLE / not live', `Requested {${h.index},${h.generation}}; current generation ${slot?.generation ?? 'outside domain'}.`); return ok; };
  const create = () => { const index = s.slots.findIndex(slot => !slot.alive && slot.generation < 65535); if (index < 0) { emit('ecs.full', 'Registry exhausted', 'No free, nonretired entity slot remains.'); return; } s.slots[index]!.alive = true; s.active = index; emit('ecs.create', 'Create an entity identity', 'No components exist merely because an entity is live.'); return { index, generation: s.slots[index]!.generation }; };
  const pool = (k: number) => k ? s.velocity : s.position;
  const add = (h: Handle, k: number, v: number) => {
    const p = pool(k); if (!valid(h) || member(p, h.index)) return;
    s.pool = k; s.index = p.dense.length; s.pending = true; p.dense.push(h.index); p.values.push(v);
    emit('ecs.append', 'Append an owned component row', 'Entity ID and component value move together; the entity handle does not own this storage.');
    p.sparse[h.index] = s.index; s.pending = false; emit('ecs.publish', 'Publish component membership', 'This pool now has a valid inverse mapping for the added entity.');
  };
  const erasePool = (k: number, target: number) => {
    const p = pool(k); if (!member(p, target)) return;
    s.pool = k; s.index = p.sparse[target]!; s.moved = p.dense.at(-1)!; s.pending = true;
    if (s.index !== p.dense.length - 1) { p.dense[s.index] = p.dense.at(-1)!; p.values[s.index] = p.values.at(-1)!; emit('ecs.move', 'Move the last component row', 'Move both its owner ID and data. Moving only one would associate data with the wrong entity.'); }
    p.dense.pop(); p.values.pop(); emit('ecs.pop', 'Destroy the final component row', 'The popped component object is gone; its former fields are not displayed.');
    if (s.index < p.dense.length) { p.sparse[s.moved] = s.index; emit('ecs.repair', 'Repair this pool’s sparse index', 'Other component pools keep their independent iteration order.'); }
    s.pending = false; emit('ecs.settle', 'Pool mutation complete', 'The remaining component rows round-trip correctly.');
  };
  const destroy = (h: Handle) => { if (!valid(h)) return; erasePool(0, h.index); erasePool(1, h.index); s.slots[h.index]!.alive = false; ++s.slots[h.index]!.generation; emit('ecs.destroy', 'End entity lifetime and advance generation', 'All components are gone before identity reuse. Old handles cannot refer to a replacement.'); };
  for (let i = 0; i < 3; ++i) create();
  for (let i = 0; i < 3; ++i) add({ index: i, generation: 1 }, 0, (i + 1) * 10);
  add({ index: 0, generation: 1 }, 1, 1); add({ index: 2, generation: 1 }, 1, 3);
  const h = { index: id, generation };
  if (operation === 'query') for (const entity of s.velocity.dense) {
    s.active = entity; ++s.probes; emit('ecs.probe', 'Probe Position for a Velocity owner', 'Join on entity identity, never by assuming equal dense indices.');
    if (member(s.position, entity)) { s.position.values[s.position.sparse[entity]!]! += s.velocity.values[s.velocity.sparse[entity]!]!; ++s.updates; emit('ecs.update', 'Run the matching system operation', 'Position += Velocity for this entity; structural mutation waits until after traversal.'); }
  }
  else if (operation === 'add') add(h, kind, value);
  else if (operation === 'remove') { if (valid(h) && member(pool(kind), id)) erasePool(kind, id); }
  else if (operation === 'destroy') destroy(h);
  else if (operation === 'reuse') { destroy(h); create(); add(h, kind, value); }
  else throw new Error('Unknown ECS operation.');
  return trace;
}
export function ecsInvariants(s: ECSState) {
  return [invariant('Component IDs and values stay paired', [s.position, s.velocity].every(p => p.dense.length === p.values.length), 'A swap-delete moves a whole component row.'),
    invariant('Component membership round-trips', [s.position, s.velocity].every(p => new Set(p.dense).size === p.dense.length && p.dense.every((id, i) => p.sparse[id] === i)), 'Each pool repairs its own inverse map.', s.pending),
    invariant('Every component owner is live', [s.position, s.velocity].every(p => p.dense.every(id => s.slots[id]?.alive)), 'Destroy components before invalidating the entity slot.'),
    invariant('Generations never wrap', s.slots.every(slot => slot.generation >= 1 && slot.generation <= 65535), 'A slot reaching generation 65535 retires on destruction.')];
}
