/**
 * Produces the static bundle that ships inside the APK, then syncs it into the
 * Android project.
 *
 *   npm run android:build
 *
 * Three things happen that a plain `next build` does not do:
 *
 *  1. CAPACITOR_BUILD=1 switches Next to static export (see next.config.js).
 *  2. The OCR engine is vendored into public/, so text recognition works with
 *     no network at all. A store app that needs a CDN to read a receipt is not
 *     an offline app.
 *  3. out/index.html is replaced with a launcher that jumps to /scan/. The web
 *     deploy keeps the invoice generator at "/", but the Android app is the
 *     scanner, and it should open on it.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'out');

const run = (cmd, args, env = {}) => {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } });
};

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const node = process.execPath;

/* 1. Offline OCR ---------------------------------------------------- */

console.log('› vendoring the OCR engine for offline use');
run(node, ['scripts/vendor-ocr.mjs']);

/* 2. Static export --------------------------------------------------- */

console.log('\n› building the static bundle');
run(npx, ['next', 'build'], { CAPACITOR_BUILD: '1' });

if (!existsSync(join(OUT, 'scan', 'index.html'))) {
  console.error('\nexport did not produce out/scan/index.html — aborting');
  process.exit(1);
}

/* 3. Launcher ------------------------------------------------------- */

// A full navigation rather than serving the scanner's HTML from "/": the App
// Router hydrates against the route it was rendered for, so relocating that
// file would leave the client router disagreeing with the URL. Styled like the
// app so the hand-off from the splash screen is invisible.
writeFileSync(
  join(OUT, 'index.html'),
  `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>ScanFast</title>
<style>
  html,body{margin:0;height:100%;background:#0e1116;}
</style>
<script>location.replace('/scan/');</script>
</head>
<body></body>
</html>
`
);
console.log('› wrote out/index.html (launcher → /scan/)');

/* 4. Sync ------------------------------------------------------------ */

if (existsSync(join(ROOT, 'android'))) {
  run(npx, ['cap', 'sync', 'android']);
} else {
  console.log('\nandroid/ not found — run `npx cap add android` first');
}

/* Report ------------------------------------------------------------- */

const dirSize = (dir) =>
  readdirSync(dir, { withFileTypes: true }).reduce((total, entry) => {
    const p = join(dir, entry.name);
    return total + (entry.isDirectory() ? dirSize(p) : statSync(p).size);
  }, 0);

mkdirSync(OUT, { recursive: true });
console.log(`\nbundle: ${(dirSize(OUT) / 1048576).toFixed(1)} MB in out/`);
console.log('next: npm run android:apk   (debug APK)');
console.log('      npm run android:aab   (release bundle for Play — needs signing config)');
