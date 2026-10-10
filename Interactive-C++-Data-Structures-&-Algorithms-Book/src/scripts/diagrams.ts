import { asciiList } from '../visualizers/linked-list/topology';
import type { MemoryState, TraceEvent } from '../engine/types';
import { drawLinkedList } from '../visualizers/linked-list/diagram';
import { pointerInspector } from '../components/memory/inspector';
import { initialState } from '../visualizers/linked-list/model';

export class DiagramView {
  private state: MemoryState;
  private event?: TraceEvent;
  private view: 'logical' | 'memory' = 'logical';
  private selected: string | null = '0xD800';
  private id: string;
  constructor(private readonly root: HTMLElement, initial: MemoryState) {
    this.state = initial;
    this.id = root.dataset.diagramId!;
    const inspectorShell = root.querySelector<HTMLDetailsElement>('[data-inspector-shell]')!;
    if (matchMedia('(max-width: 560px)').matches) inspectorShell.open = false;
    root.addEventListener('click', event => {
      const target = event.target as Element;
      const view = target.closest<HTMLButtonElement>('[data-view]');
      if (view) { this.view = view.dataset.view as 'logical' | 'memory'; this.render(); }
      const node = target.closest<HTMLElement>('[data-node],[data-target],[data-inspect]');
      if (node) {
        const address = node.dataset.node ?? node.dataset.target ?? node.dataset.inspect;
        if (address) { this.selected = address; inspectorShell.open = true; this.render(); }
      }
    });
    root.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && (event.target as Element).matches('[data-node],[data-target]')) {
        event.preventDefault();
        const target = event.target as HTMLElement;
        this.selected = target.dataset.node ?? target.dataset.target ?? null;
        inspectorShell.open = true;
        this.render();
      }
    });
    const highlightLink = (target: EventTarget | null) => {
      const link = target instanceof Element ? target.closest<HTMLElement>('[data-from]') : null;
      root.querySelectorAll<HTMLElement>('[data-node]').forEach(node => {
        node.classList.toggle('link-endpoint', Boolean(link && [link.dataset.from, link.dataset.target].includes(node.dataset.node)));
      });
    };
    root.addEventListener('pointerover', event => highlightLink(event.target));
    root.addEventListener('pointerout', () => highlightLink(null));
    root.addEventListener('focusin', event => highlightLink(event.target));
    root.addEventListener('focusout', () => highlightLink(null));
    this.render();
  }
  update(state: MemoryState, event?: TraceEvent): void {
    this.state = state; this.event = event;
    if (!state.objects.some(node => node.address === this.selected)) this.selected = state.objects[0]?.address ?? null;
    this.render();
  }
  private render(): void {
    // Restore focus after replacing diagram elements; stepping never steals control focus.
    const active = document.activeElement as HTMLElement | null;
    const focusSelector = active && this.root.contains(active)
      ? active.dataset.node ? `[data-node="${active.dataset.node}"]` : active.dataset.target ? `[data-from="${active.dataset.from}"][data-target="${active.dataset.target}"]` : active.dataset.inspect ? `[data-inspect="${active.dataset.inspect}"]` : null
      : null;
    this.root.querySelector<HTMLElement>('[data-svg]')!.innerHTML = drawLinkedList(this.state, this.id, this.view, this.selected, this.event);
    this.root.querySelector<HTMLElement>('[data-inspector]')!.innerHTML = pointerInspector(this.state, this.selected);
    this.root.querySelector('[data-ascii]')!.textContent = asciiList(this.state);
    this.root.querySelector('[data-view-note]')!.textContent = this.view === 'memory'
      ? 'Illustrative addresses, sorted by location. Adjacency in memory does not imply a link.'
      : 'Follow the links. Node positions stay fixed during execution so pointer changes remain visible.';
    this.root.querySelectorAll<HTMLElement>('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === this.view)));
    if (focusSelector) {
      const target = this.root.querySelector<HTMLElement>(focusSelector)
        ?? this.root.querySelector<HTMLElement>(`[data-node="${this.selected}"]`);
      target?.focus({ preventScroll: true });
    }
  }
}
for (const root of document.querySelectorAll<HTMLElement>('[data-mental] [data-diagram]')) new DiagramView(root, initialState());
