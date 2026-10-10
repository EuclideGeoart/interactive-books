import type { MemoryState } from '../../engine/types';
import { escapeHtml } from '../visualizers/primitives';

export function pointerInspector(state: MemoryState, selected: string | null): string {
  const node = state.objects.find(item => item.address === selected);
  const references = Object.entries(state.references).map(([name, target]) => {
    const object = state.objects.find(item => item.address === target);
    const dangling = target !== null && object?.lifetime !== 'live';
    return `<div class="reference-entry"><code>${escapeHtml(name)}</code><button type="button" data-inspect="${target ?? ''}" ${target ? '' : 'disabled'} class="${dangling ? 'dangling' : ''}">${target ?? 'nullptr'}${dangling ? ' ⚠ dangling' : target ? ' ↗' : ''}</button></div>`;
  }).join('');
  return `<div class="inspector-heading"><span class="eyebrow">Pointer inspector</span><span class="small-label">${node ? node.lifetime : 'Select a node'}</span></div>
    ${node ? `<h4>${node.lifetime === 'live' ? `Node <strong>${node.data}</strong>` : `${node.lifetime === 'allocated' ? 'Unconstructed' : 'Ended lifetime'} storage`}</h4><div class="inspect-address">${node.address}</div>${node.lifetime === 'live' ? `<dl class="node-fields"><div><dt>data</dt><dd>${node.data}</dd></div>${Object.entries(node.pointers).map(([field, target]) => `<div><dt>${escapeHtml(field)}</dt><dd><button type="button" data-inspect="${target ?? ''}" ${target ? '' : 'disabled'}>${target ?? 'nullptr'}${target ? ' ↗' : ''}</button></dd></div>`).join('')}</dl>` : `<p class="lifetime-warning">${node.lifetime === 'allocated' ? 'Storage is reserved. Construction has not begun.' : 'Object fields are unavailable. Reading them would be undefined behavior.'}</p>`}` : '<p>Click a node, a link, or an address to inspect its fields.</p>'}
    <div class="reference-list"><span class="eyebrow">References in scope</span>${references}</div>`;
}
