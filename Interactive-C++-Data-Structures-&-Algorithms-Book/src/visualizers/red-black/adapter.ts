import type { LabAdapter } from '../../components/controls/lab-types';
import type { TreeScene } from '../tree/types';
import { drawTree, inspectTree, describeTree } from '../tree/diagram';
import {
  redBlackState,
  redBlackTrace,
  redBlackInvariants,
  type RedBlackState,
  type RedBlackEvent,
  type RedBlackOperation,
} from './model';
const address = (id: number | null) =>
  id === null ? null : `0x${(0xb100 + id * 0xa0).toString(16).toUpperCase()}`;
export function redBlackScene(s: RedBlackState): TreeScene {
  return {
    root: address(s.root),
    nodes: s.nodes.map((n, i) => ({
      address: address(i)!,
      lifetime: n.live ? 'live' : 'freed',
      label: String(n.key),
      fields: n.live
        ? [
            { name: 'key', value: n.key },
            { name: 'color', value: n.red ? 'red' : 'black' },
          ]
        : [],
      links: n.live
        ? [
            { name: 'left', target: address(n.left), structural: true },
            { name: 'right', target: address(n.right), structural: true },
            { name: 'parent', target: address(n.parent), structural: false },
          ]
        : [],
      tone: n.red ? 'red' : 'black',
      badge: n.red ? 'RED' : 'BLACK',
    })),
    references: Object.fromEntries(
      Object.entries(s.refs).map(([k, v]) => [k, address(v)]),
    ),
    active: address(s.refs.n ?? s.refs.current ?? null),
    visited: s.visited.map((id) => address(id)!),
    auxiliary: [{ label: 'Call stack', entries: s.stack ?? [] }],
    output: [],
    result: s.result,
  };
}
export const redBlackAdapter: LabAdapter<RedBlackState, RedBlackEvent> = {
  build(op, inputs) {
    const raw = String(inputs.get('values') ?? '30,20');
    if (raw.trim() && raw.split(',').some((v) => !/^\s*-?\d+\s*$/.test(v)))
      throw new Error('Use comma-separated integers.');
    const value = String(inputs.get('value') ?? '10');
    if (!/^-?\d+$/.test(value.trim()))
      throw new Error('Value must be an integer.');
    return redBlackTrace(
      op as RedBlackOperation,
      redBlackState(raw.trim() ? raw.split(',').map(Number) : []),
      Number(value),
    );
  },
  draw: (s, id, view, selected) =>
    drawTree(redBlackScene(s), id, view, selected),
  inspect: (s, selected) => inspectTree(redBlackScene(s), selected),
  describe: (s) => describeTree(redBlackScene(s)),
  invariants: redBlackInvariants,
  regions: (op) =>
    op === 'search' ? ['search'] : ['insert', 'repair', 'rotations'],
  counters: (s) => [
    { label: 'Comparisons', value: s.comparisons },
    { label: 'Field / color writes', value: s.writes },
    { label: 'Visited nodes', value: s.visited.length },
  ],
};
