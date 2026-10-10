export type LabKind = 'pointer' | 'slot' | 'lifetime' | 'vector' | 'copy' | 'alignment' | 'contracts' | 'iterators' | 'integer' | 'optional';

export interface LabState {
  kind: LabKind;
  pointer: 'A' | 'B' | null;
  root: 'A' | 'B';
  phase: 'unallocated' | 'storage' | 'live' | 'destroyed';
  values: number[];
  capacity: number;
  generation: number;
  ownerA: boolean;
  ownerB: boolean;
  ownerC: boolean;
  address: number;
  alignment: number;
  scenario: string;
  handle: 'all' | 'after-erase' | 'after-growth';
  optional: number | null;
  tag: string;
  message: string;
}

export function initial(kind: LabKind): LabState {
  return { kind, pointer: 'A', root: 'A', phase: kind === 'alignment' ? 'storage' : 'unallocated', values: [10, 20], capacity: 2,
    generation: 0, ownerA: kind !== 'copy', ownerB: false, ownerC: false, address: 5, alignment: 4,
    scenario: 'valid', handle: 'all', optional: null, tag: '', message: 'Choose an action to inspect the state.' };
}

export function alignUp(address: number, alignment: number): number {
  if (!Number.isInteger(address) || address < 0 || !Number.isInteger(alignment) || alignment <= 0 || (alignment & (alignment - 1)) !== 0)
    throw new RangeError('A nonnegative address and power-of-two alignment are required.');
  return Math.ceil(address / alignment) * alignment;
}

export function floorCell(coordinate: number, width: number): number {
  if (!Number.isInteger(coordinate) || !Number.isInteger(width) || width <= 0) throw new RangeError('Integer coordinate and positive width required.');
  return Math.floor(coordinate / width);
}

