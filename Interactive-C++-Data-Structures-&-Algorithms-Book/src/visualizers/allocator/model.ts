import type { Trace } from '../../engine/types';
export type Phase = 'free' | 'reserved' | 'live' | 'destroyed';
export interface PoolSlot { phase: Phase; alive: boolean; next: number; value: number | null }
export interface PoolState { slots: PoolSlot[]; head: number; block: number; result: string; writes: number; scans: number }
export interface PoolEvent { type: 'PoolStatement' | 'PoolScopeEnd'; slot: number }
export const poolOperations = ['allocate', 'construct', 'destroy', 'deallocate', 'cycle', 'reuse', 'exhaustion', 'double-free', 'use-after-destroy', 'foreign', 'live-return', 'failure', 'reorder'] as const;
export type PoolOperation = typeof poolOperations[number];
export const address = (slot: number): string => slot === -1 ? 'nullptr' : slot === -2 ? 'unavailable' : `0x${(0x1000 + slot * 128).toString(16).toUpperCase()}`;
export function poolInitial(count = 4): PoolState {
  return { slots: Array.from({ length: count }, (_, i) => ({ phase: 'free', alive: false, next: i + 1 < count ? i + 1 : -1, value: null })), head: 0, block: -1, result: '', writes: 0, scans: 0 };
}
export function poolTrace(operation: PoolOperation, count = 4, value = 42): Trace<PoolState, PoolEvent> {
  if (!poolOperations.includes(operation)) throw new Error('Choose a pool operation.');
  if (!Number.isInteger(count) || count < 1 || count > 6) throw new Error('Choose 1–6 pool slots.');
  if (!Number.isInteger(value) || Math.abs(value) > 999) throw new Error('Value must be an integer from −999 to 999.');
  const state = poolInitial(count);
  const trace: Trace<PoolState, PoolEvent> = { initial: structuredClone(state), steps: [] };
  let recording = true;
  const emit = (tag: string | null, explanation: string, change?: () => void, slot = state.block) => {
    change?.();
    if (recording) trace.steps.push({ source: tag, title: tag ? tag.replaceAll('.', ' · ') : 'Local block leaves scope', explanation, event: { type: tag ? 'PoolStatement' : 'PoolScopeEnd', slot }, state: structuredClone(state) });
  };
  const endScope = () => emit(null, 'The function has returned. Its local block pointer leaves scope; the pool storage remains.', () => { state.block = -1; }, -1);
  const reject = (tag: string, message: string) => emit(tag, message, () => { state.result = message; });
  const validate = (kind: string, i: number) => {
    emit(`${kind}.validate`, 'Check address equality against the pool slots before inspecting metadata.', () => { state.scans += i < 0 ? count : i + 1; });
    if (i < 0) { reject('validate.foreign', 'Address does not belong to this pool'); return false; }
    return true;
  };
  const allocate = (): number => {
    emit('allocate.guard', 'A null free-list head means the fixed pool is exhausted.');
    if (state.head === -1) { reject('allocate.exhausted', 'Pool exhausted: std::bad_alloc'); return -1; }
    const i = state.head;
    emit('allocate.block', 'Save the first free block; storage already exists.', () => { state.block = i; }, i);
    emit('allocate.head', 'Remove exactly one block from the free list.', () => { state.head = state.slots[i]!.next; state.writes++; });
    emit('allocate.reserve', 'Mark detached storage reserved. There is still no T object.', () => { state.slots[i]!.phase = 'reserved'; state.scans += i + 1; });
    emit('allocate.return', 'Return a storage address, not a live object.');
    endScope();
    return i;
  };
  const construct = (i: number, fail = false, v = value) => {
    if (!validate('construct', i)) return;
    const slot = state.slots[i]!;
    emit('construct.guard', 'Only reserved or destroyed storage can hold a new lifetime.');
    if (!['reserved', 'destroyed'].includes(slot.phase)) { reject('construct.reject', 'Construction requires reserved or destroyed storage'); return; }
    if (fail) { slot.next = -2; state.result = 'Constructor threw; create() returns the reserved storage.'; return; }
    emit('construct.object', 'Placement new begins T lifetime in existing storage. The constructor has returned.', () => { slot.next = -2; slot.alive = true; slot.value = v; });
    emit('construct.live', 'Publish live-object metadata after successful construction.', () => { slot.phase = 'live'; });
    emit('construct.return', 'Return the pointer produced by placement new.');
  };
  const destroy = (i: number) => {
    if (!validate('destroy', i)) return;
    const slot = state.slots[i]!;
    emit('destroy.guard', 'Require a live object before calling its destructor.');
    if (slot.phase !== 'live') { reject('destroy.reject', 'No live object to destroy'); return; }
    emit('destroy.object', 'Explicit destruction ends T lifetime; the pool storage remains.', () => { slot.alive = false; slot.value = null; });
    emit('destroy.state', 'Record destroyed-but-reserved storage.', () => { slot.phase = 'destroyed'; });
  };
  const deallocate = (i: number) => {
    if (!validate('deallocate', i)) return;
    const slot = state.slots[i]!;
    emit('deallocate.guard', 'Reject double return and return of a live object before touching its bytes.');
    if (slot.phase === 'free' || slot.phase === 'live') { reject('deallocate.reject', 'Cannot return free storage or a live object'); return; }
    emit('deallocate.block', 'Identify the storage block.', () => { state.block = i; }, i);
    emit('deallocate.link', 'Activate the pointer union member and point it at the current free list.', () => { slot.next = state.head; state.writes++; });
    emit('deallocate.free', 'Mark this block free before publishing the new head.', () => { slot.phase = 'free'; });
    emit('deallocate.head', 'Publish this returned block as the free-list head.', () => { state.head = i; state.writes++; });
    endScope();
  };
  const prep = (phase: Phase) => {
    recording = false; const i = allocate();
    if (phase === 'live' || phase === 'destroyed') construct(i);
    if (phase === 'destroyed') destroy(i);
    state.block = -1; state.writes = 0; state.scans = 0;
    recording = true; trace.initial = structuredClone(state);
    return i;
  };
  if (operation === 'allocate') allocate();
  if (operation === 'construct') construct(prep('reserved'));
  if (operation === 'destroy') destroy(prep('live'));
  if (operation === 'deallocate') deallocate(prep('destroyed'));
  if (operation === 'cycle' || operation === 'reuse' || operation === 'double-free' || operation === 'use-after-destroy') {
    const i = allocate(); construct(i); destroy(i);
    if (operation === 'use-after-destroy') { validate('read', i); emit('read.guard', 'A saved address does not make an object alive.'); reject('read.reject', 'Cannot read an object outside its lifetime'); }
    else { deallocate(i); if (operation === 'double-free') deallocate(i); if (operation === 'reuse') { const j = allocate(); construct(j, false, value + 1); } }
  }
  if (operation === 'exhaustion') for (let i = 0; i <= count; i++) allocate();
  if (operation === 'foreign') deallocate(-2);
  if (operation === 'live-return') deallocate(prep('live'));
  if (operation === 'reorder') { const a = allocate(); const b = count > 1 ? allocate() : -1; deallocate(a); if (b >= 0) deallocate(b); }
  if (operation === 'failure') { const i = allocate(); construct(i, true); deallocate(i); }
  return trace;
}
