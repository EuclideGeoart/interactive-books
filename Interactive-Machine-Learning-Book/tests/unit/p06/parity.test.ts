import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { pca, type PCAState } from '../../../src/parts/p06/model/pca';
interface Case { name: string; input: PCAState; expected: Record<string, unknown> }
const fixture = JSON.parse(readFileSync('fixtures/p06/pca.fixtures.json', 'utf8')) as { cases: Case[] };
const near = (a: unknown, b: unknown) => {
  if (Array.isArray(b)) { expect(Array.isArray(a)).toBe(true); expect((a as unknown[]).length).toBe(b.length); b.forEach((v, i) => near((a as unknown[])[i], v)); }
  else if (b !== null && typeof b === 'object') {
    expect(a).not.toBeNull(); expect(Object.keys(a as object).sort()).toEqual(Object.keys(b).sort());
    Object.entries(b).forEach(([key, value]) => near((a as Record<string, unknown>)[key], value));
  }
  else if (typeof b === 'number') expect(Math.abs((a as number) - b)).toBeLessThanOrEqual(2e-12 * (1 + Math.abs(b)));
  else expect(a).toEqual(b);
};
const localPython = process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python';
const python = process.env.BOOK_PYTHON ?? (existsSync(localPython) ? resolve(localPython) : 'python3');

describe('independent hand-calculated fixtures and actual Python parity', () => {
  for (const c of fixture.cases) it(c.name, () => {
    const actual = pca(c.input);
    expect(actual.status).toBe(c.expected.status);
    for (const [key, expected] of Object.entries(c.expected)) {
      if (key === 'minorRelativeTolerance') continue;
      if (key === 'projector' && actual.status === 'defined') {
        const v = actual.axes[0]; near(v.map(x => v.map(y => x * y)), expected);
      } else if (key === 'reconstructed' && actual.status === 'defined') near(actual.rows.map(r => r.reconstructed), expected);
      else near((actual as unknown as Record<string, unknown>)[key], expected);
    }
    if (c.expected.minorRelativeTolerance && actual.status === 'defined') {
      expect(Math.abs(actual.eigenvalues[1] / (c.expected.eigenvalues as number[])[1]! - 1)).toBeLessThan(2e-12);
      expect(Math.abs(actual.sse / (c.expected.sse as number) - 1)).toBeLessThan(2e-12);
    }
    const run = spawnSync(python, ['-B', 'code/python/p06/pca.py'], { input: JSON.stringify(c.input), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
    expect(run.error).toBeUndefined(); expect(run.status, run.stderr).toBe(0);
    const reference = JSON.parse(run.stdout) as ReturnType<typeof pca>;
    for (const key of Object.keys(actual).filter(key => key !== 'axes' && key !== 'rows'))
      near((reference as unknown as Record<string, unknown>)[key], (actual as unknown as Record<string, unknown>)[key]);
    if (actual.status === 'defined' && reference.status === 'defined') {
      reference.axes.forEach(v => near(Math.hypot(...v), 1));
      near(reference.axes[0][0] * reference.axes[1][0] + reference.axes[0][1] * reference.axes[1][1], 0);
      if (!actual.repeated) {
        const a = actual.axes[0], b = reference.axes[0];
        near(a.map(x => a.map(y => x * y)), b.map(x => b.map(y => x * y)));
      }
      actual.rows.forEach((row, i) => {
        const py = reference.rows[i]!; near(py.id, row.id); near(py.x, row.x); near(py.centered, row.centered);
        near(py.fullScores.reduce((sum, v) => sum + v * v, 0), row.fullScores.reduce((sum, v) => sum + v * v, 0));
        if (!actual.repeated || c.input.k !== 1) {
          near(py.reconstructed, row.reconstructed); near(py.residual, row.residual); near(py.squaredError, row.squaredError);
        }
      });
    }
  });
});
