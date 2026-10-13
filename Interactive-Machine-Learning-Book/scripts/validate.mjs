import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { checkPartCoverage } from './part-inventory.mjs';
import { validationSignature } from './production-state.mjs';
const [mode = 'focused', ...args] = process.argv.slice(2);
if (!['focused', 'milestone', 'enumerate'].includes(mode) || (args.length && (args.length !== 2 || args[0] !== '--part' || !/^p0[1-9]$/.test(args[1])))) throw new Error('Use focused|milestone|enumerate [--part p01..p09]');
const part = args[1];
if (mode === 'milestone' && part) throw new Error('Milestone always validates all Parts; do not pass --part');
const scoped = mode !== 'milestone' && part;
const commands = [
  ['Type/content check', ['node_modules/astro/astro.js', 'check']],
  ['Unit and parity tests', ['node_modules/vitest/vitest.mjs', 'run', ...(scoped ? [`tests/unit/${part}`, 'tests/unit/platform'] : []), '--maxWorkers=2']],
  ['Independent oracles and freshness', ['scripts/run-oracle.mjs', ...(scoped ? [part] : [])]],
  ['Root production and offline bundle', ['scripts/build.mjs', '/', 'dist']],
  ['Subpath production', ['scripts/build.mjs', '/machine-learning/', 'dist-subpath']],
  ['Root production audit', ['scripts/check-dist.mjs', 'dist', '/']],
  ['Subpath production audit', ['scripts/check-dist.mjs', 'dist-subpath', '/machine-learning/']],
  ['Root browser validation', ['scripts/run-browser.mjs', 'playwright.config.ts', ...(scoped ? [part] : [])]],
  ['Subpath browser validation', ['scripts/run-browser.mjs', 'playwright.subpath.config.ts', ...(scoped ? [part] : [])]],
];
if (mode === 'enumerate') { console.log(JSON.stringify({ mode, part: part ?? 'all', heavyLock: '/tmp/interactive-books-heavy-gate.lock', commands }, null, 2)); process.exit(0); }
const published = checkPartCoverage();
if (part && !published.some(owner => owner.id === part)) throw new Error(`No published Part selected: ${part}`);
const sourceSignature = validationSignature();
const started = new Date().toISOString();
const directory = `validation-results/${mode}-${started.replace(/[:.]/g, '-')}`;
mkdirSync(directory, { recursive: true });
const results = [];
for (const [name, argv] of commands) {
  console.log(`Running: ${name}`);
  const start = Date.now();
  const result = spawnSync(process.execPath, argv, { stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  const unchanged = validationSignature() === sourceSignature;
  const exitCode = result.error ? 1 : result.status === 0 && unchanged ? 0 : result.status || 1;
  results.push({ name, argv, exitCode, seconds: (Date.now() - start) / 1000, sourceUnchanged: unchanged });
  writeFileSync(`${directory}/manifest.json`, JSON.stringify({ mode, part: scoped || 'all', sourceSignature, chapters: published.flatMap(p => p.chapters.filter(c => c.slug).map(c => c.id)), started, finished: new Date().toISOString(), complete: results.length === commands.length && results.every(r => r.exitCode === 0), results }, null, 2) + '\n');
  if (exitCode !== 0) { if (!unchanged) console.error('Sources changed during validation; acceptance is invalid.'); process.exit(exitCode); }
}
console.log(`Passed ${results.length} gates. Evidence: ${directory}/manifest.json`);
