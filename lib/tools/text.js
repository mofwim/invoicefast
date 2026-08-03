/**
 * The small text jobs.
 *
 * None of these is hard; all of them are the sort of thing people currently
 * paste into a stranger's website. That is the whole argument for having them
 * here: the work is trivial, the trust is not.
 */

import { fail } from "./errors.js";

// ---------------------------------------------------------------------------
// Counting
// ---------------------------------------------------------------------------

/** Reading speed used for the estimate — a common average for prose. */
const WORDS_PER_MINUTE = 200;

export function countText(input) {
  const text = String(input ?? "");
  const trimmed = text.trim();

  // Count characters the way a person sees them: an emoji is one, not two.
  const characters = [...text].length;
  const withoutSpaces = [...text.replace(/\s/g, "")].length;
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const lines = text ? text.split(/\r\n|\r|\n/).length : 0;
  const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter((p) => p.trim()).length : 0;
  const sentences = trimmed ? (trimmed.match(/[^.!?…]+[.!?…]+(\s|$)|[^.!?…]+$/g) || []).length : 0;

  return {
    characters,
    withoutSpaces,
    words,
    lines,
    paragraphs,
    sentences,
    readingSeconds: Math.round((words / WORDS_PER_MINUTE) * 60),
    longestWord: longestWordIn(trimmed),
  };
}

/**
 * The longest word, without whatever was standing next to it.
 *
 * A full stop is not part of the word before it, and "wereld." is not longer
 * than "wereld" to anyone but a string splitter.
 */
function longestWordIn(trimmed) {
  if (!trimmed) return "";
  let longest = "";
  for (const chunk of trimmed.split(/\s+/)) {
    const word = chunk.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    if (word.length > longest.length) longest = word;
  }
  return longest;
}

// ---------------------------------------------------------------------------
// Slugs
// ---------------------------------------------------------------------------

/**
 * Letters a URL cannot carry, spelled out.
 *
 * These stay inside the word they belong to — `Straße` is one word, and
 * `stra-ss-e` would be three. Decomposition handles é and ü; it leaves these
 * alone because they are letters in their own right, not letters with a mark.
 */
const TRANSLITERATE = {
  ß: "ss", æ: "ae", œ: "oe", ø: "o", å: "a", đ: "d", ð: "d", þ: "th", ł: "l",
  ı: "i", ĳ: "ij", Æ: "AE", Œ: "OE", Ø: "O", Å: "A", Đ: "D", Þ: "TH", Ł: "L", Ĳ: "IJ",
};

/** Symbols that stand for a word, and so need room around them. */
const SPELLED_OUT = {
  "€": "eur", "£": "gbp", $: "usd", "&": "en", "@": "at", "%": "pct", "+": "plus",
};

export function slugify(input, { separator = "-", lower = true, max = 0 } = {}) {
  let text = String(input ?? "");

  for (const [from, to] of Object.entries(TRANSLITERATE)) text = text.replaceAll(from, to);
  for (const [from, to] of Object.entries(SPELLED_OUT)) text = text.replaceAll(from, ` ${to} `);

  // Decompose, then drop the accents that were split off.
  text = text.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  if (lower) text = text.toLowerCase();

  text = text
    .replace(/[^a-zA-Z0-9]+/g, separator)
    .replace(new RegExp(`\\${separator}{2,}`, "g"), separator)
    .replace(new RegExp(`^\\${separator}|\\${separator}$`, "g"), "");

  if (max > 0 && text.length > max) {
    // Only go looking for a word boundary when the cut landed inside a word.
    // A slug that happens to end exactly on one is already whole, and trimming
    // it back would throw away a word that fitted.
    const clean = text.charAt(max) === separator;
    text = text.slice(0, max);
    if (!clean) {
      const cut = text.lastIndexOf(separator);
      if (cut > 0) text = text.slice(0, cut);
    }
    text = text.replace(new RegExp(`\\${separator}$`), "");
  }

  return text;
}

// ---------------------------------------------------------------------------
// Base64
// ---------------------------------------------------------------------------

const toBytes = (text) => new TextEncoder().encode(text);

function bytesToBinary(bytes) {
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return out;
}

export function encodeBase64(text, { urlSafe = false } = {}) {
  const base = btoa(bytesToBinary(toBytes(String(text ?? ""))));
  return urlSafe ? base.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : base;
}

