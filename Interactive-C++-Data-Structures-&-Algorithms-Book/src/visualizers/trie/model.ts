import type { Trace, Invariant } from '../../engine/types';
export interface TrieNode {
  terminal: boolean;
  children: Record<string, number>;
  live: boolean;
}
export interface TrieState {
  stack?: string[];
  nodes: TrieNode[];
  root: number | null;
  refs: Record<string, number | null>;
  visited: number[];
  comparisons: number;
  writes: number;
  result: string;
  word: string;
  position: number;
}
export interface TrieEvent {
  type:
    | 'AssignReference'
    | 'AssignPointer'
    | 'Construct'
    | 'Free'
    | 'Compare'
    | 'Terminal'
    | 'Return'
    | 'EndScope'
    | 'InvariantCheck';
}
export const trieOperations = ['insert', 'search', 'prefix', 'erase'] as const;
export type TrieOperation = (typeof trieOperations)[number];
export function validWord(word: string) {
  if (!/^[a-z]{0,12}$/.test(word))
    throw new Error(
      'Use zero to twelve lowercase ASCII letters a–z. Empty input denotes the empty word.',
    );
}
export function trieState(
  words: string[] = ['cat', 'car', 'care', 'dog'],
): TrieState {
  if (words.length > 8) throw new Error('Use at most eight starting words.');
  words.forEach(validWord);
  let s: TrieState = {
    nodes: [],
    root: null,
    refs: {},
    visited: [],
    comparisons: 0,
    writes: 0,
    result: '',
    word: '',
    position: 0,
  };
  for (const word of words)
    s = trieTrace('insert', s, word).steps.at(-1)!.state;
  return {
    ...s,
    refs: {},
    visited: [],
    comparisons: 0,
    writes: 0,
    result: '',
    word: '',
    position: 0,
  };
}
export function trieTrace(
  op: TrieOperation,
  initial: TrieState,
  word = 'car',
): Trace<TrieState, TrieEvent> {
  validWord(word);
  if (!trieOperations.includes(op)) throw new Error('Choose a trie operation.');
  const s = structuredClone(initial);
  Object.assign(s, {
    refs: {},
    visited: [],
    comparisons: 0,
    writes: 0,
    result: '',
    word,
    position: 0,
  });
  const t: Trace<TrieState, TrieEvent> = {
    initial: structuredClone(s),
    steps: [],
  };
  const emit = (tag: string, type: TrieEvent['type'], title: string) => {
    if (type === 'Compare') s.comparisons++;
    if (type === 'AssignPointer' || type === 'Terminal') s.writes++;
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
      `${name} → ${id === null ? 'nullptr' : `node ${id}`}`,
    );
  };
  const allocate = (tag: string) => {
    const id = s.nodes.length;
    s.nodes.push({ terminal: false, children: {}, live: true });
    s.refs.created = id;
    emit(tag, 'Construct', 'Allocate storage and construct a nonterminal node');
    return id;
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
  const follow = () =>
    frame('follow', {}, () => {
      let current = s.root;
      ref('current', current, 'trie.walk.start');
      for (let i = 0; i < word.length; i++) {
        s.position = i;
        if (current === null) {
          emit('trie.walk.absent', 'Return', 'No root/path exists');
          return null;
        }
        const child = s.nodes[current]!.children[word[i]!];
        emit('trie.walk.compare', 'Compare', `Find edge '${word[i]}'`);
        if (child === undefined) {
          emit('trie.walk.missing', 'Return', 'Character edge is absent');
          return null;
        }
        current = child;
        ref('current', current, 'trie.walk.advance');
      }
      s.position = word.length;
      emit(
        'trie.walk.return',
        'Return',
        'Return the prefix endpoint; terminal is a separate question',
      );
      return current;
    });
  if (op === 'insert') {
    if (s.root === null) {
      const created = allocate('trie.insert.root-allocate');
      s.root = created;
      emit('trie.insert.root', 'AssignPointer', 'Publish empty root');
      delete s.refs.created;
    }
    let current = s.root;
    ref('current', current, 'trie.insert.start');
    for (let i = 0; i < word.length; i++) {
      s.position = i;
      const letter = word[i]!;
      emit('trie.insert.compare', 'Compare', `Find edge '${letter}'`);
      if (s.nodes[current]!.children[letter] === undefined) {
        const created = allocate('trie.insert.allocate');
        s.nodes[current]!.children[letter] = created;
        emit(
          'trie.insert.link',
          'AssignPointer',
          `Publish child under '${letter}'`,
        );
        delete s.refs.created;
      }
      current = s.nodes[current]!.children[letter]!;
      ref('current', current, 'trie.insert.advance');
    }
    const added = !s.nodes[current]!.terminal;
    s.position = word.length;
    emit(
      'trie.insert.duplicate',
      'Compare',
      added ? 'Endpoint is not a word yet' : 'Duplicate word',
    );
    s.nodes[current]!.terminal = true;
    emit(
      'trie.insert.terminal',
      'Terminal',
      'Mark endpoint as a complete word',
    );
    emit(
      'trie.insert.return',
      'Return',
      added ? 'Inserted' : 'Duplicate rejected',
    );
    s.result = added ? 'Inserted' : 'Duplicate rejected';
  } else if (op === 'search' || op === 'prefix') {
    const current = follow();
    s.refs.current = current;
    if (op === 'search') {
      const found = current !== null && s.nodes[current]!.terminal;
      emit(
        'trie.search.terminal',
        'Compare',
        found ? 'Terminal flag is true' : 'Prefix alone is not a complete word',
      );
      emit(
        'trie.search.return',
        'Return',
        found ? 'Word found' : 'Word not found',
      );
      s.result = found ? 'Word found' : 'Word not found';
    } else {
      emit(
        'trie.prefix.return',
        'Return',
        current !== null ? 'Prefix exists' : 'Prefix absent',
      );
      s.result = current !== null ? 'Prefix exists' : 'Prefix absent';
    }
  } else {
    const remove = (current: number | null, depth: number): boolean =>
      frame(`remove depth ${depth}`, { current }, () => {
        s.position = depth;
        s.refs.current = current;
        if (current === null) {
          emit('trie.erase.empty', 'Return', 'Empty trie');
          return false;
        }
        if (depth === word.length) {
          if (!s.nodes[current]!.terminal) {
            emit(
              'trie.erase.not-word',
              'Return',
              'Prefix exists but is not a word',
            );
            return false;
          }
          s.nodes[current]!.terminal = false;
          emit(
            'trie.erase.unmark',
            'Terminal',
            'Unmark word; preserve longer words',
          );
          emit('trie.erase.removed', 'Return', 'Removed word');
          return true;
        }
        const letter = word[depth]!,
          child = s.nodes[current]!.children[letter];
        emit('trie.erase.compare', 'Compare', `Find '${letter}'`);
        if (child === undefined) {
          emit('trie.erase.missing', 'Return', 'Word path is absent');
          return false;
        }
        ref('child', child, 'trie.erase.child');
        const removed = remove(child, depth + 1);
        s.position = depth;
        if (
          removed &&
          !s.nodes[child]!.terminal &&
          Object.keys(s.nodes[child]!.children).length === 0
        ) {
          delete s.nodes[current]!.children[letter];
          emit(
            'trie.erase.unlink',
            'AssignPointer',
            `Erase '${letter}' edge before deleting child`,
          );
          s.nodes[child]!.live = false;
          emit(
            'trie.erase.delete',
            'Free',
            'Destroy unused child and release allocation',
          );
        }
        emit(
          'trie.erase.return',
          'Return',
          removed ? 'Removed; keep any shared prefix' : 'Not found',
        );
        return removed;
      });
    const removed = remove(s.root, 0);
    if (
      s.root !== null &&
      !s.nodes[s.root]!.terminal &&
      Object.keys(s.nodes[s.root]!.children).length === 0
    ) {
      const old = s.root;
      ref('old', old, 'trie.erase.old-root');
      s.root = null;
      emit('trie.erase.root', 'AssignPointer', 'Clear root reference');
      s.nodes[old]!.live = false;
      emit('trie.erase.root-delete', 'Free', 'Release the empty root');
    }
    emit('trie.erase.done', 'Return', removed ? 'Removed' : 'Word not found');
    s.result = removed ? 'Removed' : 'Word not found';
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
export function trieWords(s: TrieState): string[] {
  const out: string[] = [];
  const seen = new Set<number>();
  function visit(id: number | null, path: string) {
    if (id === null || seen.has(id) || !s.nodes[id]?.live) return;
    seen.add(id);
    const n = s.nodes[id]!;
    if (n.terminal) out.push(path);
    for (const letter of Object.keys(n.children).sort())
      visit(n.children[letter]!, path + letter);
  }
  visit(s.root, '');
  return out;
}
export function trieInvariants(s: TrieState, settled: boolean): Invariant[] {
  let tree = true,
    letters = true,
    pruned = true;
  const seen = new Set<number>();
  function visit(id: number | null) {
    if (id === null) return;
    if (seen.has(id) || !s.nodes[id]?.live) {
      tree = false;
      return;
    }
    seen.add(id);
    const n = s.nodes[id]!;
    if (id !== s.root && !n.terminal && !Object.keys(n.children).length)
      pruned = false;
    for (const [letter, child] of Object.entries(n.children)) {
      if (!/^[a-z]$/.test(letter)) letters = false;
      visit(child);
    }
  }
  visit(s.root);
  if (seen.size !== s.nodes.filter((n) => n.live).length) tree = false;
  return [
    ['Acyclic, uniquely owned character paths', tree],
    ['One lowercase character per child edge', letters],
    [
      'Terminal flags are boolean word membership',
      s.nodes.every((n) => !n.live || typeof n.terminal === 'boolean'),
    ],
    ['No unused nonterminal leaf remains', pruned],
  ].map(([name, ok]) => ({
    name: String(name),
    status: ok ? 'pass' : settled ? 'fail' : 'pending',
    detail: ok
      ? 'Holds in this snapshot.'
      : 'Complete linking or pruning before judging the settled structure.',
  }));
}
export function trieSnapshot(s: TrieState) {
  return [
    s.root ?? -1,
    s.nodes.map((n) =>
      n.live
        ? [
            Number(n.terminal),
            Object.entries(n.children)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([c, id]) => [c, id]),
          ]
        : null,
    ),
  ];
}
