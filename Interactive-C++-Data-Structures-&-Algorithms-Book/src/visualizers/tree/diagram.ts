import {
  arrowDefinitions,
  escapeHtml as esc,
  referenceArrow,
} from '../../components/visualizers/primitives';
import { layoutTree, treeLinkPath } from './layout';
import type { TreeScene } from './types';

const referencesOf = (scene: TreeScene): Record<string, string | null> =>
  'root_' in scene.references || 'root' in scene.references
    ? scene.references
    : { root: scene.root, ...scene.references };

export function describeTree(scene: TreeScene): string {
  const nodes = scene.nodes.map((node) =>
    node.lifetime !== 'live'
      ? `${node.address}: ${node.lifetime}; fields unavailable`
      : `${node.address} ${node.label}: ${node.fields.map((f) => `${f.name}=${f.value}`).join(', ')}; ${node.links.map((link) => `${link.name} → ${link.target ?? 'nullptr'}`).join(', ')}`,
  );
  return [
    `root → ${scene.root ?? 'nullptr'}`,
    ...nodes,
    ...scene.auxiliary.map((a) => `${a.label}: [${a.entries.join(', ')}]`),
    `output: [${scene.output.join(', ')}]`,
    scene.result,
  ]
    .filter(Boolean)
    .join('\n');
}

export function drawTree(
  scene: TreeScene,
  id: string,
  view: 'logical' | 'memory',
  selected: string | null,
): string {
  const layout = layoutTree(scene, view);
  const selectedSubtree = new Set<string>();
  const nodes = new Map(scene.nodes.map((node) => [node.address, node]));
  const stack = selected ? [selected] : [];
  while (stack.length) {
    const address = stack.pop()!;
    if (selectedSubtree.has(address)) continue;
    selectedSubtree.add(address);
    const node = nodes.get(address);
    if (node?.lifetime === 'live')
      for (const link of node.links)
        if (link.structural && link.target) stack.push(link.target);
  }
  let edgeIndex = 0;
  const edges = scene.nodes
    .filter((node) => node.lifetime === 'live')
    .flatMap((node) =>
      node.links.flatMap((link) => {
        if (!link.target) return [];
        const path = treeLinkPath(
          layout,
          node.address,
          link.target,
          link.name,
          edgeIndex++,
        );
        if (!path) return [];
        const label = `${node.label}.${link.name}: ${node.address} → ${link.target}`;
        const targetBox = layout.boxes.get(link.target)!;
        const edgeLabel = link.structural
          ? `<text class="tree-edge-label" x="${targetBox.x + targetBox.width / 2 + 14}" y="${targetBox.y - 12}">${esc(link.name)}</text>`
          : '';
        return [
          `<g class="pointer-link tree-link ${link.structural ? '' : 'secondary-link'}" data-from="${esc(node.address)}" data-target="${esc(link.target)}" data-field="${esc(link.name)}" role="button" tabindex="0" aria-label="Follow ${esc(label)}"><title>${esc(label)}</title>${referenceArrow(path, id, scene.active === node.address)}<path class="arrow-hit-area" d="${path}"/>${edgeLabel}</g>`,
        ];
      }),
    )
    .join('');
  const drawing = scene.nodes
    .map((node) => {
      const box = layout.boxes.get(node.address)!;
      const { x, y, width, height } = box,
        cx = x + width / 2;
      const live = node.lifetime === 'live';
      const refs = Object.entries(referencesOf(scene))
        .filter(([, target]) => target === node.address)
        .map(([name]) => name);
      const relationships = node.links
        .filter((link) => link.structural)
        .map((link) => `${link.name}${link.target ? ' ↓' : ': ∅'}`)
        .join(' · ');
      const badge =
        node.badge ??
        (node.tone ? `${node.tone.toUpperCase()}` : refs.join(' · '));
      return `<g class="data-node tree-node ${node.lifetime} ${node.tone ? `tree-${node.tone}` : ''} ${selected === node.address ? 'selected' : ''} ${selectedSubtree.has(node.address) ? 'in-selected-subtree' : ''} ${scene.active === node.address ? 'active-node' : ''} ${scene.visited.includes(node.address) ? 'visited-node' : ''}" data-node="${esc(node.address)}" role="button" tabindex="0" aria-pressed="${selected === node.address}" aria-label="Inspect ${live ? esc(node.label) : node.lifetime + ' storage'} at ${esc(node.address)}"><title>${esc(live ? `${node.label}. ${refs.join(', ')}. ${relationships}` : `${node.lifetime}; no readable fields`)}</title><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="5"/>${live ? `<text class="node-value" x="${cx}" y="${y + 29}" text-anchor="middle">${esc(node.label)}</text><text class="tree-badge" x="${cx}" y="${y + 47}" text-anchor="middle">${esc(badge)}</text><text class="field-label" x="${cx}" y="${y + 66}" text-anchor="middle">${esc(relationships.length > Math.floor(width / 6) ? `${node.links.filter((l) => l.structural).length} child fields · inspect` : relationships)}</text>` : `<text class="lifetime-label" x="${cx}" y="${y + 32}" text-anchor="middle">${node.lifetime.toUpperCase()}</text><text class="field-label" x="${cx}" y="${y + 57}" text-anchor="middle">fields unavailable</text>`}<text class="memory-address" x="${cx}" y="${y + 85}" text-anchor="middle">${esc(node.address)}</text></g>`;
    })
    .join('');
  const references = Object.entries(referencesOf(scene))
    .map(
      ([name, target]) =>
        `<span><code>${esc(name)}</code> → <button type="button" data-inspect="${esc(target ?? '')}" ${target ? '' : 'disabled'}>${esc(target ?? 'nullptr')}</button></span>`,
    )
    .join('');
  const auxiliary = scene.auxiliary
    .map(
      (item) =>
        `<div><strong>${esc(item.label)}</strong><ol>${item.entries.map((entry) => `<li>${esc(entry)}</li>`).join('') || '<li class="empty-auxiliary">empty</li>'}</ol></div>`,
    )
    .join('');
  return `<div class="tree-state-strip" aria-label="References in scope">${references}</div><svg class="memory-diagram tree-diagram" data-tree-root="${esc(scene.root ?? '')}" viewBox="0 0 ${layout.width} ${layout.height}" style="min-width:${layout.width}px" role="group" aria-label="${view === 'logical' ? 'Tree hierarchy' : 'Separate allocations sorted by teaching address'}">${arrowDefinitions(id)}<text class="memory-address" x="36" y="27">${view === 'logical' ? 'Ordered child links · select a node to highlight its subtree' : 'One object per allocation · spacing is not a byte offset'}</text>${edges}${drawing}${!scene.nodes.length ? '<text class="empty-note" x="36" y="100">Empty tree · root = nullptr</text>' : ''}</svg><div class="tree-auxiliary" aria-label="Algorithm auxiliary state">${auxiliary}<div class="tree-output"><strong>Output</strong><p>${esc(scene.output.length ? scene.output.join(' → ') : 'No values emitted yet.')}</p></div>${scene.result ? `<p class="tree-result">${esc(scene.result)}</p>` : ''}</div>`;
}

