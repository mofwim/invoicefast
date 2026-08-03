/**
 * An archive nobody can open is not an archive, so these tests unzip what the
 * writer produces with the system's own `unzip` — an outside reader that knows
 * nothing about how the bytes were made.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createHash } from "node:crypto";

import { crc32, makeZip, uniqueNames } from "../lib/tools/zip.js";

const run = promisify(execFile);
const text = (value) => new TextEncoder().encode(value);

/** Is there an unzip on this machine to check against? */
const haveUnzip = await run("unzip", ["-v"]).then(
  () => true,
  () => false
);

async function unpack(blob) {
  const dir = await mkdtemp(join(tmpdir(), "zip-test-"));
  const archive = join(dir, "test.zip");
  await writeFile(archive, Buffer.from(await blob.arrayBuffer()));
  await run("unzip", ["-q", archive, "-d", join(dir, "out")]);
  return { dir, out: join(dir, "out") };
}

test("crc32 matches the published check value", () => {
  // The value every CRC-32 implementation is tested against.
  assert.equal(crc32(text("123456789")), 0xcbf43926);
  assert.equal(crc32(new Uint8Array(0)), 0);
});

test("an empty archive is the bare end record, and nothing else", async () => {
  // `unzip` refuses this one on principle ("zipfile is empty"), so it is
  // checked against the format instead: 22 bytes, the end-of-directory
  // signature, and a count of zero.
  const blob = await makeZip([], { modified: new Date("2026-01-01T12:00:00Z") });
  const bytes = new DataView(await blob.arrayBuffer());
  assert.equal(bytes.byteLength, 22);
  assert.equal(bytes.getUint32(0, true), 0x06054b50);
  assert.equal(bytes.getUint16(10, true), 0);
});

test("files come back out exactly as they went in", { skip: !haveUnzip }, async () => {
  const big = new Uint8Array(300_000);
  for (let i = 0; i < big.length; i++) big[i] = (i * 37) % 256;

  const entries = [
    { name: "hallo.txt", data: "Hallo wereld" },
    { name: "bytes.bin", data: big },
    { name: "blob.txt", data: new Blob([text("uit een blob")]) },
  ];

  const { dir, out } = await unpack(await makeZip(entries, { modified: new Date("2026-08-03T09:15:00Z") }));

  assert.equal(await readFile(join(out, "hallo.txt"), "utf8"), "Hallo wereld");
  assert.equal(await readFile(join(out, "blob.txt"), "utf8"), "uit een blob");

  const readBack = await readFile(join(out, "bytes.bin"));
  assert.equal(
    createHash("sha256").update(readBack).digest("hex"),
    createHash("sha256").update(Buffer.from(big)).digest("hex"),
    "de bytes hoorden ongewijzigd terug te komen"
  );

  await rm(dir, { recursive: true, force: true });
});

test("accented names survive", { skip: !haveUnzip }, async () => {
  const { dir, out } = await unpack(
    await makeZip([{ name: "besprekingsverslag-één.txt", data: "ok" }])
  );
  const names = await readdir(out);
  assert.deepEqual(names, ["besprekingsverslag-één.txt"]);
  await rm(dir, { recursive: true, force: true });
});

test("unzip finds nothing to complain about", { skip: !haveUnzip }, async () => {
  const blob = await makeZip([
    { name: "een.txt", data: "1" },
    { name: "twee.txt", data: "2" },
    { name: "drie.txt", data: "3" },
  ]);
  const dir = await mkdtemp(join(tmpdir(), "zip-test-"));
  const archive = join(dir, "test.zip");
  await writeFile(archive, Buffer.from(await blob.arrayBuffer()));

  const { stdout } = await run("unzip", ["-t", archive]);
  assert.match(stdout, /No errors detected in compressed data/);
  await rm(dir, { recursive: true, force: true });
});

test("names are made safe and never collide", () => {
  assert.deepEqual(uniqueNames(["a.txt", "a.txt", "a.txt"]), ["a.txt", "a-2.txt", "a-3.txt"]);
  assert.deepEqual(uniqueNames(["map/deel.pdf"]), ["map-deel.pdf"]);
  // Every separator is gone, so nothing can climb out of the archive.
  const climbed = uniqueNames(["../../etc/passwd"])[0];
  assert.doesNotMatch(climbed, /[\\/]/);
  assert.ok(!climbed.startsWith("."));
  assert.deepEqual(uniqueNames(["zonder-punt", "zonder-punt"]), ["zonder-punt", "zonder-punt-2"]);
});
