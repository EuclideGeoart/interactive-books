import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const source = readFileSync('public/sw.js', 'utf8');

for (const base of ['/', '/books/cpp/']) describe(`Part-first PWA scope ${base}`, () => {
  it('precaches three distinct pages and their build assets, retires v1 and preserves unrelated caches', async () => {
    const scope = `https://book.test${base}`;
    const saved = new Map<string, Map<string, Response>>([
      ['interactive-cpp-book-v1', new Map()], ['another-app', new Map()],
    ]);
    const handlers: Record<string, (event: { waitUntil(value: Promise<unknown>): void }) => void> = {};
    const requests: string[] = [];
    runInNewContext(source, {
      URL, Request, Response, Set,
      self: { registration: { scope }, clients: { claim: async () => {} }, addEventListener: (name: string, callback: typeof handlers[string]) => { handlers[name] = callback; } },
      caches: {
        keys: async () => [...saved.keys()],
        delete: async (name: string) => saved.delete(name),
        open: async (name: string) => {
          if (!saved.has(name)) saved.set(name, new Map());
          return { put: async (url: string, response: Response) => { saved.get(name)!.set(url, response); } };
        },
      },
      fetch: async (request: Request) => {
        const url = request.url;
        requests.push(url);
        if (url.endsWith('/')) return new Response(`<link href="${base}_astro/shell.css"><script src="${base}_astro/shell.js"></script>`);
        if (url.endsWith('shell.js')) return new Response('import "./shared.js";');
        return new Response('cached');
      },
    });
    let pending: Promise<unknown> = Promise.resolve();
    handlers.install!({ waitUntil: promise => { pending = promise; } });
    await pending;
    handlers.activate!({ waitUntil: promise => { pending = promise; } });
    await pending;
    const urls = [...saved.get('interactive-cpp-book-v2-part-first')!.keys()];
    expect(urls).toEqual(expect.arrayContaining([scope, `${scope}contents/`, `${scope}chapters/00-cpp-foundations/`, `${scope}_astro/shell.css`, `${scope}_astro/shell.js`, `${scope}_astro/shared.js`, `${scope}offline.html`]));
    expect(requests.every(url => url.startsWith(scope))).toBe(true);
    expect(saved.has('interactive-cpp-book-v1')).toBe(false);
    expect(saved.has('another-app')).toBe(true);
  });
});
