/**
 * A QR code that does not scan is worse than no code, so these tests decode
 * what the encoder produces with an independent reader rather than checking
 * that the picture looks about right.
 */

import test from "node:test";
import assert from "node:assert/strict";
import jsQR from "jsqr";

import { EC_LEVELS, encodeQr, qrToSvg, wifiPayload, __testing } from "../lib/tools/qr.js";

/** Blow the matrix up into the RGBA bitmap a reader expects. */
function toBitmap(qr, { scale = 4, margin = 4 } = {}) {
  const size = (qr.size + margin * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const row = Math.floor(y / scale) - margin;
      const col = Math.floor(x / scale) - margin;
      const dark = row >= 0 && col >= 0 && row < qr.size && col < qr.size && qr.modules[row][col] === 1;
      if (!dark) continue;
      const at = (y * size + x) * 4;
      data[at] = data[at + 1] = data[at + 2] = 0;
    }
  }
  return { data, width: size, height: size };
}

function roundTrip(text, level = "M") {
  const qr = encodeQr(text, { level });
  const bitmap = toBitmap(qr);
  const read = jsQR(bitmap.data, bitmap.width, bitmap.height);
  assert.ok(read, `niets te lezen (versie ${qr.version}, niveau ${level})`);
  return { read: read.data, qr };
}

test("a link scans back exactly", () => {
  const url = "https://invoicefast.app/nl/tools";
  assert.equal(roundTrip(url).read, url);
});

test("every error-correction level produces a readable code", () => {
  for (const level of EC_LEVELS) {
    const { read, qr } = roundTrip("Mijn Afspraken", level);
    assert.equal(read, "Mijn Afspraken", `niveau ${level} faalde`);
    assert.equal(qr.level, level);
  }
});

test("it grows to the version the payload needs", () => {
  const short = encodeQr("hoi", { level: "M" });
  const long = encodeQr("x".repeat(200), { level: "M" });
  assert.equal(short.version, 1);
  assert.ok(long.version > short.version, "een lange tekst hoort een grotere versie te krijgen");
  assert.equal(long.size, 17 + long.version * 4);
});

test("longer payloads still scan", () => {
  const text = "Afspraak bij Tandartspraktijk Vondelpark, Vondelstraat 84, 1054 GN Amsterdam op 4 augustus om 09:15.";
  assert.equal(roundTrip(text, "M").read, text);
});

test("accents survive the trip", () => {
  const text = "Café — déjà vu, ëéíöü";
  assert.equal(roundTrip(text, "Q").read, text);
});

test("a wifi payload scans as the string a phone expects", () => {
  const payload = wifiPayload({ ssid: "Thuis", password: "geheim123", security: "WPA" });
  assert.equal(payload, "WIFI:S:Thuis;T:WPA;P:geheim123;;");
  assert.equal(roundTrip(payload).read, payload);
});

test("wifi separators inside a password are escaped", () => {
  const payload = wifiPayload({ ssid: "A;B", password: 'p"a:s;s', security: "WPA" });
  // The backslashes are literal in the payload, so they are doubled here.
  assert.match(payload, /S:A\\;B/);
  assert.match(payload, /P:p\\"a\\:s\\;s/);
});

test("an open network says so", () => {
  assert.equal(wifiPayload({ ssid: "Gast", security: "nopass" }), "WIFI:S:Gast;T:nopass;;");
});

test("it refuses what it cannot hold, instead of producing a broken code", () => {
  const code = (name) => (err) => err.code === name;
  assert.throws(() => encodeQr("x".repeat(5000), { level: "H" }), code("qrTooLong"));
  assert.throws(() => encodeQr(""), code("qrEmpty"));
  assert.throws(() => encodeQr("hoi", { level: "Z" }), code("qrLevel"));
});

test("the SVG covers the matrix and adds a quiet zone", () => {
  const qr = encodeQr("test", { level: "L" });
  const svg = qrToSvg(qr, { scale: 8, margin: 4 });
  const expected = (qr.size + 8) * 8;
  assert.match(svg, new RegExp(`width="${expected}"`));
  assert.match(svg, /<path fill="#000000"/);
  assert.ok(svg.startsWith("<svg"), "moet een geldige SVG zijn");
});

test("the field arithmetic behaves", () => {
  // A generator polynomial of degree n has n + 1 terms and starts at 1.
  assert.equal(__testing.generatorPoly(7).length, 8);
  assert.equal(__testing.generatorPoly(10)[0], 1);
  assert.equal(__testing.errorCorrection([1, 2, 3], 7).length, 7);
  assert.equal(__testing.pickVersion(10, "M"), 1);
  assert.equal(__testing.dataCapacity(1, "L"), 19);
});
