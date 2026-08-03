/**
 * QR codes, encoded here rather than fetched from somewhere.
 *
 * Byte mode, versions 1 to 10, all four error-correction levels — which covers
 * a link, a wifi login, a phone number, an address block. Written out because
 * a QR generator that quietly posts your data to a server is exactly the thing
 * this market exists to avoid, and because the algorithm is fully specified.
 *
 * A code that does not scan is worse than no code, so the tests decode what
 * this produces with an independent reader rather than trusting the shape.
 */

import { fail } from "./errors.js";

// ---------------------------------------------------------------------------
// Galois field GF(256), the arithmetic Reed-Solomon runs on
// ---------------------------------------------------------------------------

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d; // the field's generator polynomial
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

/** The divisor polynomial for a given number of error-correction codewords. */
function generatorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= mul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function errorCorrection(data, count) {
  const gen = generatorPoly(count);
  const out = new Array(count).fill(0);

  for (const byte of data) {
    const factor = byte ^ out[0];
    out.shift();
    out.push(0);
    for (let i = 0; i < count; i++) out[i] ^= mul(gen[i + 1], factor);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Version tables (1–10)
// ---------------------------------------------------------------------------

/** [ecPerBlock, group1Blocks, group1Data, group2Blocks, group2Data] */
const BLOCKS = {
  1: { L: [7, 1, 19, 0, 0], M: [10, 1, 16, 0, 0], Q: [13, 1, 13, 0, 0], H: [17, 1, 9, 0, 0] },
  2: { L: [10, 1, 34, 0, 0], M: [16, 1, 28, 0, 0], Q: [22, 1, 22, 0, 0], H: [28, 1, 16, 0, 0] },
  3: { L: [15, 1, 55, 0, 0], M: [26, 1, 44, 0, 0], Q: [18, 2, 17, 0, 0], H: [22, 2, 13, 0, 0] },
  4: { L: [20, 1, 80, 0, 0], M: [18, 2, 32, 0, 0], Q: [26, 2, 24, 0, 0], H: [16, 4, 9, 0, 0] },
  5: { L: [26, 1, 108, 0, 0], M: [24, 2, 43, 0, 0], Q: [18, 2, 15, 2, 16], H: [22, 2, 11, 2, 12] },
  6: { L: [18, 2, 68, 0, 0], M: [16, 4, 27, 0, 0], Q: [24, 4, 19, 0, 0], H: [28, 4, 15, 0, 0] },
  7: { L: [20, 2, 78, 0, 0], M: [18, 4, 31, 0, 0], Q: [18, 2, 14, 4, 15], H: [26, 4, 13, 1, 14] },
  8: { L: [24, 2, 97, 0, 0], M: [22, 2, 38, 2, 39], Q: [22, 4, 18, 2, 19], H: [26, 4, 14, 2, 15] },
  9: { L: [30, 2, 116, 0, 0], M: [22, 3, 36, 2, 37], Q: [20, 4, 16, 4, 17], H: [24, 4, 12, 4, 13] },
  10: { L: [18, 2, 68, 2, 69], M: [26, 4, 43, 1, 44], Q: [24, 6, 19, 2, 20], H: [28, 6, 15, 2, 16] },
};

const ALIGNMENT = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};

export const EC_LEVELS = ["L", "M", "Q", "H"];
const EC_BITS = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 };

function dataCapacity(version, level) {
  const [, g1, d1, g2, d2] = BLOCKS[version][level];
  return g1 * d1 + g2 * d2;
}

/** The smallest version that holds this much, at this level. */
function pickVersion(byteLength, level) {
  for (let version = 1; version <= 10; version++) {
    const capacity = dataCapacity(version, level);
    const header = 4 + (version >= 10 ? 16 : 8);
    if (byteLength + Math.ceil(header / 8) <= capacity) return version;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Bit stream
// ---------------------------------------------------------------------------

class Bits {
  constructor() {
    this.bits = [];
  }
  push(value, length) {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >> i) & 1);
  }
  get length() {
    return this.bits.length;
  }
  toBytes() {
    const bytes = [];
    for (let i = 0; i < this.bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j++) byte = (byte << 1) | (this.bits[i + j] || 0);
      bytes.push(byte);
    }
    return bytes;
  }
}

