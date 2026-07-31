/**
 * Generates the PWA icon set into ./public/icons.
 *
 * Written by hand (zlib is the only dependency, and it ships with Node) so the
 * repo doesn't need a canvas/image toolchain just to produce five PNGs.
 * Shapes are supersampled 4x for smooth edges.
 *
 *   node scripts/gen-icons.mjs
 */

import { deflateSync } from 'node:zlib';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
const SS = 4; // supersampling factor

/* ------------------------------------------------------------------ */
/* PNG encoding                                                         */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  const body = out.subarray(4, 8 + data.length);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
}

function encodePng(rgba, w, h) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ */
/* shapes (coverage tests in unit space, 0..1)                          */
/* ------------------------------------------------------------------ */

const roundedRect = (x, y, w, h, r) => (px, py) => {
  if (px < x || py < y || px > x + w || py > y + h) return false;
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
};

const rect = (x, y, w, h) => (px, py) => px >= x && py >= y && px <= x + w && py <= y + h;

const union =
  (...tests) =>
  (px, py) =>
    tests.some((t) => t(px, py));

const subtract = (a, b) => (px, py) => a(px, py) && !b(px, py);

const mix = (c1, c2, t) => [
  c1[0] + (c2[0] - c1[0]) * t,
  c1[1] + (c2[1] - c1[1]) * t,
  c1[2] + (c2[2] - c1[2]) * t,
];

/* ------------------------------------------------------------------ */
/* the icon                                                             */
/* ------------------------------------------------------------------ */

const BLUE_TOP = [0x4c, 0x8d, 0xff];
const BLUE_BOT = [0x1d, 0x4e, 0xd8];
const WHITE = [0xff, 0xff, 0xff];

const circle = (cx, cy, r) => (px, py) => (px - cx) ** 2 + (py - cy) ** 2 <= r * r;

/**
 * A page with scanner corner brackets — reads as "document scanner" even at
 * 48px in a launcher.
 *
 * @param {number} size output edge in pixels
 * @param {{shape?: 'rounded'|'circle'|'full'|'none', contentScale?: number,
 *          transparentBg?: boolean}} opts
 *   shape 'full' is for maskable/adaptive art that the launcher crops itself;
 *   'none' leaves the background transparent (adaptive foreground layer).
 *   contentScale shrinks the artwork toward the centre to clear a safe zone.
 */
