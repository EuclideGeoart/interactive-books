import type { LabAdapter } from '../components/controls/lab-types';

// DOM selection/inspection binding. Layout and topology belong entirely to draw().
export class InspectionDiagram<S, E extends { type: string }> {
  private selected: string | null = null;
  private view: 'logical' | 'memory' = 'logical';
  private event?: E;
  private inspector: HTMLDetailsElement;
  constructor(private root: HTMLElement, private adapter: Pick<LabAdapter<S, E>, 'draw' | 'inspect' | 'describe'>, private state: S, private id: string) {
    this.inspector = root.querySelector<HTMLDetailsElement>('[data-inspector-shell]')!;
    if (matchMedia('(max-width: 560px)').matches) this.inspector.open = false;
    root.addEventListener('click', event => {
      const el = event.target as Element;
      const button = el.closest<HTMLElement>('[data-view]');
      if (button) {
        this.view = button.dataset.view as 'logical' | 'memory';
        root.querySelectorAll<HTMLElement>('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === this.view)));
        this.render();
      }
      const node = el.closest<HTMLElement>('[data-node],[data-target],[data-inspect]');
      if (node) this.select(node);
    });
    root.addEventListener('keydown', event => {
      if (['Enter', ' '].includes(event.key) && (event.target as Element).matches('[data-node],[data-target]')) { event.preventDefault(); this.select(event.target as HTMLElement); }
    });
    const highlight = (target: EventTarget | null) => {
      const link = target instanceof Element ? target.closest<HTMLElement>('[data-from]') : null;
      root.querySelectorAll<HTMLElement>('[data-node]').forEach(node => node.classList.toggle('link-endpoint', Boolean(link && [link.dataset.from, link.dataset.target].includes(node.dataset.node))));
    };
    root.addEventListener('pointerover', event => highlight(event.target));
    root.addEventListener('pointerout', () => highlight(null));
    root.addEventListener('focusin', event => highlight(event.target));
    root.addEventListener('focusout', () => highlight(null));
    this.render();
  }
  private select(element: HTMLElement): void {
    const address = element.dataset.node ?? element.dataset.target ?? element.dataset.inspect;
    if (address !== undefined && address !== '') { this.selected = address; this.inspector.open = true; this.render(); }
  }
  update(state: S, event?: E, resetSelection = false): void {
    this.state = state; this.event = event;
    if (resetSelection) this.selected = null;
    this.render();
  }
  private render(): void {
    const focused = document.activeElement as HTMLElement | null;
    const attr = focused && this.root.contains(focused) && ['data-node', 'data-target', 'data-inspect'].find(key => focused.hasAttribute(key));
    const value = attr ? focused?.getAttribute(attr) : null;
    const from = focused?.getAttribute('data-from');
    const label = focused?.getAttribute('aria-label');
    this.root.querySelector('[data-svg]')!.innerHTML = this.adapter.draw(this.state, this.id, this.view, this.selected, this.event);
    this.root.querySelector('[data-inspector]')!.innerHTML = this.adapter.inspect(this.state, this.selected);
    this.root.querySelector('[data-ascii]')!.textContent = this.adapter.describe(this.state);
    if (attr && value !== null) {
      const previous = [...this.root.querySelectorAll<HTMLElement>(`[${attr}]`)].find(el => el.getAttribute(attr) === value && (attr !== 'data-target' || (el.getAttribute('data-from') === from && el.getAttribute('aria-label') === label)));
      const fallback = [...this.root.querySelectorAll<HTMLElement>('[data-node]')].find(el => el.dataset.node === this.selected);
      (previous ?? fallback)?.focus({ preventScroll: true });
    }
  }
}
