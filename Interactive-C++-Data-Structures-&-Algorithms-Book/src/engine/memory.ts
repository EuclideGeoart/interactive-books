import type { Address, MemoryObject, MemoryState, TraceEvent } from './types';

export const cloneState = (state: MemoryState): MemoryState => structuredClone(state);
export function objectAt(state: MemoryState, address: Address): MemoryObject {
  const object = state.objects.find(node => node.address === address);
  if (!object) throw new Error(`Unknown address: ${address}`);
  return object;
}
export function liveObject(state: MemoryState, address: Address): MemoryObject {
  const object = objectAt(state, address);
  if (object.lifetime !== 'live') throw new Error(`Cannot read ${object.lifetime} object at ${address}`);
  return object;
}
export function applyEvent(previous: MemoryState, event: TraceEvent): MemoryState {
  const state = cloneState(previous);
  switch (event.type) {
    case 'Allocate':
      if (state.objects.some(node => node.address === event.address)) throw new Error('Address already allocated');
      state.objects.push({ address: event.address, lifetime: 'allocated', pointers: {} });
      break;
    case 'Construct': {
      const node = objectAt(state, event.address);
      if (node.lifetime !== 'allocated') throw new Error('Construction requires allocated storage');
      node.lifetime = 'live'; node.data = event.value; node.pointers = { ...event.fields };
      break;
    }
    case 'AssignPointer':
      if (event.target !== null) liveObject(state, event.target);
      liveObject(state, event.address).pointers[event.field] = event.target;
      state.writes++;
      break;
    case 'AssignReference':
      if (event.target !== null) liveObject(state, event.target);
      state.references[event.name] = event.target;
      state.writes++;
      break;
    case 'Visit':
      liveObject(state, event.address);
      if (!state.visited.includes(event.address)) state.visited.push(event.address);
      break;
    case 'Compare':
      if (event.valueComparison) state.comparisons++;
      break;
    case 'Destroy': {
      const node = liveObject(state, event.address);
      node.lifetime = 'destroyed'; delete node.data; node.pointers = {};
      break;
    }
    case 'Free': {
      const node = objectAt(state, event.address);
      if (node.lifetime !== 'destroyed') throw new Error('Free requires an ended object lifetime');
      node.lifetime = 'freed';
      break;
    }
    case 'Return': state.result = event.result; break;
    case 'EndScope': state.references = { head: state.references.head ?? null }; break;
    case 'InvariantCheck': break;
  }
  return state;
}