function drawIcon(size, { shape = 'rounded', contentScale = 1, transparentBg = false } = {}) {
  const W = size * SS;
  const px = Buffer.alloc(W * W * 4);

  const bg =
    shape === 'full'
      ? rect(0, 0, 1, 1)
      : shape === 'circle'
        ? circle(0.5, 0.5, 0.5)
        : shape === 'none'
          ? () => false
          : roundedRect(0.045, 0.045, 0.91, 0.91, 0.225);

  const s = contentScale;
  const c = 0.5;
  const map = (v) => c + (v - c) * s;

  // Page
  const pageX = map(0.3);
  const pageY = map(0.235);
  const pageW = 0.4 * s;
  const pageH = 0.53 * s;
  const page = roundedRect(pageX, pageY, pageW, pageH, 0.035 * s);

  // Text lines cut out of the page
  const lineX = pageX + 0.062 * s;
  const lineW = pageW - 0.124 * s;
  const lineH = 0.036 * s;
  const lines = union(
    rect(lineX, pageY + 0.085 * s, lineW, lineH),
    rect(lineX, pageY + 0.175 * s, lineW, lineH),
    rect(lineX, pageY + 0.265 * s, lineW * 0.62, lineH)
  );

  // Scanner corner brackets
  const bt = 0.042 * s; // bracket thickness
  const bl = 0.135 * s; // bracket leg length
  const bx0 = map(0.2);
  const by0 = map(0.17);
  const bx1 = map(0.8);
  const by1 = map(0.83);
  const brackets = union(
    rect(bx0, by0, bl, bt),
    rect(bx0, by0, bt, bl),
    rect(bx1 - bl, by0, bl, bt),
    rect(bx1 - bt, by0, bt, bl),
    rect(bx0, by1 - bt, bl, bt),
    rect(bx0, by1 - bl, bt, bl),
    rect(bx1 - bl, by1 - bt, bl, bt),
    rect(bx1 - bt, by1 - bl, bt, bl)
  );

  const ink = union(subtract(page, lines), brackets);

  for (let y = 0; y < W; y++) {
    const v = (y + 0.5) / W;
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      const i = (y * W + x) * 4;
      const inBg = bg(u, v);
      const isInk = ink(u, v);
      // With no background layer only the glyph is painted; the rest stays
      // transparent so the launcher can composite its own background.
      if (!inBg && !isInk) continue;
      const base = transparentBg ? WHITE : mix(BLUE_TOP, BLUE_BOT, v);
      const col = isInk ? WHITE : base;
      px[i] = col[0];
      px[i + 1] = col[1];
      px[i + 2] = col[2];
      px[i + 3] = 255;
    }
  }

  // Box-downsample the supersampled buffer for anti-aliasing.
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * W + (x * SS + sx)) * 4;
          const av = px[i + 3] / 255;
          r += px[i] * av;
          g += px[i + 1] * av;
          b += px[i + 2] * av;
          a += av;
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 4;
      // Un-premultiply so edges don't darken against a light background.
      out[o] = a > 0 ? Math.round(r / a) : 0;
      out[o + 1] = a > 0 ? Math.round(g / a) : 0;
      out[o + 2] = a > 0 ? Math.round(b / a) : 0;
      out[o + 3] = Math.round((a / n) * 255);
    }
  }
  return encodePng(out, size, size);
}

/* ------------------------------------------------------------------ */

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['maskable-512.png', 512, { shape: 'full', contentScale: 0.78 }],
  ['apple-touch-icon.png', 180, {}],
  ['favicon-32.png', 32, {}],
];

for (const [name, size, opts] of targets) {
  writeFileSync(join(OUT_DIR, name), drawIcon(size, opts));
  console.log(`wrote icons/${name} (${size}x${size})`);
}

/* ------------------------------------------------------------------ */
/* Android launcher icons                                               */
/* ------------------------------------------------------------------ */

const ANDROID_RES = join(OUT_DIR, '..', '..', 'android', 'app', 'src', 'main', 'res');

if (existsSync(ANDROID_RES)) {
  // Legacy icons are 48dp; the adaptive foreground is drawn on a 108dp canvas
  // of which only the central ~66dp is guaranteed visible.
  const DENSITIES = [
    ['mdpi', 1],
    ['hdpi', 1.5],
    ['xhdpi', 2],
    ['xxhdpi', 3],
    ['xxxhdpi', 4],
  ];
  for (const [density, factor] of DENSITIES) {
    const dir = join(ANDROID_RES, `mipmap-${density}`);
    mkdirSync(dir, { recursive: true });
    const legacy = Math.round(48 * factor);
    const adaptive = Math.round(108 * factor);
    writeFileSync(join(dir, 'ic_launcher.png'), drawIcon(legacy, {}));
    writeFileSync(join(dir, 'ic_launcher_round.png'), drawIcon(legacy, { shape: 'circle' }));
    writeFileSync(
      join(dir, 'ic_launcher_foreground.png'),
      drawIcon(adaptive, { shape: 'none', contentScale: 0.8 })
    );
    // Splash artwork: the same glyph, sized for a comfortable centre crop.
    writeFileSync(
      join(dir, 'ic_splash.png'),
      drawIcon(Math.round(160 * factor), { shape: 'none', contentScale: 0.92 })
    );
    console.log(`wrote android mipmap-${density} (${legacy}px legacy, ${adaptive}px adaptive)`);
  }
} else {
  console.log('android/ not present — skipped launcher icons');
}
