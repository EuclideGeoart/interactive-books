import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildConfiguration, recordBuild, signature } from './production-state.mjs';

export function build(base, dist) {
  const config = buildConfiguration(base);
  const before = signature(config.base);
  const result = spawnSync(process.execPath, ['node_modules/astro/astro.js', 'build', '--outDir', dist], { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production', BOOK_BASE: config.base, PUBLIC_BOOK_II_BASE: config.bookIIBase } });
  if (result.error) throw result.error;
  if (result.status === 0) recordBuild(dist, config.base, before);
  return result.status ?? 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exit(build(process.argv[2] ?? '/', process.argv[3] ?? 'dist'));
