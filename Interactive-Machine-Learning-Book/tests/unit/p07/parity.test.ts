import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { svm, type SVMState } from '../../../src/parts/p07/model/svm';
import { initialLab, preset } from '../../../src/parts/p07/lesson';
import review from '../../../fixtures/p07/review-regressions.json';
interface Case { name: string; input: SVMState; expected: Record<string, unknown> }
const fixture = JSON.parse(readFileSync('fixtures/p07/svm.fixtures.json', 'utf8')) as { cases: Case[] };
const localPython = process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python';
const python = process.env.BOOK_PYTHON ?? (existsSync(localPython) ? resolve(localPython) : 'python3');
function near(a: unknown, b: unknown): void {
  if (Array.isArray(b)) { expect(Array.isArray(a)).toBe(true); expect((a as unknown[]).length).toBe(b.length); b.forEach((v, i) => near((a as unknown[])[i], v)); }
  else if (b !== null && typeof b === 'object') { expect(a).not.toBeNull(); expect(Object.keys(a as object).sort()).toEqual(Object.keys(b).sort()); Object.entries(b).forEach(([key, v]) => near((a as Record<string, unknown>)[key], v)); }
  else if (typeof b === 'number') expect(Math.abs((a as number) - b)).toBeLessThanOrEqual(2e-10 * (1 + Math.abs(b)));
  else expect(a).toEqual(b);
}
function reference(s: SVMState) {
  const run = spawnSync(python, ['-B', 'code/python/p07/svm.py'], { input: JSON.stringify(s), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
  expect(run.error).toBeUndefined(); expect(run.status, run.stderr).toBe(0); return JSON.parse(run.stdout) as ReturnType<typeof svm>;
}
describe('hand literal expectations plus actual canonical Python execution', () => {
  it('actual Python polynomial diagnostic failure matches TS and withholds acceptance', () => {
    const s = review.diagnosticFailure.input as unknown as SVMState, r = svm(s);
    expect(r.status).toBe('failed'); expect(r.kkt).toBeGreaterThan(2e-5); near(reference(s), r);
  });
  for (const c of fixture.cases) it(c.name, () => {
    const r = svm(c.input);
    for (const [key, expected] of Object.entries(c.expected)) {
      const actual = key === 'scores' ? r.rows.map(row => row.score) : key === 'distances' ? r.rows.map(row => row.signedDistance) : key === 'hinges' ? r.rows.map(row => row.hinge) : (r as unknown as Record<string, unknown>)[key]; near(actual, expected);
    }
    near(reference(c.input), r);
  });
  for (const mode of ['hard', 'soft', 'kernel'] as const) for (const name of ['separable', 'outlier', 'overlap', 'coincident', 'xor'] as const)
    it(`actual Python ${mode} ${name} parity`, () => {
      const s = preset(initialLab(mode), name); near(reference(s), svm(s));
    });
  for (const kind of ['linear', 'polynomial', 'rbf'] as const) it(`actual Python bounded ${kind} kernel parameters`, () => {
    const s = { ...initialLab('kernel'), kernel: { kind, gamma: .5, coef0: .25, degree: 3 } };
    near(reference(s), svm(s));
  });
});
