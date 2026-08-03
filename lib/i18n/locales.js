/**
 * Languages the market speaks.
 *
 * Dutch is the beachhead: we already sound native there, the competition in
 * that language is thin, and the privacy argument lands hardest in exactly the
 * places where the big file-tool sites are weakest. English is the wide net.
 * German is the next one worth having — adding it is a data job, not a code
 * job, which is the whole point of doing this before twenty tools exist.
 *
 * Arabic arrived for a different reason. One tool here exists *because* of
 * Arabic — the shaper, which fixes text that video editors draw backwards —
 * and its readers are Arabic speakers. It is a real locale rather than a
 * language toggle on one page: its own URL, its own slug, its own hreflang,
 * and its prose in the HTML a crawler reads. A tool speaks a language or it
 * does not, so `/ar/tools` currently lists the tools that speak Arabic, and
 * grows as more of them learn it.
 *
 * Arabic slugs are transliterated rather than written in the script. Next 14
 * generates a page for a non-ASCII slug and then never serves it — the request
 * arrives percent-encoded and the route manifest holds the decoded form, and
 * encoding the params does not fix it either. A transliteration is what Arabic
 * sites tend to use regardless: it survives being pasted into a message, where
 * `%D8%A7%D8%B5%D9%84%D8%A7%D8%AD` does not. The Arabic keywords still carry,
 * in the title, the heading and the prose.
 */

export const LOCALES = ["nl", "en", "ar"];

/** Ready to switch on the day the copy exists; nothing else has to change. */
export const PLANNED_LOCALES = ["de"];

export const DEFAULT_LOCALE = "nl";

export const LOCALE_META = {
  nl: { label: "Nederlands", short: "NL", htmlLang: "nl", hrefLang: "nl-NL", dir: "ltr" },
  en: { label: "English", short: "EN", htmlLang: "en", hrefLang: "en", dir: "ltr" },
  ar: { label: "العربية", short: "ع", htmlLang: "ar", hrefLang: "ar", dir: "rtl" },
  de: { label: "Deutsch", short: "DE", htmlLang: "de", hrefLang: "de-DE", dir: "ltr" },
};

/** Which way the page runs. Everything positional in the CSS follows this. */
export function dirFor(locale) {
  return LOCALE_META[locale]?.dir || "ltr";
}

export function isLocale(value) {
  return LOCALES.includes(value);
}

/** Build a path inside a locale: localePath("en", "tools") → "/en/tools". */
export function localePath(locale, ...segments) {
  const parts = segments.flat().filter(Boolean).map((part) => String(part).replace(/^\/+|\/+$/g, ""));
  return `/${[locale, ...parts].join("/")}`;
}

/** Pick the best supported locale from an Accept-Language header. */
export function negotiateLocale(header) {
  const wanted = String(header || "")
    .split(",")
    .map((entry) => {
      const [tag, q] = entry.trim().split(";q=");
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter((entry) => entry.tag)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of wanted) {
    const base = tag.split("-")[0];
    if (isLocale(tag)) return tag;
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
