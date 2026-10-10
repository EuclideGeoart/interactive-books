import type { LabAdapter } from '../../components/controls/lab-types';
import type { TreeScene } from '../tree/types';
import { drawTree, inspectTree, describeTree } from '../tree/diagram';
import {
  avlState,
  avlTrace,
  avlInvariants,
  type AvlState,
  type AvlEvent,
  type AvlOperation,
} from './model';
const address = (id: number | null) =>
  id === null ? null : `0x${(0xa100 + id * 0x90).toString(16).toUpperCase()}`;
export function avlScene(s: AvlState): TreeScene {
  return {
    root: address(s.root),
    nodes: s.nodes.map((n, i) => ({
      address: address(i)!,
      lifetime: n.live ? 'live' : 'freed',
      label: String(n.key),
      fields: n.live
        ? [
            { name: 'key', value: n.key },
            { name: 'height', value: n.height },
            {
              name: 'balance (derived)',
              value:
                (n.left === null ? 0 : s.nodes[n.left]!.height) -
                (n.right === null ? 0 : s.nodes[n.right]!.height),
            },
          ]
        : [],
      links: n.live
        ? [
            { name: 'left', target: address(n.left), structural: true },
            { name: 'right', target: address(n.right), structural: true },
          ]
        : [],
      badge: n.live ? `h=${n.height}` : 'freed',
    })),
    references: Object.fromEntries(
      Object.entries(s.refs).map(([k, v]) => [k, address(v)]),
    ),
    active: address(s.refs.current ?? s.refs.n ?? s.refs.x ?? null),
    visited: s.visited.map((id) => address(id)!),
    auxiliary: [{ label: 'Call stack', entries: s.stack ?? [] }],
    output: [],
    result: s.result,
  };
}
export const avlAdapter: LabAdapter<AvlState, AvlEvent> = {
  build(op, inputs) {
    const raw = String(inputs.get('values') ?? '30,20');
    if (raw.trim() && raw.split(',').some((v) => !/^\s*-?\d+\s*$/.test(v)))
      throw new Error('Use comma-separated integers.');
    const value = String(inputs.get('value') ?? '10');
    if (!/^-?\d+$/.test(value.trim()))
      throw new Error('Value must be an integer.');
    return avlTrace(
      op as AvlOperation,
      avlState(raw.trim() ? raw.split(',').map(Number) : []),
      Number(value),
    );
  },
  draw: (s, id, view, selected) => drawTree(avlScene(s), id, view, selected),
  inspect: (s, selected) => inspectTree(avlScene(s), selected),
  describe: (s) => describeTree(avlScene(s)),
  invariants: avlInvariants,
  regions: (op) =>
    op === 'search' ? ['search'] : [op, 'rebalance', 'rotations'],
  counters: (s) => [
    { label: 'Decision / balance checks', value: s.comparisons },
    { label: 'Field writes', value: s.writes },
    { label: 'Visited nodes', value: s.visited.length },
  ],
};
