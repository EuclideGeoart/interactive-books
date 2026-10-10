import type { LabAdapter } from '../../components/controls/lab-types';
import type { Event, OrganizationKind, OrganizationState } from './types';
import { sparseTrace, sparseInvariants } from './sparse';
import { ecsTrace, ecsInvariants } from './ecs';
import { dirtyTrace, dirtyInvariants } from './dirty';
import { commandsTrace, commandsInvariants } from './commands';
import { drawOrganization, inspectOrganization, describeOrganization } from './presentation';
export type { OrganizationKind } from './types';
export const organizationOperations: Record<OrganizationKind, { id: string; label: string }[]> = {
  sparse: [{ id: 'remove', label: 'Swap-delete' }, { id: 'insert', label: 'Insert' }, { id: 'contains', label: 'Contains' }, { id: 'iterate', label: 'Dense iteration' }, { id: 'stale', label: 'Stale sparse entry' }, { id: 'break-map', label: 'Break: inverse map' }, { id: 'break-duplicate', label: 'Break: duplicate' }],
  ecs: [{ id: 'query', label: 'Position + Velocity system' }, { id: 'add', label: 'Add component' }, { id: 'remove', label: 'Remove component' }, { id: 'destroy', label: 'Destroy entity' }, { id: 'reuse', label: 'Reuse / stale handle' }],
  dirty: [{ id: 'wave', label: 'Process bounded waves' }, { id: 'mark', label: 'Mark / dedupe' }, { id: 'repeat', label: 'Self re-dirty' }, { id: 'clear', label: 'Clear at boundary' }, { id: 'break-duplicate', label: 'Break: duplicate work' }, { id: 'break-flag', label: 'Break: early flag clear' }],
  commands: [{ id: 'ordered', label: 'Ordered best-effort flush' }, { id: 'record', label: 'Record only' }, { id: 'stale', label: 'Delete then stale move' }, { id: 'move', label: 'Move selected handle' }, { id: 'full', label: 'Creation exhaustion' }, { id: 'replay', label: 'Replay from initial world' }],
};
export function organizationDefaults(kind: OrganizationKind): FormData {
  const data = new FormData();
  Object.entries({ ids: kind === 'sparse' ? '1,9,4' : '0,1,0,2', id: kind === 'sparse' ? '9' : kind === 'ecs' ? '1' : '0', generation: '1', value: kind === 'ecs' ? '7' : '5', pool: '0', waves: '1' }).forEach(([k, v]) => data.set(k, v));
  return data;
}
export function organizationAdapter(kind: OrganizationKind): LabAdapter<OrganizationState, Event> {
  return {
    build: (op, input) => ({ sparse: sparseTrace, ecs: ecsTrace, dirty: dirtyTrace, commands: commandsTrace }[kind])(op, input),
    draw: drawOrganization, inspect: inspectOrganization, describe: describeOrganization,
    regions: () => kind === 'sparse' ? ['sparse', 'sparse-break'] : kind === 'ecs' ? ['ecs', 'ecs-remove'] : kind === 'dirty' ? ['dirty', 'dirty-break'] : ['commands'],
    invariants: s => s.kind === 'sparse' ? sparseInvariants(s) : s.kind === 'ecs' ? ecsInvariants(s) : s.kind === 'dirty' ? dirtyInvariants(s) : commandsInvariants(s),
    counters: s => {
      const values = s.kind === 'sparse' ? { Lookups: s.lookups, Moves: s.moves, Writes: s.writes } : s.kind === 'ecs' ? { Validations: s.validations, 'Join probes': s.probes, 'Component updates': s.updates } : s.kind === 'dirty' ? { Marks: s.marks, Dedupes: s.dedupes, Processed: s.visits, Waves: s.wave } : { Recorded: s.recorded, Executed: s.executed, Failures: s.failures, Validations: s.validations };
      return Object.entries(values).map(([label, value]) => ({ label, value: value! }));
    },
  };
}
