import type { LabAdapter } from '../../components/controls/lab-types';
import { arrowDefinitions, referenceArrow, escapeHtml } from '../../components/visualizers/primitives';
import { queueState, queueTrace, queueOperations, queueInvariants, describeQueue, type QueueState, type QueueEvent, type QueueOperation } from './model';
export const queueAdapter: LabAdapter<QueueState, QueueEvent> = {
  build(operation, inputs) {
    const preset = String(inputs.get('preset') ?? 'standard');
    const raw = preset === 'custom' ? String(inputs.get('values') ?? '') : ({ standard: '10,20,30', single: '10', empty: '', full: '10,20,30,40,50' } as Record<string,string>)[preset];
    if (raw === undefined || (raw.trim() && raw.split(',').some(v => !/^-?\d+$/.test(v.trim())))) throw new Error('Enter comma-separated integers.');
    const value = String(inputs.get('value') ?? '40');
    if (!/^-?\d+$/.test(value.trim())) throw new Error('Value must be an integer from −999 to 999.');
    if (!queueOperations.includes(operation as QueueOperation)) throw new Error('Choose a queue/deque operation.');
    return queueTrace(operation as QueueOperation, queueState(raw.trim() ? raw.split(',').map(Number) : []), Number(value));
  },
  draw(s, id, view, selected, event) {
    return `<svg class="memory-diagram" viewBox="0 0 688 270" style="--diagram-height:270px" role="group" aria-label="Contiguous array deque; front index 0, back index ${s.count - 1}">${arrowDefinitions(id)}<text class="head-empty" x="32" y="32">${s.count ? `front = 0 · back = ${s.count - 1}` : 'EMPTY · no readable endpoints'} · size ${s.count} / 5</text>${s.data.map((v,i) => {
      const x = 32 + 128 * i, member = i < s.count;
      return `<g class="data-node ${selected === String(i) ? 'selected' : ''} ${event?.index === i ? 'active-node' : ''}" data-node="${i}" role="button" tabindex="0" aria-pressed="${selected === String(i)}" aria-label="Inspect index ${i}, ${member ? 'member' : 'outside deque'}, raw value ${v}"><text class="field-label" x="${x+48}" y="69" text-anchor="middle">index ${i}</text><rect x="${x}" y="85" width="96" height="76" rx="6" style="${member ? '' : 'fill:var(--surface-subtle)'}"/><text class="node-value" x="${x+48}" y="133" text-anchor="middle">${member || view === 'memory' ? v : '—'}</text><text class="field-label" x="${x+48}" y="187" text-anchor="middle">${member ? 'MEMBER' : 'OUTSIDE'}</text><text class="head-empty" x="${x+48}" y="219" text-anchor="middle">${[i === 0 && s.count ? 'front' : '', i === s.count-1 ? 'back' : ''].filter(Boolean).join(' / ')}</text></g>${member && i+1 < s.count ? referenceArrow(`M${x+99} 123 H${x+124}`, id) : ''}`;
    }).join('')}<text class="memory-address" x="32" y="256">${s.cursor !== null ? `Loop cursor i = ${s.cursor}; shifts so far = ${s.shifts}` : view === 'memory' ? 'All five int objects remain alive; removal retains raw values.' : 'Logical members occupy [0, size). Front operations shift values.'}</text></svg>`;
  },
  inspect(s, selected) {
    const i = selected === null ? 0 : Number(selected);
    return `<div class="inspector-heading"><span class="eyebrow">Array storage</span><span class="small-label">LIVE int</span></div><h4>Index ${i}</h4><dl class="node-fields"><div><dt>raw value</dt><dd>${escapeHtml(s.data[i] ?? '—')}</dd></div><div><dt>membership</dt><dd>${i < s.count ? 'Inside deque' : 'Outside deque'}</dd></div><div><dt>size</dt><dd>${s.count}</dd></div><div><dt>loop i</dt><dd>${s.cursor ?? 'out of scope'}</dd></div></dl><p>Selection refers to a physical slot. Shifting changes its value, not its address.</p>`;
  },
  describe: describeQueue, invariants: queueInvariants,
  regions: operation => [operation],
  counters: s => [{ label: 'Shifts', value: s.shifts }, { label: 'Storage/count writes', value: s.writes }, { label: 'Size', value: s.count }],
};
