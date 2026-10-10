import type { Trace, Invariant } from '../../engine/types';
export interface AvlNode {
  key: number;
  left: number | null;
  right: number | null;
  height: number;
  live: boolean;
}
export interface AvlState {
  stack?: string[];
  nodes: AvlNode[];
  root: number | null;
  refs: Record<string, number | null>;
  visited: number[];
  comparisons: number;
  writes: number;
  result: string;
}
export interface AvlEvent {
  type:
    | 'AssignReference'
    | 'AssignPointer'
    | 'Construct'
    | 'Free'
    | 'Compare'
    | 'Height'
    | 'Return'
    | 'EndScope'
    | 'InvariantCheck';
}
export const avlOperations = ['insert', 'erase', 'search'] as const;
export type AvlOperation = (typeof avlOperations)[number];
export function validNumbers(values: number[], limit = 24) {
  if (
    values.length > limit ||
    values.some((v) => !Number.isInteger(v) || Math.abs(v) > 999)
  )
    throw new Error(`Use at most ${limit} integers from −999 to 999.`);
}
export function avlState(values: number[] = [30, 20]): AvlState {
  validNumbers(values);
  let s: AvlState = {
    nodes: [],
    root: null,
    refs: {},
    visited: [],
    comparisons: 0,
    writes: 0,
    result: '',
  };
  for (const key of values) s = avlTrace('insert', s, key).steps.at(-1)!.state;
  return { ...s, refs: {}, visited: [], comparisons: 0, writes: 0, result: '' };
}
export function avlTrace(
  operation: AvlOperation,
  initial: AvlState,
  key = 10,
): Trace<AvlState, AvlEvent> {
  validNumbers([key]);
  if (!avlOperations.includes(operation))
    throw new Error('Choose insert, erase, or search.');
  const s = structuredClone(initial);
  s.refs = {};
  s.visited = [];
  s.comparisons = 0;
  s.writes = 0;
  s.result = '';
  const trace: Trace<AvlState, AvlEvent> = {
    initial: structuredClone(s),
    steps: [],
  };
  const emit = (tag: string, type: AvlEvent['type'], title: string) => {
    if (type === 'Compare') s.comparisons++;
    if (['AssignPointer', 'Height'].includes(type)) s.writes++;
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
    if (id !== null && name === 'current') s.visited.push(id);
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
  const h = (id: number | null) => (id === null ? 0 : s.nodes[id]!.height);
  const balance = (id: number | null) =>
    id === null ? 0 : h(s.nodes[id]!.left) - h(s.nodes[id]!.right);
  type Slot = { parent: number | null; side: 'left' | 'right' };
  const get = (slot: Slot) =>
    slot.parent === null ? s.root : s.nodes[slot.parent]![slot.side];
  const set = (slot: Slot, id: number | null) => {
    if (slot.parent === null) s.root = id;
    else s.nodes[slot.parent]![slot.side] = id;
  };
  const rotate = (x: number, direction: 'left' | 'right'): number =>
    frame(`rotate ${direction}`, { x }, () => {
      const p = `avl.${direction}`,
        side = direction === 'right' ? 'left' : 'right',
        opposite = direction;
      const y = s.nodes[x]![side]!;
      ref('y', y, p + '.pivot');
      const transfer = s.nodes[y]![opposite];
      ref('transfer', transfer, p + '.transfer');
      s.nodes[x]![side] = transfer;
      emit(
        p + '.detach',
        'AssignPointer',
        'Transfer the middle subtree to the old root',
      );
      s.nodes[y]![opposite] = x;
      emit(
        p + '.attach',
        'AssignPointer',
        'Attach the old root under the pivot',
      );
      s.nodes[x]!.height =
        1 + Math.max(h(s.nodes[x]!.left), h(s.nodes[x]!.right));
      emit(p + '.old-height', 'Height', 'Recompute old root height first');
      s.nodes[y]!.height =
        1 + Math.max(h(s.nodes[y]!.left), h(s.nodes[y]!.right));
      emit(p + '.new-height', 'Height', 'Recompute pivot height');
      emit(
        p + '.return',
        'Return',
        'Return the new subtree root; caller has not published it yet',
      );
      return y;
    });
  const repair = (slot: Slot) =>
    frame('repair', {}, () => {
      const n = get(slot);
      ref('n', n, 'avl.repair.node');
      if (n === null) return;
      s.nodes[n]!.height =
        1 + Math.max(h(s.nodes[n]!.left), h(s.nodes[n]!.right));
      emit('avl.repair.height', 'Height', 'Refresh stored height');
      const b = balance(n);
      emit('avl.repair.balance', 'Compare', `Balance factor = ${b}`);
      if (b > 1) {
        if (balance(s.nodes[n]!.left) < 0) {
          s.nodes[n]!.left = rotate(s.nodes[n]!.left!, 'left');
          emit(
            'avl.repair.lr',
            'AssignPointer',
            'Publish the first rotation of LR',
          );
        }
        set(slot, rotate(n, 'right'));
        emit(
          'avl.repair.right',
          'AssignPointer',
          'Publish rotated subtree in its owning slot',
        );
      } else if (b < -1) {
        if (balance(s.nodes[n]!.right) > 0) {
          s.nodes[n]!.right = rotate(s.nodes[n]!.right!, 'right');
          emit(
            'avl.repair.rl',
            'AssignPointer',
            'Publish the first rotation of RL',
          );
        }
        set(slot, rotate(n, 'left'));
        emit(
          'avl.repair.left',
          'AssignPointer',
          'Publish rotated subtree in its owning slot',
        );
      }
    });
  const add = (slot: Slot): boolean =>
    frame('insert', {}, () => {
      const current = get(slot);
      ref('current', current, 'avl.insert.current');
      if (current === null) {
        const created = s.nodes.length;
        s.nodes.push({ key, left: null, right: null, height: 1, live: true });
        s.refs.created = created;
        emit(
          'avl.insert.allocate',
          'Construct',
          'Allocate storage and construct a leaf',
        );
        set(slot, created);
        emit(
          'avl.insert.publish',
          'AssignPointer',
          'Publish newly constructed leaf',
        );
        emit('avl.insert.added', 'Return', 'Inserted');
        return true;
      }
      if (key === s.nodes[current]!.key) {
        emit(
          'avl.insert.duplicate',
          'Return',
          'Duplicate rejected; set unchanged',
        );
        return false;
      }
      const smaller = key < s.nodes[current]!.key;
      emit(
        'avl.insert.compare',
        'Compare',
        `${key} ${smaller ? '<' : '>'} ${s.nodes[current]!.key}`,
      );
      const changed = add({
        parent: current,
        side: smaller ? 'left' : 'right',
      });
      repair(slot);
      return changed;
    });
  const remove = (slot: Slot, value: number): boolean =>
    frame('erase', {}, () => {
      const current = get(slot);
      ref('current', current, 'avl.erase.current');
      if (current === null) {
        emit('avl.erase.missing', 'Return', 'Key absent');
        return false;
      }
      const smaller = value < s.nodes[current]!.key;
      emit(
        'avl.erase.compare',
        'Compare',
        `Compare ${value} with ${s.nodes[current]!.key}`,
      );
      let changed: boolean;
      if (value !== s.nodes[current]!.key)
        changed = remove(
          { parent: current, side: smaller ? 'left' : 'right' },
          value,
        );
      else {
        const n = s.nodes[current]!;
        if (n.left === null || n.right === null) {
          set(slot, n.left ?? n.right);
          emit('avl.erase.bypass', 'AssignPointer', 'Bypass removed node');
          n.live = false;
          emit(
            'avl.erase.delete',
            'Free',
            'Destroy node and release allocation; fields are no longer readable',
          );
          emit('avl.erase.removed', 'Return', 'Removed');
          return true;
        }
        let successor = n.right;
        ref('successor', successor, 'avl.erase.successor');
        while (s.nodes[successor]!.left !== null) {
          successor = s.nodes[successor]!.left!;
          ref('successor', successor, 'avl.erase.advance');
        }
        n.key = s.nodes[successor]!.key;
        emit(
          'avl.erase.copy',
          'AssignPointer',
          'Copy successor key; allocation identity is unchanged',
        );
        changed = remove({ parent: current, side: 'right' }, n.key);
      }
      repair(slot);
      return changed;
    });
  if (operation === 'insert')
    s.result = add({ parent: null, side: 'left' })
      ? 'Inserted'
      : 'Duplicate rejected';
  else if (operation === 'erase')
    s.result = remove({ parent: null, side: 'left' }, key)
      ? 'Removed'
      : 'Not found';
  else {
    let current = s.root;
    ref('current', current, 'avl.search.start');
    while (current !== null) {
      const n = s.nodes[current]!;
      emit(
        'avl.search.compare',
        'Compare',
        `${key} == ${n.key}: ${key === n.key}`,
      );
      if (key === n.key) {
        emit('avl.search.found', 'Return', 'Found');
        break;
      }
      current = key < n.key ? n.left : n.right;
      ref('current', current, 'avl.search.advance');
    }
    if (current === null) emit('avl.search.missing', 'Return', 'Not found');
    s.result = current === null ? 'Not found' : 'Found';
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
export function avlInvariants(s: AvlState, settled: boolean): Invariant[] {
  let ordered = true,
    heights = true,
    balanced = true;
  const seen = new Set<number>();
  function visit(id: number | null, lo: number, hi: number): number {
    if (id === null) return 0;
    if (seen.has(id) || !s.nodes[id]?.live) {
      ordered = false;
      return 0;
    }
    seen.add(id);
    const n = s.nodes[id]!;
    if (n.key <= lo || n.key >= hi) ordered = false;
    const a = visit(n.left, lo, n.key),
      b = visit(n.right, n.key, hi);
    if (n.height !== 1 + Math.max(a, b)) heights = false;
    if (Math.abs(a - b) > 1) balanced = false;
    return 1 + Math.max(a, b);
  }
  visit(s.root, -Infinity, Infinity);
  if (seen.size !== s.nodes.filter((n) => n.live).length) ordered = false;
  return [
    ['BST ordering and unique ownership', ordered],
    ['Stored heights are exact', heights],
    ['Every balance factor is −1, 0, or 1', balanced],
  ].map(([name, ok]) => ({
    name: String(name),
    status: ok ? 'pass' : settled ? 'fail' : 'pending',
    detail: ok
      ? 'Holds in this snapshot.'
      : 'A statement-level transition may require subsequent repair.',
  }));
}
export function avlSnapshot(s: AvlState) {
  return [
    s.root ?? -1,
    s.nodes.map((n) =>
      n.live ? [n.key, n.left ?? -1, n.right ?? -1, n.height] : null,
    ),
  ];
}
