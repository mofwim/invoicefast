/**
 * Copies the OCR engine (and optionally language data) out of node_modules and
 * into ./public/tesseract so the app can run text recognition without reaching
 * a CDN.
 *
 *   node scripts/vendor-ocr.mjs            # engine + eng, ara
 *   node scripts/vendor-ocr.mjs eng fra    # engine + the languages you name
 *
 * By default the app loads these files from jsDelivr, which keeps the deploy
 * small and the bandwidth free. Vendor them when the app has to work offline,
 * behind a corporate proxy, or anywhere jsDelivr is unreachable — `ocr.js`
 * probes for the local copy at runtime and prefers it when it exists.
 *
 * The output is gitignored: it is reproducible from the pinned dependencies.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'tesseract');
const NM = join(ROOT, 'node_modules');

/**
 * Only the LSTM cores: tesseract.js picks a `-lstm` build unless legacy OCR is
 * explicitly requested, and the non-LSTM ones are another 23 MB for nothing.
 * All three variants ship because which one loads depends on the browser's
 * SIMD support.
 */
const CORE_FILES = [
  'tesseract-core-lstm.wasm',
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
];

const langs = process.argv.slice(2).length ? process.argv.slice(2) : ['eng', 'ara'];

function need(path, what) {
  if (existsSync(path)) return true;
  console.error(`missing ${what}: ${path}`);
  console.error('run `npm install` first');
  process.exitCode = 1;
  return false;
}

function copyInto(src, destDir, label) {
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, src.split('/').pop());
  copyFileSync(src, dest);
  const mb = statSync(dest).size / 1048576;
  console.log(`  ${label.padEnd(38)} ${mb.toFixed(1)} MB`);
  return statSync(dest).size;
}

let total = 0;

console.log('engine:');
const worker = join(NM, 'tesseract.js', 'dist', 'worker.min.js');
if (need(worker, 'tesseract.js worker')) total += copyInto(worker, OUT, 'worker.min.js');

const coreDir = join(NM, 'tesseract.js-core');
if (need(coreDir, 'tesseract.js-core')) {
  for (const f of CORE_FILES) {
    const src = join(coreDir, f);
    if (existsSync(src)) total += copyInto(src, join(OUT, 'core'), `core/${f}`);
  }
}

console.log('languages:');
for (const lang of langs) {
  // `4.0.0` is the standard model; `4.0.0_best_int` trades size for accuracy.
  const base = join(NM, '@tesseract.js-data', lang);
  if (!existsSync(base)) {
    console.log(`  ${lang}: not installed — npm i -D @tesseract.js-data/${lang}`);
    continue;
  }
  const version = readdirSync(base).find((d) => d === '4.0.0') || readdirSync(base)[0];
  const src = join(base, version, `${lang}.traineddata.gz`);
  if (existsSync(src)) total += copyInto(src, join(OUT, 'lang'), `lang/${lang}.traineddata.gz`);
  else console.log(`  ${lang}: no traineddata in ${version}`);
}

console.log(`\nvendored ${(total / 1048576).toFixed(1)} MB into public/tesseract`);
console.log('OCR will now run without contacting a CDN.');
