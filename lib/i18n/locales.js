/**
 * Languages the market speaks.
 *
 * Dutch is the beachhead: we already sound native there, the competition in
 * that language is thin, and the privacy argument lands hardest in exactly the
 * places where the big file-tool sites are weakest. English is the wide net.
 * German is the next one worth having — adding it is a data job, not a code
 * job, which is the whole point of doing this before twenty tools exist.
 */

export const LOCALES = ["nl", "en"];

/** Ready to switch on the day the copy exists; nothing else has to change. */
export const PLANNED_LOCALES = ["de"];

export const DEFAULT_LOCALE = "nl";

export const LOCALE_META = {
  nl: { label: "Nederlands", short: "NL", htmlLang: "nl", hrefLang: "nl-NL" },
  en: { label: "English", short: "EN", htmlLang: "en", hrefLang: "en" },
  de: { label: "Deutsch", short: "DE", htmlLang: "de", hrefLang: "de-DE" },
};

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
