import { arrowDefinitions, escapeHtml as esc, referenceArrow } from '../../components/visualizers/primitives';
import type { Bounds, SpatialNode, SpatialState, SpatialStatus, Vec } from './types';

const glyph: Record<SpatialStatus, string> = { unvisited: '○', current: '▶', visited: '•', pruned: '×', candidate: '?', accepted: '✓', fault: '!' };
export const formatPoint = (p: Vec): string => `(${p.x}, ${p.y}${p.z === undefined ? '' : `, ${p.z}`})`;
export const formatBounds = (b: Bounds): string => `[${b.minX}, ${b.minY}${b.minZ === undefined ? '' : `, ${b.minZ}`}] → [${b.maxX}, ${b.maxY}${b.maxZ === undefined ? '' : `, ${b.maxZ}`}]`;
const attrs = (id: string, label: string, selected: string | null): string => `data-node="${esc(id)}" role="button" tabindex="0" aria-label="${esc(label)}" aria-pressed="${selected === id}"`;
const button = (id: string, label: string, selected: string | null) => `<button type="button" data-inspect="${esc(id)}" aria-pressed="${id === selected}">${esc(label)}</button>`;
const px = (v: number): number => 46 + (v + 8) * 22;
const py = (v: number): number => 400 - (v + 8) * 22;
function rect(b: Bounds, plane: 'xy' | 'xz'): string {
  const lo = plane === 'xy' ? b.minY : b.minZ ?? 0, hi = plane === 'xy' ? b.maxY : b.maxZ ?? 0;
  // Fixed world window; a boundary cell can continue outside it. Inspect exact bounds.
  const clamp=(v:number)=>Math.max(-8,Math.min(8,v));
  return `x="${px(clamp(b.minX))}" y="${py(clamp(hi))}" width="${Math.max(1,(clamp(b.maxX)-clamp(b.minX))*22)}" height="${Math.max(1,(clamp(hi)-clamp(lo))*22)}"`;
}
function projection(s: SpatialState, plane: 'xy' | 'xz', selected: string | null): string {
  const axis = plane === 'xy' ? 'y' : 'z';
  const grid = s.cellSize ?? 4;
  const ticks = [-8,-4,0,4,8];
  const lines: string[] = [];
  for (let v = Math.ceil(-8 / grid) * grid; v <= 8; v += grid) lines.push(`<path class="spatial-grid-line" d="M${px(v)} 48 V400 M46 ${py(v)} H398"/>`);
  // Closed region outlines may touch; the model still assigns each point one owner.
  const regions = s.nodes.filter(n => !n.children.length || ['r-tree','bvh'].includes(s.kind)
    || n.id === s.focus || n.id === selected || n.status === 'visited' || n.status === 'pruned');
  const nodeShape = (n: SpatialNode) => `<g class="spatial-region status-${n.status} ${n.id === selected ? 'selected' : ''}" ${attrs(n.id, `${n.label}; ${n.status}; ${formatBounds(n.bounds)}. ${n.detail}`, selected)}><title>${esc(n.label)} · ${esc(n.status)} · ${esc(n.detail)}</title><rect ${rect(n.bounds,plane)}/>${n.id === s.focus ? `<text class="spatial-active-label" x="${Math.max(48,Math.min(330,px(n.bounds.minX)+4))}" y="${Math.max(62,py(plane === 'xy' ? n.bounds.maxY : n.bounds.maxZ ?? 0)+15)}">▶ ${esc(n.id)}</text>` : ''}</g>`;
  const splits = s.nodes.filter(n => n.axis && n.split !== undefined && (n.axis === 'x' || n.axis === axis)).map(n => {
    const vertical = n.axis === 'x';
    return `<path class="spatial-split" d="${vertical ? `M${px(n.split!)} ${py(plane === 'xy' ? n.bounds.maxY : n.bounds.maxZ ?? 0)} V${py(plane === 'xy' ? n.bounds.minY : n.bounds.minZ ?? 0)}` : `M${px(n.bounds.minX)} ${py(n.split!)} H${px(n.bounds.maxX)}`}"/><title>${esc(`${n.id}: ${n.axis} = ${n.split}`)}</title>`;
  }).join('');
  const labels: {x:number;y:number}[]=[];
  const centers=s.objects.map(o=>({x:px(o.point?.x??(o.bounds.minX+o.bounds.maxX)/2),y:py(o.point?(plane==='xy'?o.point.y:o.point.z??0):(plane==='xy'?(o.bounds.minY+o.bounds.maxY)/2:((o.bounds.minZ??0)+(o.bounds.maxZ??0))/2))}));
  const objects = s.objects.map((o, i) => {
    const p = o.point, x = px(p?.x ?? (o.bounds.minX+o.bounds.maxX)/2), y = py(p ? (plane === 'xy' ? p.y : p.z ?? 0) : (plane === 'xy' ? (o.bounds.minY+o.bounds.maxY)/2 : ((o.bounds.minZ ?? 0)+(o.bounds.maxZ ?? 0))/2));
    const candidates=[-12,22,-30,40,-48,58,-66,76,-84,94,-102,112].flatMap(dy=>[10,-42].map(dx=>({x:Math.max(48,Math.min(358,x+dx)),y:Math.max(62,Math.min(390,y+dy))})));
    const label=candidates.find(c=>!labels.some(l=>Math.abs(l.x-c.x)<44&&Math.abs(l.y-c.y)<16)&&!centers.some(v=>v.x>c.x-7&&v.x<c.x+39&&v.y>c.y-19&&v.y<c.y+7))??{x:402,y:60+i*26};
    labels.push(label);
    const leader=Math.abs(label.y-y)>26?`<path class="spatial-label-leader" d="M${x} ${y} L${label.x} ${label.y-5}"/>`:'';
    return `<g class="spatial-object status-${o.status} ${o.id === selected ? 'selected' : ''}" ${attrs(o.id, `${o.label}; ${o.status}; ${p ? formatPoint(p) : formatBounds(o.bounds)}. ${o.detail}`, selected)}><title>${esc(o.detail)}</title>${leader}${p ? `<circle class="spatial-hit" cx="${x}" cy="${y}" r="14"/><circle cx="${x}" cy="${y}" r="6"/>` : `<rect ${rect(o.bounds, plane)} rx="2"/>`}<text x="${label.x}" y="${label.y}">${esc(o.label)} ${glyph[o.status]}</text></g>`;
  }).join('');
  const pairs = s.candidatePairs.map(([a,b]) => {
    const aa = s.objects.find(o=>o.id===a), bb = s.objects.find(o=>o.id===b);
    if (!aa || !bb) return '';
    const center = (o: typeof aa) => [px((o.bounds.minX+o.bounds.maxX)/2), py(plane === 'xy' ? (o.bounds.minY+o.bounds.maxY)/2 : ((o.bounds.minZ ?? 0)+(o.bounds.maxZ ?? 0))/2)];
    const [ax,ay]=center(aa),[bx,by]=center(bb);
    return `<path class="spatial-pair" d="M${ax} ${ay} L${bx} ${by}"><title>Candidate ${esc(a)}–${esc(b)}; not a true collision claim</title></path>`;
  }).join('');
  const query = (s.query ? `<g class="spatial-query" ${attrs('query',`Query ${formatBounds(s.query)}`,selected)}><rect ${rect(s.query,plane)}/><title>Closed query ${esc(formatBounds(s.query))}</title></g>` : '')
    + (s.currentRegion ? `<g class="spatial-region status-current" ${attrs('current-region',`Current query cell ${formatBounds(s.currentRegion)}`,selected)}><rect ${rect(s.currentRegion,plane)}/><title>Current query cell, occupied or empty</title></g>` : '');
  const qp = s.queryPoint ? `<g class="spatial-query-point" ${attrs('query-point',`Query point ${formatPoint(s.queryPoint)}`,selected)}><path d="M${px(s.queryPoint.x)-9} ${py(plane === 'xy' ? s.queryPoint.y : s.queryPoint.z ?? 0)} h18 M${px(s.queryPoint.x)} ${py(plane === 'xy' ? s.queryPoint.y : s.queryPoint.z ?? 0)-9} v18"/><text x="${px(s.queryPoint.x)+12}" y="${py(plane === 'xy' ? s.queryPoint.y : s.queryPoint.z ?? 0)+22}">Q</text></g>` : '';
  return `<section class="spatial-projection"><h4>${plane.toUpperCase()} ${s.dimension === 3 ? 'projection' : 'coordinate space'}${s.dimension === 3 ? ' · use both views for depth' : ''}</h4><svg class="spatial-diagram" width="448" height="444" viewBox="0 0 448 444" aria-label="${plane.toUpperCase()} spatial projection"><rect class="spatial-domain" x="46" y="48" width="352" height="352"/>${lines.join('')}${regions.map(nodeShape).join('')}${splits}${query}${pairs}${objects}${qp}${ticks.map(v=>`<text class="spatial-axis" x="${px(v)}" y="420" text-anchor="middle">${v}</text><text class="spatial-axis" x="35" y="${py(v)+4}" text-anchor="end">${v}</text>`).join('')}<text class="spatial-axis" x="419" y="422">x</text><text class="spatial-axis" x="22" y="28">${axis}</text></svg></section>`;
}
function hierarchy(s: SpatialState, id: string, selected: string | null): string {
  if (!s.nodes.length) return '<p class="spatial-empty">No hierarchy nodes / occupied cells yet.</p>';
  const nodeY = new Map(s.nodes.map((n,i)=>[n.id,20+i*58]));
  const x = (n: SpatialNode) => 22+Math.min(n.depth,8)*22;
  const height = 30+s.nodes.length*58;
  return `<h4>Node ownership <span>stable rows · select to inspect bounds</span></h4><div class="spatial-hierarchy-scroll" tabindex="0" role="region" aria-label="Scrollable spatial hierarchy"><svg class="spatial-hierarchy" width="480" height="${height}" viewBox="0 0 480 ${height}" aria-label="Spatial node parent and child references">${arrowDefinitions(id)}${s.nodes.map(n=>{
    const parent=s.nodes.find(p=>p.id===n.parent);
    return parent?.children.includes(n.id) ? referenceArrow(`M${x(parent)} ${nodeY.get(parent.id)!+22} H${x(parent)-12} V${nodeY.get(n.id)!+22} H${x(n)}`,id,n.id===s.focus) : '';
  }).join('')}${s.nodes.map(n=>`<g class="spatial-tree-node status-${n.status} ${n.id===selected?'selected':''}" ${attrs(n.id,`${n.label}, ${n.status}. Parent ${n.parent??'none'}. Items ${n.items.join(', ')||'none'}. ${n.detail}`,selected)}><rect x="${x(n)}" y="${nodeY.get(n.id)}" width="${448-x(n)}" height="44" rx="4"/><text x="${x(n)+9}" y="${nodeY.get(n.id)!+18}">${esc(n.label)} ${glyph[n.status]} ${esc(n.status)}</text><text class="spatial-node-detail" x="${x(n)+9}" y="${nodeY.get(n.id)!+34}">${esc(`parent ${n.parent??'∅'} · ${n.children.length} children · items ${n.items.join(', ')||'∅'}`)}</text></g>`).join('')}</svg></div>`;
}
function table(s:SpatialState, selected:string|null, id:string):string {
  if (!s.table.columns.length) return '';
  return `<div class="spatial-table-scroll" tabindex="0" role="region" aria-label="${id.endsWith('-preview')?'Mental model':'Operation lab'} spatial algorithm records"><table><caption>${esc(s.table.caption)}</caption><thead><tr>${s.table.columns.map(c=>`<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${s.table.rows.map(row=>`<tr class="status-${row.status}">${row.values.map((v,i)=>`<td>${i===0?button(row.id,v,selected):esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
export function drawSpatial(s:SpatialState,id:string,view:'logical'|'memory',selected:string|null):string {
  return `<div class="spatial-scene"><p class="spatial-focus">${esc(s.currentRegion ? `Current cell: ${formatBounds(s.currentRegion)}` : s.focus ? `Current reference: ${s.focus}` : 'No current reference')} · ${s.dimension}D</p>${view==='logical'?projection(s,'xy',selected)+(s.dimension===3?projection(s,'xz',selected):''):hierarchy(s,id,selected)+`<div class="spatial-table-scroll" tabindex="0" role="region" aria-label="Spatial object records"><table><caption>Object storage · stable IDs, not byte offsets</caption><thead><tr><th scope="col">Object</th><th scope="col">Coordinates / closed bounds</th><th scope="col">State</th></tr></thead><tbody>${s.objects.map(o=>`<tr class="status-${o.status}"><td>${button(o.id,o.label,selected)}</td><td>${esc(o.point?formatPoint(o.point):formatBounds(o.bounds))}</td><td>${glyph[o.status]} ${o.status}</td></tr>`).join('')}</tbody></table></div>`}${table(s,selected,id)}<p class="spatial-result">${esc(s.result || 'Choose Next to follow the operation.')}</p>${s.kind==='broad-phase'?`<p class="spatial-pair-summary">Candidates: ${esc(s.candidatePairs.map(p=>p.join('–')).join(', ')||'none')}. Exact AABB overlaps: ${esc(s.exactPairs.map(p=>p.join('–')).join(', ')||'none')}. Shape contact still needs narrow phase.</p>`:''}<ul class="spatial-legend" aria-label="Spatial state legend"><li>＋ blue: query</li>${(['current','visited','pruned','candidate','accepted'] as SpatialStatus[]).map(status=>`<li class="status-${status}">${glyph[status]} ${status}</li>`).join('')}</ul></div>`;
}
export function describeSpatial(s: SpatialState): string {
  return `${s.dimension}D ${s.kind}; ${s.operation}. Query: ${s.query?formatBounds(s.query):s.queryPoint?formatPoint(s.queryPoint):'none'}. Current: ${s.focus||'none'}${s.currentRegion ? `; cell ${formatBounds(s.currentRegion)}` : ''}.\nObjects: ${s.objects.map(o=>`${o.id} ${o.point?formatPoint(o.point):formatBounds(o.bounds)} ${o.status}`).join('; ')||'empty'}.\nNodes: ${s.nodes.map(n=>`${n.id} parent=${n.parent??'none'} children=[${n.children.join(',')}] items=[${n.items.join(',')}] ${n.status}`).join('; ')||'empty'}.\nResults: ${s.resultIds.join(', ')||'none'}. Candidates: ${s.candidatePairs.map(p=>p.join('–')).join(', ')||'none'}. Exact AABB pairs: ${s.exactPairs.map(p=>p.join('–')).join(', ')||'none'}. ${s.result}`;
}
export function inspectSpatial(s:SpatialState, selected:string|null):string {
  const node=s.nodes.find(n=>n.id===selected),object=s.objects.find(o=>o.id===selected),row=s.table.rows.find(r=>r.id===selected);
  let title='Inspect a spatial object',fields:[string,string][]=[['Interaction','Select an object or region with Enter, Space or tap.'],['Bounds','Closed queries include touching boundaries.'],['View',s.dimension===3?'XY and XZ projections share one real 3D model.':'World coordinates are independent of storage order.']];
  if(node){ title=node.label; fields=[['State',`${glyph[node.status]} ${node.status}`],['Bounds',formatBounds(node.bounds)],['Parent',node.parent??'none'],['Children',node.children.join(', ')||'none'],['Stored objects',node.items.join(', ')||'none'],['Depth',String(node.depth)],['Policy',node.detail]]; if(node.axis)fields.push(['Split',`${node.axis} = ${node.split}`]); }
  else if(object){ title=`Object ${object.label}`; fields=[['State',`${glyph[object.status]} ${object.status}`],[object.point?'Point':'Bounds',object.point?formatPoint(object.point):formatBounds(object.bounds)],['Policy',object.detail]]; }
  else if(selected==='query'&&s.query){title='Query range';fields=[['Closed bounds',formatBounds(s.query)],['Predicate','Intersection / containment includes touching boundaries.']];}
  else if(selected==='query-point'&&s.queryPoint){title='Query point';fields=[['Coordinates',formatPoint(s.queryPoint)],['Distance','Compare squared distances; no square root needed.']];}
  else if(selected==='current-region'&&s.currentRegion){title='Current query cell';fields=[['Bounds',formatBounds(s.currentRegion)],['Membership','A query can visit a cell even when it has no stored record.']];}
  else if(row){title=s.table.caption;fields=s.table.columns.map((c,i)=>[c,row.values[i]??'']);}
  return `<span class="eyebrow">SPATIAL INSPECTOR</span><h4>${esc(title)}</h4><dl>${fields.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${node?.parent?button(node.parent,`Inspect parent ${node.parent}`,selected):''}${node?.children.map(c=>button(c,`Inspect child ${c}`,selected)).join('')??''}`;
}
