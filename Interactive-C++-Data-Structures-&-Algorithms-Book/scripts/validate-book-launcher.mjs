import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const temp = mkdtempSync(join(tmpdir(), 'book-launcher-'));
const opened = join(temp, 'opened-urls');
// Observe the launch request without opening desktop tabs during a test.
writeFileSync(join(temp, 'xdg-open'), '#!/bin/sh\nprintf "%s\\n" "$1" >> "$BOOK_OPEN_CAPTURE"\n', { mode: 0o755 });
const env = { ...process.env, PATH: `${temp}:${process.env.PATH}`, BOOK_OPEN_CAPTURE: opened };
delete env.BOOK_BASE;
const older = createServer((req, res) => {
  res.statusCode = req.url === '/' || req.url === '/chapters/23-unordered-map/' || req.url === '/chapters/36-union-find/' ? 200 : 404;
  res.end('Earlier accepted book');
});
await new Promise(resolve => older.listen(0, '127.0.0.1', resolve));
let started;
async function launch(port) {
  const child = spawn('./open-book.sh', { env: { ...env, BOOK_PORT: String(port) }, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  return { child, code, output };
}
try {
  const rejected = await launch(older.address().port);
  assert.equal(rejected.code, 1);
  assert.match(rejected.output, /not serving the integrated book through Chapter 66/);
  console.log('Earlier book rejected before opening a browser.');
  const reserve = createServer();
  await new Promise(resolve => reserve.listen(0, '127.0.0.1', resolve));
  const port = reserve.address().port;
  await new Promise(resolve => reserve.close(resolve));
  started = await launch(port);
  assert.equal(started.code, 0, started.output);
  assert.match(started.output, /Starting Interactive DSA Book/);
  const url = `http://127.0.0.1:${port}/`;
  for (const [number, slug] of [['01', '01-singly-linked-list'], ['23', '23-unordered-map'], ['36', '36-union-find'], ['44', '44-counting-radix-sort'], ['50', '50-memoization-tabulation'], ['59', '59-lock-free-introduction'], ['66', '66-broad-phase-spatial-indexing']]) {
    const response = await fetch(`${url}chapters/${slug}/`);
    assert(response.ok);
    assert((await response.text()).includes(`data-chapter-number="${number}"`));
  }
  const reused = await launch(port);
  assert.equal(reused.code, 0, reused.output);
  assert.match(reused.output, /already running/);
  assert.deepEqual(readFileSync(opened, 'utf8').trim().split('\n'), [url, url]);
  console.log('Normal ./open-book.sh startup, BOOK_PORT override, Chapters 1/23/36/44/50/59/66 readiness, URL opening and existing-server reuse passed.');
} finally {
  if (started) {
    try { process.kill(-started.child.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
  await new Promise(resolve => older.close(resolve));
  rmSync(temp, { recursive: true, force: true });
}
