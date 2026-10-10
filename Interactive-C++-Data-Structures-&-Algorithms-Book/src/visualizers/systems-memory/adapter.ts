import type { LabAdapter } from '../../components/controls/lab-types';
import { freeListTrace, freeListInvariants, type FreeListState } from './free-list';
import { arenaTrace, arenaInvariants, type ArenaState } from './arena';
import { poolTrace, poolInvariants, type PoolState } from './object-pool';
import { handlesTrace, handleInvariants, type HandleState } from './handles';
import { drawMemory, describeMemory, inspectMemory, memoryCounters } from './presentation';
import type { MemoryEvent } from './trace';
export type MemoryState = FreeListState | ArenaState | PoolState | HandleState;
export const memoryKinds = ['free-list', 'arena', 'object-pool', 'handles'] as const;
export type MemoryKind = typeof memoryKinds[number];
export const memoryHeaders = { 'free-list': '51/FreeListStorage', arena: '52/ByteArena', 'object-pool': '53/ObjectPool', handles: '55/HandleRegistry' };
export const memoryOperations: Record<MemoryKind, { id: string; label: string }[]> = {
  'free-list': [{id:'acquire',label:'Acquire slots'},{id:'reuse',label:'Release / reuse'},{id:'exhaustion',label:'Exhaustion'},{id:'double-release',label:'Double release'},{id:'break-it',label:'Break-It metadata'}],
  arena: [{id:'allocate',label:'Aligned reservations'},{id:'reset',label:'Reset / reuse'},{id:'exhaustion',label:'Exhaustion'},{id:'break-it',label:'Break-It alignment'}],
  'object-pool': [{id:'lifecycle',label:'Full lifecycle'},{id:'construct',label:'Reserve / construct'},{id:'rollback',label:'Throw / rollback'},{id:'double-release',label:'Double return'},{id:'exhaustion',label:'Exhaustion'},{id:'break-it',label:'Break-It lifetime'}],
  handles: [{id:'reuse',label:'Stale / valid identity'},{id:'validate',label:'Validate a handle'},{id:'retire',label:'Retire generations'},{id:'double-destroy',label:'Double destroy'},{id:'exhaustion',label:'Exhaustion'},{id:'break-it',label:'Break-It generation'}],
};
export function memoryDefaults(): FormData {
  const data = new FormData();
  for (const [key,value] of Object.entries({ count:'3',index:'0',value:'42',generation:'1',requests:'5:1,8:4,7:8',fault:'cycle' })) data.set(key,value);
  return data;
}
export function memoryInvariants(state: MemoryState) {
  switch (state.kind) {
    case 'free-list': return freeListInvariants(state);
    case 'arena': return arenaInvariants(state);
    case 'object-pool': return poolInvariants(state);
    case 'handles': return handleInvariants(state);
  }
}
export function memoryAdapter(kind: MemoryKind): LabAdapter<MemoryState, MemoryEvent> {
  return {
    build(operation, inputs) {
      switch (kind) {
        case 'free-list': return freeListTrace(operation,inputs);
        case 'arena': return arenaTrace(operation,inputs);
        case 'object-pool': return poolTrace(operation,inputs);
        case 'handles': return handlesTrace(operation,inputs);
      }
    },
    regions: () => [kind], draw: drawMemory, inspect: inspectMemory, describe: describeMemory,
    invariants: memoryInvariants, counters: memoryCounters,
  };
}
