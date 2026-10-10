import { beforeAll, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { compileOwnershipFixture } from '../../scripts/ownership-fixture.mjs';
import { hooks, intrusiveOperations, intrusiveTrace } from '../../src/visualizers/intrusive-list/model';
let binary: string;
beforeAll(() => { binary = compileOwnershipFixture('intrusive'); });
for (const selected of hooks) for (const preset of ['empty', 'single', 'three']) for (const operation of intrusiveOperations) {
  it(`native ${operation} / ${preset} / ${selected}: every hook and endpoint at every line`, () => {
    const semantic = intrusiveTrace(operation, preset, selected).steps.filter(step => step.source !== null).map(({ source, state }) => `${source}${hooks.map(h => `|${state.lists[h].head},${state.lists[h].tail}`).join('')}${state.objects.flatMap(object => hooks.map(h => { const hook = object.hooks[h]; return `|${hook.prev},${hook.next},${hook.owner === null ? -1 : hooks.indexOf(hook.owner)}`; })).join('')}|${state.current}|${state.visited.map(i => `${state.objects[i]!.value},`).join('')}`);
    const native = execFileSync(binary, [operation, preset, String(hooks.indexOf(selected)), '40'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    expect(semantic).toEqual(native);
  });
}
