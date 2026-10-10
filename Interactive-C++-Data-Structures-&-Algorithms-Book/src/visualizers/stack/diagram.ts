import { drawLinkedList } from '../linked-list/diagram';
import { escapeHtml } from '../../components/visualizers/primitives';
import { pointerInspector } from '../../components/memory/inspector';
import type { StackState, StackEvent } from './model';
export function drawStack(state: StackState, id: string, view: string, selected: string | null, event?: StackEvent): string {
  if (state.implementation === 'linked') {
    // Reuse Chapter 1's actual geometry, with the stack's entry-point name.
    return drawLinkedList({ ...state, references: { ...Object.fromEntries(Object.entries(state.references).filter(([name]) => name !== 'topNode')), head: state.references.topNode ?? null } }, id, view === 'memory' ? 'memory' : 'logical', selected, event && event.type !== 'SetIndex' && event.type !== 'WriteSlot' ? event.type === 'AssignReference' && event.name === 'topNode' ? { ...event, name: 'head' } : event : undefined).replace(/\bhead\b/g, 'topNode');
  }
  return `<svg class="memory-diagram" viewBox="0 0 688 280" style="--diagram-height:280px" role="group" aria-label="Fixed array stack; topIndex ${state.topIndex}"><text class="head-empty" x="32" y="35">${state.topIndex < 0 ? 'EMPTY · topIndex = −1' : `topIndex = ${state.topIndex} · ${state.topIndex === 4 ? 'FULL' : `capacity = 5`}`}</text>${state.storage.map((value, i) => {
    const x = 32 + i * 128, live = i <= state.topIndex;
    return `<g class="data-node ${selected === String(i) ? 'selected' : ''} ${event?.type === 'WriteSlot' && event.index === i ? 'active-node' : ''}" data-node="${i}" role="button" tabindex="0" aria-label="Inspect array index ${i}; ${live ? 'member' : 'outside stack'}; raw value ${value}" aria-pressed="${selected === String(i)}"><text class="field-label" x="${x + 48}" y="76" text-anchor="middle">index ${i}</text><rect x="${x}" y="95" width="96" height="76" rx="6" style="${live ? '' : 'fill:var(--surface-subtle)'}"/><text class="node-value" x="${x + 48}" y="143" text-anchor="middle">${live || view === 'memory' ? value : '—'}</text><text class="field-label" x="${x + 48}" y="195" text-anchor="middle">${live ? 'MEMBER' : 'OUTSIDE'}</text>${i === state.topIndex ? `<text class="head-empty" x="${x + 48}" y="227" text-anchor="middle">↑ top</text>` : ''}</g>`;
  }).join('')}<text class="memory-address" x="32" y="266">${view === 'memory' ? 'Raw storage: all five int objects exist, including popped values.' : 'Logical view: only indices 0…topIndex belong to the stack.'}</text></svg>`;
}
export function inspectStack(state: StackState, selected: string | null): string {
  if (state.implementation === 'linked') return pointerInspector(state, selected);
  const i = selected === null ? 0 : Number(selected);
  return `<div class="inspector-heading"><span class="eyebrow">Storage inspector</span><span class="small-label">LIVE int</span></div><h4>Array index ${i}</h4><dl class="node-fields"><div><dt>raw value</dt><dd>${escapeHtml(state.storage[i] ?? '—')}</dd></div><div><dt>membership</dt><dd>${i <= state.topIndex ? 'Inside stack' : 'Outside stack'}</dd></div><div><dt>topIndex</dt><dd>${state.topIndex}</dd></div><div><dt>capacity</dt><dd>5</dd></div></dl><p>All five int objects remain alive until the ArrayStack dies. Logical removal does not erase bytes.</p>`;
}
