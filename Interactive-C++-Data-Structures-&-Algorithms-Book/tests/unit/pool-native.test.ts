import { beforeAll, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { compileOwnershipFixture } from '../../scripts/ownership-fixture.mjs';
import { poolOperations, poolTrace } from '../../src/visualizers/allocator/model';
let binary: string;
beforeAll(() => { binary = compileOwnershipFixture('pool'); });
for (const count of [1, 2, 4, 6]) for (const operation of poolOperations) for (const value of [-9, 42]) {
  it(`native ${operation}: ${count} slots, value ${value}, every statement boundary`, () => {
    const semantic = poolTrace(operation, count, value).steps.filter(step => step.source !== null).map(step => `${step.source}|${step.state.head}|${step.state.block}${step.state.slots.map(s => `|${['free', 'reserved', 'live', 'destroyed'].indexOf(s.phase)},${Number(s.alive)},${s.next},${s.value ?? 'null'}`).join('')}`);
    const native = execFileSync(binary, [operation, String(count), String(value)], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    expect(semantic).toEqual(native);
  });
}
