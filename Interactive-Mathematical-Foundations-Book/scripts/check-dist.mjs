// Static checks on a built site — no browser, no dependencies (master plan §12.1, §12.10).
//
//   node scripts/check-dist.mjs <distDir> <basePath>      e.g.  dist /      and      dist-subpath /math-foundations/
//
// For every HTML page: one <h1>, a <title>, lang, a <main>, unique ids, no KaTeX error nodes; every href/src (and every
// root-relative attribute, including Astro's component-url) starts with the base path and resolves to a real file; every
// in-site #fragment exists in its target page. For every CSS file: every url() resolves. Exit code 1 on any problem.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const [distArg = 'dist', baseArg = '/'] = process.argv.slice(2);
const dist = resolve(distArg);
const base = ('/' + baseArg.replace(/^\/+|\/+$/g, '') + '/').replace(/^\/\/$/, '/');
const problems = [];
const fail = (where, what) => problems.push(`${where}: ${what}`);
const walk = d => readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(dist);
const rel = f => f.slice(dist.length + 1);
const htmlFiles = files.filter(f => f.endsWith('.html'));
const idsByFile = new Map();

function fileForUrlPath(pathname) {
  const inner = pathname.slice(base.length);
  const target = join(dist, inner);
  if (pathname.endsWith('/')) return join(target, 'index.html');
  return existsSync(target) && statSync(target).isDirectory() ? join(target, 'index.html') : target;
}

for (const f of htmlFiles) {
  const html = readFileSync(f, 'utf8');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  idsByFile.set(f, new Set(ids));
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) fail(rel(f), `duplicate ids: ${[...new Set(dup)].join(', ')}`);
  const is404 = rel(f) === '404.html';
  if ((html.match(/<h1[\s>]/g) ?? []).length !== 1) fail(rel(f), 'expected exactly one <h1>');
  if (!/<title>[^<]{3,}<\/title>/.test(html)) fail(rel(f), 'missing <title>');
  if (!/<html[^>]*\slang="en"/.test(html)) fail(rel(f), 'missing lang="en"');
  if (!/<main[\s>]/.test(html)) fail(rel(f), 'missing <main>');
  if (html.includes('katex-error')) fail(rel(f), 'contains a KaTeX error node');
  if (/\$\$|\\mathbf|\\norm|\\sqrt\{/.test(html.replace(/<annotation[\s\S]*?<\/annotation>/g, '').replace(/data-tex="[^"]*"/g, ''))) fail(rel(f), 'contains raw TeX outside annotations');

  const refs = [...html.matchAll(/\s(?:href|src|component-url|renderer-url|before-hydration-url|poster|action)="([^"]*)"/g)].map(m => m[1]);
  for (const ref of refs) {
    if (ref === '' ) { fail(rel(f), 'empty URL attribute'); continue; }
    if (/^(https?:|mailto:|tel:|data:|javascript:)/.test(ref)) { if (/^https?:/.test(ref)) fail(rel(f), `external URL: ${ref}`); continue; }
    if (ref.startsWith('#')) { if (ref.length > 1 && !idsByFile.get(f).has(decodeURIComponent(ref.slice(1)))) fail(rel(f), `in-page anchor without target: ${ref}`); continue; }
    if (ref.startsWith('//')) { fail(rel(f), `protocol-relative URL: ${ref}`); continue; }
    if (!ref.startsWith('/')) { fail(rel(f), `relative URL (should be base-absolute): ${ref}`); continue; }
    const [pathname, fragment] = ref.split('#');
    if (!pathname.startsWith(base)) { fail(rel(f), `URL outside the base ${base}: ${ref}`); continue; }
    const target = fileForUrlPath(pathname.split('?')[0]);
    if (!existsSync(target)) { fail(rel(f), `dead URL ${ref} (no ${target.slice(dist.length + 1)})`); continue; }
    if (fragment && target.endsWith('.html')) {
      if (!idsByFile.has(target)) idsByFile.set(target, new Set([...readFileSync(target, 'utf8').matchAll(/\sid="([^"]+)"/g)].map(m => m[1])));
      if (!idsByFile.get(target).has(decodeURIComponent(fragment))) fail(rel(f), `fragment #${fragment} not found in ${rel(target)}`);
    }
  }
  void is404;
}

for (const f of files.filter(f => f.endsWith('.css'))) {
  const css = readFileSync(f, 'utf8');
  for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
    const u = m[1];
    if (/^(data:|#)/.test(u)) continue;
    if (/^https?:/.test(u)) { fail(rel(f), `external url(): ${u}`); continue; }
    const target = u.startsWith('/') ? (u.startsWith(base) ? fileForUrlPath(u.split(/[?#]/)[0]) : null) : resolve(dirname(f), u.split(/[?#]/)[0]);
    if (!target) { fail(rel(f), `url() outside base: ${u}`); continue; }
    if (!existsSync(target)) fail(rel(f), `dead url(): ${u}`);
  }
}
for (const f of files.filter(f => f.endsWith('.js'))) {
  const js = readFileSync(f, 'utf8');
  if (base !== '/' && new RegExp(`["'\`]/_astro/`).test(js)) fail(rel(f), 'hard-coded root-relative /_astro/ URL in a script');
}

const need = ['index.html', 'contents/index.html', 'foundation/index.html', 'chapters/vectors/index.html', '404.html'];
for (const n of need) if (!existsSync(join(dist, n))) fail(n, 'expected page was not built');
// Exactly the published chapters have a page (M3: only I.3 'vectors'); planned chapters must never have one.
const publishedSlugs = ['vectors'];
const chapterDirs = existsSync(join(dist, 'chapters')) ? readdirSync(join(dist, 'chapters')) : [];
if (JSON.stringify([...chapterDirs].sort()) !== JSON.stringify(publishedSlugs)) fail('chapters/', `expected exactly ${publishedSlugs.join(', ')}, found ${chapterDirs.join(', ') || 'none'}`);

console.log(`${distArg} @ ${base}: ${htmlFiles.length} pages, ${files.filter(f => f.endsWith('.css')).length} stylesheets, ${files.length} files checked — ${problems.length ? problems.length + ' PROBLEM(S)' : 'OK'}`);
for (const p of problems) console.error('  ✗ ' + p);
process.exit(problems.length ? 1 : 0);
