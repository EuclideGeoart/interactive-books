import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { experiment, initial, type State } from '../../../src/parts/p08/model/evaluation';
import { preset } from '../../../src/parts/p08/lesson';
const localPython = process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python';
const python = process.env.BOOK_PYTHON ?? (existsSync(localPython) ? resolve(localPython) : 'python3');
function near(actual: unknown, expected: unknown) {
  if (Array.isArray(expected)) {
    expect(Array.isArray(actual)).toBe(true); expect((actual as unknown[]).length).toBe(expected.length);
    expected.forEach((v, i) => near((actual as unknown[])[i], v));
  } else if (expected !== null && typeof expected === 'object') {
    expect(actual).not.toBeNull(); expect(Object.keys(actual as object).sort()).toEqual(Object.keys(expected).sort());
    Object.entries(expected).forEach(([key, value]) => near((actual as Record<string, unknown>)[key], value));
  } else if (typeof expected === 'number') {
    expect(Number.isFinite(actual)).toBe(true);
    if (expected !== 0 && Math.abs(expected) < 1e-7) expect(Math.abs((actual as number) / expected - 1)).toBeLessThanOrEqual(2e-12);
    else expect(Math.abs((actual as number) - expected)).toBeLessThanOrEqual(2e-12 * (1 + Math.abs(expected)));
  } else expect(actual).toEqual(expected);
}
const requests: [string, State][] = [['original', initial()], ['constant', preset('constant')], ['shifted', preset('shifted')], ['absent positives', preset('all-negative')]];
for (const seed of [0, 31, 0xffffffff]) for (const folds of [2, 3, 4]) requests.push([`seed ${seed} folds ${folds}`, { ...initial(), seed, folds }]);
for (const threshold of [0, .2, .6, .8, 1]) requests.push([`threshold ${threshold}`, { ...initial(), threshold }]);
const unicode = initial(); unicode.rows = unicode.rows.map(r => ({ ...r, group: r.group === "a" ? "\u{10000}" : r.group === "b" ? "\ue000" : r.group })); requests.push(["UTF-16 group order", unicode]);
const zero = initial(); zero.probabilities[6]!.p = 0; requests.push(['unbounded log loss', zero]);
describe('actual canonical Python/TypeScript full numerical parity (owner runs)', () => {
  for (const [name, request] of requests) it(name, () => {
    const result = spawnSync(python, ['-B', 'code/python/p08/evaluation.py'], { input: JSON.stringify(request), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
    expect(result.error).toBeUndefined(); expect(result.status, result.stderr).toBe(0);
    near(experiment(request), JSON.parse(result.stdout));
  });
});