export function inspectTree(scene: TreeScene, selected: string | null): string {
  const node = scene.nodes.find((n) => n.address === selected);
  const reference = (target: string | null): string => {
    const object = scene.nodes.find((n) => n.address === target);
    const dangling = target !== null && object?.lifetime !== 'live';
    return `<button type="button" data-inspect="${esc(target ?? '')}" ${target ? '' : 'disabled'} class="${dangling ? 'dangling' : ''}">${esc(target ?? 'nullptr')}${dangling ? ' · ended or unavailable' : target ? ' ↗' : ''}</button>`;
  };
  return `<div class="inspector-heading"><span class="eyebrow">Tree inspector</span><span class="small-label">${node?.lifetime ?? 'Select a node'}</span></div>${node ? `<h4>${node.lifetime === 'live' ? esc(node.label) : 'Ended or unconstructed storage'}</h4><div class="inspect-address">${esc(node.address)}</div>${node.lifetime === 'live' ? `<dl class="node-fields">${node.fields.map((field) => `<div><dt>${esc(field.name)}</dt><dd>${esc(field.value)}</dd></div>`).join('')}${node.links.map((link) => `<div><dt>${esc(link.name)}</dt><dd>${reference(link.target)}</dd></div>`).join('')}</dl>` : '<p class="lifetime-warning">No live object fields are available. Reading them would be undefined behavior.</p>'}` : '<p>Select a node or follow a link. Its subtree is highlighted; fields come from this chapter’s actual C++ representation.</p>'}<div class="reference-list"><span class="eyebrow">References in scope</span>${Object.entries(
    referencesOf(scene),
  )
    .map(
      ([name, target]) =>
        `<div class="reference-entry"><code>${esc(name)}</code>${reference(target)}</div>`,
    )
    .join('')}</div>`;
}