export function step(state: LabState, action: string): LabState {
  if (action === 'reset') return initial(state.kind);
  switch (state.kind) {
    case 'pointer': {
      if (action === 'a' || action === 'b') {
        const pointer = action.toUpperCase() as 'A' | 'B';
        return { ...state, pointer, tag: action === 'a' ? 'point-a' : 'point-b', message: `p stores the illustrative address of object ${pointer}. It does not own that object.` };
      }
      if (action === 'null') return { ...state, pointer: null, tag: 'point-null', message: 'p is nullptr. No object can be read through it.' };
      if (action === 'read') return { ...state, tag: state.pointer ? 'inspect' : 'guard-null', message: state.pointer ? `The guard passes: p->value is ${state.pointer === 'A' ? 10 : 20}.` : 'The guard stops the dereference. *p and p->value would be invalid.' };
      return state;
    }
    case 'slot': {
      if (action === 'address') return { ...state, tag: 'address-slot', message: 'slot points to the root pointer field. *slot reads the pointer stored in root.' };
      if (action === 'replace') return { ...state, root: 'B', tag: 'replace-slot', message: '*slot = replacement updates root itself. The old A remains alive until the following delete; the slot still points to the same field.' };
      return state;
    }
    case 'lifetime': {
      const next: Record<string, [LabState['phase'], string, string] | undefined> = {
        allocate: state.phase === 'unallocated' ? ['storage', 'allocate', 'Raw storage exists; no Tracked object is alive.'] : undefined,
        construct: state.phase === 'storage' ? ['live', 'construct', 'Construction succeeded. The object is alive and its fields can be read.'] : undefined,
        destroy: state.phase === 'live' ? ['destroyed', 'destroy', 'The destructor ran. Storage remains, but reading Tracked fields is invalid.'] : undefined,
        release: state.phase === 'destroyed' || state.phase === 'storage' ? ['unallocated', 'release', 'Storage was released. The old pointer is dangling.'] : undefined,
      };
      const selected = next[action];
      return selected ? { ...state, phase: selected[0], tag: selected[1], message: selected[2] } : { ...state, message: 'That transition is unavailable from the current lifetime state.' };
    }
    case 'vector': {
      if (action === 'push') {
        const values = [...state.values, 10 * (state.values.length + 1)];
        const grows = values.length > state.capacity;
        return { ...state, values, capacity: grows ? Math.max(values.length, state.capacity * 2) : state.capacity,
          generation: state.generation + Number(grows), tag: grows ? 'grow' : 'size-two',
          message: grows ? 'Capacity was exhausted. This illustrated growth moved the allocation; every old pointer, reference, and iterator is invalid.' : 'push_back added a live element without reallocation. Existing element handles remain valid; the old end iterator is invalid.' };
      }
      if (action === 'pop' && state.values.length) return { ...state, values: state.values.slice(0, -1), tag: 'size-two', message: 'pop_back destroys the last vector element. Handles to that element and the old end are invalid; earlier element handles survive.' };
      return state;
    }
    case 'copy': {
      if (action === 'construct') return state.ownerA || state.ownerB || state.ownerC
        ? { ...state, message: 'Exit the current scope before starting another ownership trace.' }
        : { ...state, ownerA: true, tag: 'construct-a', message: 'Construct A: it owns resource α containing 7.' };
      if (action === 'copy' && state.ownerA) return { ...state, ownerB: true, tag: 'copy', message: 'B deep-copies A: each owns a different int allocation with value 7.' };
      if (action === 'move' && state.ownerA) return { ...state, ownerA: false, ownerC: true, tag: 'move', message: 'C takes A’s allocation. A remains a valid Buffer but now owns no int.' };
      if (action === 'destroy') return { ...state, ownerA: false, ownerB: false, ownerC: false, tag: 'destroy-owners', message: 'At scope exit, destructors release each remaining owned allocation exactly once.' };
      return { ...state, message: 'A no longer owns a resource to use for that operation.' };
    }
    case 'alignment': {
      if (state.phase === 'live' && (action === 'next' || action === 'toggle')) return { ...state, message: 'Destroy the live object before choosing a different storage position.' };
      if (action === 'next') return { ...state, address: state.address + 1, tag: 'align-up', message: 'The next raw address changes; valid aligned starts remain multiples of the requested alignment.' };
      if (action === 'toggle') return { ...state, alignment: state.alignment === 4 ? 8 : 4, tag: 'align-up', message: 'The alignment requirement changes the padding before the object may start.' };
      if (action === 'construct' && state.phase !== 'live') return { ...state, phase: 'live', tag: 'construct', message: 'construct_at starts the object lifetime in the aligned slot.' };
      if (action === 'destroy' && state.phase === 'live') return { ...state, phase: 'destroyed', tag: 'destroy', message: 'destroy_at ends the object lifetime; the aligned storage remains available.' };
      return state;
    }
    case 'contracts': {
      const scenarios: Record<string, [string, string] | undefined> = {
        valid: ['mutate', 'Valid request: the guard passes, push_back runs, and the size invariant still holds.'],
        full: ['guard', 'Full container: throw std::overflow_error before mutation. Caller may catch it; contents stay unchanged.'],
        broken: ['invariant', 'Broken internal invariant: assert reports a programmer error in a debug build. It is not user-input validation.'],
      };
      const selected = scenarios[action];
      return selected ? { ...state, scenario: action, tag: selected[0], message: selected[1] } : state;
    }
    case 'iterators': {
      if (action === 'erase') return { ...state, handle: 'after-erase', tag: 'erase-middle', message: 'erase at index 1 keeps the index-0 iterator valid. Iterators/references at or after index 1, including the old end, are invalid.' };
      if (action === 'grow') return { ...state, handle: 'after-growth', tag: 'grow', message: 'push_back beyond capacity reallocates. All existing element pointers, references, and iterators become invalid.' };
      return state;
    }
    case 'integer': {
      const examples: Record<string, [string, string] | undefined> = {
        midpoint: ['midpoint', 'low=8, high=12 → 8 + (12 − 8)/2 = 10. Subtract before adding to avoid overflow from low+high.'],
        wrap: ['wrap-index', '(4 + 1) % 5 = 0. Here the nonnegative, bounded operands make remainder a circular index.'],
        unsigned: ['guard-index', 'At i=0, i−1 would wrap for an unsigned size_t. Guard i>0 before computing a parent index.'],
        floor: ['floor-cell', 'C++: −1 / 4 = 0 and −1 % 4 = −1. Mathematical floor cell is −1, so adjust the quotient.'],
      };
      const selected = examples[action];
      return selected ? { ...state, scenario: action, tag: selected[0], message: selected[1] } : state;
    }
    case 'optional': {
      if (action === 'empty') return { ...state, optional: null, tag: 'absent', message: 'nullopt means absence. It is distinct from a present zero.' };
      if (action === 'zero' || action === 'two') return { ...state, optional: action === 'zero' ? 0 : 2, tag: 'present', message: `The optional is engaged and contains index ${action === 'zero' ? 0 : 2}.` };
      return state;
    }
  }
}
