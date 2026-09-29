// Local dev server. Zero dependencies — just `node dev-server.mjs`.
//
// Serves the site from the repo root and runs the Netlify functions in
// netlify/functions/ on the same origin, so the enquiry form can be tested
// locally instead of spending a Netlify deploy.
//
// Secrets come from a local .env (gitignored), e.g.
//   RESEND_API_KEY=re_...
//   ENQUIRY_TO=you@example.com

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = import.meta.dirname;
const PORT = Number(process.env.PORT) || 8888;
const FUNCTIONS_PREFIX = '/.netlify/functions/';

// Optional local secrets. Absent .env is fine; the function reports its own
// missing-key error in that case.
try {
  process.loadEnvFile(join(ROOT, '.env'));
  console.log('Loaded .env');
} catch {
  console.log('No .env found — functions needing secrets will report that themselves.');
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

// Read the whole body so it can be handed to the function as a Request.
const readBody = (req) =>
  new Promise((ok, fail) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => ok(Buffer.concat(chunks)));
    req.on('error', fail);
  });

async function runFunction(name, req, res) {
  const file = join(ROOT, 'netlify', 'functions', `${name}.mjs`);

  try {
    await stat(file);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end(`No function named "${name}"`);
  }

  try {
    // Cache-bust so edits to the function take effect without a restart.
    const mod = await import(`${new URL(`file://${file}`).href}?t=${Date.now()}`);
    const handler = mod.default;
    if (typeof handler !== 'function') throw new Error('Function has no default export');

    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readBody(req);
    const request = new Request(new URL(req.url, `http://localhost:${PORT}`), {
      method: req.method,
      headers: req.headers,
      body: body && body.length ? body : undefined,
    });

    const result = await handler(request, {});
    const out = Buffer.from(await result.arrayBuffer());
    res.writeHead(result.status, Object.fromEntries(result.headers));
    res.end(out);
    console.log(`${req.method} ${req.url} -> ${result.status} (function: ${name})`);
  } catch (err) {
    console.error(`Function "${name}" threw:`, err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Function error — see the dev server log.' }));
  }
}

async function serveStatic(req, res, pathname) {
  // normalize + root check keeps ../ traversal out.
  let target = resolve(ROOT, `.${normalize(pathname)}`);
  if (!target.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    let info = await stat(target);
    if (info.isDirectory()) {
      target = join(target, 'index.html');
      info = await stat(target);
    }
    const data = await readFile(target);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(target).toLowerCase()] || 'application/octet-stream',
      'Content-Length': data.length,
      'Cache-Control': 'no-store', // always see the latest edit on reload
    });
    res.end(req.method === 'HEAD' ? undefined : data);
    console.log(`${req.method} ${pathname} -> 200`);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404</h1>');
    console.log(`${req.method} ${pathname} -> 404`);
  }
}

createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);

  if (pathname.startsWith(FUNCTIONS_PREFIX)) {
    return runFunction(pathname.slice(FUNCTIONS_PREFIX.length).split('/')[0], req, res);
  }
  // Netlify also exposes functions at /api/* via redirects on some setups.
  if (pathname.startsWith('/api/')) {
    return runFunction(pathname.slice('/api/'.length).split('/')[0], req, res);
  }
  return serveStatic(req, res, pathname === '/' ? '/index.html' : pathname);
}).listen(PORT, () => {
  console.log(`\n  Dev server:  http://localhost:${PORT}`);
  console.log(`  Functions:   ${FUNCTIONS_PREFIX}<name>  (and /api/<name>)`);
  console.log(`  Stop:        Ctrl-C\n`);
});
