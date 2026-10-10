import { mountTraceLab } from './trace-lab';
import { InspectionDiagram } from './inspection-diagram';
import type { LabAdapter } from '../components/controls/lab-types';
import { stackAdapter } from '../visualizers/stack/adapter';
import { doublyAdapter } from '../visualizers/doubly-linked-list/adapter';
import { intrusiveAdapter } from '../visualizers/intrusive-list/adapter';
import { poolAdapter } from '../visualizers/allocator/adapter';
import { queueAdapter } from '../visualizers/queue/adapter';
import { ringAdapter } from '../visualizers/ring-buffer/adapter';
import { priorityAdapter } from '../visualizers/priority-queue/adapter';
import { heapAdapter } from '../visualizers/binary-heap/adapter';

function mountChapter<S, E extends { type: string }>(key: string, adapter: LabAdapter<S, E>): void {
  for (const root of document.querySelectorAll<HTMLElement>(`[data-chapter-lab="${key}"]`)) mountTraceLab(root, adapter);
  for (const root of document.querySelectorAll<HTMLElement>(`[data-structure-preview="${key}"]`)) {
    const inputs = new FormData();
    for (const [name, value] of Object.entries(JSON.parse(root.dataset.previewInputs || '{}') as Record<string, string>)) inputs.set(name, value);
    const trace = adapter.build(root.dataset.previewOperation!, inputs);
    new InspectionDiagram(root, adapter, trace.initial, root.dataset.previewId!);
  }
}
mountChapter('stack', stackAdapter);
mountChapter('pool', poolAdapter);
mountChapter('doubly', doublyAdapter);
mountChapter('intrusive', intrusiveAdapter);
mountChapter('queue', queueAdapter);
mountChapter('ring', ringAdapter);
mountChapter('priority', priorityAdapter);
mountChapter('heap', heapAdapter);
