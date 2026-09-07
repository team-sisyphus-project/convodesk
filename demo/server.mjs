// Zero-dependency static server for the demo build, with SPA fallback.
// The preview harness runs this; `--port` and `--strictPort` are honoured.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, 'dist');

const argFor = name => {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
};

const port = Number(argFor('--port') ?? process.env.PORT ?? 5900);
// --strictPort is accepted for the harness; this server never falls back to
// another port anyway, it just fails to listen.
const host = argFor('--host') ?? '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.map': 'application/json; charset=utf-8',
};

const send = (res, path) => {
  res.writeHead(200, {
    'Content-Type': TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  createReadStream(path).pipe(res);
};

const resolveFile = async pathname => {
  const relative = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const candidate = join(ROOT, relative);
  if (!candidate.startsWith(ROOT)) return null;
  try {
    const stats = await stat(candidate);
    if (stats.isFile()) return candidate;
    if (stats.isDirectory()) {
      const index = join(candidate, 'index.html');
      await stat(index);
      return index;
    }
  } catch {
    return null;
  }
  return null;
};

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const file = await resolveFile(pathname);
  if (file) {
    send(res, file);
    return;
  }
  // Anything else is a client route: hand back the shell.
  const shell = join(ROOT, 'index.html');
  try {
    await stat(shell);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('demo/dist is missing. Run: pnpm demo:build\n');
    return;
  }
  send(res, shell);
});

server.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`convodesk demo running at http://localhost:${port}/`);
});
