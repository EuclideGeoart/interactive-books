// Bump this when the worker's caching or routing behavior changes.
const CACHE_PREFIX = 'interactive-cpp-book-';
const CACHE_VERSION = 'v2-part-first';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const SCOPE_URL = new URL(self.registration.scope);
const HOME_URL = new URL('./', SCOPE_URL).href;
const CONTENTS_URL = new URL('contents/', SCOPE_URL).href;
const CHAPTER_ZERO_URL = new URL('chapters/00-cpp-foundations/', SCOPE_URL).href;
const OFFLINE_URL = new URL('offline.html', SCOPE_URL).href;
const CORE_URLS = [
  new URL('manifest.webmanifest', SCOPE_URL).href,
  new URL('favicon.svg', SCOPE_URL).href,
  new URL('icons/icon-192.png', SCOPE_URL).href,
  new URL('icons/icon-512.png', SCOPE_URL).href,
  new URL('icons/icon-maskable-512.png', SCOPE_URL).href,
  OFFLINE_URL,
];

function isInScope(url) {
  return url.origin === SCOPE_URL.origin && url.pathname.startsWith(SCOPE_URL.pathname);
}

function localBuildAssets(html, pageUrl) {
  const assets = new Set();
  for (const [, reference] of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
    const url = new URL(reference, pageUrl);
    if (isInScope(url) && url.pathname.includes('/_astro/') && /\.(?:css|js)$/.test(url.pathname)) assets.add(url.href);
  }
  return [...assets];
}

async function precacheBuildAsset(cache, assetUrl, visited) {
  const url = new URL(assetUrl);
  if (!isInScope(url) || !url.pathname.includes('/_astro/') || visited.has(url.href)) return;
  visited.add(url.href);
  const response = await fetchInto(cache, url.href);
  const source = await response.clone().text();
  let dependencies = [];
  if (/\.js$/.test(url.pathname)) {
    dependencies = [...source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"]([^'"]+)['"]/g)].map(([, path]) => new URL(path, url).href);
  } else if (/\.css$/.test(url.pathname)) {
    dependencies = [...source.matchAll(/url\(\s*['"]?([^)'\"]+)['"]?\s*\)/g)].map(([, path]) => new URL(path, url).href);
  }
  await Promise.all(dependencies.map(path => precacheBuildAsset(cache, path, visited)));
}

async function fetchInto(cache, url) {
  const response = await fetch(new Request(url, { cache: 'reload' }));
  if (!response.ok) throw new Error(`Could not precache ${url}: ${response.status}`);
  await cache.put(url, response.clone());
  return response;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const assets = new Set(CORE_URLS);
    for (const pageUrl of [HOME_URL, CONTENTS_URL, CHAPTER_ZERO_URL]) {
      const response = await fetchInto(cache, pageUrl);
      for (const asset of localBuildAssets(await response.clone().text(), pageUrl)) assets.add(asset);
    }
    const visited = new Set();
    await Promise.all([...assets].map(url => precacheBuildAsset(cache, url, visited)));
    await Promise.all(CORE_URLS.map(url => fetchInto(cache, url)));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const oldCaches = (await caches.keys()).filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME);
    await Promise.all(oldCaches.map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function networkFirst(request, isNavigation = false) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
    return response;
  } catch {
    const saved = await cache.match(request);
    if (saved) return saved;
    if (!isNavigation) return new Response('This source has not been saved on this device yet.', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
    const fallback = await cache.match(OFFLINE_URL);
    if (!fallback) return new Response('Offline page unavailable.', { status: 503, statusText: 'Offline' });
    const html = await fallback.text();
    return new Response(html.replaceAll('@@BOOK_HOME@@', SCOPE_URL.pathname), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!isInScope(url)) return;
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, true));
    return;
  }
  if (url.pathname.includes('/source/')) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(cacheFirst(request));
  }
});
