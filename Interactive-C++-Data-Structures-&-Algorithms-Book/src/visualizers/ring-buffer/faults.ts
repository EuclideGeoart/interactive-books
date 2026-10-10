import { ringState, ringTrace } from './model';
export const ringFaults = ['no-modulo', 'wrong-index', 'full-empty', 'overwrite-unread', 'empty-read'] as const;
export function ringFault(fault: string) {
  const before = ringState(fault === 'empty-read' ? [] : fault === 'full-empty' || fault === 'overwrite-unread' ? [10,20,30,40,50] : [20,30], fault === 'empty-read' ? 0 : 2);
  const broken = structuredClone(before); let detail = '';
  if (fault === 'no-modulo') { broken.tail = 5; detail = 'Missing modulo: tail becomes 5, outside [0,5). The next access would be out of bounds; no invalid memory access is executed here.'; }
  else if (fault === 'wrong-index') { broken.tail = (broken.tail+1)%5; broken.count--; detail = 'Confused read/write indices: dequeue moved tail, leaving the oldest unread value at head. Move head and then decrement count.'; }
  else if (fault === 'full-empty') { broken.count=0; detail = 'Full mistaken for empty: head == tail also holds with five unread values. Ignoring count loses every logical member.'; }
  else if (fault === 'overwrite-unread') { broken.data[broken.tail]=99; detail = 'Unread data overwritten under a reject contract: the oldest value is silently replaced. An explicit overwrite policy must first discard the oldest member and advance both indices.'; }
  else if (fault === 'empty-read') { detail = 'Empty read: raw storage is alive but contains no queue member. Check count before reading data[head].'; }
  else throw new Error('Unknown ring fault');
  const op = fault === 'wrong-index' || fault === 'empty-read' ? 'pop' : 'push';
  const correct = ringTrace(op, before,99).steps.at(-1)!.state;
  return { before, broken, correct, detail };
}
