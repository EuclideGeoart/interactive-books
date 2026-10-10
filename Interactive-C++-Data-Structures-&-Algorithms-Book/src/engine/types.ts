export type Address = string;
export type Lifetime = 'allocated' | 'live' | 'destroyed' | 'freed';
export interface MemoryObject {
  address: Address;
  lifetime: Lifetime;
  data?: number;
  pointers: Record<string, Address | null>;
}
export interface MemoryState {
  objects: MemoryObject[];
  references: Record<string, Address | null>;
  visited: Address[];
  comparisons: number;
  writes: number;
  result: string;
}
export type TraceEvent =
  | { type: 'Allocate'; address: Address }
  | { type: 'Construct'; address: Address; value: number; fields: Record<string, Address | null> }
  | { type: 'AssignPointer'; address: Address; field: string; target: Address | null }
  | { type: 'AssignReference'; name: string; target: Address | null }
  | { type: 'Visit'; address: Address }
  | { type: 'Compare'; result: boolean; valueComparison?: boolean }
  | { type: 'Destroy' | 'Free'; address: Address }
  | { type: 'Return'; result: string }
  | { type: 'EndScope' }
  | { type: 'InvariantCheck' };
export interface TraceStep<S = MemoryState, E = TraceEvent> {
  event: E;
  source: string | null;
  title: string;
  explanation: string;
  state: S;
}
export interface Trace<S = MemoryState, E = TraceEvent> {
  initial: S;
  steps: TraceStep<S, E>[];
}
export interface Invariant {
  name: string;
  status: 'pass' | 'pending' | 'fail';
  detail: string;
}
