import type { Invariant, Lifetime, Trace } from '../../engine/types';
import type { TreeScene } from '../tree/types';
export type Id = number | null;
export interface BinaryNode {
  value: number;
  left: Id;
  right: Id;
  lifetime: Lifetime;
}
export interface Slot {
  owner: Id;
  field: 'root' | 'left' | 'right';
}
export interface BinaryState {
  nodes: BinaryNode[];
  root: Id;
  refs: Record<string, Id>;
  slots: Record<string, Slot>;
  queue: number[];
  queueCursor: number | null;
  frames: { node: Id; phase: string }[];
  output: number[];
  active: Id;
  visited: number[];
  result: string;
  comparisons: number;
  writes: number;
  ordered: boolean;
  letters: boolean;
}
export interface BinaryEvent {
  type:
    | 'Compare'
    | 'AssignReference'
    | 'AssignPointer'
    | 'Allocate'
    | 'Construct'
    | 'Destroy'
    | 'Free'
    | 'Visit'
    | 'Output'
    | 'Queue'
    | 'Call'
    | 'EndScope'
    | 'Return';
  address?: string;
}
export const bstOperations = [
  'insert',
  'search',
  'minimum',
  'maximum',
  'successor',
  'predecessor',
  'erase',
  'clear',
] as const;
export const traversalOperations = [
  'preorder',
  'inorder',
  'postorder',
  'bfs',
] as const;
export type BinaryOperation =
  | (typeof bstOperations)[number]
  | (typeof traversalOperations)[number]
  | 'append';
export const validTreeValue = (n: number) =>
  Number.isInteger(n) && n >= -999 && n <= 999;
export const address = (id: number) =>
  `0x${(0xa100 + ((id * 7) % 17) * 0x130 + Math.floor(id / 17) * 0x2000).toString(16).toUpperCase()}`;