export function decodeBase64(value) {
  let input = String(value ?? "").trim().replace(/\s+/g, "");
  // Accept the URL-safe alphabet and a missing tail of padding.
  input = input.replace(/-/g, "+").replace(/_/g, "/");
  while (input.length % 4) input += "=";

  let binary;
  try {
    binary = atob(input);
  } catch {
    fail("badBase64");
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

export function encodeUrl(text, { component = true } = {}) {
  const value = String(text ?? "");
  return component ? encodeURIComponent(value) : encodeURI(value);
}

export function decodeUrl(text) {
  const value = String(text ?? "");
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return fail("badEscape");
  }
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

/**
 * Format, or say precisely where it went wrong.
 *
 * The line and column matter more than the message: "unexpected token" three
 * hundred characters in is not something a person can act on.
 */
export function formatJson(text, { indent = 2, sort = false } = {}) {
  const source = String(text ?? "").trim();
  if (!source) fail("jsonEmpty");

  let value;
  try {
    value = JSON.parse(source);
  } catch {
    const spot = locateJsonFault(source);
    if (!spot) fail("jsonInvalid");
    const before = source.slice(0, spot.at);
    fail("jsonFault", {
      line: before.split("\n").length,
      column: spot.at - before.lastIndexOf("\n"),
      expected: spot.expected,
    });
  }

  const ordered = sort ? sortKeys(value) : value;
  return {
    text: indent === 0 ? JSON.stringify(ordered) : JSON.stringify(ordered, null, indent),
    stats: measureJson(value),
  };
}

/**
 * Walk the grammar to find the first place a document stops being JSON.
 *
 * The engine's own message cannot be used for this. V8 gives a character
 * offset for some faults ("position 7") and a quoted excerpt for others, and
 * Safari and Firefox word both differently again — so a page that read the
 * message would point at the right character in Chrome and nowhere in Safari.
 * A page of grammar here gives the same answer everywhere.
 *
 * @returns {{at: number, expected: string}|null} null when it parses fine
 */
function locateJsonFault(source) {
  let i = 0;
  const at = (expected) => ({ at: Math.min(i, source.length), expected });
  const skip = () => {
    while (i < source.length && " \t\n\r".includes(source[i])) i++;
  };

  function value() {
    skip();
    if (i >= source.length) return at("value");
    const char = source[i];
    if (char === "{") return object();
    if (char === "[") return array();
    if (char === '"') return string();
    if (char === "-" || (char >= "0" && char <= "9")) return number();
    for (const word of ["true", "false", "null"]) {
      if (source.startsWith(word, i)) {
        i += word.length;
        return null;
      }
    }
    return at("value");
  }

  function object() {
    i++;
    skip();
    if (source[i] === "}") {
      i++;
      return null;
    }
    for (;;) {
      skip();
      if (source[i] !== '"') return at("name");
      const badName = string();
      if (badName) return badName;
      skip();
      if (source[i] !== ":") return at("colon");
      i++;
      const badValue = value();
      if (badValue) return badValue;
      skip();
      if (source[i] === ",") {
        i++;
        continue;
      }
      if (source[i] === "}") {
        i++;
        return null;
      }
      return at("commaOrBrace");
    }
  }

  function array() {
    i++;
    skip();
    if (source[i] === "]") {
      i++;
      return null;
    }
    for (;;) {
      const bad = value();
      if (bad) return bad;
      skip();
      if (source[i] === ",") {
        i++;
        continue;
      }
      if (source[i] === "]") {
        i++;
        return null;
      }
      return at("commaOrBracket");
    }
  }

  function string() {
    i++;
    while (i < source.length) {
      const char = source[i];
      if (char === '"') {
        i++;
        return null;
      }
      if (char === "\\") {
        const escape = source[i + 1];
        if (escape === "u") {
          if (!/^[0-9a-fA-F]{4}$/.test(source.slice(i + 2, i + 6))) return at("hex");
          i += 6;
          continue;
        }
        if (!'"\\/bfnrt'.includes(escape)) return at("escape");
        i += 2;
        continue;
      }
      if (char < " ") return at("closingQuote");
      i++;
    }
    return at("closingQuote");
  }

  function number() {
    const start = i;
    if (source[i] === "-") i++;
    const digits = () => {
      const from = i;
      while (i < source.length && source[i] >= "0" && source[i] <= "9") i++;
      return i > from;
    };
    if (!digits()) {
      i = start;
      return at("number");
    }
    if (source[i] === ".") {
      i++;
      if (!digits()) return at("number");
    }
    if (source[i] === "e" || source[i] === "E") {
      i++;
      if (source[i] === "+" || source[i] === "-") i++;
      if (!digits()) return at("number");
    }
    // Leading zeros are the one thing the walk above would let through.
    if (/^-?0\d/.test(source.slice(start, i))) {
      i = start;
      return at("number");
    }
    return null;
  }

  const problem = value();
  if (problem) return problem;
  skip();
  if (i < source.length) return at("end");
  return null;
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys(value[key])])
    );
  }
  return value;
}

