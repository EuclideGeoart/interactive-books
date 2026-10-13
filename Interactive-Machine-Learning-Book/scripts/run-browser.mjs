import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { publishedParts } from './part-inventory.mjs';

/** Check collected tests before running and actually passed tests after running. */
export function browserCoverage(report, requiredParts, executed = false) {
  const projects = report.config.projects.map(project => project.name);
  const counts = Object.fromEntries(requiredParts.flatMap(part => projects.map(project => [`${part}:${project}`, 0])));
  function inspect(suite) {
    for (const spec of suite.specs ?? []) {
      const owner = spec.file.replaceAll('\\', '/').match(/(?:^|\/)(p0[1-9])\//)?.[1];
      if (!owner) continue;
      for (const test of spec.tests) {
        const key = `${owner}:${test.projectName}`;
        if (key in counts && test.expectedStatus === 'passed' && (!executed || test.results.some(result => result.status === 'passed'))) counts[key]++;
      }
    }
    for (const child of suite.suites ?? []) inspect(child);
  }
  for (const suite of report.suites) inspect(suite);
  for (const [key, count] of Object.entries(counts)) if (!count) throw new Error(`Missing ${executed ? 'executed' : 'runnable'} Part browser coverage: ${key}`);
  return counts;
}

function run(config, part) {
  if (!['playwright.config.ts', 'playwright.subpath.config.ts'].includes(config) || part && !/^p0[1-9]$/.test(part)) throw new Error('Invalid browser config or Part');
  const owners = publishedParts().filter(owner => !part || owner.id === part).map(owner => owner.id);
  if (!owners.length) throw new Error(`No published Part selected: ${part}`);
  const args = ['node_modules/@playwright/test/cli.js', 'test', '--config', config, ...(part ? ['tests/e2e/platform', `tests/e2e/${part}`] : [])];
  const listing = spawnSync(process.execPath, [...args, '--list', '--reporter=json'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (listing.error) throw listing.error;
  if (listing.status !== 0) { console.error(listing.stdout, listing.stderr); return listing.status ?? 1; }
  browserCoverage(JSON.parse(listing.stdout), owners);
  mkdirSync('artifacts', { recursive: true });
  const result = spawnSync(process.execPath, [...args, '--trace', 'off'], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) return result.status ?? 1;
  const file = config === 'playwright.config.ts' ? 'artifacts/browser-root.json' : 'artifacts/browser-subpath.json';
  const counts = browserCoverage(JSON.parse(readFileSync(file, 'utf8')), owners, true);
  console.log('Executed Part/project browser coverage:', JSON.stringify(counts));
  return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exit(run(process.argv[2] ?? 'playwright.config.ts', process.argv[3]));
