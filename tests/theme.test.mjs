import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_THEME,
  THEMES,
  isTheme,
  resolveTheme,
  themeBootScript,
} from "../lib/afspraken/theme.js";

test("offers automatic, light and dark", () => {
  assert.deepEqual(THEMES.map((t) => t.value), ["auto", "light", "dark"]);
  assert.equal(DEFAULT_THEME, "auto");
  for (const theme of THEMES) assert.ok(theme.label.length > 2);
});

test("recognises only the three choices", () => {
  assert.ok(isTheme("auto"));
  assert.ok(isTheme("light"));
  assert.ok(isTheme("dark"));
  assert.ok(!isTheme("sepia"));
  assert.ok(!isTheme(""));
  assert.ok(!isTheme(undefined));
});

test("an explicit choice wins over the device", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("automatic follows the device", () => {
  assert.equal(resolveTheme("auto", true), "dark");
  assert.equal(resolveTheme("auto", false), "light");
});

test("anything unrecognised falls back to following the device", () => {
  assert.equal(resolveTheme(undefined, true), "dark");
  assert.equal(resolveTheme("nonsense", false), "light");
});

// --------------------------------------------------------- the boot script

/** Run the pre-paint script against a stand-in document and storage. */
function runBoot({ stored = null, systemDark = false, override = "" } = {}) {
  const root = { attrs: {}, style: {}, setAttribute(k, v) { this.attrs[k] = v; } };
  const context = {
    localStorage: { getItem: () => stored },
    matchMedia: (query) => ({ matches: query.includes("dark") ? systemDark : false }),
    document: { documentElement: root },
  };
  const source = themeBootScript("test_key", override);
  // The script only touches these globals, so a plain Function call is enough.
  new Function("window", "localStorage", "document", `with(window){${source}}`)(
    context,
    context.localStorage,
    context.document
  );
  return root;
}

test("the boot script applies a stored dark choice", () => {
  const root = runBoot({ stored: JSON.stringify({ settings: { theme: "dark" } }) });
  assert.equal(root.attrs["data-theme"], "dark");
  assert.equal(root.style.colorScheme, "dark");
});

test("the boot script keeps light even when the device is dark", () => {
  const root = runBoot({
    stored: JSON.stringify({ settings: { theme: "light" } }),
    systemDark: true,
  });
  assert.equal(root.attrs["data-theme"], "light");
});

test("the boot script follows the device when set to automatic", () => {
  assert.equal(
    runBoot({ stored: JSON.stringify({ settings: { theme: "auto" } }), systemDark: true })
      .attrs["data-theme"],
    "dark"
  );
  assert.equal(
    runBoot({ stored: JSON.stringify({ settings: { theme: "auto" } }), systemDark: false })
      .attrs["data-theme"],
    "light"
  );
});

test("the boot script survives empty or broken storage", () => {
  assert.equal(runBoot({ stored: null, systemDark: true }).attrs["data-theme"], "dark");
  assert.equal(runBoot({ stored: "{not json", systemDark: false }).attrs["data-theme"], "light");
  assert.equal(runBoot({ stored: "{}", systemDark: false }).attrs["data-theme"], "light");
});

test("an embed override beats whatever is stored", () => {
  const root = runBoot({
    stored: JSON.stringify({ settings: { theme: "dark" } }),
    systemDark: true,
    override: "light",
  });
  assert.equal(root.attrs["data-theme"], "light");
});
