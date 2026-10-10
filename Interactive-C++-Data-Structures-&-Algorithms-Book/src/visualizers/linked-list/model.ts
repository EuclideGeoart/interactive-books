import { applyEvent, cloneState, liveObject } from '../../engine/memory';
import type { Address, MemoryState, Trace, TraceEvent, TraceStep } from '../../engine/types';

export const operations = ['insert-head', 'insert-tail', 'insert-after', 'delete', 'search', 'clear'] as const;
export type Operation = typeof operations[number];
export const operationLabels: Record<Operation, string> = {
  'insert-head': 'Insert head', 'insert-tail': 'Insert tail', 'insert-after': 'Insert after',
  delete: 'Delete', search: 'Search', clear: 'Clear',
};
const addresses = ['0xA120', '0xD800', '0xB470', '0xE240', '0xC680', '0xA960', '0xF320', '0xB920', '0xD160'];
export const addressFor = (index: number): Address => addresses[index] ?? `0x${(0x10000 + index * 0x170).toString(16).toUpperCase()}`;
export function validValue(value: number): boolean {
  return Number.isInteger(value) && value >= -999 && value <= 999;
}
export function initialState(values: number[] = [10, 20, 30]): MemoryState {
  if (values.some(value => !validValue(value))) throw new Error('Use integers from −999 to 999.');
  return {
    objects: values.map((data, i) => ({ address: addressFor(i), lifetime: 'live', data, pointers: { next: i + 1 < values.length ? addressFor(i + 1) : null } })),
    references: { head: values.length ? addressFor(0) : null },
    visited: [], comparisons: 0, writes: 0, result: '',
  };
}
export function makeTrace(operation: Operation, initial: MemoryState, value = 5, after = 20): Trace {
  if (!validValue(value) || !validValue(after)) throw new Error('Use integers from −999 to 999.');
  let state = cloneState(initial);
  state.references = { head: state.references.head ?? null };
  state.visited = []; state.comparisons = 0; state.writes = 0; state.result = '';
  const trace: Trace = { initial: cloneState(state), steps: [] };
  function emit(event: TraceEvent, source: string | null, title: string, explanation: string): void {
    state = applyEvent(state, event);
    trace.steps.push({ event, source, title, explanation, state });
  }
  function ref(name: string, target: Address | null, source: string, explanation: string): void {
    emit({ type: 'AssignReference', name, target }, source, `${name} = ${target ?? 'nullptr'}`, explanation);
    if (name === 'current' && target !== null) emit({ type: 'Visit', address: target }, source, 'Visit the current node', 'The cursor identifies this node. Moving the cursor never moves the object.');
  }
  function compare(result: boolean, source: string, explanation: string, valueComparison = false): boolean {
    emit({ type: 'Compare', result, valueComparison }, source, `Condition is ${result ? 'true' : 'false'}`, explanation);
    return result;
  }
  function next(address: Address): Address | null { return liveObject(state, address).pointers.next ?? null; }
  function link(address: Address, target: Address | null, source: string, explanation: string): void {
    emit({ type: 'AssignPointer', address, field: 'next', target }, source, `next → ${target ?? 'nullptr'}`, explanation);
  }
  function allocate(prefix: string): Address {
    const address = addressFor(state.objects.length);
    emit({ type: 'Allocate', address }, `${prefix}.allocate`, 'Allocate storage', `new reserves storage at ${address}. No Node object exists here yet.`);
    emit({ type: 'Construct', address, value, fields: { next: null } }, `${prefix}.allocate`, 'Construct the Node', `Initialize data to ${value} and next to nullptr. The Node lifetime begins.`);
    ref('newNode', address, `${prefix}.allocate`, 'The new-expression returns a pointer to the constructed object.');
    return address;
  }
  function remove(address: Address, source: string): void {
    emit({ type: 'Destroy', address }, source, 'End the object lifetime', `delete ends the Node lifetime at ${address}. Its fields are no longer available.`);
    emit({ type: 'Free', address }, source, 'Release the storage', `Storage at ${address} is freed. Any local pointer still holding this address is dangling, not nullptr.`);
  }
  function result(text: string, source: string): void { emit({ type: 'Return', result: text }, source, text, 'Return to the caller. No further nodes are visited.'); }
  const head = state.references.head ?? null;
  if (operation === 'insert-head') {
    const node = allocate('head');
    link(node, head, 'head.link', 'Copy the OLD head into newNode->next. The head reference has not moved.');
    ref('head', node, 'head.publish', 'Now move head to the new node. The original chain remains connected through next.');
  } else if (operation === 'insert-tail') {
    const node = allocate('tail');
    if (compare(head === null, 'tail.empty', 'An empty list has no tail to traverse.')) {
      ref('head', node, 'tail.publish', 'For an empty list, the new node becomes the head.');
    } else {
      let current = head!;
      ref('current', current, 'tail.start', 'Start the traversal at head.');
      while (compare(next(current) !== null, 'tail.condition', 'Keep following next until it is nullptr.')) {
        current = next(current)!;
        ref('current', current, 'tail.advance', 'Follow exactly one next link.');
      }
      link(current, node, 'tail.link', 'The last node now points to newNode. The new node already points to nullptr.');
    }
  } else if (operation === 'insert-after' || operation === 'search' || operation === 'delete') {
    const prefix = operation === 'insert-after' ? 'after' : operation;
    let current = head;
    let previous: Address | null = null;
    if (operation === 'delete') ref('previous', null, 'delete.previous', 'There is no predecessor before the head.');
    ref('current', current, `${prefix}.start`, 'Start at head; nullptr is a valid empty-list state.');
    let found = false;
    while (compare(current !== null, `${prefix}.condition`, 'Check the pointer before accessing any of its fields.')) {
      const target = operation === 'insert-after' ? after : value;
      if (compare(liveObject(state, current!).data === target, `${prefix}.compare`, `Compare ${liveObject(state, current!).data} with ${target}.`, true)) {
        found = true;
        if (operation === 'search') result(`Found ${value} at ${current}`, 'search.found');
        if (operation === 'insert-after') {
          const node = allocate('after');
          link(node, next(current!), 'after.link', 'Save the successor in the new node before changing the existing link.');
          link(current!, node, 'after.publish', 'Connect the predecessor to the new node. The successor stays reachable.');
          result(`Inserted ${value} after ${after}`, 'after.success');
        }
        if (operation === 'delete') {
          ref('nodeToDelete', current, 'delete.save', 'Save the exact object to destroy before changing the chain.');
          if (compare(previous === null, 'delete.is-head', 'The first node has no predecessor.')) {
            ref('head', next(current!), 'delete.head', 'Move head to the successor. The removed node is still a LIVE, detached object.');
          } else {
            link(previous!, next(current!), 'delete.link', 'Bypass the node while it is still alive. Its successor is preserved.');
          }
          remove(current!, 'delete.free');
          result(`Deleted first ${value}`, 'delete.success');
        }
        break;
      }
      if (operation === 'delete') {
        previous = current;
        ref('previous', previous, 'delete.remember', 'Remember this predecessor before advancing current.');
      }
      current = next(current!);
      ref('current', current, `${prefix}.advance`, 'Copy the next pointer, which can be nullptr at the end of the chain.');
    }
    if (!found) result(`${operation === 'insert-after' ? after : value} not found — list unchanged`, `${prefix}.missing`);
  } else {
    let current = head;
    while (compare(current !== null, 'clear.condition', 'Continue until head is nullptr.')) {
      ref('nodeToDelete', current, 'clear.save', 'Save the old head before moving it.');
      const successor = next(current!);
      ref('head', successor, 'clear.advance', 'Read next while the node is still alive, then advance head.');
      remove(current!, 'clear.free');
      current = successor;
    }
  }
  emit({ type: 'EndScope' }, null, 'Leave the function', 'Local pointers leave scope. Owned nodes remain; freed addresses are retained only as a teaching record.');
  emit({ type: 'InvariantCheck' }, null, 'Operation complete', state.result || (operation === 'clear' ? 'Every node has been destroyed and freed. head is nullptr.' : 'The operation is complete. Check the links and ownership invariants.'));
  return trace;
}

