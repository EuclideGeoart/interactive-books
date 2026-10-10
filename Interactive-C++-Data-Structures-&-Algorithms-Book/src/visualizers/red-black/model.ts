import type { Trace, Invariant } from '../../engine/types';
import { validNumbers } from '../avl/model';
export interface RedBlackNode {
  key: number;
  left: number | null;
  right: number | null;
  parent: number | null;
  red: boolean;
  live: boolean;
}
export interface RedBlackState {
  stack?: string[];
  nodes: RedBlackNode[];
  root: number | null;
  refs: Record<string, number | null>;
  visited: number[];
  comparisons: number;
  writes: number;
  result: string;
}
export interface RedBlackEvent {
  type:
    | 'AssignReference'
    | 'AssignPointer'
    | 'Construct'
    | 'Recolor'
    | 'Compare'
    | 'Return'
    | 'EndScope'
    | 'InvariantCheck';
}
export const redBlackOperations = ['insert', 'search'] as const;
export type RedBlackOperation = (typeof redBlackOperations)[number];
export function redBlackState(values: number[] = [30, 20]): RedBlackState {
  validNumbers(values);
  let s: RedBlackState = {
    nodes: [],
    root: null,
    refs: {},
    visited: [],
    comparisons: 0,
    writes: 0,
    result: '',
  };
  for (const v of values) s = redBlackTrace('insert', s, v).steps.at(-1)!.state;
  return { ...s, refs: {}, visited: [], comparisons: 0, writes: 0, result: '' };
}
export function redBlackTrace(
  op: RedBlackOperation,
  initial: RedBlackState,
  key = 10,
): Trace<RedBlackState, RedBlackEvent> {
  validNumbers([key]);
  if (!redBlackOperations.includes(op))
    throw new Error('Choose insert or search.');
  const s = structuredClone(initial);
  s.refs = {};
  s.visited = [];
  s.comparisons = 0;
  s.writes = 0;
  s.result = '';
  const t: Trace<RedBlackState, RedBlackEvent> = {
    initial: structuredClone(s),
    steps: [],
  };
  const emit = (tag: string, type: RedBlackEvent['type'], title: string) => {
    if (type === 'Compare') s.comparisons++;
    if (type === 'Recolor' || type === 'AssignPointer') s.writes++;
    t.steps.push({
      source: tag,
      event: { type },
      title,
      explanation: title,
      state: structuredClone(s),
    });
  };
  const ref = (name: string, id: number | null, tag: string) => {
    s.refs[name] = id;
    if (name === 'current' && id !== null) s.visited.push(id);
    emit(
      tag,
      'AssignReference',
      `${name} → ${id === null ? 'nullptr' : s.nodes[id]!.key}`,
    );
  };
  s.stack = [];
  const frame = <T>(
    label: string,
    refs: Record<string, number | null>,
    run: () => T,
  ): T => {
    const caller = s.refs;
    s.refs = refs;
    s.stack!.push(label);
    try {
      return run();
    } finally {
      s.refs = caller;
      s.stack!.pop();
      t.steps.push({
        source: null,
        event: { type: 'EndScope' },
        title: `Return from ${label}`,
        explanation:
          'Helper locals leave scope; restore the caller references.',
        state: structuredClone(s),
      });
    }
  };
  const red = (id: number | null) => id !== null && s.nodes[id]!.red;
  const color = (id: number, value: boolean, tag: string) => {
    s.nodes[id]!.red = value;
    emit(
      tag,
      'Recolor',
      `${s.nodes[id]!.key} becomes ${value ? 'red' : 'black'}`,
    );
  };
  const rotate = (x: number, leftward: boolean) =>
    frame('rotate', { x }, () => {
      s.refs.x = x;
      const side = leftward ? 'right' : 'left',
        other = leftward ? 'left' : 'right';
      const y = s.nodes[x]![side]!;
      ref('y', y, 'rb.rotate.pivot');
      const transfer = s.nodes[y]![other];
      ref('transfer', transfer, 'rb.rotate.transfer');
      s.nodes[x]![side] = transfer;
      emit(
        'rb.rotate.detach',
        'AssignPointer',
        'Move transfer subtree into old root child slot',
      );
      if (transfer !== null) {
        s.nodes[transfer]!.parent = x;
        emit(
          'rb.rotate.transfer-parent',
          'AssignPointer',
          'Repair transfer parent pointer',
        );
      }
      s.nodes[y]!.parent = s.nodes[x]!.parent;
      emit(
        'rb.rotate.parent',
        'AssignPointer',
        'Pivot borrows old root parent',
      );
      const parent = s.nodes[x]!.parent;
      if (parent === null) {
        s.root = y;
        emit('rb.rotate.root', 'AssignPointer', 'Publish new tree root');
      } else {
        s.nodes[parent]![s.nodes[parent]!.left === x ? 'left' : 'right'] = y;
        emit('rb.rotate.publish', 'AssignPointer', 'Parent now owns pivot');
      }
      s.nodes[y]![other] = x;
      emit('rb.rotate.attach', 'AssignPointer', 'Attach old root below pivot');
      s.nodes[x]!.parent = y;
      emit(
        'rb.rotate.old-parent',
        'AssignPointer',
        'Repair old root parent pointer',
      );
    });
  const fix = (start: number) =>
    frame('fix_insert', { n: start }, () => {
      let n = start;
      s.refs.n = n;
      while (n !== s.root && red(s.nodes[n]!.parent)) {
        let p = s.nodes[n]!.parent!;
        ref('P', p, 'rb.fix.parent');
        let g = s.nodes[p]!.parent!;
        ref('G', g, 'rb.fix.grandparent');
        const parentLeft = p === s.nodes[g]!.left;
        emit(
          'rb.fix.side',
          'Compare',
          `P is the ${parentLeft ? 'left' : 'right'} child of G`,
        );
        const u = parentLeft ? s.nodes[g]!.right : s.nodes[g]!.left;
        ref('U', u, 'rb.fix.uncle');
        if (red(u)) {
          color(p, false, 'rb.fix.parent-black');
          color(u!, false, 'rb.fix.uncle-black');
          color(g, true, 'rb.fix.grandparent-red');
          n = g;
          ref('n', n, 'rb.fix.ascend');
        } else {
          if (n === (parentLeft ? s.nodes[p]!.right : s.nodes[p]!.left)) {
            n = p;
            ref('n', n, 'rb.fix.triangle');
            rotate(n, parentLeft);
            p = s.nodes[n]!.parent!;
            ref('P', p, 'rb.fix.new-parent');
            g = s.nodes[p]!.parent!;
            ref('G', g, 'rb.fix.new-grandparent');
          }
          color(p, false, 'rb.fix.line-black');
          color(g, true, 'rb.fix.line-red');
          rotate(g, !parentLeft);
        }
        s.refs = { n };
      }
      color(s.root!, false, 'rb.fix.root-black');
    });
  if (op === 'insert') {
    let p: number | null = null;
    ref('p', p, 'rb.insert.parent');
    let current = s.root;
    ref('current', current, 'rb.insert.current');
    let duplicate = false;
    while (current !== null) {
      emit(
        'rb.insert.compare',
        'Compare',
        `Compare ${key} with ${s.nodes[current]!.key}`,
      );
      if (key === s.nodes[current]!.key) {
        duplicate = true;
        emit('rb.insert.duplicate', 'Return', 'Duplicate rejected');
        break;
      }
      p = current;
      ref('p', p, 'rb.insert.save-parent');
      current =
        key < s.nodes[current]!.key
          ? s.nodes[current]!.left
          : s.nodes[current]!.right;
      ref('current', current, 'rb.insert.advance');
    }
    if (!duplicate) {
      const created = s.nodes.length;
      s.nodes.push({
        key,
        left: null,
        right: null,
        parent: null,
        red: true,
        live: true,
      });
      s.refs.created = created;
      emit(
        'rb.insert.allocate',
        'Construct',
        'Allocate storage and construct a red leaf',
      );
      s.nodes[created]!.parent = p;
      emit('rb.insert.backlink', 'AssignPointer', 'Set actual parent pointer');
      if (p === null) {
        s.root = created;
        emit('rb.insert.root', 'AssignPointer', 'Publish root');
      } else {
        s.nodes[p]![key < s.nodes[p]!.key ? 'left' : 'right'] = created;
        emit(
          'rb.insert.publish',
          'AssignPointer',
          'Publish red leaf in parent child slot',
        );
      }
      fix(created);
      emit('rb.insert.added', 'Return', 'Inserted');
    }
    s.result = duplicate ? 'Duplicate rejected' : 'Inserted';
  } else {
    let current = s.root;
    ref('current', current, 'rb.search.start');
    while (current !== null) {
      emit(
        'rb.search.compare',
        'Compare',
        `Compare ${key} with ${s.nodes[current]!.key}`,
      );
      if (key === s.nodes[current]!.key) {
        emit('rb.search.found', 'Return', 'Found');
        break;
      }
      current =
        key < s.nodes[current]!.key
          ? s.nodes[current]!.left
          : s.nodes[current]!.right;
      ref('current', current, 'rb.search.advance');
    }
    if (current === null) emit('rb.search.missing', 'Return', 'Not found');
    s.result = current === null ? 'Not found' : 'Found';
  }
  s.refs = {};
  t.steps.push({
    source: null,
    event: { type: 'InvariantCheck' },
    title: 'Operation complete',
    explanation: s.result,
    state: structuredClone(s),
  });
  return t;
}
export function redBlackInvariants(
  s: RedBlackState,
  settled: boolean,
): Invariant[] {
  let topology = true,
    noRedRed = true,
    equalBlack = true;
  const seen = new Set<number>();
  function visit(
    id: number | null,
    parent: number | null,
    lo: number,
    hi: number,
  ): number {
    if (id === null) return 1;
    if (seen.has(id) || !s.nodes[id]?.live) {
      topology = false;
      return 1;
    }
    seen.add(id);
    const n = s.nodes[id]!;
    if (n.parent !== parent || n.key <= lo || n.key >= hi) topology = false;
    if (n.red && [n.left, n.right].some((x) => x !== null && s.nodes[x]?.red))
      noRedRed = false;
    const a = visit(n.left, id, lo, n.key),
      b = visit(n.right, id, n.key, hi);
    if (a !== b) equalBlack = false;
    return a + Number(!n.red);
  }
  visit(s.root, null, -Infinity, Infinity);
  if (seen.size !== s.nodes.filter((n) => n.live).length) topology = false;
  return [
    ['BST ordering and reciprocal parent links', topology],
    [
      'Every live node is red or black',
      s.nodes.every((n) => !n.live || typeof n.red === 'boolean'),
    ],
    ['Root is black', s.root === null || !s.nodes[s.root]?.red],
    ['Null leaves are black', true],
    ['Red nodes have black children', noRedRed],
    ['All null paths have equal black height', equalBlack],
  ].map(([name, ok]) => ({
    name: String(name),
    status: ok ? 'pass' : settled ? 'fail' : 'pending',
    detail: ok
      ? 'Holds in this snapshot.'
      : 'Repair is required before the operation boundary.',
  }));
}
export function redBlackSnapshot(s: RedBlackState) {
  return [
    s.root ?? -1,
    s.nodes.map((n) =>
      n.live
        ? [n.key, n.left ?? -1, n.right ?? -1, n.parent ?? -1, Number(n.red)]
        : null,
    ),
  ];
}
