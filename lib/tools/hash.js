/**
 * Checksums.
 *
 * The SHA family comes from the browser's own crypto — there is no reason to
 * ship an implementation of something every engine already has, and its is
 * faster and audited. MD5 is not there, deliberately, because it is broken for
 * signatures; it is written out below anyway because the job people actually
 * have is "the download page says d41d8cd9…, does my file match", and refusing
 * to answer that would not make anyone safer.
 */

import { fail } from "./errors.js";

export const ALGORITHMS = ["MD5", "SHA-1", "SHA-256", "SHA-512"];

/** Which of these should not be trusted to prove anything. */
export const WEAK = new Set(["MD5", "SHA-1"]);

const toHex = (bytes) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

export async function hashBytes(bytes, algorithm = "SHA-256") {
  if (!ALGORITHMS.includes(algorithm)) fail("unknownAlgorithm", { algorithm });
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (algorithm === "MD5") return md5(data);
  const digest = await crypto.subtle.digest(algorithm, data);
  return toHex(new Uint8Array(digest));
}

export function hashText(text, algorithm = "SHA-256") {
  return hashBytes(new TextEncoder().encode(String(text ?? "")), algorithm);
}

/**
 * A file, read in pieces.
 *
 * `crypto.subtle` has no streaming interface, so the whole file has to be in
 * memory regardless; reading it in slices at least keeps the progress bar
 * honest on the big ISO people are usually checking.
 */
export async function hashFile(file, algorithm = "SHA-256", onProgress) {
  const size = file.size;
  const bytes = new Uint8Array(size);
  const chunk = 8 * 1024 * 1024;

  for (let at = 0; at < size; at += chunk) {
    const slice = file.slice(at, Math.min(at + chunk, size));
    bytes.set(new Uint8Array(await slice.arrayBuffer()), at);
    onProgress?.(Math.min(at + chunk, size) / (size || 1));
  }
  return hashBytes(bytes, algorithm);
}

/** Do two checksums match? Case and stray spaces do not count as a difference. */
export function sameDigest(a, b) {
  const clean = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, "");
  const left = clean(a);
  const right = clean(b);
  return Boolean(left) && Boolean(right) && left === right;
}

// ---------------------------------------------------------------------------
// MD5 (RFC 1321)
// ---------------------------------------------------------------------------

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

/** K[i] = floor(2^32 × |sin(i + 1)|), as the specification defines it. */
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32));

const rotl = (value, by) => (value << by) | (value >>> (32 - by));

function md5(input) {
  // Pad to a multiple of 64 bytes: a 1 bit, then zeros, then the bit length.
  const length = input.length;
  const padded = new Uint8Array(((length + 8) >> 6) * 64 + 64);
  padded.set(input);
  padded[length] = 0x80;

  const bits = length * 8;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, bits >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(bits / 2 ** 32), true);

  let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];

  for (let offset = 0; offset < padded.length; offset += 64) {
    const m = new Uint32Array(16);
    for (let i = 0; i < 16; i++) m[i] = view.getUint32(offset + i * 4, true);

    let [a, b, c, d] = [a0, b0, c0, d0];
    for (let i = 0; i < 64; i++) {
      let f;
      let g;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      const temp = d;
      d = c;
      c = b;
      b = (b + rotl((a + f + K[i] + m[g]) | 0, S[i])) | 0;
      a = temp;
    }

    a0 = (a0 + a) | 0;
    b0 = (b0 + b) | 0;
    c0 = (c0 + c) | 0;
    d0 = (d0 + d) | 0;
  }

  const out = new Uint8Array(16);
  new DataView(out.buffer).setUint32(0, a0 >>> 0, true);
  new DataView(out.buffer).setUint32(4, b0 >>> 0, true);
  new DataView(out.buffer).setUint32(8, c0 >>> 0, true);
  new DataView(out.buffer).setUint32(12, d0 >>> 0, true);
  return toHex(out);
}

export const __testing = { md5, toHex };
