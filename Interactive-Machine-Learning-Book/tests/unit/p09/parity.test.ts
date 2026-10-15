import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { forward, type Input } from '../../../src/parts/p09/model/forward';
import { initial } from '../../../src/parts/p09/lesson';
const localPython = process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python';
const python = process.env.BOOK_PYTHON ?? (existsSync(localPython) ? resolve(localPython) : 'python3');
const fixtures = JSON.parse(readFileSync('fixtures/p09/forward.fixtures.json', 'utf8')) as { cases: { name: string; input: Input; exact: boolean }[] };
function run(input: unknown) { return spawnSync(python, ['-B', 'code/python/p09/forward.py'], { input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } }); }
function near(a: unknown, e: unknown, exact = false) {
  if (Array.isArray(e)) { expect(Array.isArray(a)).toBe(true); expect((a as unknown[]).length).toBe(e.length); e.forEach((v, i) => near((a as unknown[])[i], v, exact)); }
  else if (e !== null && typeof e === 'object') {
    expect(a).not.toBeNull(); expect(Object.keys(a as object).sort()).toEqual(Object.keys(e).sort());
    Object.entries(e).forEach(([k, v]) => near((a as Record<string, unknown>)[k], v, exact));
  } else if (typeof e === 'number') {
    expect(Number.isFinite(a)).toBe(true);
    if (exact || e === 0) expect(a === e).toBe(true);
    else expect(Math.abs((a as number) - e)).toBeLessThanOrEqual(32 * Number.EPSILON * (Math.abs(e) + (Math.abs(e) >= 1e-8 ? 1 : 0)));
  } else expect(a).toEqual(e);
}
const requests = [...fixtures.cases];
for (const mode of ['neuron', 'network'] as const) for (const activation of ['identity', 'relu', 'sigmoid'] as const) for (const value of [-1000, -40, -2, 0, 2, 40, 1000]) {
  const base = initial(mode).input;
  requests.push({ name: `${mode} ${activation} x1=${value}`, input: { ...base, x: [value, base.x[1]!], activation }, exact: activation !== 'sigmoid' });
}
describe('actual canonical Python parity, owner execution only', () => {
  for (const c of requests) it(c.name, () => {
    const result = run(c.input); expect(result.error).toBeUndefined(); expect(result.status, result.stderr).toBe(0);
    near(JSON.parse(result.stdout), forward(c.input), c.exact);
  });
  it('both kernels reject malformed inputs and finite-input overflow/nonrepresentability', () => {
    for (const s of [null, {}, { ...initial('neuron').input, x: ['1', 0] }, { ...initial('network').input, W2: [[1]] },
      { kind: 'neuron', x: [1e308], w: [2], b: 0, activation: 'relu' }, { kind: 'neuron', x: [1e-300], w: [1e-300], b: 0, activation: 'identity' }]) {
      expect(() => forward(s as Input)).toThrow(); const result = run(s); expect(result.error).toBeUndefined(); expect(result.status).toBe(1); expect(result.stderr.length).toBeGreaterThan(0);
    }
  });
});
