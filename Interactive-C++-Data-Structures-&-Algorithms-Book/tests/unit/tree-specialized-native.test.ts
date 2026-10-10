import { beforeAll, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  compileSpecializedFixture,
  specializedFiles,
} from '../../scripts/tree-specialized-fixture.mjs';
import {
  avlState,
  avlTrace,
  avlSnapshot,
  avlInvariants,
} from '../../src/visualizers/avl/model';
import {
  redBlackState,
  redBlackTrace,
  redBlackSnapshot,
  redBlackInvariants,
} from '../../src/visualizers/red-black/model';
import {
  bTreeState,
  bTreeTrace,
  bTreeSnapshot,
  bTreeInvariants,
} from '../../src/visualizers/b-tree/model';
import {
  trieState,
  trieTrace,
  trieSnapshot,
  trieInvariants,
} from '../../src/visualizers/trie/model';
const binaries: Record<string, string> = {};
beforeAll(() => {
  for (const kind of Object.keys(specializedFiles))
    binaries[kind] = compileSpecializedFixture(kind);
}, 30000);
function native(
  kind: string,
  op: string,
  key: string,
  values: string[],
  high = '60',
) {
  return execFileSync(binaries[kind]!, [op, key, high, ...values], {
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [tag, state] = line.split('|');
      return [tag, JSON.parse(state!)];
    });
}
const presets = [
  [],
  [10],
  [30, 20],
  [10, 20],
  [30, 10],
  [10, 30],
  [20, 10, 30, 5, 15, 25, 35],
  [50, 25, 75, 10, 30, 60, 90, 5, 15, 27, 35, 55, 65, 80, 95],
  [-999, 0, 999],
  Array.from({ length: 20 }, (_, i) => i - 10),
];
for (const kind of ['avl', 'rb', 'btree', 'bplus'])
  for (const values of presets)
    for (const op of kind === 'avl'
      ? ['insert', 'search', 'erase']
      : ['insert', 'search'])
      for (const key of [-999, 10, 15, 20, 25, 30, 40, 999])
        it(`${kind} ${op} ${key} in [${values}] matches every canonical statement`, () => {
          const t =
            kind === 'avl'
              ? avlTrace(op as 'insert', avlState(values), key)
              : kind === 'rb'
                ? redBlackTrace(op as 'insert', redBlackState(values), key)
                : bTreeTrace(
                    op as 'insert',
                    bTreeState(kind as 'btree' | 'bplus', values),
                    key,
                  );
          const snap: any =
            kind === 'avl'
              ? avlSnapshot
              : kind === 'rb'
                ? redBlackSnapshot
                : bTreeSnapshot;
          expect(
            t.steps
              .filter((s) => s.source)
              .map((s) => [s.source, snap(s.state)]),
          ).toEqual(native(kind, op, String(key), values.map(String)));
          const invariants: any =
            kind === 'avl'
              ? avlInvariants
              : kind === 'rb'
                ? redBlackInvariants
                : bTreeInvariants;
          expect(
            invariants(t.steps.at(-1)!.state, true).every(
              (i: any) => i.status === 'pass',
            ),
          ).toBe(true);
          const [chapter, name] = (specializedFiles as any)[kind];
          const source = readFileSync(
            `cpp/chapter-${chapter}/${name}.hpp`,
            'utf8',
          );
          for (const step of t.steps.filter((s) => s.source))
            expect(source).toContain(`@trace ${step.source}`);
        });
for (const values of presets)
  for (const [low, high] of [
    [-999, 999],
    [10, 30],
    [-5, 5],
    [900, 999],
    [0, 0],
  ])
    it(`B+ range ${low}..${high} follows actual leaf links [${values}]`, () => {
      const t = bTreeTrace('range', bTreeState('bplus', values), low!, high!);
      expect(
        t.steps
          .filter((s) => s.source)
          .map((s) => [s.source, [...bTreeSnapshot(s.state), s.state.output]]),
      ).toEqual(
        native('bplus', 'range', String(low), values.map(String), String(high)),
      );
      expect(t.steps.at(-1)!.state.output).toEqual(
        [...new Set(values)]
          .sort((a, b) => a - b)
          .filter((v) => v >= low! && v <= high!),
      );
    });
for (const words of [
  [],
  [''],
  ['car'],
  ['cat', 'car', 'care', 'dog'],
  ['a', 'ab', 'abc', 'abd', 'b'],
  ['zoo', 'zero', 'zebra'],
])
  for (const op of ['insert', 'search', 'prefix', 'erase'] as const)
    for (const word of [
      '',
      'car',
      'ca',
      'care',
      'cat',
      'dog',
      'ab',
      'zebra',
      'zz',
    ])
      it(`trie ${op} '${word}' from [${words}] matches every statement`, () => {
        const t = trieTrace(op, trieState(words), word);
        expect(
          t.steps
            .filter((s) => s.source)
            .map((s) => [s.source, trieSnapshot(s.state)]),
        ).toEqual(native('trie', op, word, words));
        expect(
          trieInvariants(t.steps.at(-1)!.state, true).every(
            (i) => i.status === 'pass',
          ),
        ).toBe(true);
      });
