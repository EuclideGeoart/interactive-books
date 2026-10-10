import type { MemoryState, TraceEvent } from '../../engine/types';
import { asciiList } from './topology';
import { escapeHtml, dataNode, referenceArrow, arrowDefinitions } from '../../components/visualizers/primitives';

export function drawLinkedList(state: MemoryState, id: string, view: 'logical' | 'memory' = 'logical', selected: string | null = null, event?: TraceEvent): string {
  const nodes = view === 'memory' ? [...state.objects].sort((a, b) => a.address.localeCompare(b.address)) : state.objects;
  const rows = Math.max(1, Math.ceil(nodes.length / 3));
  const width = 688, height = rows * 224 + 52;
  const positions = new Map(nodes.map((node, index) => [node.address, { x: 48 + (index % 3) * 195, y: 112 + Math.floor(index / 3) * 224 }]));
  let arrows = '';
  for (const [index, node] of nodes.entries()) {
    if (node.lifetime !== 'live') continue;
    const origin = positions.get(node.address)!;
    const target = node.pointers.next;
    const active = event?.type === 'AssignPointer' && event.address === node.address && event.field === 'next';
    if (!target) {
      arrows += referenceArrow(`M${origin.x + 108} ${origin.y + 45} H${origin.x + 156}`, id, active);
      arrows += `<text class="null-label" x="${origin.x + 143}" y="${origin.y + 70}">nullptr</text>`;
    } else {
      const end = positions.get(target);
      if (!end) continue;
      let path: string;
      if (end.y === origin.y && end.x === origin.x + 195) {
        path = `M${origin.x + 108} ${origin.y + 45} H${end.x - 5}`;
      } else if (end.y < origin.y && end.x === 48) {
        // The new head sits below the existing chain. Route through the left
        // margin so this link never crosses the chain or its head marker.
        const rail = 16 + (index % 3) * 5;
        path = `M${origin.x + 108} ${origin.y + 45} H${origin.x + 144} V${origin.y + 137} H${rail} V${end.y + 45} H${end.x - 5}`;
      } else {
        const lane = 70 + (index % 3) * 10;
        const side = 638 + (index % 3) * 13;
        path = end.y === origin.y
          ? `M${origin.x + 108} ${origin.y + 45} H${origin.x + 144} V${origin.y - lane} H${end.x - 15} V${end.y + 45} H${end.x - 5}`
          : `M${origin.x + 108} ${origin.y + 45} H${origin.x + 144} V${origin.y + 137 + (index % 3) * 10} H${side} V${end.y - lane} H${end.x - 15} V${end.y + 45} H${end.x - 5}`;
      }
      arrows += `<g class="pointer-link" data-target="${target}" data-from="${node.address}" role="button" tabindex="0" aria-label="Follow next from ${node.address} to ${target}">${referenceArrow(path, id, active)}<path class="arrow-hit-area" d="${path}"/><title>${node.address}.next → ${target}</title></g>`;
    }
  }
  const head = state.references.head;
  const headPoint = head ? positions.get(head) : undefined;
  let headMarker = '';
  if (headPoint) {
    const active = event?.type === 'AssignReference' && event.name === 'head';
    headMarker = `<g class="head-marker"><text x="${headPoint.x + 35}" y="${headPoint.y - 38}" text-anchor="middle">head</text>${referenceArrow(`M${headPoint.x + 35} ${headPoint.y - 30} V${headPoint.y - 6}`, id, active)}</g>`;
  } else {
    headMarker = `<text class="head-empty" x="48" y="44">head → nullptr</text>`;
  }
  return `<svg class="memory-diagram" viewBox="0 0 ${width} ${height}" style="--diagram-height:${height}px" role="group" aria-label="${view === 'memory' ? 'Memory addresses sorted, not traversal order' : 'Logical node connections'}. ${escapeHtml(asciiList(state))}">
    ${arrowDefinitions(id)}
    ${headMarker}
    ${nodes.map(node => dataNode(node, positions.get(node.address)!, node.address === selected, state.visited.includes(node.address), Object.entries(state.references).filter(([key, address]) => key !== 'head' && address === node.address).map(([key]) => key))).join('')}
    ${arrows}
    ${nodes.length === 0 ? '<text class="empty-note" x="48" y="128">No nodes allocated. An empty list is a valid list.</text>' : ''}
  </svg>`;
}
