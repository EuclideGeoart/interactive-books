import type { LabAdapter } from '../../components/controls/lab-types';
import { arrowDefinitions, escapeHtml as esc, referenceArrow } from '../../components/visualizers/primitives';
import { buildSpscTrace, queuedSlots, spscInvariants, type SpscEvent, type SpscState } from './model';

export const spscOperations = [
  { id: 'push', label: 'Try push' }, { id: 'pop', label: 'Try pop' },
  { id: 'wrap', label: 'Full / empty / wrap' }, { id: 'publication', label: 'Publication handoff' },
  { id: 'reuse', label: 'Slot reuse handoff' }, { id: 'cas-success', label: 'CAS success' },
  { id: 'cas-failure', label: 'CAS mismatch' }, { id: 'aba', label: 'ABA history' },
  { id: 'break-publication', label: 'Break publication' },
];
export function spscDefaults(): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries({ slots: '4', values: '10,20', value: '42' })) form.set(key, value);
  return form;
}
function status(s: SpscState, index: number): string {
  if (s.unsafe && queuedSlots(s).includes(index)) return 'UNSAFE PAYLOAD';
  if (s.producer.index === index && s.producer.phase === 'payload written, unpublished') return 'UNPUBLISHED';
  if (s.consumer.index === index && ['payload copied, slot retained', 'compute next'].includes(s.consumer.phase)) return 'READ · RETAINED';
  return queuedSlots(s).includes(index) ? 'QUEUED' : 'AVAILABLE';
}
const button = (key: string, label: string, selected: string | null) => `<button type="button" data-inspect="${esc(key)}" aria-pressed="${selected === key}">${esc(label)}</button>`;
function inspectable(key: string, label: string, selected: string | null, inner: string, extra = ''): string {
  return `<g class="spsc-node ${selected === key ? 'selected' : ''} ${extra}" data-node="${esc(key)}" tabindex="0" role="button" aria-pressed="${selected === key}" aria-label="${esc(label)}"><title>${esc(label)}</title>${inner}</g>`;
}
function ring(s: SpscState, id: string, selected: string | null): string {
  const rows = Math.ceil(s.slots.length / 4), height = 112 + rows * 116;
  const width = 624;
  const cells = s.slots.map((value, index) => {
    const x = 20 + (index % 4) * 150, y = 78 + Math.floor(index / 4) * 116;
    const state = status(s, index), queued = queuedSlots(s).includes(index);
    const flags = [index === s.write ? 'write' : '', index === s.read ? 'read' : ''].filter(Boolean).join(' + ');
    return inspectable(`slot:${index}`, `Slot ${index}: ${state}; ${s.unsafe ? 'no safe queue value' : `stored int ${value}`}${flags ? `; ${flags} index` : ''}`, selected,
      `<rect x="${x}" y="${y}" width="134" height="90" rx="5"/><text class="spsc-label" x="${x + 10}" y="${y + 18}">slot ${index}</text><text class="spsc-value" x="${x + 67}" y="${y + 47}" text-anchor="middle">${s.unsafe && queued ? '?' : value}</text><text class="spsc-status" x="${x + 67}" y="${y + 68}" text-anchor="middle">${state}</text><text class="spsc-label" x="${x + 67}" y="${y + 106}" text-anchor="middle">${flags || 'int remains alive'}</text>`, `${queued ? 'queued' : ''} ${s.unsafe && queued ? 'unsafe' : ''} ${s.focus === `slot:${index}` ? 'active' : ''}`);
  }).join('');
  return `<svg class="spsc-diagram systems-diagram" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-label="SPSC physical slots with published read and write indices">${arrowDefinitions(id)}<text class="spsc-heading" x="20" y="25">N = ${s.slots.length} physical slots · ${s.slots.length - 1} usable</text>${inspectable('write', `Published write index ${s.write}, producer-owned`, selected, `<rect x="20" y="36" width="268" height="30" rx="4"/><text class="spsc-label" x="34" y="56">PRODUCER · write = ${s.write}</text>`)}${inspectable('read', `Published read index ${s.read}, consumer-owned`, selected, `<rect x="320" y="36" width="268" height="30" rx="4"/><text class="spsc-label" x="334" y="56">CONSUMER · read = ${s.read}</text>`)}${cells}</svg>`;
}
function atomic(s: SpscState, id: string, selected: string | null): string {
  const a = s.atomic;
  const history = a.history.length ? a.history.map(value => s.mode === 'aba' ? ({ 1: 'A', 2: 'B', 3: 'C' }[value] ?? String(value)) : String(value)).join(' → ') : 'not initialized';
  return `<svg class="spsc-diagram systems-diagram" width="624" height="240" viewBox="0 0 624 240" aria-label="${s.mode === 'aba' ? 'ABA scalar index history' : 'Atomic compare-and-exchange'}">${arrowDefinitions(id)}<text class="spsc-heading" x="20" y="30">${s.mode === 'aba' ? 'SCALAR HEAD INDEX · NO NODE RECLAMATION' : 'STRONG COMPARE-AND-EXCHANGE'}</text>${inspectable('atomic', `Atomic current ${a.current ?? 'not initialized'}`, selected, `<rect x="226" y="62" width="170" height="80" rx="5"/><text class="spsc-label" x="311" y="85" text-anchor="middle">current</text><text class="spsc-value" x="311" y="120" text-anchor="middle">${a.current ?? '—'}</text>`)}<text class="spsc-label" x="20" y="94">expected = ${a.expected ?? '—'}</text><text class="spsc-label" x="434" y="94">desired = ${a.desired}</text>${referenceArrow('M146 102 H218', id)}${referenceArrow('M430 112 H404', id)}<text class="spsc-label" x="20" y="177">History: ${esc(history)}</text><text class="spsc-label" x="20" y="205">${a.exchanged === null ? 'No exchange attempted yet' : a.exchanged ? 'CAS returned true' : 'CAS returned false; expected now contains current'}</text></svg>`;
}
export function drawSpsc(s: SpscState, id: string, view: 'logical' | 'memory', selected: string | null): string {
  const context = id.endsWith('-preview') ? 'SPSC mental model' : 'SPSC execution';
  const threads = `<div class="spsc-threads"><section><h4>${button('producer', 'Producer', selected)}</h4><p>${esc(s.producer.phase)}</p><small>payload → release write</small></section><section><h4>${button('consumer', 'Consumer', selected)}</h4><p>${esc(s.consumer.phase)}</p><small>acquire write → read → release read</small></section></div>`;
  const table = `<div class="spsc-table-scroll" tabindex="0" role="region" aria-label="${context}: thread locals"><table><caption>Thread-local observations are snapshots, not live aliases.</caption><thead><tr><th scope="col">Thread</th><th scope="col">Own index</th><th scope="col">Other index observed</th><th scope="col">Next</th><th scope="col">Payload</th></tr></thead><tbody>${(['producer', 'consumer'] as const).map(key => `<tr><th scope="row">${button(key, key, selected)}</th>${[s[key].index, s[key].observed, s[key].next, s[key].value].map(v => `<td>${v ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  return `<div class="spsc-scene">${s.mode === 'ring' ? `${view === 'logical' ? threads : ''}${ring(s, id, selected)}${view === 'memory' ? table : ''}<p class="spsc-handoff">Payload write → release write → acquire write → payload read.<br/>Payload read → release read → acquire read → next overwrite.</p>` : atomic(s, id, selected)}<p class="spsc-result ${s.unsafe ? 'spsc-danger' : ''}">${esc(s.result || (s.mode === 'ring' ? 'Indices delimit queue membership. All stored int objects are alive.' : 'Step to observe an atomic operation.'))}</p></div>`;
}
export function inspectSpsc(s: SpscState, selected: string | null): string {
  let title = 'Inspect an index, thread or slot';
  let rows: [string, string][] = [['Ownership', 'One producer writes write; one consumer writes read.'], ['Storage', 'Fixed int objects; no dynamic allocation or reclamation.']];
  if (selected?.startsWith('slot:')) {
    const index = Number(selected.slice(5));
    if (Number.isInteger(index) && index >= 0 && index < s.slots.length) {
      title = `Physical slot ${index}`;
      rows = [['State', status(s, index)], ['Object lifetime', 'LIVE int for the entire ring lifetime'], ['Stored value', s.unsafe && queuedSlots(s).includes(index) ? 'No safe queue payload is established' : String(s.slots[index])], ['Membership', queuedSlots(s).includes(index) ? 'Inside published [read, write) circular range' : 'Not queued; retained bits are not a queue entry'], ['Permission', 'Producer writes only after space check; consumer reads only after publication check.']];
    }
  } else if (selected === 'producer' || selected === 'consumer') {
    const t = s[selected]; title = selected === 'producer' ? 'Producer locals' : 'Consumer locals';
    rows = [['Phase', t.phase], ['Own index loaded', String(t.index ?? 'not loaded')], ['Other index acquired', String(t.observed ?? 'not observed')], ['Next index', String(t.next ?? 'not computed')], ['Local payload', String(t.value ?? 'not copied')]];
  } else if (selected === 'write' || selected === 'read') {
    title = `Atomic ${selected} = ${s[selected]}`;
    rows = [['Sole writer', selected === 'write' ? 'Producer' : 'Consumer'], ['Publication', 'release store'], ['Other thread observes', 'acquire load'], ['Own thread loads', 'relaxed load'], ['What this grants', selected === 'write' ? 'Permission to read published payloads' : 'Permission to reuse consumed slots']];
  } else if (selected === 'atomic') {
    title = s.mode === 'aba' ? 'ABA: equal bits, different history' : 'Compare-and-exchange';
    rows = [['Current', String(s.atomic.current ?? 'not initialized')], ['Expected', String(s.atomic.expected ?? 'not loaded')], ['Desired', String(s.atomic.desired)], ['Exchanged', String(s.atomic.exchanged ?? 'not attempted')], ['History', s.atomic.history.join(' → ') || 'none'], ['Scope', 'A scalar atomic example; no linked stack or reclamation implementation.']];
  }
  return `<h4>${esc(title)}</h4><dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
}
export function describeSpsc(s: SpscState): string {
  if (s.mode !== 'ring') return `current=${s.atomic.current}; expected=${s.atomic.expected}; desired=${s.atomic.desired}; exchanged=${s.atomic.exchanged}; history=${s.atomic.history.join(' → ')}\n${s.result}`;
  return [`N=${s.slots.length}; capacity=${s.slots.length - 1}; read=${s.read}; write=${s.write}`, ...s.slots.map((value, index) => `slot ${index}: ${status(s, index)}; ${s.unsafe && queuedSlots(s).includes(index) ? 'unsafe payload' : `int=${value}`}`), `Producer: ${s.producer.phase}`, `Consumer: ${s.consumer.phase}`, `Consumed: ${s.consumed.join(', ') || 'none'}`, s.result].join('\n');
}
export const spscAdapter: LabAdapter<SpscState, SpscEvent> = {
  build: buildSpscTrace, draw: drawSpsc, inspect: inspectSpsc, describe: describeSpsc, invariants: spscInvariants,
  regions: operation => operation === 'push' ? ['spsc-push'] : operation === 'pop' ? ['spsc-pop'] : operation.startsWith('cas-') ? ['spsc-cas'] : operation === 'aba' ? ['spsc-aba'] : ['spsc-push', 'spsc-pop'],
  counters: s => [{ label: 'Atomic loads / RMW reads', value: s.loads }, { label: 'Atomic writes', value: s.stores }, { label: 'Payload reads', value: s.reads }, { label: 'Payload writes', value: s.writes }],
};
