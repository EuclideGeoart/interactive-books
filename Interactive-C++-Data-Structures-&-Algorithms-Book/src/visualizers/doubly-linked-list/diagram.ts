import type { MemoryState, TraceEvent } from '../../engine/types';
import { dataNode, referenceArrow, escapeHtml, arrowDefinitions } from '../../components/visualizers/primitives';
import { addressFor } from '../linked-list/model';
import { describeDoubly } from './model';

export function drawDoubly(state: MemoryState, id: string, view: 'logical' | 'memory', selected: string | null, event?: TraceEvent) {
  // Reserve all seven slots from the start. Neither insertion nor deletion shifts an existing node.
  const slots = Array.from({length:7},(_,i)=>addressFor(i));
  if (view === 'memory') slots.sort();
  const position = (address: string) => { const slot=Math.max(0,slots.indexOf(address)); return {x:48+(slot%3)*252,y:130+Math.floor(slot/3)*320}; };
  const width=820;
  const rows=Math.max(1,...state.objects.map(node=>Math.floor(slots.indexOf(node.address)/3)+1));
  const height=rows*320+35;
  let links='';
  for(const node of state.objects.filter(n => n.lifetime === 'live')) {
    const from=position(node.address);
    for(const field of ['prev','next']) {
      const target=node.pointers[field];
      const dot=from.x+(field === 'prev' ? 28 : 160);
      if(!target) {links+=`<text class="field-label" x="${dot}" y="${from.y+66}" text-anchor="middle">nullptr</text>`;continue;}
      const to=position(target),slot=slots.indexOf(node.address);
      // Two outside lanes: prev above frames, next below addresses/local-reference labels.
      const lane=field === 'prev' ? from.y-60-(slot%3)*12 : from.y+155+(slot%3)*12;
      const targetLane=field === 'prev' ? to.y-60-(slot%3)*12 : to.y+155+(slot%3)*12;
      const side=field === 'prev' ? from.x-22 : from.x+212;
      const end=field === 'prev' ? to.x+210 : to.x-18;
      const outer=field === 'prev' ? 16 : width-16;
      const route=from.y===to.y ? `H${end}` : `H${outer} V${targetLane} H${end}`;
      const arrival=to.y+(field === 'prev' ? 30 : 60);
      const edge=field === 'prev' ? to.x+193 : to.x-5;
      const adjacent=from.y===to.y && to.x-from.x===(field === 'prev' ? -252 : 252);
      const path=adjacent
        ? `M${dot} ${from.y+45} H${side} V${arrival} H${edge}`
        : `M${dot} ${from.y+45} H${side} V${lane} ${route} V${arrival} H${edge}`;
      const active=event?.type === 'AssignPointer' && event.address === node.address && event.field === field;
      links+=`<g class="pointer-link" data-from="${node.address}" data-target="${target}" data-field="${field}" role="button" tabindex="0" aria-label="Follow ${field} from ${node.address} to ${target}">${referenceArrow(path,id,active)}<path class="arrow-hit-area" d="${path}"/><title>${node.address}.${field} → ${target}</title></g>`;
    }
  }
  const references=['head','tail'].map(name => {
    const address=state.references[name];
    if(!address) return `<text class="head-empty" x="${name === 'head' ? 48 : 330}" y="25">${name} → nullptr</text>`;
    const point=position(address),x=point.x+(state.references.head===state.references.tail ? (name === 'head' ? 66 : 122) : 94);
    return `<g class="head-marker"><text x="${x}" y="${point.y-26}" text-anchor="middle">${name}</text>${referenceArrow(`M${x} ${point.y-20} V${point.y-6}`,id,event?.type === 'AssignReference' && event.name === name)}</g>`;
  }).join('');
  return `<svg class="memory-diagram" viewBox="0 0 ${width} ${height}" style="--diagram-height:${height}px;min-width:${width}px" role="group" aria-label="${escapeHtml(describeDoubly(state))}">${arrowDefinitions(id)}${references}${state.objects.map(node=>dataNode(node,position(node.address),node.address===selected,state.visited.includes(node.address),Object.entries(state.references).filter(([key,target])=>!['head','tail'].includes(key)&&target===node.address).map(([key])=>key),['prev','next'],1)).join('')}${links}<text class="memory-address" x="48" y="${height-12}">prev ← · → next · fixed slots preserve object identity${view === 'memory' ? ' · addresses sorted' : ''}</text></svg>`;
}
