import type { LabAdapter } from '../../components/controls/lab-types';
import type { Invariant } from '../../engine/types';
import { arrowDefinitions, escapeHtml, memoryAddress, referenceArrow } from '../../components/visualizers/primitives';
import { address, poolTrace, type PoolState, type PoolEvent, type PoolOperation } from './model';

export function poolInvariants(state: PoolState, settled: boolean): Invariant[] {
  const seen = new Set<number>(); let cursor = state.head; let valid = true;
  while (cursor !== -1) {
    const slot = state.slots[cursor];
    if (!slot || seen.has(cursor) || slot.phase !== 'free' || slot.alive || slot.next === -2) { valid = false; break; }
    seen.add(cursor); cursor = slot.next;
  }
  const complete = state.slots.every((s, i) => (s.phase === 'free') === seen.has(i));
  const phaseMatches = state.slots.every(s => (s.phase === 'live') === s.alive);
  return [
    { name: 'Free-list topology is safe', status: valid ? 'pass' : 'fail', detail: 'Every reachable block is free, has an active next member, and appears once.' },
    { name: 'Every free block is reachable', status: complete ? 'pass' : settled ? 'fail' : 'pending', detail: complete ? 'Reserved storage and live objects are excluded.' : 'A block has been detached or is being published; metadata and head update on separate lines.' },
    { name: 'Object lifetime agrees with metadata', status: phaseMatches ? 'pass' : settled ? 'fail' : 'pending', detail: phaseMatches ? 'Free, reserved, and destroyed storage expose no object fields.' : 'The lifetime changed; its metadata update is the next separate statement.' },
    { name: 'Storage survives object destruction', status: 'pass', detail: `${state.slots.length} fixed blocks remain owned by the pool throughout this experiment.` },
  ];
}
export function describePool(state: PoolState): string {
  const chain: number[] = []; let i = state.head;
  while (i >= 0 && state.slots[i] && !chain.includes(i)) { chain.push(i); i = state.slots[i]!.next; }
  return `freeList → ${chain.map(address).join(' → ')}${chain.length ? ' → ' : ''}nullptr. ${state.slots.map((slot, n) => `slot ${n}: ${slot.alive ? `live ${slot.value}` : slot.phase === 'live' ? 'destroyed (metadata pending)' : slot.phase}`).join('; ')}.${state.block >= 0 ? ` Local block → ${address(state.block)}.` : ''}${state.result ? ` ${state.result}.` : ''}`;
}
export const poolAdapter: LabAdapter<PoolState, PoolEvent> = {
  build(operation, form) { return poolTrace(operation as PoolOperation, Number(form.get('capacity') ?? 4), Number(form.get('value') ?? 42)); },
  regions(operation) {
    const map: Record<string, string[]> = { allocate: ['allocate'], construct: ['construct'], destroy: ['destroy'], deallocate: ['deallocate'], foreign: ['deallocate'], 'live-return': ['deallocate'], exhaustion: ['allocate'], 'use-after-destroy': ['allocate', 'construct', 'destroy', 'read'], failure: ['create', 'allocate', 'construct', 'deallocate'] };
    return [...(map[operation] ?? ['allocate', 'construct', 'destroy', 'deallocate']), 'validate'];
  },
  describe: describePool,
  invariants: poolInvariants,
  counters: state => [{ label: 'Free-list writes', value: state.writes }, { label: 'Address equality checks', value: state.scans }, { label: 'Live objects', value: state.slots.filter(s => s.alive).length }],
  inspect(state, selected) {
    const i = state.slots.findIndex((_, index) => address(index) === selected); const slot = state.slots[i];
    const link = (n: number) => `<button type="button" data-inspect="${n >= 0 ? address(n) : ''}" ${n < 0 ? 'disabled' : ''}>${address(n)}</button>`;
    return `<div class="inspector-heading"><span class="eyebrow">Pool storage inspector</span></div><p>freeList: ${link(state.head)}</p>${state.block >= 0 ? `<p data-local-reference="block">Local block: ${link(state.block)}</p>` : ''}${slot ? `<h4>Slot ${i} · ${address(i)}</h4><dl class="node-fields"><div><dt>Storage</dt><dd>exists; pool owned</dd></div><div><dt>Metadata</dt><dd>${slot.phase}</dd></div><div><dt>T lifetime</dt><dd>${slot.alive ? 'alive' : 'not alive'}</dd></div><div><dt>Value</dt><dd>${slot.alive ? slot.value : 'unavailable — no live object'}</dd></div><div><dt>Free-list next</dt><dd>${slot.next === -2 ? 'inactive union member' : link(slot.next)}</dd></div></dl><p class="fine-print">Addresses are illustrative. A reserved block can still contain its old next pointer; it is no longer reachable from freeList.</p>` : '<p>Select a fixed storage slot. Object fields are only exposed during a live T lifetime.</p>'}`;
  },
  draw(state, id, view, selected, event) {
    const physical = view === 'memory';
    const height = physical ? 144 + Math.ceil(state.slots.length / 2) * 150 : 129 + state.slots.length * 126;
    const position = (i: number) => physical ? { x: 48 + (i % 2) * 300, y: 124 + Math.floor(i / 2) * 150, width: 252 } : { x: 48, y: 110 + i * 126, width: 324 };
    const defs = arrowDefinitions(id);
    const slots = state.slots.map((slot, i) => {
      const { x, y, width } = position(i); const label = slot.alive ? `LIVE OBJECT · ${slot.value}` : slot.phase === 'live' ? 'DESTROYED · pending' : `${slot.phase.toUpperCase()} STORAGE`;
      const fill = slot.alive ? 'live' : slot.phase === 'free' ? 'pool-free' : 'allocated';
      const neutral = fill === 'pool-free' ? ' style="fill:var(--surface-subtle)"' : '';
      return `<g class="data-node ${fill} ${selected === address(i) ? 'selected' : ''} ${event?.slot === i ? 'active-node' : ''}" data-node="${address(i)}" role="button" tabindex="0" aria-label="Inspect pool slot ${i}: ${label}" aria-pressed="${selected === address(i)}"><rect x="${x}" y="${y}" width="${width}" height="76" rx="6"${neutral}/><text class="field-label" x="${x + 16}" y="${y + 21}">SLOT ${i} · STORAGE EXISTS</text><text class="pool-state-label" style="fill:var(--ink);font-size:12px;font-weight:600" x="${x + 16}" y="${y + 46}">${label}</text><text class="field-label" x="${x + 16}" y="${y + 65}">${slot.next === -2 ? 'free-list member inactive' : `next: ${address(slot.next)}`}</text>${memoryAddress(address(i), x + 16, y + 99)}</g>`;
    }).join('');
    const links = physical ? '' : state.slots.map((slot, i) => {
      if (slot.next < 0) return '';
      const y = 150 + i * 126; const end = 132 + slot.next * 126; const rail = 430 + i * 32;
      const path = `M372 ${y} H${rail} V${end} H378`;
      return `<g class="pointer-link" data-field="next" data-from="${address(i)}" data-target="${address(slot.next)}" role="button" tabindex="0" aria-label="Follow free-list next from slot ${i} to slot ${slot.next}">${referenceArrow(path, id)}<path class="arrow-hit-area" d="${path}"/></g>`;
    }).join('');
    const local = state.block >= 0 ? `<g data-reference="block" data-target="${address(state.block)}" role="button" tabindex="0" aria-label="Inspect local block pointing to ${address(state.block)}"><text class="local-reference" x="48" y="55">local block → ${address(state.block)}</text></g>` : '<text class="field-label" x="48" y="55">No local block in scope</text>';
    return `<svg class="memory-diagram" viewBox="0 0 688 ${height}" style="--diagram-height:${height}px" role="group" aria-label="${escapeHtml(describePool(state))}">${defs}<text class="head-empty" x="48" y="30">freeList → ${address(state.head)}</text>${local}<text class="field-label" x="48" y="81">${physical ? 'PHYSICAL SLOT ORDER · union size / alignment are ABI dependent' : 'FREE-LIST LINKS · slots stay fixed as the chain changes'}</text>${slots}${links}</svg>`;
  },
};
