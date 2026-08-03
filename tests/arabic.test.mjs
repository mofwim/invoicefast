import test from "node:test";
import assert from "node:assert/strict";

import {
  fixArabic,
  hasArabic,
  isAlreadyShaped,
  normalizeLetters,
  restoreArabic,
  reverseBidi,
  shapeArabic,
  stripTashkeel,
  stripTatweel,
  toArabicDigits,
  toLatinDigits,
  unshapeArabic,
} from "../lib/tools/arabic.js";

/**
 * The specification for this engine is "what a correct text renderer would
 * have drawn". Each case below is a shape that turns up in a real caption.
 */

// -------------------------------------------------------------- connecting

test("gives a letter its middle form when it has neighbours on both sides", () => {
  // The ب in بحر sits between two letters that both connect.
  assert.equal(shapeArabic("بحر"), "ﺑﺤﺮ");
});

test("leaves a lone letter in its standalone form", () => {
  assert.equal(shapeArabic("ب"), "ﺏ");
});

test("does not connect forwards after alef, dal, reh, waw", () => {
  // These four never join to what follows, which is why اد shows a gap.
  for (const [pair, expected] of [
    ["اب", "ﺍﺏ"],
    ["دب", "ﺩﺏ"],
    ["رب", "ﺭﺏ"],
    ["وب", "ﻭﺏ"],
  ]) {
    assert.equal(shapeArabic(pair), expected, pair);
  }
});

test("fuses lam-alef into the single ligature it must be", () => {
  assert.equal(shapeArabic("لا"), "ﻻ"); // standalone
  assert.equal(shapeArabic("بلا"), "ﺑﻼ"); // joined to the beh before it
  assert.equal(Array.from(shapeArabic("لا")).length, 1, "one glyph, not two");
});

test("fuses lam with each hamza-bearing alef", () => {
  assert.equal(shapeArabic("لآ"), "ﻵ");
  assert.equal(shapeArabic("لأ"), "ﻷ");
  assert.equal(shapeArabic("لإ"), "ﻹ");
});

test("treats harakat as transparent when working out the joins", () => {
  // The fatha between the two letters must not break the connection.
  const withMark = shapeArabic("بَح");
  const without = shapeArabic("بح");
  assert.equal(withMark.replace("َ", ""), without);
});

test("leaves Latin, digits and punctuation untouched", () => {
  assert.equal(shapeArabic("abc 123 !"), "abc 123 !");
});

test("shapes Persian and Urdu letters too", () => {
  assert.equal(shapeArabic("پپ"), "ﭘﭗ"); // initial + final
  assert.equal(shapeArabic("گ"), "ﮒ");
});

// --------------------------------------------------------------- direction

test("reverses an Arabic line", () => {
  assert.equal(reverseBidi("ابج"), "جبا");
});

test("keeps a Latin word running left to right inside an Arabic line", () => {
  assert.equal(reverseBidi("ابج Instagram دهو"), "وهد Instagram جبا");
});

test("keeps a number readable", () => {
  assert.equal(reverseBidi("رقم 12 من"), "نم 12 مقر");
});

test("preserves single spaces between runs", () => {
  const out = reverseBidi("اب Instagram جد");
  assert.ok(!out.includes("  "), "no doubled space");
  assert.equal(out.split(" ").length, 3);
});

test("mirrors brackets, because a flipped line flips their meaning", () => {
  assert.equal(reverseBidi("(اب)"), "(با)");
});

test("reverses each line on its own", () => {
  assert.equal(reverseBidi("اب\nجد"), "با\nدج");
});

test("reversing twice is the identity", () => {
  const line = "تابعني على Instagram الآن (12)";
  assert.equal(reverseBidi(reverseBidi(line)), line);
});

// ------------------------------------------------------------- round trips

