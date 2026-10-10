import { queueState, queueTrace } from './model';
export const queueFaults = ['wrong-end', 'wrong-shift', 'miss-count', 'empty-read'] as const;
export function queueFault(fault: string) {
  const before = queueState(fault === 'miss-count' ? [10] : fault === 'empty-read' ? [] : [10,20,30]);
  const broken = structuredClone(before);
  let detail = '';
  if (fault === 'wrong-end') { broken.count--; detail = 'FIFO broken: removing back discards 30. A queue must remove 10; a deque may intentionally remove either end.'; }
  else if (fault === 'wrong-shift') { for (let i=broken.count;i>0;i--) broken.data[i-1]=broken.data[i] ?? 0; broken.count--; detail = 'Wrong traversal direction propagates the outside slot left. Dequeue must copy leftward in increasing source-index order.'; }
  else if (fault === 'miss-count') { detail = 'Singleton removal forgot --count. The deque still reports one member and exposes 10 after its intended removal.'; }
  else if (fault === 'empty-read') { detail = 'Underflow: data[0] is a live int, but it is not a queue member. A zero raw value does not prove an element exists.'; }
  else throw new Error('Unknown queue fault');
  const correct = queueTrace('pop-front', before).steps.at(-1)!.state;
  return { before, broken, correct, detail };
}