export function binaryState(
  values: number[] = [65, 66, 67, 68, 69],
  ordered = false,
  letters = !ordered,
): BinaryState {
  if (values.length > 15 || values.some((v) => !validTreeValue(v)))
    throw new Error('Use up to 15 integers from −999 to 999.');
  const s: BinaryState = {
    nodes: [],
    root: null,
    refs: {},
    slots: {},
    queue: [],
    queueCursor: null,
    frames: [],
    output: [],
    active: null,
    visited: [],
    result: '',
    comparisons: 0,
    writes: 0,
    ordered,
    letters,
  };
  for (const value of values) {
    if (!ordered) {
      const id = s.nodes.length;
      s.nodes.push({ value, left: null, right: null, lifetime: 'live' });
      if (id === 0) s.root = id;
      else s.nodes[Math.floor((id - 1) / 2)]![id % 2 ? 'left' : 'right'] = id;
    } else {
      let slot: Slot = { owner: null, field: 'root' };
      let duplicate = false;
      while (slotValue(s, slot) !== null) {
        const id = slotValue(s, slot)!;
        if (s.nodes[id]!.value === value) {
          duplicate = true;
          break;
        }
        slot = {
          owner: id,
          field: value < s.nodes[id]!.value ? 'left' : 'right',
        };
      }
      if (duplicate) continue;
      const id = s.nodes.length;
      s.nodes.push({ value, left: null, right: null, lifetime: 'live' });
      setSlot(s, slot, id);
    }
  }
  return s;
}
export function slotValue(s: BinaryState, slot: Slot): Id {
  return slot.field === 'root' ? s.root : s.nodes[slot.owner!]![slot.field];
}
function setSlot(s: BinaryState, slot: Slot, value: Id) {
  if (slot.field === 'root') s.root = value;
  else s.nodes[slot.owner!]![slot.field] = value;
}
export function binaryTrace(
  operation: BinaryOperation,
  initial: BinaryState,
  value = 42,
): Trace<BinaryState, BinaryEvent> {
  if (!validTreeValue(value))
    throw new Error('Value must be an integer from −999 to 999.');
  if (
    !(
      [...bstOperations, ...traversalOperations, 'append'] as string[]
    ).includes(operation)
  )
    throw new Error('Choose a supported operation.');
  if (
    initial.nodes.filter((n) => n.lifetime === 'live').length >= 16 &&
    (operation === 'insert' || operation === 'append')
  )
    throw new Error('The lab allows at most 16 live nodes.');
  const s = structuredClone(initial);
  s.refs = {};
  s.slots = {};
  s.queue = [];
  s.queueCursor = null;
  s.frames = [];
  s.output = [];
  s.visited = [];
  s.active = null;
  s.comparisons = 0;
  s.writes = 0;
  s.result = '';
  const trace: Trace<BinaryState, BinaryEvent> = {
    initial: structuredClone(s),
    steps: [],
  };
  const emit = (
    type: BinaryEvent['type'],
    source: string | null,
    title: string,
    explanation = title,
  ) =>
    trace.steps.push({
      event: { type },
      source,
      title,
      explanation,
      state: structuredClone(s),
    });
  const tag = (suffix: string) => `${operation}.${suffix}`;
  const test = (
    result: boolean,
    source: string,
    explanation = 'Evaluate the actual C++ condition before choosing the next statement.',
  ) => {
    s.comparisons++;
    emit('Compare', source, `Condition: ${result}`, explanation);
    return result;
  };
  const ref = (name: string, id: Id, source: string) => {
    s.refs[name] = id;
    s.active = id;
    s.writes++;
    if (id !== null && !s.visited.includes(id)) s.visited.push(id);
    emit(
      'AssignReference',
      source,
      `${name} → ${id === null ? 'nullptr' : label(s, id)}`,
    );
  };
  const slot = (
    name: string,
    owner: Id,
    field: Slot['field'],
    source: string,
  ) => {
    s.slots[name] = { owner, field };
    s.active = slotValue(s, s.slots[name]!);
    s.writes++;
    emit(
      'AssignReference',
      source,
      `${name} addresses ${owner === null ? 'root_' : `${label(s, owner)}.${field}`}`,
      'A Node** identifies a pointer FIELD. Changing this local does not change any child link.',
    );
  };
  const write = (name: string, target: Id, source: string) => {
    setSlot(s, s.slots[name]!, target);
    s.writes++;
    emit(
      'AssignPointer',
      source,
      `Write *${name} → ${target === null ? 'nullptr' : label(s, target)}`,
      'Only this owning root or child pointer is assigned. No object is destroyed by pointer assignment.',
    );
  };
  const link = (
    id: number,
    field: 'left' | 'right',
    target: Id,
    source: string,
  ) => {
    s.nodes[id]![field] = target;
    s.writes++;
    emit(
      'AssignPointer',
      source,
      `${label(s, id)}.${field} → ${target === null ? 'nullptr' : label(s, target)}`,
    );
  };
  const ret = (result: string, source: string) => {
    s.result = result;
    emit('Return', source, result);
  };
  const allocate = (source: string) => {
    const id = s.nodes.length;
    s.nodes.push({ value, left: null, right: null, lifetime: 'allocated' });
    s.active = id;
    emit(
      'Allocate',
      source,
      'Allocate separate Node storage',
      'Storage exists, but no Node fields are readable yet.',
    );
    s.nodes[id]!.lifetime = 'live';
    s.refs.fresh = id;
    emit('Construct', source, `Construct ${value}; left and right are nullptr`);
    return id;
  };
  const destroy = (id: number, source: string) => {
    s.nodes[id]!.lifetime = 'destroyed';
    emit(
      'Destroy',
      source,
      'End the Node lifetime',
      'The destructor finishes. Former value and child fields may no longer be inspected.',
    );
    s.nodes[id]!.lifetime = 'freed';
    emit(
      'Free',
      source,
      'Release the allocation',
      'The saved local address is dangling until its scope ends. No child is implicitly deleted: Node has raw pointer fields.',
    );
  };
  const enqueue = (id: number, source: string) => {
    s.queue.push(id);
    emit('Queue', source, `Enqueue ${label(s, id)} at the back`);
  };
  const out = (id: number, source: string) => {
    s.output.push(s.nodes[id]!.value);
    s.active = id;
    s.visited.push(id);
    emit('Output', source, `Output ${label(s, id)}`);
  };
  if (operation === 'insert' || operation === 'erase') {
    slot('slot', null, 'root', tag('slot'));
    let duplicate = false;
    while (test(slotValue(s, s.slots.slot!) !== null, tag('loop'))) {
      const id = slotValue(s, s.slots.slot!)!;
      if (
        test(
          value === s.nodes[id]!.value,
          tag('equal'),
          `Compare ${value} == ${s.nodes[id]!.value}. Equality means the same set key.`,
        )
      ) {
        if (operation === 'insert') {
          ret('Duplicate rejected; unchanged', tag('duplicate'));
          duplicate = true;
        } else
          emit('Compare', tag('found'), 'Target found; leave the search loop');
        break;
      }
      if (
        test(
          value < s.nodes[id]!.value,
          tag('less'),
          `Compare ${value} < ${s.nodes[id]!.value}; choose the entire left or right subtree.`,
        )
      )
        slot('slot', id, 'left', tag('left'));
      else slot('slot', id, 'right', tag('right'));
    }
    if (operation === 'insert' && !duplicate) {
      const id = allocate(tag('allocate'));
      write('slot', id, tag('publish'));
      ret('Inserted', tag('return'));
    }
    if (operation === 'erase') {
      if (test(slotValue(s, s.slots.slot!) === null, 'erase.missing'))
        ret('Value absent; unchanged', 'erase.absent');
      else {
        const victim = slotValue(s, s.slots.slot!)!;
        ref('victim', victim, 'erase.victim');
        if (
          test(
            s.nodes[victim]!.left !== null && s.nodes[victim]!.right !== null,
            'erase.two',
          )
        ) {
          slot('successorSlot', victim, 'right', 'erase.successor-slot');
          while (
            test(
              s.nodes[slotValue(s, s.slots.successorSlot!)!]!.left !== null,
              'erase.successor-loop',
            )
          )
            slot(
              'successorSlot',
              slotValue(s, s.slots.successorSlot!)!,
              'left',
              'erase.successor-left',
            );
          const successor = slotValue(s, s.slots.successorSlot!)!;
          ref('successor', successor, 'erase.successor');
          s.nodes[victim]!.value = s.nodes[successor]!.value;
          s.writes++;
          emit(
            'AssignPointer',
            'erase.copy-value',
            'Copy successor value into target',
            'The target keeps its identity and address. A temporary duplicate exists until the successor is detached.',
          );
          write(
            'successorSlot',
            s.nodes[successor]!.right,
            'erase.successor-bypass',
          );
          destroy(successor, 'erase.successor-delete');
          delete s.refs.successor;
          delete s.slots.successorSlot;
        } else {
          ref('replacement', s.nodes[victim]!.left, 'erase.replacement');
          if (test(s.refs.replacement === null, 'erase.no-left'))
            ref('replacement', s.nodes[victim]!.right, 'erase.use-right');
          write('slot', s.refs.replacement!, 'erase.bypass');
          destroy(victim, 'erase.delete');
          delete s.refs.replacement;
        }
        ret('Erased', 'erase.return');
      }
    }
  } else if (
    operation === 'search' ||
    operation === 'minimum' ||
    operation === 'maximum' ||
    operation === 'successor' ||
    operation === 'predecessor'
  ) {
    ref('current', s.root, tag('current'));
    if (operation === 'minimum' || operation === 'maximum') {
      if (test(s.refs.current === null, tag('empty')))
        ret('Empty tree; nullptr', tag('missing'));
      else {
        const field = operation === 'minimum' ? 'left' : 'right';
        while (test(s.nodes[s.refs.current!]![field] !== null, tag('loop')))
          ref('current', s.nodes[s.refs.current!]![field], tag(field));
        ret(`Result: ${label(s, s.refs.current!)}`, tag('return'));
      }
    } else if (operation === 'search') {
      let found = false;
      while (test(s.refs.current !== null, 'search.loop')) {
        const id = s.refs.current!;
        if (
          test(
            value === s.nodes[id]!.value,
            'search.equal',
            `Compare ${value} == ${s.nodes[id]!.value}.`,
          )
        ) {
          ret(`Found ${value}`, 'search.found');
          found = true;
          break;
        }
        if (
          test(
            value < s.nodes[id]!.value,
            'search.less',
            `Compare ${value} < ${s.nodes[id]!.value}.`,
          )
        )
          ref('current', s.nodes[id]!.left, 'search.left');
        else ref('current', s.nodes[id]!.right, 'search.right');
      }
      if (!found) ret('Not found; nullptr', 'search.missing');
    } else {
      ref('candidate', null, tag('candidate'));
      while (test(s.refs.current !== null, tag('loop'))) {
        const id = s.refs.current!;
        const next = operation === 'successor';
        if (
          test(
            next ? value < s.nodes[id]!.value : value > s.nodes[id]!.value,
            tag(next ? 'less' : 'greater'),
          )
        ) {
          ref('candidate', id, tag('save'));
          ref(
            'current',
            s.nodes[id]![next ? 'left' : 'right'],
            tag(next ? 'left' : 'right'),
          );
        } else
          ref(
            'current',
            s.nodes[id]![next ? 'right' : 'left'],
            tag(next ? 'right' : 'left'),
          );
      }
      ret(
        s.refs.candidate === null
          ? 'No strict neighbor; nullptr'
          : `Result: ${label(s, s.refs.candidate!)}`,
        tag('return'),
      );
    }
  } else if (operation === 'clear') {
    while (test(s.root !== null, 'clear.loop')) {
      if (test(s.nodes[s.root!]!.left !== null, 'clear.has-left')) {
        const root = s.root!,
          pivot = s.nodes[root]!.left!;
        ref('pivot', pivot, 'clear.pivot');
        link(root, 'left', s.nodes[pivot]!.right, 'clear.transfer');
        link(pivot, 'right', root, 'clear.attach');
        s.root = pivot;
        s.writes++;
        emit('AssignPointer', 'clear.root', 'Replace root_ with pivot');
        delete s.refs.pivot;
      } else {
        const old = s.root!;
        ref('old', old, 'clear.old');
        s.root = s.nodes[old]!.right;
        s.writes++;
        emit(
          'AssignPointer',
          'clear.bypass',
          'Bypass root_ through its right child',
        );
        destroy(old, 'clear.delete');
        delete s.refs.old;
      }
    }
    s.result = 'All owned nodes released';
  } else if (operation === 'append') {
    slot('slot', null, 'root', 'append.slot');
    emit('Queue', 'append.queue', 'Create empty search queue');
    if (test(s.root !== null, 'append.root'))
      enqueue(s.root!, 'append.enqueue-root');
    let i = 0;
    s.queueCursor = i;
    emit('AssignReference', 'append.index', 'Queue index i = 0');
    while (test(i < s.queue.length, 'append.loop')) {
      const id = s.queue[i]!;
      ref('current', id, 'append.current');
      if (test(s.nodes[id]!.left === null, 'append.left-null')) {
        slot('slot', id, 'left', 'append.left-slot');
        emit('Compare', 'append.left-break', 'Found left vacancy');
        break;
      }
      if (test(s.nodes[id]!.right === null, 'append.right-null')) {
        slot('slot', id, 'right', 'append.right-slot');
        emit('Compare', 'append.right-break', 'Found right vacancy');
        break;
      }
      enqueue(s.nodes[id]!.left!, 'append.enqueue-left');
      enqueue(s.nodes[id]!.right!, 'append.enqueue-right');
      i++;
      s.queueCursor = i;
      emit('AssignReference', 'append.advance', `Queue index i = ${i}`);
      delete s.refs.current;
    }
    delete s.refs.current;
    const id = allocate('append.allocate');
    write('slot', id, 'append.publish');
    s.result = 'Appended at first level-order vacancy';
  } else if (operation === 'bfs') {
    emit('Output', 'bfs.output', 'Create empty output');
    emit('Queue', 'bfs.queue', 'Create empty FIFO queue');
    if (test(s.root !== null, 'bfs.root')) enqueue(s.root!, 'bfs.enqueue-root');
    while (test(s.queue.length > 0, 'bfs.loop')) {
      const id = s.queue[0]!;
      ref('current', id, 'bfs.front');
      s.queue.shift();
      emit('Queue', 'bfs.pop', 'Remove front of queue');
      out(id, 'bfs.emit');
      if (test(s.nodes[id]!.left !== null, 'bfs.has-left'))
        enqueue(s.nodes[id]!.left!, 'bfs.enqueue-left');
      if (test(s.nodes[id]!.right !== null, 'bfs.has-right'))
        enqueue(s.nodes[id]!.right!, 'bfs.enqueue-right');
      delete s.refs.current;
    }
    ret('Level-order traversal complete', 'bfs.return');
  } else {
    emit('Output', 'dfs.output', 'Create empty output');
    function dfs(id: Id) {
      s.frames.push({ node: id, phase: 'enter' });
      s.active = id;
      emit(
        'Call',
        null,
        `Call dfs(${id === null ? 'nullptr' : label(s, id)})`,
        'The caller is suspended underneath this frame. Null child calls are real calls too.',
      );
      const frame = s.frames.at(-1)!;
      if (test(id === null, 'dfs.null')) {
        emit('Return', 'dfs.empty-return', 'Return from null child');
        s.frames.pop();
        emit('EndScope', null, 'Pop null call frame');
        return;
      }
      if (test(operation === 'preorder', 'dfs.pre')) out(id!, 'dfs.emit-pre');
      frame.phase = 'await left';
      emit('Call', null, 'Suspend caller; recurse left');
      dfs(s.nodes[id!]!.left);
      frame.phase = 'left returned';
      s.active = id;
      emit('Call', 'dfs.left', 'Left recursive call completed');
      if (test(operation === 'inorder', 'dfs.in')) out(id!, 'dfs.emit-in');
      frame.phase = 'await right';
      emit('Call', null, 'Suspend caller; recurse right');
      dfs(s.nodes[id!]!.right);
      frame.phase = 'right returned';
      s.active = id;
      emit('Call', 'dfs.right', 'Right recursive call completed');
      if (test(operation === 'postorder', 'dfs.post'))
        out(id!, 'dfs.emit-post');
      s.frames.pop();
      emit('EndScope', null, 'Return; pop call frame');
    }
    dfs(s.root);
    emit('Call', 'dfs.start', 'Root recursive call completed');
    ret(`${operation} traversal complete`, 'dfs.return');
  }
  s.refs = {};
  s.slots = {};
  s.queue = [];
  s.queueCursor = null;
  s.frames = [];
  emit(
    'EndScope',
    null,
    'Operation locals leave scope',
    'Owning root and child fields survive. Non-owning locals, queue entries, and call frames do not.',
  );
  return trace;
}
export function label(s: BinaryState, id: number) {
  const value = s.nodes[id]!.value;
  return s.letters && value >= 65 && value <= 90
    ? String.fromCharCode(value)
    : String(value);
}
export function binaryMetrics(s: BinaryState) {
  const depth = new Map<number, number>(),
    height = new Map<number, number>(),
    parent = new Map<number, number>();
  const walk = (id: Id, d: number): number => {
    if (id === null || depth.has(id) || s.nodes[id]?.lifetime !== 'live')
      return -1;
    depth.set(id, d);
    const n = s.nodes[id]!;
    for (const c of [n.left, n.right])
      if (c !== null && !parent.has(c)) parent.set(c, id);
    const h = 1 + Math.max(walk(n.left, d + 1), walk(n.right, d + 1));
    height.set(id, h);
    return h;
  };
  const treeHeight = walk(s.root, 0);
  return { depth, height, parent, treeHeight };
}
export function binaryScene(s: BinaryState): TreeScene {
  const metrics = binaryMetrics(s);
  const ptr = (id: Id) => (id === null ? null : address(id));
  const refs: Record<string, string | null> = { root_: ptr(s.root) };
  for (const [key, id] of Object.entries(s.refs)) refs[key] = ptr(id);
  for (const [key, sl] of Object.entries(s.slots))
    refs[`*${key}`] = ptr(slotValue(s, sl));
  return {
    nodes: s.nodes.map((n, id) => ({
      address: address(id),
      lifetime: n.lifetime,
      label: n.lifetime === 'live' ? label(s, id) : 'Node',
      fields: n.lifetime === 'live' ? [{ name: 'value', value: n.value }] : [],
      links:
        n.lifetime === 'live'
          ? [
              { name: 'left', target: ptr(n.left), structural: true },
              { name: 'right', target: ptr(n.right), structural: true },
            ]
          : [],
      badge:
        n.lifetime === 'live'
          ? `d=${metrics.depth.get(id) ?? 'detached'} · h=${metrics.height.get(id) ?? '—'}${n.left === null && n.right === null ? ' · leaf' : ''}`
          : undefined,
    })),
    root: ptr(s.root),
    references: refs,
    active: ptr(s.active),
    visited: s.visited.map(address),
    auxiliary: [
      {
        label: 'Derived tree metrics (edges)',
        entries: [
          `height ${metrics.treeHeight}`,
          `levels ${metrics.treeHeight + 1}`,
        ],
      },
      {
        label: 'Call stack: bottom → top',
        entries: s.frames.map(
          (f) =>
            `dfs(${f.node === null ? 'nullptr' : label(s, f.node)}) · ${f.phase}`,
        ),
      },
      {
        label:
          s.queueCursor === null
            ? 'Queue: front → back'
            : `Append worklist: next index i = ${s.queueCursor}`,
        entries: s.queue.map(
          (id, index) =>
            `${s.queueCursor !== null && index < s.queueCursor ? 'processed · ' : ''}${label(s, id)}`,
        ),
      },
      {
        label: 'Pointer-to-pointer locals (field addresses)',
        entries: Object.entries(s.slots).map(
          ([key, sl]) =>
            `${key} = &${sl.owner === null ? 'root_' : `${label(s, sl.owner)}.${sl.field}`}`,
        ),
      },
    ],
    output: s.output.map((v) =>
      s.letters && v >= 65 && v <= 90 ? String.fromCharCode(v) : String(v),
    ),
    result: s.result,
  };
}
export function binaryInvariants(
  s: BinaryState,
  settled: boolean,
): Invariant[] {
  const live = s.nodes.flatMap((n, id) => (n.lifetime === 'live' ? [id] : []));
  const seen = new Set<number>();
  let cycle = false,
    ordered = true;
  const parents = new Map<number, number>();
  const target = (id: Id) => id === null || s.nodes[id]?.lifetime === 'live';
  const walk = (id: Id, low: number, high: number) => {
    if (id === null || !target(id)) return;
    if (seen.has(id)) {
      cycle = true;
      return;
    }
    seen.add(id);
    const n = s.nodes[id]!;
    if (n.value <= low || n.value >= high) ordered = false;
    walk(n.left, low, n.value);
    walk(n.right, n.value, high);
  };
  for (const id of live)
    for (const child of [s.nodes[id]!.left, s.nodes[id]!.right])
      if (child !== null) parents.set(child, (parents.get(child) ?? 0) + 1);
  walk(s.root, -Infinity, Infinity);
  const rule = (
    name: string,
    ok: boolean,
    detail: string,
    transient = true,
  ): Invariant => ({
    name,
    status: ok ? 'pass' : !settled && transient ? 'pending' : 'fail',
    detail,
  });
  return [
    rule(
      'Root and child fields target live objects',
      target(s.root) &&
        live.every(
          (id) => target(s.nodes[id]!.left) && target(s.nodes[id]!.right),
        ),
      'A structural pointer never grants access to an ended object.',
      false,
    ),
    rule(
      'Acyclic, single ownership',
      !cycle &&
        [...parents.values()].every((n) => n <= 1) &&
        (s.root === null || !parents.has(s.root)),
      'Root has no incoming owning edge; every other reachable node has exactly one. Locals are observers.',
    ),
    rule(
      'All live nodes reachable',
      seen.size === live.length,
      'New allocation and bypassed victims are temporarily detached.',
    ),
    ...(s.ordered
      ? [
          rule(
            'Strict BST subtree ordering',
            ordered,
            'Every left descendant is smaller and every right descendant larger. Value-copy deletion briefly duplicates the successor key.',
          ),
        ]
      : []),
  ];
}
// Stable native-fixture serialization. No ended object fields are read.
export function binarySnapshot(s: BinaryState) {
  const id = (n: Id) => n ?? -1;
  return [
    id(s.root),
    s.nodes.map((n) =>
      n.lifetime === 'freed' || n.lifetime === 'destroyed'
        ? null
        : [n.value, id(n.left), id(n.right)],
    ),
    s.output,
    s.queue,
    s.frames.map((f) => id(f.node)),
    Object.fromEntries(
      Object.entries(s.refs).map(([name, node]) => [name, id(node)]),
    ),
    Object.fromEntries(
      Object.entries(s.slots).map(([name, slot]) => [
        name,
        [id(slot.owner), slot.field],
      ]),
    ),
    s.queueCursor,
  ];
}
