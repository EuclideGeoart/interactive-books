import { arrowDefinitions, referenceArrow, escapeHtml as esc } from '../../components/visualizers/primitives';
import { member, type OrganizationState } from './types';
interface Cell { id: string; label: string; value: string; detail: string; status: string }
interface Row { title: string; cells: Cell[] }
const cell = (id: string, label: string, value: unknown, detail: string, status = 'live'): Cell => ({ id, label, value: String(value), detail, status });
const handle = (index: number, generation: number) => `{${index},${generation}}`;
const commandName = (kind: number) => ['Create', 'Move', 'Delete'][kind] ?? 'Invalid';
const reportName = (code: number) => ['success', 'STALE HANDLE', 'world full', 'overflow'][code] ?? 'unknown';
function rows(s: OrganizationState, memory: boolean): Row[] {
  if (s.kind === 'sparse') {
    const dense = { title: 'Dense vector · positions remain fixed; values may move', cells: Array.from({ length: 16 }, (_, i) => cell(`dense:${i}`, `dense[${i}]`, s.dense[i] ?? 'outside size', i < s.dense.length ? `ID ${s.dense[i]}; sparse[ID]=${s.sparse[s.dense[i]!]}. Dense size=${s.dense.length}.` : 'Reserved capacity is not a live vector element. No value may be read here.', i >= s.dense.length ? 'empty' : s.index === i ? 'active' : 'live')) };
    const sparse = { title: 'Sparse index · metadata exists for every ID in the domain', cells: s.sparse.map((v, id) => cell(`sparse:${id}`, `ID ${id}`, `index ${v}`, `Round-trip membership: ${member(s, id)}. An absent ID may retain stale metadata.`, id === s.active ? 'active' : member(s, id) ? 'live' : 'empty')) };
    return memory ? [sparse, dense] : [dense, sparse];
  }
  if (s.kind === 'ecs') {
    const identity = { title: 'Entity slots · identity metadata, not component ownership', cells: s.slots.map((slot, id) => cell(`entity:${id}`, `E${id} · gen ${slot.generation}`, slot.alive ? 'LIVE ID' : slot.generation >= 65535 ? 'RETIRED' : 'FREE SLOT', slot.alive ? `Handle ${handle(id, slot.generation)}; Position=${member(s.position, id)}, Velocity=${member(s.velocity, id)}.` : 'No live entity or component fields. Generation metadata remains available.', s.active === id ? 'active' : slot.alive ? 'live' : 'empty')) };
    const pools = [s.position, s.velocity].map((p, k) => ({ title: `${k ? 'Velocity' : 'Position'} · ${memory ? 'owned dense rows (ID + value)' : 'component membership by entity ID'}`, cells: Array.from({ length: 8 }, (_, i) => {
      const present = memory ? i < p.dense.length : member(p, i), entity = memory ? p.dense[i] : i, index = memory ? i : p.sparse[i]!;
      return cell(`pool${k}:${memory ? 'dense' : 'id'}:${i}`, memory ? `row ${i}` : `E${i}`, present ? `E${entity}: ${p.values[index]}` : 'NO COMPONENT', present ? `Owned value=${p.values[index]}; dense index=${index}; sparse[${entity}]=${p.sparse[entity!]}.` : 'No component object exists here. Reserved storage is not readable data.', present && entity === s.active ? 'active' : present ? 'live' : 'empty');
    }) }));
    if (memory) pools.push(...[s.position, s.velocity].map((p, k) => ({ title: `${k ? 'Velocity' : 'Position'} sparse inverse indices`, cells: p.sparse.map((v, id) => cell(`map${k}:${id}`, `E${id}`, v, `Membership round-trip=${member(p, id)}.`, member(p, id) ? 'live' : 'empty')) })));
    return [identity, ...pools];
  }
  if (s.kind === 'dirty') {
    const queues = [s.current, s.next].map((queue, k) => ({ title: `${k ? 'NEXT · marks during processing' : `CURRENT · cursor ${s.cursor} / ${s.current.length}`} · wave ${s.wave}`, cells: Array.from({ length: Math.max(8, queue.length) }, (_, i) => cell(`${k ? 'next' : 'current'}:${i}`, `entry ${i}`, queue[i] === undefined ? 'empty' : `ID ${queue[i]}`, k ? 'Scheduled for a future wave. Never appended to the current traversal.' : i < s.cursor ? 'Processed in this wave; membership stays set until the boundary.' : 'Pending current-wave entry.', queue[i] === undefined ? 'empty' : !k && i === s.cursor && s.processing ? 'active' : 'live')) }));
    if (memory) queues.push(...[s.current_flags, s.next_flags].map((flags, k) => ({ title: `${k ? 'NEXT' : 'CURRENT'} membership flags · separate per-wave storage`, cells: flags.map((flag, id) => cell(`flag${k}:${id}`, `ID ${id}`, flag ? 'SET' : 'clear', `This ID is${flag ? '' : ' not'} recorded in this wave.`, flag ? 'live' : 'empty')) })));
    return queues;
  }
  const world = { title: 'World slots · live values and retained generation metadata', cells: s.slots.map((slot, i) => cell(`world:${i}`, `slot ${i} · g${slot.generation}`, slot.value === null ? 'NO LIVE VALUE' : `value ${slot.value}`, slot.value === null ? 'Object lifetime ended or never began; generation metadata is still valid. No destroyed fields are read.' : `Live handle ${handle(i, slot.generation)}. Value owned by the world.`, slot.value === null ? 'empty' : 'live')) };
  const commands = { title: `Owned command records · ${s.flushing ? `executing index ${s.cursor}` : 'stable boundary'}`, cells: Array.from({ length: Math.max(8, s.commands.length) }, (_, i) => { const c = s.commands[i]; return cell(`command:${i}`, `command ${i}`, c ? commandName(c.kind) : 'empty', c ? `${commandName(c.kind)} target=${handle(c.target.index, c.target.generation)}; owned payload=${c.value}. ${i < s.cursor ? 'Already attempted.' : 'Pending execution.'}` : 'No command record in this vector position.', c ? s.flushing && i === s.cursor ? 'active' : 'live' : 'empty'); }) };
  return memory ? [world, commands] : [commands, world];
}
export function describeOrganization(s: OrganizationState): string {
  const text = rows(s, true).map(r => `${r.title}: ${r.cells.map(c => `${c.label}=${c.value}`).join(' | ')}`).join('\n');
  return `${text}\n${s.kind === 'commands' ? s.reports.map(r => `command ${r.command}: ${reportName(r.code)}, handle=${handle(r.handle.index, r.handle.generation)}`).join('; ') : s.kind === 'dirty' ? `Processed this wave: ${s.processed.join(', ') || 'none'}; processing=${s.processing}; pending CURRENT=${s.current.length}.` : s.pending ? 'Private mutation: inverse mapping may be temporarily incomplete.' : 'Stable mutation boundary.'}`;
}
export function inspectOrganization(s: OrganizationState, selected: string | null): string {
  const c = [...rows(s, false), ...rows(s, true)].flatMap(r => r.cells).find(c => c.id === selected);
  return c ? `<h4>${esc(c.label)}</h4><dl><dt>State</dt><dd>${esc(c.value)}</dd><dt>Meaning</dt><dd>${esc(c.detail)}</dd><dt>Storage model</dt><dd>Indices and owned values; no native byte offsets or addresses implied.</dd></dl>` : '<h4>Inspect a slot or record</h4><p>Tap a cell or focus it and press Enter. The inspector distinguishes live data, identity metadata, and unused storage.</p>';
}
export function drawOrganization(s: OrganizationState, id: string, view: 'logical' | 'memory', selected: string | null): string {
  let y = 36;
  const geometry = new Map<string, { x: number; y: number }>();
  const bands = rows(s, view === 'memory').map(row => {
    const titleY = y; y += 18;
    const cells = row.cells.map((c, i) => {
      const x = 20 + (i % 8) * 122, cy = y + Math.floor(i / 8) * 80; geometry.set(c.id, { x, y: cy });
      return `<g class="organization-cell ${c.status} ${selected === c.id ? 'selected' : ''}" data-node="${esc(c.id)}" tabindex="0" role="button" aria-pressed="${selected === c.id}" aria-label="${esc(`${c.label}: ${c.value}. ${c.detail}`)}"><title>${esc(c.detail)}</title><rect x="${x}" y="${cy}" width="110" height="58" rx="5"/><text x="${x + 8}" y="${cy + 21}">${esc(c.label)}</text><text class="organization-value" x="${x + 8}" y="${cy + 43}">${esc(c.value)}</text></g>`;
    }).join('');
    y += Math.ceil(row.cells.length / 8) * 80 + 24;
    return `<text class="organization-band" x="20" y="${titleY}">${esc(row.title)}</text>${cells}`;
  }).join('');
  let links = '';
  if (s.kind === 'sparse' && s.active >= 0 && member(s, s.active)) {
    const a = geometry.get(`sparse:${s.active}`)!, b = geometry.get(`dense:${s.sparse[s.active]}`)!;
    links = referenceArrow(`M${a.x + 55} ${a.y + 58} V${a.y + 68} H1020 V${b.y - 10} H${b.x + 55} V${b.y}`, id, true);
  }
  const note = s.kind === 'sparse' ? `Dense size ${s.dense.length}; ${s.pending ? 'mutation in progress' : s.broken ? 'intentional corruption' : 'stable boundary'}. Active ID ${s.active}; last membership result ${s.found}.` : s.kind === 'ecs' ? 'Entity identity, component ownership, and iteration order are separate concerns.' : s.kind === 'dirty' ? `${s.processing ? 'PROCESSING: all marks → NEXT' : 'BOUNDARY: marks → CURRENT'}; processed this wave: ${s.processed.join(', ') || 'none'}.` : 'Owned payloads; execution validates handles; failures continue without rollback.';
  const report = s.kind === 'commands' ? `<div class="organization-table-scroll" tabindex="0" role="region" aria-label="${esc(id)} command results"><table><caption>Completed execution reports (retained after flush)</caption><thead><tr><th scope="col">Command</th><th scope="col">Outcome</th><th scope="col">Result / target handle</th></tr></thead><tbody>${s.reports.map(r => `<tr><th scope="row">${r.command}</th><td>${reportName(r.code)}</td><td>${handle(r.handle.index, r.handle.generation)}</td></tr>`).join('')}</tbody></table></div>` : '';
  return `<div class="organization-scene"><p class="organization-note">${esc(note)}</p><svg class="systems-diagram organization-diagram" width="1060" height="${y}" viewBox="0 0 1060 ${y}" aria-label="${esc(id)} ${view} state">${arrowDefinitions(id)}${bands}${links}</svg>${report}</div>`;
}
