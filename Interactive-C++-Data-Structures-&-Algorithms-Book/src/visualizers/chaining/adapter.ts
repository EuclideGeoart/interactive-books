import type { LabAdapter } from '../../components/controls/lab-types';
import { escapeHtml, referenceArrow } from '../../components/visualizers/primitives';
import { hashCell, hashInspector, hashSvg } from '../hashing/presentation';
import { chainState, chainTrace, chainInvariants, chainSnapshot, parseEntries, type ChainState, type ChainEvent, type ChainOperation } from './model';
const address = (id: number | null) => id === null ? 'nullptr' : `0x${(0xe000 + id * 0x80).toString(16).toUpperCase()}`;
export function drawChain(s: ChainState, id: string, view: 'logical' | 'memory', selected: string | null): string {
  // Positions depend on permanent node identity, never current ownership or traversal.
  const position = (n: number) => ({ x: view === 'memory' ? 530 : 530 + s.nodes[n]!.column * 250, y: 80 + (view === 'memory' ? n : s.nodes[n]!.row) * 190 });
  const edge = Math.max(780, ...s.nodes.map(n => position(n.id).x + 230));
  const width = edge + s.nodes.length * 14 + 90;
  const height = 170 + Math.max(s.buckets.length, s.replacement?.length ?? 0, view === 'memory' ? s.nodes.length : 8) * 190;
  let content = `<text x="20" y="24" class="hash-index">${escapeHtml(s.result)} · size ${s.size} / capacity ${s.buckets.length} · α = ${(s.size / s.buckets.length).toFixed(3)}</text>`;
  const buckets = (heads: (number | null)[], replacement: boolean) => heads.forEach((head, i) => {
    const x = replacement ? 230 : 20, y = 80 + i * 190;
    content += hashCell({ id: `${replacement ? 'new' : 'bucket'}-${i}`, index: `${replacement ? 'new ' : ''}bucket ${i}`, x, y, lines: [head === null ? 'head = nullptr' : `head = ${address(head)}`], status: head === null ? 'empty' : 'occupied', selected: selected === `${replacement ? 'new' : 'bucket'}-${i}`, active: s.bucket === i && (replacement === s.rehashing) });
    if (head !== null) {
      const p = position(head); const lane = 440 + i * 4;
      // Long bucket references occupy the clear corridor left of every node.
      content += referenceArrow(`M${x + 180} ${y + 65}${s.replacement && !replacement ? ` V${y + 140}` : ''} H${lane} V${p.y - 40} H${p.x + 25} V${p.y}`, id, s.bucket === i);
    }
  });
  buckets(s.buckets, false); if (s.replacement) buckets(s.replacement, true);
  for (const n of s.nodes) {
    const p = position(n.id);
    content += hashCell({ id: address(n.id), index: `${address(n.id)}${s.detached === n.id ? ' · local owner' : ''}`, ...p, status: n.live ? 'occupied' : 'freed', selected: selected === address(n.id), active: s.current === n.id, lines: n.live ? [`${n.key} : ${n.value}`, `hash ${n.hash}`, `next = ${address(n.next)}`] : ['freed storage', 'fields unavailable'] });
    if (n.live && n.next !== null && s.nodes[n.next]) {
      const target = position(n.next);
      const adjacent = p.y === target.y && Math.abs(p.x - target.x) === 250;
      // A forward adjacent link is short. Backward/long links run below this row;
      // memory-view vertical links use exterior lanes right of all object frames.
      const path = adjacent && target.x > p.x
        ? `M${p.x + 180} ${p.y + 65} H${target.x}`
        : p.y === target.y
          ? `M${p.x + 180} ${p.y + 65} h18 V${p.y + 128 + n.id * 3} H${target.x - 18} V${target.y + 65} H${target.x}`
          : `M${p.x + 180} ${p.y + 65} H${edge + n.id * 14} V${target.y + 65} H${target.x + 180}`;
      content += `<g class="pointer-link" data-target="${address(n.next)}" data-from="${address(n.id)}" data-field="next" tabindex="0" role="button" aria-label="Follow ${escapeHtml(n.key)} next to ${escapeHtml(s.nodes[n.next]!.key)}"><path d="${path}" fill="none" stroke="transparent" stroke-width="16"/>${referenceArrow(path, id, s.current === n.id)}</g>`;
    }
  }
  return hashSvg(id, width, height, content);
}
export const chainingAdapter: LabAdapter<ChainState, ChainEvent> = {
  build(op, inputs) { return chainTrace(op as ChainOperation, chainState(parseEntries(String(inputs.get('entries') ?? 'a:1,i:2,q:3,b:4,c:5,d:6'))), String(inputs.get('key') ?? 'e'), Number(inputs.get('value') ?? 7)); },
  draw: drawChain,
  inspect(s, selected) {
    const n = s.nodes.find(n => address(n.id) === selected);
    if (n && !n.live) return hashInspector(address(n.id), [['Lifetime', 'Freed; fields unavailable']]);
    if (n) {
      let owner = 'local unique_ptr'; let bucket: string | number = 'detached';
      for (const [label, heads] of [['current', s.buckets], ['replacement', s.replacement]] as const) heads?.forEach((head, i) => {
        const seen = new Set<number>(); let cursor = head;
        while (cursor !== null && !seen.has(cursor)) { seen.add(cursor); if (cursor === n.id) { owner = label; bucket = i; break; } cursor = s.nodes[cursor]?.next ?? null; }
      });
      const fields: [string, string | number][] = [['key', n.key], ['value', n.value], ['hash', n.hash], ['bucket index', bucket], ['owning array', owner], ['next entry', address(n.next)]];
      if (s.replacement) fields.push(['destination under new capacity', n.hash % s.replacement.length]);
      return hashInspector(address(n.id), fields);
    }
    if (selected?.startsWith('bucket-') || selected?.startsWith('new-')) { const replacement = selected.startsWith('new-'); const i = Number(selected.split('-')[1]); const heads = replacement ? s.replacement : s.buckets; return hashInspector(`Bucket ${i}`, [['array', replacement ? 'replacement' : 'current'], ['head', address(heads?.[i] ?? null)], ['capacity', heads?.length ?? 0]]); }
    return hashInspector('Chained map', [['size', s.size], ['capacity', s.buckets.length], ['load factor', s.size / s.buckets.length], ['key comparisons', s.comparisons], ['result', s.result]]);
  },
  describe(s) { const snap = chainSnapshot(s); return `${s.result}. ${snap.buckets.map((b, i) => `${i}: ${b.map(([k,v]) => `${k}:${v}`).join(' → ')} → nullptr`).join('; ')}. Size ${s.size}, capacity ${s.buckets.length}, comparisons ${s.comparisons}.`; },
  invariants: chainInvariants,
  regions(op) { return op === 'insert' || op === 'update' ? ['insert', 'rehash'] : op === 'rehash' ? ['rehash'] : op === 'erase' ? ['erase'] : ['find']; },
  counters: s => [{ label: 'Key comparisons', value: s.comparisons }, { label: 'Size', value: s.size }, { label: 'Capacity', value: s.buckets.length }, { label: 'Load factor', value: s.size / s.buckets.length }],
};
