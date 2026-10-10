import type { LabAdapter } from '../../components/controls/lab-types';
import { escapeHtml as esc } from '../../components/visualizers/primitives';
import { priorityOperations, priorityState, priorityTrace, priorityOrder, priorityInvariants, describePriority, type PriorityState, type PriorityEvent, type PriorityOperation } from './model';
export function drawPriority(s: PriorityState, _id: string, view: string, selected: string | null, event?: PriorityEvent): string {
  const order = view === 'memory' ? s.data.map((_, i) => i) : priorityOrder(s);
  const width = Math.max(560, order.length * 142 + 40);
  return `<svg class="memory-diagram" viewBox="0 0 ${width} 270" style="--diagram-height:270px" role="group" aria-label="Priority queue ${view === 'memory' ? 'arrival storage' : 'removal order'}"><text class="head-empty" x="24" y="32">${s.higher ? 'HIGHER' : 'LOWER'} FIRST · ties: earliest arrival</text>${order.length ? order.map((index, rank) => {
    const e = s.data[index]!, x = 24 + rank * 142, chosen = selected === String(index);
    return `<g class="data-node ${chosen ? 'selected' : ''} ${event?.indices?.includes(index) || s.best === index ? 'active-node' : ''}" data-node="${index}" role="button" tabindex="0" aria-pressed="${chosen}" aria-label="Inspect value ${e.value}, priority ${e.priority}, storage index ${index}"><text class="field-label" x="${x + 61}" y="70" text-anchor="middle">${view === 'memory' ? `storage ${index}` : `rank ${rank + 1}`}</text><rect x="${x}" y="86" width="122" height="94" rx="6"/><text class="field-label" x="${x + 61}" y="112" text-anchor="middle">priority ${e.priority}</text><text class="node-value" x="${x + 61}" y="153" text-anchor="middle">${e.value}</text><text class="field-label" x="${x + 61}" y="205" text-anchor="middle">${s.best === index ? 'candidate' : `index ${index}`}</text></g>`;
  }).join('') : '<text class="null-label" x="24" y="128">empty — no next entry</text>'}<text class="memory-address" x="24" y="249">${view === 'memory' ? 'Actual vector order: erase preserves relative arrival order.' : 'Derived removal ranking, not sorted physical storage.'}</text></svg>`;
}
export const priorityAdapter: LabAdapter<PriorityState, PriorityEvent> = {
  build(operation, inputs) {
    if (!priorityOperations.includes(operation as PriorityOperation)) throw new Error('Choose insert, peek, or extract.');
    const mode = String(inputs.get('mode') ?? 'higher'); if (!['higher', 'lower'].includes(mode)) throw new Error('Choose higher or lower first.');
    const preset = String(inputs.get('preset') ?? 'standard');
    const raw = preset === 'custom' ? String(inputs.get('values') ?? '') : ({ standard: '10:5,20:2,30:9,40:5', empty: '', single: '10:5', ties: '10:5,20:5,30:5' } as Record<string, string>)[preset];
    if (raw === undefined || (raw.trim() && raw.split(',').some(p => !/^\s*-?\d+\s*:\s*-?\d+\s*$/.test(p)))) throw new Error('Enter value:priority pairs, such as 10:5,20:2.');
    const data = raw.trim() ? raw.split(',').map(p => { const [value, priority] = p.split(':').map(Number); return { value: value!, priority: priority! }; }) : [];
    const value = String(inputs.get('value') ?? '50'), priority = String(inputs.get('priority') ?? '7');
    if (!/^-?\d+$/.test(value.trim()) || !/^-?\d+$/.test(priority.trim())) throw new Error('Value and priority must be integers from −999 to 999.');
    return priorityTrace(operation as PriorityOperation, priorityState(data, mode === 'higher'), Number(value), Number(priority));
  },
  draw: drawPriority,
  inspect(s, selected) { const i = selected === null ? priorityOrder(s)[0] : Number(selected), e = i === undefined ? undefined : s.data[i]; return `<div class="inspector-heading"><span class="eyebrow">Priority entry</span></div><h4>${e ? `Value ${esc(e.value)}` : 'No selected entry'}</h4><dl class="node-fields"><div><dt>priority</dt><dd>${e?.priority ?? '—'}</dd></div><div><dt>storage index</dt><dd>${e ? i : '—'}</dd></div><div><dt>removal rank</dt><dd>${e ? priorityOrder(s).indexOf(i!) + 1 : '—'}</dd></div><div><dt>size</dt><dd>${s.data.length}</dd></div></dl><p>Indices describe current storage. They are not permanent IDs. Equal priorities retain their relative arrival order.</p>`; },
  describe: describePriority, invariants: priorityInvariants,
  regions: operation => [`priority-${operation}`, ...(operation === 'insert' ? [] : ['priority-best'])],
  counters: s => [{ label: 'Priority comparisons', value: s.comparisons }, { label: 'Entries', value: s.data.length }],
};
