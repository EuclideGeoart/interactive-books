import { arrowDefinitions, escapeHtml as esc, referenceArrow } from '../../components/visualizers/primitives';
import { heapParent } from '../binary-heap/model';
import type { SortItem, SortRow, SortingScene } from './types';

export const itemLabel = (item: SortItem): string => `${item.key}${item.id >= 0 && item.id < 26 ? String.fromCharCode(65 + item.id) : `#${item.id}`}`;
const cellKey = (row: SortRow, i: number) => `${row.id}:${i}`;
const states = (row: SortRow, i: number): string[] => [
  row.active?.includes(i) ? 'active comparison / write' : '',
  row.finalized?.includes(i) ? 'finalized' : '',
  row.fault?.includes(i) ? 'broken invariant' : '',
  row.muted?.includes(i) ? 'outside active range' : '',
].filter(Boolean);
const classes = (row: SortRow, i: number) => [
  'sort-cell', row.active?.includes(i) ? 'sort-active' : '',
  row.finalized?.includes(i) ? 'sort-final' : '', row.fault?.includes(i) ? 'sort-fault' : '',
  row.muted?.includes(i) ? 'sort-muted' : '',
].join(' ');
const valueLabel = (row: SortRow, i: number) => {
  const item = row.items[i];
  return item === null || item === undefined ? 'empty' : row.id === 'counts' ? String(item.key) : row.padDigits ? `${String(item.key).padStart(row.padDigits, '0')}${itemLabel(item).slice(String(item.key).length)}` : itemLabel(item);
};
function selectedCell(scene: SortingScene, selected: string | null): [SortRow | undefined, number] {
  const [row, index] = selected?.split(':') ?? [scene.rows[0]?.id, '0'];
  return [row === 'heap' ? scene.rows[0] : scene.rows.find(r => r.id === row), Number(index)];
}
export function describeSorting(scene: SortingScene): string {
  return [scene.title, ...scene.rows.map(row => `${row.label}: [${row.items.map((_, i) => valueLabel(row, i)).join(', ')}]. ${
    (row.cursors ?? []).map(c => `${c.label}=${c.index}`).join('; ')} ${
    (row.ranges ?? []).map(r => `${r.label} [${r.low}, ${r.high})`).join('; ')} ${
    row.items.flatMap((_, i) => states(row, i).map(s => `index ${i}: ${s}`)).join('; ')}`),
  ...scene.facts.map(([label, value]) => `${label}: ${value}`), scene.message].join('\n');
}
export function inspectSorting(scene: SortingScene, selected: string | null): string {
  const [row, i] = selectedCell(scene, selected);
  const item = row?.items[i];
  const valid = row !== undefined && Number.isInteger(i) && i >= 0 && i < row.items.length;
  const cursors = row?.cursors?.filter(c => c.index === i).map(c => c.label).join(', ') || 'none';
  const fields: [string, string][] = valid ? [
    ['Storage', row.label], ['Index', String(i)], ['Key', item ? String(item.key) : 'empty slot'],
    ['Identity', item ? row.id === 'counts' ? 'count, not a record' : `${itemLabel(item)} · original index ${item.id}` : 'no record'],
    ['Cursors', cursors], ['State', states(row, i).join('; ') || 'stored record'],
  ] : [['Selection', 'No cell in this empty range']];
  if (valid && scene.heapSize !== undefined && row === scene.rows[0]) {
    fields.push(['Heap membership', i < scene.heapSize ? 'active heap prefix' : 'outside active heap']);
    fields.push(['Parent index', i < scene.heapSize ? String(heapParent(i) ?? 'root has no parent') : 'not in active heap']);
  }
  return `<div class="inspector-heading"><span class="eyebrow">INDEXED STORAGE</span></div><h4>${valid ? `Index ${i} · ${esc(valueLabel(row, i))}` : 'Empty range'}</h4><dl class="node-fields">${fields.map(([k,v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p>Letters identify original records, including equal keys. Indices describe current slots; they are not native addresses. Use arrow keys, Home or End to inspect a row.</p>`;
}

