import type { LabAdapter } from '../../components/controls/lab-types';
import type { TreeScene } from '../tree/types';
import { drawTree, inspectTree, describeTree } from '../tree/diagram';
import {
  trieState,
  trieTrace,
  trieInvariants,
  trieWords,
  type TrieState,
  type TrieEvent,
  type TrieOperation,
} from './model';
const address = (id: number | null) =>
  id === null ? null : `0x${(0xd100 + id * 0x80).toString(16).toUpperCase()}`;
export function trieScene(s: TrieState): TreeScene {
  const paths = new Map<number, string>();
  function visit(id: number | null, path: string) {
    if (id === null || paths.has(id) || !s.nodes[id]?.live) return;
    paths.set(id, path);
    for (const [c, child] of Object.entries(s.nodes[id]!.children))
      visit(child, path + c);
  }
  visit(s.root, '');
  return {
    root: address(s.root),
    nodes: s.nodes.map((n, i) => ({
      address: address(i)!,
      lifetime: n.live ? 'live' : 'freed',
      label: i === s.root ? 'root' : paths.get(i)?.slice(-1) || 'node',
      fields: n.live
        ? [
            { name: 'terminal', value: n.terminal },
            {
              name: 'children',
              value: Object.keys(n.children).sort().join(', '),
            },
            { name: 'path (derived)', value: paths.get(i) || 'ε' },
          ]
        : [],
      links: n.live
        ? Object.entries(n.children)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([c, child]) => ({
              name: c,
              target: address(child),
              structural: true,
            }))
        : [],
      badge: n.terminal ? 'WORD' : 'PREFIX',
    })),
    references: Object.fromEntries(
      Object.entries(s.refs).map(([k, v]) => [k, address(v)]),
    ),
    active: address(s.refs.current ?? null),
    visited: s.visited.map((id) => address(id)!),
    auxiliary: [
      { label: 'Call stack', entries: s.stack ?? [] },
      {
        label: 'Character position',
        entries: [
          `${s.position} / ${s.word.length}`,
          s.word || 'ε (empty word)',
        ],
      },
    ],
    output: trieWords(s).map((w) => w || 'ε'),
    result: s.result,
  };
}
export const trieAdapter: LabAdapter<TrieState, TrieEvent> = {
  build(op, inputs) {
    const raw = String(inputs.get('words') ?? 'cat,car,care,dog');
    const words = raw.trim()
      ? raw.split(',').map((w) => (w.trim() === 'ε' ? '' : w.trim()))
      : [];
    return trieTrace(
      op as TrieOperation,
      trieState(words),
      String(inputs.get('word') ?? 'car'),
    );
  },
  draw: (s, id, view, selected) => drawTree(trieScene(s), id, view, selected),
  inspect: (s, selected) => inspectTree(trieScene(s), selected),
  describe: (s) => describeTree(trieScene(s)),
  invariants: trieInvariants,
  regions: (op) =>
    op === 'insert'
      ? ['insert']
      : op === 'erase'
        ? ['erase', 'prune']
        : ['search', 'walk'],
  counters: (s) => [
    { label: 'Character / terminal checks', value: s.comparisons },
    { label: 'Field writes', value: s.writes },
    { label: 'Visited nodes', value: s.visited.length },
  ],
};
