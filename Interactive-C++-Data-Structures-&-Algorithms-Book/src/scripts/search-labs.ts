import { mountTraceLab } from './trace-lab';
import { InspectionDiagram } from './inspection-diagram';
import { bindSorting } from './sorting-interactions';
import { searchSortAdapters } from '../visualizers/search-sort/adapter';
for(const [key,adapter] of Object.entries(searchSortAdapters)) {
  for(const root of document.querySelectorAll<HTMLElement>(`[data-chapter-lab="${key}"]`)) {
    mountTraceLab(root,adapter); bindSorting(root);
  }
  for(const root of document.querySelectorAll<HTMLElement>(`[data-structure-preview="${key}"]`)) {
    const inputs=new FormData();
    for(const [name,value] of Object.entries(JSON.parse(root.dataset.previewInputs??'{}') as Record<string,string>))inputs.set(name,value);
    const trace=adapter.build(root.dataset.previewOperation??'',inputs);
    new InspectionDiagram(root,adapter,trace.initial,root.dataset.previewId!);bindSorting(root);
  }
}