function measureJson(value, depth = 1) {
  let keys = 0;
  let deepest = depth;

  // Depth counts the boxes, not what is in them: `{"a":{"b":[1]}}` is three
  // levels deep whether the array holds numbers or nothing at all.
  const walk = (node, level) => {
    if (Array.isArray(node)) {
      deepest = Math.max(deepest, level);
      node.forEach((item) => walk(item, level + 1));
    } else if (node && typeof node === "object") {
      deepest = Math.max(deepest, level);
      for (const [, child] of Object.entries(node)) {
        keys++;
        walk(child, level + 1);
      }
    }
  };
  walk(value, depth);

  return { keys, depth: deepest, type: Array.isArray(value) ? "array" : typeof value };
}

// ---------------------------------------------------------------------------
// Comparing
// ---------------------------------------------------------------------------

/**
 * A line-by-line diff, by longest common subsequence.
 *
 * Quadratic, which is fine for the two documents a person actually pastes; the
 * caller caps the size rather than this pretending to be Myers.
 */
export function diffLines(left, right) {
  const a = String(left ?? "").split(/\r\n|\r|\n/);
  const b = String(right ?? "").split(/\r\n|\r|\n/);

  const table = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const rows = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      rows.push({ kind: "same", text: a[i], left: i + 1, right: j + 1 });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      rows.push({ kind: "removed", text: a[i], left: i + 1, right: null });
      i++;
    } else {
      rows.push({ kind: "added", text: b[j], left: null, right: j + 1 });
      j++;
    }
  }
  while (i < a.length) rows.push({ kind: "removed", text: a[i], left: ++i, right: null });
  while (j < b.length) rows.push({ kind: "added", text: b[j], left: null, right: ++j });

  return {
    rows,
    added: rows.filter((row) => row.kind === "added").length,
    removed: rows.filter((row) => row.kind === "removed").length,
    same: rows.filter((row) => row.kind === "same").length,
    identical: rows.every((row) => row.kind === "same"),
  };
}

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

const SETS = {
  lower: "abcdefghijkmnopqrstuvwxyz",
  upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  digits: "23456789",
  symbols: "!@#$%^&*-_=+?",
};
/** The characters that get misread aloud or on paper. */
const AMBIGUOUS = "il1Lo0O";

export function passwordAlphabet({ lower = true, upper = true, digits = true, symbols = false, avoidAmbiguous = true } = {}) {
  let pool = "";
  if (lower) pool += avoidAmbiguous ? SETS.lower : SETS.lower + "l";
  if (upper) pool += avoidAmbiguous ? SETS.upper : SETS.upper + "IO";
  if (digits) pool += avoidAmbiguous ? SETS.digits : "0123456789";
  if (symbols) pool += SETS.symbols;
  return avoidAmbiguous ? [...pool].filter((c) => !AMBIGUOUS.includes(c)).join("") : pool;
}

/**
 * Random from the system generator, and unbiased.
 *
 * Taking a modulus of a random byte skews towards the start of the alphabet;
 * rejecting the tail costs nothing and removes the skew.
 */
export function generatePassword(length, options = {}) {
  const pool = passwordAlphabet(options);
  if (!pool.length) fail("noCharacterTypes");
  const size = Math.max(4, Math.min(128, Math.floor(length) || 16));

  const limit = 256 - (256 % pool.length);
  const out = [];
  const buffer = new Uint8Array(size * 2);

  while (out.length < size) {
    crypto.getRandomValues(buffer);
    for (const byte of buffer) {
      if (byte >= limit) continue;
      out.push(pool[byte % pool.length]);
      if (out.length === size) break;
    }
  }

  return out.join("");
}

/** Entropy in bits, and which of four verdicts that lands in. */
export function passwordStrength(password, poolSize) {
  const bits = password.length * Math.log2(Math.max(2, poolSize));
  let level = "weak";
  if (bits >= 100) level = "excellent";
  else if (bits >= 75) level = "strong";
  else if (bits >= 55) level = "fair";
  return { bits: Math.round(bits), level };
}

export const __testing = { measureJson, sortKeys, locateJsonFault, SETS, AMBIGUOUS };
