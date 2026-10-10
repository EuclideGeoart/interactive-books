import type { LabAdapter } from '../../components/controls/lab-types';
import { heapOperations, heapState, heapTrace, heapParent, heapViolations, heapInvariants, describeHeap, type HeapState, type HeapEvent, type HeapOperation } from './model';
export function drawHeap(s: HeapState, _id: string, view: string, selected: string | null, event?: HeapEvent): string {
  const selectedIndex = selected?.split(':').at(-1) ?? null;
  const width = Math.max(640, s.data.length * 78 + 32), broken = heapViolations(s);
  const position = (i: number) => { const level = Math.floor(Math.log2(i + 1)), first = 2 ** level - 1; return { x: width * ((i - first + .5) / 2 ** level), y: 80 + level * 102 }; };
  const cell = (i: number, x: number, y: number, tree: boolean) => {
    const active = event?.indices?.includes(i), chosen = selectedIndex === String(i), invalid = broken.includes(i);
    return `<g class="data-node ${chosen ? 'selected' : ''} ${active ? 'active-node' : ''}" data-node="${tree ? 'tree' : 'array'}:${i}" data-heap-view="${tree ? 'tree' : 'array'}" role="button" tabindex="0" aria-pressed="${chosen}" aria-label="Inspect ${tree ? 'tree' : 'array'} index ${i}, value ${s.data[i]}${invalid ? ', order violation' : ''}"><rect class="${invalid ? 'heap-order-violation' : ''}" x="${x - 32}" y="${y - 24}" width="64" height="48" rx="6"${active ? ' style="fill:var(--amber-fill)"' : ''}/><text class="node-value" x="${x}" y="${y + 8}" text-anchor="middle">${s.data[i]}</text><text class="field-label" x="${x}" y="${y + 43}" text-anchor="middle">${invalid ? '! ' : ''}i=${i}</text></g>`;
  };
  const arrayY = 490;
  return `<svg class="memory-diagram heap-diagram" viewBox="0 0 ${width} 586" style="--diagram-height:586px" role="group" aria-label="Synchronized ${s.max ? 'max' : 'min'} heap tree and array"><style>.heap-diagram .data-node rect.heap-order-violation{stroke:var(--red);stroke-dasharray:5 3}.heap-diagram .data-node.selected rect,.heap-diagram .data-node:focus-visible rect{stroke:var(--pointer);stroke-width:3}.heap-diagram .data-node:focus-visible rect{stroke-dasharray:4 2}</style><text class="head-empty" x="20" y="28">${s.max ? 'MAX' : 'MIN'} HEAP · one array, two views</text>${s.data.map((_, i) => { if (!i) return ''; const p = position(heapParent(i)!), c = position(i); return `<path class="reference-arrow" d="M ${p.x} ${p.y + 47} L ${c.x} ${c.y - 28}" style="${broken.includes(i) ? 'stroke:var(--red);stroke-dasharray:5 3' : ''}"/>`; }).join('')}${s.data.map((_, i) => { const p = position(i); return cell(i, p.x, p.y, true); }).join('')}${!s.data.length ? '<text class="null-label" x="24" y="110">empty tree / empty array</text>' : ''}<text class="head-empty" x="20" y="448">CONTIGUOUS ARRAY · same index = same value</text>${s.data.map((_, i) => cell(i, 48 + i * 78, arrayY, false)).join('')}<text class="memory-address" x="20" y="572">${view === 'memory' ? 'parent(i)=floor((i−1)/2), i>0 · left=2i+1 · right=2i+2' : 'Select either view: the same index is highlighted in BOTH.'}</text></svg>`;
}
export const heapAdapter: LabAdapter<HeapState, HeapEvent> = {
  build(operation, inputs) {
    if (!heapOperations.includes(operation as HeapOperation)) throw new Error('Choose insert, peek, extract, or build.');
    const mode = String(inputs.get('mode') ?? 'max'); if (!['max', 'min'].includes(mode)) throw new Error('Choose max or min heap.');
    const max = mode === 'max', preset = String(inputs.get('preset') ?? 'standard');
    const raw = preset === 'custom' ? String(inputs.get('values') ?? '') : ({ standard: max ? '90,70,60,40,50,20' : '10,30,20,70,50,60', empty: '', single: '10', ties: '5,5,5,5', unordered: '40,10,90,20,70,30,60' } as Record<string, string>)[preset];
    if (raw === undefined || (raw.trim() && raw.split(',').some(v => !/^-?\d+$/.test(v.trim())))) throw new Error('Enter comma-separated integers, such as 90,70,60.');
    const values = raw.trim() ? raw.split(',').map(Number) : [];
    heapState(values, max, operation === 'build');
    const value = String(inputs.get('value') ?? '95'); if (!/^-?\d+$/.test(value.trim())) throw new Error('Value must be an integer from −999 to 999.');
    return heapTrace(operation as HeapOperation, heapState(operation === 'build' ? [] : values, max), Number(value), values);
  },
  draw: drawHeap,
  inspect(s, selected) {
    const i = selected === null ? 0 : Number(selected.split(':').at(-1)), exists = Number.isInteger(i) && i >= 0 && i < s.data.length;
    const reference = (index: number | null) => index !== null && index < s.data.length ? `<button type="button" class="pointer-link" data-inspect="${selected?.startsWith('array:') ? 'array' : 'tree'}:${index}">index ${index} → ${s.data[index]}</button>` : 'none';
    return `<div class="inspector-heading"><span class="eyebrow">Tree ↔ array</span></div><h4>${exists ? `Index ${i} · value ${s.data[i]}` : 'No selected index'}</h4><dl class="node-fields"><div><dt>parent</dt><dd>${exists ? reference(heapParent(i)) : 'none'}</dd></div><div><dt>left = 2i+1</dt><dd>${exists ? reference(2 * i + 1) : 'none'}</dd></div><div><dt>right = 2i+2</dt><dd>${exists ? reference(2 * i + 2) : 'none'}</dd></div><div><dt>size</dt><dd>${s.data.length}</dd></div><div><dt>local i</dt><dd>${s.i ?? '—'}</dd></div><div><dt>local parent</dt><dd>${s.parent ?? '—'}</dd></div><div><dt>local child</dt><dd>${s.child ?? '—'}</dd></div><div><dt>local right</dt><dd>${s.right ?? '—'}</dd></div><div><dt>saved result</dt><dd>${s.result ?? '—'}</dd></div></dl><p>The root has no parent. A computed child index only exists when it is less than size. Tree nodes own no additional objects or pointers.</p>`;
  },
  describe: describeHeap, invariants: heapInvariants,
  regions: operation => [`heap-${operation}`, ...({ insert: ['heap-up'], extract: ['heap-down'], build: ['heap-down'], peek: [] }[operation] ?? [])],
  counters: s => [{ label: 'Value comparisons', value: s.comparisons }, { label: 'Swaps', value: s.swaps }, { label: 'Size', value: s.data.length }],
};
