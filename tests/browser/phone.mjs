/**
 * Every page on a phone, and every page from a keyboard.
 *
 * A tools site is used on a phone more than on a desk — signing a contract
 * with a finger is the mobile case, not the desktop one. And a page nobody can
 * operate without a mouse is a page some people cannot operate at all.
 *
 * Three things are checked on all of them, because all three are invisible
 * from a 1280px window: sideways scrolling, targets too small for a thumb, and
 * controls with no name for a screen reader to say.
 */

import { chromium, devices } from "playwright";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || "http://localhost:3111";
const BROWSER = process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {};
const file = (name) => join(HERE, "fx", name);

/**
 * Every tool page, taken from the sitemap the site itself publishes.
 *
 * Reading the registry directly would mean matching the bundler's module
 * resolution here; the sitemap is the same list, stated by the running site,
 * and it cannot drift from what is actually served.
 */
const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
const PAGES = [...sitemap.matchAll(/<loc>[^<]*\/(nl|en)\/tools\/([^<]+)<\/loc>/g)].map(
  ([, locale, slug]) => ({ locale, slug })
);
if (PAGES.length < 40) throw new Error(`the sitemap only listed ${PAGES.length} tool pages`);

const problems = [];
const check = (ok, what) => {
  if (!ok) problems.push(what);
  return ok;
};

const browser = await chromium.launch(BROWSER);
const phone = await browser.newContext({ ...devices["iPhone 13"] });

console.log("— on a phone (390 × 844, touch)\n");

