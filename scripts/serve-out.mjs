/**
 * Serves ./out the way Capacitor's WebView does: static files from the bundle
 * root, directory paths resolving to index.html, nothing server-side.
 *
 *   node scripts/build-android.mjs
 *   node scripts/serve-out.mjs          # http://localhost:4180
 *
 * Useful for checking the exact bundle that goes into the APK without needing
 * a device, and required by scripts/store-assets.mjs.
 */

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..', 'out');
const PORT = Number(process.argv[3] || process.env.PORT || 4180);

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

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const safe = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let path = join(ROOT, safe);
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
  if (!existsSync(path) || !statSync(path).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(path)] || 'application/octet-stream',
    // The .gz language files are served as-is, not content-encoded: the OCR
    // worker unpacks them itself.
    'cache-control': 'no-cache',
  });
  createReadStream(path).pipe(res);
}).listen(PORT, () => {
  console.log(`serving ${ROOT} on http://localhost:${PORT}`);
});
