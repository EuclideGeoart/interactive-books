import type { Invariant, MemoryState } from '../../engine/types';
import { reachable } from './topology';

export function checkInvariants(state: MemoryState, settled: boolean): Invariant[] {
  const seen = new Set<string>();
  let pointer = state.references.head ?? null;
  let cycle = false;
  let invalid = false;
  while (pointer !== null) {
    if (seen.has(pointer)) { cycle = true; break; }
    seen.add(pointer);
    const node = state.objects.find(item => item.address === pointer);
    if (!node || node.lifetime !== 'live') { invalid = true; break; }
    pointer = node.pointers.next ?? null;
  }
  const live = state.objects.filter(node => node.lifetime === 'live');
  const reached = reachable(state);
  const detached = live.filter(node => !reached.includes(node.address));
  const invalidLink = live.some(node => Object.values(node.pointers).some(target =>
    target !== null && !state.objects.some(other => other.address === target && other.lifetime === 'live')));
  const scopeReferences = Object.entries(state.references).filter(([name]) => name !== 'head');
  const dangling = scopeReferences.filter(([, target]) => target !== null &&
    !state.objects.some(node => node.address === target && node.lifetime === 'live'));
  return [
    { name: 'Head agrees with empty state', status: live.length === 0 && state.references.head !== null ? 'fail' : 'pass', detail: live.length ? 'Live storage is tracked independently of head.' : 'No live nodes; head must be nullptr.' },
    { name: 'Traversal reaches nullptr', status: cycle || invalid ? 'fail' : 'pass', detail: cycle ? 'A repeated address forms a cycle.' : invalid ? 'Traversal reaches storage without a live object.' : 'Following next terminates safely.' },
    { name: 'Every live node is reachable', status: detached.length ? settled ? 'fail' : 'pending' : 'pass', detail: detached.length ? `${detached.length} detached node(s). ${settled ? 'Ownership has been lost.' : 'Temporary during this operation.'}` : 'All live objects belong to the chain.' },
    { name: 'Links point to live objects', status: invalidLink || invalid ? 'fail' : 'pass', detail: invalidLink || invalid ? 'A structural pointer targets invalid storage.' : 'Every next field is live or nullptr.' },
    { name: 'Local pointers are safe to read', status: dangling.length ? 'pending' : 'pass', detail: dangling.length ? `${dangling.map(([name]) => name).join(', ')} dangle. Never dereference; scope ends next.` : 'No dangling local references.' },
  ];
}
