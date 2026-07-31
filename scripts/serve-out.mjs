/**
 * Serves ./out the way Capacitor's Android WebView actually serves it.
 *
 *   node scripts/build-android.mjs
 *   node scripts/serve-out.mjs          # http://localhost:4180
 *   node scripts/serve-out.mjs --web    # plain static host instead
 *
 * This deliberately reproduces the quirks of Capacitor's WebViewLocalServer
 * rather than behaving like a normal static server, because the differences
 * are exactly where an APK breaks while local testing passes:
 *
 *   - Any path whose last segment has no "." is answered with the *root*
 *     index.html ("html5mode"), NOT with that directory's index.html. So
 *     `/scan/` does not serve `out/scan/index.html` — it serves `out/index.html`.
 *   - Only paths containing a "." are served as real files.
 *
 * A forgiving dev server hides this: it resolves `/scan/` to the right file,
 * the app works, and the APK then shows a black screen because the redirect
 * at the root bounces back to itself forever.
 */

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const webMode = args.includes('--web');
const positional = args.filter((a) => !a.startsWith('--'));
const ROOT = positional[0] || join(dirname(fileURLToPath(import.meta.url)), '..', 'out');
const PORT = Number(positional[1] || process.env.PORT || 4180);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.gz': 'application/gzip',
  '.txt': 'text/plain; charset=utf-8',
};

if (!existsSync(ROOT)) {
  console.error(`${ROOT} does not exist — run \`npm run android:build\` first`);
  process.exit(1);
}

const send = (res, path) => {
  res.writeHead(200, {
    'content-type': TYPES[extname(path)] || 'application/octet-stream',
    // The .gz language files are served as-is: the OCR worker unpacks them.
    'cache-control': 'no-cache',
  });
  createReadStream(path).pipe(res);
};

const notFound = (res) => {
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('not found');
};

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(ROOT, pathname);

  if (webMode) {
    let p = filePath;
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
    return existsSync(p) && statSync(p).isFile() ? send(res, p) : notFound(res);
  }

  // --- Capacitor WebViewLocalServer semantics ---
  const lastSegment = pathname.split('/').filter(Boolean).pop() || '';

  if (pathname === '/' || !lastSegment.includes('.')) {
    const root = join(ROOT, 'index.html');
    return existsSync(root) ? send(res, root) : notFound(res);
  }

  return existsSync(filePath) && statSync(filePath).isFile() ? send(res, filePath) : notFound(res);
}).listen(PORT, () => {
  console.log(
    `serving ${ROOT} on http://localhost:${PORT} (${webMode ? 'plain static' : 'Capacitor WebView semantics'})`
  );
});