export function drawSorting(scene: SortingScene, id: string, view: 'logical' | 'memory', selected: string | null): string {
  const longest = Math.max(4, ...scene.rows.flatMap(row => row.items.map((_, i) => valueLabel(row, i).length)));
  const cellWidth = Math.max(74, longest * 12 + 20), pitch = cellWidth + 14, left = 28;
  const width = Math.max(620, Math.max(0, ...scene.rows.map(r => r.items.length)) * pitch + 96);
  const [selectedRow, selectedIndex] = selectedCell(scene, selected);
  const cell = (row: SortRow, i: number, x: number, y: number, tree = false): string => {
    const key = tree ? `heap:${i}` : cellKey(row, i);
    const chosen = selected !== null && row === selectedRow && i === selectedIndex;
    const text = valueLabel(row, i);
    const status = states(row, i).join(', ');
    const digitAt = row.padDigits && row.activeDigit !== undefined ? row.padDigits - 1 - row.activeDigit : -1;
    const shown = text === 'empty' ? '—' : text;
    const markup = digitAt >= 0 && text !== 'empty' ? [...shown].map((c, at) => at === digitAt ? `<tspan class="sort-digit">${esc(c)}</tspan>` : esc(c)).join('') : esc(shown);
    return `<g class="${classes(row, i)} ${chosen ? 'sort-selected' : ''}" data-node="${esc(key)}" data-sort-row="${tree ? 'heap' : esc(row.id)}" data-sort-index="${i}" role="button" tabindex="0" aria-pressed="${chosen}" aria-label="Inspect ${tree ? 'heap tree' : esc(row.label)} index ${i}, ${esc(text)}${status ? `, ${esc(status)}` : ''}"><title>${esc(text)} · index ${i}${status ? ` · ${esc(status)}` : ''}</title><rect x="${x}" y="${y}" width="${cellWidth}" height="58" rx="5"/><text class="sort-value" x="${x + cellWidth/2}" y="${y + 34}" text-anchor="middle">${markup}</text><text class="sort-index" x="${x + cellWidth/2}" y="${y + 78}" text-anchor="middle">${esc(row.labels?.[i] ?? `${view === 'memory' ? 'slot ' : ''}${i}`)}</text>${row.finalized?.includes(i) ? `<text class="sort-check" x="${x + cellWidth - 9}" y="${y + 13}" text-anchor="middle">✓</text>` : ''}${row.fault?.includes(i) ? `<text class="sort-error" x="${x + 9}" y="${y + 13}">!</text>` : ''}</g>`;
  };
  let y = 0;
  const drawing: string[] = [];
  if (scene.heapSize !== undefined && scene.rows[0]) {
    const row = scene.rows[0], size = scene.heapSize;
    // Use the original array length for geometry: extraction never relocates
    // unrelated heap slots while the active prefix shrinks.
    const levels = Math.max(1, Math.floor(Math.log2(Math.max(1, row.items.length))) + 1);
    const position = (i: number) => { const level = Math.floor(Math.log2(i+1)); return { x: width * ((i - (2**level - 1) + .5) / 2**level) - cellWidth/2, y: 56 + level * 118 }; };
    drawing.push('<text class="sort-row-label" data-sort-label="ACTIVE MAX HEAP · same indices as the array" x="28" y="26">ACTIVE MAX HEAP · same indices as the array</text>');
    for(let i=1;i<size;i++) { const p=position(heapParent(i)!), c=position(i); drawing.push(referenceArrow(`M${p.x+cellWidth/2} ${p.y+85} L${c.x+cellWidth/2} ${c.y-7}`, id)); }
    for(let i=0;i<size;i++) { const p=position(i); drawing.push(cell(row,i,p.x,p.y,true)); }
    if(!size) drawing.push('<text class="sort-index" x="28" y="75">Empty active heap</text>');
    y = levels * 118 + 44;
  }
  for (const row of scene.rows) {
    const cellY = y + 120;
    drawing.push(`<g data-sort-storage="${esc(row.id)}"><text class="sort-row-label" data-sort-label="${esc(row.label)}" x="${left}" y="${y + 26}">${esc(row.label)}</text>`);
    for (const [lane, cursor] of (row.cursors ?? []).entries()) {
      if(cursor.index < 0) continue; // Out-of-scope sentinels remain in facts, not on a cell.
      // End cursors sit at the true half-open boundary, never on the last cell.
      const at = Math.max(-.2, Math.min(row.items.length, cursor.index));
      const cx = left + at * pitch + (cursor.index === row.items.length ? -7 : cellWidth/2);
      const cy = y + 50 + (lane % 4) * 17;
      drawing.push(`<text class="sort-cursor" x="${cx}" y="${cy}" text-anchor="middle">${esc(cursor.label)}=${cursor.index}</text><path class="sort-cursor-line" d="M${cx} ${cy+3} V${cellY-8}"/>`);
    }
    drawing.push(...row.items.map((_, i) => cell(row,i,left+i*pitch,cellY)));
    if (!row.items.length) drawing.push(`<text class="sort-index" x="${left}" y="${cellY+30}">Empty array · size 0</text>`);
    for(const [lane, range] of (row.ranges ?? []).entries()) {
      const x = left + Math.max(0,range.low)*pitch - 3;
      const end = left + Math.max(range.low,range.high)*pitch - 11;
      const ry = cellY + 99 + lane * 30;
      drawing.push(`<path class="sort-range" d="M${x} ${ry-5} V${ry} H${Math.max(x+12,end)} V${ry-5}"/><text class="sort-index" x="${x+4}" y="${ry+17}">${esc(range.label)} [${range.low}, ${range.high})</text>`);
    }
    drawing.push('</g>');
    y += 248 + Math.max(0,(row.ranges?.length ?? 0)-1)*30;
  }
  return `<div class="sorting-state-strip"><strong>${esc(scene.title)}</strong><span>${view === 'memory' ? 'Indexed storage · records keep their identity' : 'Comparison / movement trace'}</span></div><svg class="memory-diagram sorting-diagram" viewBox="0 0 ${width} ${Math.max(140,y)}" style="min-width:${width}px" role="group" aria-label="${esc(scene.title)} indexed records and cursors">${arrowDefinitions(id)}${drawing.join('')}</svg><div class="sorting-facts"><dl>${scene.facts.map(([key,value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><p class="sorting-result">${esc(scene.message)}</p><p class="sorting-legend">Amber: active comparison / write · Blue: cursor · Green ✓: finalized · Red !: broken invariant. Letters track original records.</p></div>`;
}
