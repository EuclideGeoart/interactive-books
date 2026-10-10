import type { Trace } from '../../engine/types';

// Part VII presentation vocabulary, not an execution engine. Algorithms own mutations.
export type TechniqueStatus = 'unexplored' | 'current' | 'accepted' | 'rejected' | 'solution' | 'resolved' | 'dependency' | 'unknown';
export interface CallFrame {
  id: string;
  function: string;
  arguments: string;
  locals: string;
  resume: string;
  returned: string | null;
}
export interface TechniqueNode {
  id: string;
  label: string;
  detail: string;
  parent: string | null;
  status: TechniqueStatus;
  x: number;
  y: number;
}
export interface TechniqueCell {
  id: string;
  label: string;
  value: string;
  status: TechniqueStatus;
  detail: string;
}
export interface TechniqueState {
  kind: string;
  frames: CallFrame[];
  nodes: TechniqueNode[];
  cells: TechniqueCell[];
  dependencies: { from: string; to: string; label: string }[];
  table: { caption: string; columns: string[]; rows: { id: string; values: string[]; status: TechniqueStatus }[] };
  focus: string;
  result: string;
  metrics: { label: string; value: number }[];
}
export interface TechniqueEvent { type: string }
export type TechniqueTrace<S extends TechniqueState = TechniqueState> = Trace<S, TechniqueEvent>;
export function emptyTechniqueState(kind: string): TechniqueState {
  return { kind, frames: [], nodes: [], cells: [], dependencies: [], table: { caption: 'Execution state', columns: [], rows: [] }, focus: '', result: '', metrics: [] };
}
