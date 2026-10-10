import type { Invariant, Trace } from '../../engine/types';
export interface MemoryEvent { type: string }
export interface Context { phase: string; result: string; active: number | null; broken: boolean }
export const context = (): Context => ({ phase: 'ready', result: 'Raw storage is not a live object.', active: null, broken: false });
export function record<S extends Context>(state: S) {
  const trace: Trace<S, MemoryEvent> = { initial: structuredClone(state), steps: [] };
  return { trace, emit(source: string | null, title: string, explanation: string) {
    state.phase = source ?? 'experiment'; state.result = explanation;
    trace.steps.push({ event: { type: source ?? 'BreakIt' }, source, title, explanation, state: structuredClone(state) });
  } };
}
export function numberInput(data: FormData, key: string, fallback: number, min: number, max: number): number {
  const raw = data.get(key); const value = raw === null ? fallback : Number(raw);
  if (raw === '' || !Number.isInteger(value) || value < min || value > max) throw new Error(`${key} must be an integer in ${min}..${max}.`);
  return value;
}
export const rule = (name: string, valid: boolean, detail: string, pending = false): Invariant => ({ name, status: valid ? 'pass' : pending ? 'pending' : 'fail', detail });
export function walk(head: number, next: number[], none = next.length): { order: number[]; error: string } {
  const order: number[] = []; let i = head;
  while (i !== none) {
    if (!Number.isInteger(i) || i < 0 || i >= next.length) return { order, error: `Invalid index ${i}` };
    if (order.includes(i)) return { order, error: `Cycle at slot ${i}` };
    order.push(i); i = next[i]!;
  }
  return { order, error: '' };
}
