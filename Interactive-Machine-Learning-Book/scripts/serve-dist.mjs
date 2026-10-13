// A strict static file server that behaves like simple static hosting (GitHub Pages, S3, nginx without fallbacks):
// directories serve index.html, a missing file is a real 404 (no SPA fallback), and nothing is served outside
// the mount path. Use it for the root build and for a sub-directory build alike.
//
//   node scripts/serve-dist.mjs <distDir> <mountPath> <port>
//   node scripts/serve-dist.mjs dist /                      4451
//   node scripts/serve-dist.mjs dist-subpath /math-foundations 4452
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const [dist = 'dist', mountArg = '/', portArg = '4451'] = process.argv.slice(2);
const root = resolve(dist);
const trimmed = mountArg.replace(/^\/+|\/+$/g, '');
const mount = trimmed === '' ? '/' : `/${trimmed}/`;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const send = (status, body, type = 'text/plain; charset=utf-8') => { res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' }); res.end(body); };
  let path;
  try { path = decodeURIComponent(url.pathname); } catch { return send(400, 'Malformed address'); }
  if (mount !== '/' && path === mount.slice(0, -1)) { res.writeHead(301, { location: mount }); return res.end(); }
  if (!path.startsWith(mount)) return send(404, 'Not found (outside the mount path)');
  let file = normalize(join(root, path.slice(mount.length)));
  if (file !== root && !file.startsWith(root + sep)) return send(403, 'Forbidden');
  try {
    let info = await stat(file);
    if (info.isDirectory()) {
      if (!path.endsWith('/')) { res.writeHead(301, { location: `${path}/${url.search}` }); return res.end(); }
      file = join(file, 'index.html');
      info = await stat(file);
    }
    send(200, await readFile(file), types[extname(file)] ?? 'application/octet-stream');
  } catch {
    // Like most static hosts, serve 404.html (when it exists) with a 404 status.
    try { send(404, await readFile(join(root, '404.html')), types['.html']); } catch { send(404, 'Not found'); }
  }
});
server.listen(Number(portArg), '127.0.0.1', () => console.log(`serving ${root} at http://127.0.0.1:${portArg}${mount}`));
