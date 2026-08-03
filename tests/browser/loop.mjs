/**
 * Does anything on these pages keep re-rendering when nobody is touching it?
 *
 * A translator that was a fresh closure on every render made every callback
 * holding it fresh too, and an effect depending on one of those would run for
 * ever. This watches the DOM sit still for a second, which is what an idle page
 * is supposed to do.
 */

import { chromium } from "playwright";

/**
 * Where the browser lives.
 *
 * Playwright's own download is skipped in this environment, so the path is
 * taken from CHROMIUM when it is set and left to Playwright otherwise.
 */
const BROWSER = process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {};

const BASE = "http://localhost:3111";
const PAGES = [
  ["nl", "wachtwoord-maken", ".tp-passwords code"],
  ["en", "password-generator", ".tp-passwords code"],
  ["nl", "checksum-controleren", null],
  ["nl", "qr-code-maken", null],
  ["nl", "woorden-tellen", null],
  ["nl", "btw-berekenen", null],
];

const browser = await chromium.launch(BROWSER);
let bad = 0;

for (const [locale, slug, watch] of PAGES) {
  const page = await browser.newPage();
  await page.goto(`${BASE}/${locale}/tools/${slug}`, { waitUntil: "networkidle" });

  // Count DOM mutations while the page is left completely alone.
  const churn = await page.evaluate(async () => {
    let count = 0;
    const observer = new MutationObserver((records) => {
      count += records.length;
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    await new Promise((resolve) => setTimeout(resolve, 1200));
    observer.disconnect();
    return count;
  });

  let same = true;
  if (watch) {
    const before = await page.locator(watch).first().textContent();
    await page.waitForTimeout(700);
    const after = await page.locator(watch).first().textContent();
    same = before === after;
  }

  const ok = churn < 20 && same;
  if (!ok) bad++;
  console.log(`${ok ? "  ok" : "FAIL"}  ${locale}/${slug} — ${churn} mutations while idle${watch ? `, value ${same ? "held" : "CHANGED BY ITSELF"}` : ""}`);
  await page.close();
}

await browser.close();
console.log(bad ? `\n${bad} pages will not sit still` : "\nevery page sits still");
process.exit(bad ? 1 : 0);