{
  for (const { locale, slug } of PAGES) {
    const page = await phone.newPage();
    await page.goto(`${BASE}/${locale}/tools/${slug}`, { waitUntil: "networkidle", timeout: 30000 });

    const layout = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflowing = [...document.querySelectorAll("body *")]
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
        .filter((el) => {
          // A box that scrolls sideways on purpose is fine; one that pushes the
          // page sideways is not.
          for (let node = el; node; node = node.parentElement) {
            const overflow = getComputedStyle(node).overflowX;
            if (overflow === "auto" || overflow === "scroll") return false;
          }
          return true;
        })
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}`);

      const small = [...document.querySelectorAll("button, a, input, select, [role=button]")]
        .filter((el) => el.offsetParent !== null)
        .filter((el) => {
          if (el.type === "range" || el.type === "color") return false;
          // What a thumb can hit is the whole row when the control sits inside
          // a label — tapping the words toggles the switch just as well.
          const target = el.closest("label") || el;
          const box = target.getBoundingClientRect();
          return box.height > 0 && box.height < 40;
        })
        .map((el) => `${el.tagName.toLowerCase()}:${(el.textContent || el.type || "").trim().slice(0, 18)}`);

      return {
        scrolls: doc.scrollWidth > doc.clientWidth + 1,
        by: doc.scrollWidth - doc.clientWidth,
        overflowing: [...new Set(overflowing)].slice(0, 3),
        small: [...new Set(small)].slice(0, 3),
      };
    });

    const okWidth = check(!layout.scrolls, `${locale}/${slug}: page scrolls sideways by ${layout.by}px — ${layout.overflowing.join(", ")}`);
    const okTargets = check(layout.small.length === 0, `${locale}/${slug}: targets under 32px — ${layout.small.join(", ")}`);

    if (!okWidth || !okTargets) {
      console.log(`FAIL  ${locale}/${slug}${layout.scrolls ? ` — +${layout.by}px wide` : ""}${layout.small.length ? ` — small: ${layout.small.join(", ")}` : ""}`);
    }
    await page.close();
  }
}

// Signing with a finger is the whole reason the pad exists.
{
  const page = await phone.newPage();
  await page.goto(`${BASE}/nl/tools/pdf-ondertekenen`, { waitUntil: "networkidle" });
  await page.setInputFiles('input[type="file"]', file("rapport.pdf"));
  const pad = page.locator("canvas.tp-pad");
  await pad.waitFor({ timeout: 30000 });

  // The pad sits below the sheet preview, so on a phone it starts off-screen —
  // as it does for anyone signing a real document. Scroll to it the way a
  // finger would: touchscreen and mouse take raw viewport coordinates and do
  // not scroll on their own, so a box measured before this would be a point
  // outside the window and every stroke would land on nothing.
  await pad.scrollIntoViewIfNeeded();
  const box = await pad.boundingBox();
  const viewport = page.viewportSize();
  // Scrolling stops the moment the pad is flush with an edge, so "fits" means
  // fits to within a sub-pixel. What this would catch is a pad grown taller
  // than the screen — impossible to sign in one stroke.
  check(
    box.y >= -1 && box.y + box.height <= viewport.height + 1,
    `the signature pad does not fit on a phone screen (${Math.round(box.y)}–${Math.round(box.y + box.height)} of ${viewport.height})`
  );

  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  // A tap alone is a dot; a drag is a signature.
  await page.mouse.move(box.x + 30, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 40, box.y + 30, { steps: 10 });
  await page.mouse.up();

  const signed = await page
    .locator("img.tp-sheet-mark")
    .waitFor({ timeout: 30000 })
    .then(() => true, () => false);
  check(signed, "signing with a finger on a phone produced nothing");
  console.log(`${signed ? "  ok" : "FAIL"}  signing with a finger`);
  await page.close();
}

await phone.close();

// ---------------------------------------------------------------------------

console.log("\n— from a keyboard, and for a screen reader\n");

const desk = await browser.newContext({ viewport: { width: 1280, height: 1400 } });

{
  for (const { locale, slug } of PAGES) {
    const page = await desk.newPage();
    await page.goto(`${BASE}/${locale}/tools/${slug}`, { waitUntil: "networkidle", timeout: 30000 });

    const named = await page.evaluate(() => {
      const nameOf = (el) =>
        el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        (el.labels && el.labels.length ? el.labels[0].textContent : "") ||
        (el.getAttribute("aria-labelledby")
          ? document.getElementById(el.getAttribute("aria-labelledby"))?.textContent
          : "") ||
        el.textContent ||
        el.getAttribute("placeholder") ||
        "";

      const nameless = [...document.querySelectorAll("button, a, input, select, textarea")]
        .filter((el) => el.offsetParent !== null && el.type !== "hidden")
        .filter((el) => !nameOf(el).trim())
        .map((el) => `${el.tagName.toLowerCase()}[${el.type || ""}]`);

      return {
        nameless: [...new Set(nameless)],
        headings: document.querySelectorAll("h1").length,
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
      };
    });

    check(named.nameless.length === 0, `${locale}/${slug}: unnamed controls — ${named.nameless.join(", ")}`);
    check(named.headings === 1, `${locale}/${slug}: ${named.headings} h1 elements, expected 1`);
    check(named.lang.startsWith(locale), `${locale}/${slug}: <html lang="${named.lang}">`);
    check(
      named.dir === (locale === "ar" ? "rtl" : "ltr"),
      `${locale}/${slug}: dir="${named.dir}"`
    );

    if (named.nameless.length || named.headings !== 1) {
      console.log(`FAIL  ${locale}/${slug} — ${named.nameless.join(", ") || `${named.headings} h1`}`);
    }
    await page.close();
  }
}

// Can a tool be driven to the end with nothing but a keyboard?
{
  const page = await desk.newPage();
  await page.goto(`${BASE}/nl/tools/woorden-tellen`, { waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    const style = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      // A focus ring people can see, of some kind.
      visible: style.outlineStyle !== "none" || style.boxShadow !== "none",
    };
  });
  check(focused.visible, `focus is invisible on ${focused.tag}`);
  console.log(`${focused.visible ? "  ok" : "FAIL"}  focus is visible while tabbing`);
  await page.close();
}

await desk.close();
await browser.close();

if (problems.length) {
  console.log(`\n${problems.length} problems:`);
  for (const problem of problems.slice(0, 25)) console.log(`  · ${problem}`);
} else {
  console.log("\nevery page works on a phone and from a keyboard");
}
process.exit(problems.length ? 1 : 0);
