import { arrowDefinitions, escapeHtml } from '../../components/visualizers/primitives';

// Part IV presentation only. Algorithms, topology and placement belong to adapters.
export function hashCell({ id, index, x, y, lines, status, selected = false, active = false, width = 180 }: {
  id: string; index: string | number; x: number; y: number; lines: string[];
  status: 'empty' | 'occupied' | 'tombstone' | 'value' | 'collision' | 'freed'; selected?: boolean; active?: boolean; width?: number;
}): string {
  const label = `Inspect ${index}: ${status}. ${lines.join('. ')}`;
  return `<g class="data-node hash-cell hash-${status} ${selected ? 'selected' : ''} ${active ? 'active-node' : ''}" data-node="${escapeHtml(id)}" role="button" tabindex="0" aria-label="${escapeHtml(label)}" aria-pressed="${selected}">
    <title>${escapeHtml(label)}</title>
    <text class="hash-index" x="${x + width / 2}" y="${y - 10}" text-anchor="middle">${escapeHtml(index)}</text>
    <rect x="${x}" y="${y}" width="${width}" height="100" rx="6"/>
    <text class="hash-status" x="${x + 12}" y="${y + 20}">${status.toUpperCase()}</text>
    ${lines.map((line, i) => `<text class="hash-cell-line" x="${x + 12}" y="${y + 43 + i * 19}">${escapeHtml(line)}</text>`).join('')}
  </g>`;
}

export function hashInspector(title: string, fields: [string, string | number][]): string {
  return `<div class="inspector-heading"><span class="eyebrow">Hashing inspector</span></div><h4>${escapeHtml(title)}</h4><dl class="node-fields hash-fields">${fields.map(([name, value]) => `<div><dt>${escapeHtml(name)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>`;
}

export function hashSvg(id: string, width: number, height: number, content: string): string {
  return `<svg class="hash-diagram" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="min-width:${width}px" role="group" aria-label="Hashing state; select a bucket or entry to inspect it">${arrowDefinitions(id)}${content}</svg>`;
}
