import { mountTraceLab } from './trace-lab';
import { InspectionDiagram } from './inspection-diagram';
import { techniqueAdapter, type TechniqueKind } from '../visualizers/techniques/adapter';
import { describeTechnique, drawTechnique, inspectTechnique } from '../visualizers/techniques/presentation';
import type { TechniqueState } from '../visualizers/techniques/types';

// Preserve local panning when immutable snapshots replace the diagram markup.
function bindTechniqueScroll(root: HTMLElement): void {
  const canvas = root.querySelector<HTMLElement>('[data-svg]')!;
  const positions = new Map<string, [number, number]>();
  const key = (element: HTMLElement) => element.getAttribute('aria-label') ?? element.className;
  root.addEventListener('scroll', event => {
    const target = event.target;
    if (target instanceof HTMLElement && target.matches('.technique-tree-scroll,.technique-table-scroll,.technique-stack ol')) positions.set(key(target), [target.scrollLeft, target.scrollTop]);
  }, true);
  const reveal = () => {
    const focus = document.activeElement instanceof Element && canvas.contains(document.activeElement) ? document.activeElement : null;
    const target = focus?.closest('[data-node],[data-inspect]') ?? canvas.querySelector('.technique-node.status-current');
    const scroller = target?.closest<HTMLElement>('.technique-tree-scroll,.technique-table-scroll,.technique-stack ol');
    if (!target || !scroller) return;
    const box = target.getBoundingClientRect(), viewport = scroller.getBoundingClientRect();
    if (box.left < viewport.left || box.right > viewport.right) scroller.scrollLeft += box.left + box.width / 2 - viewport.left - viewport.width / 2;
    if (box.top < viewport.top || box.bottom > viewport.bottom) scroller.scrollTop += box.top + box.height / 2 - viewport.top - viewport.height / 2;
  };
  new MutationObserver(() => {
    for (const scroller of canvas.querySelectorAll<HTMLElement>('.technique-tree-scroll,.technique-table-scroll,.technique-stack ol')) {
      const position = positions.get(key(scroller));
      if (position) { scroller.scrollLeft = position[0]; scroller.scrollTop = position[1]; }
    }
    reveal();
  }).observe(canvas, { childList: true });
  root.addEventListener('focusin', reveal);
}

for (const wrapper of document.querySelectorAll<HTMLElement>('[data-technique-lab]')) {
  const kind = wrapper.dataset.techniqueLab as TechniqueKind;
  const root = wrapper.querySelector<HTMLElement>('[data-chapter-lab]')!;
  mountTraceLab(root, techniqueAdapter(kind));
  root.querySelector<HTMLElement>('[data-mobile-code]')!.tabIndex = 0;
  bindTechniqueScroll(root);
  const showInputs = () => {
    const operation = root.querySelector<HTMLElement>('[data-operation][aria-pressed="true"]')?.dataset.operation;
    for (const label of root.querySelectorAll<HTMLElement>('[data-technique-input]')) {
      const group = label.dataset.techniqueInput;
      label.hidden = group === 'coins' ? ['intervals', 'fibonacci'].includes(operation ?? '') : group !== operation;
    }
  };
  root.addEventListener('click', showInputs);
  showInputs();
}
for (const root of document.querySelectorAll<HTMLElement>('[data-technique-preview]')) {
  const state: TechniqueState = JSON.parse(root.querySelector('[data-technique-state]')!.textContent!);
  new InspectionDiagram(root, { draw: drawTechnique, inspect: inspectTechnique, describe: describeTechnique }, state, `${root.dataset.techniquePreview}-preview`);
  bindTechniqueScroll(root);
}
