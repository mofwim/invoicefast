/**
 * The page-selection grammar, and the colour conversion behind the stamps.
 *
 * The document operations themselves need a DOM and a real file, so they are
 * exercised in the browser; what is testable here is the part where a person
 * types something and expects a print dialog to understand it.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { formatPageRange, parsePageRange, __testing } from "../lib/tools/pdf.js";

test("reads a selection the way a print dialog does", () => {
  assert.deepEqual(parsePageRange("1-3", 10), [0, 1, 2]);
  assert.deepEqual(parsePageRange("2", 10), [1]);
  assert.deepEqual(parsePageRange("1-3, 7", 10), [0, 1, 2, 6]);
  assert.deepEqual(parsePageRange("1,2,3", 10), [0, 1, 2]);
});

test("an open end runs to the last page", () => {
  assert.deepEqual(parsePageRange("8-", 10), [7, 8, 9]);
  assert.deepEqual(parsePageRange("-3", 10), [0, 1, 2]);
});

test("a backwards range still means the pages between", () => {
  assert.deepEqual(parsePageRange("5-3", 10), [2, 3, 4]);
});

test("everything outside the document is dropped", () => {
  assert.deepEqual(parsePageRange("0, 3, 99", 5), [2]);
  assert.deepEqual(parsePageRange("20-30", 5), []);
});

test("duplicates collapse and order is restored", () => {
  assert.deepEqual(parsePageRange("3, 1, 3, 2", 10), [0, 1, 2]);
});

test("empty means nothing, 'alle' means everything", () => {
  assert.deepEqual(parsePageRange("", 4), []);
  assert.deepEqual(parsePageRange("   ", 4), []);
  assert.deepEqual(parsePageRange("alle", 3), [0, 1, 2]);
  assert.deepEqual(parsePageRange("all", 3), [0, 1, 2]);
});

test("nonsense is ignored rather than guessed at", () => {
  assert.deepEqual(parsePageRange("appels", 5), []);
  assert.deepEqual(parsePageRange("1, appels, 3", 5), [0, 2]);
});

test("a selection reads back the way it was written", () => {
  assert.equal(formatPageRange([0, 1, 2]), "1-3");
  assert.equal(formatPageRange([0, 2, 3, 4, 8]), "1, 3-5, 9");
  assert.equal(formatPageRange([6]), "7");
  assert.equal(formatPageRange([]), "");
});

test("a range survives being written and read again", () => {
  const original = parsePageRange("1-3, 7, 10-12", 20);
  assert.deepEqual(parsePageRange(formatPageRange(original), 20), original);
});

test("colours convert for the stamp", () => {
  assert.deepEqual(__testing.hexToRgb("#ffffff"), { r: 1, g: 1, b: 1 });
  assert.deepEqual(__testing.hexToRgb("#000000"), { r: 0, g: 0, b: 0 });
  assert.deepEqual(__testing.hexToRgb("#f00"), { r: 1, g: 0, b: 0 }, "korte notatie telt ook");
  const red = __testing.hexToRgb("#ff0000");
  assert.equal(red.r, 1);
  assert.equal(red.g, 0);
});
