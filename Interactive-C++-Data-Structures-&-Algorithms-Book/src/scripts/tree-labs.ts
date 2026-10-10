import '../styles/trees.css';
import { mountTraceLab } from './trace-lab';
import { InspectionDiagram } from './inspection-diagram';
import type { LabAdapter } from '../components/controls/lab-types';
import { binaryTreeAdapter } from '../visualizers/binary-tree/adapter';
import { bstAdapter } from '../visualizers/bst/adapter';
import { traversalAdapter } from '../visualizers/traversal/adapter';
import { treeMutationAdapter } from '../visualizers/tree-mutation/adapter';
import { avlAdapter } from '../visualizers/avl/adapter';
import { redBlackAdapter } from '../visualizers/red-black/adapter';
import { bTreeAdapter } from '../visualizers/b-tree/adapter';
import { trieAdapter } from '../visualizers/trie/adapter';

// Follow an off-screen active/selected node inside the diagram only. Book scroll
// stays where the reader placed it, and manual panning remains available.
function followTree(root: HTMLElement): void {
  const canvas = root.querySelector<HTMLElement>('[data-svg]')!;
  let lastStep = root.dataset.step,
    frame = 0;
  function separatePanels(): void {
    const parent = canvas.parentElement!;
    for (const selector of ['.tree-state-strip', '.tree-auxiliary']) {
      const panel = canvas.querySelector<HTMLElement>(`:scope > ${selector}`);
      if (!panel) continue;
      const oldPanel = parent.querySelector(`:scope > ${selector}`);
      const focused = oldPanel?.contains(document.activeElement)
        ? (document.activeElement as HTMLElement).dataset.inspect
        : undefined;
      oldPanel?.remove();
      if (selector === '.tree-state-strip') canvas.before(panel);
      else canvas.after(panel);
      if (focused !== undefined)
        [...panel.querySelectorAll<HTMLElement>('[data-inspect]')]
          .find((button) => button.dataset.inspect === focused)
          ?.focus({ preventScroll: true });
    }
  }
  separatePanels();
  function reveal(): void {
    const svg = canvas.querySelector<SVGSVGElement>('svg');
    if (!svg) return;
    const changed = root.dataset.step !== lastStep;
    lastStep = root.dataset.step;
    const selected = canvas.querySelector<SVGGElement>(
      '[data-node][aria-pressed="true"]',
    );
    const active = canvas.querySelector<SVGGElement>('.active-node');
    const entry = [...canvas.querySelectorAll<SVGGElement>('[data-node]')].find(
      (node) => node.dataset.node === svg.dataset.treeRoot,
    );
    const target = (changed ? active : selected) ?? entry;
    if (!target) return;
    const rect = target.getBoundingClientRect(),
      viewport = canvas.getBoundingClientRect();
    if (rect.left < viewport.left + 8 || rect.right > viewport.right - 8)
      canvas.scrollLeft +=
        rect.left + rect.width / 2 - viewport.left - viewport.width / 2;
    if (rect.top < viewport.top + 8 || rect.bottom > viewport.bottom - 8)
      canvas.scrollTop +=
        rect.top + rect.height / 2 - viewport.top - viewport.height / 2;
  }
  new MutationObserver(() => {
    separatePanels();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(reveal);
  }).observe(canvas, { childList: true });
  requestAnimationFrame(reveal);
}

function mount<S, E extends { type: string }>(
  key: string,
  adapter: LabAdapter<S, E>,
): void {
  for (const root of document.querySelectorAll<HTMLElement>(
    `[data-chapter-lab="${key}"]`,
  )) {
    mountTraceLab(root, adapter);
    followTree(root);
  }
  for (const root of document.querySelectorAll<HTMLElement>(
    `[data-structure-preview="${key}"]`,
  )) {
    const inputs = new FormData();
    for (const [name, value] of Object.entries(
      JSON.parse(root.dataset.previewInputs || '{}') as Record<string, string>,
    ))
      inputs.set(name, value);
    const trace = adapter.build(root.dataset.previewOperation!, inputs);
    new InspectionDiagram(
      root,
      adapter,
      trace.initial,
      root.dataset.previewId!,
    );
    followTree(root);
  }
}
mount('binary-tree', binaryTreeAdapter);
mount('bst', bstAdapter);
mount('traversal', traversalAdapter);
mount('tree-mutation', treeMutationAdapter);
mount('avl', avlAdapter);
mount('red-black', redBlackAdapter);
mount('b-tree', bTreeAdapter);
mount('trie', trieAdapter);
for (const root of document.querySelectorAll<HTMLElement>(
  '[data-foundation-break], [data-rb-break]',
))
  followTree(root);
