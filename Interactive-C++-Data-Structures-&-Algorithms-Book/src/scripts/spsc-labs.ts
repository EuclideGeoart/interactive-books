import { mountTraceLab } from './trace-lab';
import { InspectionDiagram } from './inspection-diagram';
import { spscAdapter } from '../visualizers/spsc/adapter';
import type { SpscState } from '../visualizers/spsc/model';

for (const wrapper of document.querySelectorAll<HTMLElement>('[data-spsc-lab]')) {
  const root = wrapper.querySelector<HTMLElement>('[data-chapter-lab]')!;
  mountTraceLab(root, spscAdapter);
  root.querySelector<HTMLElement>('[data-mobile-code]')!.tabIndex = 0;
  const inputs = () => {
    const operation = root.dataset.operation ?? 'push';
    for (const label of root.querySelectorAll<HTMLElement>('[data-spsc-input]')) {
      const group = label.dataset.spscInput;
      label.hidden = group === 'initial' ? !['push', 'pop'].includes(operation) : group === 'value' ? !['push', 'publication', 'reuse', 'break-publication'].includes(operation) : operation.startsWith('cas-') || operation === 'aba';
    }
  };
  root.addEventListener('click', inputs); inputs();
}
for (const root of document.querySelectorAll<HTMLElement>('[data-spsc-preview]')) {
  const state: SpscState = JSON.parse(root.querySelector('[data-spsc-state]')!.textContent!);
  new InspectionDiagram(root, spscAdapter, state, 'spsc-preview');
}
