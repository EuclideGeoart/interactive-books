import { beforeAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { compileTreeFoundationsFixture } from '../../scripts/tree-foundations-fixture.mjs';
import {
  binaryState,
  binaryTrace,
  binarySnapshot,
  bstOperations,
  traversalOperations,
  type BinaryOperation,
} from '../../src/visualizers/binary-tree/model';
let binary: string;
beforeAll(() => {
  binary = compileTreeFoundationsFixture();
});
const samples = [
  [],
  [50],
  [50, 25],
  [50, 75],
  [50, 25, 75],
  [50, 25, 75, 10, 35, 60, 90, 62],
  [50, 25, 75, 60, 90, 55, 57],
  [1, 2, 3, 4, 5, 6],
  [-999, 0, 999],
  [50, 50, 25, 25],
];
for (const values of samples)
  for (const operation of bstOperations)
    for (const value of [50, 62, -999, 999]) {
      it(`native BST ${operation} ${value} [${values}]: every tagged statement`, () =>
        parity(operation, values, value, true));
    }
for (const values of [
  [],
  [65],
  [65, 66],
  [65, 66, 67, 68, 69],
  [-999, 0, 999],
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
])
  for (const operation of [
    ...traversalOperations,
    'append',
    'clear',
  ] as const) {
    it(`native binary ${operation} [${values}]: topology, output, queue, actual recursive frames`, () =>
      parity(operation, values, 70, false));
  }
function parity(
  operation: BinaryOperation,
  values: number[],
  value: number,
  ordered: boolean,
) {
  const trace = binaryTrace(operation, binaryState(values, ordered), value);
  const steps = trace.steps.filter((s) => s.source);
  // new/delete are split into semantic lifetime phases on one native statement.
  const semantic = steps
    .filter(
      (s, i) =>
        steps[i + 1]?.source !== s.source ||
        (s.event.type !== 'Allocate' && s.event.type !== 'Destroy'),
    )
    .map((s) => [s.source, binarySnapshot(s.state)]);
  const output = execFileSync(
    binary,
    [
      ordered ? 'bst' : 'binary',
      operation,
      String(value),
      ...values.map(String),
    ],
    { encoding: 'utf8' },
  );
  const native = output
    .trim()
    .split('\n')
    .filter((line) => line && !line.startsWith('RESULT|'))
    .map((line) => {
      const [tag, state] = line.split('|');
      return [tag, JSON.parse(state!)];
    });
  expect(semantic).toEqual(native);
  const result = JSON.parse(
    output
      .trim()
      .split('\n')
      .find((line) => line.startsWith('RESULT|'))!
      .slice(7),
  );
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  const expected =
    operation === 'insert'
      ? !values.includes(value)
      : operation === 'erase'
        ? values.includes(value)
        : operation === 'search'
          ? values.includes(value)
            ? value
            : null
          : operation === 'minimum'
            ? (sorted[0] ?? null)
            : operation === 'maximum'
              ? (sorted.at(-1) ?? null)
              : operation === 'successor'
                ? (sorted.find((v) => v > value) ?? null)
                : operation === 'predecessor'
                  ? (sorted.filter((v) => v < value).at(-1) ?? null)
                  : (traversalOperations as readonly string[]).includes(
                        operation,
                      )
                    ? trace.steps.at(-1)!.state.output
                    : null;
  expect(result).toEqual(expected);
}
it('every canonical source tag has a corresponding exercised semantic event', () => {
  const sources = ['10/BinaryTree', '11/BinarySearchTree', '12/Traversal']
    .map((path) => readFileSync(`cpp/chapter-${path}.hpp`, 'utf8'))
    .join('\n');
  const tags = [...sources.matchAll(/@trace ([\w.-]+)/g)].map((m) => m[1]);
  const reached = new Set<string>();
  for (const values of samples)
    for (const op of [
      ...bstOperations,
      ...traversalOperations,
      'append',
    ] as const)
      for (const value of [50, 25, 75, 60, 90, 55, 57, 62, 10, -999, 999]) {
        const ordered = (bstOperations as readonly string[]).includes(op);
        for (const step of binaryTrace(op, binaryState(values, ordered), value)
          .steps)
          if (step.source) reached.add(step.source);
      }
  expect(tags.filter((t) => !reached.has(t!))).toEqual([]);
});

for (const values of [
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  [8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15],
])
  for (const operation of traversalOperations)
    it(`native ${operation} on BST shape [${values}]`, () =>
      parity(operation, values, 0, true));
