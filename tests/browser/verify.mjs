/**
 * Drive every tool in a real browser, with real files, in both languages.
 *
 * Buttons are found by structure or by a pattern that matches either language,
 * so the same script runs against /nl and /en without a second copy.
 */

import { chromium } from "playwright";

/**
 * Where the browser lives.
 *
 * Playwright's own download is skipped in this environment, so the path is
 * taken from CHROMIUM when it is set and left to Playwright otherwise.
 */
const BROWSER = process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {};
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FX = join(HERE, "fx");
const BASE = process.env.BASE || "http://localhost:3111";
const ONLY = process.argv[2] || "";

const file = (name) => join(FX, name);
mkdirSync(join(HERE, "out"), { recursive: true });

/** A button whose label matches either language. */
const btn = (page, pattern) => page.getByRole("button", { name: pattern });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Press a save button, and put what comes out on disk for checking. */
async function keep(page, tool, locale, pattern, extension) {
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }),
    btn(page, pattern).last().click(),
  ]);
  const target = join(HERE, "out", `${tool}-${locale}.${extension}`);
  await download.saveAs(target);
  return target;
}

/**
 * Every tool: its slug per language, and what proves it works.
 * `run` throws when the tool did not do its job.
 */
const TOOLS = [
  {
    id: "compress-image",
    slug: { nl: "afbeelding-comprimeren", en: "compress-image" },
    async run(page, locale, tool) {
      await page.setInputFiles('input[type="file"]', file("foto.png"));
      await btn(page, /Comprimeren|Compress/).click();
      await page.locator("img.tp-preview").waitFor({ timeout: 20000 });
      await page.getByText(/kleiner|smaller|al zuinig|already lean/i).first().waitFor();
    },
  },
  {
    id: "convert-image",
    slug: { nl: "afbeelding-omzetten", en: "convert-image" },
    async run(page, locale, tool) {
      await page.setInputFiles('input[type="file"]', file("foto.png"));
      await page.locator(".tp-rows li").first().waitFor({ timeout: 20000 });
    },
  },
  {
    id: "resize-image",
    slug: { nl: "afbeelding-formaat", en: "resize-image" },
    async run(page, locale, tool) {
      await page.setInputFiles('input[type="file"]', file("foto.png"));
      await page.locator("img.tp-preview").waitFor({ timeout: 20000 });
    },
  },
  {
    id: "make-favicon",
    slug: { nl: "favicon-maken", en: "favicon-generator" },
    async run(page, locale, tool) {
      await page.setInputFiles('input[type="file"]', file("logo.png"));
      await page.locator(".tp-rows li").first().waitFor({ timeout: 25000 });
      const rows = await page.locator(".tp-rows li").count();
      if (rows < 4) throw new Error(`favicon set too small: ${rows}`);
    },
  },
  {
    id: "watermark-image",
    slug: { nl: "watermerk", en: "add-watermark" },
    async run(page, locale, tool) {
      await page.setInputFiles('input[type="file"]', file("foto.png"));
      await page.locator('input[type="text"]').first().fill("© test");
      await page.locator("img.tp-preview").waitFor({ timeout: 20000 });
    },
  },

  {
    id: "merge-pdf",
    slug: { nl: "pdf-samenvoegen", en: "merge-pdf" },
    async run(page, locale, tool) {
      await page.setInputFiles('input[type="file"]', [file("rapport.pdf"), file("bijlage.pdf")]);
      await page.locator(".tp-rows li").nth(1).waitFor({ timeout: 20000 });
      await page.locator("img.tp-cover").first().waitFor({ timeout: 25000 });
      await btn(page, /^(Samenvoegen|Merge)$/).click();
      await page.getByText(/7 pagina|7 pages/).waitFor({ timeout: 25000 });
      await keep(page, tool, locale, /Opslaan|Save/, "pdf");
    },
  },
  {
    id: "split-pdf",
    slug: { nl: "pdf-splitsen", en: "split-pdf" },
    async run(page, locale, tool) {
      await page.setInputFiles('input[type="file"]', file("rapport.pdf"));
      await page.locator(".tp-grid-item").nth(4).waitFor({ timeout: 25000 });
      await page.locator(".tp-grid-item").nth(2).locator("button.tp-grid-sheet").click();
      const value = await page.locator('input[type="text"]').first().inputValue();
      if (!/1, 3|1,3/.test(value)) throw new Error(`clicking a page did not update the range: "${value}"`);
      await btn(page, /^(Splitsen|Split)$/).click();
      await page.locator(".tp-rows li").first().waitFor({ timeout: 25000 });
      await keep(page, tool, locale, /Opslaan|Save/, "pdf");
    },
  },
  {
    id: "organise-pdf",
    slug: { nl: "pdf-pagina-s-ordenen", en: "rotate-delete-pdf-pages" },
    async run(page, locale, tool) {
      await page.setInputFiles('input[type="file"]', file("rapport.pdf"));
      await page.locator(".tp-grid-item").nth(4).waitFor({ timeout: 25000 });
      await page.locator(".tp-grid-sheet img").first().waitFor({ timeout: 30000 });

      // Move page one later, turn it, and drop the last.
      await page.locator(".tp-grid-item").first().getByTitle(/Naar achteren|Move later/).click();
      const firstNumber = await page.locator(".tp-grid-item").first().locator(".tp-grid-no").textContent();
      if (firstNumber.trim() !== "2") throw new Error(`reorder failed, first tile is ${firstNumber}`);

      await page.locator(".tp-grid-item").first().getByTitle(/Rechts draaien|Turn right/).click();
      await page.locator(".tp-grid-item").last().getByTitle(/Verwijderen|Remove/).click();
      await page.getByText(/4 van 5|4 of 5/).waitFor();

      await btn(page, /^(Toepassen|Apply)$/).click();
      await keep(page, tool, locale, /Opslaan|Save/, "pdf");
    },
  },
  {
    id: "images-to-pdf",
    slug: { nl: "afbeeldingen-naar-pdf", en: "images-to-pdf" },
    async run(page, locale, tool) {
      await page.setInputFiles('input[type="file"]', [file("foto.png"), file("logo.png")]);
      await page.locator(".tp-rows li").nth(1).waitFor({ timeout: 20000 });
      await btn(page, /PDF maken|Make the PDF/).click();
      await page.getByText(/2 pagina|2 pages/).waitFor({ timeout: 25000 });
      await keep(page, tool, locale, /Opslaan|Save/, "pdf");
    },
  },
  {
    id: "stamp-pdf",
    slug: { nl: "pdf-watermerk", en: "watermark-pdf" },
    async run(page, locale, tool) {
      await page.setInputFiles('input[type="file"]', file("rapport.pdf"));
      await page.locator('input[type="text"]').first().waitFor({ timeout: 20000 });
      await page.locator('input[type="text"]').first().fill("KOPIE");

      // The preview is built by the same call as the result, so it has to
      // appear before anything is applied.
      await page.locator(".tp-sheet-still img").waitFor({ timeout: 30000 });
      const first = await page.locator(".tp-sheet-still img").getAttribute("src");
      await page.locator('input[type="range"]').first().fill("120");
      await page.waitForFunction(
        (was) => document.querySelector(".tp-sheet-still img")?.src !== was,
        first,
        { timeout: 30000 }
      );

      await btn(page, /^(Toepassen|Apply)$/).click();
      await page.getByText(/Toegepast op 5|Applied to 5/).waitFor({ timeout: 25000 });
      await keep(page, tool, locale, /Opslaan|Save/, "pdf");
    },
  },
  {
    id: "pdf-to-images",
    slug: { nl: "pdf-naar-afbeelding", en: "pdf-to-jpg" },
    async run(page, locale, tool) {
      await page.setInputFiles('input[type="file"]', file("rapport.pdf"));
      await page.locator('input[type="text"]').first().waitFor({ timeout: 20000 });
      await page.locator('input[type="text"]').first().fill("1-2");
      await btn(page, /^(Omzetten|Convert)$/).click();
      await page.locator(".tp-shots li").nth(1).waitFor({ timeout: 40000 });
      const shots = await page.locator(".tp-shots li").count();
      if (shots !== 2) throw new Error(`expected 2 images, got ${shots}`);
      await keep(page, tool, locale, /zip/i, "zip");
    },
  },
  {
    id: "pdf-to-text",
    slug: { nl: "pdf-naar-tekst", en: "pdf-to-text" },
    async run(page, locale, tool) {
      await page.setInputFiles('input[type="file"]', file("rapport.pdf"));
      await page.locator("pre.tp-out").waitFor({ timeout: 40000 });
      const text = await page.locator("pre.tp-out").textContent();
      if (!/kwartaalrapport/i.test(text)) throw new Error(`no text extracted: ${text.slice(0, 80)}`);
      if (!/bladzijde 5/i.test(text)) throw new Error("the last page was not read");
    },
  },
  {
    id: "compress-pdf",
    slug: { nl: "pdf-verkleinen", en: "compress-pdf" },
    async run(page, locale, tool) {
      // The scan is the case this tool exists for: two pages that are each one
      // big photograph.
      await page.setInputFiles('input[type="file"]', file("scan.pdf"));
      await btn(page, /^(Verkleinen|Compress)$/).click();
      await page.locator("dl.tp-stat").waitFor({ timeout: 60000 });

      const cells = await page.locator("dl.tp-stat dd").allTextContents();
      const bytes = (label) => {
        const match = label.match(/([\d.,]+)\s*(B|kB|MB)/);
        if (!match) return NaN;
        const value = Number(match[1].replace(",", "."));
        return value * { B: 1, kB: 1024, MB: 1024 * 1024 }[match[2]];
      };
      const was = bytes(cells[0]);
      const now = bytes(cells[1]);
      if (!(now < was * 0.5)) {
        throw new Error(`a 1.8 MB scan should more than halve; got ${cells[0]} → ${cells[1]}`);
      }
      if (cells[3] !== "1 / 1") throw new Error(`expected the one picture rewritten, got ${cells[3]}`);
      await keep(page, tool, locale, /Opslaan|Save/, "pdf");

      // The decisive one: text and a heavy picture together. It has to shrink
      // hard *and* leave the words alone — that is the entire argument for
      // doing it this way instead of redrawing the pages.
      await page.setInputFiles('input[type="file"]', file("gemengd.pdf"));
      await btn(page, /^(Verkleinen|Compress)$/).click();
      await page.locator(".tp-note-ok").waitFor({ timeout: 60000 });
      await keep(page, "compress-pdf-mixed", locale, /Opslaan|Save/, "pdf");

      // And on a document that is only text, it has to say there is nothing to
      // win rather than inventing a saving.
      await page.setInputFiles('input[type="file"]', file("rapport.pdf"));
      await btn(page, /^(Verkleinen|Compress)$/).click();
      await page.locator(".tp-note-warn").waitFor({ timeout: 40000 });
      await page.getByText(/geen afbeeldingen|no pictures/i).waitFor({ timeout: 10000 });
    },
  },
  {
    id: "compress-pdf-raster",
    slug: { nl: "pdf-verkleinen", en: "compress-pdf" },
    async run(page, locale, tool) {
      await page.setInputFiles('input[type="file"]', file("rapport.pdf"));
      await btn(page, /^(Alles|Everything)$/).click();
      await btn(page, /^(Verkleinen|Compress)$/).click();
      await page.locator("dl.tp-stat").waitFor({ timeout: 60000 });
      const pages = await page.locator("dl.tp-stat div").nth(2).locator("dd").textContent();
      if (pages.trim() !== "5") throw new Error(`rasterised document has ${pages} pages`);
      await keep(page, tool, locale, /Opslaan|Save/, "pdf");
    },
  },
  {
    id: "pdf-metadata",
    slug: { nl: "pdf-eigenschappen", en: "pdf-metadata-editor" },
    async run(page, locale, tool) {
      await page.setInputFiles('input[type="file"]', file("rapport.pdf"));
      const title = page.locator('input[type="text"]').first();
      await title.waitFor({ timeout: 20000 });
      if ((await title.inputValue()) !== "Kwartaalrapport") {
        throw new Error(`title not read back: "${await title.inputValue()}"`);
      }
      await title.fill("Nieuwe titel");
      await btn(page, /^(Opslaan|Apply)$/).first().click();
      await page.getByText(/aangepast|written/i).waitFor({ timeout: 25000 });
      await keep(page, tool, locale, /Opslaan|Save/, "pdf");
    },
  },
  {
    id: "sign-pdf",
    slug: { nl: "pdf-ondertekenen", en: "sign-pdf" },
    async run(page, locale, tool) {
      await page.setInputFiles('input[type="file"]', file("rapport.pdf"));
      const pad = page.locator("canvas.tp-pad");
      await pad.waitFor({ timeout: 25000 });

      const box = await pad.boundingBox();
      await page.mouse.move(box.x + 40, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 140, box.y + 30, { steps: 8 });
      await page.mouse.move(box.x + 240, box.y + box.height - 30, { steps: 8 });
      await page.mouse.up();

      await page.locator(".tp-sheet img").first().waitFor({ timeout: 30000 });
      await page.locator("img.tp-sheet-mark").waitFor({ timeout: 15000 });

      const sheet = await page.locator(".tp-sheet").boundingBox();
      await page.mouse.click(sheet.x + sheet.width * 0.5, sheet.y + sheet.height * 0.6);

      await btn(page, /^(Ondertekenen|Sign)$/).click();
      await page.getByText(/staat erop|is on it/i).waitFor({ timeout: 30000 });
      await keep(page, tool, locale, /Opslaan|Save/, "pdf");
    },
  },

  {
    id: "extract-images",
    slug: { nl: "afbeeldingen-uit-pdf", en: "extract-images-from-pdf" },
    async run(page, locale, tool) {
      await page.setInputFiles('input[type="file"]', file("met-fotos.pdf"));
      await page.locator(".tp-shots li").first().waitFor({ timeout: 40000 });
      const found = await page.locator(".tp-shots li").count();
      if (found !== 2) throw new Error(`expected the two distinct pictures, got ${found}`);
      const labels = await page.locator(".tp-shots span").allTextContents();
      if (!labels.some((label) => label.startsWith("320×200"))) {
        throw new Error(`the photo did not come out at its own size: ${labels.join(" / ")}`);
      }
      if (!labels.some((label) => label.startsWith("256×256"))) {
        throw new Error(`the logo did not come out at its own size: ${labels.join(" / ")}`);
      }
      await keep(page, tool, locale, /zip/i, "zip");

      // And a document with no embedded pictures says so rather than shrugging.
      await page.setInputFiles('input[type="file"]', file("rapport.pdf"));
      await page.locator(".tp-note-warn").waitFor({ timeout: 40000 });
    },
  },
  {
    id: "unpack-email",
    slug: { nl: "email-uitpakken", en: "open-eml-file" },
    async run(page, locale, tool) {
      await page.setInputFiles('input[type="file"]', file("bericht.eml"));
      await page.getByText("Bevestiging afspraak").waitFor({ timeout: 20000 });
      await page.getByText("brief.txt").waitFor();
    },
  },
  {
    id: "convert-calendar",
    slug: { nl: "agenda-omzetten", en: "ics-to-csv" },
    async run(page, locale, tool) {
      await page.setInputFiles('input[type="file"]', file("agenda.ics"));
      await page.locator(".tp-table").waitFor({ timeout: 20000 });
      await page.getByText("Tandarts").first().waitFor();
    },
  },

  {
    id: "word-count",
    slug: { nl: "woorden-tellen", en: "word-counter" },
    async run(page, locale, tool) {
      await page.locator("textarea").fill("Hallo wereld.\n\nTweede alinea hierboven.");
      await page.getByText("5", { exact: true }).first().waitFor({ timeout: 10000 });
      const words = await page.locator("dl.tp-stat dd").first().textContent();
      if (words.trim() !== "5") throw new Error(`word count is ${words}`);
    },
  },
  {
    id: "arabic-text",
    slug: { nl: "arabische-tekst-repareren", en: "fix-arabic-text" },
    async run(page, locale, tool) {
      const input = page.locator("textarea").first();
      await input.fill("اشترك في القناة");
      await page.locator("textarea.ar-out").waitFor({ timeout: 10000 });

      const fixed = await page.locator("textarea.ar-out").inputValue();
      // The letters have to come back joined — presentation forms, not the
      // isolated code points that were typed in.
      if (!/[\uFE70-\uFEFF]/.test(fixed)) throw new Error(`nothing was shaped: ${fixed}`);
      if (fixed === "اشترك في القناة") throw new Error("the text came back untouched");

      // And the whole trip has to be reversible, or somebody's caption is lost.
      const { restoreArabic } = await import("../../lib/tools/arabic.js");
      if (restoreArabic(fixed) !== "اشترك في القناة") {
        throw new Error(`the round trip lost something: ${restoreArabic(fixed)}`);
      }

      // Picking a game engine turns the flip off; that is the whole point of
      // asking which app rather than asking which switches.
      await page.getByRole("button", { name: "Unity / Godot" }).click();
      await page.waitForTimeout(200);
      const noFlip = await page.locator("textarea.ar-out").inputValue();
      if (noFlip === fixed) throw new Error("choosing an engine changed nothing");
      if (!/[\uFE70-\uFEFF]/.test(noFlip)) throw new Error("the engine preset stopped shaping too");
    },
  },
  {
    id: "json-format",
    slug: { nl: "json-opmaken", en: "json-formatter" },
    async run(page, locale, tool) {
      await page.locator("textarea").fill('{"b":1,"a":{"c":[1,2]}}');
      await btn(page, /^(Opmaken|Format)$/).click();
      await page.locator("pre.tp-out").waitFor({ timeout: 10000 });
      const out = await page.locator("pre.tp-out").textContent();
      if (!/\n {2}"b"/.test(out)) throw new Error("not indented");

      // And a broken document has to be located, not merely refused.
      await page.locator("textarea").fill('{\n  "a": 1,\n  "b": oops\n}');
      await btn(page, /^(Opmaken|Format)$/).click();
      await page.getByText(/Regel 3|Line 3/).waitFor({ timeout: 10000 });
    },
  },
  {
    id: "base64",
    slug: { nl: "base64-coderen", en: "base64-encode-decode" },
    async run(page, locale, tool) {
      await page.locator("textarea").fill("Café — déjà vu");
      await page.locator("pre.tp-out").first().waitFor({ timeout: 10000 });
      const encoded = (await page.locator("pre.tp-out").first().textContent()).trim();
      if (encoded !== "Q2Fmw6kg4oCUIGTDqWrDoCB2dQ==") throw new Error(`wrong base64: ${encoded}`);

      await btn(page, /^(Decoderen|Decode)$/).click();
      await page.locator("textarea").fill(encoded);
      await page.getByText("Café — déjà vu").first().waitFor({ timeout: 10000 });
    },
  },
  {
    id: "text-diff",
    slug: { nl: "tekst-vergelijken", en: "compare-text" },
    async run(page, locale, tool) {
      await page.locator("textarea").first().fill("een\ntwee\ndrie");
      await page.locator("textarea").nth(1).fill("een\ntwee en half\ndrie");
      await page.locator(".tp-diff-added").waitFor({ timeout: 10000 });
      await page.locator(".tp-diff-removed").waitFor();
    },
  },
  {
    id: "slug-url",
    slug: { nl: "slug-maken", en: "slug-generator" },
    async run(page, locale, tool) {
      await page.locator('input[type="text"]').first().fill("Café déjà vu — 10 tips & trucs");
      await page.locator("pre.tp-out").waitFor({ timeout: 10000 });
      const slug = (await page.locator("pre.tp-out").textContent()).trim();
      if (!/cafe-deja-vu-10-tips-en-trucs/.test(slug)) throw new Error(`slug is "${slug}"`);

      await btn(page, /URL/).first().click();
      await page.locator("textarea").fill("a b&c=d");
      await page.getByText("a%20b%26c%3Dd").waitFor({ timeout: 10000 });
    },
  },
  {
    id: "qr-code",
    slug: { nl: "qr-code-maken", en: "qr-code-generator" },
    async run(page, locale, tool) {
      await page.locator('input[type="text"]').first().fill("invoicefast.app/nl/tools");
      await page.locator(".tp-qr svg").waitFor({ timeout: 15000 });
      await btn(page, /PNG/).waitFor();

      // Wifi is the other shape worth proving.
      await btn(page, /^Wifi$/).click();
      await page.locator('input[type="text"]').first().fill("Thuisnetwerk");
      await page.locator(".tp-qr svg").waitFor({ timeout: 15000 });
    },
  },
  {
    id: "password",
    slug: { nl: "wachtwoord-maken", en: "password-generator" },
    async run(page, locale, tool) {
      await page.locator(".tp-passwords li").first().waitFor({ timeout: 10000 });
      const before = await page.locator(".tp-passwords code").first().textContent();
      if (before.length !== 20) throw new Error(`length is ${before.length}`);
      await btn(page, /Nieuwe maken|Make new/).click();
      await wait(150);
      const after = await page.locator(".tp-passwords code").first().textContent();
      if (before === after) throw new Error("the same password came back");
    },
  },
  {
    id: "hash",
    slug: { nl: "checksum-controleren", en: "checksum-calculator" },
    async run(page, locale, tool) {
      await page.locator("textarea").fill("abc");
      await page.locator("pre.tp-out").waitFor({ timeout: 10000 });
      const digest = (await page.locator("pre.tp-out").textContent()).trim();
      const expected = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
      if (digest !== expected) throw new Error(`sha-256 of "abc" came out as ${digest}`);

      await page.locator('input[type="text"]').last().fill(expected.toUpperCase());
      await page.getByText(/komen overeen|These match/i).waitFor({ timeout: 10000 });

      // A file, which takes the other path through the module.
      await btn(page, /^(Bestand|File)$/).click();
      await page.setInputFiles('input[type="file"]', file("foto.png"));
      await page.locator("pre.tp-out").waitFor({ timeout: 15000 });
    },
  },
  {
    id: "vat-calculator",
    slug: { nl: "btw-berekenen", en: "vat-calculator" },
    async run(page, locale, tool) {
      await page.locator('input[inputmode="decimal"]').fill("100");
      await wait(150);
      const cells = await page.locator("dl.tp-stat dd").allTextContents();
      const numbers = cells.map((cell) => cell.replace(/[^\d,.]/g, ""));
      if (!numbers[1].startsWith("21")) throw new Error(`21% of 100 came out as ${numbers[1]}`);
      if (!numbers[2].startsWith("121")) throw new Error(`gross came out as ${numbers[2]}`);

      await btn(page, /Inclusief btw|Including VAT/).last().click();
      await wait(150);
      const back = (await page.locator("dl.tp-stat dd").allTextContents()).map((c) => c.replace(/[^\d,.]/g, ""));
      if (!back[0].startsWith("82,64") && !back[0].startsWith("82.64")) {
        throw new Error(`taking VAT back out of 100 gave ${back[0]}`);
      }
    },
  },
  {
    id: "iban-check",
    slug: { nl: "iban-controleren", en: "iban-validator" },
    async run(page, locale, tool) {
      const input = page.locator('input[type="text"]').first();
      await input.fill("NL91ABNA0417164300");
      await page.locator(".tp-note-ok").filter({ hasText: /klopt|checks out/i }).waitFor({ timeout: 10000 });
      await page.getByText("ABN AMRO").waitFor();
      const written = await input.inputValue();
      if (written !== "NL91 ABNA 0417 1643 00") throw new Error(`not grouped while typing: "${written}"`);

      await input.fill("NL91ABNA0417164301");
      await page.locator(".tp-note-error").waitFor({ timeout: 10000 });
    },
  },
];

