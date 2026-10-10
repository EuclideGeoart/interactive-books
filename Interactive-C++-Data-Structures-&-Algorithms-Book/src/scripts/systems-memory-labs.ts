import { mountTraceLab } from './trace-lab';
import { InspectionDiagram } from './inspection-diagram';
import { memoryAdapter, type MemoryKind, type MemoryState } from '../visualizers/systems-memory/adapter';
for (const wrapper of document.querySelectorAll<HTMLElement>('[data-systems-memory-lab]')) {
  const root = wrapper.querySelector<HTMLElement>('[data-chapter-lab]')!;
  mountTraceLab(root,memoryAdapter(wrapper.dataset.systemsMemoryLab as MemoryKind));
  root.querySelector<HTMLElement>('[data-mobile-code]')!.tabIndex = 0;
}
for (const root of document.querySelectorAll<HTMLElement>('[data-systems-memory-preview]')) {
  const state: MemoryState = JSON.parse(root.querySelector('[data-memory-state]')!.textContent!);
  new InspectionDiagram(root,memoryAdapter(state.kind),state,`${state.kind}-preview`);
}
