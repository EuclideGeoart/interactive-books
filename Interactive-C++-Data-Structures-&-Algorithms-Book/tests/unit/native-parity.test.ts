import { beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { compileFixture } from '../../scripts/native-fixture.mjs';
import { initialState, makeTrace, operations } from '../../src/visualizers/linked-list/model';
import { listValues } from '../../src/visualizers/linked-list/topology';
import { sourceLines } from '../../src/engine/source';

let binary: string;
beforeAll(() => { binary = compileFixture(); });
const source = readFileSync('cpp/chapter-01/SinglyLinkedList.hpp', 'utf8');
describe('canonical native C++ ↔ semantic trace', () => {
  for (const operation of operations) {
    for (const values of [[], [10], [10, 20, 30], [10, 10, 20], [-5, 0, 999]]) {
      for (const target of [10, 20, 30, 99]) {
        it(`${operation}(${target}) on [${values}] matches executed native lines and every chain snapshot`, () => {
          const trace = makeTrace(operation, initialState(values), target, target);
          const steps = trace.steps.filter(step => step.source !== null);
          const semantic = steps.filter((step, i) => steps[i + 1]?.source !== step.source).map(step => ({ tag: step.source, values: listValues(step.state) }));
          const output = execFileSync(binary, [operation, String(target), String(target), ...values.map(String)], { encoding: 'utf8' });
          const native = output.trim().split('\n').filter(Boolean).map(line => {
            const [tag, values = ''] = line.split('|');
            return { tag, values: values.split(',').filter(Boolean).map(Number) };
          });
          expect(semantic).toEqual(native);
          const tags = sourceLines(source, operation).map(line => line.tag);
          for (const step of steps) expect(tags).toContain(step.source);
        });
      }
    }
  }
});
