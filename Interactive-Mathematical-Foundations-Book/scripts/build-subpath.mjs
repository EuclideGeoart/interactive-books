// Builds the sub-directory deployment (BOOK_BASE=/math-foundations/ into dist-subpath/). Replaces the Unix-only
// `BOOK_BASE=... astro build` script so it runs unchanged in PowerShell, cmd and POSIX shells.
import { spawnSync } from 'node:child_process';

const r = spawnSync(process.execPath, ['node_modules/astro/astro.js', 'build', '--outDir', 'dist-subpath'], {
  stdio: 'inherit',
  env: { ...process.env, BOOK_BASE: process.env.BOOK_BASE ?? '/math-foundations/' },
});
process.exit(r.status ?? 1);
