/**
 * Does the advertising actually behave the way the page says it does?
 *
 * This is the one part of the site where the promise and the code could drift
 * apart without anybody noticing, so it is checked by watching the network
 * rather than by reading the source. Every request the page makes is recorded,
 * and any request to a known advertising host before a choice was made is a
 * failure — no matter how the components are written.
 */

import { chromium } from "playwright";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || "http://localhost:3111";
const BROWSER = process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {};
const file = (name) => join(HERE, "fx", name);

/** Hosts that mean an ad network has been contacted. */
const AD_HOSTS = /googlesyndication|doubleclick|googletagservices|adservice\.google|google-analytics|googletagmanager/i;

const problems = [];
const check = (ok, what) => {
  console.log(`${ok ? "  ok" : "FAIL"}  ${what}`);
  if (!ok) problems.push(what);
};

const browser = await chromium.launch(BROWSER);

/** A fresh page that records every host it talks to. */
async function open(path, { consent } = {}) {
  const context = await browser.newContext();
  if (consent) {
    await context.addInitScript(
      ([key, value]) => {
        try {
          window.localStorage.setItem(key, value);
        } catch {
          /* nothing */
        }
      },
      ["tools_ads_consent", consent]
    );
  }

  const page = await context.newPage();
  const asked = [];
  page.on("request", (request) => {
    if (AD_HOSTS.test(request.url())) asked.push(request.url().slice(0, 90));
  });

  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 30000 });
  return { page, context, asked };
}

// ---------------------------------------------------------------------------

const configured = Boolean(process.env.NEXT_PUBLIC_ADS_CLIENT);
console.log(configured ? "— advertising is configured\n" : "— advertising is not configured (no publisher id)\n");

{
  // With no answer, nothing may be requested. Ever. Including after scrolling
  // to the very bottom, which is where the slot lives.
  const { page, context, asked } = await open("/nl/tools/pdf-verkleinen");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2500);
  check(asked.length === 0, `no answer → no request to an ad network (saw ${asked.length}: ${asked[0] || ""})`);

  const banner = await page.locator(".ad-ask").count();
  check(configured ? banner === 1 : banner === 0, configured ? "the question is asked" : "no publisher id → no question asked");

  if (configured) {
    // Refusing has to be exactly as easy as agreeing: same row, same size.
    const buttons = await page.locator(".ad-ask-buttons .btn").all();
    const sizes = await Promise.all(buttons.map((b) => b.boundingBox()));
    const widest = Math.max(...sizes.map((s) => s.width));
    const narrowest = Math.min(...sizes.map((s) => s.width));
    check(buttons.length === 3, `three answers offered (saw ${buttons.length})`);
    check(narrowest > widest * 0.6, "refusing is not made smaller than agreeing");
  }
  await context.close();
}

{
  // Having refused, still nothing — and no banner nagging on every page.
  const { page, context, asked } = await open("/nl/tools/pdf-verkleinen", { consent: "refused" });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2500);
  check(asked.length === 0, `refused → still no request (saw ${asked.length})`);
  check((await page.locator(".ad-ask").count()) === 0, "refused → the question is not asked again");
  check((await page.locator(".ad-slot").count()) === 0, "refused → no reserved space either");
  await context.close();
}

if (configured) {
  // The other half of the promise: having agreed, it does load — and only
  // once the slot is nearly on screen, not on arrival.
  // On the hub, where the slot is far below the fold. A short tool page would
  // prove nothing: its slot is genuinely nearly on screen from the start.
  const { page, context, asked } = await open("/nl/tools", { consent: "personalised" });
  await page.waitForTimeout(1800);
  check(asked.length === 0, `agreed, but not scrolled → still nothing loaded (saw ${asked.length})`);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.locator("ins.adsbygoogle").waitFor({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  check(asked.length > 0, `agreed and scrolled → the network is finally asked (saw ${asked.length})`);

  const stated = await page.locator(".ad-slot").first().getAttribute("data-consent").catch(() => null);
  check(stated === "personalised", `personalised → the slot says so (saw ${stated})`);
  await context.close();

  // And the plain answer really is plain, not just worded that way.
  const plain = await open("/nl/tools/woorden-tellen", { consent: "plain" });
  await plain.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await plain.page.locator("ins.adsbygoogle").waitFor({ timeout: 10000 }).catch(() => {});
  const plainStated = await plain.page.locator(".ad-slot").first().getAttribute("data-consent").catch(() => null);
  check(plainStated === "plain", `without personalisation → the slot says so (saw ${plainStated})`);
  const plainNpa = await plain.page
    .locator("ins.adsbygoogle")
    .first()
    .getAttribute("data-npa")
    .catch(() => null);
  check(plainNpa === null || plainNpa === "1", `and asks the network for non-personalised (saw ${plainNpa})`);
  await plain.context.close();
}

{
  // The choice can be taken back, from the page the reader is already on.
  const { page, context } = await open("/nl/tools/woorden-tellen", { consent: "plain" });
  const back = page.locator(".ad-switch > button");
  // Without a publisher id there is nothing to change, and nothing to offer.
  check((await back.count()) === (configured ? 1 : 0), "there is a way to change the answer");
  if (configured && (await back.count())) {
    await back.click();
    await page.locator('.ad-switch-options button[aria-pressed="false"]').first().click();
    const stored = await page.evaluate(() => window.localStorage.getItem("tools_ads_consent"));
    check(stored !== "plain", `changing the answer sticks (now ${stored})`);
  }
  await context.close();
}

{
  // The work is never interrupted: a slot must not appear inside the tool, and
  // the file must not be sent anywhere while it is being worked on.
  const { page, context, asked } = await open("/nl/tools/pdf-verkleinen", { consent: "personalised" });
  await page.setInputFiles('input[type="file"]', file("scan.pdf"));
  const runButton = page.getByRole("button", { name: /^Verkleinen$/ });
  await runButton.click();
  await page.locator("dl.tp-stat").waitFor({ timeout: 60000 });

  const uploaded = asked.filter((url) => /upload|file|pdf/i.test(url));
  check(uploaded.length === 0, "nothing about the file went to an ad network");

  const order = await page.evaluate(() => {
    const slot = document.querySelector(".ad-slot");
    const privacy = document.querySelector(".tp-privacy");
    if (!slot || !privacy) return "missing";
    return slot.compareDocumentPosition(privacy) & Node.DOCUMENT_POSITION_FOLLOWING ? "after" : "before";
  });
  check(order !== "before", `the slot sits below the work (it is ${order} the closing note)`);
  await context.close();
}

{
  // The widget in somebody else's page never carries advertising.
  const { context, asked, page } = await open("/embed/afspraken");
  await page.waitForTimeout(1500);
  check(asked.length === 0, "the embedded widget asks no ad network for anything");
  check((await page.locator(".ad-slot, .ad-ask").count()) === 0, "the embedded widget carries no slot and no banner");
  await context.close();
}

{
  // The privacy page exists, in both languages, and says the important part.
  for (const [locale, phrase] of [["nl", /niet geüpload/i], ["en", /not uploaded/i]]) {
    const { page, context } = await open(`/${locale}/privacy`);
    const text = await page.locator("body").innerText();
    check(phrase.test(text), `/${locale}/privacy states what happens to a file`);
    check(/AdSense/i.test(text), `/${locale}/privacy names the ad network`);
    await context.close();
  }
}

await browser.close();
console.log(problems.length ? `\n${problems.length} problems` : "\nthe advertising behaves as the page says it does");
process.exit(problems.length ? 1 : 0);
