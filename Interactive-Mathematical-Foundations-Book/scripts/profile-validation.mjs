import { mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const [label = 'sample', workers = '3'] = process.argv.slice(2);
if (!/^[a-z0-9-]+$/.test(label) || !/^[1-9]\d*$/.test(workers)) throw new Error('Usage: npm run measure:validation -- <label> <workers>');
if (!existsSync('/usr/bin/time')) throw new Error('Resource profiling requires Linux /usr/bin/time; normal validation is portable.');
mkdirSync('validation-results', { recursive: true });
const args = ['node_modules/@playwright/test/cli.js', 'test', 'tests/e2e/chapters.spec.ts', 'tests/e2e/deployment.spec.ts',
  'tests/e2e/visual-part-i.spec.ts', 'tests/e2e/visual-linear-algebra.spec.ts',
  '--grep', 'I\\.9 The notation|II\\.10 Matrix|every internal link|notation-map — opening stage|matrix composition: opening',
  '--workers', workers, '--trace', 'off', '--output', `validation-results/${label}-failures`, '--reporter', 'list,./scripts/timing-reporter.mjs'];
const result = spawnSync('flock', ['/tmp/imf-heavy.lock', '/usr/bin/time', '-v', '-o', `validation-results/${label}-resources.txt`, process.execPath, ...args],
  { stdio: 'inherit', env: { ...process.env, BOOK_TIMING_OUTPUT: `validation-results/${label}-timing.json` } });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
