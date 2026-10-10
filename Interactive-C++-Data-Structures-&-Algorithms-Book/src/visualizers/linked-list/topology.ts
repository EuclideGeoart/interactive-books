import type { Address, MemoryState } from '../../engine/types';
import { liveObject } from '../../engine/memory';

export function reachable(state: MemoryState): Address[] {
  const addresses: Address[] = [];
  let address = state.references.head ?? null;
  while (address !== null && !addresses.includes(address)) {
    const node = state.objects.find(item => item.address === address);
    if (!node || node.lifetime !== 'live') break;
    addresses.push(address);
    address = node.pointers.next ?? null;
  }
  return addresses;
}
export function listValues(state: MemoryState): number[] {
  return reachable(state).map(address => liveObject(state, address).data!);
}
export function asciiList(state: MemoryState): string {
  const addresses = reachable(state);
  const last = addresses.at(-1);
  const target = last ? liveObject(state, last).pointers.next : state.references.head;
  const end = target ? addresses.includes(target) ? `cycle to ${target}` : `invalid ${target}` : 'nullptr';
  return `head → ${addresses.map(address => `[${liveObject(state, address).data}] → `).join('')}${end}`;
}
