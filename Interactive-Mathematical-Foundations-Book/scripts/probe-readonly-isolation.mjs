import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

// Exercise the actual read-only suite's hooks with one deliberately bad expectation, never the application source.
const directory = 'validation-results/isolation-probe';
mkdirSync(directory, { recursive: true });
const fixture = mkdtempSync(join(tmpdir(), 'imf-t0-isolation-'));
const playwright = fileURLToPath(import.meta.resolve('@playwright/test'));
let source = readFileSync('tests/e2e/chapters.spec.ts', 'utf8');
for (const [from, to] of [['@axe-core/playwright', fileURLToPath(import.meta.resolve('@axe-core/playwright'))], ['@playwright/test', playwright],
  ['../../src/curriculum/queries', resolve('src/curriculum/queries.ts')], ['./helpers', resolve('tests/e2e/helpers.ts')], ['./timing', resolve('tests/e2e/timing.ts')]])
  source = source.replace(`from '${from}'`, `from ${JSON.stringify(to)}`);
const selection = "allChapters.filter(r => r.chapter.status === 'available' && r.chapter.slug)";
assert(source.includes(selection), 'Publication selector changed; update the probe');
source = source.replace(selection, "allChapters.filter(r => r.id === 'II.10' && r.chapter.status === 'available' && r.chapter.slug)");
const assertion = 'toHaveTitle(`${ref.chapter.title} — Mathematical Foundations`)';
assert(source.includes(assertion), 'Metadata assertion changed; update the probe');
source = source.replace(assertion, "toHaveTitle('T0 intentional failure-isolation probe')");
writeFileSync(`${fixture}/chapter-probe.spec.ts`, source);
writeFileSync(`${fixture}/probe.config.ts`, `import { defineConfig } from ${JSON.stringify(playwright)};\nimport base from ${JSON.stringify(resolve('playwright.config.ts'))};\nexport default defineConfig({ ...base, webServer: { ...base.webServer, cwd: ${JSON.stringify(process.cwd())} }, testDir: '.', testMatch: 'chapter-probe.spec.ts', projects: [base.projects![0]!], reporter: [['json', { outputFile: ${JSON.stringify(resolve(directory, 'results.json'))} }]] });\n`);
const result = spawnSync('flock', ['/tmp/imf-heavy.lock', process.execPath, 'node_modules/@playwright/test/cli.js', 'test', '--config', `${fixture}/probe.config.ts`,
  '--grep', 'read-only checks', '--trace', 'off', '--output', `${directory}/failures`], { stdio: 'inherit' });
assert.equal(result.status, 1, 'The injected assertion must fail');
const report = JSON.parse(readFileSync(`${directory}/results.json`, 'utf8'));
const flatten = suite => [...(suite.specs ?? []).flatMap(spec => spec.tests.flatMap(test => test.results)), ...(suite.suites ?? []).flatMap(flatten)];
const results = report.suites.flatMap(flatten);
const failures = results.filter(result => result.status === 'failed'), passes = results.filter(result => result.status === 'passed');
assert.equal(failures.length, 1);
assert.equal(passes.length, 5, 'Later read-only checks must run after a failure, not be skipped');
assert.notEqual(failures[0].workerIndex, passes[0].workerIndex, 'Failed worker must restart and recreate the shared page');
assert(failures[0].attachments.some(attachment => attachment.contentType === 'image/png' && attachment.path && existsSync(attachment.path)), 'Failure screenshot must be retained');
console.log('Isolation probe passed: one intentional failure, five later passes, recreated page, retained PNG; no product assertion was changed.');