const CAPTIONS = [
  "مرحبا بالعالم",
  "السلام عليكم",
  "لا إله إلا الله",
  "كيف حالك اليوم؟",
  "اشترك في القناة",
  "تابعني على Instagram الآن",
  "الفيديو رقم 12 من سلسلة (التصميم)",
  "زوروا موقعنا qalib.tools اليوم",
  "مُحَمَّد",
  "سطر أول\nسطر ثانٍ",
];

test("every caption survives the full trip out and back", () => {
  for (const caption of CAPTIONS) {
    assert.equal(restoreArabic(fixArabic(caption)), caption, caption);
  }
});

test("unshaping undoes shaping on its own", () => {
  for (const caption of CAPTIONS) {
    assert.equal(unshapeArabic(shapeArabic(caption)), caption, caption);
  }
});

test("unshaping splits the lam-alef ligature back into two letters", () => {
  assert.equal(unshapeArabic("ﻻ"), "لا");
});

// ------------------------------------------------------------- normalising

test("strips tashkeel", () => {
  assert.equal(stripTashkeel("مُحَمَّد"), "محمد");
});

test("strips tatweel", () => {
  assert.equal(stripTatweel("مـــحمد"), "محمد");
});

test("converts digits both ways", () => {
  assert.equal(toLatinDigits("١٢٣"), "123");
  assert.equal(toArabicDigits("123"), "١٢٣");
  assert.equal(toLatinDigits("۱۲۳"), "123", "Persian digits too");
});

test("collapses the spelling variants that split a search", () => {
  assert.equal(normalizeLetters("أإآ"), "ااا");
  assert.equal(normalizeLetters("على"), "علي");
});

// --------------------------------------------------------------- detection

test("knows Arabic when it sees it", () => {
  assert.ok(hasArabic("مرحبا"));
  assert.ok(!hasArabic("hello"));
  assert.ok(hasArabic("hello مرحبا"));
});

test("recognises text that has already been through the mill", () => {
  assert.ok(!isAlreadyShaped("مرحبا"));
  assert.ok(isAlreadyShaped(fixArabic("مرحبا")));
});

test("re-running the fix on its own output does not compound the damage", () => {
  // Someone will paste the result back in. It must not double-reverse.
  const once = fixArabic("اشترك في القناة");
  assert.equal(fixArabic(once), once);
});

// ----------------------------------------------------------------- options

test("shaping without flipping is available for apps that handle direction", () => {
  const out = fixArabic("بحر", { reverse: false });
  assert.equal(out, "ﺑﺤﺮ");
});

test("flipping without shaping is available too", () => {
  assert.equal(fixArabic("ابج", { shape: false }), "جبا");
});

test("dropping diacritics is opt-in", () => {
  assert.ok(fixArabic("مُحَمَّد").includes("َ"));
  assert.ok(!fixArabic("مُحَمَّد", { tashkeel: false }).includes("َ"));
});

test("an empty string stays empty", () => {
  assert.equal(fixArabic(""), "");
  assert.equal(shapeArabic(""), "");
  assert.equal(reverseBidi(""), "");
});

test("text with no Arabic in it comes back unchanged", () => {
  assert.equal(fixArabic("Hello world", { reverse: false }), "Hello world");
});

// ------------------------------------------------- regression: digit order

test("Arabic-Indic digits keep their order, like Latin ones", () => {
  // ١٢ is twelve. Reversing it makes it twenty-one, silently, in every
  // caption where someone chose Arabic numerals.
  assert.equal(fixArabic("رقم 12", { digits: "arabic" }), "١٢ ﻢﻗﺭ");
  assert.equal(reverseBidi("رقم ١٢"), "١٢ مقر");
});

test("Persian digits keep their order too", () => {
  assert.equal(reverseBidi("شماره ۱۲"), "۱۲ هرامش");
});

test("a mixed number and Latin run still round-trips", () => {
  const line = "الطلب ١٢٣ من Amazon";
  assert.equal(restoreArabic(fixArabic(line)), line);
});
