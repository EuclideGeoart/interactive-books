import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { files, freshBuild, normalizeBase } from './production-state.mjs';
import { bookIIHref } from '../src/curriculum/prerequisites.mjs';
import prerequisiteMap from '../src/curriculum/book-ii.json' with { type: 'json' };
const [dist = 'dist', baseArg = '/'] = process.argv.slice(2);
const base = normalizeBase(baseArg);
assert(freshBuild(dist, base), `Stale or missing production build: ${dist}`);
const build = JSON.parse(readFileSync(`${dist}/.book-iii-build.json`, 'utf8'));
const prerequisites = new Set(prerequisiteMap.chapters.map(chapter => bookIIHref(chapter.id, build.bookIIBase)));
const curriculum = JSON.parse(readFileSync(`${dist}/curriculum.json`, 'utf8'));
assert.equal(curriculum.parts.length, 9); assert.equal(curriculum.chapters.length, 41);
assert.equal(new Set(curriculum.chapters.map(c => c.id)).size, 41);
const available = curriculum.chapters.filter(c => c.status === 'available');
for (const chapter of available) {
  const html = readFileSync(`${dist}/chapters/${chapter.slug}/index.html`, 'utf8');
  assert(html.includes(`data-chapter-id="${chapter.id}"`), `Wrong published chapter: ${chapter.id}`);
}
const pages = files(`${dist}/chapters`).filter(file => file.endsWith('.html'));
assert.equal(pages.length, available.length, 'Extra or missing chapter page');
for (const file of files(dist).filter(file => file.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  assert(!html.includes('katex-error'), `Broken mathematics: ${file}`);
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const address = match[1];
    if (/^(?:https?:|data:|mailto:|#)/.test(address) || prerequisites.has(address)) continue;
    assert(address.startsWith(base), `Link escapes production base: ${file}: ${address}`);
    const relative = address.slice(base.length).split(/[?#]/)[0];
    const target = join(dist, relative.endsWith('/') || relative === '' ? relative + 'index.html' : relative);
    assert(existsSync(target), `Missing asset/page: ${file}: ${address}`);
  }
}
const manifest = JSON.parse(readFileSync(`${dist}/manifest.webmanifest`, 'utf8'));
assert.equal(manifest.scope, base); assert.equal(manifest.start_url, base);
assert(readFileSync(`${dist}/service-worker.js`, 'utf8').includes(JSON.stringify(base + 'chapters/')) || available.every(c => readFileSync(`${dist}/service-worker.js`, 'utf8').includes(base + `chapters/${c.slug}/`)), 'Offline chapter paths missing');
console.log(`Production ${base}: ${available.length}/41 chapter pages, all internal links/assets and PWA paths valid.`);
