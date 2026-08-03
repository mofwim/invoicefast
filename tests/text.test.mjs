import test from "node:test";
import assert from "node:assert/strict";

import {
  countText, slugify, encodeBase64, decodeBase64, encodeUrl, decodeUrl,
  formatJson, diffLines, generatePassword, passwordAlphabet, passwordStrength,
} from "../lib/tools/text.js";

/** Errors carry a code, not a sentence — the page does the wording. */
const code = (name) => (err) => err.code === name;

// ------------------------------------------------------------------ counting

test("counts what a person would count", () => {
  const c = countText("Hallo wereld.\n\nTweede alinea hierboven.");
  assert.equal(c.words, 5);
  assert.equal(c.lines, 3);
  assert.equal(c.paragraphs, 2);
  assert.equal(c.sentences, 2);
  assert.equal(c.longestWord, "hierboven", "de punt hoort niet bij het woord");
});

test("an emoji is one character, not two", () => {
  assert.equal(countText("hoi 👋").characters, 5);
});

test("empty text counts to nothing", () => {
  const c = countText("");
  assert.equal(c.words, 0);
  assert.equal(c.paragraphs, 0);
  assert.equal(c.characters, 0);
});

test("spaces are excluded when asked", () => {
  const c = countText("a b c");
  assert.equal(c.characters, 5);
  assert.equal(c.withoutSpaces, 3);
});

// --------------------------------------------------------------------- slugs

test("makes a slug a URL can carry", () => {
  assert.equal(slugify("Hallo, Wereld!"), "hallo-wereld");
  assert.equal(slugify("  meerdere   spaties  "), "meerdere-spaties");
});

test("accents and special letters survive as letters", () => {
  assert.equal(slugify("Café déjà vu"), "cafe-deja-vu");
  assert.equal(slugify("Straße"), "strasse");
  assert.equal(slugify("Blåbærsyltetøy"), "blabaersyltetoy");
});

test("currency and ampersand become words", () => {
  assert.equal(slugify("Kosten & baten"), "kosten-en-baten");
  assert.equal(slugify("prijs 100 €"), "prijs-100-eur");
});

test("a slug can be cut without ending mid-word", () => {
  assert.equal(slugify("een hele lange titel over van alles", { max: 20 }), "een-hele-lange-titel");
});

// -------------------------------------------------------------------- base64

test("base64 goes both ways, accents included", () => {
  for (const text of ["hallo", "Café — déjà vu", "regel1\nregel2", "👋 emoji"]) {
    assert.equal(decodeBase64(encodeBase64(text)), text);
  }
});

test("the URL-safe alphabet round-trips too", () => {
  const text = "?a=1&b=2/x+y";
  const encoded = encodeBase64(text, { urlSafe: true });
  assert.doesNotMatch(encoded, /[+/=]/);
  assert.equal(decodeBase64(encoded), text);
});

test("missing padding is forgiven, nonsense is not", () => {
  assert.equal(decodeBase64("aGFsbG8"), "hallo");
  assert.throws(() => decodeBase64("!!!!"), code("badBase64"));
});

// ----------------------------------------------------------------------- url

test("url encoding goes both ways", () => {
  assert.equal(encodeUrl("a b&c=d"), "a%20b%26c%3Dd");
  assert.equal(decodeUrl("a%20b%26c%3Dd"), "a b&c=d");
  assert.equal(decodeUrl("a+b"), "a b", "een plus uit een formulier is een spatie");
});

test("a broken percent escape says so", () => {
  assert.throws(() => decodeUrl("%zz"), code("badEscape"));
});

// ---------------------------------------------------------------------- json

test("formats and measures json", () => {
  const { text, stats } = formatJson('{"b":1,"a":{"c":[1,2]}}');
  assert.match(text, /\n {2}"b"/);
  assert.equal(stats.keys, 3);
  assert.equal(stats.depth, 3);
});

