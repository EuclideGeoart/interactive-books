import { expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkPartCoverage } from '../../../scripts/part-inventory.mjs';
import { normalizeBase, recordBuild, signature } from '../../../scripts/production-state.mjs';
import { spawnSync } from 'node:child_process';
import { browserCoverage } from '../../../scripts/run-browser.mjs';

it('requires numerical and browser evidence for every actually published Part', () => {
  const root = mkdtempSync(join(tmpdir(), 'b3-coverage-'));
  const put = (path: string, text = '') => { const file = join(root, path); mkdirSync(join(file, '..'), { recursive: true }); writeFileSync(file, text); };
  try {
    put('src/parts/p02/manifest.json', JSON.stringify({ part: 'p02', chapters: [{ id: 'III-07', slug: 'linear-regression' }] }));
    mkdirSync(join(root, 'oracle'), { recursive: true });
    expect(() => checkPartCoverage(root)).toThrow('Missing oracle');
    put('oracle/p02/manifest.json', '{}');
    expect(() => checkPartCoverage(root)).toThrow('Missing Part suite');
    put('tests/unit/p02/model.test.ts');
    expect(() => checkPartCoverage(root)).toThrow('tests/e2e');
    put('tests/e2e/p02/reference.spec.ts');
    expect(checkPartCoverage(root).map(part => part.id)).toEqual(['p02']);
    put('src/parts/p03/manifest.json', JSON.stringify({ part: 'p03', chapters: [{ id: 'III-17', slug: 'nearest-neighbors' }] }));
    expect(() => checkPartCoverage(root)).toThrow('Missing oracle manifest: p03');
    put('oracle/p3/unowned.py');
    expect(() => checkPartCoverage(root)).toThrow('Unexpected oracle directory');
  } finally { rmSync(root, { recursive: true }); }
});

it('normalizes mounts and includes the effective prerequisite deployment in freshness', () => {
  expect(normalizeBase('/machine-learning')).toBe('/machine-learning/');
  expect(normalizeBase('/')).toBe('/');
  expect(() => normalizeBase('//other/')).toThrow();
  const before = signature('/');
  const original = process.env.PUBLIC_BOOK_II_BASE;
  try {
    process.env.PUBLIC_BOOK_II_BASE = '/books/math/';
    expect(signature('/')).not.toBe(before);
  } finally { if (original === undefined) delete process.env.PUBLIC_BOOK_II_BASE; else process.env.PUBLIC_BOOK_II_BASE = original; }
  expect(() => recordBuild('dist', '/', 'wrong-pre-build-signature')).toThrow('changed during compilation');
});

it('refuses to label a complete milestone as one selected Part', () => {
  const result = spawnSync(process.execPath, ['scripts/validate.mjs', 'milestone', '--part', 'p03'], { encoding: 'utf8' });
  expect(result.status).not.toBe(0); expect(result.stderr).toContain('Milestone always validates all Parts');
});

it('rejects an empty, skipped or unexecuted Part suite for either mount', () => {
  const projects = ['desktop', 'tablet', 'mobile'];
  const report = { config: { projects: projects.map(name => ({ name })) }, suites: [{ specs: [{ file: 'p02/reference.spec.ts', tests: projects.map(projectName => ({ projectName, expectedStatus: 'passed', results: [] as { status: string }[] })) }] }] };
  expect(() => browserCoverage(report, ['p02'])).not.toThrow();
  expect(() => browserCoverage(report, ['p02', 'p03'])).toThrow('p03:desktop');
  expect(() => browserCoverage(report, ['p02'], true)).toThrow('executed');
  for (const test of report.suites[0]!.specs[0]!.tests) test.results = [{ status: 'passed' }];
  expect(() => browserCoverage(report, ['p02'], true)).not.toThrow();
  report.suites[0]!.specs[0]!.tests[2]!.results = [{ status: 'skipped' }];
  expect(() => browserCoverage(report, ['p02'], true)).toThrow('p02:mobile');
  report.suites = [];
  expect(() => browserCoverage(report, ['p02'])).toThrow('runnable');
});
