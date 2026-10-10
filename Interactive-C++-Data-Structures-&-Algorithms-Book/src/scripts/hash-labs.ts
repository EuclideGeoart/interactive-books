import '../styles/hashing.css';
import { mountTraceLab } from './trace-lab';
import { InspectionDiagram } from './inspection-diagram';
import type { LabAdapter } from '../components/controls/lab-types';
import { hashFundamentalsAdapter } from '../visualizers/hash-fundamentals/adapter';
import { hashTableAdapter } from '../visualizers/hash-table/adapter';
import { chainingAdapter } from '../visualizers/chaining/adapter';
import { openAddressingAdapter } from '../visualizers/open-addressing/adapter';
import { robinHoodAdapter } from '../visualizers/robin-hood/adapter';
import { unorderedMapAdapter } from '../visualizers/unordered-map/adapter';

function navigateHash(root: HTMLElement): void {
  const canvas = root.querySelector<HTMLElement>('[data-svg]')!;
  function separatePanels(): void {
    for (const selector of ['.hash-state-strip', '.hash-result']) {
      const panel = canvas.querySelector<HTMLElement>(`:scope > ${selector}`);
      if (!panel) continue;
      canvas.parentElement!.querySelector(`:scope > ${selector}`)?.remove();
      if (selector === '.hash-state-strip') canvas.before(panel);
      else canvas.after(panel);
    }
  }
  separatePanels();
  function reveal(node: Element | null): void {
    if (!node) return;
    const rect = node.getBoundingClientRect(), box = canvas.getBoundingClientRect();
    if (rect.left < box.left + 8 || rect.right > box.right - 8)
      canvas.scrollLeft += rect.left + rect.width / 2 - box.left - box.width / 2;
    if (rect.top < box.top + 8 || rect.bottom > box.bottom - 8)
      canvas.scrollTop += rect.top + rect.height / 2 - box.top - box.height / 2;
  }
  canvas.addEventListener('keydown', event => {
    if (!(event.target instanceof Element) || !event.target.matches('[data-node]')) return;
    const nodes = [...canvas.querySelectorAll<SVGElement>('[data-node]')];
    const index = nodes.indexOf(event.target as SVGElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? nodes.length - 1
      : ['ArrowRight', 'ArrowDown'].includes(event.key) ? Math.min(nodes.length - 1, index + 1)
      : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? Math.max(0, index - 1) : null;
    if (next === null) return;
    event.preventDefault();
    nodes[next]?.focus({ preventScroll: true });
    reveal(nodes[next] ?? null);
  });
  canvas.addEventListener('focusin', event => reveal(event.target as Element));
  let frame = 0, lastStep = root.dataset.step;
  new MutationObserver(() => {
    separatePanels();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const changed = root.dataset.step !== lastStep;
      lastStep = root.dataset.step;
      const selected = canvas.querySelector('[data-node][aria-pressed="true"]');
      reveal((changed ? canvas.querySelector('.active-node') : selected) ?? canvas.querySelector('.active-node'));
    });
  }).observe(canvas, { childList: true });
}

export function mountHashLab<S, E extends { type: string }>(root: HTMLElement, adapter: LabAdapter<S, E>): void {
  mountTraceLab(root, adapter);
  navigateHash(root);
}

function mount<S, E extends { type: string }>(key: string, adapter: LabAdapter<S, E>): void {
  for (const root of document.querySelectorAll<HTMLElement>(`[data-chapter-lab="${key}"]`)) {
    mountHashLab(root, adapter);
  }
  for (const root of document.querySelectorAll<HTMLElement>(`[data-structure-preview="${key}"]`)) {
    const inputs = new FormData();
    for (const [name, value] of Object.entries(JSON.parse(root.dataset.previewInputs || '{}') as Record<string, string>)) inputs.set(name, value);
    const trace = adapter.build(root.dataset.previewOperation!, inputs);
    new InspectionDiagram(root, adapter, trace.initial, root.dataset.previewId!);
    navigateHash(root);
  }
}
mount('hash-fundamentals', hashFundamentalsAdapter);
mount('hash-table', hashTableAdapter);
mount('chaining', chainingAdapter);
mount('open-addressing', openAddressingAdapter);
mount('robin-hood', robinHoodAdapter);
mount('unordered-map', unorderedMapAdapter);
