import type { LabAdapter } from '../../components/controls/lab-types';
import type { TreeScene } from '../tree/types';
import { drawTree, inspectTree, describeTree } from '../tree/diagram';
import {
  bTreeState,
  bTreeTrace,
  bTreeInvariants,
  type BTreeState,
  type BTreeEvent,
  type BTreeOperation,
} from './model';
const address = (id: number | null) =>
  id === null ? null : `0x${(0xc100 + id * 0x180).toString(16).toUpperCase()}`;
export function bTreeScene(s: BTreeState): TreeScene {
  return {
    root: address(s.root),
    nodes: s.nodes.map((n, i) => ({
      address: address(i)!,
      lifetime: n.live ? 'live' : 'freed',
      label: n.keys.length ? n.keys.join(' | ') : 'empty page',
      fields: n.live
        ? [
            {
              name: n.leaf
                ? 'keys (leaf records)'
                : s.kind === 'bplus'
                  ? 'keys (separators)'
                  : 'keys',
              value: n.keys.join(', '),
            },
            { name: 'leaf', value: n.leaf },
            { name: 'key count (derived)', value: n.keys.length },
          ]
        : [],
      links: n.live
        ? [
            ...n.children.map((child, j) => ({
              name: `child[${j}]`,
              target: address(child),
              structural: true,
            })),
            ...(s.kind === 'bplus'
              ? [{ name: 'next', target: address(n.next), structural: false }]
              : []),
          ]
        : [],
      badge: n.leaf ? 'LEAF' : s.kind === 'bplus' ? 'ROUTING' : 'PAGE',
    })),
    references: Object.fromEntries(
      Object.entries(s.refs).map(([k, v]) => [k, address(v)]),
    ),
    active: address(s.refs.current ?? s.refs.full ?? null),
    visited: s.visited.map((id) => address(id)!),
    auxiliary: [{ label: 'Call stack', entries: s.stack ?? [] }],
    output: s.output.map(String),
    result: s.result,
  };
}
export const bTreeAdapter: LabAdapter<BTreeState, BTreeEvent> = {
  build(op, inputs) {
    const raw = String(inputs.get('values') ?? '10,20,30');
    if (raw.trim() && raw.split(',').some((v) => !/^\s*-?\d+\s*$/.test(v)))
      throw new Error('Use comma-separated integers.');
    const value = String(inputs.get('value') ?? '40'),
      high = String(inputs.get('high') ?? '60');
    if (!/^-?\d+$/.test(value.trim()) || !/^-?\d+$/.test(high.trim()))
      throw new Error('Use integer bounds.');
    return bTreeTrace(
      op as BTreeOperation,
      bTreeState(
        String(inputs.get('kind') ?? 'btree') as 'btree' | 'bplus',
        raw.trim() ? raw.split(',').map(Number) : [],
      ),
      Number(value),
      Number(high),
    );
  },
  draw: (s, id, view, selected) => drawTree(bTreeScene(s), id, view, selected),
  inspect: (s, selected) => inspectTree(bTreeScene(s), selected),
  describe: (s) => describeTree(bTreeScene(s)),
  invariants: bTreeInvariants,
  regions: (op) =>
    op === 'range'
      ? ['range']
      : op === 'search'
        ? ['search']
        : ['insert', 'search', 'descend', 'split'],
  counters: (s) => [
    { label: 'Decision / index steps', value: s.comparisons },
    { label: 'Page field writes', value: s.writes },
    { label: 'Page visits', value: s.visited.length },
  ],
};