function buildCodewords(bytes, version, level) {
  const capacity = dataCapacity(version, level);
  const stream = new Bits();

  stream.push(0b0100, 4); // byte mode
  stream.push(bytes.length, version >= 10 ? 16 : 8);
  for (const byte of bytes) stream.push(byte, 8);

  // Terminator, then pad to a whole byte.
  const room = capacity * 8;
  stream.push(0, Math.min(4, room - stream.length));
  while (stream.length % 8) stream.push(0, 1);

  const data = stream.toBytes();
  // The spec's two alternating pad bytes.
  const PAD = [0xec, 0x11];
  let i = 0;
  while (data.length < capacity) data.push(PAD[i++ % 2]);

  // Split into blocks, compute EC per block, then interleave both.
  const [ecCount, g1, d1, g2, d2] = BLOCKS[version][level];
  const blocks = [];
  let at = 0;
  for (let b = 0; b < g1; b++) blocks.push(data.slice(at, (at += d1)));
  for (let b = 0; b < g2; b++) blocks.push(data.slice(at, (at += d2)));

  const ecBlocks = blocks.map((block) => errorCorrection(block, ecCount));

  const out = [];
  const longest = Math.max(...blocks.map((block) => block.length));
  for (let i = 0; i < longest; i++) {
    for (const block of blocks) if (i < block.length) out.push(block[i]);
  }
  for (let i = 0; i < ecCount; i++) {
    for (const block of ecBlocks) out.push(block[i]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The matrix
// ---------------------------------------------------------------------------

function emptyMatrix(size) {
  return {
    size,
    modules: Array.from({ length: size }, () => new Array(size).fill(null)),
    reserved: Array.from({ length: size }, () => new Array(size).fill(false)),
  };
}

function placeFinder(m, row, col) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const y = row + r;
      const x = col + c;
      if (y < 0 || y >= m.size || x < 0 || x >= m.size) continue;
      const inRing = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6));
      const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      m.modules[y][x] = inRing || inCore ? 1 : 0;
      m.reserved[y][x] = true;
    }
  }
}

function placeAlignment(m, version) {
  const centres = ALIGNMENT[version];
  for (const row of centres) {
    for (const col of centres) {
      // The three corners already hold finder patterns.
      if ((row === 6 && col === 6) || (row === 6 && col === m.size - 7) || (row === m.size - 7 && col === 6)) {
        continue;
      }
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          m.modules[row + r][col + c] = Math.max(Math.abs(r), Math.abs(c)) !== 1 ? 1 : 0;
          m.reserved[row + r][col + c] = true;
        }
      }
    }
  }
}

function placeTiming(m) {
  for (let i = 8; i < m.size - 8; i++) {
    const bit = i % 2 === 0 ? 1 : 0;
    if (m.modules[6][i] === null) {
      m.modules[6][i] = bit;
      m.reserved[6][i] = true;
    }
    if (m.modules[i][6] === null) {
      m.modules[i][6] = bit;
      m.reserved[i][6] = true;
    }
  }
}

function reserveFormat(m) {
  for (let i = 0; i < 9; i++) {
    if (m.modules[8][i] === null) m.reserved[8][i] = true;
    if (m.modules[i][8] === null) m.reserved[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    m.reserved[8][m.size - 1 - i] = true;
    m.reserved[m.size - 1 - i][8] = true;
  }
  // The one module that is always dark.
  m.modules[m.size - 8][8] = 1;
  m.reserved[m.size - 8][8] = true;
}

function placeData(m, codewords) {
  let bitIndex = 0;
  const total = codewords.length * 8;
  const bitAt = (index) =>
    index < total ? (codewords[index >> 3] >> (7 - (index & 7))) & 1 : 0;

  let upward = true;
  for (let right = m.size - 1; right > 0; right -= 2) {
    if (right === 6) right = 5; // the vertical timing line is skipped entirely
    for (let step = 0; step < m.size; step++) {
      const row = upward ? m.size - 1 - step : step;
      for (const col of [right, right - 1]) {
        if (m.reserved[row][col]) continue;
        m.modules[row][col] = bitAt(bitIndex++);
      }
    }
    upward = !upward;
  }
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/** The spec's four penalty rules; the lowest total wins. */
function penalty(modules, size) {
  let score = 0;

  const runScore = (line) => {
    let total = 0;
    let run = 1;
    for (let i = 1; i < size; i++) {
      if (line[i] === line[i - 1]) run++;
      else {
        if (run >= 5) total += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) total += 3 + (run - 5);
    return total;
  };

  for (let r = 0; r < size; r++) score += runScore(modules[r]);
  for (let c = 0; c < size; c++) score += runScore(modules.map((row) => row[c]));

  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const a = modules[r][c];
      if (a === modules[r][c + 1] && a === modules[r + 1][c] && a === modules[r + 1][c + 1]) score += 3;
    }
  }

  const PATTERN = [1, 0, 1, 1, 1, 0, 1];
  const hasPattern = (line, at) => PATTERN.every((bit, i) => line[at + i] === bit);
  const quiet = (line, at, len) => {
    for (let i = at; i < at + len; i++) if (line[i] !== 0) return false;
    return true;
  };

  for (let i = 0; i < size; i++) {
    const row = modules[i];
    const col = modules.map((r) => r[i]);
    for (const line of [row, col]) {
      for (let j = 0; j + 7 <= size; j++) {
        if (!hasPattern(line, j)) continue;
        if ((j >= 4 && quiet(line, j - 4, 4)) || (j + 11 <= size && quiet(line, j + 7, 4))) score += 40;
      }
    }
  }

  const dark = modules.flat().reduce((sum, bit) => sum + bit, 0);
  const ratio = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(ratio - 50) / 5) * 10;

  return score;
}

