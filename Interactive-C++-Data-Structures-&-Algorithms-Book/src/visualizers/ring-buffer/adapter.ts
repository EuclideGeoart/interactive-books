import type { LabAdapter } from '../../components/controls/lab-types';
import { arrowDefinitions, referenceArrow, escapeHtml } from '../../components/visualizers/primitives';
import { ringState, ringTrace, ringOperations, ringInvariants, ringIndices, describeRing, type RingState, type RingEvent, type RingOperation, type RingPolicy } from './model';
export const ringAdapter: LabAdapter<RingState, RingEvent> = {
  build(operation, inputs) {
    const preset = String(inputs.get('preset') ?? 'wrap');
    const presets: Record<string,{ values: number[]; head: number }> = { wrap: { values: [20,30], head: 2 }, wrapped: { values: [20,30,40,50], head: 3 }, empty: { values: [], head: 0 }, single: { values: [10], head: 4 }, full: { values: [10,20,30,40,50], head: 4 } };
    let setup = presets[preset];
    if (preset === 'custom') {
      const raw = String(inputs.get('values') ?? '');
      const head = String(inputs.get('head') ?? '0');
      if ((raw.trim() && raw.split(',').some(v => !/^-?\d+$/.test(v.trim()))) || !/^\d+$/.test(head)) throw new Error('Enter integer values and a head index from 0 to 4.');
      setup = { values: raw.trim() ? raw.split(',').map(Number) : [], head: Number(head) };
    }
    if (!setup) throw new Error('Choose a starting ring.');
    const value = String(inputs.get('value') ?? '40');
    if (!/^-?\d+$/.test(value.trim())) throw new Error('Value must be an integer from −999 to 999.');
    if (!ringOperations.includes(operation as RingOperation)) throw new Error('Choose a ring operation.');
    return ringTrace(operation as RingOperation, ringState(setup.values, setup.head), Number(value), String(inputs.get('policy') ?? 'reject') as RingPolicy);
  },
  draw(s, id, view, selected, event) {
    const members = ringIndices(s), indices = view === 'memory' ? [0,1,2,3,4] : members;
    const wrapped = event?.type === 'MoveIndex' && event.from === 4 && event.index === 0;
    const slots = indices.map((i, position) => {
      const x = 32 + position*128, member = members.includes(i);
      return `<g class="data-node ${selected === String(i) ? 'selected' : ''} ${event?.index === i ? 'active-node' : ''}" data-node="${i}" role="button" tabindex="0" aria-pressed="${selected === String(i)}" aria-label="Inspect physical index ${i}, ${member ? 'queue member' : 'outside queue'}, raw value ${s.data[i]}"><text class="field-label" x="${x+48}" y="71" text-anchor="middle">slot ${i}</text><rect x="${x}" y="88" width="96" height="76" rx="6" style="${member ? '' : 'fill:var(--surface-subtle)'}"/><text class="node-value" x="${x+48}" y="136" text-anchor="middle">${s.data[i]}</text><text class="field-label" x="${x+48}" y="192" text-anchor="middle">${member ? `logical ${members.indexOf(i)}` : 'OUTSIDE'}</text><text class="head-empty" x="${x+48}" y="223" text-anchor="middle">${i === s.head ? '↑ head' : ''}</text><text class="head-empty" x="${x+48}" y="249" text-anchor="middle">${i === s.tail ? '↑ tail' : ''}</text></g>${view === 'logical' && position < indices.length-1 ? referenceArrow(`M${x+99} 126 H${x+124}`,id) : ''}`;
    }).join('');
    return `<svg class="memory-diagram" viewBox="0 0 688 350" style="--diagram-height:350px" role="group" aria-label="${view === 'memory' ? 'Physical storage' : 'Logical queue'}; head ${s.head}, tail ${s.tail}, count ${s.count}">${arrowDefinitions(id)}<text class="head-empty" x="32" y="32">head ${s.head} · tail ${s.tail} · count ${s.count} / 5${s.count === 0 ? ' · EMPTY' : s.count === 5 ? ' · FULL' : ''}</text>${slots}${!indices.length ? '<text class="head-empty" x="32" y="126">Empty queue — all five physical int slots still exist.</text>' : ''}${view === 'memory' ? `<g data-wrap-route>${referenceArrow('M640 169 V288 H80 V263',id,wrapped)}<text class="field-label" x="340" y="281" text-anchor="middle">${wrapped ? `${event.marker}: 4 → 0 · modulo wrap executed` : 'next index after slot 4 is slot 0'}</text></g>` : `<text class="field-label" x="32" y="291">Physical indices in queue order: ${members.join(' → ') || 'none'}</text>`}<text class="memory-address" x="32" y="333">${wrapped ? `${event.marker} wraps 4 → 0; values do not shift.` : 'tail marks the next write position, not the back element.'}</text></svg>`;
  },
  inspect(s, selected) {
    const i = selected === null ? s.head : Number(selected), logical = ringIndices(s).indexOf(i);
    return `<div class="inspector-heading"><span class="eyebrow">Ring storage</span><span class="small-label">LIVE int</span></div><h4>Physical slot ${i}</h4><dl class="node-fields"><div><dt>raw value</dt><dd>${escapeHtml(s.data[i] ?? '—')}</dd></div><div><dt>logical position</dt><dd>${logical < 0 ? 'Outside queue' : logical}</dd></div><div><dt>head / read</dt><dd>${s.head}</dd></div><div><dt>tail / write</dt><dd>${s.tail}</dd></div><div><dt>count</dt><dd>${s.count}</dd></div></dl><p>The physical slot stays in place. Membership follows head and count. Popping does not erase its int.</p>`;
  },
  describe: describeRing, invariants: ringInvariants, regions: operation => [operation],
  counters: s => [{ label: 'Storage/index/count writes', value: s.writes }, { label: 'Element shifts', value: 0 }, { label: 'Count', value: s.count }],
};
