import type { MemoryObject } from '../../engine/types';

export const escapeHtml = (text: unknown): string => String(text).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
export interface Point { x: number; y: number }
export function memoryAddress(address: string, x: number, y: number): string {
  return `<text class="memory-address" x="${x}" y="${y}">${escapeHtml(address)}</text>`;
}
export function pointerField(name: string, x: number, y: number, divider = true): string {
  return `${divider ? `<path class="field-divider" d="M${x} ${y} V${y + 76}"/>` : ''}<text class="field-label" x="${x + 28}" y="${y + 21}" text-anchor="middle">${escapeHtml(name)}</text><circle class="pointer-dot" cx="${x + 28}" cy="${y + 45}" r="4"/>`;
}
export function dataNode(node: MemoryObject, point: Point, selected: boolean, active: boolean, references: string[], fields: readonly string[] = ['next'], dataIndex = 0): string {
  const { x, y } = point;
  const width = 76 + 56 * fields.length;
  const center = x + width / 2;
  const live = node.lifetime === 'live';
  const unavailable = node.lifetime === 'destroyed' || node.lifetime === 'freed';
  const columns = [...fields];
  columns.splice(dataIndex, 0, 'data');
  let offset = 0;
  const cells = columns.map((field, index) => {
    const left = x + offset;
    offset += field === 'data' ? 76 : 56;
    if (field !== 'data') return pointerField(field, left, y, index > 0);
    return `${index > 0 ? `<path class="field-divider" d="M${left} ${y} V${y + 76}"/>` : ''}<text class="field-label" x="${left + 38}" y="${y + 21}" text-anchor="middle">data</text><text class="node-value" x="${left + 38}" y="${y + 53}" text-anchor="middle">${node.data}</text>`;
  }).join('');
  return `<g class="data-node ${selected ? 'selected' : ''} ${active ? 'active-node' : ''} ${node.lifetime}" data-node="${escapeHtml(node.address)}" role="button" tabindex="0" aria-label="Inspect ${live ? `node ${node.data}` : node.lifetime + ' storage'} at ${escapeHtml(node.address)}" aria-pressed="${selected}">
    <title>${live ? `Node ${node.data}. ${fields.map(field => `${escapeHtml(field)}: ${escapeHtml(node.pointers[field] ?? 'nullptr')}`).join('. ')}.` : `${node.lifetime} storage. Fields unavailable.`} Click or press Enter to inspect.</title>
    <rect x="${x}" y="${y}" width="${width}" height="76" rx="6"/>
    ${live ? cells : `<text class="lifetime-label" x="${center}" y="${y + 33}" text-anchor="middle">${node.lifetime.toUpperCase()}</text><text class="field-label" x="${center}" y="${y + 53}" text-anchor="middle">${unavailable ? 'no valid fields' : 'no object yet'}</text>`}
    ${memoryAddress(node.address, center - 32, y + 96)}
    ${references.length ? `<text class="local-reference" x="${center}" y="${y + 116}" text-anchor="middle">${escapeHtml(references.join(' · '))}</text>` : ''}
  </g>`;
}
export function referenceArrow(path: string, id: string, active = false): string {
  return `<path class="reference-arrow ${active ? 'active-arrow' : ''}" d="${path}" marker-end="url(#${id}-${active ? 'active' : 'arrow'})"/>`;
}

// Shared by the owning list, pool and intrusive diagrams; routing stays chapter-owned.
export function arrowDefinitions(id: string): string {
  const safe = escapeHtml(id);
  return `<defs><marker id="${safe}-arrow" viewBox="0 0 10 8" refX="9" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 4 L0 8 Z" fill="var(--pointer)"/></marker><marker id="${safe}-active" viewBox="0 0 10 8" refX="9" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 4 L0 8 Z" fill="var(--amber)"/></marker></defs>`;
}
