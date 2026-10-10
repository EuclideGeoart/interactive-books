import type { LabAdapter } from '../../components/controls/lab-types';
import { drawSorting, inspectSorting, describeSorting } from '../sorting/presentation';
import { mergeTrace, quickTrace, heapSortTrace, countingTrace, radixTrace, advancedScene, advancedInvariants, type AdvancedState, type SortEvent, type QuickFault } from './model';
export function parseAdvancedValues(raw: string): number[] {
  if (!raw.trim()) return [];
  const tokens = raw.trim().split(/[\s,]+/);
  if (tokens.some(x => !/^-?\d+$/.test(x))) throw new Error('Enter comma- or space-separated integers, or leave blank for empty input.');
  return tokens.map(Number);
}
const presentation = {
  draw: (s: AdvancedState, id: string, view: 'logical' | 'memory', selected: string | null) => drawSorting(advancedScene(s), id, view, selected),
  inspect: (s: AdvancedState, selected: string | null) => inspectSorting(advancedScene(s), selected),
  describe: (s: AdvancedState) => describeSorting(advancedScene(s)),
  invariants: advancedInvariants,
  counters: (s: AdvancedState) => [
    { label: 'Key comparisons', value: s.counters.comparisons }, { label: 'Swaps', value: s.counters.swaps },
    { label: 'Array writes', value: s.counters.writes }, { label: 'Buffer writes', value: s.counters.bufferWrites },
    { label: 'Passes', value: s.counters.passes }, { label: 'Max recursion', value: s.counters.maxDepth },
    ...(s.kind === 'radix' ? [{ label: 'Digit reads', value: s.counters.digitReads }, { label: 'Maximum scans', value: s.counters.maximumScans }] : []),
  ],
};
const values = (inputs: FormData) => parseAdvancedValues(String(inputs.get('values') ?? '8,3,5,1,6,2,7,4'));
export const mergeSortAdapter: LabAdapter<AdvancedState, SortEvent> = {
  ...presentation, build: (_op, inputs) => mergeTrace(values(inputs)), regions: () => ['merge'],
};
export const quickSortAdapter: LabAdapter<AdvancedState, SortEvent> = {
  ...presentation, build: (_op, inputs) => quickTrace(values(inputs), String(inputs.get('fault') ?? 'none') as QuickFault), regions: () => ['quick'],
};
export const heapSortAdapter: LabAdapter<AdvancedState, SortEvent> = {
  ...presentation, build: (_op, inputs) => heapSortTrace(values(inputs)), regions: () => ['heap'],
};
export const countingRadixAdapter: LabAdapter<AdvancedState, SortEvent> = {
  ...presentation,
  build: (op, inputs) => op === 'counting' ? countingTrace(values(inputs), Number(inputs.get('maxKey') ?? 9)) : radixTrace(values(inputs), inputs.get('unstable') === 'yes'),
  regions: op => [op === 'counting' ? 'counting' : 'radix'],
};
export const advancedSortAdapters = { 'merge-sort': mergeSortAdapter, 'quick-sort': quickSortAdapter, 'heap-sort': heapSortAdapter, 'counting-radix-sort': countingRadixAdapter };
