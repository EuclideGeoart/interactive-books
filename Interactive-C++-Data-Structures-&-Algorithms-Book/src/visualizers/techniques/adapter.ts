import type { LabAdapter } from '../../components/controls/lab-types';
import type { TechniqueEvent, TechniqueState } from './types';
import { buildRecursiveTrace, recursiveInvariants, recursiveRegions } from './recursive';
import { buildOptimizationTrace, optimizationInvariants, optimizationRegions } from './optimization';
import { describeTechnique, drawTechnique, inspectTechnique } from './presentation';

export const techniqueKinds = ['recursion', 'backtracking', 'divide-conquer', 'greedy', 'dynamic-programming', 'memo-tabulation'] as const;
export type TechniqueKind = typeof techniqueKinds[number];
export const techniqueOperations: Record<TechniqueKind, { id: string; label: string }[]> = {
  recursion: [{ id: 'recursive', label: 'Recursive factorial' }, { id: 'iterative', label: 'Iterative factorial' }],
  backtracking: [{ id: 'combinations', label: 'Choose / explore / undo' }],
  'divide-conquer': [{ id: 'merge-sort', label: 'Divide / solve / combine' }],
  greedy: [{ id: 'intervals', label: 'Interval scheduling' }, { id: 'coins', label: 'Coin counterexample' }],
  'dynamic-programming': [{ id: 'fibonacci', label: 'Repeated subproblems' }, { id: 'coins', label: 'Minimum coin change' }],
  'memo-tabulation': [{ id: 'memo', label: 'Top-down memoization' }, { id: 'tabulation', label: 'Bottom-up tabulation' }],
};
export function techniqueDefaults(kind: TechniqueKind): FormData {
  const inputs = new FormData();
  for (const [key, value] of Object.entries({ n: kind === 'dynamic-programming' ? '5' : '4', k: '2', values: '7,2,5,2,9,1', intervals: '0:3,1:2,2:4,3:5,4:6', coins: '1,3,4', target: '6' })) inputs.set(key, value);
  return inputs;
}
export function techniqueAdapter(kind: TechniqueKind): LabAdapter<TechniqueState, TechniqueEvent> {
  const recursive = ['recursion', 'backtracking', 'divide-conquer'].includes(kind);
  return {
    build: (operation, inputs) => recursive ? buildRecursiveTrace(kind, operation, inputs) : buildOptimizationTrace(kind, operation, inputs),
    draw: drawTechnique,
    describe: describeTechnique,
    inspect: inspectTechnique,
    invariants: recursive ? recursiveInvariants : optimizationInvariants,
    regions: operation => recursive ? recursiveRegions(kind, operation) : optimizationRegions(kind, operation),
    counters: state => state.metrics,
  };
}
