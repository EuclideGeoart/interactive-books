import { applyEvent, cloneState, liveObject } from '../../engine/memory';
import type { MemoryState, Trace, TraceEvent, Invariant } from '../../engine/types';
import { initialState as listState, validValue } from '../linked-list/model';
import { checkInvariants as listInvariants } from '../linked-list/invariants';
import { listValues } from '../linked-list/topology';

export interface StackState extends MemoryState {
  implementation: 'array' | 'linked';
  storage: number[];
  topIndex: number;
}
export type StackEvent = TraceEvent | { type: 'SetIndex'; index: number } | { type: 'WriteSlot'; index: number; value: number };
export const stackOperations = ['push', 'pop', 'top', 'empty', 'clear'] as const;
export type StackOperation = typeof stackOperations[number];
export function stackState(implementation: 'array' | 'linked' = 'array', values = [10, 20, 30]): StackState {
  if (values.length > 5 || values.some(v => !validValue(v))) throw new Error('Use up to five integers from −999 to 999.');
  const list = listState(implementation === 'linked' ? [...values].reverse() : []);
  return { ...list, references: { topNode: list.references.head ?? null }, implementation, storage: [...values, ...Array(5 - values.length).fill(0)], topIndex: values.length - 1 };
}
export function stackValues(state: StackState): number[] {
  return state.implementation === 'array' ? state.storage.slice(0, state.topIndex + 1) : listValues({ ...state, references: { head: state.references.topNode ?? null } });
}
export function describeStack(state: StackState): string {
  return state.implementation === 'array' ? `bottom [${stackValues(state).join(', ')}] top · topIndex = ${state.topIndex}` : `top → ${stackValues(state).map(v => `[${v}] → `).join('')}nullptr`;
}
export function stackInvariants(state: StackState, settled: boolean): Invariant[] {
  if (state.implementation === 'linked') return listInvariants({ ...state, references: { ...state.references, head: state.references.topNode ?? null } }, settled).map(rule => ({ ...rule, name: rule.name.replace(/\bhead\b/g, 'topNode'), detail: rule.detail.replace(/\bhead\b/g, 'topNode') }));
  return [{ name: '−1 ≤ topIndex < capacity', status: state.topIndex >= -1 && state.topIndex < 5 ? 'pass' : 'fail', detail: `topIndex = ${state.topIndex}; capacity = 5. A push increments the index before writing the slot.` }, { name: 'All five int objects remain alive', status: 'pass', detail: 'Membership changes when topIndex moves. Popping does not destroy or erase an int in this fixed array.' }];
}
export function stackTrace(operation: StackOperation, initial: StackState, value = 5): Trace<StackState, StackEvent> {
  if (!validValue(value)) throw new Error('Use an integer from −999 to 999.');
  let state = cloneState(initial) as StackState;
  state.visited = []; state.writes = 0; state.comparisons = 0; state.result = '';
  const trace: Trace<StackState, StackEvent> = { initial: structuredClone(state), steps: [] };
  function emit(event: StackEvent, source: string | null, title: string, explanation = title): void {
    if (event.type === 'SetIndex' || event.type === 'WriteSlot') {
      state = structuredClone(state);
      if (event.type === 'SetIndex') state.topIndex = event.index;
      else state.storage[event.index] = event.value;
      state.writes++;
    } else state = applyEvent(state, event) as StackState;
    trace.steps.push({ event, source, title, explanation, state });
  }
  const ret = (result: string, tag: string) => emit({ type: 'Return', result }, tag, result);
  const compare = (result: boolean, tag: string) => { emit({ type: 'Compare', result }, tag, `Condition is ${result}`); return result; };
  const linked = state.implementation === 'linked';
  const prefix = `${linked ? 'l' : 'a'}${{ push: 'p', pop: 'o', top: 't', empty: 'e', clear: 'c' }[operation]}`;
  const empty = () => linked ? state.references.topNode === null : state.topIndex === -1;
  const ref = (name: string, target: string | null, tag: string) => emit({ type: 'AssignReference', name, target }, tag, `${name} → ${target ?? 'nullptr'}`);
  const removeTop = (p: string) => {
    const old = state.references.topNode!;
    ref('oldTop', old, `${p}.save`);
    ref('topNode', liveObject(state, old).pointers.next ?? null, `${p}.advance`);
    emit({ type: 'Destroy', address: old }, `${p}.delete`, 'End the Node lifetime', 'oldTop still contains its address; the node fields are no longer readable.');
    emit({ type: 'Free', address: old }, `${p}.delete`, 'Release the allocation', 'Unlike array pop, linked pop releases storage. oldTop is now dangling.');
  };
  if (operation === 'push') {
    if (linked) {
      // New storage sorts after existing addresses, keeping Chapter 1's memory-layout slots fixed.
      const address = `0x${(Math.max(0x9FB0, ...state.objects.map(node => Number.parseInt(node.address.slice(2), 16))) + 0x170).toString(16).toUpperCase()}`;
      emit({ type: 'Allocate', address }, 'lp.allocate', 'Allocate Node storage');
      emit({ type: 'Construct', address, value, fields: { next: null } }, 'lp.allocate', 'Construct the new Node');
      ref('newNode', address, 'lp.allocate');
      emit({ type: 'AssignPointer', address, field: 'next', target: state.references.topNode ?? null }, 'lp.link', 'Save the old top in newNode->next', 'topNode has not moved yet. This is the same front insertion mechanic as Chapter 1.');
      ref('topNode', address, 'lp.publish');
    } else if (compare(state.topIndex === 4, 'ap.full')) ret('Overflow: stack full; unchanged', 'ap.overflow');
    else {
      emit({ type: 'SetIndex', index: state.topIndex + 1 }, 'ap.increment', 'Increment topIndex first', 'The slot still contains its previous int value. The next statement writes the new value.');
      emit({ type: 'WriteSlot', index: state.topIndex, value }, 'ap.write', `Write ${value} into data[topIndex]`);
    }
  } else if (operation === 'pop' || operation === 'top') {
    // empty() is itself tagged in the canonical source and executes before the caller condition.
    ret(String(empty()), `${linked ? 'l' : 'a'}e.return`);
    if (compare(empty(), `${prefix}.empty`)) ret('Underflow: stack empty; unchanged', `${prefix}.underflow`);
    else if (operation === 'top') ret(`Top = ${linked ? liveObject(state, state.references.topNode!).data : state.storage[state.topIndex]}`, `${prefix}.return`);
    else if (linked) removeTop('lo');
    else emit({ type: 'SetIndex', index: state.topIndex - 1 }, 'ao.decrement', 'Move the logical top down', 'Raw storage retains the popped value. No array slot is erased.');
  } else if (operation === 'empty') ret(String(empty()), `${prefix}.return`);
  else if (linked) { while (compare(!empty(), 'lc.condition')) {
    removeTop('lc');
    state = structuredClone(state); delete state.references.oldTop;
    trace.steps.push({ event: { type: 'EndScope' }, source: null, title: 'Leave the loop body', explanation: 'oldTop leaves scope before testing the loop condition again.', state });
  } }
  else emit({ type: 'SetIndex', index: -1 }, 'ac.reset', 'Reset logical membership', 'All slots still exist and retain their raw int contents.');
  state = structuredClone(state); if (operation === 'pop' && !state.result.startsWith('Underflow')) state.result = ''; state.references = { topNode: state.references.topNode ?? null };
  trace.steps.push({ event: { type: 'InvariantCheck' }, source: null, title: 'Operation complete', explanation: state.result || describeStack(state), state });
  return trace;
}
