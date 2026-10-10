import { arrowDefinitions, escapeHtml as esc, referenceArrow } from '../../components/visualizers/primitives';
import type { TechniqueState, TechniqueStatus } from './types';

const statusLabel = (status: TechniqueStatus) => status === 'rejected' ? 'rejected / pruned' : status;
const button = (id: string, text: string, selected: string | null, className = '') => `<button type="button" class="${className}" data-inspect="${esc(id)}" aria-pressed="${selected === id}">${esc(text)}</button>`;

function stack(s: TechniqueState, selected: string | null): string {
  return `<section class="technique-stack" aria-label="Conceptual call stack"><h4>Call stack <span>top first · ${s.frames.length} active</span></h4>${s.frames.length ? `<ol>${[...s.frames].reverse().map((frame, i) => `<li class="${i === 0 ? 'technique-top-frame' : ''}">${button(`frame:${frame.id}`, `${frame.function}(${frame.arguments})`, selected)}<dl><div><dt>Retained locals</dt><dd>${esc(frame.locals || 'none')}</dd></div><div><dt>Resume at</dt><dd>${esc(frame.resume)}</dd></div><div><dt>Return</dt><dd>${esc(frame.returned ?? 'pending')}</dd></div></dl></li>`).join('')}</ol>` : '<p>No active calls. No machine addresses are implied.</p>'}</section>`;
}

function tree(s: TechniqueState, id: string, selected: string | null): string {
  if (!s.nodes.length) return '';
  const width = Math.max(380, ...s.nodes.map(n => n.x + 180));
  const height = Math.max(130, ...s.nodes.map(n => n.y + 96));
  const links = s.nodes.flatMap(node => {
    const parent = s.nodes.find(n => n.id === node.parent);
    if (!parent) return [];
    const x1 = parent.x + 78, y1 = parent.y + 72, x2 = node.x + 78, y2 = node.y;
    const path = s.kind === 'backtracking'
      ? `M${parent.x + 156} ${parent.y + 36} H${parent.x + 170} V${node.y + 36} H${node.x}`
      : `M${x1} ${y1} C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}`;
    return referenceArrow(path, id, node.status === 'current');
  }).join('');
  const extraLinks = s.dependencies.flatMap(dep => {
    const from = s.nodes.find(n => n.id === dep.from), to = s.nodes.find(n => n.id === dep.to);
    if (!from || !to || to.parent === from.id) return [];
    const path = from.x === to.x
      ? `M${from.x + 156} ${from.y + 36} H${from.x + 172} V${to.y + 36} H${to.x + 156}`
      : `M${from.x + 156} ${from.y + 36} L${to.x} ${to.y + 36}`;
    return `<g><title>${esc(dep.label)}</title>${referenceArrow(path, id)}</g>`;
  }).join('');
  return `<section class="technique-tree"><h4>Calls / decisions <span>select a state to inspect</span></h4><div class="technique-tree-scroll" tabindex="0" role="region" aria-label="Scrollable call and decision tree"><svg class="technique-tree-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-label="Algorithm state tree">${arrowDefinitions(id)}${links}${extraLinks}${s.nodes.map(n => `<g class="technique-node status-${n.status} ${selected === `tree:${n.id}` ? 'selected' : ''}" data-node="tree:${esc(n.id)}" role="button" tabindex="0" aria-pressed="${selected === `tree:${n.id}`}" aria-label="${esc(`${n.label}: ${statusLabel(n.status)}. ${n.detail}`)}"><title>${esc(n.detail)}</title><rect x="${n.x}" y="${n.y}" width="156" height="72" rx="5"/><text x="${n.x + 10}" y="${n.y + 24}" class="technique-node-label">${esc(n.label)}</text><text x="${n.x + 10}" y="${n.y + 46}" class="technique-node-status">${esc(statusLabel(n.status))}</text></g>`).join('')}</svg></div></section>`;
}

function cells(s: TechniqueState, selected: string | null): string {
  if (!s.cells.length) return '';
  return `<section class="technique-cells"><h4>Subproblem / array states</h4><div class="technique-table-scroll" tabindex="0" role="region" aria-label="Scrollable state table"><table><caption>Each cell exposes its state, value, and validity.</caption><thead><tr><th scope="col">State</th>${s.cells.map(c => `<th scope="col">${esc(c.label)}</th>`).join('')}</tr></thead><tbody><tr><th scope="row">Value</th>${s.cells.map(c => `<td class="status-${c.status}">${button(`cell:${c.id}`, c.value, selected)}</td>`).join('')}</tr><tr><th scope="row">Status</th>${s.cells.map(c => `<td class="status-${c.status}">${esc(statusLabel(c.status))}</td>`).join('')}</tr></tbody></table></div></section>`;
}