function formatBits(level, mask) {
  let value = (EC_BITS[level] << 3) | mask;
  let rest = value << 10;
  // BCH(15,5) remainder.
  for (let i = 4; i >= 0; i--) {
    if (rest & (1 << (i + 10))) rest ^= 0b10100110111 << i;
  }
  return ((value << 10) | rest) ^ 0b101010000010010;
}

/**
 * The fifteen format bits, written twice.
 *
 * One copy wraps the top-left finder; the other is split between the bottom-left
 * and top-right ones. The two copies run in opposite directions — the bit that
 * sits at the top of the vertical strip sits at the right of the horizontal one
 * — and getting that backwards produces a code that looks perfect and scans as
 * nothing at all.
 */
function writeFormat(m, level, mask) {
  const bits = formatBits(level, mask);

  for (let i = 0; i < 15; i++) {
    const bit = (bits >> i) & 1;

    // First copy, around the top-left finder. Row 6 is the timing line, so the
    // strip steps over it.
    if (i < 6) m.modules[i][8] = bit;
    else if (i < 8) m.modules[i + 1][8] = bit;
    else m.modules[m.size - 15 + i][8] = bit;

    // Second copy: low bits to the right of the top-right finder, high bits
    // below the bottom-left one.
    if (i < 8) m.modules[8][m.size - 1 - i] = bit;
    else if (i === 8) m.modules[8][7] = bit;
    else m.modules[8][14 - i] = bit;
  }

  // Always dark — written last so no format bit can land on top of it.
  m.modules[m.size - 8][8] = 1;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function capacityFor(level) {
  return dataCapacity(10, level) - 3;
}

/**
 * Encode text into a QR matrix.
 *
 * @returns {{size: number, modules: number[][], version: number, level: string, mask: number}}
 */
export function encodeQr(text, { level = "M" } = {}) {
  const value = String(text ?? "");
  if (!value) fail("qrEmpty");
  if (!EC_LEVELS.includes(level)) fail("qrLevel", { level });

  const bytes = [...new TextEncoder().encode(value)];
  const version = pickVersion(bytes.length, level);
  if (!version) {
    fail("qrTooLong", { max: capacityFor(level) });
  }

  const codewords = buildCodewords(bytes, version, level);
  const size = 17 + version * 4;

  const base = emptyMatrix(size);
  placeFinder(base, 0, 0);
  placeFinder(base, 0, size - 7);
  placeFinder(base, size - 7, 0);
  placeAlignment(base, version);
  placeTiming(base);
  reserveFormat(base);
  placeData(base, codewords);

  // Try every mask, keep the least ugly one — the spec's own criterion.
  let best = null;
  for (let mask = 0; mask < 8; mask++) {
    const modules = base.modules.map((row, r) =>
      row.map((bit, c) => (base.reserved[r][c] ? bit : bit ^ (MASKS[mask](r, c) ? 1 : 0)))
    );
    const candidate = { size, modules, reserved: base.reserved };
    writeFormat(candidate, level, mask);
    const score = penalty(candidate.modules, size);
    if (!best || score < best.score) best = { ...candidate, mask, score };
  }

  return { size, modules: best.modules, version, level, mask: best.mask };
}

/** The matrix as an SVG, quiet zone included — sharp at any size. */
export function qrToSvg(qr, { scale = 8, margin = 4, dark = "#000000", light = "#ffffff" } = {}) {
  const total = (qr.size + margin * 2) * scale;
  const paths = [];

  for (let r = 0; r < qr.size; r++) {
    let run = null;
    for (let c = 0; c <= qr.size; c++) {
      const on = c < qr.size && qr.modules[r][c] === 1;
      if (on && run === null) run = c;
      if (!on && run !== null) {
        paths.push(`M${(run + margin) * scale} ${(r + margin) * scale}h${(c - run) * scale}v${scale}h-${(c - run) * scale}z`);
        run = null;
      }
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">`,
    `<rect width="${total}" height="${total}" fill="${light}"/>`,
    `<path fill="${dark}" d="${paths.join("")}"/>`,
    `</svg>`,
  ].join("");
}

/** Escaping for the wifi payload, whose separators are meaningful. */
const wifiEscape = (value) => String(value || "").replace(/([\\;,:"])/g, "\\$1");

export function wifiPayload({ ssid, password, security = "WPA", hidden = false }) {
  const parts = [`S:${wifiEscape(ssid)}`];
  if (security !== "nopass") parts.push(`T:${security}`, `P:${wifiEscape(password)}`);
  else parts.push("T:nopass");
  if (hidden) parts.push("H:true");
  return `WIFI:${parts.join(";")};;`;
}

export const __testing = { generatorPoly, errorCorrection, pickVersion, formatBits, dataCapacity };