// ---------------------------------------------------------------------------

const browser = await chromium.launch(BROWSER);
const results = [];

for (const locale of ["nl", "en"]) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1600 } });
  // Answer the advertising question the way a returning visitor already has,
  // so these runs test the tools rather than the banner. The banner has a pass
  // of its own in ads.mjs.
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem("tools_ads_consent", "refused");
    } catch {
      /* nothing */
    }
  });
  for (const tool of TOOLS) {
    if (ONLY && tool.id !== ONLY) continue;
    const page = await context.newPage();
    const problems = [];
    page.on("pageerror", (err) => problems.push(`page error: ${err.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(`console: ${message.text().slice(0, 160)}`);
    });

    const url = `${BASE}/${locale}/tools/${tool.slug[locale]}`;
    let status = "ok";
    let detail = "";
    try {
      const response = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      if (!response.ok()) throw new Error(`HTTP ${response.status()}`);
      await tool.run(page, locale, tool.id);
      if (problems.length) {
        status = "noisy";
        detail = problems.slice(0, 2).join(" | ");
      }
    } catch (err) {
      status = "FAIL";
      detail = `${err.message.split("\n")[0].slice(0, 200)}${problems.length ? ` || ${problems[0]}` : ""}`;
    }
    results.push({ locale, id: tool.id, status, detail });
    console.log(`${status === "ok" ? "  ok" : status === "noisy" ? "warn" : "FAIL"}  ${locale}  ${tool.id}${detail ? `  — ${detail}` : ""}`);
    await page.close();
  }
  await context.close();
}

await browser.close();

const failed = results.filter((r) => r.status === "FAIL");
const noisy = results.filter((r) => r.status === "noisy");
console.log(`\n${results.length - failed.length - noisy.length} ok · ${noisy.length} noisy · ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