function table(s: TechniqueState, selected: string | null): string {
  if (!s.table.columns.length) return '';
  return `<div class="technique-table-scroll" tabindex="0" role="region" aria-label="Scrollable execution details"><table><caption>${esc(s.table.caption)}</caption><thead><tr>${s.table.columns.map(c => `<th scope="col">${esc(c)}</th>`).join('')}<th scope="col">Status</th></tr></thead><tbody>${s.table.rows.map(row => `<tr class="status-${row.status}">${row.values.map((v, i) => i === 0 ? `<th scope="row">${button(`row:${row.id}`, v, selected)}</th>` : `<td>${esc(v)}</td>`).join('')}<td>${esc(statusLabel(row.status))}</td></tr>`).join('')}</tbody></table></div>`;
}

function dependencies(s: TechniqueState, selected: string | null): string {
  if (!s.dependencies.length) return '';
  const ref = (id: string) => {
    const cell = s.cells.find(c => c.id === id), node = s.nodes.find(n => n.id === id);
    return button(`${cell ? 'cell' : 'tree'}:${id}`, cell?.label ?? node?.label ?? id, selected);
  };
  return `<div class="technique-dependencies"><h4>Dependencies / transitions</h4><ul>${s.dependencies.map(d => `<li>${ref(d.from)} <span aria-label="to">→</span> ${ref(d.to)} <span>${esc(d.label)}</span></li>`).join('')}</ul></div>`;
}

export function drawTechnique(s: TechniqueState, id: string, view: 'logical' | 'memory', selected: string | null): string {
  const active = s.nodes.find(n => n.id === s.focus)?.label ?? s.cells.find(c => c.id === s.focus)?.label;
  const focus = active ? `Current state: ${active}` : 'Load inputs, then step through the algorithm.';
  const context = id.endsWith('-preview') ? 'Mental model' : 'Execution';
  const content = `${view === 'logical' ? tree(s, id, selected) + stack(s, selected) + cells(s, selected) : stack(s, selected) + cells(s, selected) + tree(s, id, selected)}${dependencies(s, selected)}${table(s, selected)}`;
  // The chapter contains both a preview and lab; their landmarks must be distinct.
  const namedContent = content.replace(/aria-label="(Conceptual call stack|Scrollable [^"]+)"/g, (_, label: string) => `aria-label="${context}: ${label}"`);
  return `<div class="technique-scene"><p class="technique-focus">${esc(focus)}</p>${namedContent}${s.result ? `<p class="technique-result"><strong>Result</strong> ${esc(s.result)}</p>` : ''}</div>`;
}

export function inspectTechnique(s: TechniqueState, selected: string | null): string {
  let title = 'Inspect an algorithm state', fields: [string, string][] = [['Model', 'Conceptual calls and container indices; no ABI byte layout.']];
  if (selected) {
    const [kind, ...parts] = selected.split(':'), id = parts.join(':');
    const f = s.frames.find(f => f.id === id), n = s.nodes.find(n => n.id === id), c = s.cells.find(c => c.id === id), r = s.table.rows.find(r => r.id === id);
    if (kind === 'frame' && f) { title = `${f.function}(${f.arguments})`; fields = [['Arguments', f.arguments], ['Locals retained', f.locals], ['Resume / return address', f.resume], ['Return value', f.returned ?? 'pending']]; }
    else if (kind === 'tree' && n) { title = n.label; fields = [['Status', statusLabel(n.status)], ['State', n.detail], ['Parent', n.parent ?? 'root']]; }
    else if (kind === 'cell' && c) { title = c.label; fields = [['Value', c.value], ['Status', statusLabel(c.status)], ['Meaning', c.detail]]; }
    else if (kind === 'row' && r) { title = s.table.caption; fields = s.table.columns.map((c, i) => [c, r.values[i] ?? '']); fields.push(['Status', statusLabel(r.status)]); }
    else { title = 'State no longer active'; fields = [['Selection', 'This frame or state is absent at this execution step. Step forward or select another state.']]; }
  }
  return `<h4>${esc(title)}</h4><dl>${fields.map(([key, value]) => `<dt>${esc(key)}</dt><dd>${esc(value)}</dd>`).join('')}</dl>`;
}

export function describeTechnique(s: TechniqueState): string {
  return [s.focus, `Stack (bottom → top): ${s.frames.map(f => `${f.function}(${f.arguments}); ${f.locals}; resume=${f.resume}; return=${f.returned ?? 'pending'}`).join(' | ') || 'empty'}`, ...s.nodes.map(n => `${n.label}: ${n.status}; ${n.detail}`), ...s.cells.map(c => `${c.label}=${c.value} (${c.status})`), ...s.dependencies.map(d => `${d.from} → ${d.to}: ${d.label}`), ...s.table.rows.map(r => `${r.values.join(' | ')}: ${r.status}`), s.result].filter(Boolean).join('\n');
}
