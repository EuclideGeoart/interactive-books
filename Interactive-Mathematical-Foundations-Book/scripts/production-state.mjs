import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { walk } from './validation-plan.mjs';

export function productionSignature(base) {
  const hash = createHash('sha256').update(base);
  const inputs = [...walk('src'), ...walk('code'), ...walk('public'), 'astro.config.mjs', 'tsconfig.json', 'package-lock.json', 'scripts/build-subpath.mjs'];
  for (const file of inputs.sort()) hash.update(file + '\0').update(readFileSync(file));
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  hash.update(JSON.stringify({ dependencies: pkg.dependencies, devDependencies: pkg.devDependencies }));
  return hash.digest('hex');
}
export function recordBuild(dist, base) {
  if (!existsSync(`${dist}/index.html`)) throw new Error('Build missing: ' + dist);
  writeFileSync(`${dist}/.imf-build.json`, JSON.stringify({ base, signature: productionSignature(base) }) + '\n');
}
export function freshBuild(dist, base) {
  if (!existsSync(`${dist}/index.html`) || !existsSync(`${dist}/.imf-build.json`)) return false;
  const state = JSON.parse(readFileSync(`${dist}/.imf-build.json`, 'utf8'));
  return state.base === base && state.signature === productionSignature(base);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  recordBuild(process.argv[2] ?? 'dist', process.argv[3] ?? process.env.BOOK_BASE ?? '/');