export type BreakMode = 'lost' | 'cycle' | 'dangling';
export function makeBrokenTrace(mode: BreakMode): Trace {
  const initial = initialState();
  let state = cloneState(initial);
  const steps: TraceStep[] = [];
  function emit(event: TraceEvent, title: string, explanation: string): void {
    state = applyEvent(state, event);
    steps.push({ event, source: null, title, explanation, state });
  }
  if (mode === 'lost') {
    emit({ type: 'AssignReference', name: 'head', target: null }, 'Lose the only entry point', 'head = nullptr does not delete any object. All three nodes are still allocated, but no longer owned by the chain.');
  } else if (mode === 'cycle') {
    emit({ type: 'AssignReference', name: 'tail', target: addressFor(2) }, 'Locate the last node', 'For this three-node example, follow two next links to obtain a local tail pointer.');
    emit({ type: 'AssignPointer', address: addressFor(2), field: 'next', target: addressFor(0) }, 'Create a cycle', 'The tail points back to head. A normal traversal or clear loop can no longer terminate safely.');
  } else {
    emit({ type: 'Destroy', address: addressFor(0) }, 'Delete without advancing head', 'The object lifetime ends while head still points here. Dereferencing head would be undefined behavior.');
    emit({ type: 'Free', address: addressFor(0) }, 'Leave head dangling', 'delete does not set head to nullptr. The remaining chain is unreachable through a live object.');
  }
  return { initial, steps };
}

// A bounded O(n) counter for the large-list explorer, without playback snapshots.
export function measureSearch(state: MemoryState, target: number): { visits: number; comparisons: number; found: boolean } {
  const objects = new Map(state.objects.map(node => [node.address, node]));
  const seen = new Set<Address>();
  let pointer = state.references.head ?? null;
  let visits = 0;
  while (pointer !== null) {
    if (seen.has(pointer)) throw new Error('Cannot search a cyclic chain');
    seen.add(pointer);
    const node = objects.get(pointer);
    if (!node || node.lifetime !== 'live') throw new Error('Cannot search an ended object lifetime');
    visits++;
    if (node.data === target) return { visits, comparisons: visits, found: true };
    pointer = node.pointers.next ?? null;
  }
  return { visits, comparisons: visits, found: false };
}
