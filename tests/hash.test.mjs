/**
 * A checksum is only useful if it agrees with everyone else's, so these are
 * the published vectors — RFC 1321 for MD5, NIST's for the SHA family — plus
 * the cases where a hand-written padding usually goes wrong: an empty input,
 * exactly 55 bytes, exactly 56, and a block boundary.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { ALGORITHMS, WEAK, hashText, hashBytes, sameDigest, __testing } from "../lib/tools/hash.js";

const { md5 } = __testing;
const bytes = (text) => new TextEncoder().encode(text);

test("md5 matches the vectors in RFC 1321", async () => {
  const vectors = {
    "": "d41d8cd98f00b204e9800998ecf8427e",
    a: "0cc175b9c0f1b6a831c399e269772661",
    abc: "900150983cd24fb0d6963f7d28e17f72",
    "message digest": "f96b697d7cb7938d525a2f31aaf161d0",
    abcdefghijklmnopqrstuvwxyz: "c3fcd3d76192e4007dfb496cca67e13b",
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789":
      "d174ab98d277d9f5a5611c2c9f419d9f",
    "12345678901234567890123456789012345678901234567890123456789012345678901234567890":
      "57edf4a22be3c955ac49da2e2107b67a",
  };
  for (const [input, expected] of Object.entries(vectors)) {
    assert.equal(md5(bytes(input)), expected, `md5(${JSON.stringify(input)})`);
  }
});

test("md5 pads correctly around the block boundary", () => {
  // 55 bytes leaves exactly room for the length; 56 forces a second block.
  for (const length of [54, 55, 56, 57, 63, 64, 65, 119, 120, 128, 1000]) {
    const input = "x".repeat(length);
    const expected = createHash("md5").update(input).digest("hex");
    assert.equal(md5(bytes(input)), expected, `lengte ${length}`);
  }
});

test("md5 handles bytes above 127, not just ascii", () => {
  const input = "Café — déjà vu 👋";
  assert.equal(md5(bytes(input)), createHash("md5").update(input).digest("hex"));
});

test("the sha family comes back the way node computes it", async () => {
  for (const [algorithm, nodeName] of [["SHA-1", "sha1"], ["SHA-256", "sha256"], ["SHA-512", "sha512"]]) {
    const text = "Mijn Afspraken";
    assert.equal(await hashText(text, algorithm), createHash(nodeName).update(text).digest("hex"));
  }
});

test("an empty input still has a digest", async () => {
  assert.equal(await hashText("", "SHA-256"), createHash("sha256").update("").digest("hex"));
  assert.equal(await hashText("", "MD5"), "d41d8cd98f00b204e9800998ecf8427e");
});

test("every advertised algorithm actually works", async () => {
  for (const algorithm of ALGORITHMS) {
    const digest = await hashText("test", algorithm);
    assert.match(digest, /^[0-9a-f]+$/, algorithm);
  }
});

test("an unknown algorithm is refused by name", async () => {
  await assert.rejects(() => hashBytes(bytes("x"), "SHA-3"), (err) => err.code === "unknownAlgorithm");
});

test("the broken ones are marked as broken", () => {
  assert.ok(WEAK.has("MD5"));
  assert.ok(WEAK.has("SHA-1"));
  assert.ok(!WEAK.has("SHA-256"));
});

test("comparing forgives the way a checksum is pasted", () => {
  assert.ok(sameDigest("D41D8CD98F00B204E9800998ECF8427E", "d41d8cd98f00b204e9800998ecf8427e"));
  assert.ok(sameDigest("  abc123 ", "abc123"));
  assert.ok(!sameDigest("abc123", "abc124"));
  assert.ok(!sameDigest("", ""), "twee lege waarden zijn geen match");
});