test("keys can be sorted", () => {
  const { text } = formatJson('{"b":1,"a":2}', { sort: true });
  assert.ok(text.indexOf('"a"') < text.indexOf('"b"'));
});

test("indent 0 gives one line", () => {
  assert.equal(formatJson('{"a": 1}', { indent: 0 }).text, '{"a":1}');
});

test("a broken document is located, not just rejected", () => {
  assert.throws(
    () => formatJson('{\n  "a": 1,\n  "b": oops\n}'),
    (err) => err.code === "jsonFault" && err.details.line === 3 && err.details.column === 8
  );
  assert.throws(() => formatJson("   "), code("jsonEmpty"));
});

test("the fault is found the same way whatever the engine says", () => {
  // V8 reports a character offset for one of these and a quoted excerpt for
  // the other; both have to come out as a line and a column.
  const cases = [
    ['{"a":1,}', 1, 8, "name"],
    ["[1,2", 1, 5, "commaOrBracket"],
    ['{"a" 1}', 1, 6, "colon"],
    ['{"a": "unterminated', 1, 20, "closingQuote"],
    ['{"a": 01}', 1, 7, "number"],
    ['{"a": 1}\n{"b": 2}', 2, 1, "end"],
  ];
  for (const [source, line, column, expected] of cases) {
    assert.throws(
      () => formatJson(source),
      (err) =>
        err.code === "jsonFault" &&
        err.details.line === line &&
        err.details.column === column &&
        err.details.expected === expected,
      `${source} hoorde regel ${line}, teken ${column} (${expected}) te geven`
    );
  }
});

// ---------------------------------------------------------------- comparing

test("finds what changed between two texts", () => {
  const d = diffLines("een\ntwee\ndrie", "een\ntwee en half\ndrie");
  assert.equal(d.added, 1);
  assert.equal(d.removed, 1);
  assert.equal(d.same, 2);
  assert.equal(d.identical, false);
});

test("identical texts say so", () => {
  const d = diffLines("zelfde\ntekst", "zelfde\ntekst");
  assert.equal(d.identical, true);
  assert.equal(d.added + d.removed, 0);
});

test("added and removed lines keep their numbers", () => {
  const d = diffLines("a\nb", "a\nb\nc");
  const added = d.rows.find((row) => row.kind === "added");
  assert.equal(added.text, "c");
  assert.equal(added.right, 3);
  assert.equal(added.left, null);
});

// ----------------------------------------------------------------- passwords

test("a password has the length asked for, from the pool chosen", () => {
  const pool = passwordAlphabet({ lower: true, upper: false, digits: false, symbols: false });
  const password = generatePassword(24, { lower: true, upper: false, digits: false, symbols: false });
  assert.equal(password.length, 24);
  assert.ok([...password].every((c) => pool.includes(c)), `buiten de pool: ${password}`);
});

test("look-alike characters stay out unless allowed back in", () => {
  assert.ok(!passwordAlphabet({}).includes("O"));
  assert.ok(!passwordAlphabet({}).includes("l"));
  assert.ok(passwordAlphabet({ avoidAmbiguous: false }).includes("0"));
});

test("two passwords are not the same", () => {
  const made = new Set(Array.from({ length: 50 }, () => generatePassword(16)));
  assert.equal(made.size, 50, "50 wachtwoorden hoorden 50 verschillende te zijn");
});

test("length is kept inside sane bounds", () => {
  assert.equal(generatePassword(1).length, 4);
  assert.equal(generatePassword(500).length, 128);
});

test("no character type selected is refused", () => {
  assert.throws(
    () => generatePassword(12, { lower: false, upper: false, digits: false, symbols: false }),
    code("noCharacterTypes")
  );
});

test("strength is reported in bits and in words", () => {
  const weak = passwordStrength("abcd", 26);
  const strong = passwordStrength("a".repeat(20), 90);
  assert.ok(weak.bits < strong.bits);
  assert.equal(weak.level, "weak");
  assert.equal(strong.level, "excellent");
});
