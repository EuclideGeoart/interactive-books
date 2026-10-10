import type { Invariant, Trace } from '../../engine/types';

// Presentation contract only: each chapter owns its state, semantics and geometry.
export interface LabAdapter<S, E extends { type: string }> {
  build(operation: string, inputs: FormData): Trace<S, E>;
  draw(state: S, id: string, view: 'logical' | 'memory', selected: string | null, event?: E): string;
  inspect(state: S, selected: string | null): string;
  describe(state: S): string;
  invariants(state: S, settled: boolean): Invariant[];
  regions(operation: string, inputs: FormData): string[];
  counters?(state: S): { label: string; value: number }[];
}
