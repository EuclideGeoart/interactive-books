import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { loadEnv } from 'vite';
import prerequisites from '../src/curriculum/book-ii.json' with { type: 'json' };

export function normalizeBase(base) {
  if (typeof base !== 'string' || !/^\/(?:[a-zA-Z0-9_-]+\/?)*$/.test(base)) throw new Error('Book base must be / or a slash-separated path');
  return base.replace(/\/+$/, '') + '/';
}
export function buildConfiguration(base) {
  return { base: normalizeBase(base), bookIIBase: loadEnv('production', process.cwd(), 'PUBLIC_').PUBLIC_BOOK_II_BASE ?? prerequisites.base };
}

export function files(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(root, entry.name)) : entry.isFile() ? [join(root, entry.name)] : []);
}
export function signature(base) {
  const hash = createHash('sha256').update(JSON.stringify(buildConfiguration(base)));
  const inputs = [...['src', 'code', 'data', 'fixtures', 'public', 'scripts'].flatMap(files), 'package.json', 'package-lock.json', 'astro.config.mjs', 'tsconfig.json'];
  for (const file of inputs.sort()) hash.update(file + '\0').update(readFileSync(file));
  return hash.digest('hex');
}
export function validationSignature() {
  const hash = createHash('sha256').update(signature('/'));
  for (const file of [...files('tests'), ...files('oracle'), 'vitest.config.ts', 'playwright.config.ts', 'playwright.subpath.config.ts', 'documentation/REFERENCE_FOOTPRINT.json', 'documentation/OWNERSHIP_MAP.json'].sort()) hash.update(file + '\0').update(readFileSync(file));
  return hash.digest('hex');
}
export function freshBuild(dist, base) {
  const file = `${dist}/.book-iii-build.json`;
  if (!existsSync(file)) return false;
  const build = JSON.parse(readFileSync(file, 'utf8'));
  return build.base === normalizeBase(base) && build.signature === signature(base);
}
export function recordBuild(dist, base, expectedSignature) {
  base = normalizeBase(base);
  if (!expectedSignature || signature(base) !== expectedSignature) throw new Error('Sources or effective build configuration changed during compilation; production was not accepted');
  if (!existsSync(`${dist}/index.html`)) throw new Error(`No production build in ${dist}`);
  const outputPath = file => relative(dist, file).split(sep).join('/');
  const outputs = files(dist).filter(file => !['service-worker.js', 'manifest.webmanifest', '.book-iii-build.json'].includes(outputPath(file)));
  const version = createHash('sha256');
  for (const file of outputs.sort()) version.update(file).update(readFileSync(file));
  const urls = outputs.map(file => base + outputPath(file).replace(/index\.html$/, ''));
  const cachePrefix = `book-iii:${base}:`;
  const cache = cachePrefix + version.digest('hex').slice(0, 16);
  writeFileSync(`${dist}/manifest.webmanifest`, JSON.stringify({ name: 'Interactive Machine Learning', short_name: 'Book III', id: base, start_url: base, scope: base, display: 'standalone', background_color: '#f4f1e8', theme_color: '#f4f1e8', icons: [{ src: base + 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }] }) + '\n');
  urls.push(base + 'manifest.webmanifest');
  writeFileSync(`${dist}/service-worker.js`, `const CACHE=${JSON.stringify(cache)}, PREFIX=${JSON.stringify(cachePrefix)}, URLS=${JSON.stringify(urls)};
const PATHS=new Set(URLS.map(url=>new URL(url,self.location.origin).pathname));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!PATHS.has(url.pathname))return;event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request,{ignoreSearch:true})).then(saved=>saved||fetch(event.request)));});\n`);
  writeFileSync(`${dist}/.book-iii-build.json`, JSON.stringify({ ...buildConfiguration(base), signature: expectedSignature, cache }) + '\n');
}
