import { arrowDefinitions, escapeHtml as esc, referenceArrow, memoryAddress } from '../../components/visualizers/primitives';
import { validHandle } from './handles';
import { walk } from './trace';
import type { MemoryState } from './adapter';
const nil = (i: number) => i === 6 ? 'nullptr' : String(i);
const button = (id: string, text: string, selected: string | null) => `<button type="button" data-inspect="${esc(id)}" aria-pressed="${selected === id}">${esc(text)}</button>`;
const lifeLabel = (life: string) => ({ free:'FREE SLOT', reserved:'RAW / RESERVED', live:'LIVE OBJECT', destroyed:'DESTROYED' }[life] ?? life);
function slotFields(s: Exclude<MemoryState, {kind:'arena'}>, i: number): [string,string][] {
  if (s.kind === 'free-list') return [['Storage',s.free[i] ? 'FREE STORAGE' : 'ALLOCATED RAW STORAGE'],['Embedded next',s.free[i] || s.pending === i ? nil(s.next[i]!) : 'unavailable'],['Object lifetime','No client object managed'],['Position',`physical slot ${i}; conceptual stride 32 bytes`]];
  if (s.kind === 'object-pool') return [['Storage',s.life[i] === 'free' ? 'available' : 'occupied'],['Object lifetime',lifeLabel(s.life[i]!)],['Value',s.life[i] === 'live' ? String(s.values[i]) : 'unreadable — no live T'],['Free-list next',s.life[i] === 'free' ? nil(s.next[i]!) : 'not a free slot']];
  const slot = s.slots[i]!;
  return [['slot.currentGeneration',String(slot.generation)],['alive?',String(slot.alive)],['retired?',String(slot.retired)],['Value',slot.alive ? String(slot.value) : 'unreadable — no live value'],['Free-list next',!slot.alive && !slot.retired ? nil(slot.next) : 'not reusable'],['handle.index',String(s.checked.index)],['handle.generation',String(s.checked.generation)],['Current validation',validHandle(s,s.checked) ? 'VALID HANDLE' : 'STALE / INVALID HANDLE']];
}
function slotSvg(s: Exclude<MemoryState, {kind:'arena'}>, id: string, view: 'logical'|'memory', selected: string|null) {
  const chain = s.kind === 'free-list' && view === 'logical';
  const positions = Array.from({length:6},(_,i) => chain ? {x:30+i*166,y:125} : {x:24+(i%3)*186,y:58+Math.floor(i/3)*148});
  const links = chain ? s.next.map((target,i) => {
    if (!(s.kind === 'free-list' && (s.free[i] || s.pending === i))) return '';
    const a = positions[i]!;
    if (target === 6) return `<text class="sm-small" x="${a.x+76}" y="${a.y+110}" text-anchor="middle">next = nullptr</text>`;
    if (target < 0 || target >= 6) return `<text class="sm-error" x="${a.x+76}" y="${a.y+110}" text-anchor="middle">invalid next ${target}</text>`;
    const b = positions[target]!;
    const path = target === i+1 ? `M${a.x+152} ${a.y+38} H${b.x}` : `M${a.x+152} ${a.y+38} H${a.x+159} V${36+i*11} H${b.x-7} V${b.y+22} H${b.x}`;
    return referenceArrow(path,id,s.active === i);
  }).join('') : '';
  const nodes = positions.map((p,i) => {
    const fields = slotFields(s,i);
    const state = s.kind === 'free-list' ? (s.free[i] ? 'free' : 'reserved') : s.kind === 'object-pool' ? s.life[i]! : s.slots[i]!.retired ? 'destroyed' : s.slots[i]!.alive ? 'live' : 'free';
    const label = s.kind === 'handles' ? `generation ${s.slots[i]!.generation}` : lifeLabel(state);
    const detail = s.kind === 'handles' ? s.slots[i]!.retired ? 'RETIRED' : s.slots[i]!.alive ? `alive · value ${s.slots[i]!.value}` : 'not alive · free' : s.kind === 'object-pool' ? s.life[i] === 'live' ? `value ${s.values[i]}` : 'no readable T fields' : s.free[i] || s.pending === i ? `next = ${nil(s.next[i]!)}` : 'client owns raw bytes';
    return `<g class="sm-slot sm-${state} ${s.active === i ? 'sm-active' : ''} ${selected === `slot:${i}` ? 'selected' : ''}" data-node="slot:${i}" role="button" tabindex="0" aria-pressed="${selected === `slot:${i}`}" aria-label="Inspect slot ${i}: ${esc(fields.map(([k,v])=>`${k}: ${v}`).join('; '))}"><rect x="${p.x}" y="${p.y}" width="152" height="92" rx="5"/><text class="sm-label" x="${p.x+12}" y="${p.y+23}">slot ${i}</text><text class="sm-small" x="${p.x+12}" y="${p.y+48}">${esc(label)}</text><text class="sm-small" x="${p.x+12}" y="${p.y+72}">${esc(detail)}</text>${view === 'memory' ? memoryAddress(s.kind === 'free-list' ? `byte offset ${i*32}` : `slot index ${i}`,p.x+12,p.y+113) : ''}</g>`;
  }).join('');
  return `<svg class="sm-svg systems-diagram" width="${chain ? 1040 : 586}" height="${chain ? 265 : 358}" viewBox="0 0 ${chain ? 1040 : 586} ${chain ? 265 : 358}" aria-label="${esc(s.kind)} ${view} representation">${arrowDefinitions(id)}<text class="sm-label" x="24" y="24">head = ${nil(s.head)}${chain ? ' · stable physical positions; links define order' : ' · each slot retains its position'}</text>${links}${nodes}</svg>`;
}
function arenaSvg(s: Extract<MemoryState,{kind:'arena'}>, view: 'logical'|'memory', selected: string|null) {
  const cells = Array.from({length:64},(_,i) => {
    const block = s.blocks.findIndex(b => i >= b.begin && i < b.begin+b.size);
    const status = block >= 0 ? 'reserved' : i < s.offset ? 'padding' : 'free';
    const x = view === 'memory' ? 30+(i%16)*32 : 30+i*8;
    const y = view === 'memory' ? 58+Math.floor(i/16)*54 : 70;
    const w = view === 'memory' ? 30 : 8;
    return `<g class="sm-byte sm-${status} ${selected === `byte:${i}` ? 'selected' : ''}" data-node="byte:${i}" role="button" tabindex="0" aria-pressed="${selected === `byte:${i}`}" aria-label="Byte ${i}: ${status}${block >= 0 ? `, reservation ${block}` : ''}"><rect x="${x}" y="${y}" width="${w}" height="34"/>${view === 'memory' ? `<text class="sm-small" x="${x+w/2}" y="${y+22}" text-anchor="middle">${i}</text>` : ''}</g>`;
  }).join('');
  return `<svg class="sm-svg systems-diagram" width="580" height="${view === 'memory' ? 292 : 166}" viewBox="0 0 580 ${view === 'memory' ? 292 : 166}" aria-label="Arena byte reservations and alignment padding"><text class="sm-label" x="30" y="25">RAW BYTES · offset ${s.offset} / 64 · padding ${s.padding}</text>${cells}${view === 'logical' ? `<path class="sm-bump" d="M${30+s.offset*8} 52 V112"/><text class="sm-small" x="30" y="139">0 ··· occupied prefix ··· bump ${s.offset} ··· available suffix 64</text>` : ''}</svg>`;
}
export function drawMemory(s: MemoryState, id: string, view: 'logical'|'memory', selected: string|null): string {
  let details = '';
  if (s.kind === 'free-list') {
    const traversal = walk(s.head,s.next);
    details = `<p>Topology: head → ${traversal.order.map(i => `slot ${i}`).join(' → ')}${traversal.order.length ? ' → ' : ''}${esc(traversal.error || 'nullptr')}</p><p>Pending storage: ${s.pending === 6 ? 'none' : `slot ${s.pending}`}. No objects are constructed by this free list.</p>`;
  } else if (s.kind === 'arena') {
    details = `<div class="sm-table-scroll" tabindex="0" role="region" aria-label="${esc(id)} reservation records"><table><caption>Reservation ledger · bytes, not constructed objects</caption><thead><tr><th scope="col">Block</th><th scope="col">Range</th><th scope="col">Alignment</th><th scope="col">Padding</th></tr></thead><tbody>${s.blocks.map((b,i)=>`<tr><th scope="row">${button(`block:${i}`,String(i),selected)}</th><td>[${b.begin}, ${b.begin+b.size})</td><td>${b.alignment}</td><td>${b.padding}</td></tr>`).join('')}</tbody></table></div><p>Legend: RAW / RESERVED = blue; padding = amber; available = pale. Last candidate ${s.candidate}, requested ${s.requested}. Reset calls zero destructors.</p>`;
  } else if (s.kind === 'object-pool') details = '<p>FREE → RAW / RESERVED → LIVE OBJECT → DESTROYED → FREE. Constructor failure returns reserved storage directly to FREE. No value is displayed outside LIVE.</p>';
  else details = `<p>Teaching generation limit: ${s.limit}. Retire instead of wrapping.</p><p>Inspect retained handles: ${s.saved.map((h,i)=>button(`handle:${i}`,`{${h.index}, ${h.generation}} ${validHandle(s,h) ? 'VALID' : 'STALE'}`,selected)).join(' ')}</p><p>Last check: {${s.checked.index}, ${s.checked.generation}} → ${s.valid ? 'valid when checked' : 'invalid when checked'}.</p>`;
  return `<div class="sm-scene"><p class="sm-result ${s.broken ? 'sm-broken' : ''}">${esc(s.result)}</p>${s.kind === 'arena' ? arenaSvg(s,view,selected) : slotSvg(s,id,view,selected)}${details}</div>`;
}
export function inspectMemory(s: MemoryState, selected: string|null): string {
  let title = 'Storage, lifetime, identity', fields: [string,string][] = [['Model','Select a slot, byte, or retained handle. Positions are conceptual, not ABI offsets.']];
  if (selected) {
    const [type,raw] = selected.split(':'); const i = Number(raw);
    if (type === 'slot' && s.kind !== 'arena' && Number.isInteger(i) && i >= 0 && i < 6) { title = `Slot ${i}`; fields = slotFields(s,i); }
    else if (s.kind === 'handles' && type === 'handle' && s.saved[i]) {
      const h = s.saved[i]!, slot = s.slots[h.index]!; title = validHandle(s,h) ? 'VALID HANDLE' : 'STALE HANDLE';
      fields = [['handle.index',String(h.index)],['handle.generation',String(h.generation)],['slot.currentGeneration',String(slot.generation)],['alive?',String(slot.alive)],['retired?',String(slot.retired)],['Owns storage?','No. This token belongs to this registry instance only.']];
    } else if (s.kind === 'arena' && type === 'byte' && Number.isInteger(i) && i >= 0 && i < 64) {
      const block = s.blocks.find(b => i >= b.begin && i < b.begin+b.size); title = `Byte offset ${i}`;
      fields = [['Storage',block ? 'ALLOCATED RAW BYTES' : i < s.offset ? 'ALIGNMENT PADDING' : 'AVAILABLE'],['Object lifetime','The arena constructs no objects'],['Reservation',block ? `[${block.begin}, ${block.begin+block.size}) aligned ${block.alignment}` : 'none']];
    } else if (s.kind === 'arena' && type === 'block' && s.blocks[i]) { const b = s.blocks[i]!; title = `Reservation ${i}`; fields = Object.entries(b).map(([k,v])=>[k,String(v)]); }
    else { title = 'Selection is unavailable'; fields = [['State','The selected reservation does not exist at this step.']]; }
  }
  return `<h4>${esc(title)}</h4><dl>${fields.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
}
export function describeMemory(s: MemoryState): string {
  if (s.kind === 'arena') return `offset=${s.offset}; padding=${s.padding}; reservations=${s.blocks.map(b=>`[${b.begin},${b.begin+b.size}) align=${b.alignment}`).join(' | ') || 'none'}; ${s.result}`;
  return `head=${nil(s.head)}\n${Array.from({length:6},(_,i)=>`slot ${i}: ${slotFields(s,i).map(([k,v])=>`${k}=${v}`).join('; ')}`).join('\n')}\n${s.result}`;
}
export function memoryCounters(s: MemoryState): {label:string;value:number}[] {
  const values = s.kind === 'free-list' ? {'Head selections':s.reads,'Link/head writes':s.writes,'Occupied slots':s.free.filter(v=>!v).length}
    : s.kind === 'arena' ? {'Reservations':s.allocations,'Padding bytes':s.padding,'Used bytes':s.offset,'Bulk resets':s.resets}
    : s.kind === 'object-pool' ? {'Constructions':s.constructions,'Destructions':s.destructions,'Rollbacks':s.rollbacks,'Occupied slots':s.life.filter(l=>l!=='free').length}
    : {'Validations':s.validations,'Slot reuses':s.reuses,'Retired slots':s.slots.filter(slot=>slot.retired).length};
  return Object.entries(values).map(([label,value])=>({label,value:value!}));
}
