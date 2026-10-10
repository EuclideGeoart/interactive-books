import type { Trace, Invariant } from '../../engine/types';
import { validNumbers } from '../avl/model';
export interface PageNode {
  leaf: boolean;
  keys: number[];
  children: number[];
  next: number | null;
  live: boolean;
}
export interface BTreeState {
  stack?: string[];
  kind: 'btree' | 'bplus';
  nodes: PageNode[];
  root: number | null;
  refs: Record<string, number | null>;
  visited: number[];
  comparisons: number;
  writes: number;
  result: string;
  output: number[];
}
export interface BTreeEvent {
  type:
    | 'AssignReference'
    | 'AssignPointer'
    | 'Construct'
    | 'Compare'
    | 'WriteKeys'
    | 'Return'
    | 'Visit'
    | 'EndScope'
    | 'InvariantCheck';
}
export type BTreeOperation = 'insert' | 'search' | 'range';
export function bTreeState(
  kind: 'btree' | 'bplus' = 'btree',
  values: number[] = [10, 20, 30],
): BTreeState {
  validNumbers(values);
  if (kind !== 'btree' && kind !== 'bplus')
    throw new Error('Choose B-tree or B+ tree.');
  let s: BTreeState = {
    kind,
    nodes: [],
    root: null,
    refs: {},
    visited: [],
    comparisons: 0,
    writes: 0,
    result: '',
    output: [],
  };
  for (const key of values)
    s = bTreeTrace('insert', s, key).steps.at(-1)!.state;
  return {
    ...s,
    refs: {},
    visited: [],
    comparisons: 0,
    writes: 0,
    result: '',
    output: [],
  };
}
export function bTreeTrace(
  op: BTreeOperation,
  initial: BTreeState,
  key = 40,
  high = 60,
): Trace<BTreeState, BTreeEvent> {
  validNumbers([key, high]);
  if (!['insert', 'search', 'range'].includes(op))
    throw new Error('Choose a page operation.');
  if (op === 'range' && initial.kind !== 'bplus')
    throw new Error('Select B+ tree for a linked-leaf range scan.');
  if (op === 'range' && key > high)
    throw new Error('Range lower bound must not exceed upper bound.');
  const s = structuredClone(initial);
  Object.assign(s, {
    refs: {},
    visited: [],
    comparisons: 0,
    writes: 0,
    result: '',
    output: [],
  });
  const trace: Trace<BTreeState, BTreeEvent> = {
    initial: structuredClone(s),
    steps: [],
  };
  const emit = (tag: string, type: BTreeEvent['type'], title: string) => {
    if (type === 'Compare') s.comparisons++;
    if (type === 'AssignPointer' || type === 'WriteKeys') s.writes++;
    trace.steps.push({
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
      `${name} → ${id === null ? 'nullptr' : `page ${id}`}`,
    );
  };
  const allocate = (leaf: boolean, tag: string) => {
    const id = s.nodes.length;
    s.nodes.push({ leaf, keys: [], children: [], next: null, live: true });
    s.refs.created = id;
    emit(tag, 'Construct', 'Allocate storage and construct an empty page');
    return id;
  };
  const upper = (keys: number[], value: number) => {
    const i = keys.findIndex((k) => k > value);
    return i < 0 ? keys.length : i;
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
      trace.steps.push({
        source: null,
        event: { type: 'EndScope' },
        title: `Return from ${label}`,
        explanation:
          'Helper locals leave scope; restore the caller references.',
        state: structuredClone(s),
      });
    }
  };
  const search = (): boolean =>
    frame('contains', {}, () => {
      let current = s.root;
      const p = s.kind === 'btree' ? 'bt' : 'bp';
      ref('current', current, `${p}.search.start`);
      if (s.kind === 'btree') {
        while (current !== null) {
          let index = 0;
          emit('bt.search.index', 'Compare', 'Start at key slot 0');
          const n = s.nodes[current]!;
          while (index < n.keys.length) {
            const advance = key > n.keys[index]!;
            emit(
              'bt.search.compare',
              'Compare',
              `${key} > ${n.keys[index]}: ${advance}`,
            );
            if (!advance) break;
            index++;
            emit('bt.search.advance', 'Visit', `Advance to key slot ${index}`);
          }
          if (index < n.keys.length && key === n.keys[index]) {
            emit('bt.search.found', 'Return', 'Record found in this page');
            return true;
          }
          current = n.leaf ? null : n.children[index]!;
          ref('current', current, 'bt.search.child');
        }
        emit('bt.search.missing', 'Return', 'Not found');
        return false;
      }
      while (current !== null && !s.nodes[current]!.leaf) {
        const index = upper(s.nodes[current]!.keys, key);
        emit(
          'bp.search.index',
          'Compare',
          `upper_bound chooses child ${index}; equality goes right`,
        );
        current = s.nodes[current]!.children[index]!;
        ref('current', current, 'bp.search.child');
      }
      const found = current !== null && s.nodes[current]!.keys.includes(key);
      emit(
        'bp.search.compare',
        'Compare',
        found ? 'Leaf contains record' : 'Leaf does not contain record',
      );
      emit('bp.search.return', 'Return', found ? 'Found' : 'Not found');
      return found;
    });
  const split = (parent: number, index: number) =>
    frame('split', { parent }, () => {
      const full = s.nodes[parent]!.children[index]!;
      ref('full', full, 'bt.split.full');
      const median = s.nodes[full]!.keys[1]!;
      emit('bt.split.median', 'Compare', `Save median ${median} for promotion`);
      const created = allocate(s.nodes[full]!.leaf, 'bt.split.allocate');
      s.nodes[created]!.keys = s.nodes[full]!.keys.slice(2);
      emit(
        'bt.split.right-keys',
        'WriteKeys',
        'Copy high keys to right sibling',
      );
      if (!s.nodes[full]!.leaf) {
        s.nodes[created]!.children = s.nodes[full]!.children.slice(2);
        emit(
          'bt.split.right-children',
          'AssignPointer',
          'Copy high child links to right sibling',
        );
        s.nodes[full]!.children.length = 2;
        emit(
          'bt.split.left-children',
          'AssignPointer',
          'Keep low child links in left page',
        );
      }
      s.nodes[full]!.keys.length = 1;
      emit(
        'bt.split.left-keys',
        'WriteKeys',
        'Remove promoted and high keys from left page',
      );
      s.nodes[parent]!.keys.splice(index, 0, median);
      emit('bt.split.promote', 'WriteKeys', 'Move median record into parent');
      s.nodes[parent]!.children.splice(index + 1, 0, created);
      emit(
        'bt.split.publish',
        'AssignPointer',
        'Publish right sibling child link',
      );
    });
  const addB = (current: number): void =>
    frame('add', { current }, () => {
      s.refs.current = current;
      let index = 0;
      emit('bt.add.index', 'Compare', 'Start at key slot 0');
      while (index < s.nodes[current]!.keys.length) {
        const advance = key > s.nodes[current]!.keys[index]!;
        emit(
          'bt.add.compare',
          'Compare',
          `Compare ${key} with ${s.nodes[current]!.keys[index]}`,
        );
        if (!advance) break;
        index++;
        emit('bt.add.advance', 'Visit', `Advance to slot ${index}`);
      }
      if (s.nodes[current]!.leaf) {
        s.nodes[current]!.keys.splice(index, 0, key);
        emit(
          'bt.add.leaf',
          'WriteKeys',
          'Insert record in sorted leaf position',
        );
      } else {
        if (s.nodes[s.nodes[current]!.children[index]!]!.keys.length === 3) {
          split(current, index);
          if (key > s.nodes[current]!.keys[index]!) {
            index++;
            emit(
              'bt.add.after-split',
              'Compare',
              'New key belongs to right split page',
            );
          }
        }
        const child = s.nodes[current]!.children[index]!;
        ref('child', child, 'bt.add.child');
        addB(child);
      }
    });
  const splitPlus = (parent: number, index: number) =>
    frame('split', { parent }, () => {
      const full = s.nodes[parent]!.children[index]!;
      ref('full', full, 'bp.split.full');
      const n = s.nodes[full]!,
        separator = n.keys[1]!;
      emit('bp.split.separator', 'Compare', `Save separator ${separator}`);
      const created = allocate(n.leaf, 'bp.split.allocate');
      s.nodes[created]!.keys = n.keys.slice(n.leaf ? 1 : 2);
      emit(
        'bp.split.right-keys',
        'WriteKeys',
        n.leaf
          ? 'Copy high records to right leaf'
          : 'Move high separators to right page',
      );
      if (n.leaf) {
        s.nodes[created]!.next = n.next;
        emit(
          'bp.split.next',
          'AssignPointer',
          'Right leaf inherits old next link',
        );
        n.next = created;
        emit('bp.split.link', 'AssignPointer', 'Link left leaf to right leaf');
      } else {
        s.nodes[created]!.children = n.children.slice(2);
        emit(
          'bp.split.right-children',
          'AssignPointer',
          'Transfer high child links',
        );
        n.children.length = 2;
        emit('bp.split.left-children', 'AssignPointer', 'Keep low child links');
      }
      n.keys.length = 1;
      emit('bp.split.left-keys', 'WriteKeys', 'Keep low keys in left page');
      s.nodes[parent]!.keys.splice(index, 0, separator);
      emit(
        'bp.split.promote',
        'WriteKeys',
        'Publish routing separator in parent',
      );
      s.nodes[parent]!.children.splice(index + 1, 0, created);
      emit('bp.split.publish', 'AssignPointer', 'Publish right page link');
    });
  const addPlus = (current: number): void =>
    frame('add', { current }, () => {
      s.refs.current = current;
      let index = upper(s.nodes[current]!.keys, key);
      emit('bp.add.index', 'Compare', `upper_bound chooses slot ${index}`);
      if (s.nodes[current]!.leaf) {
        s.nodes[current]!.keys.splice(index, 0, key);
        emit('bp.add.record', 'WriteKeys', 'Insert record into leaf');
      } else {
        if (s.nodes[s.nodes[current]!.children[index]!]!.keys.length === 3) {
          splitPlus(current, index);
          if (key >= s.nodes[current]!.keys[index]!) {
            index++;
            emit(
              'bp.add.after-split',
              'Compare',
              'Equality and greater values go to right page',
            );
          }
        }
        const child = s.nodes[current]!.children[index]!;
        ref('child', child, 'bp.add.child');
        addPlus(child);
      }
    });
  if (op === 'search') s.result = search() ? 'Found' : 'Not found';
  else if (op === 'insert') {
    const duplicate = search();
    const p = s.kind === 'btree' ? 'bt' : 'bp';
    if (duplicate) {
      emit(
        `${p}.insert.duplicate`,
        'Return',
        'Duplicate rejected; set semantics',
      );
      s.result = 'Duplicate rejected';
    } else {
      if (s.root === null) {
        const created = allocate(true, `${p}.insert.allocate`);
        s.root = created;
        emit(`${p}.insert.root`, 'AssignPointer', 'Publish first leaf root');
        delete s.refs.created;
      }
      if (s.kind === 'btree') {
        if (s.nodes[s.root]!.keys.length === 3) {
          const created = allocate(false, 'bt.insert.new-root');
          s.nodes[created]!.children.push(s.root);
          emit(
            'bt.insert.save-root',
            'AssignPointer',
            'New root temporarily holds old root',
          );
          split(created, 0);
          s.root = created;
          emit(
            'bt.insert.publish-root',
            'AssignPointer',
            'Publish taller root after completing split',
          );
          delete s.refs.created;
        }
        addB(s.root);
      } else {
        if (s.nodes[s.root]!.keys.length === 3) {
          const created = allocate(false, 'bp.insert.new-root');
          s.nodes[created]!.children.push(s.root);
          emit('bp.insert.left', 'AssignPointer', 'New root holds old root');
          splitPlus(created, 0);
          s.root = created;
          emit(
            'bp.insert.publish',
            'AssignPointer',
            'Publish taller root after complete split',
          );
          delete s.refs.created;
        }
        addPlus(s.root);
      }
      emit(`${p}.insert.added`, 'Return', 'Inserted');
      s.result = 'Inserted';
    }
  } else {
    let current = s.root;
    ref('current', current, 'bp.range.start');
    while (current !== null && !s.nodes[current]!.leaf) {
      const index = upper(s.nodes[current]!.keys, key);
      emit(
        'bp.range.index',
        'Compare',
        `Locate first leaf through child ${index}`,
      );
      current = s.nodes[current]!.children[index]!;
      ref('current', current, 'bp.range.child');
    }
    let stopped = false;
    while (current !== null && !stopped) {
      for (const record of s.nodes[current]!.keys) {
        if (record > high) {
          emit(
            'bp.range.stop',
            'Return',
            'Stop at first record above upper bound',
          );
          stopped = true;
          break;
        }
        if (record >= key) {
          s.output.push(record);
          emit('bp.range.record', 'Visit', `Emit record ${record}`);
        }
      }
      if (!stopped) {
        current = s.nodes[current]!.next;
        ref('current', current, 'bp.range.next');
      }
    }
    if (!stopped)
      emit('bp.range.return', 'Return', 'Reached end of linked leaves');
    s.result = `Range [${s.output.join(', ')}]`;
  }
  s.refs = {};
  trace.steps.push({
    source: null,
    event: { type: 'InvariantCheck' },
    title: 'Operation complete',
    explanation: s.result,
    state: structuredClone(s),
  });
  return trace;
}
export function bTreeInvariants(s: BTreeState, settled: boolean): Invariant[] {
  let ownership = true,
    order = true,
    capacity = true,
    arity = true,
    depth = true,
    separators = true,
    leafLinks = true;
  const seen = new Set<number>(),
    leaves: number[] = [];
  let leafDepth = -1;
  function visit(id: number, lo: number, hi: number, level: number): number[] {
    if (seen.has(id) || !s.nodes[id]?.live) {
      ownership = false;
      return [];
    }
    seen.add(id);
    const n = s.nodes[id]!;
    if (n.keys.length < 1 || n.keys.length > 3) capacity = false;
    if (
      n.keys.some(
        (v, i) =>
          v < lo ||
          v >= hi ||
          (s.kind === 'btree' && v === lo) ||
          (i > 0 && n.keys[i - 1]! >= v),
      )
    )
      order = false;
    if (n.leaf) {
      if (n.children.length) arity = false;
      if (leafDepth < 0) leafDepth = level;
      else if (leafDepth !== level) depth = false;
      leaves.push(id);
      return n.keys;
    }
    if (n.children.length !== n.keys.length + 1) arity = false;
    let records: number[] = [];
    n.children.forEach((child, i) => {
      const keys = visit(
        child,
        i ? n.keys[i - 1]! : lo,
        i < n.keys.length ? n.keys[i]! : hi,
        level + 1,
      );
      if (s.kind === 'bplus' && i && n.keys[i - 1] !== keys[0])
        separators = false;
      records.push(...keys);
      if (s.kind === 'btree' && i < n.keys.length) records.push(n.keys[i]!);
    });
    return records;
  }
  if (s.root !== null) visit(s.root, -Infinity, Infinity, 0);
  if (seen.size !== s.nodes.filter((n) => n.live).length) ownership = false;
  if (s.kind === 'bplus')
    leaves.forEach((id, i) => {
      if (s.nodes[id]!.next !== (leaves[i + 1] ?? null)) leafLinks = false;
    });
  return [
    ['Unique ownership without cycles', ownership],
    ['Sorted keys and child ranges', order],
    ['Page occupancy bounds', capacity],
    ['Internal child count = key count + 1', arity],
    ['All leaves have equal depth', depth],
    ...(s.kind === 'bplus'
      ? [
          ['Separators equal right-subtree minima', separators],
          ['Leaf links match sorted leaf order', leafLinks],
        ]
      : []),
  ].map(([name, ok]) => ({
    name: String(name),
    status: ok ? 'pass' : settled ? 'fail' : 'pending',
    detail: ok
      ? 'Holds in this snapshot.'
      : 'A split has intermediate states; all rules must hold on return.',
  }));
}
export function bTreeSnapshot(s: BTreeState) {
  return [
    s.root ?? -1,
    s.nodes.map((n) =>
      n.live
        ? [
            Number(n.leaf),
            n.keys,
            n.children,
            ...(s.kind === 'bplus' ? [n.next ?? -1] : []),
          ]
        : null,
    ),
  ];
}
