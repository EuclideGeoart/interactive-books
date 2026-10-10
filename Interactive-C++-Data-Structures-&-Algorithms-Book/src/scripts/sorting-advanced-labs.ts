import { mountTraceLab } from './trace-lab';
import { InspectionDiagram } from './inspection-diagram';
import { bindSorting } from './sorting-interactions';
import { advancedSortAdapters } from '../visualizers/sort-advanced/adapter';
for (const [key, adapter] of Object.entries(advancedSortAdapters)) {
  for (const root of document.querySelectorAll<HTMLElement>(`[data-chapter-lab="${key}"]`)) {
    mountTraceLab(root, adapter); bindSorting(root);
  }
  for (const root of document.querySelectorAll<HTMLElement>(`[data-structure-preview="${key}"]`)) {
    const inputs = new FormData();
    for (const [k, v] of Object.entries(JSON.parse(root.dataset.previewInputs ?? '{}') as Record<string, string>)) inputs.set(k, v);
    const trace = adapter.build(root.dataset.previewOperation ?? 'sort', inputs);
    new InspectionDiagram(root, adapter, trace.initial, root.dataset.previewId!); bindSorting(root);
  }
}
