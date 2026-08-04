/**
 * Whether the words can actually be read.
 *
 * Every other check in here asks whether something happened — the file came
 * out, the page did not scroll sideways, the button had a name. None of them
 * looks at colour, and that blind spot has cost twice now: the market hub
 * shipped for weeks painting a light background behind white text, and Apple's
 * own secondaryLabel — which carries the description under every tool card and
 * every hint under every field — measured 3.3:1 against this site's grey.
 *
 * So this measures. Not against the values in the stylesheet, which say
 * nothing once three translucent layers have been composited, but against what
 * the browser actually paints: each colour is flattened over the first opaque
 * thing behind it, then run through WCAG's own contrast formula.
 *
 * The threshold is 4.5:1, relaxed to 3:1 for text large enough that WCAG says
 * so (24px, or 18.66px bold). Anything that fails is unreadable for someone,
 * usually on a phone, usually outdoors — which is where this site is used.
 */

import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3111";
const BROWSER = process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {};

/**
 * Runs in the page, because only the page knows what was painted.
 *
 * A selector ending in ::placeholder is measured as the placeholder of the
 * element it names; everything else is measured as that element's own text.
 */
const measure = (selectors) => `(() => {
  const sels = ${JSON.stringify(selectors)};

  const lum = (r, g, b) => {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };

  // Chrome serialises color-mix() as color(srgb r g b / a) with 0–1 channels
  // and everything else as rgb()/rgba() with 0–255. Read both, return 0–255.
  // Getting this wrong reads every mixed colour as near-black, which turns a
  // real 3.7:1 failure into a comfortable-looking 14:1 pass.
  const parse = (s) => {
    const n = (s.match(/[\\d.]+/g) || [0, 0, 0]).map(Number);
    if (!/^color\\(/.test(s)) return n;
    const [r, g, b, a] = n;
    return a === undefined ? [r * 255, g * 255, b * 255] : [r * 255, g * 255, b * 255, a];
  };

  const over = (fg, bg) => {
    const a = fg.length > 3 ? fg[3] : 1;
    return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));
  };

  // Translucent fills stack, so keep walking up until something is opaque.
  const opaqueBehind = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if ((c.length > 3 ? c[3] : 1) === 1) return c.slice(0, 3);
    }
    return [255, 255, 255];
  };

  const ratio = (fg, bg) => {
    const a = lum(...fg) + 0.05, b = lum(...bg) + 0.05;
    return Math.round((Math.max(a, b) / Math.min(a, b)) * 100) / 100;
  };

  const out = [];
  for (const sel of sels) {
    const placeholder = sel.endsWith("::placeholder");
    const el = document.querySelector(sel.replace("::placeholder", ""));
    if (!el) { out.push({ what: sel, missing: true }); continue; }

    const style = getComputedStyle(el);
    const backdrop = over(parse(style.backgroundColor), opaqueBehind(el.parentElement));
    const colour = parse(placeholder ? getComputedStyle(el, "::placeholder").color : style.color);

    const size = parseFloat(style.fontSize);
    const weight = Number(style.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);

    out.push({ what: sel, ratio: ratio(over(colour, backdrop), backdrop), need: large ? 3 : 4.5 });
  }
  return out;
})()`;

/**
 * What to measure, chosen as the text a reader has to read rather than as a
 * sample: labels, descriptions, hints, and the words on top of every colour
 * this site fills a shape with.
 */
const PAGES = [
  ["/", [
    ".form input[placeholder]::placeholder",  // the only label most fields have
    ".download:disabled",                     // its label says how to enable it
    ".tagline", ".cross-link", ".pv-hint", ".add",
  ]],
  ["/nl/tools", [
    ".tp-card-name strong", ".tp-card-name span", ".tp-sub",
    ".tp-group h2 small", ".tp-search input::placeholder", ".tp-foot a", ".tp-promise",
  ]],
  ["/nl/tools/pdf-samenvoegen", [".tp-sub", ".tp-back"]],
  ["/nl/tools/arabische-tekst-repareren", [".tp-note-warn", ".tp-hint"]],
  ["/nl/tools/wachtwoord-maken", [".tp-note-ok"]],
  ["/afspraken", [".ma-largetitle span", ".ma-onboard p", ".btn-primary", ".ma-onboard-list li"]],
];

const problems = [];
const browser = await chromium.launch(BROWSER);

for (const scheme of ["light", "dark"]) {
  const context = await browser.newContext({ colorScheme: scheme, viewport: { width: 1280, height: 900 } });
  console.log(`— ${scheme}\n`);

  for (const [path, selectors] of PAGES) {
    const page = await context.newPage();
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 30000 });

    for (const row of await page.evaluate(measure(selectors))) {
      const where = `${scheme} ${path} ${row.what}`;
      // A selector that matches nothing is a check that silently stopped
      // checking — the markup moved and the measurement went with it.
      if (row.missing) {
        problems.push(`${where} — nothing matched`);
        console.log(`GONE  ${path} ${row.what}`);
        continue;
      }
      const ok = row.ratio >= row.need;
      if (!ok) problems.push(`${where} — ${row.ratio}:1, needs ${row.need}:1`);
      console.log(`${ok ? "  ok" : "FAIL"}  ${`${path} ${row.what}`.padEnd(54)} ${row.ratio}:1`);
    }
    await page.close();
  }
  await context.close();
  console.log("");
}

await browser.close();

if (problems.length) {
  console.log(`${problems.length} below the line:`);
  for (const problem of problems) console.log(`  · ${problem}`);
} else {
  console.log("every measured text clears its threshold");
}
process.exit(problems.length ? 1 : 0);
