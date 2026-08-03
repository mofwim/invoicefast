/**
 * What happens when the file is wrong.
 *
 * People drop the wrong thing constantly — a photo renamed to .pdf, a download
 * that was truncated, an empty file from a failed export. Every tool has to
 * come back with a sentence a person can act on. Three things are failures
 * here, and all three are silent in a normal test run: a stack trace reaching
 * the console, a spinner that never stops, and a page that says nothing at all.
 */

import { chromium } from "playwright";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || "http://localhost:3111";
const BROWSER = process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {};
const file = (name) => join(HERE, "fx", name);

/** Tool slug, the wrong files to try on it, and what an answer looks like. */
const CASES = [
  { slug: "pdf-samenvoegen", files: ["kapot.pdf", "leeg.pdf", "vermomd.pdf"] },
  { slug: "pdf-splitsen", files: ["kapot.pdf", "leeg.pdf"] },
  { slug: "pdf-pagina-s-ordenen", files: ["kapot.pdf", "vermomd.pdf"] },
  { slug: "pdf-verkleinen", files: ["kapot.pdf", "leeg.pdf"], press: /^(Verkleinen)$/ },
  { slug: "pdf-naar-afbeelding", files: ["kapot.pdf", "leeg.pdf"] },
  { slug: "pdf-naar-tekst", files: ["kapot.pdf", "vermomd.pdf"] },
  { slug: "afbeeldingen-uit-pdf", files: ["kapot.pdf", "leeg.pdf"] },
  { slug: "pdf-eigenschappen", files: ["kapot.pdf", "vermomd.pdf"] },
  { slug: "pdf-ondertekenen", files: ["kapot.pdf"] },
  { slug: "pdf-watermerk", files: ["kapot.pdf", "leeg.pdf"] },
  { slug: "afbeeldingen-naar-pdf", files: ["kapot.pdf", "leeg.png"] },
  { slug: "afbeelding-comprimeren", files: ["leeg.png", "kapot.pdf"], press: /^(Comprimeren)$/ },
  { slug: "afbeelding-omzetten", files: ["leeg.png", "kapot.pdf"] },
  { slug: "favicon-maken", files: ["leeg.png", "kapot.pdf"] },
  { slug: "watermerk", files: ["leeg.png"] },
  { slug: "afbeelding-formaat", files: ["leeg.png"] },
  { slug: "email-uitpakken", files: ["geen-mail.eml", "leeg.pdf"] },
  { slug: "agenda-omzetten", files: ["leeg.ics", "kapot.pdf"] },
  { slug: "checksum-controleren", files: ["leeg.png"], first: /^Bestand$/, expectSilence: true },
];

const browser = await chromium.launch(BROWSER);
const context = await browser.newContext({ viewport: { width: 1280, height: 1400 } });
let bad = 0;

for (const testCase of CASES) {
  for (const wrong of testCase.files) {
    const page = await context.newPage();
    const crashes = [];
    page.on("pageerror", (err) => crashes.push(err.message.slice(0, 120)));

    let verdict = "ok";
    let detail = "";
    try {
      await page.goto(`${BASE}/nl/tools/${testCase.slug}`, { waitUntil: "networkidle", timeout: 30000 });
      // Some tools keep the file picker behind a choice.
      if (testCase.first) await page.getByRole("button", { name: testCase.first }).click();
      await page.setInputFiles('input[type="file"]', file(wrong));

      if (testCase.press) {
        const button = page.getByRole("button", { name: testCase.press });
        if (await button.isVisible().catch(() => false)) await button.click();
      }

      // Give it a fair chance to think, then look at where it ended up.
      await page.waitForTimeout(3500);

      const said = await page.locator(".tp-note-error, .tp-note-warn").count();
      const stillWorking = await page.locator(".tp-note-ok").filter({ hasText: /Bezig|…/ }).count();
      const gotAResult = testCase.expectSilence && (await page.locator("pre.tp-out").count()) > 0;

      if (crashes.length) {
        verdict = "FAIL";
        detail = `threw: ${crashes[0]}`;
      } else if (stillWorking) {
        verdict = "FAIL";
        detail = "still busy after 3.5s — a spinner that never stops";
      } else if (!said && !gotAResult) {
        verdict = "FAIL";
        detail = "said nothing at all";
      }
    } catch (err) {
      verdict = "FAIL";
      detail = err.message.split("\n")[0].slice(0, 120);
    }

    if (verdict !== "ok") bad++;
    console.log(`${verdict === "ok" ? "  ok" : "FAIL"}  ${testCase.slug} ← ${wrong}${detail ? `  — ${detail}` : ""}`);
    await page.close();
  }
}

await browser.close();
console.log(bad ? `\n${bad} tools do not cope with a bad file` : "\nevery tool copes with a bad file");
process.exit(bad ? 1 : 0);
