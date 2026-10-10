import type { Trace, Invariant } from '../../engine/types';
export type OrganizationKind = 'sparse' | 'ecs' | 'dirty' | 'commands';
export interface Event { type: string }
export interface SparseState { kind: 'sparse'; sparse: number[]; dense: number[]; active: number; index: number; moved: number; lookups: number; moves: number; writes: number; pending: boolean; broken: boolean; found: boolean }
export interface Pool { sparse: number[]; dense: number[]; values: number[] }
export interface ECSState { kind: 'ecs'; slots: { generation: number; alive: boolean }[]; position: Pool; velocity: Pool; active: number; pool: number; index: number; moved: number; validations: number; probes: number; updates: number; pending: boolean }
export interface DirtyState { kind: 'dirty'; current: number[]; next: number[]; processed: number[]; current_flags: boolean[]; next_flags: boolean[]; cursor: number; wave: number; active: number; marks: number; dedupes: number; visits: number; processing: boolean; broken: boolean }
export interface Handle { index: number; generation: number }
export interface Command { kind: number; target: Handle; value: number }
export interface CommandsState { kind: 'commands'; slots: { generation: number; value: number | null }[]; commands: Command[]; reports: { command: number; code: number; handle: Handle }[]; cursor: number; recorded: number; executed: number; failures: number; validations: number; flushing: boolean }
export type OrganizationState = SparseState | ECSState | DirtyState | CommandsState;
export type OrganizationTrace<S extends OrganizationState = OrganizationState> = Trace<S, Event>;
export function recorder<S extends OrganizationState>(state: S) {
  const trace: OrganizationTrace<S> = { initial: structuredClone(state), steps: [] };
  const emit = (source: string, title: string, explanation: string) => trace.steps.push({ event: { type: source }, source, title, explanation, state: structuredClone(state) });
  return { trace, emit };
}
export function integer(input: FormData, key: string, fallback: number, min: number, max: number): number {
  const raw = input.get(key); const value = raw === null ? fallback : Number(String(raw));
  if (raw !== null && !String(raw).trim() || !Number.isInteger(value) || value < min || value > max) throw new Error(`${key}: enter an integer in ${min}..${max}.`);
  return value;
}
export function ids(input: FormData, fallback: string, max: number): number[] {
  const text = String(input.get('ids') ?? fallback).trim();
  if (!text) return [];
  const result = text.split(',').map(s => { if (!s.trim()) throw new Error('Use comma-separated IDs.'); return Number(s); });
  if (result.length > 16 || result.some(n => !Number.isInteger(n) || n < 0 || n > max)) throw new Error(`Use at most 16 IDs in 0..${max}.`);
  return result;
}
export const invariant = (name: string, ok: boolean, detail: string, pending = false): Invariant => ({ name, status: pending ? 'pending' : ok ? 'pass' : 'fail', detail });
export const member = (pool: { sparse: number[]; dense: number[] }, id: number): boolean => id >= 0 && id < pool.sparse.length && pool.sparse[id]! >= 0 && pool.sparse[id]! < pool.dense.length && pool.dense[pool.sparse[id]!] === id;
